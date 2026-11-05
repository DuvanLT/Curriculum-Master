# Diseño: Experiencias activables para la generación de CV

**Fecha:** 2026-09-07
**Rama:** `cv-fit-algorithm`
**Stack:** Nuxt 4 (Vue) + Nitro, libSQL.

## Objetivo

Permitir al usuario **desactivar** experiencias en lugar de eliminarlas, para que no entren
en la generación del CV sin perder el dato. Dos alcances: un default persistente en el
perfil y un override puntual por generación.

## Motivación

Hoy la única forma de que una experiencia no aparezca en el CV es borrarla del perfil, lo
que destruye información que el usuario podría necesitar para otra vacante. Además, el
algoritmo de ajuste (ver `2026-09-07-cv-fit-algorithm-design.md`) poda contenido de forma
automática e invisible; este switch le da al usuario el control explícito equivalente.

**Sinergia:** al recibir menos experiencias, `computeBudget` reparte más presupuesto entre
las restantes. Desactivar lo irrelevante mejora automáticamente la calidad del CV.

## Decisiones aprobadas

- **Alcance doble:** switch global persistente en `/profile` + override por generación en
  `/generator-cv`.
- **Se entrega antes** que el algoritmo de ajuste. Es independiente y aporta valor solo.
- El generador lista **únicamente las globalmente activas**. Reactivar desde el generador
  algo apagado en el perfil sería confuso; se enlaza al perfil en su lugar.
- **Mínimo 1 experiencia activa** para poder generar.
- Desactivar una experiencia intermedia crea un hueco cronológico. El invariante *"nunca
  elimines una experiencia de la línea temporal"* aplica al **algoritmo**; la decisión
  explícita del usuario lo sobrescribe.

## 1. Persistencia

```sql
ALTER TABLE experiences ADD COLUMN active INTEGER DEFAULT 1
```

En `server/utils/db.ts`, dentro del mismo `try/catch` idempotente que ya usan las columnas
`type` y `link`. **Retrocompatible por construcción:** las filas existentes toman el
default `1` y ningún usuario nota el cambio.

| Archivo | Cambio |
|---|---|
| `server/utils/db.ts` | El `ALTER TABLE` en el bloque de migraciones |
| `server/utils/profile.ts` | `active` en el `INSERT` de experiencias. El patrón DELETE-all + re-INSERT ya existente lo arrastra sin más cambios |
| `server/api/profile.get.ts` | Añadir `active` a la lista explícita de columnas del `SELECT` de experiencias (línea 82) **y** normalizar a boolean en el `map`: `active: row.active !== 0`. El `SELECT` enumera columnas una a una, así que omitirlo haría que el flag nunca llegase al front |
| `app/composables/useAppState.ts` | `active?: boolean` en la interfaz `Experience`. `addExperience` y `bulkExperience` crean con `active: true` |

### Regla de lectura

```
activa  ⟺  active !== false
```

`undefined` y `null` cuentan como **activa**. Esto cubre a los usuarios preexistentes, a
los CVs importados y a cualquier payload que no traiga el campo. Es la regla que debe
aplicarse en los tres sitios donde se filtra (cliente, servidor y presupuesto).

## 2. UI en el perfil

Un switch en la cabecera de `app/components/ExperienceItem.vue`, junto al badge
Laboral/Proyecto. El componente ya se reutiliza en las dos secciones de `profile.vue`
(laboral y proyectos), así que un único cambio cubre ambas.

- El componente emite `toggle` con el `id`. No muta la prop.
- `profile.vue` actualiza el estado y persiste con el `saveProfile` existente.
- **Estado desactivado:** tarjeta al 45% de opacidad + badge `NO SE USA EN CVs`.
- La previsualización de `profile.vue` pasa a tomar las 2 primeras **activas**, no las 2
  primeras a secas.

## 3. UI en el generador

Bloque colapsable situado sobre el botón de generar:

