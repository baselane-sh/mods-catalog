// README text is written by mod authors and served on our domain, so it is untrusted.
// Raw HTML is escaped (html: false), and links and images must use https.
import MarkdownIt from 'markdown-it'

const HTTPS = /^https:\/\/[^\s"'<>]+$/i

function resolveUrl(url, base) {
  if (HTTPS.test(url)) return url
  if (!base || /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return null
  try {
    const resolved = new URL(url, base).href
    return HTTPS.test(resolved) ? resolved : null
  } catch {
    return null
  }
}

// base: the https URL that relative image paths resolve against (raw files at the locked SHA).
export function renderMarkdown(text, { imageBase, linkBase } = {}) {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false })
  md.validateLink = url => Boolean(resolveUrl(url.trim(), linkBase) ?? resolveUrl(url.trim(), imageBase))
  const defaultImage = md.renderer.rules.image
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const src = resolveUrl(token.attrGet('src') ?? '', imageBase)
    if (!src) return md.utils.escapeHtml(token.content)
    token.attrSet('src', src)
    token.attrSet('loading', 'lazy')
    return defaultImage(tokens, idx, options, env, self)
  }
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    token.attrSet('href', resolveUrl(token.attrGet('href') ?? '', linkBase) ?? '#')
    token.attrSet('rel', 'nofollow noopener noreferrer')
    return self.renderToken(tokens, idx, options)
  }
  return md.render(text)
}
