import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/features/shared/context/ThemeContext'
import { useRouter, Href } from 'expo-router'
import { useAuth } from '@/features/auth/context/AuthContext'
import {
  FgView,
  BaseColumn,
} from '@/features/shared/components/layout'
import { TextCaption } from '@/features/shared/components/text'
import { ListButton } from '@/features/shared/components/buttons'
import { SettingsPageLayout } from '@/features/settings/components/SettingsPageLayout'
import { SETTINGS_SECTIONS } from '@/features/shared/constants/settings'
import { paddings, gaps, borderRadii, iconSizes } from '../../../features/shared/theme'

export default function SettingsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  const switchAccounts = () => {
    // TODO: Implement switch accounts
    console.log('switch accounts')
  }

  // --- Action Handlers --- 
  const handleNavigate = (path: Href) => {
    console.log(`Navigating to: ${path}`);
    router.push(path);
  };

  const handleOpenLink = (url: string) => {
    console.log(`Opening link: ${url}`);
    // Linking.openURL(url); // Uncomment when needed
  };

  // Map action keys to handler functions
  const actionMap: Record<string, () => void> = {
    NAVIGATE_PROFILE: () => handleNavigate('/(stack)/profile' as Href),
    NAVIGATE_EMAIL_PREFS: () => handleNavigate('/settings/email-prefs' as Href),
    NAVIGATE_ACCOUNT_SETTINGS: () => handleNavigate('/settings/account' as Href),
    TOGGLE_THEME: () => handleNavigate('/(stack)/settings/theme' as Href),
    NAVIGATE_CUSTOMIZE: () => handleNavigate('/settings/customize' as Href),
    NAVIGATE_PRIVACY: () => handleNavigate('/settings/privacy' as Href),
    NAVIGATE_SECURITY: () => handleNavigate('/settings/security' as Href),
    NAVIGATE_2FA: () => handleNavigate('/settings/2fa' as Href),
    OPEN_HELP_CENTER: () => handleOpenLink('https://example.com/help'),
    CONTACT_SUPPORT: () => handleNavigate('/support/contact' as Href),
    OPEN_TOS: () => handleOpenLink('https://example.com/terms'),
    OPEN_PRIVACY_POLICY: () => handleOpenLink('https://example.com/privacy'),
    // Add other mappings as needed
  };

  // Calculate dynamic values needed for styles
  const defaultPadding = paddings.medium
  const iconSmallSize = iconSizes.small
  const separatorMarginLeft = defaultPadding + iconSmallSize + gaps.medium

  return (
    <SettingsPageLayout title="Settings">
      <BaseColumn gap={gaps.large}>
        {SETTINGS_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <TextCaption
              style={styles.sectionTitle}
              color={theme.colors.text.secondary}
            >
              {section.title}
            </TextCaption>
            <FgView style={styles.sectionContent}>
              {section.items.map((item, index) => {
                // Find the handler function based on the actionKey
                const onPressHandler = item.actionKey ? actionMap[item.actionKey] : item.onPress; // Fallback to direct onPress if provided
                
                return (
                  <View key={item.label}>
                    <ListButton
                      label={item.label}
                      icon={item.icon}
                      iconColor={theme.colors.text.primary}
                      onPress={onPressHandler} // Use the mapped handler
                    />
                    {index < section.items.length - 1 && (
                      <View
                        style={[
                          styles.separator,
                          {
                            marginLeft: separatorMarginLeft,
                            backgroundColor: theme.colors.layout.border,
                          },
                        ]}
                      />
                    )}
                  </View>
                )
              })}
            </FgView>
          </View>
        ))}
      </BaseColumn>

      <FgView style={styles.logoutButtonContainer}>
        {/* <ListButton
          label="Switch Account"
          onPress={switchAccounts}
          labelColor={theme.colors.text.primary}
          iconColor={theme.colors.text.primary}
          icon="swap-horizontal-outline"
          showChevron={false}
          style={styles.logoutButton}
        /> */}
        <ListButton
          label="Log Out"
          onPress={handleLogout}
          labelColor={theme.colors.indicators.error}
          iconColor={theme.colors.indicators.error}
          icon="log-out-outline"
          showChevron={false}
          style={styles.logoutButton}
        />
      </FgView>
    </SettingsPageLayout>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: gaps.small,
  },
  sectionContent: {
    borderRadius: borderRadii.large,
    overflow: 'hidden',
  },
  sectionTitle: {
    marginLeft: paddings.xsmall,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  logoutButtonContainer: {
    borderRadius: borderRadii.large,
    marginTop: gaps.medium,
    overflow: 'hidden',
  },
  logoutButton: {
    padding: paddings.medium,
    alignItems: 'center',
  },
}) 