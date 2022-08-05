module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true
  },
  plugins: [],
  extends: ['prettier', 'airbnb-base', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'linebreak-style': ['error', 'unix']
  },
  ignorePatterns: ['**/poeninjaApi/**/*.js']
}
