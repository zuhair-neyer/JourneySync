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
    const newTripRef = push(tripsRef);
    const tripId = newTripRef.key;

    if (!tripId) {
      console.error("[tripService] CRITICAL: Failed to generate trip ID from Firebase push. newTripRef.key is null. This is unexpected with a healthy Firebase setup.");
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
          email: userInfo.email, // Storing email, can be null
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

    console.log("[tripService] createTripInDb SUCCEEDED for tripId:", tripId);
    return tripId;
  } catch (error) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!           SERVER-SIDE ERROR: DETAILED FIREBASE ERROR WHILE CREATING TRIP         !");
    console.error("!           Check your Firebase Realtime Database rules and the error details below. !");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("Raw error object:", error); 

    if (error instanceof Error) {
        console.error(`Error Name: ${error.name}`);
        console.error(`Error Message: ${error.message}`);
        if (error.stack) {
            console.error(`Error Stack: ${error.stack}`);
        }
        const firebaseErrorCode = (error as any).code; 
        if (firebaseErrorCode) {
            console.error(`Firebase Error Code: ${firebaseErrorCode}`);
            if (firebaseErrorCode === 'PERMISSION_DENIED') {
                console.error("##################################################################################");
                console.error("#                                PERMISSION DENIED!                                #");
                console.error("# This is THE MOST COMMON REASON for 'Failed to create trip'.                      #");
                console.error("# PLEASE CHECK YOUR FIREBASE REALTIME DATABASE RULES.                              #");
                console.error("# Go to Firebase Console -> Build -> Realtime Database -> Rules tab.               #");
                console.error("#                                                                                #");
                console.error("# Ensure authenticated users have write access to these paths:                     #");
                console.error("#   - /trips/{newTripId}                                                           #");
                console.error("#   - /users/" + userInfo.uid + "/trips/{newTripId}                               #");
                console.error("#                                                                                #");
                console.error("# For DEVELOPMENT, these rules allow any AUTHENTICATED user to read/write:         #");
                console.error(`# { "rules": { ".read": "auth != null", ".write": "auth != null" } }               #`);
                console.error("# (Copy and paste the line above into your Firebase rules editor if unsure)        #");
                console.error("#                                                                                #");
                console.error("# If you have more specific rules, ensure they cover these paths for the user.     #");
                console.error("##################################################################################");
            }
        }
    } else {
        console.error("Caught a non-Error object during trip creation:", String(error));
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
        console.error("[tripService] CRITICAL: Trip data fetched for joining is missing a name. Trip ID:", tripId, "Data:", JSON.stringify(tripData));
        return false; 
    }

    const updates: { [key: string]: any } = {};
    updates[`/trips/${tripId}/members/${userInfo.uid}`] = memberData;
    updates[`/users/${userInfo.uid}/trips/${tripId}`] = {
      name: tripData.name, // Ensured tripData.name exists by check above
      role: 'member',
    };
    
    console.log("[tripService] Updates to be performed for joining trip:", JSON.stringify(updates, null, 2));
    await update(ref(database), updates);
    console.log("[tripService] Successfully joined trip:", tripId);
    return true;
  } catch (error) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!           SERVER-SIDE ERROR: DETAILED FIREBASE ERROR WHILE JOINING TRIP          !");
    console.error("!           Check your Firebase Realtime Database rules and the error details below. !");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
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
             if (firebaseErrorCode === 'PERMISSION_DENIED') {
                console.error("##################################################################################");
                console.error("#                                PERMISSION DENIED!                                #");
                console.error("# This is THE MOST COMMON REASON for 'Failed to join trip'.                        #");
                console.error("# PLEASE CHECK YOUR FIREBASE REALTIME DATABASE RULES.                              #");
                console.error("# Go to Firebase Console -> Build -> Realtime Database -> Rules tab.               #");
                console.error("#                                                                                #");
                console.error("# Ensure authenticated users have write access to these paths:                     #");
                console.error("#   - /trips/" + tripId + "/members/" + userInfo.uid + "                           #");
                console.error("#   - /users/" + userInfo.uid + "/trips/" + tripId + "                             #");
                console.error("#                                                                                #");
                console.error("# For DEVELOPMENT, these rules allow any AUTHENTICATED user to read/write:         #");
                console.error(`# { "rules": { ".read": "auth != null", ".write": "auth != null" } }               #`);
                console.error("#                                                                                #");
                console.error("# If you have more specific rules, ensure they cover these paths for the user.     #");
                console.error("##################################################################################");
            }
        }
    } else {
        console.error("[tripService] Caught a non-Error object during trip joining:", String(error));
    }
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
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
      // console.log("[tripService] Found user trips:", JSON.stringify(userTripsArray.map(t => ({...t, name: t.name.substring(0,20) + '...'})))); // Truncate names for brevity
      console.log(`[tripService] Found ${userTripsArray.length} trips for user ${userId}`);
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
      // console.log("[tripService] Found trip details for tripId:", tripId, JSON.stringify(tripDetails, null, 2)); // Log full details if needed for debugging
      console.log(`[tripService] Found trip details for tripId ${tripId}. Name: ${tripDetails.name}`);
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
