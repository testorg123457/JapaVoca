module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // 테스트 파일과 jest 셋업은 jest 전역(jest/describe/it 등)을 쓴다
      files: ['**/__tests__/**', '**/*.test.{js,jsx,ts,tsx}', 'jest.setup.js'],
      env: { jest: true },
    },
  ],
};
