// Back-compat shim. The doc-extraction implementation now lives in the
// importable doc-site system at src/doc-system/site/docs.ts (shipped as
// `tosijs-ui/site`). This path is kept (package.json#files lists /bin/docs.ts)
// so existing `import { extractDocs } from 'tosijs-ui/bin/docs'` consumers and
// the `bun bin/docs.ts` CLI keep working.
//
// No `/*#` doc block here on purpose: the documented copy lives in the real
// module, so the doc extractor surfaces it once (avoiding a slug collision).
export * from '../src/doc-system/site/docs'
