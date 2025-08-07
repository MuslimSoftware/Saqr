import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, Platform, View, Text, TextStyle, ViewStyle, ScrollView } from 'react-native';
import Marked, { Renderer } from 'react-native-marked';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { ChatEvent } from '@/api/types/chat.types';
import { BaseMessage } from './BaseMessage';
import { TextBody } from '@/features/shared/components/text';
import { paddings, borderRadii } from '@/features/shared/theme';
import { LargeRow } from '@/features/shared';

const MARKDOWN_PATTERN = /```|`[^`]+`|\[.+\]\(.+\)|^\s*[*\-+] |^\s*\d+\. |^#|\*\*/;

interface TextMessageProps {
  item: ChatEvent;
}

export const TextMessage: React.FC<TextMessageProps> = React.memo(({ item }) => {

  const { theme } = useTheme();

  // Determine sender type and appropriate background color for text elements
  const isAgent = item.author === 'agent';
  const textBackgroundColor = isAgent ? theme.colors.layout.foreground : theme.colors.layout.background;

  const styles = StyleSheet.create({
    em: {
      color: theme.colors.text.primary,
      backgroundColor: textBackgroundColor,
    },
    strong: {
      color: theme.colors.text.primary,
      backgroundColor: textBackgroundColor,
    },
    strikethrough: {
      textDecorationLine: 'line-through',
    },
    text: {
      color: theme.colors.text.primary,
      backgroundColor: textBackgroundColor,
    },
    paragraph: {
      backgroundColor: textBackgroundColor,
    },
    link: {
      backgroundColor: textBackgroundColor,
      color: theme.colors.text.secondary,
    },
    blockquote: {
      backgroundColor: textBackgroundColor,
      color: theme.colors.text.primary,
    },
    h1: {
      backgroundColor: textBackgroundColor,
      color: theme.colors.text.primary,
      marginBottom: 0,
      marginTop: 0,
    },
    h2: {
      backgroundColor: textBackgroundColor,
      color: theme.colors.text.primary,
      marginBottom: 0,
      marginTop: 0,
    },
    h3: {
      backgroundColor: textBackgroundColor,
      color: theme.colors.text.primary,
      marginBottom: 0,
      marginTop: 0,
    },
    h4: {
      backgroundColor: textBackgroundColor,
      color: theme.colors.text.primary,
      marginBottom: 0,
      marginTop: 0,
    },
    h5: {
      backgroundColor: textBackgroundColor,
      color: theme.colors.text.primary,
      marginBottom: 0,
      marginTop: 0,
    },
    h6: {
      backgroundColor: textBackgroundColor,
      color: theme.colors.text.primary,
      marginBottom: 0,
      marginTop: 0,
    },
    codespan: {
      color: theme.colors.brand.primary,
      backgroundColor: theme.colors.layout.background,
      padding: paddings.xsmall,
    },
    code: {
      color: theme.colors.text.secondary,
      backgroundColor: theme.colors.layout.background,
      padding: paddings.small,
      borderRadius: borderRadii.medium,
      borderWidth: 1,
      borderColor: theme.colors.text.secondary,
      overflow: 'hidden',
    },
    codeText: { 
      color: theme.colors.text.secondary, 
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    hr: {
      backgroundColor: textBackgroundColor,
      marginBottom: 0,
    },
    list: {
      color: theme.colors.text.primary,
      backgroundColor: textBackgroundColor,
      marginBottom: 0,
    },
    li: {
      color: theme.colors.text.primary,
      backgroundColor: textBackgroundColor,
      marginBottom: 0,
    },
    table: {
      backgroundColor: textBackgroundColor,
    },
    tableRow: {
      backgroundColor: textBackgroundColor,
    },
    tableCell: {
      backgroundColor: textBackgroundColor,
    },
    listItemContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: textBackgroundColor,
      marginBottom: paddings.xsmall,
    },
    listItemContent: {
      alignItems: 'flex-start',
      flex: 1,
      backgroundColor: textBackgroundColor,
    },
    listContainer: {
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      backgroundColor: textBackgroundColor,
      color: theme.colors.text.primary,
    },
  })

  const renderer = useMemo(() => {
    const r = new Renderer();

    r.code = (
      text: string,
      language?: string,
      containerStyle?: ViewStyle,
    ) => (
      <ScrollView 
          key={`${language}-${text.substring(0, 10)}`} 
          style={styles.code}
      >
        <TextBody style={styles.codeText}>{text}</TextBody>
      </ScrollView>
    );

    r.list = (
      ordered: boolean,
      li: ReactNode[],
      listStyle?: ViewStyle
    ) => (
      <View key={`${ordered}-${li.length}`} style={[listStyle, styles.listContainer]}>
        {li.map((item, index) => (
          <LargeRow key={index} style={styles.listItemContainer}>
            <TextBody style={styles.listItemContent}>{ordered ? `${index + 1}.` : '•'}</TextBody>
            {item}
          </LargeRow>
        ))}
      </View>
    );

    return r;
  }, [theme, styles]);

  return (
    <BaseMessage 
      item={item}
      isUser={!isAgent}
    >
      <Marked 
        value={item.content} 
        renderer={renderer} 
        styles={styles}
      />
    </BaseMessage>
  );
}); 