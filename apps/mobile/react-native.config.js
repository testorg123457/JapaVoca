/**
 * react-native CLI 설정.
 * 폰트 등 에셋을 네이티브에 링크하기 위한 경로를 지정합니다.
 * 폰트 파일을 assets/fonts/에 넣은 뒤 `npx react-native-asset` 를 실행하세요.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts/'],
};
