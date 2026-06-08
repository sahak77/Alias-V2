import { useEffect, useRef, useState } from 'react';
import { remainingSec } from './timer';

/**
 * Drives the on-screen countdown from the round's absolute `endTimestamp`
 * (spec §8). A single interval recomputes the remaining seconds from the wall
 * clock — no accumulated drift — and fires `onExpire` exactly once when it
 * reaches zero. Returns the whole seconds remaining for display.
 */
export function useRoundClock(endTimestamp: number | undefined, onExpire: () => void): number {
  const [remaining, setRemaining] = useState(() =>
    endTimestamp === undefined ? 0 : remainingSec(endTimestamp, Date.now()),
  );
  const firedRef = useRef(false);

  useEffect(() => {
    if (endTimestamp === undefined) return;
    firedRef.current = false;

    const tick = () => {
      const left = remainingSec(endTimestamp, Date.now());
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire();
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endTimestamp, onExpire]);

  return remaining;
}
