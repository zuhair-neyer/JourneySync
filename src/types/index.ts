
export interface TripMember {
  uid: string;
  name: string | null;
  email: string | null;
  joinedAt: number; 
}

export interface PollOption {
  id: string; // Can be a simple unique ID or index-based string
  text: string;
  votes: number;
}

export interface Poll {
  id: string; // Firebase key for the poll
  tripId: string; // ID of the trip this poll belongs to
  question: string;
  options: PollOption[];
  createdBy: string; // UID of the user who created the poll
  createdAt: number; // Timestamp of creation
  votedBy?: { [userId: string]: string }; // userId: optionId, tracks which option a user voted for
}

export interface ItineraryComment {
  id: string; // Unique ID for the comment
  userId: string;
  userName: string; // Name of the user who commented
  text: string;
  createdAt: number; // Timestamp
}

export interface ItineraryItem {
  id: string;
  tripId: string; // ID of the trip this item belongs to
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  notes?: string;
  createdBy: string; // UID of the user who created the item
  createdAt: number; // Timestamp of creation
  votes: number; 
  votedBy: string[]; // Array of UIDs of users who voted for this item
  comments: ItineraryComment[]; 
}

export interface PackingItem {
  id: string; // Firebase key for the item
  name: string;
  packed: boolean;
  category: string; 
}

export interface Trip {
  id: string;
  name:string;
  createdBy: string;
  createdAt: number; 
  members: {
    [uid: string]: TripMember;
  };
  expenses?: { 
    [expenseId: string]: Expense; 
  };
  polls?: { 
    [pollId: string]: Omit<Poll, 'id' | 'tripId'>; 
  };
  itinerary?: {
    [itemId: string]: Omit<ItineraryItem, 'id' | 'tripId'>;
  };
  packingList?: { 
    [itemId: string]: Omit<PackingItem, 'id'>; 
  };
  settledStatus?: { 
    [userId: string]: boolean; 
  };
  budget?: number | null; // Added budget field
}

export interface UserTripInfo { 
  id: string; 
  name: string;
  role: 'creator' | 'member';
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  paidByUserId: string;
  date: string; 
  participantIds: string[];
  tripId: string; 
}
