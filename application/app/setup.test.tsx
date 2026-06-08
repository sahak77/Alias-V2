import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { type Pack } from '@alias/contracts';
import { useGameSession } from '@/features/game';
import { usePackStore } from '@/features/packs';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

// eslint-disable-next-line import/first -- imported after the expo-router mock is registered
import SetupScreen from './setup';

const CUSTOM: Pack = {
  id: 'custom.x',
  title: 'My Pack',
  locale: 'es',
  schemaVersion: 1,
  cards: Array.from({ length: 20 }, (_, i) => ({ w: `palabra${i}` })),
};

function spyStartGame() {
  const startGame = jest.fn<void, [unknown, unknown, Pack[]]>();
  useGameSession.setState({ startGame });
  return startGame;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  usePackStore.setState({ customPacks: [], selectedPackIds: [], isHydrated: true });
});

it('starts with the bundled starter pack when nothing is selected', () => {
  const startGame = spyStartGame();
  render(<SetupScreen />);
  fireEvent.press(screen.getByText('Start Game'));
  expect(startGame.mock.calls[0]?.[2]?.map((p) => p.id)).toEqual(['starter.en']);
});

it('lists a custom pack as a selectable chip and plays the selected pack', () => {
  usePackStore.setState({ customPacks: [CUSTOM], selectedPackIds: [], isHydrated: true });
  const startGame = spyStartGame();
  render(<SetupScreen />);

  fireEvent.press(screen.getByText('My Pack')); // select the custom pack chip
  fireEvent.press(screen.getByText('Start Game'));

  expect(startGame.mock.calls[0]?.[2]?.map((p) => p.id)).toEqual(['custom.x']);
});
