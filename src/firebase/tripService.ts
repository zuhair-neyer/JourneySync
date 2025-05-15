
'use server';
import { database } from '@/firebase/config';
import type { Trip, TripMember, UserTripInfo, Expense, Poll, PollOption, ItineraryItem, ItineraryComment, PackingItem } from '@/types'; // Removed ChatMessage
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
      polls: {}, 
      itinerary: {}, 
      packingList: {},
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
        itinerary: tripData.itinerary || {},
        packingList: tripData.packingList || {},
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
    const updates: { [key: string]: any } = {};
    if (pollData.question !== undefined) updates[`trips/${tripId}/polls/${pollId}/question`] = pollData.question;
    if (pollData.options !== undefined) updates[`trips/${tripId}/polls/${pollId}/options`] = pollData.options;
    
    if (Object.keys(updates).length === 0) {
        console.warn("[tripService] updatePollInTripDb: No valid fields to update provided.");
        return true; 
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

// Itinerary related functions
export async function addItineraryItemToTripDb(tripId: string, itemData: Omit<ItineraryItem, 'id' | 'tripId'>): Promise<string | null> {
  if (!tripId) {
    console.error("[tripService] addItineraryItemToTripDb: Trip ID is required.");
    return null;
  }
  try {
    const itineraryRef = ref(database, `trips/${tripId}/itinerary`);
    const newItemRef = push(itineraryRef);
    const itemId = newItemRef.key;

    if (!itemId) {
      console.error("[tripService] addItineraryItemToTripDb: Failed to generate itinerary item ID.");
      return null;
    }

    const itemToAdd: Omit<ItineraryItem, 'tripId'> = { 
        ...itemData, 
        id: itemId,
        votes: itemData.votes || 0, 
        votedBy: itemData.votedBy || [],
        comments: itemData.comments || [], 
    };
    await set(newItemRef, itemToAdd);
    return itemId;
  } catch (error: any) {
    console.error(`[tripService] addItineraryItemToTripDb: Error adding itinerary item to trip ${tripId}:`, error.message);
    return null;
  }
}

export async function getItineraryItemsForTripFromDb(tripId: string): Promise<ItineraryItem[]> {
  if (!tripId) {
    return [];
  }
  try {
    const itineraryRef = ref(database, `trips/${tripId}/itinerary`);
    const snapshot = await get(itineraryRef);
    if (snapshot.exists()) {
      const itemsData = snapshot.val();
      const itemsArray: ItineraryItem[] = Object.keys(itemsData).map(itemId => ({
        ...itemsData[itemId],
        id: itemId,
        tripId: tripId,
        votes: itemsData[itemId].votes || 0,
        votedBy: itemsData[itemId].votedBy || [], 
        comments: itemsData[itemId].comments || [], 
      }));
      return itemsArray;
    }
    return [];
  } catch (error: any) {
    console.error(`[tripService] getItineraryItemsForTripFromDb: Error fetching itinerary items for trip ${tripId}:`, error.message);
    return [];
  }
}

export async function updateItineraryItemInTripDb(tripId: string, itemId: string, itemData: Partial<Omit<ItineraryItem, 'id' | 'tripId' | 'comments'>>): Promise<boolean> {
  if (!tripId || !itemId) {
    console.error("[tripService] updateItineraryItemInTripDb: Trip ID and Item ID are required.");
    return false;
  }
  try {
    const updates: { [key: string]: any } = {};
    const basePath = `trips/${tripId}/itinerary/${itemId}`;

    if (itemData.title !== undefined) updates[`${basePath}/title`] = itemData.title;
    if (itemData.description !== undefined) updates[`${basePath}/description`] = itemData.description;
    if (itemData.location !== undefined) updates[`${basePath}/location`] = itemData.location;
    if (itemData.date !== undefined) updates[`${basePath}/date`] = itemData.date;
    if (itemData.time !== undefined) updates[`${basePath}/time`] = itemData.time;
    if (itemData.notes !== undefined) updates[`${basePath}/notes`] = itemData.notes;
    if (itemData.votes !== undefined) updates[`${basePath}/votes`] = itemData.votes;
    if (itemData.votedBy !== undefined) updates[`${basePath}/votedBy`] = itemData.votedBy;

    if (Object.keys(updates).length === 0) {
        console.warn("[tripService] updateItineraryItemInTripDb: No valid fields to update provided.");
        return true; 
    }
    
    await update(ref(database), updates);
    return true;
  } catch (error: any) {
    console.error(`[tripService] updateItineraryItemInTripDb: Error updating item ${itemId} in trip ${tripId}:`, error.message);
    return false;
  }
}

export async function deleteItineraryItemFromDb(tripId: string, itemId: string): Promise<boolean> {
  if (!tripId || !itemId) {
    console.error("[tripService] deleteItineraryItemFromDb: Trip ID and Item ID are required.");
    return false;
  }
  try {
    const itemRef = ref(database, `trips/${tripId}/itinerary/${itemId}`);
    await remove(itemRef);
    return true;
  } catch (error: any) {
    console.error(`[tripService] deleteItineraryItemFromDb: Error deleting item ${itemId} from trip ${tripId}:`, error.message);
    return false;
  }
}

export async function addCommentToItineraryItemDb(tripId: string, itemId: string, commentData: ItineraryComment): Promise<string | null> {
  if (!tripId || !itemId) {
    console.error("[tripService] addCommentToItineraryItemDb: Trip ID and Item ID are required.");
    return null;
  }
  if (!commentData || !commentData.id || !commentData.userId || !commentData.text) {
    console.error("[tripService] addCommentToItineraryItemDb: Comment data is incomplete.");
    return null;
  }

  try {
    const itemRef = ref(database, `trips/${tripId}/itinerary/${itemId}`);
    const itemSnapshot = await get(itemRef);

    if (!itemSnapshot.exists()) {
      console.error(`[tripService] addCommentToItineraryItemDb: Itinerary item ${itemId} not found in trip ${tripId}.`);
      return null;
    }

    const item = itemSnapshot.val() as ItineraryItem;
    const existingComments = item.comments || [];
    const updatedComments = [...existingComments, commentData];

    await update(itemRef, { comments: updatedComments });
    return commentData.id; 
  } catch (error: any) {
    console.error(`[tripService] addCommentToItineraryItemDb: Error adding comment to item ${itemId} in trip ${tripId}:`, error.message);
    return null;
  }
}

// Packing List related functions
export async function addPackingItemToTripDb(tripId: string, itemData: Omit<PackingItem, 'id'>): Promise<string | null> {
  if (!tripId) {
    console.error("[tripService] addPackingItemToTripDb: Trip ID is required.");
    return null;
  }
  try {
    const packingListRef = ref(database, `trips/${tripId}/packingList`);
    const newItemRef = push(packingListRef);
    const itemId = newItemRef.key;

    if (!itemId) {
      console.error("[tripService] addPackingItemToTripDb: Failed to generate packing item ID.");
      return null;
    }
    
    await set(newItemRef, itemData); // Store Omit<PackingItem, 'id'>
    return itemId;
  } catch (error: any) {
    console.error(`[tripService] addPackingItemToTripDb: Error adding packing item to trip ${tripId}:`, error.message);
    return null;
  }
}

export async function getPackingListForTripFromDb(tripId: string): Promise<PackingItem[]> {
  if (!tripId) {
    return [];
  }
  try {
    const packingListRef = ref(database, `trips/${tripId}/packingList`);
    const snapshot = await get(packingListRef);
    if (snapshot.exists()) {
      const itemsData = snapshot.val();
      const itemsArray: PackingItem[] = Object.keys(itemsData).map(itemId => ({
        id: itemId,
        ...itemsData[itemId], // Spread the rest of the properties (name, packed, category)
      }));
      return itemsArray;
    }
    return [];
  } catch (error: any) {
    console.error(`[tripService] getPackingListForTripFromDb: Error fetching packing list for trip ${tripId}:`, error.message);
    return [];
  }
}

export async function updatePackingItemInTripDb(tripId: string, itemId: string, itemData: Partial<Omit<PackingItem, 'id'>>): Promise<boolean> {
  if (!tripId || !itemId) {
    console.error("[tripService] updatePackingItemInTripDb: Trip ID and Item ID are required.");
    return false;
  }
  try {
    const itemRef = ref(database, `trips/${tripId}/packingList/${itemId}`);
    await update(itemRef, itemData);
    return true;
  } catch (error: any) {
    console.error(`[tripService] updatePackingItemInTripDb: Error updating packing item ${itemId} in trip ${tripId}:`, error.message);
    return false;
  }
}

export async function deletePackingItemFromTripDb(tripId: string, itemId: string): Promise<boolean> {
  if (!tripId || !itemId) {
    console.error("[tripService] deletePackingItemFromTripDb: Trip ID and Item ID are required.");
    return false;
  }
  try {
    const itemRef = ref(database, `trips/${tripId}/packingList/${itemId}`);
    await remove(itemRef);
    return true;
  } catch (error: any) {
    console.error(`[tripService] deletePackingItemFromTripDb: Error deleting packing item ${itemId} from trip ${tripId}:`, error.message);
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
      // Also, remove polls and itinerary items created by this user from those trips
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
        // Remove itinerary items created by the user in this trip
        const tripItinerarySnapshot = await get(ref(database, `trips/${tripId}/itinerary`));
        if (tripItinerarySnapshot.exists()) {
            const itineraryItems = tripItinerarySnapshot.val();
            for (const itemId in itineraryItems) {
                if (itineraryItems[itemId].createdBy === userId) {
                    updates[`/trips/${tripId}/itinerary/${itemId}`] = null;
                } // Also need to check comments and chat messages by this user within each item. This can get complex.
                  // For simplicity, we'll only remove items created by the user.
                  // A more thorough deletion would iterate through comments/chat and remove those too.
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

export async function deleteTripFromDb(tripId: string, memberUids: string[]): Promise<boolean> {
  if (!tripId) {
    console.error("[tripService] deleteTripFromDb: Trip ID is required.");
    return false;
  }

  try {
    const updates: { [key: string]: any } = {};
    updates[`/trips/${tripId}`] = null; 

    if (memberUids && memberUids.length > 0) {
      for (const uid of memberUids) {
        updates[`/users/${uid}/trips/${tripId}`] = null; 
      }
    } else {
      console.warn(`[tripService] deleteTripFromDb: No memberUids provided for trip ${tripId} or memberUids array is empty. Only the main trip data at /trips/${tripId} will be targeted for deletion. User references might remain if not all members were passed.`);
    }

    await update(ref(database), updates);
    console.log(`[tripService] deleteTripFromDb: Successfully marked trip ${tripId} and its user references for deletion.`);
    return true;
  } catch (error: any) {
    console.error(`[tripService] deleteTripFromDb: Error deleting trip ${tripId}:`, error.message, "(Code:", error.code || 'N/A', ")");
    if (error.code === 'PERMISSION_DENIED') {
        console.error("[tripService] deleteTripFromDb: PERMISSION DENIED. Check Firebase Realtime Database rules for writing to '/trips' and '/users'.");
    }
    return false;
  }
}
