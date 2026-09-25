import { baseConfig } from "@portfolio/config/eslint";

export default [
  {
    // Same reasoning as apps/api/eslint.config.mjs — this file isn't
    // worth type-aware linting and its own import has no type declarations.
    ignores: ["eslint.config.mjs"],
  },
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
