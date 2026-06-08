import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useGameSession } from '@/features/game';
import { GameIntro, Gameplay, RoundResult, Winner } from '@/features/game/screens';

/**
 * The in-game route. The whole turn flow is one screen driven by the session
 * status (no navigation churn mid-round); Setup creates the session, this routes
 * Intro → Playing → Round Result → Winner from it.
 */
export default function GameRoute() {
  const session = useGameSession((s) => s.session);
  const router = useRouter();

  useEffect(() => {
    if (!session) router.replace('/setup');
  }, [session, router]);

  if (!session) return null;
  switch (session.status) {
    case 'playing':
      return <Gameplay />;
    case 'roundResult':
      return <RoundResult />;
    case 'finished':
      return <Winner />;
    case 'intro':
    default:
      return <GameIntro />;
  }
}
