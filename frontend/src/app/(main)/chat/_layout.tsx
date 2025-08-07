import React from 'react';
import { Slot } from 'expo-router';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BgView } from '@/features/shared/components/layout';
import { AnimatedLogo } from '@/features/auth/components/AnimatedLogo';
import { StyleSheet } from 'react-native';

export default function ChatWebLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while authentication is being set up
  if (isLoading || !isAuthenticated) {
    return (
      <BgView style={styles.loadingContainer}>
        <AnimatedLogo animatedStyle={{ opacity: 1, transform: [{ scale: 1 }] }} />
      </BgView>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 