/*
The iife registers the schema validator itself.

This bundle is one WE build, so importing `tosijs-schema` here costs a consumer nothing —
there is no resolution for them to fail and no entry in their lockfile. It is why a CDN
`<script>` user and the doc site get validation with no setup, while an ESM consumer who
never touches a schema never sees the package at all.

~8KB gzip against a bundle already north of 400KB.
*/
import * as xinjsui from './index.js'
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
