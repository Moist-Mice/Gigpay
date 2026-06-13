import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as ClerkReal from '@clerk/clerk-expo';

// Force mock mode to true for local testing, change to false to use real Clerk.
const USE_MOCK = true;

// A simple Base64 encoder since Buffer/btoa may not be reliable across React Native versions.
// Deno's atob parses standard base64 strings with padding perfectly.
function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < str.length) {
    const c1 = str.charCodeAt(i++);
    const c2 = i < str.length ? str.charCodeAt(i++) : NaN;
    const c3 = i < str.length ? str.charCodeAt(i++) : NaN;

    const byte1 = c1 >> 2;
    const byte2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
    const byte3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6);
    const byte4 = isNaN(c3) ? 64 : c3 & 63;

    result += chars.charAt(byte1) + chars.charAt(byte2) +
              (byte3 === 64 ? '=' : chars.charAt(byte3)) +
              (byte4 === 64 ? '=' : chars.charAt(byte4));
  }
  return result;
}

interface ClerkContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
  phone: string | null;
  pendingPhone: string | null;
  setPendingPhone: (phone: string | null) => void;
  setSession: (phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const ClerkMockContext = createContext<ClerkContextType | null>(null);

export function ClerkMockProvider({ children }: { children: React.ReactNode; [key: string]: any }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const savedPhone = await SecureStore.getItemAsync('mock_clerk_phone');
        if (savedPhone) {
          setPhone(savedPhone);
          setIsSignedIn(true);
        }
      } catch (e) {
        console.error('Failed to load mock session', e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadSession();
  }, []);

  async function setSession(phoneNum: string) {
    try {
      await SecureStore.setItemAsync('mock_clerk_phone', phoneNum);
      setPhone(phoneNum);
      setIsSignedIn(true);
      setPendingPhone(null);
    } catch (e) {
      console.error('Failed to save mock session', e);
    }
  }

  async function signOut() {
    try {
      await SecureStore.deleteItemAsync('mock_clerk_phone');
      setPhone(null);
      setIsSignedIn(false);
      setPendingPhone(null);
    } catch (e) {
      console.error('Failed to delete mock session', e);
    }
  }

  async function getToken() {
    if (!phone) return null;
    const header = base64Encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = base64Encode(JSON.stringify({ sub: `mock_user_${phone}`, exp: Math.floor(Date.now() / 1000) + 3600 }));
    const signature = "mock_signature";
    return `${header}.${payload}.${signature}`;
  }

  return (
    <ClerkMockContext.Provider value={{
      isSignedIn,
      isLoaded,
      phone,
      pendingPhone,
      setPendingPhone,
      setSession,
      signOut,
      getToken,
    }}>
      {children}
    </ClerkMockContext.Provider>
  );
}

export function useMockAuth() {
  const context = useContext(ClerkMockContext);
  if (!context) throw new Error('useMockAuth must be used within a ClerkMockProvider');
  return {
    isSignedIn: context.isSignedIn,
    isLoaded: context.isLoaded,
    signOut: context.signOut,
    getToken: context.getToken,
  };
}

export function useMockUser() {
  const context = useContext(ClerkMockContext);
  if (!context) throw new Error('useMockUser must be used within a ClerkMockProvider');
  const user = context.isSignedIn && context.phone ? {
    id: `mock_user_${context.phone}`,
    firstName: 'Mock User',
    phoneNumbers: [{ phoneNumber: '+91' + context.phone }]
  } : null;

  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user,
  };
}

export function useMockSignIn() {
  const context = useContext(ClerkMockContext);
  if (!context) throw new Error('useMockSignIn must be used within a ClerkMockProvider');

  const signIn = {
    create: async ({ identifier }: { identifier: string }) => {
      const cleanPhone = identifier.replace('+91', '');
      context.setPendingPhone(cleanPhone);
      return { status: 'needs_first_factor' };
    },
    supportedFirstFactors: [
      { strategy: 'phone_code', phoneNumberId: 'mock_phone_id' }
    ],
    prepareFirstFactor: async (params: any) => {
      return { status: 'needs_attempt' };
    },
    attemptFirstFactor: async ({ strategy, code }: any) => {
      if (!context.pendingPhone) {
        throw new Error('No pending sign-in');
      }
      return {
        status: 'complete',
        createdSessionId: `mock_session_${context.pendingPhone}`
      };
    }
  };

  const setActive = async ({ session }: { session: string | null }) => {
    if (!session) {
      await context.signOut();
      return;
    }
    const cleanPhone = session.replace('mock_session_', '');
    await context.setSession(cleanPhone);
  };

  return {
    signIn,
    setActive,
    isLoaded: context.isLoaded,
  };
}

export function useMockSignUp() {
  const context = useContext(ClerkMockContext);
  if (!context) throw new Error('useMockSignUp must be used within a ClerkMockProvider');

  const signUp = {
    create: async ({ phoneNumber }: { phoneNumber: string }) => {
      const cleanPhone = phoneNumber.replace('+91', '');
      context.setPendingPhone(cleanPhone);
      return { status: 'needs_phone_number_verification' };
    },
    preparePhoneNumberVerification: async (params: any) => {
      return { status: 'needs_attempt' };
    },
    attemptPhoneNumberVerification: async ({ code }: any) => {
      if (!context.pendingPhone) {
        throw new Error('No pending sign-up');
      }
      return {
        status: 'complete',
        createdSessionId: `mock_session_${context.pendingPhone}`
      };
    }
  };

  const setActive = async ({ session }: { session: string | null }) => {
    if (!session) {
      await context.signOut();
      return;
    }
    const cleanPhone = session.replace('mock_session_', '');
    await context.setSession(cleanPhone);
  };

  return {
    signUp,
    setActive,
    isLoaded: context.isLoaded,
  };
}

// Switches based on env
export const ClerkProvider = USE_MOCK ? ClerkMockProvider : ClerkReal.ClerkProvider;
export const useAuth = USE_MOCK ? useMockAuth : ClerkReal.useAuth;
export const useUser = USE_MOCK ? useMockUser : ClerkReal.useUser;
export const useSignIn = USE_MOCK ? useMockSignIn : ClerkReal.useSignIn;
export const useSignUp = USE_MOCK ? useMockSignUp : ClerkReal.useSignUp;
