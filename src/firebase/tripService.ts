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
  console.log("==================================================================================");
  console.log("[tripService] ENTERING createTripInDb");
  console.log("[tripService] Attempting to create trip. Name:", tripName, "User ID:", userInfo.uid);
  console.log("==================================================================================");

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
    const newTripRef = push(tripsRef); // Generates a new unique key for the trip
    const tripId = newTripRef.key;

    if (!tripId) {
      console.error("[tripService] CRITICAL: Failed to generate trip ID from Firebase push. newTripRef.key is null.");
      // This should theoretically not happen with Firebase RTDB push()
      return null;
    }
    console.log("[tripService] Generated tripId:", tripId);
    
    const currentTime = Date.now(); // Using client-side timestamp for simplicity, serverTimestamp() for consistency

    const newTripData: Omit<Trip, 'id'> = {
      name: tripName,
      createdBy: userInfo.uid,
      createdAt: currentTime, // Consider serverTimestamp() if clock skew is a concern
      members: {
        [userInfo.uid]: {
          uid: userInfo.uid,
          name: userInfo.displayName ?? "Anonymous User", 
          email: userInfo.email,
          joinedAt: currentTime, // Consider serverTimestamp()
        },
      },
    };
    console.log("[tripService] New trip data to be set at /trips/", tripId, ":", JSON.stringify(newTripData, null, 2));
    await set(newTripRef, newTripData);
    console.log("[tripService] Successfully set trip data in /trips/", tripId);

    // Add trip to user's list of trips
    const userTripRef = ref(database, `users/${userInfo.uid}/trips/${tripId}`);
    const userTripInfoData: Omit<UserTripInfo, 'id'> = { // id is the tripId itself
      name: tripName,
      role: 'creator',
    };
    console.log("[tripService] User trip info to be set at /users/", userInfo.uid, "/trips/", tripId, ":", JSON.stringify(userTripInfoData, null, 2));
    await set(userTripRef, userTripInfoData);
    console.log("[tripService] Successfully set user trip info in /users/", userInfo.uid, "/trips/", tripId);

    console.log("[tripService] createTripInDb SUCCEEDED for tripId:", tripId);
    return tripId;
  } catch (error: any) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!           SERVER-SIDE ERROR WHILE CREATING TRIP                                !");
    const firebaseErrorCode = error.code;
    const firebaseErrorMessage = error.message;
    console.error(`[tripService] Error: ${firebaseErrorMessage} (Code: ${firebaseErrorCode || 'N/A'})`);
    
    if (firebaseErrorCode === 'PERMISSION_DENIED') {
        console.error("##################################################################################");
        console.error("#                                PERMISSION DENIED!                                #");
        console.error("# CHECK YOUR FIREBASE REALTIME DATABASE RULES.                                     #");
        console.error("# Ensure authenticated users have write access to relevant paths:                  #");
        console.error("#   - /trips/{newGeneratedTripId}                                                  #");
        console.error("#   - /users/" + userInfo.uid + "/trips/{newGeneratedTripId}                       #");
        console.error("# Example development rules: { \"rules\": { \".read\": \"auth != null\", \".write\": \"auth != null\" } } #");
        console.error("##################################################################################");
    } else {
        console.error("[tripService] An unexpected error occurred:", error);
    }
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    return null;
  }
}

