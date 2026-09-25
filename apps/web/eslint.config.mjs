import { baseConfig } from "@portfolio/config/eslint";

export default [
  {
    // eslint.config.mjs isn't worth type-aware linting and its own import
    // has no type declarations; next-env.d.ts is Next-generated and its
    // triple-slash reference is the required convention.
    ignores: ["eslint.config.mjs", "next-env.d.ts", ".next/**"],
  },
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        // projectService, not a hardcoded `project` path — see
        // apps/api/eslint.config.mjs for why (same class of "file not in
        // any tsconfig" error, here for any future root-level config file).
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
