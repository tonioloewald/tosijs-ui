/*
The iife registers the schema validator itself.

This bundle is one WE build, so importing `tosijs-schema` here costs a consumer nothing —
there is no resolution for them to fail and no entry in their lockfile. It is why a CDN
`<script>` user and the doc site get validation with no setup, while an ESM consumer who
never touches a schema never sees the package at all.

~8KB gzip against a bundle already north of 400KB.
*/
import * as xinjsuiCore from './index.js'
/*
The iife/hydrate bundle DOES want the doc system — it is what every generated doc page runs,
and what a CDN `<script>` user expects on `window.xinjsui`. The root barrel no longer carries
it (see index.ts / tosijs-ui#133), so pull it in explicitly here.

This is the right split: the cost lands on the bundle built FOR the doc site, and not on an
app that imports a button.
*/
import * as codeEditor from './code-editor.js'
import * as docBrowser from './doc-browser.js'
import * as docSystem from './doc-system/doc-system.js'
import * as liveExample from './live-example.js'

const xinjsui = {
  ...xinjsuiCore,
  ...codeEditor,
  ...docBrowser,
  ...docSystem,
  ...liveExample,
}
import * as xinjs from 'tosijs'
import {
  validate,
  inferSchema,
  unenforcedKeywords,
  setWarnings,
} from 'tosijs-schema'
import { setSchemaValidator } from './schema-form/validator.js'

/*
`oneOf` warns once per process in tosijs-schema 1.8.0 — it is validated by trying every
branch, where `anyOf` short-circuits. That is worth knowing when you are AUTHORING a schema
and noise when you are merely rendering someone else's, which is what a doc site and a CDN
page are doing. The advice survives where it belongs: the schema-form docs say to prefer
`anyOf` for a discriminated union.
*/
setWarnings(false)
setSchemaValidator({ validate, inferSchema, unenforcedKeywords })

Object.assign(globalThis, { xinjs, xinjsui })
