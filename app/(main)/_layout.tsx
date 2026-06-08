import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { Platform, Text } from 'react-native';

// Safe icon component - falls back to emoji if vector icons fail
let MaterialCommunityIcons: any = null;
try {
  MaterialCommunityIcons = require('@expo/vector-icons').MaterialCommunityIcons;
} catch {
  // Vector icons not available
}

function TabIcon({ name, fallback, color, size }: { name: string; fallback: string; color: string; size: number }) {
  if (MaterialCommunityIcons) {
    return <MaterialCommunityIcons name={name} size={size} color={color} />;
  }
  return <Text style={{ fontSize: size - 4, color }}>{fallback}</Text>;
}

export default function MainLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0.5,
          borderBottomColor: theme.colors.outline,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        headerTintColor: theme.colors.onBackground,
        tabBarActiveTintColor: '#007AFF', // Apple blue
        tabBarInactiveTintColor: theme.colors.secondary,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 0.5,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontWeight: '500',
          fontSize: 11,
          marginTop: 4,
        }
      }}
    >
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color }) => <TabIcon name="clock-check-outline" fallback="⏰" color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon name="view-dashboard" fallback="📊" color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: 'Leaves',
          tabBarIcon: ({ color }) => <TabIcon name="calendar-account" fallback="📅" color={color} size={28} />,
        }}
      />
    </Tabs>
  );
}
