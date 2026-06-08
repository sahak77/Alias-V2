/**
 * A lightweight one-shot confetti burst for the Winner screen (spec §6.5).
 * Built on React Native's bundled Animated (native-driver transforms + opacity)
 * — no extra dependency and no reanimated/babel setup. Decorative only:
 * pointer-events are disabled and it's hidden from the accessibility tree.
 */

import { useEffect, useState } from 'react';
import { Animated, Easing, useWindowDimensions, View } from 'react-native';
import { useTheme } from '@/theme';

const COUNT = 28;
const FALLBACK_COLORS = ['#E5484D', '#2E7DF6', '#16A34A', '#F5A623', '#8B5CF6', '#EC4899'];

export function Confetti() {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const palette = theme.decoration?.teamColors ?? FALLBACK_COLORS;

  // Lazily created once; the Animated.Values must persist across renders, and
  // the data is read during render (so a ref would be invalid — use state).
  const [pieces] = useState(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      progress: new Animated.Value(0),
      x: Math.random() * width,
      color: palette[i % palette.length] ?? FALLBACK_COLORS[0],
      size: 6 + Math.random() * 6,
      delay: Math.random() * 500,
      duration: 1800 + Math.random() * 1400,
      spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360),
    })),
  );

  useEffect(() => {
    const anims = pieces.map((p) =>
      Animated.timing(p.progress, {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    Animated.parallel(anims).start();
  }, [pieces]);

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: 0,
            width: p.size,
            height: p.size * 0.6,
            borderRadius: 1,
            backgroundColor: p.color,
            opacity: p.progress.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.progress.interpolate({ inputRange: [0, 1], outputRange: [-20, height + 20] }) },
              { rotate: p.progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}