export async function joinTripInDb(tripId: string, userInfo: BasicUserInfo): Promise<boolean> {
  console.log("==================================================================================");
  console.log("[tripService] ENTERING joinTripInDb");
  console.log("[tripService] Attempting to join trip. TripID:", tripId, "User ID:", userInfo.uid);
  console.log("==================================================================================");

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

    const tripData = tripSnapshot.val() as Omit<Trip, 'id'> & { id?: string }; // Omit<Trip, 'id'> because id is the key
    console.log("[tripService] Found trip data for joining:", JSON.stringify(tripData, null, 2));

    // Check if user is already a member
    if (tripData.members && tripData.members[userInfo.uid]) {
      console.log("[tripService] User is already a member of this trip:", tripId);
      // Optionally, refresh user's local trip list info if it might be outdated
      const userTripRef = ref(database, `users/${userInfo.uid}/trips/${tripId}`);
      const userTripSnapshot = await get(userTripRef);
      if (!userTripSnapshot.exists() || userTripSnapshot.val().name !== tripData.name) {
         await set(userTripRef, { name: tripData.name, role: tripData.createdBy === userInfo.uid ? 'creator' : 'member' });
         console.log("[tripService] Updated user's local trip info as it was missing or outdated.");
      }
      return true; 
    }
    
    const memberData: TripMember = {
      uid: userInfo.uid,
      name: userInfo.displayName ?? "Anonymous User",
      email: userInfo.email,
      joinedAt: Date.now(), // Consider serverTimestamp()
    };

    if (!tripData.name) {
        // This case should be rare if trips are created correctly
        console.error("[tripService] CRITICAL: Trip data fetched for joining is missing a name. Trip ID:", tripId);
        return false; 
    }

    // Multi-path update to add member to trip and trip to user's list
    const updates: { [key: string]: any } = {};
    updates[`/trips/${tripId}/members/${userInfo.uid}`] = memberData;
    updates[`/users/${userInfo.uid}/trips/${tripId}`] = {
      name: tripData.name, // Ensure name is from the authoritative tripData
      role: 'member', // User joining is a member
    };
    
    console.log("[tripService] Updates to be performed for joining trip:", JSON.stringify(updates, null, 2));
    await update(ref(database), updates); // Update at the root
    console.log("[tripService] Successfully joined trip:", tripId);
    return true;
  } catch (error: any) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!           SERVER-SIDE ERROR WHILE JOINING TRIP                                   !");
    const firebaseErrorCode = error.code;
    const firebaseErrorMessage = error.message;
    console.error(`[tripService] Error: ${firebaseErrorMessage} (Code: ${firebaseErrorCode || 'N/A'})`);
    if (firebaseErrorCode === 'PERMISSION_DENIED') {
         console.error("##################################################################################");
         console.error("#                                PERMISSION DENIED!                                #");
         console.error("# CHECK YOUR FIREBASE REALTIME DATABASE RULES.                                     #");
         console.error("# Ensure authenticated users have write access to relevant paths:                  #");
         console.error("#   - /trips/" + tripId + "/members/" + userInfo.uid + "                           #");
         console.error("#   - /users/" + userInfo.uid + "/trips/" + tripId + "                             #");
         console.error("##################################################################################");
    } else {
        console.error("[tripService] An unexpected error occurred during join:", error);
    }
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
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
      console.log(`[tripService] Found ${userTripsArray.length} trips for user ${userId}:`, userTripsArray);
      return userTripsArray;
    }
    console.log("[tripService] No trips found for userId:", userId);
    return [];
  } catch (error: any) {
    console.error("[tripService] Error fetching user trips. UserID:", userId);
    const firebaseErrorCode = error.code;
    const firebaseErrorMessage = error.message;
    console.error(`[tripService] Error: ${firebaseErrorMessage} (Code: ${firebaseErrorCode || 'N/A'})`);
    if (firebaseErrorCode === 'PERMISSION_DENIED') {
        console.error("[tripService] PERMISSION DENIED while fetching user trips. Check rules for /users/" + userId + "/trips");
    }
    return []; // Return empty array on error to prevent app crash
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
      // Ensure the id is part of the returned object
      const tripDetails = { id: tripId, ...snapshot.val() } as Trip;
      console.log(`[tripService] Found trip details for tripId ${tripId}. Name: ${tripDetails.name}`);
      return tripDetails;
    }
    console.log("[tripService] No trip details found for tripId:", tripId);
    return null;
  } catch (error: any) {
    console.error("[tripService] Error fetching trip details. TripID:", tripId);
    const firebaseErrorCode = error.code;
    const firebaseErrorMessage = error.message;
    console.error(`[tripService] Error: ${firebaseErrorMessage} (Code: ${firebaseErrorCode || 'N/A'})`);
     if (firebaseErrorCode === 'PERMISSION_DENIED') {
        console.error("[tripService] PERMISSION DENIED while fetching trip details. Check rules for /trips/" + tripId);
    }
    return null; // Return null on error
  }
}