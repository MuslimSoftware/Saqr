import React from 'react';
import { StyleSheet, View, Pressable, ScrollView, ScrollViewProps } from 'react-native';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BgView, PageView, SmallRow } from '@/features/shared/components/layout';
import { TextHeader } from '@/features/shared/components/text';
import { paddings, gaps, iconSizes } from '@/features/shared/';

type SettingsPageLayoutProps = {
  title: string;
  children: React.ReactNode;
  scrollViewProps?: Omit<ScrollViewProps, 'children'>;
};

export function SettingsPageLayout({ 
    title,
    children,
    scrollViewProps 
}: SettingsPageLayoutProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Calculate dynamic values needed for styles
  const defaultPadding = paddings.medium;
  const iconMediumSize = iconSizes.medium;
  const headerSpacerWidth = iconMediumSize + paddings.small * 2;

  return (
    <BgView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + defaultPadding,
            paddingBottom: insets.bottom + defaultPadding,
          },
          scrollViewProps?.contentContainerStyle, // Allow overriding
        ]}
        showsVerticalScrollIndicator={false}
        {...scrollViewProps} // Spread other scroll view props
      >
        {/* Header */}
        <SmallRow style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="arrow-back"
              size={iconMediumSize}
              color={theme.colors.text.primary}
            />
          </Pressable>
          <TextHeader>{title}</TextHeader>
          <View style={{ width: headerSpacerWidth }} />
        </SmallRow>

        {/* Content passed from child component */}
        {children}

      </ScrollView>
    </BgView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: paddings.large,
    gap: gaps.xlarge, // Default gap, might need adjustment per screen
    flexGrow: 1, // Ensure content can grow
  },
  header: {
    justifyContent: 'space-between',
  },
  backButton: {
    padding: paddings.small,
  },
}); 