import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

/**
 * Shared ESLint flat config for every Beyond Social package.
 *
 * Environment-specific concerns (Next.js browser rules, Node globals) are
 * layered on top by each consuming package so this base stays framework
 * agnostic and can be reused by libraries, the web app, and the worker alike.
 */
export const baseConfig = tseslint.config(
  {
    ignores: ["dist/**", ".next/**", ".turbo/**", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // TypeScript resolves identifiers; the core rule only produces false positives here.
      "no-undef": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  // Keep formatting concerns entirely with Prettier; must remain last.
  eslintConfigPrettier,
);
