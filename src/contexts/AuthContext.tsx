
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
  sendEmailVerification
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { updateUserDisplayNameInTrips } from '@/firebase/tripService'; 

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
        console.log("[AuthContext] onAuthStateChanged: User found. UID:", user.uid, "Initial displayName from Firebase Auth:", user.displayName, "Email Verified:", user.emailVerified);
        try {
            await user.reload();
            const reloadedUser = auth.currentUser; 
            console.log("[AuthContext] onAuthStateChanged: User reloaded. displayName after reload:", reloadedUser?.displayName, "Email:", reloadedUser?.email, "UID:", reloadedUser?.uid, "Email Verified:", reloadedUser?.emailVerified);
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
                console.log("[AuthContext] onAuthStateChanged: setCurrentUser with reloaded user. Context displayName:", userToSet.displayName, "Email Verified:", userToSet.emailVerified);
                 // If user session exists but email is not verified, show a persistent toast.
                // This is for users who might have closed the tab after signup without verifying.
                if (!reloadedUser.emailVerified) {
                  toast({ 
                      variant: "default", 
                      title: "Verify Your Email", 
                      description: "Your email address is not verified. Please check your inbox or resend the verification email from your account page.",
                      duration: 900000 // Long duration or make it non-dismissible if possible
                  });
                }
            } else {
                setCurrentUser(null);
                 console.log("[AuthContext] onAuthStateChanged: reloadedUser was null after reload.");
            }
        } catch (reloadError: any) {
            console.error("[AuthContext] onAuthStateChanged: Error reloading user:", reloadError.message, "Using user object as is from onAuthStateChanged callback.");
             if (user) { 
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
                console.log("[AuthContext] onAuthStateChanged: setCurrentUser with original user (reload failed). Context displayName:", userToSet.displayName, "Email Verified:", userToSet.emailVerified);
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
  }, [toast]); // Added toast to dependency array

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
        
        await userInstance.reload();
        const reloadedUserInstance = auth.currentUser; 

        if (!reloadedUserInstance) {
            console.error("[AuthContext] signUp: CRITICAL - reloadedUserInstance is null after updateProfile and reload.");
            toast({ variant: "destructive", title: "Sign up incomplete", description: "Profile update confirmation failed." });
            // Manually construct a user object for context if reload fails but name was intended to be set.
            const updatedUserForContext = {
                ...userInstance, // Spreading the original user instance
                uid: userInstance.uid, // Explicitly ensure uid is present
                email: userInstance.email, // Explicitly ensure email is present
                displayName: name, // Use the intended name
                photoURL: userInstance.photoURL,
                emailVerified: userInstance.emailVerified,
                 // Add other required properties from FirebaseUser type if missing from spread
                isAnonymous: userInstance.isAnonymous,
                metadata: userInstance.metadata,
                providerData: userInstance.providerData,
                providerId: userInstance.providerId,
                refreshToken: userInstance.refreshToken,
                tenantId: userInstance.tenantId,
                delete: () => userInstance.delete(),
                getIdToken: (forceRefresh?: boolean) => userInstance.getIdToken(forceRefresh),
                getIdTokenResult: (forceRefresh?: boolean) => userInstance.getIdTokenResult(forceRefresh),
                reload: () => userInstance.reload(),
                toJSON: () => userInstance.toJSON(),
            }  as FirebaseUser;
            setCurrentUser(updatedUserForContext);
            console.log("[AuthContext] signUp: setCurrentUser called (fallback after reload failed). User object displayName:", updatedUserForContext.displayName);
            // Don't redirect immediately, let them verify email first.
            // router.push('/'); // Commented out to wait for verification
            // return updatedUserForContext; // Return the constructed user
        } else {
            const finalUserForContext = {
                ...reloadedUserInstance,
                uid: reloadedUserInstance.uid,
                email: reloadedUserInstance.email,
                displayName: reloadedUserInstance.displayName, 
                photoURL: reloadedUserInstance.photoURL,
                emailVerified: reloadedUserInstance.emailVerified,
                 isAnonymous: reloadedUserInstance.isAnonymous,
                metadata: reloadedUserInstance.metadata,
                providerData: reloadedUserInstance.providerData,
                providerId: reloadedUserInstance.providerId,
                refreshToken: reloadedUserInstance.refreshToken,
                tenantId: reloadedUserInstance.tenantId,
                delete: () => reloadedUserInstance.delete(),
                getIdToken: (forceRefresh?: boolean) => reloadedUserInstance.getIdToken(forceRefresh),
                getIdTokenResult: (forceRefresh?: boolean) => reloadedUserInstance.getIdTokenResult(forceRefresh),
                reload: () => reloadedUserInstance.reload(),
                toJSON: () => reloadedUserInstance.toJSON(),
            } as FirebaseUser;
            
            setCurrentUser(finalUserForContext); 
            console.log("[AuthContext] signUp: setCurrentUser called. User object displayName:", finalUserForContext.displayName, "Email Verified:", finalUserForContext.emailVerified);
        }
        
        // Send verification email using the latest user instance (reloaded if successful)
        const userToVerify = reloadedUserInstance || userInstance;
        try {
          await sendEmailVerification(userToVerify);
          toast({ title: "Verification Email Sent", description: "Please check your email to verify your account. You can then log in." });
          console.log("[AuthContext] signUp: Verification email sent to:", userToVerify.email);
        } catch (verificationError: any) {
          console.error("[AuthContext] signUp: Error sending verification email:", verificationError);
          toast({ variant: "destructive", title: "Verification Email Failed", description: "Could not send verification email. You can try resending from your account page after logging in (if allowed)." });
        }
        
        // Do not automatically log in or redirect. User needs to verify first.
        // toast({ title: "Success", description: "Account created successfully! Please verify your email to log in." });
        // router.push('/login'); // Redirect to login so they can log in AFTER verification.
        // Ensure user is signed out after signup until email is verified
        await firebaseSignOut(auth);
        setCurrentUser(null);
        console.log("[AuthContext] signUp: User signed out after signup, pending email verification.");
        router.push('/login'); // Send to login page with a message to verify.
        
        return reloadedUserInstance || userInstance; 
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
          await loggedInUser.reload(); 
          const reloadedUser = auth.currentUser; 
          console.log("[AuthContext] logIn: User reloaded. DisplayName:", reloadedUser?.displayName, "Email:", reloadedUser?.email, "UID:", reloadedUser?.uid, "Email Verified:", reloadedUser?.emailVerified);

          if (reloadedUser && !reloadedUser.emailVerified) {
            console.log("[AuthContext] logIn: Email not verified for:", reloadedUser.email);
            setError("Email not verified. Please check your inbox or resend the verification email.");
            toast({ 
                variant: "destructive", 
                title: "Email Not Verified", 
                description: "Please verify your email address before logging in. Check your inbox or resend from the account page (if you signed up previously).",
                duration: 9000 
            });
            await firebaseSignOut(auth); // Sign out the user
            setCurrentUser(null);
            return null; // Prevent login
          }
          
          if (reloadedUser) {
            const userToSet = { 
                ...reloadedUser, 
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
                delete: () => reloadedUser.delete(),
                getIdToken: (forceRefresh?: boolean) => reloadedUser.getIdToken(forceRefresh),
                getIdTokenResult: (forceRefresh?: boolean) => reloadedUser.getIdTokenResult(forceRefresh),
                reload: () => reloadedUser.reload(),
                toJSON: () => reloadedUser.toJSON(),
            } as FirebaseUser;
            setCurrentUser(userToSet);
            console.log("[AuthContext] logIn: setCurrentUser after reload. User object displayName:", userToSet.displayName, "Email Verified:", userToSet.emailVerified);
            toast({ title: "Success", description: "Logged in successfully!" });
            router.push('/'); 
            return reloadedUser;
          } else {
            // This case should ideally not be reached if reloadedUser was checked for email verification first
            setCurrentUser(null);
            setError("Failed to load user data after login.");
            toast({variant: "destructive", title: "Login Error", description: "Could not retrieve user details after login."});
            console.log("[AuthContext] logIn: reloadedUser was null after reload (and email verification check).");
            return null;
          }
      } else {
          setCurrentUser(null);
          setError("Login failed: No user data received.");
          toast({variant: "destructive", title: "Login Error", description: "No user data received upon login."});
          console.log("[AuthContext] logIn: userCredential.user was null.");
          return null;
      }
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
      
      await userToUpdate.reload();
      const reloadedUser = auth.currentUser; 

      if (!reloadedUser) {
          console.error("[AuthContext] updateUserProfile: CRITICAL - reloadedUser is null after updateProfile and reload.");
          toast({ variant: "destructive", title: "Profile update error", description: "Failed to confirm profile update." });
           const updatedUserForContextFallback = { 
            ...userToUpdate, 
            uid: userToUpdate.uid,
            email: userToUpdate.email,
            displayName: name, 
            photoURL: userToUpdate.photoURL,
            emailVerified: userToUpdate.emailVerified,
            isAnonymous: userToUpdate.isAnonymous,
            metadata: userToUpdate.metadata,
            providerData: userToUpdate.providerData,
            providerId: userToUpdate.providerId,
            refreshToken: userToUpdate.refreshToken,
            tenantId: userToUpdate.tenantId,
            delete: () => userToUpdate.delete(),
            getIdToken: (forceRefresh?: boolean) => userToUpdate.getIdToken(forceRefresh),
            getIdTokenResult: (forceRefresh?: boolean) => userToUpdate.getIdTokenResult(forceRefresh),
            reload: () => userToUpdate.reload(),
            toJSON: () => userToUpdate.toJSON(),
          } as FirebaseUser;
          setCurrentUser(updatedUserForContextFallback);
          console.log("[AuthContext] updateUserProfile: setCurrentUser called with fallback User object. Context displayName:", updatedUserForContextFallback.displayName);
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
         isAnonymous: reloadedUser.isAnonymous,
        metadata: reloadedUser.metadata,
        providerData: reloadedUser.providerData,
        providerId: reloadedUser.providerId,
        refreshToken: reloadedUser.refreshToken,
        tenantId: reloadedUser.tenantId,
        delete: () => reloadedUser.delete(),
        getIdToken: (forceRefresh?: boolean) => reloadedUser.getIdToken(forceRefresh),
        getIdTokenResult: (forceRefresh?: boolean) => reloadedUser.getIdTokenResult(forceRefresh),
        reload: () => reloadedUser.reload(),
        toJSON: () => reloadedUser.toJSON(),
      } as FirebaseUser;
      
      setCurrentUser(finalUpdatedUserForContext);
      console.log("[AuthContext] updateUserProfile: setCurrentUser called with reloaded User object. Context displayName:", finalUpdatedUserForContext.displayName);

      if (finalUpdatedUserForContext.displayName) {
        await updateUserDisplayNameInTrips(finalUpdatedUserForContext.uid, finalUpdatedUserForContext.displayName);
        console.log("[AuthContext] updateUserProfile: Called updateUserDisplayNameInTrips for UID:", finalUpdatedUserForContext.uid, "with name:", finalUpdatedUserForContext.displayName);
      } else {
        console.warn("[AuthContext] updateUserProfile: reloadedUser.displayName was null/empty after update and reload. Trip names might not update correctly for UID:", finalUpdatedUserForContext.uid);
        await updateUserDisplayNameInTrips(finalUpdatedUserForContext.uid, name); // Fallback to intended name if reloaded one is empty
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

  const resendVerificationEmail = async () => {
    // Allow resending even if currentUser is briefly null (e.g. after signup logs them out)
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
    console.log("[AuthContext] resendVerificationEmail: Attempting for user:", userToVerify.email);
    try {
      await sendEmailVerification(userToVerify);
      toast({ title: "Verification Email Sent", description: "Please check your email to verify your account." });
      console.log("[AuthContext] resendVerificationEmail: Sent to:", userToVerify.email);
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      toast({ variant: "destructive", title: "Failed to Resend Email", description: authError.message });
      console.error("[AuthContext] resendVerificationEmail: Error:", authError);
    } finally {
      setLoading(false);
      console.log("[AuthContext] resendVerificationEmail: Finished.");
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
