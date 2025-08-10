import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { FgView } from '@/features/shared/components/layout';
import { useResponsiveLayout } from '@/features/shared/hooks';
import { ChatHeader } from '../ChatHeader';
import { CombinedMessageList } from '../CombinedMessageList';
import { ChatInput } from '../ChatInput';
import { EmptyChatState } from '../EmptyChatState';
import { useChat } from '../../context';

interface CenterChatPanelProps {
  isRightPanelVisible: boolean; 
  onToggleRightPanel: () => void;
  onSelectToolInvocation?: (id: string) => void;
}

export const CenterChatPanel: React.FC<CenterChatPanelProps> = ({ 
  isRightPanelVisible,
  onToggleRightPanel,
  onSelectToolInvocation,
}) => {
  const { selectedChatId } = useChat();
  const { isMobile } = useResponsiveLayout();

  return (
    <View style={styles.centerPanelWrapper}>
      <FgView style={[styles.centerPanel, isMobile && styles.mobileCenterPanel]}>
        {selectedChatId ? (
          <>
            {!isMobile && (
              <ChatHeader 
                isRightPanelVisible={isRightPanelVisible}
                onToggleRightPanel={onToggleRightPanel}
              />
            )}
            <CombinedMessageList onToolInvocationPress={onSelectToolInvocation} />
            <ChatInput />
          </>
        ) : (
          <EmptyChatState />
        )}
      </FgView>
    </View>
  );
};

const styles = StyleSheet.create({
  centerPanelWrapper: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPanel: {
    width: '95%',
    maxWidth: 800,
    height: '100%',
    position: 'relative',
  },
  mobileCenterPanel: {
    width: '100%',
    maxWidth: '100%',
  },
}); 