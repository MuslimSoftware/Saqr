import React from 'react';
import { StyleSheet } from 'react-native';
import { useSplashAnimation } from '@/features/auth/hooks/useSplashAnimation';
import { AnimatedLogo } from '@/features/auth/components/AnimatedLogo';
import { BgView } from '@/features/shared/components/layout';

export default function SplashScreenComponent() {
  const { animatedStyle } = useSplashAnimation();

  return (
    <BgView style={styles.container}>
      <AnimatedLogo animatedStyle={animatedStyle} />
    </BgView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    textAlign: 'center',
    padding: 20,
  },
});
