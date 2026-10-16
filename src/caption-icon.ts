/*
`caption:icon` in the option strings of `<tosi-select>` and `<tosi-segmented>`, split in ONE
place. The caption ends at the FIRST colon, because an icon name may hold one itself: an
explicit composition rule (`check:square`) is still an icon name.
*/

/** `caption:icon` split at the first colon, both trimmed; the icon is '' when absent. */
export function splitCaptionIcon(text: string): [string, string] {
  const colon = text.indexOf(':')
  return colon === -1
    ? [text.trim(), '']
    : [text.slice(0, colon).trim(), text.slice(colon + 1).trim()]
}
