import {
  elements,
  tosi,
  vars,
  bindings,
  touch,
  getListItem,
  StyleSheet,
  version,
  bind,
  hotReload,
  debounce,
} from 'tosijs'

import {
  icons,
  markdownViewer,
  MarkdownViewer,
  LiveExample,
  sideNav,
  SideNav,
  sizeBreak,
  i18n,
  initLocalization,
  xinLocalized,
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
    'welcome to %cui.xinjs.net',
    `color: ${brandColor}; padding: 0 5px;`
  )
}, 100)

const PROJECT = 'tosijs-ui'

const docName =
  document.location.search !== ''
    ? document.location.search.substring(1).split('&')[0]
    : 'README.md'
const currentDoc = docs.find((doc) => doc.filename === docName) || docs[0]

const { app, prefs } = tosi({
  app: {
    title: PROJECT,
    blogUrl: `https://loewald.com`,
    discordUrl: `https://discord.com/invite/ramJ9rgky5`,
    githubUrl: `https://github.com/tonioloewald/${PROJECT}#readme`,
    npmUrl: `https://www.npmjs.com/package/${PROJECT}`,
    xinjsUrl: 'https://xinjs.net',
    bundleBadgeUrl: `https://deno.bundlejs.com/?q=${PROJECT}&badge=`,
    bundleUrl: `https://bundlejs.com/?q=${PROJECT}`,
    cdnBadgeUrl: `https://data.jsdelivr.com/v1/package/npm/${PROJECT}/badge`,
    cdnUrl: `https://www.jsdelivr.com/package/npm/${PROJECT}`,
    optimizeLottie: false,
    lottieFilename: '',
    lottieData: '',
    docs,
    currentDoc,
  },
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
  setLocale(prefs.locale.valueOf())
}

bindings.docLink = {
  toDOM(elt, filename) {
    elt.setAttribute('href', `?${filename}`)
  },
}

bindings.current = {
  toDOM(elt, currentFile) {
    const boundFile = elt.getAttribute('href') || ''
    elt.classList.toggle('current', currentFile === boundFile.substring(1))
  },
}

setTimeout(() => {
  // provide globals for experimentation, but prevent them from masking compile bugs
  Object.assign(globalThis, { app, tosi, bindings, elements, vars, touch })
}, 1000)

const main = document.querySelector('main') as HTMLElement | null

const { h2, div, span, a, img, header, button, template, input } = elements

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
    element.classList.toggle('high-contrast', highContrast.valueOf())
  },
})

window.addEventListener('popstate', () => {
  const filename = window.location.search.substring(1)
  app.currentDoc =
    app.docs.find((doc) => doc.filename === filename) || app.docs[0]
})

const filterDocs = debounce(() => {
  console.time('filter')
  const needle = searchField.value.toLocaleLowerCase()
  app.docs.forEach((doc: any) => {
    doc.hidden =
      !doc.title.toLocaleLowerCase().includes(needle) &&
      !doc.text.toLocaleLowerCase().includes(needle)
  })
  touch(app.docs)
  console.timeEnd('filter')
})

const searchField = input({
  slot: 'nav',
  placeholder: 'search',
  type: 'search',
  style: {
    width: 'calc(100% - 10px)',
    margin: '5px',
  },
  onInput: filterDocs,
})

