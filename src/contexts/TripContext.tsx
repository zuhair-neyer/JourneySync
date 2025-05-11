"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import type { UserTripInfo, Trip } from '@/types';
import { getUserTripsFromDb, getTripDetailsFromDb } from '@/firebase/tripService';

interface TripContextType {
  userTrips: UserTripInfo[];
  isLoadingUserTrips: boolean;
  selectedTripId: string | null; 
  selectedTrip: Trip | null;
  setSelectedTripId: Dispatch<SetStateAction<string | null>>;
  isLoadingSelectedTrip: boolean;
  refreshUserTrips: () => void;
  refreshSelectedTripDetails: () => void; // New function
  errorUserTrips: string | null; 
  errorSelectedTrip: string | null; 
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
  }, []); // Memoize fetchUserTrips, it doesn't depend on external state that changes frequently within TripProvider

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
  }, [currentUser?.uid, fetchUserTrips]); // Depend on currentUser.uid and the memoized fetchUserTrips


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
  }, [selectedTripId]); // fetchSelectedTripDetails is memoized with selectedTripId as dependency

  useEffect(() => {
    // This effect runs when selectedTripId changes (via fetchSelectedTripDetails dependency)
    // or when the current logged-in user's display name changes,
    // prompting a re-fetch of the selected trip details which might contain the user's updated name.
    console.log("[TripContext] useEffect for fetchSelectedTripDetails triggered. selectedTripId:", selectedTripId, "currentUser.displayName:", currentUser?.displayName);
    fetchSelectedTripDetails();
  }, [fetchSelectedTripDetails, currentUser?.displayName]); 

  const refreshUserTrips = useCallback(() => {
    if (currentUser?.uid) {
      console.log(`[TripContext] refreshUserTrips called for UID: ${currentUser.uid}.`);
      fetchUserTrips(currentUser.uid);
      // fetchUserTrips will set isLoadingUserTrips. 
      // The useEffect for selectedTripDetails will trigger if selectedTripId is set.
    }
  }, [currentUser?.uid, fetchUserTrips]);

  const refreshSelectedTripDetails = useCallback(() => {
    if (selectedTripId) {
        console.log(`[TripContext] refreshSelectedTripDetails explicitly called for tripId: ${selectedTripId}`);
        fetchSelectedTripDetails();
    }
  }, [selectedTripId, fetchSelectedTripDetails]);


  const value = {
    userTrips,
    isLoadingUserTrips,
    selectedTripId, 
    selectedTrip,
    setSelectedTripId,
    isLoadingSelectedTrip,
    refreshUserTrips,
    refreshSelectedTripDetails, 
    errorUserTrips,
    errorSelectedTrip,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
