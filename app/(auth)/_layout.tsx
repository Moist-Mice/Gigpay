import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

// Stack layout for the auth screens (phone entry + OTP)
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
