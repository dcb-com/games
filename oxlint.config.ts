import { fileURLToPath } from "node:url";
import { defineConfig } from "oxlint";

// The same lint rules as the DCB web apps: ESLint's and typescript-eslint's
// recommended, type-checked and stylistic sets, the React hooks rules, the
// theme rule that refuses raw palette colors and hex values in classes, and
// the two DCB plugins in tooling/oxlint (no `unknown` or `any`; money is
// converted only in src/money).

// A JS plugin is an ESLint plugin that oxlint runs in Node, named by path.
function local(name: string, file: string) {
  return {
    name,
    specifier: fileURLToPath(new URL(file, import.meta.url)),
  };
}

const palette =
  "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";
const colorUtility =
  "(?:bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|divide|shadow|accent|caret|placeholder|inset-ring)";

export default defineConfig({
  plugins: ["typescript", "import", "react"],
  jsPlugins: [local("dcb", "./tooling/oxlint/defined-types-plugin.ts")],
  categories: { correctness: "off" },
  env: { builtin: true },
  ignorePatterns: [
    "**/*.config.*",
    "**/*.mjs",
    "**/*.cjs",
    "src/routeTree.gen.ts",
    "dist",
    "tooling/**",
  ],
  options: {
    typeAware: true,
    reportUnusedDisableDirectives: "warn",
  },
  rules: {
    // eslint:recommended
    "for-direction": "error",
    "no-async-promise-executor": "error",
    "no-case-declarations": "error",
    "no-compare-neg-zero": "error",
    "no-cond-assign": "error",
    "no-constant-binary-expression": "error",
    "no-constant-condition": "error",
    "no-control-regex": "error",
    "no-debugger": "error",
    "no-delete-var": "error",
    "no-dupe-else-if": "error",
    "no-duplicate-case": "error",
    "no-empty": "error",
    "no-empty-character-class": "error",
    "no-empty-pattern": "error",
    "no-empty-static-block": "error",
    "no-ex-assign": "error",
    "no-extra-boolean-cast": "error",
    "no-fallthrough": "error",
    "no-global-assign": "error",
    "no-invalid-regexp": "error",
    "no-irregular-whitespace": "error",
    "no-loss-of-precision": "error",
    "no-misleading-character-class": "error",
    "no-nonoctal-decimal-escape": "error",
    "no-prototype-builtins": "error",
    "no-regex-spaces": "error",
    "no-self-assign": "error",
    "no-shadow-restricted-names": "error",
    "no-sparse-arrays": "error",
    "no-unexpected-multiline": "error",
    "no-unsafe-finally": "error",
    "no-unsafe-optional-chaining": "error",
    "no-unused-labels": "error",
    "no-unused-private-class-members": "error",
    "no-useless-backreference": "error",
    "no-useless-catch": "error",
    "no-useless-escape": "error",
    "require-yield": "error",
    "use-isnan": "error",
    "valid-typeof": "error",
    "no-var": "error",
    "prefer-const": "error",
    "prefer-rest-params": "error",
    "prefer-spread": "error",

    // typescript-eslint: recommended and recommended-type-checked
    "no-array-constructor": "error",
    "no-unused-expressions": "error",
    "typescript/await-thenable": "error",
    "typescript/ban-ts-comment": "error",
    "typescript/no-array-delete": "error",
    "typescript/no-base-to-string": "error",
    "typescript/no-duplicate-enum-values": "error",
    "typescript/no-duplicate-type-constituents": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/no-explicit-any": "error",
    "typescript/no-extra-non-null-assertion": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-for-in-array": "error",
    "typescript/no-implied-eval": "error",
    "typescript/no-misused-new": "error",
    "typescript/no-namespace": "error",
    "typescript/no-non-null-asserted-optional-chain": "error",
    "typescript/no-redundant-type-constituents": "error",
    "typescript/no-require-imports": "error",
    "typescript/no-this-alias": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    "typescript/no-unnecessary-type-constraint": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-declaration-merging": "error",
    "typescript/no-unsafe-enum-comparison": "error",
    "typescript/no-unsafe-function-type": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/no-unsafe-unary-minus": "error",
    "typescript/no-wrapper-object-types": "error",
    "typescript/only-throw-error": "error",
    "typescript/prefer-as-const": "error",
    "typescript/prefer-namespace-keyword": "error",
    "typescript/prefer-promise-reject-errors": "error",
    "typescript/require-await": "error",
    "typescript/restrict-plus-operands": "error",
    "typescript/restrict-template-expressions": "error",
    "typescript/triple-slash-reference": "error",
    "typescript/unbound-method": "error",

    // typescript-eslint: stylistic-type-checked
    "no-empty-function": "error",
    "typescript/adjacent-overload-signatures": "error",
    "typescript/array-type": "error",
    "typescript/ban-tslint-comment": "error",
    "typescript/class-literal-property-style": "error",
    "typescript/consistent-generic-constructors": "error",
    "typescript/consistent-indexed-object-style": "error",
    "typescript/consistent-type-assertions": "error",
    "typescript/consistent-type-definitions": "error",
    "typescript/dot-notation": "error",
    "typescript/no-confusing-non-null-assertion": "error",
    "typescript/no-inferrable-types": "error",
    "typescript/non-nullable-type-assertion-style": "error",
    "typescript/prefer-find": "error",
    "typescript/prefer-for-of": "error",
    "typescript/prefer-function-type": "error",
    "typescript/prefer-includes": "error",
    "typescript/prefer-nullish-coalescing": "error",
    "typescript/prefer-regexp-exec": "error",
    "typescript/prefer-string-starts-ends-with": "error",

    // Ours
    "no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "typescript/consistent-type-imports": [
      "warn",
      { prefer: "type-imports", fixStyle: "separate-type-imports" },
    ],
    "typescript/no-misused-promises": [
      "error",
      { checksVoidReturn: { attributes: false } },
    ],
    "typescript/no-unnecessary-condition": [
      "error",
      { allowConstantLoopConditions: true },
    ],
    "typescript/no-non-null-assertion": "error",
    "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
  },
  overrides: [
    {
      // Every value has a defined type. Data from outside is parsed at the
      // edge and the type comes from the schema, so `unknown` and `any` are
      // refused. Where one must stay, the line above says why:
      //
      //   // oxlint-disable-next-line dcb/no-unknown -- parsed on the next line
      files: ["**/*.ts", "**/*.tsx"],
      rules: {
        "dcb/no-unknown": "error",
        "dcb/disable-needs-reason": "error",
        "typescript/no-unsafe-type-assertion": "error",
      },
    },
    {
      // A test hands a small fake to code that wants the whole object, and
      // the cast is how it says so. Tests still may not use `unknown` or `any`.
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "typescript/no-unsafe-type-assertion": "off",
      },
    },
    {
      // Money is converted only in src/money (Money.fromDollarNumber,
      // .format and the rest). Something that is not money, such as a
      // percent, says so on the line:
      //   // oxlint-disable-next-line dcb-money/no-raw-money-math -- a percent
      files: ["**/*.ts", "**/*.tsx"],
      excludeFiles: ["src/money/**"],
      jsPlugins: [local("dcb-money", "./tooling/oxlint/money-plugin.ts")],
      rules: {
        "dcb-money/no-raw-money-math": "error",
      },
    },
    {
      files: ["**/*.ts", "**/*.tsx"],
      rules: {
        "react/rules-of-hooks": "error",
        "react/exhaustive-deps": "warn",
        "react/error-boundaries": "error",
        "react/globals": "error",
        "react/immutability": "error",
        "react/incompatible-library": "warn",
        "react/preserve-manual-memoization": "error",
        "react/purity": "error",
        "react/refs": "error",
        "react/set-state-in-effect": "error",
        "react/set-state-in-render": "error",
        "react/static-components": "error",
        "react/unsupported-syntax": "warn",
        "react/use-memo": "error",
        "react/void-use-memo": "error",
      },
    },
    {
      // Every color comes from src/theme.css. A raw palette class or a hex
      // value in a class skips the theme. Add a token, then use the token.
      files: ["**/*.tsx"],
      jsPlugins: ["eslint-plugin-better-tailwindcss"],
      rules: {
        "better-tailwindcss/no-restricted-classes": [
          "error",
          {
            restrict: [
              {
                pattern: `(?:^|:)${colorUtility}-${palette}-\\d{2,3}(?:/|$)`,
                message:
                  "Raw palette color. Use a semantic token from src/theme.css (bg-warning, text-success-foreground, ...), or add one.",
              },
              {
                pattern: "\\[#[0-9a-fA-F]{3,8}\\]",
                message:
                  "Hex color in a class. Add a token to src/theme.css and use it.",
              },
            ],
          },
        ],
      },
    },
    {
      // A route redirects by throwing, and that is not an error: the router
      // catches it and moves.
      files: ["src/routes/**/*.tsx"],
      rules: {
        "typescript/only-throw-error": [
          "error",
          {
            allow: [
              {
                from: "package",
                package: "@tanstack/router-core",
                name: "Redirect",
              },
            ],
          },
        ],
      },
    },
  ],
});
