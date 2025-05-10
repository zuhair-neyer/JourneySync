'use server';
import { database } from '@/firebase/config';
import type { Trip, TripMember, UserTripInfo } from '@/types';
import { ref, push, set, get, child, update } from 'firebase/database'; // Removed serverTimestamp import
import type { User as FirebaseUser } from 'firebase/auth';

export async function createTripInDb(tripName: string, user: FirebaseUser): Promise<string | null> {
  if (!tripName.trim()) {
    console.error("Trip name cannot be empty.");
    return null;
  }
  try {
    const tripsRef = ref(database, 'trips');
    const newTripRef = push(tripsRef);
    const tripId = newTripRef.key;

    if (!tripId) {
      console.error("Failed to generate trip ID.");
      return null;
    }
    
    const currentTime = Date.now();

    const newTripData: Omit<Trip, 'id'> = {
      name: tripName,
      createdBy: user.uid,
      createdAt: currentTime, // Replaced serverTimestamp()
      members: {
        [user.uid]: {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          joinedAt: currentTime, // Replaced serverTimestamp()
        },
      },
    };

    await set(newTripRef, newTripData);

    // Add trip to user's list of trips
    const userTripRef = ref(database, `users/${user.uid}/trips/${tripId}`);
    const userTripInfo: Omit<UserTripInfo, 'id'> = {
      name: tripName,
      role: 'creator',
    };
    await set(userTripRef, userTripInfo);

    return tripId;
  } catch (error) {
    console.error("Error creating trip:", error);
    return null;
  }
}

export async function joinTripInDb(tripId: string, user: FirebaseUser): Promise<boolean> {
  if (!tripId.trim()) {
    console.error("Trip ID cannot be empty.");
    return false;
  }
  try {
    const tripRef = ref(database, `trips/${tripId}`);
    const tripSnapshot = await get(tripRef);

    if (!tripSnapshot.exists()) {
      console.error("Trip not found.");
      return false;
    }

    const tripData = tripSnapshot.val() as Trip;

    // Check if user is already a member
    if (tripData.members && tripData.members[user.uid]) {
      console.log("User is already a member of this trip.");
      return true; // Or false if we want to indicate no change was made
    }
    
    const memberData: TripMember = {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      joinedAt: Date.now(), // Replaced serverTimestamp()
    };

    const updates: { [key: string]: any } = {};
    updates[`/trips/${tripId}/members/${user.uid}`] = memberData;
    updates[`/users/${user.uid}/trips/${tripId}`] = {
      name: tripData.name,
      role: 'member',
    };
    
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error("Error joining trip:", error);
    return false;
  }
}

export async function getUserTripsFromDb(userId: string): Promise<UserTripInfo[]> {
  try {
    const userTripsRef = ref(database, `users/${userId}/trips`);
    const snapshot = await get(userTripsRef);
    if (snapshot.exists()) {
      const tripsData = snapshot.val();
      return Object.keys(tripsData).map(tripId => ({
        id: tripId,
        ...tripsData[tripId],
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching user trips:", error);
    return [];
  }
}

export async function getTripDetailsFromDb(tripId: string): Promise<Trip | null> {
  try {
    const tripRef = ref(database, `trips/${tripId}`);
    const snapshot = await get(tripRef);
    if (snapshot.exists()) {
      return { id: tripId, ...snapshot.val() } as Trip;
    }
    return null;
  } catch (error) {
    console.error("Error fetching trip details:", error);
    return null;
  }
}