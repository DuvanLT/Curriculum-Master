// Month name translation tables
const ES_MONTHS: Record<string, string> = {
  'ene': 'Jan', 'enero': 'January',
  'feb': 'Feb', 'febrero': 'February',
  'mar': 'Mar', 'marzo': 'March',
  'abr': 'Apr', 'abril': 'April',
  'may': 'May', 'mayo': 'May',
  'jun': 'Jun', 'junio': 'June',
  'jul': 'Jul', 'julio': 'July',
  'ago': 'Aug', 'agosto': 'August',
  'sep': 'Sep', 'sept': 'Sep', 'septiembre': 'September',
  'oct': 'Oct', 'octubre': 'October',
  'nov': 'Nov', 'noviembre': 'November',
  'dic': 'Dec', 'diciembre': 'December',
}

const EN_MONTHS: Record<string, string> = {
  'jan': 'Ene', 'january': 'Enero',
  'feb': 'Feb', 'february': 'Febrero',
  'mar': 'Mar', 'march': 'Marzo',
  'apr': 'Abr', 'april': 'Abril',
  'may': 'May',
  'jun': 'Jun', 'june': 'Junio',
  'jul': 'Jul', 'july': 'Julio',
  'aug': 'Ago', 'august': 'Agosto',
  'sep': 'Sep', 'september': 'Septiembre',
  'oct': 'Oct', 'october': 'Octubre',
  'nov': 'Nov', 'november': 'Noviembre',
  'dec': 'Dic', 'december': 'Diciembre',
}

// Language name translation tables
const ES_LANG_NAMES: Record<string, string> = {
  'español': 'Spanish', 'espanol': 'Spanish',
  'inglés': 'English', 'ingles': 'English',
  'francés': 'French', 'frances': 'French',
  'portugués': 'Portuguese', 'portugues': 'Portuguese',
  'alemán': 'German', 'aleman': 'German',
  'italiano': 'Italian',
  'chino': 'Chinese',
  'japonés': 'Japanese', 'japones': 'Japanese',
  'árabe': 'Arabic', 'arabe': 'Arabic',
  'ruso': 'Russian',
  'coreano': 'Korean',
  'holandés': 'Dutch', 'holandes': 'Dutch',
  'nativo': 'Native',
  'básico': 'Basic', 'basico': 'Basic',
  'elemental': 'Elementary',
  'intermedio': 'Intermediate',
  'avanzado': 'Advanced',
  'fluido': 'Fluent',
  'profesional': 'Professional',
  'bilingüe': 'Bilingual', 'bilingue': 'Bilingual',
}

const EN_LANG_NAMES: Record<string, string> = {
  'spanish': 'Español',
  'english': 'Inglés',
  'french': 'Francés',
  'portuguese': 'Portugués',
  'german': 'Alemán',
  'italian': 'Italiano',
  'chinese': 'Chino',
  'japanese': 'Japonés',
  'arabic': 'Árabe',
  'russian': 'Ruso',
  'korean': 'Coreano',
  'dutch': 'Holandés',
  'native': 'Nativo',
  'basic': 'Básico',
  'elementary': 'Elemental',
  'intermediate': 'Intermedio',
  'advanced': 'Avanzado',
  'fluent': 'Fluido',
  'professional': 'Profesional',
  'bilingual': 'Bilingüe',
}

/**
 * Translates month names in a date string to the target locale.
 * e.g. "Ene 2025" → "Jan 2025" (en) | "Jan 2025" → "Ene 2025" (es)
 */
export function translateDate(dateStr: string | null | undefined, targetLocale: string): string {
  if (!dateStr) return ''
  const map = targetLocale === 'en' ? ES_MONTHS : EN_MONTHS
  return String(dateStr).replace(/\b([A-Za-záéíóúÁÉÍÓÚü]+)\b/g, (match) => {
    return map[match.toLowerCase()] ?? match
  })
}

/**
 * Translates a free-text idiomas string to the target locale.
 * e.g. "Español (Nativo), Ingles (B1)" → "Spanish (Native), English (B1)"
 */
export function translateIdiomas(text: string | null | undefined, targetLocale: string): string {
  if (!text) return ''
  const map = targetLocale === 'en' ? ES_LANG_NAMES : EN_LANG_NAMES
  return String(text).replace(/\b([A-Za-záéíóúÁÉÍÓÚüñÑ]+)\b/g, (match) => {
    return map[match.toLowerCase()] ?? match
  })
}
