/*
Shared by `<tosi-tag-list>` and `<tosi-search-field>`, whose chips are coloured the same way.
Internal: not re-exported from the package root.
*/
import { Color, contrastRatio } from 'tosijs'

/*
Tag colours (#173). A Tag in `availableTags` may carry `background` and `color`; they colour the
tag's chip and its row in the pick menu. Given only a background, the text is whichever of black
or white contrasts more with it — `Color.contrasting()` alone picks white on pure red at 4.0:1
where black gives 5.25:1.
*/
function textColorFor(background: string): string {
  const onBlack = contrastRatio('#000000', background)
  const onWhite = contrastRatio('#ffffff', background)
  if (onBlack == null || onWhite == null) {
    return Color.fromCss(background).contrasting().html
  }
  return onBlack >= onWhite ? '#000000' : '#ffffff'
}

/** The `--tag-bg` / `--tag-text-color` values for a tag, or null if it has no colours. */
export function tagColors(
  tag: { background?: string; color?: string } | undefined
): { background?: string; color?: string } | null {
  const background = tag?.background
  const color =
    tag?.color ?? (background ? textColorFor(background) : undefined)
  return background || color ? { background, color } : null
}
