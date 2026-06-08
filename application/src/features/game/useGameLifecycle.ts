/**
 * App lifecycle → game pause (spec §8 backgrounding). Mount once at the app
 * root. When the app leaves the foreground we freeze the active round (capturing
 * the remaining time); on return we deliberately do NOT auto-resume — the Paused
 * overlay waits for a tap — so the timer can never advance or double-fire while
 * backgrounded. The listener is removed on unmount (cleanup, no stray callbacks).
 */

import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useGameSession } from './useGameSession';

export function useGameLifecycle(): void {
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      // 'inactive' (iOS app-switcher / call) and 'background' both leave the
      // foreground; pause() is a no-op unless a round is actively running.
      if (state !== 'active') useGameSession.getState().pause();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}
