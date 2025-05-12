
"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import type { UserTripInfo, Trip } from '@/types';
import { getUserTripsFromDb, getTripDetailsFromDb, deleteTripFromDb } from '@/firebase/tripService';

interface TripContextType {
  userTrips: UserTripInfo[];
  isLoadingUserTrips: boolean;
  selectedTripId: string | null; 
  selectedTrip: Trip | null;
  setSelectedTripId: Dispatch<SetStateAction<string | null>>;
  isLoadingSelectedTrip: boolean;
  refreshUserTrips: () => void;
  refreshSelectedTripDetails: () => void; 
  errorUserTrips: string | null; 
  errorSelectedTrip: string | null; 
  deleteTrip: (tripId: string, memberUids: string[]) => Promise<boolean>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function useTripContext() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTripContext must be used within a TripProvider');
  }
  return context;
}

interface TripProviderProps {
  children: ReactNode;
}

export function TripProvider({ children }: TripProviderProps) {
  const { currentUser } = useAuth();
  const [userTrips, setUserTrips] = useState<UserTripInfo[]>([]);
  const [isLoadingUserTrips, setIsLoadingUserTrips] = useState(true); 
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isLoadingSelectedTrip, setIsLoadingSelectedTrip] = useState(false);
  const [errorUserTrips, setErrorUserTrips] = useState<string | null>(null);
  const [errorSelectedTrip, setErrorSelectedTrip] = useState<string | null>(null);


  const fetchUserTrips = useCallback(async (uid: string) => {
    setIsLoadingUserTrips(true);
    setErrorUserTrips(null);
    console.log(`[TripContext] fetchUserTrips called for UID: ${uid}`);
    try {
      const trips = await getUserTripsFromDb(uid);
      setUserTrips(trips || []); 
      console.log(`[TripContext] fetchUserTrips: ${trips?.length || 0} trips loaded for UID: ${uid}`);
    } catch (error: any) {
      console.error("[TripContext] Failed to fetch user trips in context:", error);
      setUserTrips([]);
      setErrorUserTrips(error.message || "Failed to load trips.");
    } finally {
      setIsLoadingUserTrips(false);
    }
  }, []); 

  useEffect(() => {
    if (currentUser?.uid) {
      console.log(`[TripContext] currentUser or UID changed. UID: ${currentUser.uid}. Fetching user trips.`);
      fetchUserTrips(currentUser.uid);
    } else {
      console.log("[TripContext] No currentUser or UID. Clearing user trips and selected trip.");
      setUserTrips([]);
      setSelectedTripId(null); 
      setSelectedTrip(null);
      setIsLoadingUserTrips(false); 
      setErrorUserTrips(null);
      setErrorSelectedTrip(null);
    }
  }, [currentUser?.uid, fetchUserTrips]); 


  const fetchSelectedTripDetails = useCallback(async () => {
    if (!selectedTripId) {
      setSelectedTrip(null);
      setErrorSelectedTrip(null);
      setIsLoadingSelectedTrip(false);
      console.log("[TripContext] fetchSelectedTripDetails: No selectedTripId, clearing selectedTrip.");
      return;
    }
    setIsLoadingSelectedTrip(true);
    setErrorSelectedTrip(null);
    console.log(`[TripContext] fetchSelectedTripDetails: Fetching details for tripId: ${selectedTripId}`);
    try {
      const tripDetails = await getTripDetailsFromDb(selectedTripId);
      setSelectedTrip(tripDetails); 
      if (tripDetails) {
        console.log(`[TripContext] fetchSelectedTripDetails: Details loaded for tripId: ${selectedTripId}`, tripDetails);
      } else {
        console.warn(`[TripContext] fetchSelectedTripDetails: Trip details for ${selectedTripId} not found or failed to load.`);
      }
    } catch (error: any) {
      console.error("[TripContext] Failed to fetch selected trip details in context:", error);
      setSelectedTrip(null);
      setErrorSelectedTrip(error.message || "Failed to load trip details.");
    } finally {
      setIsLoadingSelectedTrip(false);
    }
  }, [selectedTripId]); 

  useEffect(() => {
    console.log("[TripContext] useEffect for fetchSelectedTripDetails triggered. selectedTripId:", selectedTripId, "currentUser.displayName:", currentUser?.displayName);
    fetchSelectedTripDetails();
  }, [fetchSelectedTripDetails, currentUser?.displayName]); 

  const refreshUserTrips = useCallback(() => {
    if (currentUser?.uid) {
      console.log(`[TripContext] refreshUserTrips called for UID: ${currentUser.uid}.`);
      fetchUserTrips(currentUser.uid);
    }
  }, [currentUser?.uid, fetchUserTrips]);

  const refreshSelectedTripDetails = useCallback(() => {
    if (selectedTripId) {
        console.log(`[TripContext] refreshSelectedTripDetails explicitly called for tripId: ${selectedTripId}`);
        fetchSelectedTripDetails();
    }
  }, [selectedTripId, fetchSelectedTripDetails]);

  const deleteTrip = useCallback(async (tripId: string, memberUids: string[]): Promise<boolean> => {
    console.log(`[TripContext] deleteTrip called for tripId: ${tripId}`);
    // Consider adding a specific loading state e.g., setIsLoadingDeleting(true)
    setErrorSelectedTrip(null); // Clear specific error for selected trip if it's being deleted

    try {
      const success = await deleteTripFromDb(tripId, memberUids);
      if (success) {
        console.log(`[TripContext] Trip ${tripId} deleted successfully. Refreshing user trips.`);
        refreshUserTrips(); // Re-fetch trips, this will update userTrips and trigger other effects
        if (selectedTripId === tripId) {
          setSelectedTripId(null); // Clear selected trip if it was the one deleted
          setSelectedTrip(null);
        }
        return true;
      } else {
        console.error(`[TripContext] Failed to delete trip ${tripId} via tripService.`);
        // Toast message for failure should be handled in the component calling this method
        return false;
      }
    } catch (error: any) {
      console.error(`[TripContext] Error during deleteTrip for ${tripId}:`, error);
      setErrorSelectedTrip(error.message || "Failed to delete trip."); // Or a general error state
      return false;
    } finally {
      // if using specific loading state: setIsLoadingDeleting(false)
    }
  }, [refreshUserTrips, selectedTripId]);


  const value = {
    userTrips,
    isLoadingUserTrips,
    selectedTripId, 
    selectedTrip,
    setSelectedTripId,
    isLoadingSelectedTrip,
    refreshUserTrips,
    refreshSelectedTripDetails, 
    deleteTrip,
    errorUserTrips,
    errorSelectedTrip,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

