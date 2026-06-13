import * as SecureStore from 'expo-secure-store';
import { useState, useEffect } from 'react';
import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useSignIn as useClerkSignIn,
  useSignUp as useClerkSignUp
} from '@clerk/clerk-expo';

// =============================================================================
// AUTH TOGGLE
// Set to true to bypass Clerk entirely and use a local mock auth flow.
// This solves all SMS, network, and dashboard configuration errors.
// =============================================================================
export const USE_MOCK_AUTH = true; 

// Shared state for the mock auth system to handle synchronized updates across hooks
let globalIsSignedIn = false;
let globalIsLoaded = false;
const listeners = new Set<() => void>();

function updateAuthState(signedIn: boolean) {
  globalIsSignedIn = signedIn;
  globalIsLoaded = true;
  listeners.forEach(l => l());
}

// Initialise the state from SecureStore
SecureStore.getItemAsync('mock_user_id').then(val => {
  globalIsSignedIn = !!val;
  globalIsLoaded = true;
  listeners.forEach(l => l());
});

// Mock implementation of Clerk hooks
export function useAuth(): any {
  if (!USE_MOCK_AUTH) {
    return useClerkAuth();
  }

  const [isSignedIn, setIsSignedIn] = useState<boolean>(globalIsSignedIn);
  const [isLoaded, setIsLoaded] = useState<boolean>(globalIsLoaded);

  useEffect(() => {
    const listener = () => {
      setIsSignedIn(globalIsSignedIn);
      setIsLoaded(globalIsLoaded);
    };
    listeners.add(listener);
    // Trigger immediately in case state changed before mount
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const getToken = async () => {
    // Generate a mock JWT containing {"sub": "mock_user_123"}
    // This allows Supabase Edge Functions to successfully decode it.
    const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'; // {"alg":"HS256","typ":"JWT"}
    const payload = 'eyJzdWIiOiJtb2NrX3VzZXJfMTIzIn0=';    // {"sub":"mock_user_123"}
    const signature = 'mock_signature';
    return `${header}.${payload}.${signature}`;
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('mock_user_id');
    await SecureStore.deleteItemAsync('mock_user_phone');
    updateAuthState(false);
  };

  return {
    isSignedIn,
    isLoaded,
    userId: 'mock_user_123',
    getToken,
    signOut,
  };
}

export function useUser(): any {
  if (!USE_MOCK_AUTH) {
    return useClerkUser();
  }

  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(globalIsLoaded);

  useEffect(() => {
    const loadUser = () => {
      setIsLoaded(globalIsLoaded);
      if (globalIsSignedIn) {
        SecureStore.getItemAsync('mock_user_phone').then(phone => {
          setUser({
            id: 'mock_user_123',
            firstName: 'Raju',
            primaryPhoneNumber: { phoneNumber: phone || '+919876543210' }
          });
        });
      } else {
        setUser(null);
      }
    };

    listeners.add(loadUser);
    loadUser(); // Initial load
    return () => {
      listeners.delete(loadUser);
    };
  }, []);

  return { user, isLoaded };
}

export function useSignIn(): any {
  if (!USE_MOCK_AUTH) {
    return useClerkSignIn();
  }

  return {
    isLoaded: true,
    signIn: {
      create: async ({ identifier }: { identifier: string }) => {
        console.log('Mock SignIn: Sending OTP to', identifier);
        return {
          status: 'needs_first_factor',
          supportedFirstFactors: [{ strategy: 'phone_code', phoneNumberId: '1' }]
        };
      },
      prepareFirstFactor: async () => {
        return { status: 'needs_first_factor' };
      },
      attemptFirstFactor: async ({ code }: { code: string }) => {
        // Accept any 6-digit code for testing
        if (code.length === 6) {
          await SecureStore.setItemAsync('mock_user_id', 'mock_user_123');
          updateAuthState(true);
          return { status: 'complete', createdSessionId: 'mock_session_123' };
        }
        throw new Error('Invalid OTP code. Please enter 6 digits.');
      },
      supportedFirstFactors: [{ strategy: 'phone_code', phoneNumberId: '1' }]
    },
    setActive: async ({ session }: { session?: string } = {}) => {
      if (session) {
        await SecureStore.setItemAsync('mock_user_id', 'mock_user_123');
        updateAuthState(true);
      }
    }
  };
}

export function useSignUp(): any {
  if (!USE_MOCK_AUTH) {
    return useClerkSignUp();
  }

  return {
    isLoaded: true,
    signUp: {
      create: async ({ phoneNumber }: { phoneNumber: string }) => {
        console.log('Mock SignUp: Sending OTP to', phoneNumber);
        await SecureStore.setItemAsync('mock_user_phone', phoneNumber);
        return { status: 'needs_verification' };
      },
      preparePhoneNumberVerification: async () => {
        return { status: 'needs_verification' };
      },
      attemptPhoneNumberVerification: async ({ code }: { code: string }) => {
        if (code.length === 6) {
          await SecureStore.setItemAsync('mock_user_id', 'mock_user_123');
          updateAuthState(true);
          return { status: 'complete', createdSessionId: 'mock_session_123' };
        }
        throw new Error('Invalid OTP code. Please enter 6 digits.');
      }
    },
    setActive: async ({ session }: { session?: string } = {}) => {
      if (session) {
        await SecureStore.setItemAsync('mock_user_id', 'mock_user_123');
        updateAuthState(true);
      }
    }
  };
}
