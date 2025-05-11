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

function generateMemberName(userInfo: BasicUserInfo): string {
  console.log("[tripService] generateMemberName: Input userInfo.displayName:", userInfo.displayName, "Input userInfo.email:", userInfo.email, "Input userInfo.uid:", userInfo.uid);
  
  const displayName = userInfo.displayName?.trim();
  
  if (displayName && displayName !== "" && displayName.toLowerCase() !== "anonymous user") {
    console.log("[tripService] generateMemberName: Using displayName:", displayName);
    return displayName;
  }

  if (userInfo.email) {
    const emailNamePart = userInfo.email.split('@')[0];
    if (emailNamePart && emailNamePart.trim() !== "") {
      console.log("[tripService] generateMemberName: Using email prefix:", emailNamePart);
      return emailNamePart;
    }
  }
  
  const fallbackName = `User...${userInfo.uid.substring(userInfo.uid.length - 4)}`;
  console.log("[tripService] generateMemberName: Using fallback (uid-based):", fallbackName);
  return fallbackName;
}

export async function createTripInDb(tripName: string, userInfo: BasicUserInfo): Promise<string | null> {
  console.log("[tripService] createTripInDb: Received userInfo:", JSON.stringify(userInfo));
  console.log("[tripService] createTripInDb: Attempting to create trip. Name:", tripName, "User ID:", userInfo.uid, "Display Name from userInfo for create:", userInfo.displayName);


  if (!tripName.trim()) {
    console.error("[tripService] createTripInDb: Trip name cannot be empty.");
    return null;
  }
  if (!userInfo || !userInfo.uid) {
    console.error("[tripService] createTripInDb: User info or UID is missing. userInfo received:", JSON.stringify(userInfo));
    return null;
  }

  const memberName = generateMemberName(userInfo);
  console.log("[tripService] createTripInDb: Generated memberName for trip creator:", memberName);

  if (!memberName || memberName.trim() === "") {
     console.error("[tripService] createTripInDb: CRITICAL: Generated member name is empty. This should not happen with the new generateMemberName logic.");
     return null;
  }


  try {
    const tripsRef = ref(database, 'trips');
    const newTripRef = push(tripsRef);
    const tripId = newTripRef.key;

    if (!tripId) {
      console.error("[tripService] createTripInDb: CRITICAL: Failed to generate trip ID from Firebase push.");
      return null;
    }
    
    const newTripData: Omit<Trip, 'id'> = {
      name: tripName,
      createdBy: userInfo.uid,
      createdAt: serverTimestamp() as any, 
      members: {
        [userInfo.uid]: {
          uid: userInfo.uid,
          name: memberName, 
          email: userInfo.email,
          joinedAt: serverTimestamp() as any, 
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

    console.log("[tripService] createTripInDb: SUCCEEDED for tripId:", tripId, "with memberName:", memberName);
    return tripId;
  } catch (error: any) {
    console.error("[tripService] createTripInDb: ERROR creating trip:", error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] createTripInDb: PERMISSION DENIED. Check Firebase Realtime Database rules for '/trips' and '/users'.");
    }
    return null;
  }
}

export async function joinTripInDb(tripId: string, userInfo: BasicUserInfo): Promise<boolean> {
  console.log("[tripService] joinTripInDb: Received userInfo:", JSON.stringify(userInfo));
  console.log("[tripService] joinTripInDb: Attempting to join trip. TripID:", tripId, "User ID:", userInfo.uid, "Display Name from userInfo for join:", userInfo.displayName);

  if (!tripId.trim()) {
    console.error("[tripService] joinTripInDb: Trip ID cannot be empty for joining.");
    return false;
  }
   if (!userInfo || !userInfo.uid) {
    console.error("[tripService] joinTripInDb: User info or UID is missing for joining trip. userInfo received:", JSON.stringify(userInfo));
    return false;
  }
  
  const memberName = generateMemberName(userInfo); 
  console.log("[tripService] joinTripInDb: Generated memberName for joining user:", memberName);

  if (!memberName || memberName.trim() === "") {
     console.error("[tripService] joinTripInDb: CRITICAL: Generated member name is empty for joining user. This should not happen.");
     return false;
  }

  try {
    const tripRef = ref(database, `trips/${tripId}`);
    const tripSnapshot = await get(tripRef);

    if (!tripSnapshot.exists()) {
      console.error("[tripService] joinTripInDb: Trip not found with ID:", tripId);
      return false;
    }

    const tripData = tripSnapshot.val() as Omit<Trip, 'id'> & { id?: string }; 

    if (tripData.members && tripData.members[userInfo.uid]) {
      console.log("[tripService] joinTripInDb: User is already a member of this trip:", tripId);
      const existingMemberData = tripData.members[userInfo.uid];
      const updatesForExistingMember: Partial<TripMember> = {};
      let consistencyUpdatesNeeded = false;
      
      const newNameIsBetter = memberName && !memberName.startsWith("User...");
      const currentNameIsFallback = existingMemberData.name?.startsWith("User...");

      if (existingMemberData.name !== memberName && (newNameIsBetter || currentNameIsFallback)) {
        updatesForExistingMember.name = memberName;
        consistencyUpdatesNeeded = true;
        console.log(`[tripService] joinTripInDb: Updating member name in trip ${tripId} from '${existingMemberData.name}' to '${memberName}'`);
      }
      
      if (consistencyUpdatesNeeded) {
        await update(ref(database, `/trips/${tripId}/members/${userInfo.uid}`), updatesForExistingMember);
      }
      
      const userTripRef = ref(database, `users/${userInfo.uid}/trips/${tripId}`);
      const userTripSnapshot = await get(userTripRef);
      const expectedNameInUserTrips = tripData.name;
      const expectedRole = tripData.createdBy === userInfo.uid ? 'creator' : 'member';

      if (!userTripSnapshot.exists() || 
          userTripSnapshot.val().name !== expectedNameInUserTrips || 
          userTripSnapshot.val().role !== expectedRole) {
         console.log("[tripService] joinTripInDb: Updating user's local trip entry for consistency for tripId:", tripId);
         await set(userTripRef, { name: expectedNameInUserTrips, role: expectedRole });
      }
      return true; 
    }
    
    const memberData: TripMember = {
      uid: userInfo.uid,
      name: memberName,
      email: userInfo.email,
      joinedAt: serverTimestamp() as any,
    };

    if (!tripData.name) {
        console.error("[tripService] joinTripInDb: CRITICAL: Trip data for joining is missing a name. Trip ID:", tripId);
        return false; 
    }

    const updates: { [key: string]: any } = {};
    updates[`/trips/${tripId}/members/${userInfo.uid}`] = memberData;
    updates[`/users/${userInfo.uid}/trips/${tripId}`] = {
      name: tripData.name, 
      role: 'member',
    };
    
    await update(ref(database), updates);
    console.log("[tripService] joinTripInDb: Successfully joined trip:", tripId, "as memberName:", memberName);
    return true;
  } catch (error: any) {
    console.error("[tripService] joinTripInDb: ERROR joining trip:", error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
         console.error("[tripService] joinTripInDb: PERMISSION DENIED. Check Firebase Realtime Database rules.");
    }
    return false;
  }
}

export async function getUserTripsFromDb(userId: string): Promise<UserTripInfo[]> {
  console.log("[tripService] getUserTripsFromDb: Fetching user trips for userId:", userId);
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
      console.log(`[tripService] getUserTripsFromDb: Found ${userTripsArray.length} trips for user ${userId}.`);
      return userTripsArray;
    }
    console.log("[tripService] getUserTripsFromDb: No trips found for userId:", userId);
    return [];
  } catch (error: any) {
    console.error("[tripService] getUserTripsFromDb: Error fetching user trips for UserID:", userId, "Error:", error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] getUserTripsFromDb: PERMISSION DENIED while fetching user trips. Check rules for reading '/users/" + userId + "/trips'.");
    }
    return [];
  }
}

