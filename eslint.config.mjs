// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import tsParser from "@typescript-eslint/parser";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          argsIgnorePattern: "^_", // Ignore function arguments prefixed with "_"
          caughtErrors: "all", // Check for unused variables in catch blocks
          caughtErrorsIgnorePattern: "^_", // Ignore catch variables prefixed with "_"
        },
      ],
    },
  }
);
