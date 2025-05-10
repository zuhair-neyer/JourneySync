
export interface TripMember {
  uid: string;
  name: string | null;
  email: string | null;
  joinedAt: number; // Changed from number | object
}

export interface Trip {
  id: string;
  name:string;
  createdBy: string;
  createdAt: number; // Changed from number | object
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