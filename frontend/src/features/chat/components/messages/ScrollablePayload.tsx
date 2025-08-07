import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Platform, ScrollView } from 'react-native';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { borderRadii } from '@/features/shared/theme/spacing';

interface ScrollablePayloadProps {
  children: React.ReactNode;
  style?: any;
  maxHeight?: number;
}

export const ScrollablePayload: React.FC<ScrollablePayloadProps> = ({ 
  children, 
  style, 
  maxHeight = 120 
}) => {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const containerRef = useRef<View>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && containerRef.current) {
      const container = containerRef.current as any;
      
      const handleMouseEnter = () => {
        setIsHovered(true);
      };
      
      const handleMouseLeave = () => {
        setIsHovered(false);
      };
      
      const handleWheel = (e: WheelEvent) => {
        if (isHovered && scrollViewRef.current) {
          // Prevent the parent from scrolling
          e.stopPropagation();
          e.preventDefault();
          
          // Get the native scroll view element
          const scrollView = (scrollViewRef.current as any).getScrollableNode();
          if (scrollView) {
            scrollView.scrollTop += e.deltaY;
          }
        }
      };

      // Add event listeners
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      container.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [isHovered]);

  return (
    <View 
      ref={containerRef}
      style={[
        styles.container,
        { 
          maxHeight,
          borderColor: theme.colors.layout.border,
        },
        isHovered && Platform.OS === 'web' && {
          borderColor: theme.colors.text.secondary,
          backgroundColor: theme.colors.layout.background,
        },
        style
      ]}
    >
      <ScrollView
        ref={scrollViewRef}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadii.small,
    borderWidth: 1,
  },
}); 