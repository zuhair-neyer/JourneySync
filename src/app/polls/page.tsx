
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlusCircle, Vote, BarChart3, Trash2, Edit2, Loader2, AlertTriangle, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import Image from "next/image";
import type { Poll, PollOption } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useTripContext } from '@/contexts/TripContext';
import { useToast } from '@/hooks/use-toast';
import { addPollToTripDb, getPollsForTripFromDb, updatePollInTripDb, deletePollFromTripDb, updatePollVoteInDb } from '@/firebase/tripService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface PollWithClientVote extends Poll {
  // userVote is now derived from poll.votedBy directly in the component
}

export default function PollsPage() {
  const { currentUser } = useAuth();
  const { selectedTripId, selectedTrip, userTrips, isLoadingUserTrips, setSelectedTripId } = useTripContext();
  const { toast } = useToast();

  const [polls, setPolls] = useState<PollWithClientVote[]>([]);
  const [isLoadingPolls, setIsLoadingPolls] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(''); // Comma-separated
  const [editingPoll, setEditingPoll] = useState<PollWithClientVote | null>(null);
  
  const fetchTripPolls = useCallback(async () => {
    if (!selectedTripId) {
      setPolls([]);
      return;
    }
    setIsLoadingPolls(true);
    try {
      const fetchedPolls = await getPollsForTripFromDb(selectedTripId);
      setPolls(fetchedPolls);
    } catch (error) {
      console.error("Failed to fetch polls:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load polls for this trip." });
      setPolls([]);
    } finally {
      setIsLoadingPolls(false);
    }
  }, [selectedTripId, toast]);

  useEffect(() => {
    fetchTripPolls();
  }, [fetchTripPolls]);

  const handleCreatePoll = async () => {
    if (!currentUser || !selectedTripId) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in and select a trip to create a poll." });
      return;
    }
    if (newPollQuestion.trim() === '' || newPollOptions.trim() === '') {
      toast({ variant: "destructive", title: "Error", description: "Question and options cannot be empty." });
      return;
    }

    const optionsArray: PollOption[] = newPollOptions.split(',')
      .map((opt, index) => ({ id: `option-${index}-${Date.now()}`, text: opt.trim(), votes: 0 }))
      .filter(opt => opt.text !== '');

    if (optionsArray.length < 2) {
      toast({ variant: "destructive", title: "Error", description: "Please provide at least two valid options." });
      return;
    }
    
    const pollData: Omit<Poll, 'id' | 'tripId'> = {
      question: newPollQuestion,
      options: optionsArray,
      createdBy: currentUser.uid,
      createdAt: Date.now(),
      votedBy: {}, // Initialize votedBy
    };

    let success = false;
    if (editingPoll) {
        // For editing, we update the existing poll in Firebase
        // Note: votedBy is not typically edited here; only question/options.
        success = await updatePollInTripDb(selectedTripId, editingPoll.id, { question: newPollQuestion, options: optionsArray });
        if (success) toast({ title: "Success", description: "Poll updated." });
    } else {
        const newPollId = await addPollToTripDb(selectedTripId, pollData);
        if (newPollId) {
            success = true;
            toast({ title: "Success", description: "Poll created." });
        }
    }
    
    if (success) {
      fetchTripPolls(); 
      setNewPollQuestion('');
      setNewPollOptions('');
      setEditingPoll(null);
      setIsDialogOpen(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Failed to ${editingPoll ? 'update' : 'create'} poll.` });
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!selectedTripId || !currentUser) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to vote." });
        return;
    }

    // Optimistic UI update (optional but good for UX)
    const originalPolls = [...polls];
    setPolls(prevPolls => 
        prevPolls.map(p => {
            if (p.id === pollId) {
                const newVotedBy = { ...(p.votedBy || {}), [currentUser.uid]: optionId };
                const newOptions = p.options.map(opt => {
                    let newVotes = opt.votes;
                    const oldVoteForThisOptionByCurrentUser = p.votedBy?.[currentUser.uid] === opt.id;
                    const newVoteForThisOptionByCurrentUser = optionId === opt.id;

                    if (oldVoteForThisOptionByCurrentUser && !newVoteForThisOptionByCurrentUser) {
                        newVotes = Math.max(0, newVotes - 1); // Decrement old
                    }
                    if (!oldVoteForThisOptionByCurrentUser && newVoteForThisOptionByCurrentUser) {
                        newVotes = newVotes + 1; // Increment new
                    }
                    // If old and new are the same, votes don't change by this logic path.
                    // If user is voting for first time for this option, it increments.
                    return { ...opt, votes: newVotes };
                });
                return { ...p, options: newOptions, votedBy: newVotedBy };
            }
            return p;
        })
    );

    const success = await updatePollVoteInDb(selectedTripId, pollId, currentUser.uid, optionId);
    if (success) {
      toast({ title: "Vote Cast", description: "Your vote has been recorded." });
      fetchTripPolls(); // Re-fetch to ensure consistency, especially if optimistic update is complex or disabled
    } else {
      toast({ variant: "destructive", title: "Vote Error", description: "Failed to save vote. Please try again." });
      setPolls(originalPolls); // Revert optimistic update
    }
  };
  
  const openEditDialog = (poll: PollWithClientVote) => {
    setEditingPoll(poll);
    setNewPollQuestion(poll.question);
    setNewPollOptions(poll.options.map(o => o.text).join(', '));
    setIsDialogOpen(true);
  };
  
  const handleDeletePoll = async (pollId: string) => {
    if (!selectedTripId || !currentUser) return;

    const pollToDelete = polls.find(p => p.id === pollId);
    if (pollToDelete && pollToDelete.createdBy !== currentUser.uid) {
        toast({ variant: "destructive", title: "Error", description: "You can only delete polls you created." });
        return;
    }

    const success = await deletePollFromTripDb(selectedTripId, pollId);
    if (success) {
      toast({ title: "Success", description: "Poll deleted." });
      fetchTripPolls(); 
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete poll." });
    }
  };
  
  const openNewPollDialog = () => {
    if (!selectedTripId) {
      toast({ variant: "destructive", title: "Select a Trip", description: "Please select a trip first to add a poll to it." });
      return;
    }
    setEditingPoll(null);
    setNewPollQuestion('');
    setNewPollOptions('');
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-primary mb-4 md:mb-0">Group Polls</h1>
        <Button onClick={openNewPollDialog} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={!selectedTripId || isLoadingPolls}>
          <PlusCircle className="mr-2 h-5 w-5" /> Create New Poll
        </Button>
      </header>

      <Card className="mb-8 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Select Trip for Polls</CardTitle>
          <CardDescription>Manage polls for a specific trip. Select a trip to view or create polls.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUserTrips ? (
            <p className="text-muted-foreground">Loading your trips...</p>
          ) : userTrips.length > 0 ? (
            <Select
              value={selectedTripId || ""}
              onValueChange={(value) => setSelectedTripId(value || null)}
            >
              <SelectTrigger className="w-full md:w-[300px] bg-background">
                <SelectValue placeholder="Select a trip" />
              </SelectTrigger>
              <SelectContent>
                {userTrips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-muted-foreground">No trips found. Please create or join a trip on the 'My Trips' page to use polls.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle className="text-primary">{editingPoll ? 'Edit Poll' : 'Create New Poll'} for {selectedTrip?.name || "Selected Trip"}</DialogTitle>
            <DialogDescription>
              {editingPoll ? 'Update the question and options for this poll.' : 'Set up a new poll for your group to vote on.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="poll-question" className="font-semibold">Question</Label>
              <Input id="poll-question" value={newPollQuestion} onChange={(e) => setNewPollQuestion(e.target.value)} placeholder="e.g., What's for dinner?" className="mt-1 bg-background" />
            </div>
            <div>
              <Label htmlFor="poll-options" className="font-semibold">Options (comma-separated)</Label>
              <Input id="poll-options" value={newPollOptions} onChange={(e) => setNewPollOptions(e.target.value)} placeholder="e.g., Pizza, Pasta, Salad" className="mt-1 bg-background" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePoll} className="bg-primary hover:bg-primary/90 text-primary-foreground">{editingPoll ? 'Save Changes' : 'Create Poll'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {!selectedTripId && !isLoadingUserTrips && (
         <Card className="text-center p-8 shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground flex items-center justify-center"><Info className="mr-2 h-8 w-8 text-primary" />No Trip Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Please select a trip from the dropdown above to view or create polls.
              </CardDescription>
               <Image 
                src="https://placehold.co/400x250.png" 
                alt="Select a trip" 
                width={400} 
                height={250} 
                className="mx-auto rounded-lg shadow-sm"
                data-ai-hint="travel planning"
              />
            </CardContent>
         </Card>
      )}

      {selectedTripId && isLoadingPolls && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading polls for {selectedTrip?.name || "trip"}...</p>
        </div>
      )}

      {selectedTripId && !isLoadingPolls && polls.length === 0 && (
         <Card className="text-center p-8 shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground">No Polls Yet for {selectedTrip?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Create the first poll for this trip to help your group make decisions!
              </CardDescription>
               <Image 
                src="https://placehold.co/400x250.png" 
                alt="Empty Polls Illustration for Trip" 
                width={400} 
                height={250} 
                className="mx-auto rounded-lg shadow-sm"
                data-ai-hint="decision ideas"
              />
            </CardContent>
         </Card>
      )}

      {selectedTripId && !isLoadingPolls && polls.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {polls.map(poll => {
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
            const userVoteForThisPoll = currentUser ? poll.votedBy?.[currentUser.uid] : undefined;
            return (
              <Card key={poll.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
                <CardHeader>
                  <div className="flex justify-between items-start">
                      <CardTitle className="text-xl text-primary">{poll.question}</CardTitle>
                      {currentUser && poll.createdBy === currentUser.uid && (
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(poll)} className="text-muted-foreground hover:text-primary">
                                <Edit2 className="h-4 w-4"/>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeletePoll(poll.id)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>
                      )}
                  </div>
                  <CardDescription className="text-xs">
                    Created by: {selectedTrip?.members[poll.createdBy]?.name || `User...${poll.createdBy.slice(-4)}`} on {new Date(poll.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup 
                    value={userVoteForThisPoll} 
                    onValueChange={(optionId) => handleVote(poll.id, optionId)} 
                    className="space-y-2"
                    disabled={!currentUser} // Disable if no user logged in
                  >
                    {poll.options.map(option => (
                      <div key={option.id} className="flex flex-col">
                        <div className="flex items-center space-x-2 mb-1">
                          <RadioGroupItem value={option.id} id={`${poll.id}-${option.id}`} disabled={!currentUser} />
                          <Label htmlFor={`${poll.id}-${option.id}`} className="flex-grow">{option.text}</Label>
                          <span className="text-sm text-muted-foreground">({option.votes} votes)</span>
                        </div>
                        {totalVotes > 0 && (
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-accent transition-all duration-500" 
                               style={{ width: `${(option.votes / totalVotes) * 100}%` }}
                             />
                          </div>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                  {!currentUser && <p className="text-xs text-muted-foreground mt-2">Log in to vote.</p>}
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t pt-4">
                  <span className="text-sm text-muted-foreground flex items-center"><BarChart3 className="mr-2 h-4 w-4" /> Total Votes: {totalVotes}</span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
