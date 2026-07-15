import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const sharedRules = {
  ...js.configs.recommended.rules,
  'no-unused-vars': ['error', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrors: 'none',
  }],
}

export default [
  { ignores: ['dist'] },

  // Browser React application.
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...sharedRules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      // This project intentionally does not use PropTypes.
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // Node backend, build scripts, and config files.
  {
    files: [
      'server/**/*.js',
      'scripts/**/*.mjs',
      '*.config.js',
      'vite.config.js',
      'eslint.config.js',
      'generate-icons.mjs',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.node, Blob: 'readonly', FormData: 'readonly', fetch: 'readonly' },
      sourceType: 'module',
    },
    rules: sharedRules,
  },
]
