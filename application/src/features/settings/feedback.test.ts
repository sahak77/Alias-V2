import * as Haptics from 'expo-haptics';
import { feedback } from './feedback';
import { usePrefsStore } from './usePrefsStore';

const notify = Haptics.notificationAsync as jest.Mock;
const impact = Haptics.impactAsync as jest.Mock;
const selection = Haptics.selectionAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  usePrefsStore.setState({ soundEnabled: true, hapticsEnabled: true, handedness: 'right', isHydrated: true });
});

describe('feedback', () => {
  it('maps events to the right haptic when haptics are on', () => {
    feedback.correct();
    expect(notify).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);

    feedback.skip();
    expect(selection).toHaveBeenCalledTimes(1);

    feedback.foul();
    expect(notify).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);

    feedback.tick();
    expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    feedback.tickUrgent();
    expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    feedback.timesUp();
    expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
  });

  it('fires no haptics when the toggle is off', () => {
    usePrefsStore.setState({ hapticsEnabled: false });
    feedback.correct();
    feedback.skip();
    feedback.timesUp();
    expect(notify).not.toHaveBeenCalled();
    expect(impact).not.toHaveBeenCalled();
    expect(selection).not.toHaveBeenCalled();
  });
});
