import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Preserved verbatim from the previous .eslintrc.cjs — this project
      // intentionally allows `any` and non-null assertions (see CLAUDE.md).
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/no-non-null-assertion': 0,
      // The codebase uses a leading-underscore convention for intentionally
      // unused bindings (params, destructured values, caught errors).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  /*
  No shadowing in shipped code (#2858). In 1.16.5 `positionFloat` destructured `position` from
  getComputedStyle over its own `position` parameter, code added later read the wrong one, and
  every visual-viewport re-fit blanked open floats.

  `allow` lists element creators, which a component routinely shadows with a part of the same
  name (`const { input } = this.parts`). Misusing one fails loudly: calling an element throws.
  Tests are out of scope: a Playwright spec re-declares names inside `page.evaluate` on purpose,
  because that callback runs in the browser and cannot close over the spec's own.
  */
  {
    files: ['src/**/*.ts', 'bin/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-shadow': [
        'error',
        {
          ignoreTypeValueShadow: true,
          ignoreFunctionTypeParameterNameValueShadow: true,
          allow: ['input', 'label', 'button', 'div', 'select', 'form'],
        },
      ],
    },
  },
  // Specs take `test` from tests/fixtures.ts, which keeps third-party servers out of the lane
  // (a hung README badge timed out `goto('/')` in the 1.16.24 release run).
  {
    files: ['tests/**/*.pw.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          name: '@playwright/test',
          message:
            "Import from './fixtures': it keeps third-party servers out of page loads (answers images and stylesheets, caches pinned CDN scripts).",
        },
      ],
    },
  },
  // Mirrors .prettierignore's non-markdown entries: format-check now runs ESLint over `.`, and
  // `eslint --fix` must not rewrite what Prettier deliberately leaves alone (vendored or
  // generated files). 1.16.0 re-review 3.
  {
    ignores: [
      '**/dist/',
      'docs/',
      // The dev server's copy of the last good build (gitignored), there only while one runs.
      '*.last-good/',
      'node_modules/',
      'www/',
      'cdn/',
      'src/icons/',
      'src/icon-data.ts',
      'src/version.ts',
      'playwright-report/',
      'test-results/',
      'demo/xinjs-icon-font/',
      '.nova/',
    ],
  }
)
