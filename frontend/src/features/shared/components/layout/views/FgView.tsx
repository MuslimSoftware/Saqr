import { useTheme } from '@/features/shared/context/ThemeContext'
import { View, ViewStyle } from 'react-native'

export const FgView = ({
  children,
  style,
}: {
  children?: React.ReactNode
  style?: ViewStyle
}) => {
  const { theme } = useTheme()

  return (
    <View style={[{ backgroundColor: theme.colors.layout.foreground }, style]}>
      {children}
    </View>
  )
}
