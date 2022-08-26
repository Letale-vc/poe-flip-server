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
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto'
      }
    ]
  },
  ignorePatterns: ['**/poeninjaApi/**/*.js']
}
