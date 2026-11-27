import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Files that must stay free of React so their logic is unit-testable on its own.
// Keep this list in sync with "Global Constraints" in the Phase 1 plan and CLAUDE.md.
const pureLogicFiles = [
  'src/netcore/**',
  'src/content/lessons/**/logic.ts',
  'src/progress/logic.ts',
  'src/progress/parse.ts',
  'src/sim/playerReducer.ts',
  'src/quiz/scoreQuiz.ts',
  'src/labs/practice.ts',
  'src/labs/builderReducer.ts',
];

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules', 'docs', '.superpowers']),
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      // The plan uses both `type` aliases and `interface`; allow either.
      '@typescript-eslint/consistent-type-definitions': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'max-lines': [
        'error',
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      'no-console': 'error',
    },
  },
  {
    files: pureLogicFiles,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-*'],
              message:
                'Pure-logic files must not import React. Keep logic in plain TypeScript and render it elsewhere.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.ts', '*.config.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  prettier,
]);
