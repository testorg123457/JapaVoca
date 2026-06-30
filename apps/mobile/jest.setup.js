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
jest.mock('react-native-mmkv', () => ({
  __esModule: true,
  createMMKV: jest.fn(() => ({
    getString: jest.fn(),
    setString: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
  MMKV: jest.fn(),
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
