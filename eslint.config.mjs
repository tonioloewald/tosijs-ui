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
  { ignores: ['**/dist/', 'docs/', 'node_modules/'] }
)
