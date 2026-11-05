import { describe, it, expect, beforeAll } from 'vitest'
import { computed, createSSRApp, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import en from '../../i18n/locales/en.json'
import CVTemplate from '../../app/components/templates/CVTemplate.vue'
import CVminimalist from '../../app/components/templates/CVminimalist.vue'
import CVdoublecolumn from '../../app/components/templates/CVdoublecolumn.vue'

// Los componentes usan los auto-imports de Nuxt (computed, useI18n, useNuxtApp).
// Fuera de Nuxt no existen, así que se simulan con una resolución mínima de claves.
const translate = (key: string): string =>
  key.split('.').reduce<any>((node, part) => node?.[part], en) ?? key

beforeAll(() => {
  Object.assign(globalThis, {
    computed,
    useI18n: () => ({ t: translate, locale: ref('en') }),
    useNuxtApp: () => ({ $i18n: { t: translate } }),
  })
})

const profile = {
  nombre: 'Alejandra Martinez',
  titulo: 'Senior Full Stack Developer',
  ubicacion: 'Bogota, Colombia',
  email_profile: 'alejandra@example.com',
  telefono: '+57 310 456 7890',
  linkedin: 'linkedin.com/in/alejandra',
  otros: 'portfolio.example.com/alejandra',
  web: 'alejandra.dev',
  resumen: 'Full Stack developer.',
  idiomas: 'Español nativo, Inglés avanzado',
}

const experiences = [
  {
    id: 'exp-1',
    type: 'work',
    cargo: 'Senior Developer',
    empresa: 'TechCorp',
    inicio: 'Mar 2021',
    fin: 'Present',
    logros_optimizados: ['Led the migration to microservices.'],
    skills_sugeridas: ['Vue.js', 'Node.js'],
  },
]

const educations = [
  { id: 'edu-1', titulo: 'Systems Engineering', institucion: 'National University', inicio: '2014', fin: '2019' },
]

const aiData = {
  summary: 'Optimized summary.',
  optimized_title: 'Senior Full Stack Developer',
  top_skills: ['Vue.js', 'TypeScript'],
  experiences,
}

const render = (component: object, profileOverrides: Record<string, unknown> = {}) =>
  renderToString(
    createSSRApp(component, {
      profile: { ...profile, ...profileOverrides },
      educations,
      experiences,
      aiData,
    }),
  )

describe('plantillas de CV', () => {
  it.each([
    ['classic (CVTemplate)', CVTemplate],
    ['minimalist (CVminimalist)', CVminimalist],
    ['doublecolumn (CVdoublecolumn)', CVdoublecolumn],
  ])('%s renderiza un perfil completo sin lanzar errores', async (_name, component) => {
    const html = await render(component)

    expect(html).toContain('Alejandra Martinez')
  })

  it('classic renderiza cuando el perfil no tiene enlace "otros"', async () => {
    const html = await render(CVTemplate, { otros: '' })

    expect(html).toContain('Alejandra Martinez')
    expect(html).not.toContain(`>${en.profile.cv_label_other_links}</a>`)
  })

  it('classic muestra el enlace de "otros" del perfil con su etiqueta traducida', async () => {
    const html = await render(CVTemplate)

    expect(html).toContain('href="https://portfolio.example.com/alejandra"')
    expect(html).toContain(`>${en.profile.cv_label_other_links}</a>`)
  })
})
