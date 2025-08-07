import { View, Image, StyleSheet } from "react-native"
import { TextHeaderFour } from "../text"
import { Brand as BrandConfig } from "../../constants/Brand"
import { useTheme } from "@/features/shared/context/ThemeContext";
import { gaps } from "@/features/shared/theme";

// TODO: Replace with actual paths to your logo assets
const LOGO_LIGHT = require('@/assets/images/logo_light.png');
const LOGO_DARK = require('@/assets/images/logo_dark.png');

export const Brand = () => {
  const { theme } = useTheme();
  const logoSource = theme.mode === 'dark' ? LOGO_LIGHT : LOGO_DARK;

  return (
    <View style={styles.container}>
        <Image source={logoSource} style={styles.logo} />
        <TextHeaderFour style={styles.text}>{BrandConfig.name}</TextHeaderFour>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -gaps.xsmall, // Add space between logo and text
  },
  logo: {
    width: 35,
    height: 35,
  },
  text: {
    fontWeight: 'bold',
  }
});