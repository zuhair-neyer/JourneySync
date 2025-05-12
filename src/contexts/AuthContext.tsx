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
  updatePassword as firebaseUpdatePassword,
  sendEmailVerification,
  deleteUser,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { updateUserDisplayNameInTrips, deleteUserDataFromDb } from '@/firebase/tripService'; 

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
  resendVerificationEmail: () => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
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
        try {
            await user.reload();
            const reloadedUser = auth.currentUser; 
            if (reloadedUser) {
                 const userToSet = {
                    ...reloadedUser, // Spread existing properties
                    uid: reloadedUser.uid, // Ensure essential properties are explicitly set
                    email: reloadedUser.email,
                    displayName: reloadedUser.displayName,
                    photoURL: reloadedUser.photoURL,
                    emailVerified: reloadedUser.emailVerified,
                } as FirebaseUser; // Cast to FirebaseUser to satisfy type
                setCurrentUser(userToSet);
                if (!reloadedUser.emailVerified) {
                  toast({ 
                      variant: "default", 
                      title: "Verify Your Email", 
                      description: "Your email address is not verified. Please check your inbox or resend the verification email from your account page.",
                      duration: 900000 
                  });
                }
            } else {
                setCurrentUser(null);
            }
        } catch (reloadError: any) {
             if (user) { 
                const userToSet = {
                     ...user,
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified,
                } as FirebaseUser;
                setCurrentUser(userToSet);
                 if (!userToSet.emailVerified) {
                  toast({ 
                      variant: "default", 
                      title: "Verify Your Email", 
                      description: "Your email address is not verified. Please check your inbox or resend the verification email from your account page.",
                      duration: 900000
                  });
                }
            } else {
                setCurrentUser(null);
            }
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe; 
  }, [toast]);

  const signUp = async (email: string, password: string, name: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        const userInstance = userCredential.user; 
        await updateProfile(userInstance, { displayName: name });
        await userInstance.reload();
        const reloadedUserInstance = auth.currentUser; 

        if (!reloadedUserInstance) {
            toast({ variant: "destructive", title: "Sign up incomplete", description: "Profile update confirmation failed." });
            const updatedUserForContext = {
                ...userInstance, 
                uid: userInstance.uid, 
                email: userInstance.email, 
                displayName: name, 
                photoURL: userInstance.photoURL,
                emailVerified: userInstance.emailVerified,
            }  as FirebaseUser;
            setCurrentUser(updatedUserForContext);
        } else {
            const finalUserForContext = {
                ...reloadedUserInstance,
                uid: reloadedUserInstance.uid,
                email: reloadedUserInstance.email,
                displayName: reloadedUserInstance.displayName, 
                photoURL: reloadedUserInstance.photoURL,
                emailVerified: reloadedUserInstance.emailVerified,
            } as FirebaseUser;
            setCurrentUser(finalUserForContext); 
        }
        
        const userToVerify = reloadedUserInstance || userInstance;
        try {
          await sendEmailVerification(userToVerify);
          toast({ title: "Verification Email Sent", description: "Please check your email to verify your account. You can then log in." });
        } catch (verificationError: any) {
          toast({ variant: "destructive", title: "Verification Email Failed", description: "Could not send verification email. You can try resending from your account page after logging in (if allowed)." });
        }
        
        await firebaseSignOut(auth);
        setCurrentUser(null);
        router.push('/login'); 
        
        return reloadedUserInstance || userInstance; 
      }
      return null; 
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
      
      const loggedInUser = userCredential.user;
      if (loggedInUser) {
          await loggedInUser.reload(); 
          const reloadedUser = auth.currentUser; 

          if (reloadedUser && !reloadedUser.emailVerified) {
            setError("Email not verified. Please check your inbox or resend the verification email.");
            toast({ 
                variant: "destructive", 
                title: "Email Not Verified", 
                description: "Please verify your email address before logging in. Check your inbox or resend from the account page (if you signed up previously).",
                duration: 9000 
            });
            await firebaseSignOut(auth); 
            setCurrentUser(null);
            return null; 
          }
          
          if (reloadedUser) {
            const userToSet = { 
                ...reloadedUser, 
                uid: reloadedUser.uid,
                email: reloadedUser.email,
                displayName: reloadedUser.displayName,
                photoURL: reloadedUser.photoURL,
                emailVerified: reloadedUser.emailVerified,
            } as FirebaseUser;
            setCurrentUser(userToSet);
            toast({ title: "Success", description: "Logged in successfully!" });
            router.push('/'); 
            return reloadedUser;
          } else {
            setCurrentUser(null);
            setError("Failed to load user data after login.");
            toast({variant: "destructive", title: "Login Error", description: "Could not retrieve user details after login."});
            return null;
          }
      } else {
          setCurrentUser(null);
          setError("Login failed: No user data received.");
          toast({variant: "destructive", title: "Login Error", description: "No user data received upon login."});
          return null;
      }
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
      router.push('/login'); 
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Logout failed", description: authError.message });
    } finally {
      setLoading(false);
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
    try {
      await updateProfile(userToUpdate, { displayName: name });
      await userToUpdate.reload();
      const reloadedUser = auth.currentUser; 

      if (!reloadedUser) {
          toast({ variant: "destructive", title: "Profile update error", description: "Failed to confirm profile update." });
           const updatedUserForContextFallback = { 
            ...userToUpdate, 
            uid: userToUpdate.uid,
            email: userToUpdate.email,
            displayName: name, 
            photoURL: userToUpdate.photoURL,
            emailVerified: userToUpdate.emailVerified,
          } as FirebaseUser;
          setCurrentUser(updatedUserForContextFallback);
          await updateUserDisplayNameInTrips(userToUpdate.uid, name);
          return;
      }
      
      const finalUpdatedUserForContext = { 
        ...reloadedUser, 
        uid: reloadedUser.uid,
        email: reloadedUser.email,
        displayName: reloadedUser.displayName, 
        photoURL: reloadedUser.photoURL,
        emailVerified: reloadedUser.emailVerified,
      } as FirebaseUser;
      
      setCurrentUser(finalUpdatedUserForContext);

      if (finalUpdatedUserForContext.displayName) {
        await updateUserDisplayNameInTrips(finalUpdatedUserForContext.uid, finalUpdatedUserForContext.displayName);
      } else {
        await updateUserDisplayNameInTrips(finalUpdatedUserForContext.uid, name); 
      }

      toast({ title: "Success", description: "Profile updated successfully!" });
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Profile update failed", description: authError.message });
    } finally {
      setLoading(false);
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
    try {
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      toast({ title: "Success", description: "Password updated successfully! Please log in again if prompted." });
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Password update failed", description: authError.message });
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    const userToVerify = auth.currentUser || currentUser; 

    if (!userToVerify) {
      toast({ variant: "destructive", title: "Error", description: "No user session found to resend verification for. Please try logging in." });
      return;
    }
    if (userToVerify.emailVerified) {
      toast({ title: "Already Verified", description: "Your email is already verified." });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendEmailVerification(userToVerify);
      toast({ title: "Verification Email Sent", description: "Please check your email to verify your account." });
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Failed to Resend Email", description: authError.message });
    } finally {
      setLoading(false);
    }
  };

  const deleteUserAccount = async () => {
    const userToDelete = auth.currentUser;
    if (!userToDelete) {
      setError("No user logged in.");
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to delete your account." });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Step 1: Delete user data from Realtime Database
      await deleteUserDataFromDb(userToDelete.uid);
      
      // Step 2: Delete user from Firebase Authentication
      await deleteUser(userToDelete);
      
      toast({ title: "Account Deleted", description: "Your account has been permanently deleted." });
      // logOut() will handle setCurrentUser(null) and redirect.
      await logOut(); 
    } catch (e) {
      const authError = e as AuthError;
      console.error("[AuthContext] deleteUserAccount: Error:", authError);
      if (authError.code === 'auth/requires-recent-login') {
        setError("This operation is sensitive and requires recent authentication. Please log out and log back in before deleting your account.");
        toast({ variant: "destructive", title: "Re-authentication Required", description: "Please log out and log back in, then try deleting your account again." });
      } else {
        setError(authError.message);
        toast({ variant: "destructive", title: "Account Deletion Failed", description: authError.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSendPasswordResetEmail(auth, email);
      toast({
        title: "Password Reset Email Sent",
        description: "If an account with that email exists, a password reset link has been sent. Please check your inbox.",
      });
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message); 
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: authError.message, 
      });
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
    updateUserProfile,
    updateUserPassword,
    resendVerificationEmail, 
    deleteUserAccount,
    sendPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

