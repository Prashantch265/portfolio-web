import { baseConfig } from "@portfolio/config/eslint";

export default [
  {
    // eslint.config.mjs itself isn't worth type-aware linting (a 5-line
    // config file) and its "@portfolio/config/eslint" import has no type
    // declarations — excluding it here avoids both problems outright
    // rather than fighting them via allowDefaultProject.
    ignores: ["eslint.config.mjs"],
  },
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        // projectService (not a hardcoded `project` path) — tsconfig.json's
        // `include: ["src"]` doesn't cover root-level config files
        // (vitest.config.ts, drizzle.config.ts). A hardcoded project path
        // throws "none of those tsconfigs include this file" the moment
        // one of those is opened directly in an editor; projectService
        // resolves the real project for files under src/ and falls back
        // to a permissive default project for the listed config globs.
        projectService: {
          allowDefaultProject: ["vitest.config.ts", "drizzle.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
