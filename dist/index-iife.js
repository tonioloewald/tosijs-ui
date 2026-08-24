/*
The iife registers the schema validator itself.

This bundle is one WE build, so importing `tosijs-schema` here costs a consumer nothing —
there is no resolution for them to fail and no entry in their lockfile. It is why a CDN
`<script>` user and the doc site get validation with no setup, while an ESM consumer who
never touches a schema never sees the package at all.

~8KB gzip against a bundle already north of 400KB.
*/
import * as xinjsui from './index.js';
import * as xinjs from 'tosijs';
import { validate, inferSchema } from 'tosijs-schema';
import { setSchemaValidator } from './schema-form/validator.js';
setSchemaValidator({ validate, inferSchema });
Object.assign(globalThis, { xinjs, xinjsui });
