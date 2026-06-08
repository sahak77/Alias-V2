/* global jest */
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

// Render react-native-svg primitives as plain views under Jest (no native canvas).
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Passthrough = ({ children, ...props }) => React.createElement(View, props, children);
  return { __esModule: true, default: Passthrough, Svg: Passthrough, Circle: Passthrough };
});

// expo-haptics has no native module under Jest — stub the API so the feedback
// module is importable and its gating can be asserted.
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
