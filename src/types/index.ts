
export interface TripMember {
  uid: string;
  name: string | null;
  email: string | null;
  joinedAt: number | object; // Using object for ServerValue.TIMESTAMP
}

export interface Trip {
  id: string;
  name:string;
  createdBy: string;
  createdAt: number | object; // Using object for ServerValue.TIMESTAMP
  members: {
    [uid: string]: TripMember;
  };
  // Optional: Add other trip-specific data here like itineraryId, expensesId etc.
}

export interface UserTripInfo { // Stored under /users/{uid}/trips/{tripId}
  id: string; // tripId
  name: string;
  role: 'creator' | 'member';
}
