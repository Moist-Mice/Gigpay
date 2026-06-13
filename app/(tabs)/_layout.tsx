import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

// Simple icon component using emoji
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <Text style={styles.iconEmoji}>{emoji}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopColor:       colors.border,
          backgroundColor:      colors.card,
          height:               60,
          paddingBottom:        8,
        },
        tabBarLabelStyle:  { fontSize: 11, fontWeight: '600' },
        headerShown:       false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Add',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📷" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="certificates"
        options={{
          title: 'Certificates',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📄" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap:        { width: 32, height: 28, justifyContent: 'center', alignItems: 'center' },
  iconWrapFocused: { transform: [{ scale: 1.15 }] },
  iconEmoji:       { fontSize: 20 },
});
