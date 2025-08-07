import React, { useState } from 'react';
import {
  StyleSheet,
  Pressable,
} from 'react-native';
import { BaseRow } from '@/features/shared/components/layout';
import { paddings } from '@/features/shared/theme/spacing';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { useChat } from './context';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '@/features/shared/theme/sizes';
import {
  LeftChatPanel,
  CenterChatPanel,
  RightChatPanel,
} from './components';

const ChatScreen = () => {
  const { theme } = useTheme();
  const { clearRightPanelNotifications, isRightPanelVisible, setIsRightPanelVisible, isLeftPanelVisible, setIsLeftPanelVisible } = useChat();
  const [selectedInvocationId, setSelectedInvocationId] = useState<string | null>(null);

  const toggleRightPanel = () => {
    const newVisible = !isRightPanelVisible;
    setIsRightPanelVisible(newVisible);
    
    // Clear notifications when opening the panel
    if (newVisible) {
      clearRightPanelNotifications();
    }
  };

  const toggleLeftPanel = () => {
    setIsLeftPanelVisible(!isLeftPanelVisible);
  };

  const handleSelectInvocation = (id: string) => {
    setSelectedInvocationId(id);
    if (!isRightPanelVisible) {
      setIsRightPanelVisible(true);
      clearRightPanelNotifications();
    }
  };

  return (
    <BaseRow style={styles.container}>
      {!isLeftPanelVisible && (
        <Pressable style={styles.openLeftPanelButton} onPress={toggleLeftPanel}>
           <Ionicons 
             name="menu-outline" 
             size={iconSizes.medium} 
             color={theme.colors.text.secondary} 
            />
        </Pressable>
      )}

      <LeftChatPanel 
        isVisible={isLeftPanelVisible}
        onClose={toggleLeftPanel}
      />

      <CenterChatPanel 
        isRightPanelVisible={isRightPanelVisible}
        onToggleRightPanel={toggleRightPanel}
        onSelectToolInvocation={handleSelectInvocation}
      />

      <RightChatPanel 
        isVisible={isRightPanelVisible}
        onClose={toggleRightPanel}
        selectedInvocationId={selectedInvocationId}
      />
    </BaseRow>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  openLeftPanelButton: {
    position: 'absolute',
    top: paddings.medium,
    left: paddings.medium,
    zIndex: 10,
  },
});

export default ChatScreen;
