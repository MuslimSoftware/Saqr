import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Pressable,
  View,
  ActivityIndicator
} from 'react-native';
import { BaseRow } from '@/features/shared/components/layout';
import { TextBody } from '@/features/shared/components/text';
import { BaseInput } from '@/features/shared';
import { NotificationBadge } from '@/features/shared/components/ui/NotificationBadge';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '@/features/shared/theme/sizes';
import { paddings, gaps } from '@/features/shared/theme/spacing';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { useChat } from '../context';

interface MobileHeaderProps {
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  isRightPanelVisible: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onToggleLeftPanel,
  onToggleRightPanel,
  isRightPanelVisible,
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme.colors);
  const {
    selectedChatId,
    chatListData,
    updateChat,
    updatingChat,
    rightPanelNotificationCount,
    clearRightPanelNotifications,
  } = useChat();

  const currentChat = chatListData?.items?.find(chat => chat._id === selectedChatId);
  const originalName = currentChat?.name || (selectedChatId ? 'Chat' : 'Start a Chat');

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(originalName);

  useEffect(() => {
    if (!isEditing) {
      setEditedName(originalName);
    }
  }, [originalName, isEditing]);

  const handleEdit = useCallback(() => {
    if (!selectedChatId) return;
    setIsEditing(true);
  }, [selectedChatId]);

  const handleCancel = useCallback(() => {
    setEditedName(originalName);
    setIsEditing(false);
  }, [originalName]);

  const handleSubmit = useCallback(async () => {
    const nameChanged = editedName.trim() !== originalName;
    const finalName = editedName.trim();

    if (!selectedChatId || !nameChanged) {
      setIsEditing(false); 
      return;
    }

    try {
      await updateChat(selectedChatId, { name: finalName });
    } catch (e) {
      console.error("Submit failed (MobileHeader component):", e);
    }
    setIsEditing(false);
  }, [selectedChatId, editedName, originalName, updateChat]);

  const handleRightPanelToggle = () => {
    clearRightPanelNotifications();
    onToggleRightPanel();
  };

  return (
    <BaseRow style={styles.headerContainer}>
      <Pressable style={styles.iconButton} onPress={onToggleLeftPanel}>
        <Ionicons 
          name="menu-outline" 
          size={iconSizes.medium} 
          color={theme.colors.text.secondary} 
        />
      </Pressable>

      <View style={styles.titleContainer}>
        {isEditing ? (
          <BaseInput 
            value={editedName}
            onChangeText={setEditedName}
            inputStyle={styles.headerInput}
            autoFocus
            onBlur={handleSubmit}
            onSubmitEditing={handleSubmit}
          />
        ) : (
          <Pressable onPress={handleEdit} disabled={!selectedChatId}>
            <TextBody style={styles.headerTitle} numberOfLines={1}>
              {originalName}
            </TextBody>
          </Pressable>
        )}
      </View>

      <BaseRow style={styles.rightActions}>
        {selectedChatId && (
          updatingChat ? (
            <ActivityIndicator color={theme.colors.text.secondary} style={styles.iconButton} />
          ) : isEditing ? (
            <BaseRow style={styles.editingIcons}>
              <Pressable onPress={handleCancel} style={styles.iconButton}>
                <Ionicons name="close-outline" size={iconSizes.medium} color={theme.colors.text.secondary} />
              </Pressable>
              <Pressable onPress={handleSubmit} style={styles.iconButton}>
                <Ionicons name="checkmark-outline" size={iconSizes.medium} color={theme.colors.text.primary} />
              </Pressable>
            </BaseRow>
          ) : (
            <Pressable 
              onPress={handleRightPanelToggle} 
              style={styles.iconButton}
            >
              <View style={styles.iconWithBadge}>
                <Ionicons 
                  name={isRightPanelVisible ? "close-outline" : "desktop-outline"}
                  size={iconSizes.medium} 
                  color={theme.colors.text.secondary} 
                />
                {!isRightPanelVisible && <NotificationBadge count={rightPanelNotificationCount} />}
              </View>
            </Pressable>
          )
        )}
      </BaseRow>
    </BaseRow>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  headerContainer: {
    height: 60,
    paddingHorizontal: paddings.medium,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.layout?.border,
    backgroundColor: colors.layout?.foreground,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: gaps.medium,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  headerInput: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingVertical: 2, 
    paddingHorizontal: 4,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.layout?.border || 'gray',
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  rightActions: {
    alignItems: 'center',
    gap: gaps.small,
  },
  editingIcons: {
    gap: gaps.small,
  },
  iconButton: {
    padding: paddings.small,
    borderRadius: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});