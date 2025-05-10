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
  selectedTripId: string | null; // Added selectedTripId to context
  selectedTrip: Trip | null;
  setSelectedTripId: Dispatch<SetStateAction<string | null>>;
  isLoadingSelectedTrip: boolean;
  refreshUserTrips: () => void;
  errorUserTrips: string | null; // For errors fetching list of trips
  errorSelectedTrip: string | null; // For errors fetching specific trip details
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
  const [isLoadingUserTrips, setIsLoadingUserTrips] = useState(true); // Start true
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isLoadingSelectedTrip, setIsLoadingSelectedTrip] = useState(false);
  const [errorUserTrips, setErrorUserTrips] = useState<string | null>(null);
  const [errorSelectedTrip, setErrorSelectedTrip] = useState<string | null>(null);

  const currentUid = currentUser?.uid;

  // Effect for fetching user trips
  const fetchUserTrips = useCallback(async (uid: string) => {
    setIsLoadingUserTrips(true);
    setErrorUserTrips(null);
    try {
      const trips = await getUserTripsFromDb(uid);
      setUserTrips(trips || []); // Ensure it's an array
    } catch (error: any) {
      console.error("Failed to fetch user trips in context:", error);
      setUserTrips([]);
      setErrorUserTrips(error.message || "Failed to load trips.");
    } finally {
      setIsLoadingUserTrips(false);
    }
  }, []);

  useEffect(() => {
    if (currentUid) {
      fetchUserTrips(currentUid);
    } else {
      setUserTrips([]);
      setSelectedTripId(null); // Clear selected trip if user logs out
      setIsLoadingUserTrips(false); // Not loading if no user
      setErrorUserTrips(null);
    }
  }, [currentUid, fetchUserTrips]);

  // Effect for fetching selected trip details
  useEffect(() => {
    const fetchSelectedTripDetails = async () => {
      if (!selectedTripId) {
        setSelectedTrip(null);
        setErrorSelectedTrip(null);
        setIsLoadingSelectedTrip(false);
        return;
      }
      setIsLoadingSelectedTrip(true);
      setErrorSelectedTrip(null);
      try {
        const tripDetails = await getTripDetailsFromDb(selectedTripId);
        setSelectedTrip(tripDetails); // Can be null if not found or error
        if (!tripDetails) {
          // setErrorSelectedTrip("Selected trip not found or could not be loaded.");
          console.warn(`Trip details for ${selectedTripId} not found or failed to load.`);
        }
      } catch (error: any) {
        console.error("Failed to fetch selected trip details in context:", error);
        setSelectedTrip(null);
        setErrorSelectedTrip(error.message || "Failed to load trip details.");
      } finally {
        setIsLoadingSelectedTrip(false);
      }
    };

    fetchSelectedTripDetails();
  }, [selectedTripId]);

  const refreshUserTrips = useCallback(() => {
    if (currentUid) {
      fetchUserTrips(currentUid);
    }
  }, [currentUid, fetchUserTrips]);

  const value = {
    userTrips,
    isLoadingUserTrips,
    selectedTripId, // Expose selectedTripId
    selectedTrip,
    setSelectedTripId,
    isLoadingSelectedTrip,
    refreshUserTrips,
    errorUserTrips,
    errorSelectedTrip,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}