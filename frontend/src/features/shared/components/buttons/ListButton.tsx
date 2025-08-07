import React from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { useTheme } from '@/features/shared/context/ThemeContext'
import { Ionicons } from '@expo/vector-icons'
import { TextBody } from '@/features/shared/components/text'
import { iconSizes } from '@/features/shared/theme/sizes'
import { paddings } from '@/features/shared/theme/spacing'
import { MediumRow, SmallRow } from '@/features/shared/components/layout'

type IoniconName = keyof typeof Ionicons.glyphMap

export interface ListButtonProps extends PressableProps {
  label: string
  icon?: IoniconName // Optional icon
  style?: StyleProp<ViewStyle>
  showChevron?: boolean // Whether to show the right chevron
  iconColor?: string // Optional override for icon color
  labelColor?: string // Optional override for label color
  chevronColor?: string // Optional override for chevron color
}

export const ListButton = ({
  label,
  icon,
  style,
  onPress,
  showChevron = true, // Default to true
  iconColor,
  labelColor,
  chevronColor,
  ...props // Pass other Pressable props
}: ListButtonProps) => {
  const { theme } = useTheme()

  // Determine colors based on props or theme defaults
  const finalIconColor = iconColor || theme.colors.text.primary
  const finalLabelColor = labelColor || theme.colors.text.primary
  const finalChevronColor = chevronColor || theme.colors.text.secondary

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.7 : 1 },
        style, // Apply external styles
      ]}
      onPress={onPress}
      {...props}
    >
      <MediumRow style={styles.content}>
        {/* Left side content: Icon and Label */}
        <SmallRow style={styles.leftContent}>
          {icon && (
            <Ionicons
              name={icon}
              size={iconSizes.small}
              color={finalIconColor}
              style={styles.icon}
            />
          )}
          <TextBody style={[styles.label, { color: finalLabelColor }]}>
            {label}
          </TextBody>
        </SmallRow>

        {/* Right side content: Chevron */}
        {showChevron && (
          <Ionicons
            name="chevron-forward"
            size={iconSizes.xsmall}
            color={finalChevronColor}
          />
        )}
      </MediumRow>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: paddings.medium,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    textAlign: 'center',
  },
  label: {
    flex: 1,
  },
})