```
▸ Experiencias a incluir                    [ 3 de 5 ]

    ☑ Backend Developer — Acme                 2023 → Actual
    ☑ Full Stack — Startup XYZ                 2021 → 2023
    ☑ API de pagos (proyecto)                  2022
    ☐ Soporte técnico — CompuMax               2019 → 2021
    ☐ Prácticas — Universidad                  2018 → 2019

    2 desactivadas en tu perfil · Editar
```

El ejemplo corresponde a un usuario con **7 experiencias**: 5 globalmente activas (las
listadas), de las cuales 3 seleccionadas para esta generación, más 2 desactivadas en el
perfil que no se listan. Los dos niveles se leen por separado y no deben confundirse.

- Estado **local**, no toca la BD. Se recuerda en `localStorage` para sobrevivir a un
  refresco de página.
- El contador `[ 3 de 5 ]` es visible incluso con el bloque colapsado.
- La línea "N desactivadas en tu perfil" solo aparece si N > 0, y enlaza a `/profile`.

### Reconciliación del estado persistido

Clave: `cv-generator-excluded-experiences`. Se guarda la lista de ids **excluidos**, no la
de incluidos, para que el default sea seguro:

- Un id guardado que ya no existe en el perfil se ignora en silencio.
- Una experiencia nueva, o una reactivada en el perfil, **entra seleccionada** por no
  figurar entre los excluidos.

Guardar los excluidos evita el fallo silencioso de la alternativa: con una lista de
incluidos, cualquier experiencia añadida después quedaría fuera del CV sin que el usuario
lo pidiera.

### Estado inicial del bloque

Colapsado por defecto para no recargar la pantalla, con una excepción que resuelve el
problema de descubribilidad:

```
expandido  ⟺  nº de experiencias activas >= 5
```

Cinco o más experiencias es el punto en que el contenido casi con seguridad desborda una
página, que es justo cuando al usuario le interesa decidir. **Cuando el algoritmo de
ajuste esté entregado, esta heurística se sustituye por su señal real**
(`budget.targetPages > 1`), que es exacta en lugar de aproximada.

## 4. Filtro y guardas

- `generator-cv.vue` envía en el POST únicamente las experiencias seleccionadas.
- `server/api/generate-cv.post.ts` aplica un filtro defensivo con la regla de lectura de
  la sección 1, por si llega un payload sin filtrar.
- **Guarda de mínimo 1:** con cero seleccionadas, el botón de generar se deshabilita y
  muestra el motivo. No se emite una llamada a la IA que devolvería un CV vacío.
- La guarda se evalúa también en servidor: cero experiencias activas devuelve `400`, no un
  CV degradado.

## 5. Testing

`vitest` y `tests/server/` ya están configurados.

| Test | Qué asegura |
|---|---|
| `tests/server/profile-active.test.ts` | Round-trip del flag a través de `saveUserProfile`; una fila **sin** `active` (usuario preexistente) se lee como activa; `false` sobrevive al ciclo DELETE + INSERT |
| `tests/shared/cv-active-filter.test.ts` | La regla `active !== false` trata `undefined` y `null` como activa; la guarda de mínimo 1 dispara con lista vacía y con todas en `false` |

## 6. Enganche con el algoritmo de ajuste

Una única línea de contrato en `2026-09-07-cv-fit-algorithm-design.md`: **el presupuesto
recibe únicamente experiencias activas**.

`computeBudget` no conoce la existencia del flag; solo recibe una lista más corta. El
acoplamiento entre ambos specs se reduce a esa frase, y ninguno de los dos necesita al
otro para entregarse.

## 7. Fuera de alcance

- **Preselección automática por relevancia.** Se evaluó pre-marcar los checkboxes según
  `w_i` y la JD. Se descarta por ahora: desmarcar algo que el usuario sí quería resulta
  desconcertante, y `w_i` todavía no existe hasta que se entregue el algoritmo. Es
  candidato natural a una iteración posterior.
- **Desactivar educaciones o idiomas.** Solo experiencias en este spec.
- **Historial de qué experiencias se usaron en cada CV generado.** `generated_cvs` guarda
  el `cv_json` resultante, que ya refleja implícitamente la selección.
