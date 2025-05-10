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

  const currentUid = currentUser?.uid;

  // Effect for fetching user trips
  useEffect(() => {
    if (currentUid) {
      const loadUserTrips = async () => {
        setIsLoadingUserTrips(true);
        try {
          const trips = await getUserTripsFromDb(currentUid);
          setUserTrips(trips);
        } catch (error) {
          console.error("Failed to fetch user trips:", error);
          setUserTrips([]);
        } finally {
          setIsLoadingUserTrips(false);
        }
      };
      loadUserTrips();
    } else {
      setUserTrips([]);
      setSelectedTripId(null); // Clear selected trip if user logs out
    }
  }, [currentUid]); // Depend only on currentUid

  // Effect for fetching selected trip details
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

  const refreshUserTrips = useCallback(() => {
    if (currentUid) {
      const doRefresh = async () => {
        setIsLoadingUserTrips(true);
        try {
          const trips = await getUserTripsFromDb(currentUid);
          setUserTrips(trips);
        } catch (error) {
          console.error("Failed to fetch user trips on refresh:", error);
          // Optionally keep existing trips on refresh error, or clear:
          // setUserTrips([]); 
        } finally {
          setIsLoadingUserTrips(false);
        }
      };
      doRefresh();
    }
  }, [currentUid]);

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
