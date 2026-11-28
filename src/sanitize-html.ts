/*
The one place untrusted HTML becomes DOM. `<tosi-md>`, tooltips and the default `text/html`
drop all render text the page's author did not write (a `title` holding a user name, HTML dragged
in from another site), so they share this rather than each writing its own `innerHTML` (lean
review D1, #4342: two of the three had no sanitizing step at all).
*/
import { sanitizeInPlace, isSafeNavigationUrl } from 'tosijs-kilpi'

/*
Components that render raw HTML or run code of their own. Unwrapped from sanitized markup even
when listed in `allowedElements`: allowing `tosi-md` would reopen B1 through `sanitize="off"`, and
`tosi-example` runs its code. Fail closed rather than trust the allow-list to be written carefully.
*/
const ALWAYS_UNWRAPPED = new Set(['tosi-md', 'tosi-example', 'tosi-doc-system'])

/**
 * Parse `html` into an inert fragment with executable content removed.
 *
 * `allowedElements` names the custom elements that may survive, as a space- or comma-separated
 * string; every other custom element is unwrapped (its already-sanitized content kept).
 */
export function sanitizedFragment(
  html: string,
  allowedElements = ''
): DocumentFragment {
  /*
  Parsed into an inert <template>, NOT into the target: assigning innerHTML to a live element
  starts image loads, so an `<img onerror>` would fire before any cleanup ran.
  */
  const template = document.createElement('template')
  template.innerHTML = html
  sanitizeInPlace(template.content)
  /*
  Custom elements are code, not markup (B1, 1.16.0 review). kilpi keeps unknown elements by
  design, so untrusted markup could instantiate ANY registered component, and some execute or
  inject their own content: a nested `<tosi-md sanitize="off">` rendered its text as raw HTML;
  `<tosi-example>` runs its code. Rather than denylist the ones we know about, a custom element
  is unwrapped unless the caller names it. `is="…"` is the other way to make an element a
  component, so it goes too.
  */
  const allowed = new Set(
    String(allowedElements)
      .toLowerCase()
      .split(/[\s,]+/)
      .filter((tag) => tag && !ALWAYS_UNWRAPPED.has(tag))
  )
  for (const el of [...template.content.querySelectorAll('*')]) {
    el.removeAttribute('is')
    if (el.localName.includes('-') && !allowed.has(el.localName)) {
      el.replaceWith(...el.childNodes)
    }
  }
  /*
  kilpi's URL check admits raster `data:image/*` (fine for an <img src>); a link must never
  carry a data: URL, so hold every href to the navigation rule. What virta did (#179).
  */
  for (const el of template.content.querySelectorAll('[href]')) {
    if (!isSafeNavigationUrl(el.getAttribute('href') || '')) {
      el.removeAttribute('href')
    }
  }
  return template.content
}

/** Replace `target`'s children with sanitized `html`. */
export function setSanitizedHtml(
  target: Element,
  html: string,
  allowedElements = ''
): void {
  target.replaceChildren(sanitizedFragment(html, allowedElements))
}
