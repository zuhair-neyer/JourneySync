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
  console.log("[tripService] Attempting to create trip. Name:", tripName, "User:", JSON.stringify(userInfo));
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
    console.log("[tripService] New trip data to be set at /trips/", tripId, ":", JSON.stringify(newTripData, null, 2));
    await set(newTripRef, newTripData);
    console.log("[tripService] Successfully set trip data in /trips/", tripId);

    const userTripRef = ref(database, `users/${userInfo.uid}/trips/${tripId}`);
    const userTripInfoData: Omit<UserTripInfo, 'id'> = {
      name: tripName,
      role: 'creator',
    };
    console.log("[tripService] User trip info to be set at /users/", userInfo.uid, "/trips/", tripId, ":", JSON.stringify(userTripInfoData, null, 2));
    await set(userTripRef, userTripInfoData);
    console.log("[tripService] Successfully set user trip info in /users/", userInfo.uid, "/trips/", tripId);

    return tripId;
  } catch (error) {
    // IMPORTANT: Check your SERVER-SIDE console logs (where 'npm run dev' or 'genkit:dev' runs)
    // for the detailed Firebase error message when "Failed to create trip" appears in the UI.
    console.error("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    console.error("X  SERVER-SIDE ERROR: DETAILED FIREBASE ERROR WHILE CREATING TRIP                 X");
    console.error("X  Check your Firebase Realtime Database rules and the error details below.       X");
    console.error("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    console.error("Raw error object:", error); // Log the raw error object

    if (error instanceof Error) {
        console.error(`Error Name: ${error.name}`);
        console.error(`Error Message: ${error.message}`);
        if (error.stack) {
            console.error(`Error Stack: ${error.stack}`);
        }
        const firebaseErrorCode = (error as any).code;
        if (firebaseErrorCode) {
            console.error(`Firebase Error Code: ${firebaseErrorCode}`); // e.g., "PERMISSION_DENIED"
        }
    } else {
        console.error("Caught a non-Error object during trip creation:", String(error));
    }
    console.error("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    return null;
  }
}

export async function joinTripInDb(tripId: string, userInfo: BasicUserInfo): Promise<boolean> {
  console.log("[tripService] Attempting to join trip. TripID:", tripId, "User:", JSON.stringify(userInfo));
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

    const tripData = tripSnapshot.val() as Omit<Trip, 'id'> & { id?: string };
    console.log("[tripService] Found trip data for joining:", JSON.stringify(tripData, null, 2));

    if (tripData.members && tripData.members[userInfo.uid]) {
      console.log("[tripService] User is already a member of this trip:", tripId);
      return true; 
    }
    
    const memberData: TripMember = {
      uid: userInfo.uid,
      name: userInfo.displayName ?? "Anonymous",
      email: userInfo.email,
      joinedAt: Date.now(),
    };

    if (!tripData.name) {
        console.error("[tripService] Trip data fetched for joining is missing a name. Trip ID:", tripId);
        return false; 
    }

    const updates: { [key: string]: any } = {};
    updates[`/trips/${tripId}/members/${userInfo.uid}`] = memberData;
    updates[`/users/${userInfo.uid}/trips/${tripId}`] = {
      name: tripData.name,
      role: 'member',
    };
    
    console.log("[tripService] Updates to be performed for joining trip:", JSON.stringify(updates, null, 2));
    await update(ref(database), updates);
    console.log("[tripService] Successfully joined trip:", tripId);
    return true;
  } catch (error) {
    // IMPORTANT: Check your SERVER-SIDE console logs for the detailed Firebase error.
    console.error("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    console.error("X  SERVER-SIDE ERROR: DETAILED FIREBASE ERROR WHILE JOINING TRIP                  X");
    console.error("X  Check your Firebase Realtime Database rules and the error details below.       X");
    console.error("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    console.error("Raw error object (joining trip). TripID:", tripId, "Error:", error);

    if (error instanceof Error) {
        console.error(`Error Name: ${error.name}`);
        console.error(`Error Message: ${error.message}`);
        if (error.stack) {
            console.error(`Error Stack: ${error.stack}`);
        }
        const firebaseErrorCode = (error as any).code;
        if (firebaseErrorCode) {
            console.error(`Firebase Error Code: ${firebaseErrorCode}`);
        }
    } else {
        console.error("[tripService] Caught a non-Error object during trip joining:", String(error));
    }
    console.error("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
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
      console.log("[tripService] Found user trips:", JSON.stringify(userTripsArray.map(t => ({...t, name: t.name.substring(0,20) + '...'})))); // Truncate names for brevity
      return userTripsArray;
    }
    console.log("[tripService] No trips found for userId:", userId);
    return [];
  } catch (error) {
    console.error("[tripService] Error fetching user trips. UserID:", userId, "Raw error:", error);
    if (error instanceof Error) {
        console.error(`[tripService] Error Name: ${error.name}, Message: ${error.message}`);
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
      console.log("[tripService] Found trip details for tripId:", tripId); // Log less data here
      return tripDetails;
    }
    console.log("[tripService] No trip details found for tripId:", tripId);
    return null;
  } catch (error) {
    console.error("[tripService] Error fetching trip details. TripID:", tripId, "Raw error:", error);
     if (error instanceof Error) {
        console.error(`[tripService] Error Name: ${error.name}, Message: ${error.message}`);
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
