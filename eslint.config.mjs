import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const NODE_BUILTINS = [
  'node:*',
  'fs',
  'path',
  'os',
  'child_process',
  'crypto',
  'net',
  'http',
  'https',
]

export default defineConfig(
  globalIgnores(['out/', 'dist/', 'coverage/']),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', ...NODE_BUILTINS],
              message: 'O renderer não acessa Node nem Electron; use window.fai.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/preload/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: NODE_BUILTINS, message: 'Preloads rodam em sandbox: sem módulos Node.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'react', 'react-dom', 'zod', '@shared/*', ...NODE_BUILTINS],
              message: 'O domínio é puro: sem Electron, Node, React, zod ou camadas externas.',
            },
            {
              group: ['**/main/**', '**/preload/**', '**/renderer/**', '**/shared/**'],
              message: 'O domínio não depende de outras camadas.',
            },
          ],
        },
      ],
    },
  },
  prettier,
)