export async function getTripDetailsFromDb(tripId: string): Promise<Trip | null> {
  console.log("[tripService] getTripDetailsFromDb: Fetching trip details for tripId:", tripId);
  if (!tripId) {
    console.warn("[tripService] getTripDetailsFromDb: called with no tripId.");
    return null;
  }
  try {
    const tripRef = ref(database, `trips/${tripId}`);
    const snapshot = await get(tripRef);
    if (snapshot.exists()) {
      const tripData = snapshot.val();
      const members = tripData.members || {};
      const processedMembers: { [uid: string]: TripMember } = {};

      for (const uid in members) {
        const member = members[uid];
        processedMembers[uid] = {
          ...member,
          // Ensure name is consistently generated if missing or was previously a fallback
          name: member.name && !member.name.startsWith("User...") ? member.name : generateMemberName({ uid, displayName: member.name, email: member.email }),
        };
      }
      
      const tripDetails = { 
        id: tripId, 
        ...tripData,
        members: processedMembers,
        // Ensure createdBy is present, potentially fetching creator details if needed, though usually it's just UID
        createdBy: tripData.createdBy,
      } as Trip;

      // Special handling if creator is not in members list (shouldn't happen with current logic but good safeguard)
      if (tripData.createdBy && !processedMembers[tripData.createdBy]) {
        const creatorSnapshot = await get(ref(database, `users/${tripData.createdBy}`));
        if (creatorSnapshot.exists()) {
           // This is a simplified user object, not a full FirebaseUser object.
           // We'd typically only store basic info or a reference.
           // For display, we might need to fetch their display name if it's stored differently.
           // For now, if not in members, we'll assume a fallback.
           // This part is tricky without knowing how user profiles are fully structured outside trips.
           // Let's assume generateMemberName can work with just UID if necessary.
           // However, the creator SHOULD be in the members list.
           console.warn(`[tripService] getTripDetailsFromDb: Creator ${tripData.createdBy} not found in members list for trip ${tripId}. This is unusual.`);
        }
      }


      console.log(`[tripService] getTripDetailsFromDb: Found trip details for tripId ${tripId}. Member count: ${Object.keys(tripDetails.members || {}).length}. Created by: ${tripDetails.createdBy}`);
      Object.values(tripDetails.members || {}).forEach(member => {
        console.log(`[tripService] getTripDetailsFromDb: Member UID: ${member.uid}, Name: ${member.name}, Email: ${member.email}`);
      });
      return tripDetails;
    }
    console.log("[tripService] getTripDetailsFromDb: No trip details found for tripId:", tripId);
    return null;
  } catch (error: any) {
    console.error("[tripService] getTripDetailsFromDb: Error fetching trip details for TripID:", tripId, "Error:", error.message, "(Code:", error.code || 'N/A', ")");
     if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] getTripDetailsFromDb: PERMISSION DENIED while fetching trip details. Check rules for reading '/trips/" + tripId + "'.");
    }
    return null;
  }
}


