// Shared flat ESLint config, consumed by apps/api and apps/web.
// Kept intentionally small for M0 — enough to catch real mistakes
// (unused vars, floating promises) without imposing a style debate.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  {
    ignores: ["dist/**", ".next/**", ".turbo/**", "node_modules/**"],
  },
];

export default baseConfig;
