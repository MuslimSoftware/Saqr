import { SettingsSection } from '@/features/shared/types/settings.types';

export const SETTINGS_SECTIONS: SettingsSection[] = [
  // {
  //   title: 'Account',
  //   items: [
  //     {
  //       icon: 'person-circle-outline',
  //       label: 'Personal Information',
  //       actionKey: 'NAVIGATE_PROFILE',
  //     },
  //     { 
  //       icon: 'mail-outline', 
  //       label: 'Email Preferences', 
  //       actionKey: 'NAVIGATE_EMAIL_PREFS',
  //     },
  //     { 
  //       icon: 'settings-outline', 
  //       label: 'Account Settings', 
  //       actionKey: 'NAVIGATE_ACCOUNT_SETTINGS'
  //     },
  //   ],
  // },
  {
    title: 'Appearance',
    items: [
      { 
        icon: 'color-palette-outline', 
        label: 'Theme', 
        actionKey: 'TOGGLE_THEME'
      }
      // ,{ 
      //   icon: 'create-outline', 
      //   label: 'Customize', 
      //   actionKey: 'NAVIGATE_CUSTOMIZE'
      // }
    ],
  },
  // {
  //   title: 'Privacy & Security',
  //   items: [
  //     { 
  //       icon: 'shield-checkmark-outline', 
  //       label: 'Privacy Settings', 
  //       actionKey: 'NAVIGATE_PRIVACY'
  //     },
  //     { 
  //       icon: 'lock-closed-outline', 
  //       label: 'Security', 
  //       actionKey: 'NAVIGATE_SECURITY'
  //     },
  //     {
  //       icon: 'keypad-outline',
  //       label: 'Two-Factor Authentication',
  //       actionKey: 'NAVIGATE_2FA'
  //     },
  //   ],
  // },
  // {
  //   title: 'Support',
  //   items: [
  //     { 
  //       icon: 'help-circle-outline', 
  //       label: 'Help Center', 
  //       actionKey: 'OPEN_HELP_CENTER'
  //     },
  //     { 
  //       icon: 'chatbubble-ellipses-outline', 
  //       label: 'Contact Support', 
  //       actionKey: 'CONTACT_SUPPORT'
  //     },
  //     {
  //       icon: 'document-text-outline',
  //       label: 'Terms of Service',
  //       actionKey: 'OPEN_TOS'
  //     },
  //     { 
  //       icon: 'shield-outline', 
  //       label: 'Privacy Policy', 
  //       actionKey: 'OPEN_PRIVACY_POLICY'
  //     },
  //   ],
  // },
]; 