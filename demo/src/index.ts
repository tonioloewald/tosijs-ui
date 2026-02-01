import { elements, StyleSheet, version, bind, hotReload, vars } from 'tosijs'

import {
  createDocBrowser,
  icons,
  i18n,
  initLocalization,
  popMenu,
  setLocale,
  version as uiVersion,
} from '../../src'

import { styleSpec } from './style'
StyleSheet('demo-style', styleSpec)

import localizedStrings from './localized-strings'
initLocalization(localizedStrings)

import * as tosijs from 'tosijs'
import * as tosijsui from '../../src/'

Object.assign(window, { tosijs, tosijsui })

import './css-var-editor'
import docs from '../docs.json'

setTimeout(() => {
  const brandColor = getComputedStyle(document.body).getPropertyValue(
    '--brand-color'
  )

  console.log(
    'welcome to %ui.tosijs.net',
    `color: ${brandColor}; padding: 0 5px;`
  )
}, 100)

const PROJECT = 'tosijs-ui'

const { prefs } = tosijs.tosi({
  prefs: {
    theme: 'system',
    highContrast: false,
    locale: '',
  },
})

hotReload((path) => {
  if (path.startsWith('prefs')) {
    return true
  }
  return false
})

if (prefs.locale) {
  setLocale(prefs.locale.value)
}

setTimeout(() => {
  Object.assign(globalThis, { tosijs, tosijsui })
}, 1000)

bind(document.body, 'prefs.theme', {
  toDOM(element, theme) {
    if (theme === 'system') {
      theme =
        getComputedStyle(document.body).getPropertyValue('--darkmode') ===
        'true'
          ? 'dark'
          : 'light'
    }
    element.classList.toggle('darkmode', theme === 'dark')
  },
})

bind(document.body, 'prefs.highContrast', {
  toDOM(element, highContrast) {
    element.classList.toggle('high-contrast', highContrast)
  },
})

const main = document.querySelector('main') as HTMLElement | null

const browser = createDocBrowser({
  docs,
  context: { tosijs, 'tosijs-ui': tosijsui },
  projectName: PROJECT,
  projectLinks: {
    tosijs: 'https://tosijs.net',
    github: `https://github.com/tonioloewald/${PROJECT}#readme`,
    npm: `https://www.npmjs.com/package/${PROJECT}`,
    discord: 'https://discord.com/invite/ramJ9rgky5',
    blog: 'https://loewald.com',
    bundle: `https://bundlejs.com/?q=${PROJECT}`,
    cdn: `https://www.jsdelivr.com/package/npm/${PROJECT}`,
  },
})

if (main) {
  const header = browser.querySelector('header')
  if (header) {
    const { img, a, span, button } = elements

    // Add bundle and cdn badges before the icon links
    const sizeBreakElement = header.querySelector('xin-sizebreak')
    if (sizeBreakElement) {
      const badges = span(
        {
          style: {
            marginRight: vars.spacing,
            display: 'flex',
            alignItems: 'center',
            gap: vars.spacing50,
          },
        },
        a(
          { href: `https://bundlejs.com/?q=${PROJECT}`, target: '_blank' },
          img({
            alt: 'bundlejs size badge',
            src: `https://deno.bundlejs.com/?q=${PROJECT}&badge=`,
          })
        ),
        a(
          {
            href: `https://www.jsdelivr.com/package/npm/${PROJECT}`,
            target: '_blank',
          },
          img({
            alt: 'jsdelivr',
            src: `https://data.jsdelivr.com/v1/package/npm/${PROJECT}/badge`,
          })
        )
      )
      const largeSlot = sizeBreakElement.querySelector('[slot="large"]')
      if (largeSlot) {
        largeSlot.replaceChildren(badges)
      } else {
        sizeBreakElement.prepend(badges)
      }
    }

    // Add settings menu button at the end
    const settingsButton = button(
      {
        class: 'iconic',
        style: { color: vars.linkColor },
        title: 'links and settings',
        onClick(event) {
          popMenu({
            target: event.target as HTMLButtonElement,
            localized: true,
            menuItems: [
              {
                caption: 'Language',
                icon: 'globe',
                menuItems: i18n.localeOptions.value.map((locale) => ({
                  caption: locale.caption,
                  icon: locale.icon,
                  checked: () => locale.value === i18n.locale.value,
                  action() {
                    prefs.locale.value = locale.value
                    setLocale(locale.value)
                  },
                })),
              },
              {
                caption: 'Color Theme',
                icon: 'rgb',
                menuItems: [
                  {
                    caption: 'System',
                    checked() {
                      return prefs.theme.value === 'system'
                    },
                    action() {
                      prefs.theme.value = 'system'
                    },
                  },
                  {
                    caption: 'Dark',
                    checked() {
                      return prefs.theme.value === 'dark'
                    },
                    action() {
                      prefs.theme.value = 'dark'
                    },
                  },
                  {
                    caption: 'Light',
                    checked() {
                      return prefs.theme.value === 'light'
                    },
                    action() {
                      prefs.theme.value = 'light'
                    },
                  },
                  null,
                  {
                    caption: 'High Contrast',
                    checked() {
                      return prefs.highContrast.value
                    },
                    action() {
                      prefs.highContrast.value = !prefs.highContrast.value
                    },
                  },
                ],
              },
            ],
          })
        },
      },
      icons.moreVertical()
    )
    header.append(settingsButton)
  }

  main.append(browser)
}

console.log(`tosijs ${version}, tosijs-ui ${uiVersion}`)
