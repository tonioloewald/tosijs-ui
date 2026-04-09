/*#
# header

A reusable app header with built-in settings menu for theme switching
and locale selection.

## Basic Header

```html
<tosi-header project-name="My App"></tosi-header>
```
```js
import { tosiHeader } from 'tosijs-ui'

preview.append(
  tosiHeader({ projectName: 'My App' })
)
```

## Header with Links

Pass `projectLinks` as a property to show icon links in the header:

```js
import { tosiHeader } from 'tosijs-ui'

const header = tosiHeader({ projectName: 'Demo' })
header.projectLinks = {
  github: 'https://github.com/example/project',
}
preview.append(header)
```

## Theme and Locale Control

The header's settings menu controls theme (system/dark/light + high contrast)
and locale. Pass a `themePrefs` observable to persist user choices:

```js
import { tosiHeader } from 'tosijs-ui'
import { tosi } from 'tosijs'

const { prefs } = tosi({
  prefs: {
    theme: 'system',
    highContrast: false,
    locale: '',
  },
})

const header = tosiHeader({
  projectName: 'Themed App',
  showLocale: false,
})
header.themePrefs = prefs
preview.append(header)
```
*/
import { Component, elements, varDefault, } from 'tosijs';
import { icons } from './icons';
import { popMenu } from './menu';
import { i18n, setLocale } from './localize';
const { div, span, a, h2, button, slot } = elements;
// Icon mapping for known link types
const linkIcons = {
    tosijs: () => icons.tosi(),
    discord: () => icons.discord(),
    blog: () => icons.blog(),
    github: () => icons.github(),
    npm: () => icons.npm(),
};
export class TosiHeader extends Component {
    static preferredTagName = 'tosi-header';
    static initAttributes = {
        projectName: '',
        showLocale: true,
        showTheme: true,
    };
    projectLinks = {};
    themePrefs = null;
    menuItems = [];
    static shadowStyleSpec = {
        ':host': {
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${varDefault.tosiHeaderPadding('var(--tosi-spacing, 12px)')}`,
            background: varDefault.tosiHeaderBg('var(--tosi-accent, #EE257B)'),
            color: varDefault.tosiHeaderColor('var(--tosi-accent-text, white)'),
            lineHeight: varDefault.tosiHeaderLineHeight('2.5em'),
            gap: varDefault.tosiHeaderGap('4px'),
        },
        ':host .elastic': {
            flex: '1 1 auto',
        },
        ':host a, :host button.iconic': {
            color: 'inherit',
            textDecoration: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px',
            opacity: '0.8',
        },
        ':host a:hover, :host button.iconic:hover': {
            opacity: '1',
        },
        ':host h2': {
            margin: '0',
            fontSize: '1.2em',
            fontWeight: '600',
        },
        ':host .title-link': {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: 'none',
        },
    };
    content = () => {
        const parts = [
            slot({ name: 'before' }),
        ];
        if (this.projectName) {
            parts.push(a({ part: 'title', class: 'title-link', href: '/' }, h2(this.projectName)));
        }
        parts.push(span({ class: 'elastic' }));
        parts.push(slot({ name: 'links' }));
        // Project link icons
        for (const [key, url] of Object.entries(this.projectLinks)) {
            if (!url || !linkIcons[key])
                continue;
            parts.push(a({ class: 'iconic', title: key, target: '_blank', href: url }, linkIcons[key]()));
        }
        parts.push(slot({ name: 'after' }));
        // Settings menu button
        parts.push(button({
            part: 'settings',
            class: 'iconic',
            title: 'settings',
            onClick: (event) => this.showSettingsMenu(event),
        }, icons.moreVertical()));
        return parts;
    };
    showSettingsMenu(event) {
        const items = [];
        if (this.showLocale && i18n.localeOptions.value.length > 0) {
            const prefs = this.themePrefs;
            items.push({
                caption: 'Language',
                icon: 'globe',
                menuItems: i18n.localeOptions.value.map((locale) => ({
                    caption: locale.caption,
                    icon: locale.icon,
                    checked: () => locale.value === i18n.locale.value,
                    action() {
                        if (prefs?.locale) {
                            prefs.locale.value = locale.value;
                        }
                        setLocale(locale.value);
                    },
                })),
            });
        }
        if (this.showTheme) {
            const prefs = this.themePrefs;
            const themeItems = [
                {
                    caption: 'System',
                    checked: () => prefs?.theme.value === 'system',
                    action() {
                        if (prefs)
                            prefs.theme.value = 'system';
                    },
                },
                {
                    caption: 'Dark',
                    checked: () => prefs?.theme.value === 'dark',
                    action() {
                        if (prefs)
                            prefs.theme.value = 'dark';
                    },
                },
                {
                    caption: 'Light',
                    checked: () => prefs?.theme.value === 'light',
                    action() {
                        if (prefs)
                            prefs.theme.value = 'light';
                    },
                },
                null,
                {
                    caption: 'High Contrast',
                    checked: () => prefs?.highContrast.value ?? false,
                    action() {
                        if (prefs)
                            prefs.highContrast.value = !prefs.highContrast.value;
                    },
                },
            ];
            items.push({
                caption: 'Color Theme',
                icon: 'rgb',
                menuItems: themeItems,
            });
        }
        items.push(...this.menuItems);
        if (items.length > 0) {
            popMenu({
                target: event.target,
                localized: true,
                menuItems: items,
            });
        }
    }
}
export const tosiHeader = TosiHeader.elementCreator();
