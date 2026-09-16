/*
The entry behind `tosijs-ui/doc-browser`.

This exists because that import — the one EVERY adoption doc tells you to write, and the one
the build's own remediation warning prints when it detects a missing doc system — did not
define `<tosi-doc-system>`.

`doc-browser.ts` is a library module: types, helpers, and the `createDocBrowser()` factory. The
custom element lives in `doc-system/doc-system.ts`, which imports FROM `doc-browser.ts`. The
dependency arrow runs the wrong way, so the documented import could never reach the registrar
however it was written.

The result was precisely the failure mode the adoption page warns about, and it is disguised by
being a PARTIAL success: `tosi-sidenav`, `tosi-example` and the other leaf components do
register, so the bundle looks healthy, pages serve 200, and `<tosi-doc-system>` sits in the
markup inert. The expensive half is quieter — no doc system means no `window.__docTestResults`,
so an adopter's entire inline doc-test corpus silently stops existing. The suite does not fail;
it reports nothing. Two projects hit this independently (#158, #159), one of them reaching a
release candidate before anyone noticed.

A SEPARATE FILE, not a side-effect import inside `doc-browser.ts`: that would be a genuine
import cycle (doc-system → doc-browser → doc-system). It would probably work, because
`doc-system.ts` uses `createDocBrowser` only inside methods — but "probably works, depending on
evaluation order after your bundler reorders it" is not a thing to put under the one import
every adopter is told to write. Nothing here depends on evaluation order.
*/

import './doc-system/doc-system.js'

export * from './doc-browser.js'
