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
  if (userInfo.displayName && userInfo.displayName.trim() !== "") {
    const nameToUse = userInfo.displayName.trim();
    console.log("[tripService] generateMemberName: Using displayName:", nameToUse);
    return nameToUse;
  }
  if (userInfo.email) {
    const emailNamePart = userInfo.email.split('@')[0];
    if (emailNamePart && emailNamePart.trim() !== "") {
      console.log("[tripService] generateMemberName: Using email prefix:", emailNamePart);
      return emailNamePart;
    }
  }
  const fallbackName = `User...${userInfo.uid.substring(userInfo.uid.length - 4)}`;
  console.log("[tripService] generateMemberName: Using fallback:", fallbackName);
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
   if (!userInfo.displayName || userInfo.displayName.trim() === "") {
    console.warn("[tripService] createTripInDb: userInfo.displayName is missing or empty. Member name will be generated based on fallback logic.");
  }

  try {
    const tripsRef = ref(database, 'trips');
    const newTripRef = push(tripsRef);
    const tripId = newTripRef.key;

    if (!tripId) {
      console.error("[tripService] createTripInDb: CRITICAL: Failed to generate trip ID from Firebase push.");
      return null;
    }
    
    const memberName = generateMemberName(userInfo);
    console.log("[tripService] createTripInDb: Generated memberName for trip creator:", memberName, "from userInfo.displayName:", userInfo.displayName, "and email:", userInfo.email);


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

    console.log("[tripService] createTripInDb: SUCCEEDED for tripId:", tripId);
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
  if (!userInfo.displayName || userInfo.displayName.trim() === "") {
    console.warn("[tripService] joinTripInDb: userInfo.displayName is missing or empty. Member name will be generated based on fallback logic.");
  }

  try {
    const tripRef = ref(database, `trips/${tripId}`);
    const tripSnapshot = await get(tripRef);

    if (!tripSnapshot.exists()) {
      console.error("[tripService] joinTripInDb: Trip not found with ID:", tripId);
      return false;
    }

    const tripData = tripSnapshot.val() as Omit<Trip, 'id'> & { id?: string }; 

    const memberName = generateMemberName(userInfo); 
    console.log("[tripService] joinTripInDb: Generated memberName for joining user:", memberName, "from userInfo.displayName:", userInfo.displayName, "and email:", userInfo.email);

    if (tripData.members && tripData.members[userInfo.uid]) {
      console.log("[tripService] joinTripInDb: User is already a member of this trip:", tripId);
      const existingMemberData = tripData.members[userInfo.uid];
      const updatesForExistingMember: Partial<TripMember> = {};
      let consistencyUpdatesNeeded = false;

      if (existingMemberData.name !== memberName) {
        updatesForExistingMember.name = memberName;
        consistencyUpdatesNeeded = true;
        console.log(`[tripService] joinTripInDb: Updating member name in trip ${tripId} from '${existingMemberData.name}' to '${memberName}'`);
      }
      // Could add email update check here too if necessary

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
    console.log("[tripService] joinTripInDb: Successfully joined trip:", tripId);
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
      const tripDetails = { id: tripId, ...snapshot.val() } as Trip;
      console.log(`[tripService] getTripDetailsFromDb: Found trip details for tripId ${tripId}. Member count: ${Object.keys(tripDetails.members || {}).length}`);
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
