/**
 * @format
 */
// react-native-gesture-handler는 반드시 가장 먼저 import.
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
