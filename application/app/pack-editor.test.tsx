import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { type Pack } from '@alias/contracts';
import { usePackStore } from '@/features/packs';

const mockBack = jest.fn();
const mockParams = jest.fn<Record<string, string>, []>(() => ({}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => mockParams(),
}));

// eslint-disable-next-line import/first -- imported after the expo-router mock is registered
import PackEditorScreen from './pack-editor';

const EDIT_PACK: Pack = {
  id: 'custom.edit',
  title: 'Old name',
  locale: 'es',
  schemaVersion: 1,
  cards: [{ w: 'casa' }, { w: 'perro' }],
};

beforeEach(async () => {
  await AsyncStorage.clear();
  usePackStore.setState({ customPacks: [], selectedPackIds: [], isHydrated: false });
  mockBack.mockClear();
  mockParams.mockReturnValue({});
});

describe('create', () => {
  it('creates a de-duplicated custom pack from the entered name + words and navigates back', () => {
    render(<PackEditorScreen />);
    fireEvent.changeText(screen.getByLabelText('Pack name'), 'Movie night');
    fireEvent.changeText(screen.getByLabelText('Words'), 'casa\nperro\ncasa');
    fireEvent.press(screen.getByText('Save pack'));

    const packs = usePackStore.getState().customPacks;
    expect(packs).toHaveLength(1);
    expect(packs[0]).toMatchObject({ title: 'Movie night', locale: 'en', cards: [{ w: 'casa' }, { w: 'perro' }] });
    expect(mockBack).toHaveBeenCalled();
  });

  it('does not create a pack when the name or words are empty', () => {
    render(<PackEditorScreen />);
    fireEvent.press(screen.getByText('Save pack'));
    expect(usePackStore.getState().customPacks).toEqual([]);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('re-saving (double-tap) upserts the same id — no duplicate pack', () => {
    render(<PackEditorScreen />);
    fireEvent.changeText(screen.getByLabelText('Pack name'), 'Mine');
    fireEvent.changeText(screen.getByLabelText('Words'), 'uno');
    fireEvent.press(screen.getByText('Save pack'));
    fireEvent.press(screen.getByText('Save pack'));
    expect(usePackStore.getState().customPacks).toHaveLength(1);
  });
});

describe('edit (?id)', () => {
  it('waits for hydration — no stale empty form while the library is still loading', () => {
    usePackStore.setState({ customPacks: [EDIT_PACK], selectedPackIds: [], isHydrated: false });
    mockParams.mockReturnValue({ id: 'custom.edit' });
    render(<PackEditorScreen />);
    expect(screen.queryByText('Save pack')).toBeNull(); // gated until hydrated
  });

  it('pre-populates the form from the existing pack and replaces it on save (no append)', () => {
    usePackStore.setState({ customPacks: [EDIT_PACK], selectedPackIds: [], isHydrated: true });
    mockParams.mockReturnValue({ id: 'custom.edit' });
    render(<PackEditorScreen />);

    expect(screen.getByDisplayValue('Old name')).toBeTruthy();
    expect(screen.getByDisplayValue('casa\nperro')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Pack name'), 'New name');
    fireEvent.press(screen.getByText('Save pack'));

    const packs = usePackStore.getState().customPacks;
    expect(packs).toHaveLength(1); // replaced, not appended
    expect(packs[0]).toMatchObject({ id: 'custom.edit', title: 'New name' });
  });

  it('deletes the pack only after the confirmation prompt is accepted', () => {
    usePackStore.setState({ customPacks: [EDIT_PACK], selectedPackIds: ['custom.edit'], isHydrated: true });
    mockParams.mockReturnValue({ id: 'custom.edit' });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    render(<PackEditorScreen />);

    fireEvent.press(screen.getByText('Delete pack'));
    expect(usePackStore.getState().customPacks).toHaveLength(1); // not deleted yet — awaiting confirm

    // Invoke the destructive button from the alert config.
    const buttons = alertSpy.mock.calls[0]?.[2] ?? [];
    buttons.find((b) => b.style === 'destructive')?.onPress?.();
    expect(usePackStore.getState().customPacks).toEqual([]);
    expect(mockBack).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
