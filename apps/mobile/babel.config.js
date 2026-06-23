module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    // NativeWind: className -> style 변환
    'nativewind/babel',
  ],
  plugins: [
    // Reanimated 4: worklets 플러그인은 반드시 plugins 배열의 *마지막*.
    'react-native-worklets/plugin',
  ],
};
