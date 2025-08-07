import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, Text, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';
import { iconSizes } from '@/features/shared/theme/sizes';

interface ChatDropdownMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onDelete: () => void;
  position: { x: number; y: number } | null;
}

export const ChatDropdownMenu: React.FC<ChatDropdownMenuProps> = ({
  isVisible,
  onClose,
  onDelete,
  position,
}) => {
  const { theme } = useTheme();

  const handleDeletePress = () => {
    onDelete();
    onClose();
  };

  // Close menu when clicking outside (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && isVisible) {
      const handleClickOutside = () => {
        onClose();
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  if (!isVisible || !position) {
    return null;
  }

  // Use Modal for React Native to ensure it appears above everything
  if (Platform.OS !== 'web') {
    return (
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <View style={[
            styles.dropdown, 
            { 
              backgroundColor: theme.colors.layout.foreground, 
              borderColor: theme.colors.layout.border,
              position: 'absolute',
              left: position.x,
              top: position.y,
            }
          ]}>
            <Pressable
              style={[styles.menuItem, { backgroundColor: theme.colors.layout.foreground }]}
              onPress={handleDeletePress}
            >
              <Ionicons 
                name="trash-outline" 
                size={iconSizes.small} 
                color={theme.colors.indicators.error} 
              />
              <Text style={[styles.menuText, { color: theme.colors.indicators.error }]}>
                Delete
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    );
  }

  // For web, use absolute positioning
  return (
    <View style={[
      styles.dropdown, 
      { 
        backgroundColor: theme.colors.layout.foreground, 
        borderColor: theme.colors.layout.border,
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 999999,
      }
    ]}>
      <Pressable
        style={[styles.menuItem, { backgroundColor: theme.colors.layout.foreground }]}
        onPress={handleDeletePress}
      >
        <Ionicons 
          name="trash-outline" 
          size={iconSizes.small} 
          color={theme.colors.indicators.error} 
        />
        <Text style={[styles.menuText, { color: theme.colors.indicators.error }]}>
          Delete
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    borderRadius: borderRadii.medium,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 10,
    minWidth: 120,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: paddings.medium,
    paddingVertical: paddings.small,
    gap: paddings.small,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 