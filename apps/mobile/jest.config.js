module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // NativeWind global.css 등 CSS import를 빈 모듈로 스텁
    '\\.css$': '<rootDir>/jest/cssMock.js',
  },
};
