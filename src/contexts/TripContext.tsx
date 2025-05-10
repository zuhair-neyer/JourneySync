
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
  selectedTrip: Trip | null;
  setSelectedTripId: Dispatch<SetStateAction<string | null>>;
  isLoadingSelectedTrip: boolean;
  refreshUserTrips: () => void;
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
  const [isLoadingUserTrips, setIsLoadingUserTrips] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isLoadingSelectedTrip, setIsLoadingSelectedTrip] = useState(false);

  const fetchUserTrips = useCallback(async (user: FirebaseUser) => {
    setIsLoadingUserTrips(true);
    try {
      const trips = await getUserTripsFromDb(user.uid);
      setUserTrips(trips);
    } catch (error) {
      console.error("Failed to fetch user trips:", error);
      setUserTrips([]); // Set to empty array on error
    } finally {
      setIsLoadingUserTrips(false);
    }
  }, []);

  const refreshUserTrips = useCallback(() => {
    if (currentUser) {
      fetchUserTrips(currentUser);
    }
  }, [currentUser, fetchUserTrips]);

  useEffect(() => {
    if (currentUser) {
      fetchUserTrips(currentUser);
    } else {
      setUserTrips([]);
      setSelectedTripId(null);
    }
  }, [currentUser, fetchUserTrips]);

  useEffect(() => {
    const fetchSelectedTripDetails = async () => {
      if (!selectedTripId) {
        setSelectedTrip(null);
        return;
      }
      setIsLoadingSelectedTrip(true);
      try {
        const tripDetails = await getTripDetailsFromDb(selectedTripId);
        setSelectedTrip(tripDetails);
      } catch (error) {
        console.error("Failed to fetch selected trip details:", error);
        setSelectedTrip(null);
      } finally {
        setIsLoadingSelectedTrip(false);
      }
    };

    fetchSelectedTripDetails();
  }, [selectedTripId]);

  const value = {
    userTrips,
    isLoadingUserTrips,
    selectedTrip,
    setSelectedTripId,
    isLoadingSelectedTrip,
    refreshUserTrips,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
