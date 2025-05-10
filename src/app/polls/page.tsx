"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlusCircle, Vote, BarChart3, Trash2, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import Image from "next/image";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  userVote?: string; // option id
}

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(''); // Comma-separated
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  
  useEffect(() => {
    // Load polls from localStorage or API if needed
    const initialPolls: Poll[] = [
      { 
        id: '1', 
        question: 'Where should we have dinner on Friday?', 
        options: [
          { id: 'opt1a', text: 'Italian Place', votes: 3 },
          { id: 'opt1b', text: 'Sushi Restaurant', votes: 5 },
          { id: 'opt1c', text: 'Local Cuisine', votes: 2 },
        ],
      },
      { 
        id: '2', 
        question: 'Which activity for Saturday morning?', 
        options: [
          { id: 'opt2a', text: 'Museum Visit', votes: 4 },
          { id: 'opt2b', text: 'Hiking Trail', votes: 3 },
          { id: 'opt2c', text: 'Shopping Spree', votes: 3 },
        ],
      },
    ];
    setPolls(initialPolls);
  }, []);

  const handleCreatePoll = () => {
    if (newPollQuestion.trim() === '' || newPollOptions.trim() === '') return;
    const optionsArray = newPollOptions.split(',').map(opt => ({ id: Date.now().toString() + Math.random(), text: opt.trim(), votes: 0 }));
    
    if (editingPoll) {
        setPolls(polls.map(p => p.id === editingPoll.id ? {...p, question: newPollQuestion, options: optionsArray} : p));
        setEditingPoll(null);
    } else {
        const newPoll: Poll = {
          id: Date.now().toString(),
          question: newPollQuestion,
          options: optionsArray,
        };
        setPolls([...polls, newPoll]);
    }
    
    setNewPollQuestion('');
    setNewPollOptions('');
    setIsDialogOpen(false);
  };

  const handleVote = (pollId: string, optionId: string) => {
    setPolls(polls.map(poll => {
      if (poll.id === pollId) {
        // If user already voted for this option, do nothing or allow unvoting (not implemented here for simplicity)
        // If user voted for another option, decrement old vote and increment new vote
        let newOptions = poll.options.map(opt => {
          if (opt.id === optionId && poll.userVote !== optionId) return { ...opt, votes: opt.votes + 1 };
          if (opt.id === poll.userVote && poll.userVote !== optionId) return { ...opt, votes: Math.max(0, opt.votes - 1) }; // Decrement previous vote
          return opt;
        });
        return { ...poll, options: newOptions, userVote: optionId };
      }
      return poll;
    }));
  };
  
  const openEditDialog = (poll: Poll) => {
    setEditingPoll(poll);
    setNewPollQuestion(poll.question);
    setNewPollOptions(poll.options.map(o => o.text).join(', '));
    setIsDialogOpen(true);
  };
  
  const handleDeletePoll = (pollId: string) => {
    setPolls(polls.filter(p => p.id !== pollId));
  };
  
  const openNewPollDialog = () => {
    setEditingPoll(null);
    setNewPollQuestion('');
    setNewPollOptions('');
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-primary mb-4 md:mb-0">Group Polls</h1>
        <Button onClick={openNewPollDialog} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle className="mr-2 h-5 w-5" /> Create New Poll
        </Button>
      </header>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle className="text-primary">{editingPoll ? 'Edit Poll' : 'Create New Poll'}</DialogTitle>
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

      {polls.length === 0 && (
         <Card className="text-center p-8 shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground">No Polls Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                Create a poll to help your group make decisions together!
              </CardDescription>
               <Image 
                src="https://picsum.photos/seed/empty-polls/400/250" 
                alt="Empty Polls Illustration" 
                width={400} 
                height={250} 
                className="mx-auto rounded-lg shadow-sm"
                data-ai-hint="decision making"
              />
            </CardContent>
         </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {polls.map(poll => {
          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
          return (
            <Card key={poll.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl text-primary">{poll.question}</CardTitle>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(poll)} className="text-muted-foreground hover:text-primary">
                            <Edit2 className="h-4 w-4"/>
                        </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDeletePoll(poll.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={poll.userVote} 
                  onValueChange={(optionId) => handleVote(poll.id, optionId)} 
                  className="space-y-2"
                >
                  {poll.options.map(option => (
                    <div key={option.id} className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-1">
                        <RadioGroupItem value={option.id} id={`${poll.id}-${option.id}`} />
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
              </CardContent>
              <CardFooter className="flex justify-between items-center border-t pt-4">
                <span className="text-sm text-muted-foreground flex items-center"><BarChart3 className="mr-2 h-4 w-4" /> Total Votes: {totalVotes}</span>
                {/* The vote button is implicitly handled by RadioGroup onValueChange. 
                    A dedicated "Submit Vote" button could be added if RadioGroup behavior is different. */}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
