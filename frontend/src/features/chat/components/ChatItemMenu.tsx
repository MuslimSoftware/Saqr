import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';
import { iconSizes } from '@/features/shared/theme/sizes';

interface ChatItemMenuProps {
  onDeletePress: (event?: any) => void;
  isDeleting?: boolean;
  isVisible?: boolean;
}

export const ChatItemMenu: React.FC<ChatItemMenuProps> = ({ 
  onDeletePress, 
  isDeleting = false, 
  isVisible = true 
}) => {
  const { theme } = useTheme();

  const handleDeletePress = (e: any) => {
    e.stopPropagation(); // Prevent chat selection
    onDeletePress(e);
  };

  if (!isVisible && !isDeleting) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.deleteButton, 
          { 
            opacity: isDeleting ? 0.5 : 1,
            backgroundColor: theme.colors.text.secondary + '20',
          }
        ]}
        onPress={handleDeletePress}
        disabled={isDeleting}
      >
        <Ionicons 
          name="close" 
          size={iconSizes.small} 
          color={theme.colors.text.secondary} 
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  deleteButton: {
    padding: paddings.xsmall,
    borderRadius: borderRadii.small,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 