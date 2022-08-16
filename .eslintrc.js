module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      modules: true,
      jsx: true
    },
    ecmaVersion: 6,
    sourceType: 'module'
  },
  plugins: ['prettier', 'simple-import-sort'],
  env: {
    es6: true,
    browser: true,
    node: true
  },
  rules: {
    'prettier/prettier': 'error', // 不符合 prettier 规则的代码，要进行错误提示
    'no-var': 'off',
    'prefer-rest-params': 'off',
    'no-prototype-builtins': 'off',
    'no-useless-escape': 'off',
    'no-undef': 'off',
    'no-self-assign': 'off',
    'prefer-const': 'off',
    'no-useless-catch': 'off',
    'no-func-assign': 'off',
    'no-constant-condition': 'off',
    'no-case-declarations': 'off',
    'no-empty': 'off',
    // 'simple-import-sort/imports': 'error',
    // 'simple-import-sort/exports': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/triple-slash-reference': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/ban-types': 'off',
    'prefer-spread': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/prefer-as-const': 'off',
    '@typescript-eslint/adjacent-overload-signatures': 'off'
  }
}
