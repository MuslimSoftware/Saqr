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

interface ChatHeaderProps {
  isRightPanelVisible: boolean;
  onToggleRightPanel: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isRightPanelVisible,
  onToggleRightPanel,
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
  const originalName = currentChat?.name || (selectedChatId ? 'Chat' : 'Select a Chat');

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
      console.error("Submit failed (ChatHeader component):", e);
    }
    setIsEditing(false);
  }, [selectedChatId, editedName, originalName, updateChat]);

  return (
    <BaseRow style={styles.headerContainer}>
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
          <TextBody style={styles.headerTitle} numberOfLines={1}>
            {originalName}
          </TextBody>
        )}
      </View>

      <BaseRow style={styles.iconContainer}>
        {selectedChatId && (
          updatingChat ? (
            <ActivityIndicator color={theme.colors.text.secondary} style={styles.iconPadding} />
          ) : isEditing ? (
            <BaseRow style={styles.editingIcons}>
              <Pressable onPress={handleCancel} style={styles.iconPadding}>
                <Ionicons name="close-outline" size={iconSizes.medium} color={theme.colors.text.secondary} />
              </Pressable>
              <Pressable onPress={handleSubmit} style={styles.iconPadding}>
                <Ionicons name="checkmark-outline" size={iconSizes.medium} color={theme.colors.text.primary} />
              </Pressable>
            </BaseRow>
          ) : (
            <Pressable onPress={handleEdit} style={styles.iconPadding}>
              <Ionicons name="pencil-outline" size={iconSizes.small} color={theme.colors.text.secondary} />
            </Pressable>
          )
        )}

        {/* Conditionally render the toggle button only when the panel is hidden */}
        {!isRightPanelVisible && (
          <Pressable 
            onPress={() => {
              clearRightPanelNotifications();
              onToggleRightPanel();
            }} 
            style={styles.iconPadding}
          >
            <View style={styles.iconWithBadge}>
            <Ionicons 
              name={"information-circle-outline"}
              size={iconSizes.medium} 
              color={theme.colors.text.secondary} 
            />
              <NotificationBadge count={rightPanelNotificationCount} />
            </View>
          </Pressable>
        )}
      </BaseRow>
    </BaseRow>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  headerContainer: {
    padding: paddings.medium,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.layout?.border, 
  },
  titleContainer: {
    flex: 1,
    marginRight: gaps.medium,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 18,
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
  },
  iconContainer: {
    alignItems: 'center',
    gap: gaps.medium,
  },
  editingIcons: {
    gap: gaps.small,
  },
  iconPadding: {
    padding: paddings.xsmall,
  },
  iconWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 