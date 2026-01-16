module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  extends: ["eslint:recommended"],
  rules: {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  },
  ignorePatterns: ["node_modules/", "dist/"],
  overrides: [
    {
      files: ["src/__tests__/**/*.js"],
      env: {
        jest: true
      }
    }
  ]
};
