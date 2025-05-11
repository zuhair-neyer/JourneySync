
'use server';
import { database } from '@/firebase/config';
import type { Trip, TripMember, UserTripInfo } from '@/types';
import { ref, push, set, get, child, update, serverTimestamp } from 'firebase/database';

// Define a simpler interface for user information passed to server actions
interface BasicUserInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export async function createTripInDb(tripName: string, userInfo: BasicUserInfo): Promise<string | null> {
  console.log("[tripService] Attempting to create trip. Name:", tripName, "User ID:", userInfo.uid, "Display Name:", userInfo.displayName);

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
      console.error("[tripService] CRITICAL: Failed to generate trip ID from Firebase push.");
      return null;
    }
    
    const memberName = userInfo.displayName || userInfo.email || userInfo.uid; // Prioritize displayName, then email, then UID

    const newTripData: Omit<Trip, 'id'> = {
      name: tripName,
      createdBy: userInfo.uid,
      createdAt: serverTimestamp() as any, // Firebase server timestamp
      members: {
        [userInfo.uid]: {
          uid: userInfo.uid,
          name: memberName, 
          email: userInfo.email,
          joinedAt: serverTimestamp() as any, // Firebase server timestamp
        },
      },
    };
    await set(newTripRef, newTripData);

    const userTripRef = ref(database, `users/${userInfo.uid}/trips/${tripId}`);
    const userTripInfoData: Omit<UserTripInfo, 'id'> = {
      name: tripName,
      role: 'creator',
    };
    await set(userTripRef, userTripInfoData);

    console.log("[tripService] createTripInDb SUCCEEDED for tripId:", tripId);
    return tripId;
  } catch (error: any) {
    console.error("[tripService] ERROR creating trip:", error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] PERMISSION DENIED. This is a critical error. Please check your Firebase Realtime Database rules for the '/trips' and '/users' paths. Ensure authenticated users have write permissions to 'trips/{newTripId}' and 'users/{userId}/trips/{newTripId}'.");
    }
    // Other potential errors could be network issues, data validation issues if rules are complex, or quota limits.
    return null;
  }
}

export async function joinTripInDb(tripId: string, userInfo: BasicUserInfo): Promise<boolean> {
  console.log("[tripService] Attempting to join trip. TripID:", tripId, "User ID:", userInfo.uid, "Display Name:", userInfo.displayName);

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

    if (tripData.members && tripData.members[userInfo.uid]) {
      console.log("[tripService] User is already a member of this trip:", tripId);
      // Ensure the user's local trip list is consistent
      const userTripRef = ref(database, `users/${userInfo.uid}/trips/${tripId}`);
      const userTripSnapshot = await get(userTripRef);
      if (!userTripSnapshot.exists() || userTripSnapshot.val().name !== tripData.name) {
         await set(userTripRef, { name: tripData.name, role: tripData.createdBy === userInfo.uid ? 'creator' : 'member' });
      }
      return true; 
    }
    
    const memberName = userInfo.displayName || userInfo.email || userInfo.uid; // Prioritize displayName, then email, then UID

    const memberData: TripMember = {
      uid: userInfo.uid,
      name: memberName,
      email: userInfo.email,
      joinedAt: serverTimestamp() as any, // Firebase server timestamp
    };

    if (!tripData.name) {
        console.error("[tripService] CRITICAL: Trip data for joining is missing a name. Trip ID:", tripId);
        return false; 
    }

    // Using 'update' for atomic multi-path updates
    const updates: { [key: string]: any } = {};
    updates[`/trips/${tripId}/members/${userInfo.uid}`] = memberData;
    updates[`/users/${userInfo.uid}/trips/${tripId}`] = {
      name: tripData.name, // Make sure to use the actual trip name
      role: 'member',
    };
    
    await update(ref(database), updates);
    console.log("[tripService] Successfully joined trip:", tripId);
    return true;
  } catch (error: any) {
    console.error("[tripService] ERROR joining trip:", error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
         console.error("[tripService] PERMISSION DENIED. Check Firebase Realtime Database rules. Ensure authenticated users can read 'trips/{tripId}' and write to 'trips/{tripId}/members/{userId}' and 'users/{userId}/trips/{tripId}'.");
    }
    return false;
  }
}

export async function getUserTripsFromDb(userId: string): Promise<UserTripInfo[]> {
  console.log("[tripService] Fetching user trips for userId:", userId);
  if (!userId) {
    console.warn("[tripService] getUserTripsFromDb called with no userId.");
    return [];
  }
  try {
    const userTripsRef = ref(database, `users/${userId}/trips`);
    const snapshot = await get(userTripsRef);
    if (snapshot.exists()) {
      const tripsData = snapshot.val();
      const userTripsArray: UserTripInfo[] = Object.keys(tripsData).map(tripId => ({
        id: tripId,
        name: tripsData[tripId].name,
        role: tripsData[tripId].role,
      }));
      console.log(`[tripService] Found ${userTripsArray.length} trips for user ${userId}.`);
      return userTripsArray;
    }
    console.log("[tripService] No trips found for userId:", userId);
    return [];
  } catch (error: any) {
    console.error("[tripService] Error fetching user trips for UserID:", userId, "Error:", error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] PERMISSION DENIED while fetching user trips. Check rules for reading '/users/" + userId + "/trips'.");
    }
    return [];
  }
}

export async function getTripDetailsFromDb(tripId: string): Promise<Trip | null> {
  console.log("[tripService] Fetching trip details for tripId:", tripId);
  if (!tripId) {
    console.warn("[tripService] getTripDetailsFromDb called with no tripId.");
    return null;
  }
  try {
    const tripRef = ref(database, `trips/${tripId}`);
    const snapshot = await get(tripRef);
    if (snapshot.exists()) {
      const tripDetails = { id: tripId, ...snapshot.val() } as Trip;
      console.log(`[tripService] Found trip details for tripId ${tripId}.`);
      return tripDetails;
    }
    console.log("[tripService] No trip details found for tripId:", tripId);
    return null;
  } catch (error: any) {
    console.error("[tripService] Error fetching trip details for TripID:", tripId, "Error:", error.message, "(Code:", error.code || 'N/A', ")");
     if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] PERMISSION DENIED while fetching trip details. Check rules for reading '/trips/" + tripId + "'.");
    }
    return null;
  }
}

