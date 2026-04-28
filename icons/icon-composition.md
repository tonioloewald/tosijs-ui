# Icon Composition

<!--{ "pin": "bottom" }-->

This is a toy for playing with the icon composition language introduced in tosijs-ui 1.5.10. It's documented [here](/?icons.ts).

```js
import { tosi, elements } from 'tosijs'
import { icons, svgIcon, defineIcons, tosiSelect } from 'tosijs-ui'

const { suzy } = tosi({
  suzy: {
    icon: 'loader',
    size: 256
  }
})

defineIcons({
  xerox: '<svg class="filled" viewBox="0 0 265 67"><path d="M50 66 29 30 45 1h-7L26 24 13 1H2l17 31L1 66h5l16-28 16 28zM57 1h39v4H66v25h30v4H66v28h30v4H57zM131 6h-15v60h-10V1h27c9 0 16 3 16 17q-1 18-15 16l18 32h-11l-21-36h13c5 0 6-7 6-12s-1-12-6-12zM265 66l-21-36 16-29h-7l-12 23-14-23h-12l19 31-20 34h7l16-28 16 28zM167 34c0-17 2-29 18-29 15 0 17 12 17 29 0 18-2 29-17 29-16 0-18-11-18-29 0-13 0 13 0 0m46 0c0-25-5-34-28-34-24 0-28 9-28 34s4 33 28 33c23 0 28-8 28-33"/></svg>',
  apple: '<svg class="filled" viewBox="0 0 89.89 104.6"><defs><clipPath id="a"><path d="M150.97 50.8c-9.07.38-19.66 3.95-25.85 8.6-5.62 4.21-10.26 10.47-8.46 16.56 9.9.19 20.13-3.47 26.07-8.18 5.55-4.4 9.77-10.63 8.24-16.99m3.35 24.48c-15.27 0-21.72 4.49-32.31 4.49-10.92 0-19.23-4.49-32.43-4.49-12.98 0-26.77 4.88-35.51 13.21l-.16.16A24.3 24.3 0 0 0 46.88 102c-.76 4.14-.56 8.66.62 13.35a46 46 0 0 0 5.93 13.35 65 65 0 0 0 11.45 13.35c7 6.45 16.2 13.28 28.04 13.34 11.08.07 14.21-4.37 29.24-4.42s17.87 4.47 28.94 4.4c11.35-.05 20.7-7 27.67-13.32l1.98-1.83a70 70 0 0 0 10.12-11.51l.87-1.18c-9.96-2.32-17.03-6.85-20.85-12.18-3-4.18-4-8.86-2.81-13.35 1.31-4.98 5.3-9.73 12.2-13.35a45 45 0 0 1 6.52-2.76c-8.72-6.72-20.95-10.61-32.48-10.61"/></clipPath></defs><g clip-path="url(#a)" transform="matrix(.61862 0 0 1 -28.72 -50.8)"><g stroke-linecap="round"><path fill="#75bd21" d="M24.86 37.45H213.3V102H24.86z"/><path fill="#ffc728" d="M24.86 88.65H213.3v26.7H24.86z"/><path fill="#ff661c" d="M24.86 102H213.3v26.7H24.86z"/><path fill="#cf0f2b" d="M24.86 115.35H213.3v26.7H24.86z"/><path fill="#b01cab" d="M24.86 128.7H213.3v26.68H24.86z"/><path fill="#00a1de" d="M24.86 142.06H213.3v26.68H24.86z"/></g></g></svg>',
  next: '<svg viewBox="0 0 1024 1024"><g id="Layer_1"><path id="Path" style="fill:#000000;fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;" d="M163,287 C163,287,645,38,645,38 C645,38,902,506,902,506 C902,506,420,755,420,755 C420,755,163,287,163,287 z"/><path id="Path_Copy" style="fill:#000000;fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;" d="M424,764 C424,764,894,522,894,522 C894,522,810,756,810,756 C810,756,361,984,361,984 C361,984,424,764,424,764 z"/><path id="Path_Copy_1" style="fill:#000000;fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;" d="M120,566 C120,566,349,976,349,976 C349,976,411,763,411,763 C411,763,162,310,162,310 C162,310,120,566,120,566 z"/><path id="Compound_Group" style="fill:#1aae65;fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;" d="M501,557 C501,557,539,432,539,432 C539,432,513,424,513,424 C513,424,474,550,474,550 C474,550,342,514,342,514 C342,514,335,541,335,541 C335,541,466,576,466,576 C466,576,428,702,428,702 C428,702,455,710,455,710 C455,710,493,584,493,584 C493,584,625,619,625,619 C625,619,632,592,632,592 C632,592,501,557,501,557 z"/><path id="Compound_Group-1" style="fill:#df058c;fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;" d="M677,371 C677,371,766,326,766,326 C766,326,753,301,753,301 C753,301,554,402,554,402 C554,402,567,427,567,427 C567,427,652,384,652,384 C652,384,750,555,750,555 C750,555,774,541,774,541 C774,541,677,371,677,371 z"/><g id="Group"><path id="Compound_Group-2" style="fill:#f04828;fill-opacity:1;fill-rule:nonzero;opacity:1;stroke:none;" d="M209,294 C209,294,451,353,451,353 C451,353,370,204,370,204 C370,204,394,191,394,191 C394,191,505,395,505,395 C505,395,263,336,263,336 C263,336,338,474,338,474 C338,474,314,487,314,487"/></g><path id="Compound_Group-3" style="fill:#fbe012;fill-opacity:1;fill-rule:evenodd;opacity:1;stroke:none;" d="M494,243 C494,243,649,162,649,162 C633,145,609,134,584,134 C533,134,492,175,492,225 C492,231,493,237,494,243 z M666,185 C666,185,504,269,504,269 C520,297,549,316,584,316 C634,316,675,275,675,225 C675,222,675,219,674,215 C674,215,704,213,704,213 C704,217,705,221,705,225 C705,290,650,344,584,344 C517,344,463,290,463,225 C463,159,517,106,584,106 C631,106,672,133,692,172 C692,172,666,185,666,185 C666,185,666,185,666,185 z"/></g></svg>',
  hat: '<svg class="filled" viewBox="0 0 640 512"><path d="M617.78 239.05c-24.06-11.08-43.34 4.24-49.07 11.62-1.64 2.45-17.73 25.85-57.17 48.4C495.86 198.05 462 64 392.32 64c-18.35 0-36.06 7.23-52.66 21.52-11.75 10.09-27.5 10.09-39.25 0C283.81 71.23 266.1 64 247.75 64 178.1 64 144.2 198.09 128.53 299.12c-36.85-21.06-53.26-42.81-56.4-47.35a40.82 40.82 0 0 0-49.53-13c-18.21 8.1-27 27.85-20.42 45.93C5.28 292.87 79.16 480 320 480s314.79-187.13 317.82-195.1c6.55-17.99-2.09-37.61-20.04-45.85zm-370-127c6.53 0 13.72 3.33 21.35 9.89 30 25.83 71.9 25.81 101.87 0 7.63-6.58 14.82-9.91 21.35-9.91 18.19 0 44.6 57.37 63.46 148.85-78.15 35.67-186.45 38.81-271.49 0C203.15 169.37 229.56 112 247.75 112zM320 432c-135.81 0-209.67-67.5-245.16-115.87 41.5 27 117.19 58.27 245.16 58.27s204-31.73 245.31-58.54C529.85 364.36 456 432 320 432z"/></svg>',
  tosiHat: '<svg class="stroked filled" viewBox="0 0 48 48"><g id="Layer_1"><path id="Path" style="fill:#8e7f6d;fill-opacity:1;fill-rule:nonzero;opacity:1;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-opacity:1;stroke-width:2;" d="M13.2766,3.05029 C13.1062,3.01931,12.9326,3.08429,12.8244,3.21952 C12.8244,3.21952,9,8,9,8 C9,8,6.05462,8.58908,6.05462,8.58908 C5.56174,8.68765,5.54512,9.38628,6.03275,9.50819 C6.03275,9.50819,24,14,24,14 C24,14,41.9672,9.50819,41.9672,9.50819 C42.4549,9.38628,42.4383,8.68765,41.9454,8.58908 C41.9454,8.58908,39,8,39,8 C39,8,35.1756,3.21952,35.1756,3.21952 C35.0674,3.08429,34.8938,3.01931,34.7234,3.05029 C34.7234,3.05029,24,5,24,5 C24,5,13.2766,3.05029,13.2766,3.05029 z"/></g></svg>',
  coat: '<svg class="stroked filled" viewBox="0 0 48 48"><g id="Layer_1"><path id="Path_Copy" style="fill:#8e7f6d;fill-opacity:1;fill-rule:nonzero;opacity:1;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-opacity:1;stroke-width:2;" d="M7.31734,20.5867 C7.14208,19.7104,7.71038,18.8579,8.58668,18.6827 C8.58668,18.6827,10.4133,18.3173,10.4133,18.3173 C11.2896,18.1421,12.1421,18.7104,12.3173,19.5867 C12.3173,19.5867,12.6405,21.2026,12.6405,21.2026 C12.8314,22.157,13.8156,22.7281,14.7389,22.4204 C14.7389,22.4204,15.1785,22.2738,15.1785,22.2738 C15.6917,22.1028,16.2565,22.1995,16.6836,22.5317 C16.6836,22.5317,24.3753,28.5141,24.3753,28.5141 C24.7695,28.8207,25,29.2921,25,29.7914 C25,29.7914,25,40.3298,25,40.3298 C25,40.7589,24.8295,41.1705,24.5261,41.4739 C24.5261,41.4739,23.4739,42.5261,23.4739,42.5261 C23.1705,42.8295,22.7589,43,22.3298,43 C22.3298,43,9,43,9,43 C7.34315,43,6,41.6569,6,40 C6,40,6,26,6,26 C6,25.3871,6.3463,24.8268,6.89452,24.5527 C6.89452,24.5527,6.89452,24.5527,6.89452,24.5527 C7.5472,24.2264,7.90073,23.5036,7.75762,22.7881 C7.75762,22.7881,7.31734,20.5867,7.31734,20.5867 z"/><path id="Path" style="fill:#8e7f6d;fill-opacity:1;fill-rule:nonzero;opacity:1;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-opacity:1;stroke-width:2;" d="M41,19 C41,19,36,18,36,18 C36,18,35,23,35,23 C35,23,32,22,32,22 C32,22,23,29,23,29 C23,29,23,41,23,41 C23,41,25,43,25,43 C25,43,39,43,39,43 C40.6569,43,42,41.6569,42,40 C42,40,42,25,42,25 C42,25,40,24,40,24 C40,24,41,19,41,19 z"/></g></svg>',
  glasses: '<svg class="stroked filled" viewBox="0 0 48 48"><g id="Layer_1"><path id="Path" style="fill:#006736;fill-opacity:0.535257;fill-rule:evenodd;opacity:1;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-opacity:1;stroke-width:2;" d="M27,16 C27,16,34,16,34,16 C34,16,34,21,34,21 C34,21,27,21,27,21 C27,21,27,16,27,16 z"/><path id="Path-1" style="fill:none;opacity:1;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-opacity:1;stroke-width:2;" d="M21,18 C21,18,21,18,21,18 C21,16.8954,21.8954,16,23,16 C23,16,25,16,25,16 C26.1046,16,27,16.8954,27,18 C27,18,27,18,27,18"/><path id="Path_Copy" style="fill:#006736;fill-opacity:0.535257;fill-rule:evenodd;opacity:1;stroke:#000000;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-opacity:1;stroke-width:2;" d="M14,16 C14,16,21,16,21,16 C21,16,21,21,21,21 C21,21,14,21,14,21 C14,21,14,16,14,16 z"/></g></svg>',
})

const ideas = [
  'Xerox Logo:xerox_fffF60s$square_0000S_f00F',
  'Apple (Six Colors) Logo:apple',
  'NeXT Logo:next',
  'Web Stack:globe_30y$layers30y50o',
  'icomoon:moon15r',
  'Man:tosi',
  'in the trenchcoat:coat$tosi',
  'Man in the trench coat:tosiHat$coat$tosi',
  '(and sunglasses):tosiHat$glasses$coat$tosi',
  'Looking for the:tosiHat$glasses4y$coat$tosi',
  'Big Quote:messageCircle80s70x_60y1W_fffF$tosiHat$glasses4y$coat$tosi',
  'build system:tool0f_50x20y_fffF$settings50o',
  'Not Facebook:slash_f00S$facebook_237F75s50o',
  'flip your lid:hat1f',
  'pin',
  'unPin',
  'right pin:pin0f',
  'build man:tool_fffF70s50x$tosi',
  'which way:spin90Loader',
  'the icon spins:spin_30Loader',
  'lock twenty-five o:lock25o',
  'get sick:plus_f00S50s4W_25x_20y$truck',
  'get well:plus_f00S50s4W25x_20y$truck0f',
  'write a rule for unLock:slash25o$lock75s',
  'un flip pin is unPin0f:unPin0f',
  'and:earth',
  'it:earth150s75o',
  'scales:earth250s50o',
  'play',
  'the very same game:game',
  'add user:plus50s50x_brandColorS$user75s_25x',
  'brand color var:spin60Loader50s_25x$cloud_brandColorS',
  'reach for the stars:mousePointer30x30y50s_fffF$spin_120Star120s_0000S_f00F$spin90Star48r130s_0000S_fffF$spin180Star24r140s_0000S_00fF',
  'Love tosijs-ui:tosi70s$heart_0000S_brandColorF',
].map(idea => {
  const parts = idea.split(':')
    return parts.length > 1 ? {
      icon: parts[1],
      value: parts[1],
      caption: parts[0]
    } : {
      icon: parts[0],
      value: parts[0],
      caption: parts[0]
    }
})

const { h2, div, input, option, code, button } = elements

preview.append(
  div(
    {
      class: 'suzy',
    },
    div(
      {
        style: {
          display: 'flex',
          alignItems: 'stretch'
        }
      },
      tosiSelect({ options: ideas, bindValue: suzy.icon }),
      button(
        {
          onClick() {
            const index = ideas.findIndex(idea => idea.value === suzy.icon.value)
            suzy.icon = ideas[index > -1 && index < ideas.length - 1 ? index + 1 : 0].value
          }
        },
        icons.chevronRight()
      )
    ),
    svgIcon({ icon: suzy.icon, size: suzy.size }),
    input({ title: 'icon', placeholder: 'icon string', bindValue: suzy.icon }),
    input({ title: 'size', type: 'range', bindValue: suzy.size, min: 12, max: 512, step: 4 }),
    code('icons.', suzy.icon, '()'),
  )
)
```
```css
.preview .suzy {
  height: 100%;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.preview .suzy * {
  z-index: 2;
}

.preview .suzy tosi-icon {
  z-index: 1;
}
```
