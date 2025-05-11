
'use server';
import { database } from '@/firebase/config';
import type { Trip, TripMember, UserTripInfo, Expense, Poll, PollOption } from '@/types';
import { ref, push, set, get, child, update, serverTimestamp, remove } from 'firebase/database';

// Define a simpler interface for user information passed to server actions
interface BasicUserInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
}

function generateMemberName(userInfo: BasicUserInfo): string {
  const displayName = userInfo.displayName?.trim();
  
  if (displayName && displayName !== "" && displayName.toLowerCase() !== "anonymous user") {
    return displayName;
  }

  if (userInfo.email) {
    const emailNamePart = userInfo.email.split('@')[0];
    if (emailNamePart && emailNamePart.trim() !== "") {
      return emailNamePart;
    }
  }
  
  const fallbackName = `User...${userInfo.uid.substring(userInfo.uid.length - 4)}`;
  return fallbackName;
}

export async function createTripInDb(tripName: string, userInfo: BasicUserInfo): Promise<string | null> {
  if (!tripName.trim()) {
    console.error("[tripService] createTripInDb: Trip name cannot be empty.");
    return null;
  }
  if (!userInfo || !userInfo.uid) {
    console.error("[tripService] createTripInDb: User info or UID is missing. userInfo received:", JSON.stringify(userInfo));
    return null;
  }

  const memberName = generateMemberName(userInfo);

  if (!memberName || memberName.trim() === "") {
     console.error("[tripService] createTripInDb: CRITICAL: Generated member name is empty.");
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
      expenses: {},
      polls: {}, // Initialize polls
    };
    await set(newTripRef, newTripData);

    const userTripRef = ref(database, `users/${userInfo.uid}/trips/${tripId}`);
    const userTripInfoData: Omit<UserTripInfo, 'id'> = {
      name: tripName,
      role: 'creator',
    };
    await set(userTripRef, userTripInfoData);
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
  if (!tripId.trim()) {
    console.error("[tripService] joinTripInDb: Trip ID cannot be empty for joining.");
    return false;
  }
   if (!userInfo || !userInfo.uid) {
    console.error("[tripService] joinTripInDb: User info or UID is missing for joining trip. userInfo received:", JSON.stringify(userInfo));
    return false;
  }
  
  const memberName = generateMemberName(userInfo); 

  if (!memberName || memberName.trim() === "") {
     console.error("[tripService] joinTripInDb: CRITICAL: Generated member name is empty for joining user.");
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
      const existingMemberData = tripData.members[userInfo.uid];
      const updatesForExistingMember: Partial<TripMember> = {};
      let consistencyUpdatesNeeded = false;
      
      const newNameIsBetter = memberName && !memberName.startsWith("User...");
      const currentNameIsFallback = existingMemberData.name?.startsWith("User...");

      if (existingMemberData.name !== memberName && (newNameIsBetter || currentNameIsFallback)) {
        updatesForExistingMember.name = memberName;
        consistencyUpdatesNeeded = true;
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
  if (!userId) {
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
      return userTripsArray;
    }
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
  if (!tripId) {
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
          name: member.name && !member.name.startsWith("User...") ? member.name : generateMemberName({ uid, displayName: member.name, email: member.email }),
        };
      }
      
      const tripDetails = { 
        id: tripId, 
        ...tripData,
        members: processedMembers,
        createdBy: tripData.createdBy,
        expenses: tripData.expenses || {}, 
        polls: tripData.polls || {},
      } as Trip;

      if (tripData.createdBy && !processedMembers[tripData.createdBy]) {
         console.warn(`[tripService] getTripDetailsFromDb: Creator ${tripData.createdBy} not found in members list for trip ${tripId}. This is unusual.`);
      }
      return tripDetails;
    }
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
  if (!userId || !newDisplayName || newDisplayName.trim() === "") {
    console.error("[tripService] updateUserDisplayNameInTrips: User ID or new display name is invalid.");
    return;
  }

  try {
    const userTripsSnapshot = await get(ref(database, `users/${userId}/trips`));
    if (!userTripsSnapshot.exists()) {
      return;
    }

    const userTripsData = userTripsSnapshot.val();
    const tripIds = Object.keys(userTripsData);
    
    if (tripIds.length === 0) {
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
        }
      } else {
        console.warn(`[tripService] updateUserDisplayNameInTrips: User ${userId} listed in users/${userId}/trips/${tripId} but not found in trips/${tripId}/members. Skipping name update for this trip.`);
      }
    }
    
    if (updatesMade) {
        await update(ref(database), updates);
    }

  } catch (error: any) {
    console.error(`[tripService] updateUserDisplayNameInTrips: Error updating display names for user ${userId}:`, error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] updateUserDisplayNameInTrips: PERMISSION DENIED. Check Firebase Realtime Database rules for writing to '/trips'.");
    }
  }
}

