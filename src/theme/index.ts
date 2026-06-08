import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Apple Product Aesthetic (Clean White and iOS Blue)
const lightColors = {
  primary: '#007AFF', // iOS System Blue
  onPrimary: '#FFFFFF',
  primaryContainer: '#E5F1FF',
  onPrimaryContainer: '#004C99',
  secondary: '#8E8E93', // iOS System Gray
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E5E5EA',
  onSecondaryContainer: '#1C1C1E',
  tertiary: '#FF9500', // iOS Orange for warnings/lates
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFEEDB',
  onTertiaryContainer: '#804A00',
  error: '#FF3B30', // iOS Red
  onError: '#FFFFFF',
  errorContainer: '#FFD8D6',
  onErrorContainer: '#801D18',
  background: '#F2F2F7', // iOS Grouped Background Light
  onBackground: '#1C1C1E',
  surface: '#FFFFFF', // Clean white cards
  onSurface: '#1C1C1E',
  surfaceVariant: '#E5E5EA',
  onSurfaceVariant: '#3A3A3C',
  outline: '#C7C7CC', // iOS Border color
};

const darkColors = {
  primary: '#0A84FF', // iOS System Blue Dark Mode
  onPrimary: '#FFFFFF',
  primaryContainer: '#003366',
  onPrimaryContainer: '#99CCFF',
  secondary: '#8E8E93', 
  onSecondary: '#1C1C1E',
  secondaryContainer: '#2C2C2E',
  onSecondaryContainer: '#E5E5EA',
  tertiary: '#FF9F0A',
  onTertiary: '#4D2C00',
  tertiaryContainer: '#663B00',
  onTertiaryContainer: '#FFD699',
  error: '#FF453A',
  onError: '#000000',
  errorContainer: '#661713',
  onErrorContainer: '#FFD8D6',
  background: '#000000', // iOS True Black
  onBackground: '#F2F2F7',
  surface: '#1C1C1E', // iOS Elevated Surface Dark
  onSurface: '#F2F2F7',
  surfaceVariant: '#2C2C2E',
  onSurfaceVariant: '#E5E5EA',
  outline: '#3A3A3C',
};

// Override default roundness for Apple-like rounded corners
export const lightTheme = {
  ...MD3LightTheme,
  roundness: 3, // Paper multiplies this, so 3 * 4 = 12px border radius
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  roundness: 3,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
};
