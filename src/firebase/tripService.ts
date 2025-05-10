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
          name: userInfo.displayName ?? "Anonymous", 
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
  } catch (error) {
    // IMPORTANT: Check your SERVER-SIDE console logs for the detailed Firebase error message below.
    // This will provide the specific reason for the failure (e.g., permission denied due to Firebase rules).
    console.error("----------------------------------------------------------------------------------");
    console.error("[tripService] ERROR CREATING TRIP. Detailed Firebase error object logged below:");
    console.error("----------------------------------------------------------------------------------");
    console.error(error); 

    if (error instanceof Error) {
        console.error(`[tripService] Error Name: ${error.name}`);
        console.error(`[tripService] Error Message: ${error.message}`);
        if (error.stack) {
            console.error(`[tripService] Error Stack: ${error.stack}`);
        }
        // Attempt to access Firebase specific error code if available
        const firebaseErrorCode = (error as any).code;
        if (firebaseErrorCode) {
            console.error(`[tripService] Firebase Error Code: ${firebaseErrorCode}`);
        }
    } else {
        // Handle cases where the caught object is not an Error instance
        console.error("[tripService] Caught a non-Error object during trip creation:", String(error));
    }
    console.error("----------------------------------------------------------------------------------");
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

    const tripData = tripSnapshot.val() as Omit<Trip, 'id'> & { id?: string }; // Cast to include optional id
    console.log("[tripService] Found trip data:", JSON.stringify(tripData, null, 2));


    // Check if user is already a member
    if (tripData.members && tripData.members[userInfo.uid]) {
      console.log("[tripService] User is already a member of this trip:", tripId);
      return true; // User is already a member, no action needed, consider this a success
    }
    
    const memberData: TripMember = {
      uid: userInfo.uid,
      name: userInfo.displayName ?? "Anonymous", // Use nullish coalescing for display name
      email: userInfo.email,
      joinedAt: Date.now(),
    };

    const updates: { [key: string]: any } = {};
    updates[`/trips/${tripId}/members/${userInfo.uid}`] = memberData;
    
    // Ensure tripData.name exists before trying to use it
    if (!tripData.name) {
        console.error("[tripService] Trip data fetched for joining is missing a name. Trip ID:", tripId);
        // Potentially handle this error differently, e.g., use a default name or fail
        return false; 
    }

    updates[`/users/${userInfo.uid}/trips/${tripId}`] = {
      name: tripData.name, // Use the fetched trip name
      role: 'member',
    };
    
    console.log("[tripService] Updates to be performed for joining trip:", JSON.stringify(updates, null, 2));
    await update(ref(database), updates);
    console.log("[tripService] Successfully joined trip:", tripId);
    return true;
  } catch (error) {
    // IMPORTANT: Check your SERVER-SIDE console logs for the detailed Firebase error message below.
    console.error("---------------------------------------------------------------------------------");
    console.error("[tripService] ERROR JOINING TRIP. Detailed Firebase error object logged below. TripID:", tripId);
    console.error("---------------------------------------------------------------------------------");
    console.error(error);

    if (error instanceof Error) {
        console.error(`[tripService] Error Name: ${error.name}`);
        console.error(`[tripService] Error Message: ${error.message}`);
        if (error.stack) {
            console.error(`[tripService] Error Stack: ${error.stack}`);
        }
        const firebaseErrorCode = (error as any).code;
        if (firebaseErrorCode) {
            console.error(`[tripService] Firebase Error Code: ${firebaseErrorCode}`);
        }
    } else {
        console.error("[tripService] Caught a non-Error object during trip joining:", String(error));
    }
    console.error("---------------------------------------------------------------------------------");
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
  } catch (error) {
    console.error("[tripService] Error fetching user trips. Raw error object logged below. UserID:", userId);
    console.error(error);
    if (error instanceof Error) {
        console.error(`[tripService] Error Name: ${error.name}`);
        console.error(`[tripService] Error Message: ${error.message}`);
        const firebaseErrorCode = (error as any).code;
        if (firebaseErrorCode) {
            console.error(`[tripService] Firebase Error Code: ${firebaseErrorCode}`);
        }
    } else {
        console.error("[tripService] Caught a non-Error object while fetching user trips:", String(error));
    }
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
  } catch (error) {
    console.error("[tripService] Error fetching trip details. Raw error object logged below. TripID:", tripId);
    console.error(error);
     if (error instanceof Error) {
        console.error(`[tripService] Error Name: ${error.name}`);
        console.error(`[tripService] Error Message: ${error.message}`);
        const firebaseErrorCode = (error as any).code;
        if (firebaseErrorCode) {
            console.error(`[tripService] Firebase Error Code: ${firebaseErrorCode}`);
        }
    } else {
        console.error("[tripService] Caught a non-Error object while fetching trip details:", String(error));
    }
    return null;
  }
}

