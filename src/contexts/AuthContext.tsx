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
        console.log("[AuthContext] onAuthStateChanged: User found. UID:", user.uid, "Initial displayName from Firebase Auth:", user.displayName);
        try {
            await user.reload();
            const reloadedUser = auth.currentUser; 
            console.log("[AuthContext] onAuthStateChanged: User reloaded. displayName after reload:", reloadedUser?.displayName, "Email:", reloadedUser?.email, "UID:", reloadedUser?.uid);
            if (reloadedUser) {
                 const userToSet = {
                    uid: reloadedUser.uid,
                    email: reloadedUser.email,
                    displayName: reloadedUser.displayName,
                    photoURL: reloadedUser.photoURL,
                    emailVerified: reloadedUser.emailVerified,
                    isAnonymous: reloadedUser.isAnonymous,
                    metadata: reloadedUser.metadata,
                    providerData: reloadedUser.providerData,
                    providerId: reloadedUser.providerId,
                    refreshToken: reloadedUser.refreshToken,
                    tenantId: reloadedUser.tenantId,
                    delete: reloadedUser.delete,
                    getIdToken: reloadedUser.getIdToken,
                    getIdTokenResult: reloadedUser.getIdTokenResult,
                    reload: reloadedUser.reload,
                    toJSON: reloadedUser.toJSON,
                } as FirebaseUser;
                setCurrentUser(userToSet);
                console.log("[AuthContext] onAuthStateChanged: setCurrentUser with reloaded user. Context displayName:", userToSet.displayName);
            } else {
                setCurrentUser(null);
                 console.log("[AuthContext] onAuthStateChanged: reloadedUser was null after reload.");
            }
        } catch (reloadError: any) {
            console.error("[AuthContext] onAuthStateChanged: Error reloading user:", reloadError.message, "Using user object as is from onAuthStateChanged callback.");
             if (user) { // Fallback to user object from callback
                const userToSet = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified,
                    isAnonymous: user.isAnonymous,
                    metadata: user.metadata,
                    providerData: user.providerData,
                    providerId: user.providerId,
                    refreshToken: user.refreshToken,
                    tenantId: user.tenantId,
                    delete: user.delete,
                    getIdToken: user.getIdToken,
                    getIdTokenResult: user.getIdTokenResult,
                    reload: user.reload,
                    toJSON: user.toJSON,
                } as FirebaseUser;
                setCurrentUser(userToSet);
                console.log("[AuthContext] onAuthStateChanged: setCurrentUser with original user (reload failed). Context displayName:", userToSet.displayName);
            } else {
                setCurrentUser(null);
                 console.log("[AuthContext] onAuthStateChanged: original user was null after reload error.");
            }
        }
      } else {
        console.log("[AuthContext] onAuthStateChanged: User is null (logged out or no session).");
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
        
        // Force reload to ensure the user object has the latest profile data from Firebase
        await userInstance.reload();
        const reloadedUserInstance = auth.currentUser; // Get the reloaded user

        if (!reloadedUserInstance) {
            console.error("[AuthContext] signUp: CRITICAL - reloadedUserInstance is null after updateProfile and reload.");
            toast({ variant: "destructive", title: "Sign up incomplete", description: "Profile update confirmation failed." });
            // Fallback to using 'name' for local context, but this is not ideal
            const updatedUserForContext = {
                ...userInstance,
                uid: userInstance.uid,
                email: userInstance.email,
                displayName: name, 
                photoURL: userInstance.photoURL,
            }  as FirebaseUser;
            setCurrentUser(updatedUserForContext);
            console.log("[AuthContext] signUp: setCurrentUser called (fallback after reload failed). User object displayName:", updatedUserForContext.displayName);
            router.push('/');
            return updatedUserForContext;
        }
        
        const finalUserForContext = {
            ...reloadedUserInstance,
            uid: reloadedUserInstance.uid,
            email: reloadedUserInstance.email,
            displayName: reloadedUserInstance.displayName, // Should reflect 'name'
            photoURL: reloadedUserInstance.photoURL,
        } as FirebaseUser;
        
        setCurrentUser(finalUserForContext); 
        console.log("[AuthContext] signUp: setCurrentUser called. User object displayName:", finalUserForContext.displayName);
        
        toast({ title: "Success", description: "Account created successfully!" });
        router.push('/'); 
        return finalUserForContext; 
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
              console.log("[AuthContext] logIn: User reloaded. DisplayName:", reloadedUser?.displayName, "Email:", reloadedUser?.email, "UID:", reloadedUser?.uid);
              if (reloadedUser) {
                const userToSet = { 
                    ...reloadedUser, 
                    uid: reloadedUser.uid,
                    email: reloadedUser.email,
                    displayName: reloadedUser.displayName,
                    photoURL: reloadedUser.photoURL,
                } as FirebaseUser;
                setCurrentUser(userToSet);
                console.log("[AuthContext] logIn: setCurrentUser after reload. User object displayName:", userToSet.displayName);
              } else {
                setCurrentUser(null);
                console.log("[AuthContext] logIn: reloadedUser was null after reload.");
              }
          } catch (reloadError: any) {
              console.error("[AuthContext] logIn: Error reloading user after login:", reloadError.message);
              if (loggedInUser) { // Fallback to loggedInUser from signIn
                const userToSet = { 
                    ...loggedInUser,
                    uid: loggedInUser.uid,
                    email: loggedInUser.email,
                    displayName: loggedInUser.displayName,
                    photoURL: loggedInUser.photoURL,
                 } as FirebaseUser;
                setCurrentUser(userToSet);
                console.log("[AuthContext] logIn: setCurrentUser with non-reloaded user. User object displayName:", userToSet.displayName);
              } else {
                setCurrentUser(null);
                 console.log("[AuthContext] logIn: loggedInUser was null after reload error.");
              }
          }
      } else {
          setCurrentUser(null);
          console.log("[AuthContext] logIn: userCredential.user was null.");
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
    console.log("[AuthContext] updateUserProfile: Attempting to update name to:", name, "for UID:", userToUpdate.uid, "Current Firebase Auth displayName:", userToUpdate.displayName);
    try {
      await updateProfile(userToUpdate, { displayName: name });
      console.log("[AuthContext] updateUserProfile: Firebase Auth profile updated for UID:", userToUpdate.uid);
      
      // Force reload to get the latest profile from Firebase server
      await userToUpdate.reload();
      const reloadedUser = auth.currentUser; // This should now have the updated name

      if (!reloadedUser) {
          console.error("[AuthContext] updateUserProfile: CRITICAL - reloadedUser is null after updateProfile and reload.");
          toast({ variant: "destructive", title: "Profile update error", description: "Failed to confirm profile update." });
          // Fallback to using 'name' for local context
           const updatedUserForContextFallback = { 
            ...userToUpdate, // original userToUpdate object
            uid: userToUpdate.uid,
            email: userToUpdate.email,
            displayName: name, // use the intended new name
            photoURL: userToUpdate.photoURL,
          } as FirebaseUser;
          setCurrentUser(updatedUserForContextFallback);
          console.log("[AuthContext] updateUserProfile: setCurrentUser called with fallback User object. Context displayName:", updatedUserForContextFallback.displayName);
          // Still attempt to update trips
          await updateUserDisplayNameInTrips(userToUpdate.uid, name);
          return;
      }
      
      const finalUpdatedUserForContext = { 
        ...reloadedUser, 
        uid: reloadedUser.uid,
        email: reloadedUser.email,
        displayName: reloadedUser.displayName, // This should be the new name from Firebase
        photoURL: reloadedUser.photoURL,
      } as FirebaseUser;
      
      setCurrentUser(finalUpdatedUserForContext);
      console.log("[AuthContext] updateUserProfile: setCurrentUser called with reloaded User object. Context displayName:", finalUpdatedUserForContext.displayName);

      // Now, update the display name in all trips the user is part of
      // Pass the confirmed displayName from the reloadedUser object
      if (finalUpdatedUserForContext.displayName) {
        await updateUserDisplayNameInTrips(finalUpdatedUserForContext.uid, finalUpdatedUserForContext.displayName);
        console.log("[AuthContext] updateUserProfile: Called updateUserDisplayNameInTrips for UID:", finalUpdatedUserForContext.uid, "with name:", finalUpdatedUserForContext.displayName);
      } else {
        console.warn("[AuthContext] updateUserProfile: reloadedUser.displayName was null/empty after update and reload. Trip names might not update correctly for UID:", finalUpdatedUserForContext.uid);
         // Fallback to using the 'name' variable if reloadedUser.displayName is unexpectedly null
        await updateUserDisplayNameInTrips(finalUpdatedUserForContext.uid, name);
        console.log("[AuthContext] updateUserProfile: Called updateUserDisplayNameInTrips (fallback name) for UID:", finalUpdatedUserForContext.uid, "with name:", name);
      }


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
