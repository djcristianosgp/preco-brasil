import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'public', 'scripts/cache'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-console': 'error',
      'max-lines': [
        'error',
        {
          max: 350,
          skipBlankLines: false,
          skipComments: false,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/utils/logger.ts', 'src/**/*.test.{ts,tsx}', 'src/**/__tests__/**', 'src/test/**'],
    rules: {
      'no-console': 'off',
      'max-lines': 'off',
    },
  },
  {
    files: ['src/types/**/*.ts'],
    rules: {
      'max-lines': 'off',
    },
  },
);
