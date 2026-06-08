import { act, renderHook } from '@testing-library/react-native';
import { useRoundClock } from './useRoundClock';

describe('useRoundClock', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('counts down and fires onExpire exactly once at zero', () => {
    const onExpire = jest.fn();
    const end = Date.now() + 2000;
    renderHook(() => useRoundClock(end, onExpire));
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('stays at zero and never expires with no end timestamp', () => {
    const onExpire = jest.fn();
    const { result } = renderHook(() => useRoundClock(undefined, onExpire));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(0);
    expect(onExpire).not.toHaveBeenCalled();
  });
});
