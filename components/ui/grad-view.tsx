import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

interface GradViewProps {
  colors: string[];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Gradient direction – defaults to left→right */
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

/**
 * Renders a LinearGradient when `colors` has 2+ stops, otherwise a plain View.
 * Safe to use anywhere a View background is needed.
 */
export function GradView({
  colors,
  style,
  children,
  start = { x: 0, y: 0.5 },
  end   = { x: 1, y: 0.5 },
}: GradViewProps) {
  if (colors.length <= 1) {
    return (
      <View style={[style, { backgroundColor: colors[0] ?? 'transparent' }]}>
        {children}
      </View>
    );
  }
  return (
    <LinearGradient
      colors={colors as [string, string, ...string[]]}
      start={start}
      end={end}
      style={style}>
      {children}
    </LinearGradient>
  );
}
