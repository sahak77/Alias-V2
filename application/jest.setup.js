// Jest setup runs before each test file.
// @testing-library/react-native ships its built-in matchers automatically (v12.4+),
// so no explicit jest-native import is needed.
//
// When you start testing components that use react-native-reanimated, add its Jest
// mock here, e.g. `jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));`

// AsyncStorage has no native module under Jest — use the package's official mock so
// anything importing the theme store (which persists the theme preference) can load.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
