import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { PausedOverlay, useGameSession } from '@/features/game';
import { GameIntro, Gameplay, RoundResult, Winner } from '@/features/game/screens';

/**
 * The in-game route. The whole turn flow is one screen driven by the session
 * status (no navigation churn mid-round); Setup creates the session, this routes
 * Intro → Playing → Round Result → Winner from it. A Paused overlay sits above
 * the active round when the game was backgrounded or resumed from a kill (§8).
 */
export default function GameRoute() {
  const session = useGameSession((s) => s.session);
  const pausedRemainingMs = useGameSession((s) => s.pausedRemainingMs);
  const resume = useGameSession((s) => s.resume);
  const router = useRouter();

  useEffect(() => {
    if (!session) router.replace('/setup');
  }, [session, router]);

  if (!session) return null;

  let screen;
  switch (session.status) {
    case 'playing':
      screen = <Gameplay />;
      break;
    case 'roundResult':
      screen = <RoundResult />;
      break;
    case 'finished':
      screen = <Winner />;
      break;
    case 'intro':
    default:
      screen = <GameIntro />;
  }

  const paused = pausedRemainingMs !== null && session.status === 'playing';
  return (
    <>
      {screen}
      {paused ? (
        <PausedOverlay onResume={resume} remainingSec={Math.ceil((pausedRemainingMs ?? 0) / 1000)} />
      ) : null}
    </>
  );
}
