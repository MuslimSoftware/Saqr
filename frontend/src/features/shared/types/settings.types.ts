import { Ionicons } from '@expo/vector-icons';

// Internal utility type, likely doesn't need export unless used elsewhere
type IoniconName = keyof typeof Ionicons.glyphMap;

// Exported type for individual setting items
export type SettingItem = {
  icon: IoniconName;
  label: string;
  actionKey?: string;
  onPress?: () => void;
};

// Exported type for a section of settings
export type SettingsSection = {
  title: string;
  items: SettingItem[];
}; 