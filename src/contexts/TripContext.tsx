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

  const currentUid = currentUser?.uid;

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
    if (currentUid) {
      console.log(`[TripContext] currentUser changed or component mounted. UID: ${currentUid}. Fetching user trips.`);
      fetchUserTrips(currentUid);
    } else {
      console.log("[TripContext] No currentUser. Clearing user trips and selected trip.");
      setUserTrips([]);
      setSelectedTripId(null); 
      setSelectedTrip(null);
      setIsLoadingUserTrips(false); 
      setErrorUserTrips(null);
      setErrorSelectedTrip(null);
    }
  }, [currentUid, fetchUserTrips]);


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
    fetchSelectedTripDetails();
  }, [fetchSelectedTripDetails]); // fetchSelectedTripDetails is now memoized with selectedTripId as dependency

  const refreshUserTrips = useCallback(() => {
    if (currentUid) {
      console.log(`[TripContext] refreshUserTrips called for UID: ${currentUid}.`);
      fetchUserTrips(currentUid);
      // Optionally, if a trip is selected, refresh its details too,
      // as its member list or name might have changed by another user.
      if (selectedTripId) {
        console.log(`[TripContext] refreshUserTrips: Also refreshing selected trip details for tripId: ${selectedTripId}`);
        fetchSelectedTripDetails();
      }
    }
  }, [currentUid, fetchUserTrips, selectedTripId, fetchSelectedTripDetails]);

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
    refreshSelectedTripDetails, // Add new function to context value
    errorUserTrips,
    errorSelectedTrip,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
