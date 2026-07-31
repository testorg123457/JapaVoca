// Mock react-native-svg to avoid parsing issues in tests
jest.mock('react-native-svg', () => ({
  __esModule: true,
  Svg: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Line: 'Line',
  Path: 'Path',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Rect: 'Rect',
  Text: 'Text',
  Tspan: 'Tspan',
  Image: 'Image',
  ClipPath: 'ClipPath',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  Use: 'Use',
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    createAnimatedComponent: (comp) => comp,
  },
  Animated: {
    createAnimatedComponent: (comp) => comp,
  },
  useAnimatedStyle: jest.fn(() => ({})),
  useSharedValue: jest.fn(() => ({ value: 0 })),
  withSpring: jest.fn((val) => val),
  withTiming: jest.fn((val) => val),
  Easing: {
    inOut: jest.fn((easing) => easing),
    out: jest.fn((easing) => easing),
    in: jest.fn((easing) => easing),
    linear: jest.fn(() => 0),
    quad: jest.fn(() => 0),
  },
  runOnUI: jest.fn((fn) => fn),
  runOnJS: jest.fn((fn) => fn),
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  __esModule: true,
  GestureHandlerRootView: 'GestureHandlerRootView',
  TapGestureHandler: 'TapGestureHandler',
}));

// Mock react-native-css-interop
jest.mock('react-native-css-interop', () => ({
  __esModule: true,
}));

// Mock react-native-mmkv
// getNumber/getBoolean/set/remove 까지 갖춘다 — 실제 store가 쓰는 메서드가 빠져 있으면
// 그 store를 import 하는 순간 "storage.getBoolean is not a function"으로 죽는다.
jest.mock('react-native-mmkv', () => ({
  __esModule: true,
  createMMKV: jest.fn(() => ({
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    set: jest.fn(),
    setString: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
  MMKV: jest.fn(),
}));

// Mock react-native-audio-api
// ⚠️ 이 패키지는 ESM으로 배포돼 jest transform 화이트리스트 밖이고, 로드 시점에
//    네이티브 모듈을 찾아 없으면 던진다. 목이 없으면 이걸 전이적으로 import 하는
//    화면 테스트가 원인 파악이 어려운 SyntaxError로 실패한다.
jest.mock('react-native-audio-api', () => ({
  __esModule: true,
  AudioContext: jest.fn(() => ({
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: jest.fn(),
    suspend: jest.fn(),
    decodeAudioData: jest.fn(() => Promise.resolve({})),
    createBufferSource: jest.fn(() => ({
      buffer: null,
      connect: jest.fn(),
      start: jest.fn(),
    })),
  })),
}));

// Mock react-native-tts
jest.mock('react-native-tts', () => ({
  setDefaultLanguage: jest.fn(),
  speak: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));