if (main)
  main.append(
    header(
      a(
        {
          href: '/',
          style: {
            display: 'flex',
            alignItems: 'center',
            borderBottom: 'none',
          },
          title: `tosijs ${version}, tosijs-ui ${uiVersion}`,
        },
        icons.tosiUi({
          style: { _xinIconSize: 40, marginRight: 10 },
        }),
        h2({ bindText: 'app.title' })
      ),
      span({ class: 'elastic' }),
      sizeBreak(
        {
          minWidth: 750,
        },
        span(
          {
            style: {
              marginRight: vars.spacing,
              display: 'flex',
              alignItems: 'center',
              gap: vars.spacing50,
            },
          },
          a(
            { href: app.bundleUrl },
            img({ alt: 'bundlejs size badge', src: app.bundleBadgeUrl })
          ),
          a(
            { href: app.cdnUrl },
            img({ alt: 'jsdelivr', src: app.cdnBadgeUrl })
          )
        ),
        span({ slot: 'small' })
      ),
      a(
        { class: 'iconic', title: 'discord', target: '_blank' },
        icons.discord(),
        {
          href: app.discordUrl,
        }
      ),
      a({ class: 'iconic', title: 'blog', target: '_blank' }, icons.blog(), {
        href: app.blogUrl,
      }),
      a(
        { class: 'iconic', title: 'github', target: '_blank' },
        icons.github(),
        {
          href: app.githubUrl,
        }
      ),
      a({ class: 'iconic', title: 'npmjs', target: '_blank' }, icons.npm(), {
        href: app.npmUrl,
      }),
      span({ style: { flex: '0 0 10px' } }),
      button(
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
                  menuItems: i18n.localeOptions.map((locale) => ({
                    caption: locale.caption,
                    icon: locale.icon,
                    checked: () =>
                      locale.value.valueOf() === i18n.locale.valueOf(),
                    action() {
                      prefs.locale = locale.value.valueOf()
                      setLocale(locale.value.valueOf())
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
                        return prefs.theme.valueOf() === 'system'
                      },
                      action() {
                        prefs.theme = 'system'
                      },
                    },
                    {
                      caption: 'Dark',
                      checked() {
                        return prefs.theme.valueOf() === 'dark'
                      },
                      action() {
                        prefs.theme = 'dark'
                      },
                    },
                    {
                      caption: 'Light',
                      checked() {
                        return prefs.theme.valueOf() === 'light'
                      },
                      action() {
                        prefs.theme = 'light'
                      },
                    },
                    null,
                    {
                      caption: 'High Contrast',
                      checked() {
                        return prefs.highContrast.valueOf()
                      },
                      action() {
                        prefs.highContrast = !prefs.highContrast.valueOf()
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
    ),
    sideNav(
      {
        name: 'Documentation',
        navSize: 200,
        minSize: 600,
        style: {
          flex: '1 1 auto',
          overflow: 'hidden',
        },
      },
      searchField,
      div(
        {
          slot: 'nav',
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            overflowY: 'scroll',
          },
          bindList: {
            hiddenProp: 'hidden',
            value: app.docs,
          },
        },
        template(
          a(
            {
              class: 'doc-link',
              bindCurrent: 'app.currentDoc.filename',
              bindDocLink: '^.filename',
              onClick(event: Event) {
                const a = event.target as HTMLAnchorElement
                const doc = getListItem(event.target as HTMLElement)
                const nav = (event.target as HTMLElement).closest(
                  'xin-sidenav'
                ) as SideNav
                nav.contentVisible = true
                const { href } = a
                window.history.pushState({ href }, '', href)
                app.currentDoc = doc
                event.preventDefault()
              },
            },
            xinLocalized({ bindText: '^.title' })
          )
        )
      ),
      div(
        {
          style: {
            position: 'relative',
            overflowY: 'scroll',
            height: '100%',
          },
        },
        button(
          {
            title: 'show navigation',
            class: 'iconic transparent close-nav show-within-compact',
            style: {
              marginTop: '2px',
              position: 'fixed',
            },
            onClick(event: Event) {
              ;(
                (event.target as HTMLElement).closest('xin-sidenav') as SideNav
              ).contentVisible = false
            },
          },
          icons.chevronLeft({ size: 32 })
        ),
        markdownViewer({
          style: {
            display: 'block',
            maxWidth: '44em',
            margin: 'auto',
            padding: `0 1em`,
            overflow: 'hidden',
          },
          bindValue: 'app.currentDoc.text',
          didRender(this: MarkdownViewer) {
            LiveExample.insertExamples(this, { tosijs, tosijsui })
          },
        })
      )
    )
  )
