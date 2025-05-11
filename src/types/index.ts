
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
  // userVote?: string; // This will be managed client-side in PollsPage for UI purposes
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
  polls?: { // Polls are now part of a trip
    [pollId: string]: Omit<Poll, 'id' | 'tripId'>; // Store poll data directly under trip
  };
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

