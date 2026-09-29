/*
`<tosi-tag>`: the chip used by `<tosi-tag-list>` and `<tosi-search-field>`, documented on the
tag-list page. Its own module so importing a chip does not import the tag list's menu system;
`tag-list.ts` re-exports everything here.
*/
import { elements, vars, varDefault, deprecated, withAttributes, } from 'tosijs';
import { icons } from './icons.js';
const { span, button } = elements;
export class TosiTag extends withAttributes({
    caption: '',
    removeable: false,
}) {
    static preferredTagName = 'tosi-tag';
    static lightStyleSpec = {
        ':host': {
            '--tag-close-button-color': '#000c',
            '--tag-close-button-bg': '#fffc',
            '--tag-button-opacity': '0.5',
            '--tag-button-hover-opacity': '0.75',
            '--tag-bg': varDefault.brandColor('blue'),
            '--tag-text-color': varDefault.brandTextColor('white'),
            display: 'inline-flex',
            borderRadius: varDefault.tagRoundedRadius(vars.spacing50),
            color: vars.tagTextColor,
            background: vars.tagBg,
            padding: `0 ${vars.spacing75} 0 ${vars.spacing75}`,
            height: `calc(${vars.lineHeight} + ${vars.spacing50})`,
            lineHeight: `calc(${vars.lineHeight} + ${vars.spacing50})`,
        },
        ':host > [part="caption"]': {
            position: 'relative',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            flex: '1 1 auto',
            fontSize: varDefault.fontSize('16px'),
            color: vars.tagTextColor,
            textOverflow: 'ellipsis',
        },
        ':host [part="remove"]': {
            boxShadow: 'none',
            margin: `0 ${vars.spacing_50} 0 ${vars.spacing25}`,
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'center',
            justifyContent: 'center',
            height: vars.spacing150,
            width: vars.spacing150,
            color: vars.tagCloseButtonColor,
            background: vars.tagCloseButtonBg,
            borderRadius: varDefault.tagCloseButtonRadius('99px'),
            opacity: vars.tagButtonOpacity,
        },
        ':host [part="remove"]:hover': {
            background: vars.tagCloseButtonBg,
            opacity: vars.tagButtonHoverOpacity,
        },
    };
    removeCallback = () => {
        this.remove();
    };
    content = () => [
        span({ part: 'caption' }, this.caption),
        button(icons.x(), {
            type: 'button',
            part: 'remove',
            hidden: !this.removeable,
            ariaLabel: `Remove ${this.caption}`,
            onClick: this.removeCallback,
        }),
    ];
}
/** @deprecated Use TosiTag instead */
export const XinTag = TosiTag;
export const tosiTag = TosiTag.elementCreator();
/** @deprecated Use tosiTag instead */
export const xinTag = deprecated((...args) => tosiTag(...args), 'xinTag is deprecated, use tosiTag instead (tag is now <tosi-tag>)');