export async function updateUserDisplayNameInTrips(userId: string, newDisplayName: string): Promise<void> {
  console.log(`[tripService] updateUserDisplayNameInTrips: Updating display name to "${newDisplayName}" for user ID: ${userId}`);
  if (!userId || !newDisplayName || newDisplayName.trim() === "") {
    console.error("[tripService] updateUserDisplayNameInTrips: User ID or new display name is invalid.");
    return;
  }

  try {
    const userTripsSnapshot = await get(ref(database, `users/${userId}/trips`));
    if (!userTripsSnapshot.exists()) {
      console.log(`[tripService] updateUserDisplayNameInTrips: User ${userId} is not part of any trips. No updates needed.`);
      return;
    }

    const userTripsData = userTripsSnapshot.val();
    const tripIds = Object.keys(userTripsData);
    
    if (tripIds.length === 0) {
      console.log(`[tripService] updateUserDisplayNameInTrips: User ${userId} has no trip entries. No updates needed.`);
      return;
    }

    const updates: { [key: string]: any } = {};
    let updatesMade = false;

    for (const tripId of tripIds) {
      const memberNamePath = `/trips/${tripId}/members/${userId}/name`;
      const memberSnapshot = await get(ref(database, `/trips/${tripId}/members/${userId}`));
      
      if (memberSnapshot.exists()) {
        const currentMemberData = memberSnapshot.val() as TripMember;
        if (currentMemberData.name !== newDisplayName) {
             updates[memberNamePath] = newDisplayName;
             updatesMade = true;
             console.log(`[tripService] updateUserDisplayNameInTrips: Queued update for trip ${tripId}, user ${userId} to name "${newDisplayName}"`);
        } else {
             console.log(`[tripService] updateUserDisplayNameInTrips: Name in trip ${tripId} for user ${userId} is already "${newDisplayName}". Skipping.`);
        }
      } else {
        console.warn(`[tripService] updateUserDisplayNameInTrips: User ${userId} listed in users/${userId}/trips/${tripId} but not found in trips/${tripId}/members. Skipping name update for this trip.`);
      }
    }
    
    if (updatesMade) {
        await update(ref(database), updates);
        console.log(`[tripService] updateUserDisplayNameInTrips: Successfully updated display name for user ${userId} in relevant trips.`);
    } else {
        console.log(`[tripService] updateUserDisplayNameInTrips: No actual name changes required for user ${userId} in their trips.`);
    }

  } catch (error: any) {
    console.error(`[tripService] updateUserDisplayNameInTrips: Error updating display names for user ${userId}:`, error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] updateUserDisplayNameInTrips: PERMISSION DENIED. Check Firebase Realtime Database rules for writing to '/trips'.");
    }
  }
}

export async function updateTripNameInDb(tripId: string, newTripName: string, memberUids: string[]): Promise<boolean> {
  console.log(`[tripService] updateTripNameInDb: Updating trip ${tripId} to name "${newTripName}"`);
  if (!tripId || !newTripName.trim()) {
    console.error("[tripService] updateTripNameInDb: Trip ID or new trip name is invalid.");
    return false;
  }
  if (!memberUids || memberUids.length === 0) {
    console.warn(`[tripService] updateTripNameInDb: No member UIDs provided for trip ${tripId}. Only updating main trip name.`);
  }

  try {
    const updates: { [key: string]: any } = {};
    updates[`/trips/${tripId}/name`] = newTripName;

    // Update the name in each member's copy of the trip info under /users/{uid}/trips/{tripId}
    if (memberUids) {
      for (const uid of memberUids) {
        updates[`/users/${uid}/trips/${tripId}/name`] = newTripName;
      }
    }

    await update(ref(database), updates);
    console.log(`[tripService] updateTripNameInDb: Successfully updated trip ${tripId} name to "${newTripName}" in main trip object and for all members' lists.`);
    return true;
  } catch (error: any) {
    console.error(`[tripService] updateTripNameInDb: Error updating trip name for ${tripId}:`, error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] updateTripNameInDb: PERMISSION DENIED. Check Firebase Realtime Database rules for writing to '/trips' and '/users'.");
    }
    return false;
  }
}
