'use server';
import { database } from '@/firebase/config';
import type { Trip, TripMember, UserTripInfo } from '@/types';
import { ref, push, set, get, child, update } from 'firebase/database';

// Define a simpler interface for user information passed to server actions
interface BasicUserInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export async function createTripInDb(tripName: string, userInfo: BasicUserInfo): Promise<string | null> {
  console.log("[tripService] Attempting to create trip. Name:", tripName, "User:", userInfo);
  if (!tripName.trim()) {
    console.error("[tripService] Trip name cannot be empty.");
    return null;
  }
  if (!userInfo || !userInfo.uid) {
    console.error("[tripService] User info or UID is missing.");
    return null;
  }

  try {
    const tripsRef = ref(database, 'trips');
    const newTripRef = push(tripsRef);
    const tripId = newTripRef.key;

    if (!tripId) {
      console.error("[tripService] Failed to generate trip ID from Firebase push. newTripRef.key is null.");
      return null;
    }
    console.log("[tripService] Generated tripId:", tripId);
    
    const currentTime = Date.now();

    const newTripData: Omit<Trip, 'id'> = {
      name: tripName,
      createdBy: userInfo.uid,
      createdAt: currentTime,
      members: {
        [userInfo.uid]: {
          uid: userInfo.uid,
          name: userInfo.displayName ?? "Anonymous", // Provide a default if null
          email: userInfo.email,
          joinedAt: currentTime,
        },
      },
    };
    console.log("[tripService] New trip data to be set:", JSON.stringify(newTripData, null, 2));
    await set(newTripRef, newTripData);
    console.log("[tripService] Successfully set trip data in /trips path.");

    const userTripRef = ref(database, `users/${userInfo.uid}/trips/${tripId}`);
    const userTripInfoData: Omit<UserTripInfo, 'id'> = {
      name: tripName,
      role: 'creator',
    };
    console.log("[tripService] User trip info to be set:", JSON.stringify(userTripInfoData, null, 2));
    await set(userTripRef, userTripInfoData);
    console.log("[tripService] Successfully set user trip info in /users path.");

    return tripId;
  } catch (error: any) {
    console.error("[tripService] Error creating trip:", error);
    if (error.code) {
      console.error("[tripService] Firebase error code:", error.code);
    }
    if (error.message) {
      console.error("[tripService] Firebase error message:", error.message);
    }
    // For more detailed stack trace or error object:
    // console.error("[tripService] Full Firebase error object:", JSON.stringify(error, null, 2));
    return null;
  }
}

export async function joinTripInDb(tripId: string, userInfo: BasicUserInfo): Promise<boolean> {
  console.log("[tripService] Attempting to join trip. TripID:", tripId, "User:", userInfo);
  if (!tripId.trim()) {
    console.error("[tripService] Trip ID cannot be empty for joining.");
    return false;
  }
   if (!userInfo || !userInfo.uid) {
    console.error("[tripService] User info or UID is missing for joining trip.");
    return false;
  }

  try {
    const tripRef = ref(database, `trips/${tripId}`);
    const tripSnapshot = await get(tripRef);

    if (!tripSnapshot.exists()) {
      console.error("[tripService] Trip not found with ID:", tripId);
      return false;
    }

    const tripData = tripSnapshot.val() as Omit<Trip, 'id'> & { id?: string }; // Ensure name exists
    console.log("[tripService] Found trip data:", JSON.stringify(tripData, null, 2));


    if (tripData.members && tripData.members[userInfo.uid]) {
      console.log("[tripService] User is already a member of this trip:", tripId);
      return true; 
    }
    
    const memberData: TripMember = {
      uid: userInfo.uid,
      name: userInfo.displayName ?? "Anonymous", // Provide a default
      email: userInfo.email,
      joinedAt: Date.now(),
    };

    const updates: { [key: string]: any } = {};
    updates[`/trips/${tripId}/members/${userInfo.uid}`] = memberData;
    
    if (!tripData.name) {
        console.error("[tripService] Trip data fetched for joining is missing a name. Trip ID:", tripId);
        // Fallback or error handling if tripData.name is unexpectedly missing
        // This shouldn't happen if trips are created correctly.
        return false; 
    }

    updates[`/users/${userInfo.uid}/trips/${tripId}`] = {
      name: tripData.name, // tripData.name should exist if the trip was created properly
      role: 'member',
    };
    
    console.log("[tripService] Updates to be performed for joining trip:", JSON.stringify(updates, null, 2));
    await update(ref(database), updates);
    console.log("[tripService] Successfully joined trip:", tripId);
    return true;
  } catch (error: any) {
    console.error("[tripService] Error joining trip:", error);
     if (error.code) {
      console.error("[tripService] Firebase error code:", error.code);
    }
    if (error.message) {
      console.error("[tripService] Firebase error message:", error.message);
    }
    // console.error("[tripService] Full Firebase error object:", JSON.stringify(error, null, 2));
    return false;
  }
}

export async function getUserTripsFromDb(userId: string): Promise<UserTripInfo[]> {
  console.log("[tripService] Fetching user trips for userId:", userId);
  try {
    const userTripsRef = ref(database, `users/${userId}/trips`);
    const snapshot = await get(userTripsRef);
    if (snapshot.exists()) {
      const tripsData = snapshot.val();
      const userTripsArray = Object.keys(tripsData).map(tripId => ({
        id: tripId,
        ...tripsData[tripId],
      }));
      console.log("[tripService] Found user trips:", JSON.stringify(userTripsArray, null, 2));
      return userTripsArray;
    }
    console.log("[tripService] No trips found for userId:", userId);
    return [];
  } catch (error: any) {
    console.error("[tripService] Error fetching user trips for userId:", userId, error);
    if (error.code) console.error("[tripService] Firebase error code:", error.code);
    if (error.message) console.error("[tripService] Firebase error message:", error.message);
    return [];
  }
}

export async function getTripDetailsFromDb(tripId: string): Promise<Trip | null> {
  console.log("[tripService] Fetching trip details for tripId:", tripId);
  try {
    const tripRef = ref(database, `trips/${tripId}`);
    const snapshot = await get(tripRef);
    if (snapshot.exists()) {
      const tripDetails = { id: tripId, ...snapshot.val() } as Trip;
      console.log("[tripService] Found trip details:", JSON.stringify(tripDetails, null, 2));
      return tripDetails;
    }
    console.log("[tripService] No trip details found for tripId:", tripId);
    return null;
  } catch (error: any) {
    console.error("[tripService] Error fetching trip details for tripId:", tripId, error);
    if (error.code) console.error("[tripService] Firebase error code:", error.code);
    if (error.message) console.error("[tripService] Firebase error message:", error.message);
    return null;
  }
}
