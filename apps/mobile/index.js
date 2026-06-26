/**
 * @format
 */
// react-native-gesture-handler는 반드시 가장 먼저 import.
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import LockApp from './src/LockApp';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
// 잠금화면 학습 전용 루트 — 네이티브 LockQuizActivity 가 호스팅한다.
AppRegistry.registerComponent('JapaVocaLock', () => LockApp);