export async function updateTripNameInDb(tripId: string, newTripName: string, memberUids: string[]): Promise<boolean> {
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

    if (memberUids) {
      for (const uid of memberUids) {
        updates[`/users/${uid}/trips/${tripId}/name`] = newTripName;
      }
    }

    await update(ref(database), updates);
    return true;
  } catch (error: any) {
    console.error(`[tripService] updateTripNameInDb: Error updating trip name for ${tripId}:`, error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] updateTripNameInDb: PERMISSION DENIED. Check Firebase Realtime Database rules for writing to '/trips' and '/users'.");
    }
    return false;
  }
}


// Expense related functions
export async function addExpenseToDb(tripId: string, expenseData: Omit<Expense, 'id' | 'tripId'>): Promise<string | null> {
  if (!tripId) {
    console.error("[tripService] addExpenseToDb: Trip ID is required.");
    return null;
  }
  try {
    const expensesRef = ref(database, `trips/${tripId}/expenses`);
    const newExpenseRef = push(expensesRef);
    const expenseId = newExpenseRef.key;

    if (!expenseId) {
      console.error("[tripService] addExpenseToDb: Failed to generate expense ID.");
      return null;
    }
    const expenseToAdd: Omit<Expense, 'tripId'> = { ...expenseData, id: expenseId };
    await set(newExpenseRef, expenseToAdd);
    return expenseId;
  } catch (error: any) {
    console.error(`[tripService] addExpenseToDb: Error adding expense to trip ${tripId}:`, error.message);
    return null;
  }
}

export async function getExpensesForTripFromDb(tripId: string): Promise<Expense[]> {
  if (!tripId) {
    return [];
  }
  try {
    const expensesRef = ref(database, `trips/${tripId}/expenses`);
    const snapshot = await get(expensesRef);
    if (snapshot.exists()) {
      const expensesData = snapshot.val();
      const expensesArray: Expense[] = Object.keys(expensesData).map(expenseId => ({
        ...expensesData[expenseId],
        id: expenseId,
        tripId: tripId, 
      }));
      return expensesArray;
    }
    return [];
  } catch (error: any) {
    console.error(`[tripService] getExpensesForTripFromDb: Error fetching expenses for trip ${tripId}:`, error.message);
    return [];
  }
}

export async function updateExpenseInDb(tripId: string, expenseId: string, expenseData: Partial<Omit<Expense, 'id' | 'tripId'>>): Promise<boolean> {
  if (!tripId || !expenseId) {
    console.error("[tripService] updateExpenseInDb: Trip ID and Expense ID are required.");
    return false;
  }
  try {
    const expenseRef = ref(database, `trips/${tripId}/expenses/${expenseId}`);
    await update(expenseRef, expenseData);
    return true;
  } catch (error: any) {
    console.error(`[tripService] updateExpenseInDb: Error updating expense ${expenseId} in trip ${tripId}:`, error.message);
    return false;
  }
}

export async function deleteExpenseFromDb(tripId: string, expenseId: string): Promise<boolean> {
  if (!tripId || !expenseId) {
    console.error("[tripService] deleteExpenseFromDb: Trip ID and Expense ID are required.");
    return false;
  }
  try {
    const expenseRef = ref(database, `trips/${tripId}/expenses/${expenseId}`);
    await remove(expenseRef);
    return true;
  } catch (error: any) {
    console.error(`[tripService] deleteExpenseFromDb: Error deleting expense ${expenseId} from trip ${tripId}:`, error.message);
    return false;
  }
}

// Poll related functions
export async function addPollToTripDb(tripId: string, pollData: Omit<Poll, 'id' | 'tripId'>): Promise<string | null> {
  if (!tripId) {
    console.error("[tripService] addPollToTripDb: Trip ID is required.");
    return null;
  }
  try {
    const pollsRef = ref(database, `trips/${tripId}/polls`);
    const newPollRef = push(pollsRef);
    const pollId = newPollRef.key;

    if (!pollId) {
      console.error("[tripService] addPollToTripDb: Failed to generate poll ID.");
      return null;
    }
    const pollToAdd: Omit<Poll, 'tripId'> = { ...pollData, id: pollId };
    await set(newPollRef, pollToAdd);
    return pollId;
  } catch (error: any) {
    console.error(`[tripService] addPollToTripDb: Error adding poll to trip ${tripId}:`, error.message);
    return null;
  }
}

