import { marked } from 'marked'

const ALLOWED_TAGS = new Set([
  'a',
  'p',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr'
])

const DROP_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'link',
  'meta',
  'base'
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel'])
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeHref(href: string) {
  const value = href.trim()
  if (!value) return ''

  try {
    const url = new URL(value, 'https://example.com')
    const protocol = url.protocol.toLowerCase()

    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') {
      return value
    }
  } catch {
  }

  return ''
}

function unwrapElement(element: Element) {
  const parent = element.parentNode
  if (!parent) return

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element)
  }

  parent.removeChild(element)
}

export function sanitizeHtml(html: string) {
  if (!html) return ''

  if (typeof DOMParser === 'undefined') {
    return escapeHtml(html)
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const elements = Array.from(doc.body.querySelectorAll('*'))

  for (const element of elements) {
    const tagName = element.tagName.toLowerCase()

    if (DROP_TAGS.has(tagName)) {
      element.remove()
      continue
    }

    if (!ALLOWED_TAGS.has(tagName)) {
      unwrapElement(element)
      continue
    }

    const allowedAttrs = ALLOWED_ATTRS[tagName] || new Set<string>()

    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase()

      if (name.startsWith('on') || name === 'style') {
        element.removeAttribute(attr.name)
        continue
      }

      if (!allowedAttrs.has(name)) {
        element.removeAttribute(attr.name)
      }
    }

    if (tagName === 'a') {
      const safeHref = sanitizeHref(element.getAttribute('href') || '')

      if (!safeHref) {
        element.removeAttribute('href')
        element.removeAttribute('target')
        element.removeAttribute('rel')
      } else {
        element.setAttribute('href', safeHref)
        element.setAttribute('target', '_blank')
        element.setAttribute('rel', 'noopener noreferrer nofollow')
      }
    }
  }

  return doc.body.innerHTML
}

export function renderSafeMarkdown(text: string) {
  if (!text) return ''

  const rendered = marked.parse(text, {
    breaks: true,
    gfm: true
  })

  return sanitizeHtml(typeof rendered === 'string' ? rendered : String(rendered))
}
