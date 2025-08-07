import React, { useEffect, memo } from 'react';
import { StyleSheet, Pressable, View, Platform } from 'react-native';
import { BgView, FgView } from '@/features/shared/components/layout';
import { TextBody } from '@/features/shared/components/text';
import { paddings, borderRadii, gaps } from '@/features/shared/theme/spacing';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '@/features/shared/theme/sizes';
import { ChatList } from '../ChatList';
import { useChat } from '../../context';
import { useRouter } from 'expo-router';
import { Colors } from '@/features/shared/theme/colors';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface LeftChatPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const PANEL_WIDTH_PERCENT = 20;
const ANIMATION_DURATION = 250;

const LeftChatPanelComponent: React.FC<LeftChatPanelProps> = ({
  isVisible,
  onClose,
}) => {
  const router = useRouter();
  const { theme } = useTheme();
  const { startNewChat } = useChat();
  const animatedWidth = useSharedValue(isVisible ? PANEL_WIDTH_PERCENT : 0);

  useEffect(() => {
    animatedWidth.value = withTiming(
      isVisible ? PANEL_WIDTH_PERCENT : 0,
      { duration: ANIMATION_DURATION, easing: Easing.inOut(Easing.ease) }
    );
  }, [isVisible, animatedWidth]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value}%`,
      overflow: 'hidden',
    };
  });

  const handleSettingsPress = () => {
    router.push('/settings');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View style={[styles.animatedContainer, animatedStyle]}>
      <BgView style={styles.leftPanel}>
        <View style={styles.panelHeader}>
          <View style={styles.headerSpacer} />
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-outline" size={iconSizes.medium} color={theme.colors.text.secondary} />
          </Pressable>
        </View>
        <FgView style={styles.newChatButtonContainer}>
          <Pressable style={styles.newChatButton} onPress={() => startNewChat()}>
            <Ionicons name="add-outline" size={iconSizes.small} color={theme.colors.text.secondary} style={styles.newChatIcon} />
            <TextBody color={theme.colors.text.secondary}>New Chat</TextBody>
          </Pressable>
        </FgView>
        <View style={styles.listContainer}>
          <ChatList />
        </View>
        {/* Footer - Web Only */}
        {Platform.OS === 'web' && (
          <View style={styles.footer}>
            <Pressable onPress={handleSettingsPress} style={styles.footerButton}>
              <Ionicons name="settings-outline" size={iconSizes.medium} color={theme.colors.text.secondary} />
            </Pressable>
          </View>
        )}
      </BgView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedContainer: {
    height: '100%',
  },
  leftPanel: {
    height: '100%',
    position: 'relative',
    justifyContent: 'space-between',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: paddings.medium,
    paddingBottom: 0,
  },
  headerSpacer: {
    width: iconSizes.medium,
  },
  closeButton: {
  },
  listContainer: {
    flex: 1,
    marginTop: gaps.small,
  },
  newChatButtonContainer: {
    marginTop: gaps.small,
    marginHorizontal: paddings.medium,
    borderColor: Colors.gray800,
    borderRadius: borderRadii.medium,
    borderWidth: 1,
    paddingVertical: paddings.small,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatIcon: {
    marginRight: gaps.small,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: paddings.medium,
    paddingVertical: paddings.small,
  },
  footerButton: {
    padding: paddings.xsmall,
  },
});

export const LeftChatPanel = memo(LeftChatPanelComponent);