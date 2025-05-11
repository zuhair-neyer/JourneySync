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
import { updateUserDisplayNameInTrips } from '@/firebase/tripService'; // Import the new service

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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("[AuthContext] onAuthStateChanged: User found. UID:", user.uid, "Initial displayName:", user.displayName);
        try {
            await user.reload();
            const reloadedUser = auth.currentUser; 
            console.log("[AuthContext] onAuthStateChanged: User reloaded. displayName after reload:", reloadedUser?.displayName, "UID:", reloadedUser?.uid);
            // Create a new object instance for setCurrentUser to ensure React detects the change
            // And ensure all relevant properties are included
            if (reloadedUser) {
                 setCurrentUser({
                    ...reloadedUser,
                    uid: reloadedUser.uid,
                    email: reloadedUser.email,
                    displayName: reloadedUser.displayName,
                    photoURL: reloadedUser.photoURL,
                    // Add other necessary FirebaseUser properties
                } as FirebaseUser);
            } else {
                setCurrentUser(null);
            }
        } catch (reloadError: any) {
            console.error("[AuthContext] onAuthStateChanged: Error reloading user:", reloadError.message, "Using user object as is.");
             if (user) {
                setCurrentUser({
                    ...user,
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                } as FirebaseUser);
            } else {
                setCurrentUser(null);
            }
        }
      } else {
        console.log("[AuthContext] onAuthStateChanged: User is null.");
        setCurrentUser(null);
      }
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
        const userInstance = userCredential.user; 
        console.log("[AuthContext] signUp: User created. UID:", userInstance.uid, "Initial displayName (before updateProfile):", userInstance.displayName);
        
        console.log("[AuthContext] signUp: Attempting to update profile with name:", name, "for user UID:", userInstance.uid);
        await updateProfile(userInstance, { displayName: name });
        console.log("[AuthContext] signUp: updateProfile call completed for UID:", userInstance.uid);
        
        // After updateProfile, the name is set on Firebase, but userInstance might be stale.
        // We create a new object for the context with the displayName we just tried to set.
        const updatedUserForContext = {
            ...userInstance, // spread existing properties
            uid: userInstance.uid, // ensure uid is carried over
            email: userInstance.email, // ensure email is carried over
            displayName: name, // explicitly use the name from signup
            photoURL: userInstance.photoURL,
        };
        
        setCurrentUser(updatedUserForContext as FirebaseUser); 
        console.log("[AuthContext] signUp: setCurrentUser called. User object:", JSON.stringify(updatedUserForContext));
        
        toast({ title: "Success", description: "Account created successfully!" });
        router.push('/'); 
        return updatedUserForContext as FirebaseUser; 
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
      
      const loggedInUser = userCredential.user;
      if (loggedInUser) {
          try {
              await loggedInUser.reload(); 
              const reloadedUser = auth.currentUser; 
              console.log("[AuthContext] logIn: User reloaded. DisplayName:", reloadedUser?.displayName, "UID:", reloadedUser?.uid);
              if (reloadedUser) {
                setCurrentUser({ 
                    ...reloadedUser, 
                    uid: reloadedUser.uid,
                    email: reloadedUser.email,
                    displayName: reloadedUser.displayName,
                    photoURL: reloadedUser.photoURL,
                } as FirebaseUser);
                console.log("[AuthContext] logIn: setCurrentUser after reload. User object:", JSON.stringify(reloadedUser));
              } else {
                setCurrentUser(null);
              }
          } catch (reloadError: any) {
              console.error("[AuthContext] logIn: Error reloading user after login:", reloadError.message);
              if (loggedInUser) {
                setCurrentUser({ 
                    ...loggedInUser,
                    uid: loggedInUser.uid,
                    email: loggedInUser.email,
                    displayName: loggedInUser.displayName,
                    photoURL: loggedInUser.photoURL,
                 } as FirebaseUser);
                console.log("[AuthContext] logIn: setCurrentUser with non-reloaded user. User object:", JSON.stringify(loggedInUser));
              } else {
                setCurrentUser(null);
              }
          }
      } else {
          setCurrentUser(null);
      }
      
      toast({ title: "Success", description: "Logged in successfully!" });
      router.push('/'); 
      return auth.currentUser; // Return potentially reloaded user
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
    const userToUpdate = auth.currentUser;
    if (!userToUpdate) {
      setError("No user logged in.");
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update your profile." });
      return;
    }
    if (!name || name.trim() === "") {
        toast({ variant: "destructive", title: "Validation Error", description: "Display name cannot be empty." });
        return;
    }

    setLoading(true);
    setError(null);
    console.log("[AuthContext] updateUserProfile: Attempting to update name to:", name, "for UID:", userToUpdate.uid, "Current displayName:", userToUpdate.displayName);
    try {
      await updateProfile(userToUpdate, { displayName: name });
      console.log("[AuthContext] updateUserProfile: Firebase Auth profile updated for UID:", userToUpdate.uid);
      
      // After updateProfile, the name is set on Firebase.
      // Construct a new user object for the context with the displayName we just tried to set.
      const updatedUserForContext = { 
        ...userToUpdate, 
        uid: userToUpdate.uid,
        email: userToUpdate.email,
        displayName: name, 
        photoURL: userToUpdate.photoURL,
      };
      
      setCurrentUser(updatedUserForContext as FirebaseUser);
      console.log("[AuthContext] updateUserProfile: setCurrentUser called with updated User object:", JSON.stringify(updatedUserForContext));

      // Now, update the display name in all trips the user is part of
      await updateUserDisplayNameInTrips(userToUpdate.uid, name);
      console.log("[AuthContext] updateUserProfile: Called updateUserDisplayNameInTrips for UID:", userToUpdate.uid, "with name:", name);

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
