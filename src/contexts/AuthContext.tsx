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
  updateProfile,
  updatePassword as firebaseUpdatePassword // Renamed to avoid conflict
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
  updateUserProfile: (name: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
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
      console.log("[AuthContext] onAuthStateChanged triggered. User:", user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null);
      setCurrentUser(user ? { ...user } as FirebaseUser : null);
      setLoading(false);
    });
    return unsubscribe; 
  }, []);

  const signUp = async (email: string, password: string, name: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    console.log("[AuthContext] signUp: Starting with email:", email, "name:", name);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        const userToUpdate = userCredential.user;
        console.log("[AuthContext] signUp: User created. UID:", userToUpdate.uid, "Current displayName:", userToUpdate.displayName);
        console.log("[AuthContext] signUp: Attempting to update profile with name:", name);
        
        await updateProfile(userToUpdate, {
          displayName: name,
        });
        console.log("[AuthContext] signUp: updateProfile call completed.");
        
        await userToUpdate.reload(); 
        console.log("[AuthContext] signUp: User reloaded. New displayName from userToUpdate object:", userToUpdate.displayName);
        
        setCurrentUser(userToUpdate ? { ...userToUpdate } as FirebaseUser : null);
        console.log("[AuthContext] signUp: currentUser state updated in context. New displayName:", auth.currentUser?.displayName);
        
        toast({ title: "Success", description: "Account created successfully!" });
        router.push('/'); 
        return userToUpdate;
      }
      console.warn("[AuthContext] signUp: userCredential.user was null after creation.");
      return null; 
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Sign up failed", description: authError.message });
      console.error("[AuthContext] signUp: Error during signup:", authError);
      return null;
    } finally {
      setLoading(false);
      console.log("[AuthContext] signUp: Finished.");
    }
  };

  const logIn = async (email: string, password: string, rememberMe: boolean = true): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    console.log("[AuthContext] logIn: Attempting login for email:", email);
    try {
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("[AuthContext] logIn: Login successful. User displayName:", userCredential.user?.displayName);
      setCurrentUser(userCredential.user ? { ...userCredential.user } as FirebaseUser : null);
      toast({ title: "Success", description: "Logged in successfully!" });
      router.push('/'); 
      return userCredential.user;
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Login failed", description: authError.message });
      console.error("[AuthContext] logIn: Error during login:", authError);
      return null;
    } finally {
      setLoading(false);
      console.log("[AuthContext] logIn: Finished.");
    }
  };

  const logOut = async () => {
    setLoading(true);
    setError(null);
    console.log("[AuthContext] logOut: Attempting logout.");
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      toast({ title: "Success", description: "Logged out successfully." });
      router.push('/login'); 
      console.log("[AuthContext] logOut: Logout successful.");
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Logout failed", description: authError.message });
      console.error("[AuthContext] logOut: Error during logout:", authError);
    } finally {
      setLoading(false);
      console.log("[AuthContext] logOut: Finished.");
    }
  };

  const updateUserProfile = async (name: string) => {
    if (!auth.currentUser) {
      setError("No user logged in.");
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update your profile." });
      return;
    }
    setLoading(true);
    setError(null);
    console.log("[AuthContext] updateUserProfile: Attempting to update name to:", name);
    try {
      const userToUpdate = auth.currentUser;
      await updateProfile(userToUpdate, { displayName: name });
      await userToUpdate.reload();
      console.log("[AuthContext] updateUserProfile: Profile updated and reloaded. New displayName:", userToUpdate.displayName);
      setCurrentUser(userToUpdate ? { ...userToUpdate } as FirebaseUser : null);
      toast({ title: "Success", description: "Profile updated successfully!" });
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Profile update failed", description: authError.message });
      console.error("[AuthContext] updateUserProfile: Error:", authError);
    } finally {
      setLoading(false);
      console.log("[AuthContext] updateUserProfile: Finished.");
    }
  };

  const updateUserPassword = async (newPassword: string) => {
    if (!auth.currentUser) {
      setError("No user logged in.");
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update your password." });
      return;
    }
    setLoading(true);
    setError(null);
    console.log("[AuthContext] updateUserPassword: Attempting to update password.");
    try {
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      toast({ title: "Success", description: "Password updated successfully! Please log in again if prompted." });
      console.log("[AuthContext] updateUserPassword: Password update successful.");
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Password update failed", description: authError.message });
      console.error("[AuthContext] updateUserPassword: Error:", authError);
    } finally {
      setLoading(false);
      console.log("[AuthContext] updateUserPassword: Finished.");
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
    updateUserProfile,
    updateUserPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}