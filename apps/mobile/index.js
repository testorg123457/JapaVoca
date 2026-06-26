/**
 * @format
 */
// react-native-gesture-handler는 반드시 가장 먼저 import.
import 'react-native-gesture-handler';

import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import LockApp from './src/LockApp';
import { name as appName } from './app.json';

// 개발 빌드에서 화면 하단에 뜨는 LogBox 경고 알림(노란 ⚠️ 바 + X)을 끈다.
// 경고는 Metro 터미널에는 그대로 출력되고, 릴리즈 빌드엔 LogBox 자체가 없다.
if (__DEV__) {
  LogBox.ignoreAllLogs();
}

AppRegistry.registerComponent(appName, () => App);
// 잠금화면 학습 전용 루트 — 네이티브 LockQuizActivity 가 호스팅한다.
AppRegistry.registerComponent('JapaVocaLock', () => LockApp);
