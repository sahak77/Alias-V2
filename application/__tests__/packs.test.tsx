import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { type Pack } from '@alias/contracts';
import { usePackStore } from '@/features/packs';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

// eslint-disable-next-line import/first -- imported after the expo-router mock is registered
import PacksScreen from '../app/packs';

const PACK: Pack = {
  id: 'custom.x',
  title: 'My Pack',
  locale: 'es',
  schemaVersion: 1,
  cards: [{ w: 'casa' }, { w: 'perro' }],
};

beforeEach(async () => {
  await AsyncStorage.clear();
  usePackStore.setState({ customPacks: [PACK], selectedPackIds: [], isHydrated: true });
  mockPush.mockClear();
});

it('lists custom packs with their word count + language', () => {
  render(<PacksScreen />);
  expect(screen.getByText('My Pack')).toBeTruthy();
  expect(screen.getByText('2 words · ES')).toBeTruthy();
});

it('opens the editor for the tapped pack', () => {
  render(<PacksScreen />);
  fireEvent.press(screen.getByLabelText('Edit My Pack'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/pack-editor', params: { id: 'custom.x' } });
});

it('deletes a pack only after the confirmation is accepted', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  render(<PacksScreen />);

  fireEvent.press(screen.getByLabelText('Delete My Pack'));
  expect(usePackStore.getState().customPacks).toHaveLength(1); // awaiting confirm

  const buttons = alertSpy.mock.calls[0]?.[2] ?? [];
  buttons.find((b) => b.style === 'destructive')?.onPress?.();
  expect(usePackStore.getState().customPacks).toEqual([]);
  alertSpy.mockRestore();
});

it('shows an empty state when there are no custom packs', () => {
  usePackStore.setState({ customPacks: [], selectedPackIds: [], isHydrated: true });
  render(<PacksScreen />);
  expect(screen.getByText('No custom packs yet — create one below.')).toBeTruthy();
});

it('holds a splash until the library is hydrated', () => {
  usePackStore.setState({ customPacks: [PACK], selectedPackIds: [], isHydrated: false });
  render(<PacksScreen />);
  expect(screen.queryByText('My Pack')).toBeNull();
});
