import { baseConfig } from "@portfolio/config/eslint";

export default [
  {
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
