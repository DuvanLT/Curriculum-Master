export async function getUrlContent(url: string): Promise<string> {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return ''
  }

  try {
    const html = await $fetch<string>(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Bring Jobs/1.0; +http://localhost:3000)'
      }
    })

    // Simple cleaning: remove scripts, styles, and extra whitespace
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000) // Limit to first 5000 chars to avoid token bloat
  } catch (e) {
    console.error(`Error fetching URL ${url}:`, e)
    return ''
  }
}
