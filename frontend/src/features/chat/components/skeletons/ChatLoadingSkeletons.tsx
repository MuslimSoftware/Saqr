import React from 'react';
import { StyleSheet, View, DimensionValue } from 'react-native';
import { MessageSkeleton } from './MessageSkeleton';
import { paddings } from '@/features/shared/theme/spacing';
import { Brand } from '@/features/shared/components/brand/Brand';

export const ChatLoadingSkeletons: React.FC = () => {
  // Create a realistic conversation pattern with varying message lengths
  const skeletonPattern: { isUser: boolean; width: DimensionValue }[] = [
    { isUser: false, width: '60%' },
    { isUser: true, width: '45%' },
    { isUser: false, width: '85%' },
    { isUser: false, width: '75%' },
    { isUser: true, width: '55%' },
    { isUser: false, width: '70%' },
    { isUser: true, width: '55%' },
    { isUser: false, width: '70%' },
    { isUser: true, width: '55%' },
    { isUser: false, width: '70%' },
    { isUser: true, width: '55%' },
    { isUser: false, width: '70%' }
  ];

  return (
    <View style={styles.container}>
      {skeletonPattern.map((item, index) => (
        <View key={index} style={styles.row}>
          <MessageSkeleton 
            isUser={item.isUser} 
            width={item.width}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: paddings.medium,
    paddingTop: paddings.medium,
  },
  row: {
    marginBottom: paddings.xsmall,
  },
}); 