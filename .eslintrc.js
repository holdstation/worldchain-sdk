module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    project: ["./tsconfig.json", "./packages/*/tsconfig.json"],
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "prettier", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended", // This integrates Prettier with ESLint
  ],
  rules: {
    // Common rules for the entire workspace
    "prettier/prettier": ["error", {}, { usePrettierrc: true }],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-undef": "error",
  },
  ignorePatterns: ["**/dist/**", "**/node_modules/**", "**/*.js", "**/*.test.ts"],
  overrides: [
    {
      files: ["*.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    {
      files: ["scripts/**/*.js"],
      rules: {
        "no-console": "off",
      },
    },
  ],
};
