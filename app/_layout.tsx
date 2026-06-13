import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { ActivityIndicator, View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

// Secure token cache so Clerk session persists between app restarts
const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  async deleteToken(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};

// Auth gate — redirects to auth screens or home based on Clerk sign-in state
function AuthGate() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (isSignedIn && inAuthGroup) {
      // Signed in but stuck on auth screen → go home
      router.replace('/(tabs)/home');
    } else if (!isSignedIn && !inAuthGroup && !inOnboarding) {
      // Not signed in and not in auth group → force to phone entry
      router.replace('/(auth)' as any);
    }
  }, [isSignedIn, isLoaded, segments]);

  // Show splash/loading while Clerk initialises
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return (
      <ScrollView contentContainerStyle={styles.missingKeysContainer}>
        <Text style={styles.title}>GigPay Setup Required</Text>
        <Text style={styles.subtitle}>
          It looks like your local environment variables are not configured yet.
        </Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How to configure:</Text>
          <Text style={styles.step}>1. Create a file named <Text style={styles.code}>.env.local</Text> in your project's root folder.</Text>
          <Text style={styles.step}>2. Add the following keys with your project values:</Text>
          
          <View style={styles.codeBlock}>
            <Text style={styles.codeLine}>EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...</Text>
            <Text style={styles.codeLine}>EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</Text>
            <Text style={styles.codeLine}>EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          After saving the file, restart your dev server (run <Text style={styles.code}>npm start</Text>) and scan the QR code in Expo Go!
        </Text>
      </ScrollView>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
    >
      <AuthGate />
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  missingKeysContainer: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  step: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  code: {
    fontFamily: 'System',
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: '#FFF2E6',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  codeBlock: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  codeLine: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#374151',
    marginVertical: 2,
  },
  footer: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
