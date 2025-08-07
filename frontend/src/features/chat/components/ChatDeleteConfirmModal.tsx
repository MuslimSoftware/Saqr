import React from 'react';
import { StyleSheet, View, Text, Pressable, Modal, Platform } from 'react-native';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { paddings, borderRadii, gaps } from '@/features/shared/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '@/features/shared/theme/sizes';

interface ChatDeleteConfirmModalProps {
  isVisible: boolean;
  chatName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const ChatDeleteConfirmModal: React.FC<ChatDeleteConfirmModalProps> = ({
  isVisible,
  chatName,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modal,
          {
            backgroundColor: theme.colors.layout.foreground,
            borderColor: theme.colors.layout.border,
          }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="warning"
                size={iconSizes.large}
                color={theme.colors.indicators.error}
              />
            </View>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              Delete Chat
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Are you sure you want to delete "{chatName || 'this chat'}"?
            </Text>
            <Text style={[styles.warning, { color: theme.colors.text.secondary }]}>
              This action cannot be undone. All messages and data will be permanently deleted.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[
                styles.button,
                styles.cancelButton,
                {
                  backgroundColor: theme.colors.layout.background,
                  borderColor: theme.colors.layout.border,
                }
              ]}
              onPress={onCancel}
              disabled={isDeleting}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.button,
                styles.deleteButton,
                {
                  backgroundColor: theme.colors.indicators.error,
                  opacity: isDeleting ? 0.6 : 1,
                }
              ]}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: paddings.large,
  },
  modal: {
    borderRadius: borderRadii.large,
    borderWidth: 1,
    padding: paddings.large,
    maxWidth: 400,
    width: '100%',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      default: {
        elevation: 8,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: paddings.large,
  },
  headerIcon: {
    marginBottom: paddings.medium,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: paddings.small,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: paddings.medium,
    textAlign: 'center',
    lineHeight: 22,
  },
  warning: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: gaps.medium,
  },
  button: {
    flex: 1,
    paddingVertical: paddings.medium,
    paddingHorizontal: paddings.large,
    borderRadius: borderRadii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    borderWidth: 1,
  },
  deleteButton: {
    // No additional styles needed, backgroundColor set inline
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 