export async function getPollsForTripFromDb(tripId: string): Promise<Poll[]> {
  if (!tripId) {
    return [];
  }
  try {
    const pollsRef = ref(database, `trips/${tripId}/polls`);
    const snapshot = await get(pollsRef);
    if (snapshot.exists()) {
      const pollsData = snapshot.val();
      const pollsArray: Poll[] = Object.keys(pollsData).map(pollId => ({
        ...pollsData[pollId],
        id: pollId,
        tripId: tripId,
      }));
      return pollsArray;
    }
    return [];
  } catch (error: any) {
    console.error(`[tripService] getPollsForTripFromDb: Error fetching polls for trip ${tripId}:`, error.message);
    return [];
  }
}

export async function updatePollInTripDb(tripId: string, pollId: string, pollData: Partial<Omit<Poll, 'id' | 'tripId'>>): Promise<boolean> {
  if (!tripId || !pollId) {
    console.error("[tripService] updatePollInTripDb: Trip ID and Poll ID are required.");
    return false;
  }
  try {
    // Ensure options are handled correctly: Firebase might not like undefined values in arrays.
    // If `pollData.options` is provided, we assume it's the complete new array of options.
    const updates: { [key: string]: any } = {};
    if (pollData.question !== undefined) updates[`trips/${tripId}/polls/${pollId}/question`] = pollData.question;
    if (pollData.options !== undefined) updates[`trips/${tripId}/polls/${pollId}/options`] = pollData.options;
    // Do not update createdBy or createdAt
    
    if (Object.keys(updates).length === 0) {
        console.warn("[tripService] updatePollInTripDb: No valid fields to update provided.");
        return true; // No changes needed, considered a success.
    }

    await update(ref(database), updates);
    return true;
  } catch (error: any) {
    console.error(`[tripService] updatePollInTripDb: Error updating poll ${pollId} in trip ${tripId}:`, error.message);
    return false;
  }
}

export async function deletePollFromTripDb(tripId: string, pollId: string): Promise<boolean> {
  if (!tripId || !pollId) {
    console.error("[tripService] deletePollFromTripDb: Trip ID and Poll ID are required.");
    return false;
  }
  try {
    const pollRef = ref(database, `trips/${tripId}/polls/${pollId}`);
    await remove(pollRef);
    return true;
  } catch (error: any) {
    console.error(`[tripService] deletePollFromTripDb: Error deleting poll ${pollId} from trip ${tripId}:`, error.message);
    return false;
  }
}


export async function deleteUserDataFromDb(userId: string): Promise<void> {
  console.log(`[tripService] deleteUserDataFromDb: Attempting to delete data for user ID: ${userId}`);
  if (!userId) {
    console.error("[tripService] deleteUserDataFromDb: User ID is required.");
    return;
  }

  const updates: { [key: string]: any } = {};
  
  try {
    // 1. Get all trip IDs the user is part of
    const userTripsSnapshot = await get(ref(database, `users/${userId}/trips`));
    if (userTripsSnapshot.exists()) {
      const userTripsData = userTripsSnapshot.val();
      const tripIds = Object.keys(userTripsData);

      // 2. For each trip, remove the user from the trip's members list
      // Also, remove polls created by this user from those trips
      for (const tripId of tripIds) {
        updates[`/trips/${tripId}/members/${userId}`] = null; // Mark for deletion

        // Remove polls created by the user in this trip
        const tripPollsSnapshot = await get(ref(database, `trips/${tripId}/polls`));
        if (tripPollsSnapshot.exists()) {
            const polls = tripPollsSnapshot.val();
            for (const pollId in polls) {
                if (polls[pollId].createdBy === userId) {
                    updates[`/trips/${tripId}/polls/${pollId}`] = null;
                }
            }
        }
      }
    }

    // 3. Remove the user's own node under /users/{userId}
    updates[`/users/${userId}`] = null; // Mark for deletion

    // 4. Perform all deletions in one multi-location update
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
      console.log(`[tripService] deleteUserDataFromDb: Successfully marked data for deletion for user ID: ${userId}`);
    } else {
      console.log(`[tripService] deleteUserDataFromDb: No database entries found to delete for user ID: ${userId}`);
    }

  } catch (error: any) {
    console.error(`[tripService] deleteUserDataFromDb: Error deleting data for user ${userId}:`, error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] deleteUserDataFromDb: PERMISSION DENIED. Check Firebase Realtime Database rules for writing to '/trips' and '/users'.");
    }
  }
}

