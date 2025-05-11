
"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/firebase/config';
import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateProfile
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  signUp: (email: string, password: string, name: string) => Promise<FirebaseUser | null>;
  logIn: (email: string, password: string, rememberMe?: boolean) => Promise<FirebaseUser | null>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const signUp = async (email: string, password: string, name: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      // For sign-up, typically local persistence is desired for a good UX.
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name,
        });
        // Manually update the currentUser state as onAuthStateChanged might not fire immediately with profile updates
        setCurrentUser({ ...userCredential.user, displayName: name }); 
      }
      
      toast({ title: "Success", description: "Account created successfully!" });
      router.push('/'); // Redirect to dashboard after sign up
      return userCredential.user;
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Sign up failed", description: authError.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logIn = async (email: string, password: string, rememberMe: boolean = true): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setCurrentUser(userCredential.user);
      toast({ title: "Success", description: "Logged in successfully!" });
      router.push('/'); // Redirect to dashboard after log in
      return userCredential.user;
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Login failed", description: authError.message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      toast({ title: "Success", description: "Logged out successfully." });
      router.push('/login'); // Redirect to login page after log out
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Logout failed", description: authError.message });
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    setError,
    signUp,
    logIn,
    logOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

