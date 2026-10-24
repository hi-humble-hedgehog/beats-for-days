import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import jsdoc from "eslint-plugin-jsdoc";

// Rationale for these rules: docs/decisions/0004-code-quality-guardrails.md
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: "bfd/type-aware",
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Async correctness matters a lot for Web Audio scheduling & API calls.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    name: "bfd/complexity-budget",
    files: ["**/*.{ts,tsx,mts,js,mjs}"],
    rules: {
      // Hard ceiling. The CRAP gate (pnpm crap) additionally weighs complexity
      // against test coverage — see docs/guides/testing.md.
      complexity: ["error", 10],
      "max-depth": ["error", 4],
      "max-params": ["error", 4],
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
      "max-lines": [
        "error",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
    },
  },
  {
    name: "bfd/jsdoc-lib",
    files: ["src/lib/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    plugins: {
      jsdoc,
    },
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: true,
          enableFixer: false,
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
        },
      ],
      "jsdoc/require-description": "error",
      "jsdoc/no-types": "error",
      "jsdoc/check-param-names": "error",
      "jsdoc/check-tag-names": "error",
    },
  },
  {
    name: "bfd/tests",
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "max-lines-per-function": "off",
      "max-lines": "off",
    },
  },
  {
    name: "bfd/tooling",
    files: ["scripts/**", ".agents/**"],
    rules: {
      "no-console": "off",
    },
  },
  // Must be last: turns off stylistic rules that conflict with Prettier.
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "reports/**",
    ".stryker-tmp/**",
  ]),
]);

export default eslintConfig;
