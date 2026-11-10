/*
The doc site's web fonts: Aleo for prose, Spline Sans Mono for code.

Its own module with no imports, so the site generator (which must not import the icon
system, see generate-site.ts) can link the same URL the stylesheet would otherwise import.
*/

export const DOC_SYSTEM_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Aleo:ital,wght@0,100..900;1,100..900&family=Spline+Sans+Mono:ital,wght@0,300..700;1,300..700&display=swap'
