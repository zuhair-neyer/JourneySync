
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlusCircle, Edit2, Trash2, Users, DollarSign, CalendarDays, Landmark, Car, Utensils, Palette, AlertTriangle, Download, Bell, CreditCard, CheckCircle, Send, Target, PieChart as LucidePieChartIcon, Filter } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useTripContext } from '@/contexts/TripContext';
import Image from 'next/image';
import { Pie, Cell, PieLabelRenderProps, PieChart, ResponsiveContainer, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import type { Expense } from '@/types'; // Import updated Expense type

interface User {
  id: string;
  name: string;
  email?: string | null;
}

interface Balance {
  userId: string;
  userName: string;
  netBalance: number; // Positive if owed by group, negative if owes to group
  totalPaid: number;
  totalShare: number;
  isSettled: boolean;
}

const expenseCategories = ["Food", "Transport", "Accommodation", "Activities", "Shopping", "Miscellaneous"];
const currencies = ["USD", "EUR", "GBP", "JPY", "CAD"];

const categoryIcons: { [key: string]: React.ElementType } = {
  Food: Utensils,
  Transport: Car,
  Accommodation: Landmark,
  Activities: Palette,
  Shopping: CreditCard,
  Miscellaneous: DollarSign,
};

const categoryColors: { [key: string]: string } = {
  Food: "hsl(var(--chart-1))",
  Transport: "hsl(var(--chart-2))",
  Accommodation: "hsl(var(--chart-3))",
  Activities: "hsl(var(--chart-4))",
  Shopping: "hsl(var(--chart-5))",
  Miscellaneous: "hsl(var(--muted))",
};


export default function ExpensesPage() {
  const { currentUser } = useAuth();
  const { userTrips, selectedTripId, setSelectedTripId, isLoadingUserTrips, selectedTrip } = useTripContext();
  const { toast } = useToast();
  
  // Global users list (could be fetched or include more details from a user service)
  const [users, setUsers] = useState<User[]>([]); 
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]); // Stores all expenses across trips
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]); // Expenses for the selected trip
  
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Partial<Expense>>({ currency: 'USD', category: expenseCategories[0] });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [totalGroupExpense, setTotalGroupExpense] = useState(0);
  const [settledStatus, setSettledStatus] = useState<Record<string, boolean>>({});

  const [tripBudget, setTripBudget] = useState<number | null>(null);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState<string>("");

  // Initialize global users list (e.g. with current user and any known associates/mock data)
  useEffect(() => {
    const mockUsers: User[] = [
      { id: 'user2', name: 'Alice Wonderland' },
      { id: 'user3', name: 'Bob The Builder' },
    ];
    if (currentUser) {
      setUsers([{ id: currentUser.uid, name: currentUser.displayName || currentUser.email || 'Current User', email: currentUser.email }, ...mockUsers]);
    } else {
      setUsers([{ id: 'user1', name: 'Guest User (You)'}, ...mockUsers]);
    }
    
    const initialExpenses: Expense[] = [
        { id: '1', description: 'Group Dinner', amount: 120, currency: 'USD', category: 'Food', paidByUserId: currentUser?.uid || 'user1', date: '2024-07-20', participantIds: [currentUser?.uid || 'user1', 'user2', 'user3'], tripId: userTrips.length > 0 ? userTrips[0].id : 'trip1' },
        { id: '2', description: 'Museum Tickets', amount: 45, currency: 'USD', category: 'Activities', paidByUserId: 'user2', date: '2024-07-21', participantIds: [currentUser?.uid || 'user1', 'user2'], tripId: userTrips.length > 0 ? userTrips[0].id : 'trip1' },
        { id: '3', description: 'Souvenirs', amount: 60, currency: 'EUR', category: 'Shopping', paidByUserId: 'user3', date: '2024-07-22', participantIds: ['user3', currentUser?.uid || 'user1'], tripId: userTrips.length > 1 ? userTrips[1].id : 'trip2' },
    ];
    setAllExpenses(initialExpenses);
  }, [currentUser, userTrips]);

  // Filter expenses whenever selectedTripId or allExpenses change
  useEffect(() => {
    if (selectedTripId) {
      setFilteredExpenses(allExpenses.filter(exp => exp.tripId === selectedTripId));
    } else {
      setFilteredExpenses([]);
    }
  }, [selectedTripId, allExpenses]);

  // Derive users for the selected trip to be used in various places
  const usersInCurrentTrip = useMemo(() => {
    if (selectedTrip && selectedTrip.members) {
      return Object.values(selectedTrip.members).map(member => {
        const fullUser = users.find(u => u.id === member.uid); // Get details from global `users` if available
        return {
          id: member.uid,
          name: fullUser?.name || member.name || `User...${member.uid.slice(-4)}`,
          email: fullUser?.email || member.email,
        };
      });
    }
    return [];
  }, [selectedTrip, users]);


  const calculateBalancesAndTotal = useCallback(() => {
    const activeUsers = usersInCurrentTrip; // Users relevant to the selected trip
    const expensesToProcess = filteredExpenses;

    if (activeUsers.length === 0 || (expensesToProcess.length === 0 && !selectedTripId)) {
      setBalances([]);
      setTotalGroupExpense(0);
      return;
    }
     if (expensesToProcess.length === 0 && selectedTripId) {
      setBalances([]); 
      setTotalGroupExpense(0);
    }

    let newTotalGroupExpense = 0;
    const userExpensesSummary: { [userId: string]: { paid: number; share: number } } = {};

    activeUsers.forEach(user => {
      userExpensesSummary[user.id] = { paid: 0, share: 0 };
    });

    expensesToProcess.forEach(expense => {
      newTotalGroupExpense += expense.amount;
      // Only count payment if payer is part of the active users for this trip context
      if (userExpensesSummary[expense.paidByUserId] && activeUsers.some(u => u.id === expense.paidByUserId)) {
        userExpensesSummary[expense.paidByUserId].paid += expense.amount;
      }

      // Filter participants to only those active in the current trip
      const participantsInExpenseForThisTrip = expense.participantIds.filter(pid => activeUsers.some(u => u.id === pid));
      const numParticipants = participantsInExpenseForThisTrip.length;

      if (numParticipants > 0) {
        const sharePerParticipant = expense.amount / numParticipants;
        participantsInExpenseForThisTrip.forEach(pid => {
          if (userExpensesSummary[pid]) { // This check implies pid is in activeUsers
            userExpensesSummary[pid].share += sharePerParticipant;
          }
        });
      }
    });

    const newBalances: Balance[] = activeUsers.map(user => ({
      userId: user.id,
      userName: user.name,
      totalPaid: userExpensesSummary[user.id]?.paid || 0,
      totalShare: userExpensesSummary[user.id]?.share || 0,
      netBalance: (userExpensesSummary[user.id]?.paid || 0) - (userExpensesSummary[user.id]?.share || 0),
      isSettled: settledStatus[user.id] || false,
    }));

    setBalances(newBalances);
    setTotalGroupExpense(newTotalGroupExpense);
  }, [filteredExpenses, usersInCurrentTrip, settledStatus, selectedTripId]);

  useEffect(() => {
    calculateBalancesAndTotal();
  }, [calculateBalancesAndTotal]); // calculateBalancesAndTotal has usersInCurrentTrip in its deps

  useEffect(() => {
    if (tripBudget !== null && totalGroupExpense > tripBudget && selectedTripId) {
      toast({
        variant: "destructive",
        title: "Budget Exceeded",
        description: `The group has spent ${totalGroupExpense.toFixed(2)} for trip "${selectedTrip?.name}", exceeding the budget of ${tripBudget.toFixed(2)}.`,
      });
    }
  }, [totalGroupExpense, tripBudget, toast, selectedTripId, selectedTrip?.name]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentExpense(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) || 0 : value }));
  };

  const handleSelectChange = (name: keyof Expense) => (value: string) => {
    setCurrentExpense(prev => ({ ...prev, [name]: value }));
  };
  
  const handleParticipantChange = (userId: string, checked: boolean) => {
    setCurrentExpense(prev => {
      const existingParticipants = prev.participantIds || [];
      if (checked) {
        return { ...prev, participantIds: [...existingParticipants, userId] };
      } else {
        return { ...prev, participantIds: existingParticipants.filter(id => id !== userId) };
      }
    });
  };

  const handleSubmitExpense = () => {
    if (!selectedTripId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a trip before adding an expense." });
      return;
    }
    if (!currentExpense.description || !currentExpense.amount || !currentExpense.paidByUserId || !currentExpense.date || !currentExpense.category || !currentExpense.currency || (currentExpense.participantIds || []).length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please fill all required fields and select participants." });
      return;
    }

    const expenseWithTripId = { ...currentExpense, tripId: selectedTripId } as Expense;

    if (editingExpenseId) {
      setAllExpenses(allExpenses.map(exp => exp.id === editingExpenseId ? expenseWithTripId : exp));
      toast({ title: "Success", description: "Expense updated." });
    } else {
      setAllExpenses([...allExpenses, { ...expenseWithTripId, id: Date.now().toString() }]);
      toast({ title: "Success", description: "Expense added." });
    }
    setIsExpenseDialogOpen(false);
    setCurrentExpense({ currency: 'USD', category: expenseCategories[0], participantIds: usersInCurrentTrip.map(u => u.id) }); 
    setEditingExpenseId(null);
  };

  const handleEditExpense = (expense: Expense) => {
    setCurrentExpense(expense);
    setEditingExpenseId(expense.id);
    setIsExpenseDialogOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    setAllExpenses(allExpenses.filter(exp => exp.id !== id));
    toast({ title: "Success", description: "Expense deleted." });
  };

  const openNewExpenseDialog = () => {
     if (!selectedTripId) {
      toast({ variant: "destructive", title: "Select a Trip", description: "Please select a trip first to add an expense to it." });
      return;
    }
    setCurrentExpense({ currency: 'USD', category: expenseCategories[0], participantIds: usersInCurrentTrip.map(u => u.id), date: new Date().toISOString().split('T')[0], tripId: selectedTripId });
    setEditingExpenseId(null);
    setIsExpenseDialogOpen(true);
  };

  const handleMarkAsSettled = (userIdToSettle: string) => {
    setSettledStatus(prev => ({ ...prev, [userIdToSettle]: true }));
    const userName = usersInCurrentTrip.find(u => u.id === userIdToSettle)?.name || 'User';
    toast({ title: "Success", description: `${userName}'s balance marked as settled for trip "${selectedTrip?.name}".` });
  };

  const handleOpenBudgetDialog = () => {
    if (!selectedTripId) {
      toast({ variant: "destructive", title: "Select a Trip", description: "Please select a trip to set its budget." });
      return;
    }
    setBudgetInput(tripBudget?.toString() || "");
    setIsBudgetDialogOpen(true);
  };

  const handleSaveBudget = () => {
    const newBudget = parseFloat(budgetInput);
    if (isNaN(newBudget) || newBudget < 0) {
      toast({ variant: "destructive", title: "Invalid Budget", description: "Please enter a valid positive number for the budget." });
      return;
    }
    setTripBudget(newBudget); 
    toast({ title: "Success", description: `Budget for trip "${selectedTrip?.name}" set to ${newBudget.toFixed(2)}.` });
    setIsBudgetDialogOpen(false);
  };

  const handleDownloadReport = () => {
    if (!selectedTripId) {
      toast({ variant: "destructive", title: "Select a Trip", description: "Please select a trip to download its report." });
      return;
    }
    toast({ title: "Feature Coming Soon", description: `A downloadable expense report for trip "${selectedTrip?.name}" will be available in a future update.` });
  };


  const expenseDataForChart = expenseCategories.map(category => ({
    name: category,
    total: filteredExpenses 
      .filter(exp => exp.category === category)
      .reduce((sum, exp) => sum + exp.amount, 0),
    fill: categoryColors[category] || 'hsl(var(--muted))',
  })).filter(item => item.total > 0);
  
  const chartConfig: ChartConfig = expenseCategories.reduce((config, category) => {
    const IconComponent = categoryIcons[category];
    config[category] = {
      label: category,
      color: categoryColors[category] || 'hsl(var(--muted))',
      icon: IconComponent ? IconComponent : undefined
    };
    return config;
  }, {} as ChartConfig);

  const budgetProgress = tripBudget && tripBudget > 0 ? (totalGroupExpense / tripBudget) * 100 : 0;


  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <DollarSign className="w-10 h-10 text-primary mr-3" />
          <h1 className="text-3xl font-bold text-primary">Expense Tracking</h1>
        </div>
        <Button onClick={openNewExpenseDialog} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={!selectedTripId}>
          <PlusCircle className="mr-2 h-5 w-5" /> Add Expense
        </Button>
      </header>

       <Card className="mb-8 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-primary flex items-center"><Filter className="mr-2 h-5 w-5" /> Select Trip for Expenses</CardTitle>
          <CardDescription>Manage expenses for a specific trip.</CardDescription>
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
            <p className="text-muted-foreground">No trips found. Please create or join a trip on the 'My Trips' page.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-primary">{editingExpenseId ? 'Edit' : 'Add New'} Expense for {selectedTrip?.name || "Selected Trip"}</DialogTitle>
            <DialogDescription>
              {editingExpenseId ? 'Update the details for this expense.' : 'Fill in the details for the new expense.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input id="description" name="description" value={currentExpense.description || ''} onChange={handleInputChange} className="col-span-3 bg-background" placeholder="e.g., Lunch with team" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input id="amount" name="amount" type="number" value={currentExpense.amount || ''} onChange={handleInputChange} className="col-span-3 bg-background" placeholder="e.g., 50.00" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">Currency</Label>
              <Select name="currency" value={currentExpense.currency} onValueChange={handleSelectChange('currency')}>
                <SelectTrigger className="col-span-3 bg-background"><SelectValue placeholder="Select currency" /></SelectTrigger>
                <SelectContent>
                  {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Category</Label>
              <Select name="category" value={currentExpense.category} onValueChange={handleSelectChange('category')}>
                <SelectTrigger className="col-span-3 bg-background"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paidByUserId" className="text-right">Paid By</Label>
              <Select name="paidByUserId" value={currentExpense.paidByUserId} onValueChange={handleSelectChange('paidByUserId')}>
                <SelectTrigger className="col-span-3 bg-background"><SelectValue placeholder="Select who paid" /></SelectTrigger>
                <SelectContent>
                  {usersInCurrentTrip.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <Input id="date" name="date" type="date" value={currentExpense.date || ''} onChange={handleInputChange} className="col-span-3 bg-background"/>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Participants</Label>
              <div className="col-span-3 space-y-2">
                {usersInCurrentTrip.map(user => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`participant-${user.id}`}
                      checked={(currentExpense.participantIds || []).includes(user.id)}
                      onCheckedChange={(checked) => handleParticipantChange(user.id, !!checked)}
                    />
                    <Label htmlFor={`participant-${user.id}`}>{user.name}</Label>
                  </div>
                ))}
                 <Button variant="outline" size="sm" onClick={() => setCurrentExpense(prev => ({...prev, participantIds: usersInCurrentTrip.map(u => u.id)}))}>Select All</Button>
                 <Button variant="outline" size="sm" onClick={() => setCurrentExpense(prev => ({...prev, participantIds: []}))} className="ml-2">Deselect All</Button>
              </div>
            </div>
            <Card className="mt-2 col-span-4">
                <CardHeader className="p-2">
                    <CardTitle className="text-sm flex items-center"><AlertTriangle className="w-4 h-4 mr-1 text-yellow-500" />Split Logic</CardTitle>
                </CardHeader>
                <CardContent className="p-2 text-xs text-muted-foreground">
                    Currently, all expenses are split equally among selected participants. Uneven splits and currency conversion will be added in a future update.
                </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitExpense} className="bg-primary hover:bg-primary/90 text-primary-foreground">{editingExpenseId ? 'Save Changes' : 'Add Expense'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card">
            <DialogHeader>
                <DialogTitle className="text-primary">Set Budget for {selectedTrip?.name || "Trip"}</DialogTitle>
                <DialogDescription>
                    Enter the total budget for this trip. You'll be alerted if spending exceeds this amount.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Label htmlFor="budgetAmount">Budget Amount ({filteredExpenses.length > 0 ? filteredExpenses[0].currency : 'USD'})</Label>
                <Input 
                    id="budgetAmount" 
                    type="number" 
                    value={budgetInput} 
                    onChange={(e) => setBudgetInput(e.target.value)} 
                    placeholder="e.g., 1000" 
                    className="bg-background"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveBudget} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Budget</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTripId ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-md bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-primary">Total Expenses for {selectedTrip?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalGroupExpense.toFixed(2)} <span className="text-sm text-muted-foreground">{filteredExpenses.length > 0 ? filteredExpenses[0].currency : 'USD'}</span></p>
                <p className="text-xs text-muted-foreground"> (Assumes all expenses are in the first expense's currency or manually converted by user)</p>
              </CardContent>
            </Card>
            <Card className="shadow-md bg-card">
                <CardHeader>
                    <CardTitle className="text-lg text-primary flex items-center"><Target className="mr-2"/>Budget for {selectedTrip?.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    {tripBudget !== null ? (
                        <>
                            <p className="text-2xl font-bold">{tripBudget.toFixed(2)} <span className="text-sm text-muted-foreground">{filteredExpenses.length > 0 ? filteredExpenses[0].currency : 'USD'}</span></p>
                            <Progress value={budgetProgress} className="mt-2 h-3" />
                            <p className="text-xs text-muted-foreground mt-1">
                                Spent: {totalGroupExpense.toFixed(2)} ({budgetProgress.toFixed(1)}%)
                            </p>
                            {totalGroupExpense > tripBudget && (
                                <p className="text-xs text-destructive font-semibold mt-1">Budget exceeded!</p>
                            )}
                        </>
                    ) : (
                        <p className="text-muted-foreground">No budget set yet for this trip.</p>
                    )}
                </CardContent>
                <CardFooter>
                    <Button variant="outline" size="sm" onClick={handleOpenBudgetDialog}>
                        {tripBudget !== null ? 'Edit Budget' : 'Set Budget'}
                    </Button>
                </CardFooter>
            </Card>
            <Card className="shadow-md bg-card md:col-start-3 lg:col-start-auto">
              <CardHeader>
                <CardTitle className="text-lg text-primary">Expenses by Category for {selectedTrip?.name}</CardTitle>
              </CardHeader>
              <CardContent className="h-[200px] pt-0">
                {expenseDataForChart.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                          data={expenseDataForChart}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={60} 
                          labelLine={false}
                          label={({ name, percent }: PieLabelRenderProps) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        >
                          {expenseDataForChart.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-muted-foreground text-center pt-10">No expense data for chart.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8 shadow-lg bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-primary flex items-center"><Users className="mr-2" /> User Balances for {selectedTrip?.name}</CardTitle>
              <CardDescription>Summary of who owes money or is owed money. "Mark as Settled" helps track when debts are cleared.</CardDescription>
            </CardHeader>
            <CardContent>
              {balances.length > 0 ? (
                <ul className="space-y-3">
                  {balances.map(balance => (
                    <li key={balance.userId} className="p-3 rounded-lg border bg-background">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-foreground">{balance.userName}</p>
                          <p className="text-xs text-muted-foreground">Paid: {balance.totalPaid.toFixed(2)}, Share: {balance.totalShare.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${balance.isSettled ? 'text-green-600' : (balance.netBalance >= 0 ? 'text-green-600' : 'text-red-600')}`}>
                            {balance.isSettled 
                                ? <span className="flex items-center justify-end"><CheckCircle className="w-4 h-4 mr-1" />Settled</span>
                                : (balance.netBalance >= 0 
                                    ? `Owed: ${balance.netBalance.toFixed(2)}` 
                                    : `Owes: ${Math.abs(balance.netBalance).toFixed(2)}`)}
                          </p>
                          {balance.netBalance < 0 && !balance.isSettled && (
                            <Button
                              onClick={() => handleMarkAsSettled(balance.userId)}
                              size="sm"
                              variant="outline"
                              className="mt-1 text-xs h-auto py-1 px-2"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Mark as Settled
                            </Button>
                          )}
                          {balance.netBalance > 0 && !balance.isSettled && (
                            <Button
                                onClick={() => toast({ title: "Reminder Sent (Simulation)", description: `A reminder to ${balance.userName} to settle up could be sent here.`})}
                                size="sm"
                                variant="outline"
                                className="mt-1 text-xs h-auto py-1 px-2 border-primary text-primary hover:bg-primary/10"
                            >
                                <Send className="w-3 h-3 mr-1" /> Remind
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No balances to display for this trip. Add some expenses or ensure trip members are correctly loaded!</p>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-primary">All Expenses for {selectedTrip?.name}</h2>
            <Button variant="outline" onClick={handleDownloadReport} disabled={!selectedTripId}>
                <Download className="mr-2 h-4 w-4" /> Download Report
            </Button>
          </div>
          
          {filteredExpenses.length === 0 && (
            <Card className="text-center p-8 shadow-md bg-card">
                <CardHeader>
                <CardTitle className="text-2xl text-muted-foreground">No Expenses Logged for {selectedTrip?.name}</CardTitle>
                </CardHeader>
                <CardContent>
                <CardDescription className="mb-4">
                    Start by adding your first shared expense for this trip!
                </CardDescription>
                <Image 
                    src="https://picsum.photos/seed/empty-expenses-trip/400/250" 
                    alt="Empty Expenses Illustration" 
                    width={400} 
                    height={250} 
                    className="mx-auto rounded-lg shadow-sm"
                    data-ai-hint="finance money"
                />
                </CardContent>
            </Card>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredExpenses.map(expense => {
                const paidByUser = usersInCurrentTrip.find(u => u.id === expense.paidByUserId) || users.find(u => u.id === expense.paidByUserId) ; // Fallback to global users if not in trip (e.g. old data)
                const CategoryIcon = categoryIcons[expense.category] || DollarSign;
                return (
                <Card key={expense.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col bg-card">
                    <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg text-primary flex items-center"><CategoryIcon className="w-5 h-5 mr-2 text-accent" />{expense.description}</CardTitle>
                        <span className="text-xl font-bold text-foreground">{expense.amount.toFixed(2)} <span className="text-xs text-muted-foreground">{expense.currency}</span></span>
                    </div>
                    <CardDescription>Category: {expense.category} | Date: {expense.date}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow text-sm">
                    <p className="text-muted-foreground">Paid by: <span className="font-medium text-foreground">{paidByUser?.name || 'Unknown User'}</span></p>
                    <p className="text-muted-foreground mt-1">Participants: <span className="font-medium text-foreground">{expense.participantIds.map(pid => (usersInCurrentTrip.find(u=>u.id===pid) || users.find(u=>u.id===pid))?.name || 'Unknown').join(', ')}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Split: Equally among participants</p>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="ghost" size="icon" onClick={() => handleEditExpense(expense)} className="text-muted-foreground hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(expense.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    </CardFooter>
                </Card>
                );
            })}
          </div>
        </>
      ) : (
        <Card className="text-center p-8 shadow-md bg-card">
            <CardHeader>
                <CardTitle className="text-2xl text-muted-foreground">No Trip Selected</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription className="mb-4">
                    Please select a trip from the dropdown above to view and manage its expenses.
                </CardDescription>
                <Image 
                    src="https://picsum.photos/seed/select-trip-expenses/400/250" 
                    alt="Select a trip for expenses" 
                    width={400} 
                    height={250} 
                    className="mx-auto rounded-lg shadow-sm"
                    data-ai-hint="travel planning"
                />
            </CardContent>
        </Card>
      )}
      
       <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-md bg-card opacity-70">
              <CardHeader>
                  <CardTitle className="text-lg text-primary flex items-center"><Bell className="mr-2 h-5 w-5"/>Notifications & Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">Real-time notifications for new expenses, payments, overdue alerts and currency conversion are planned for a future update.</p>
                   <p className="mt-2 text-xs text-muted-foreground">Overdue alerts for unsettled balances will also be part of this system.</p>
                   <p className="mt-2 text-xs text-muted-foreground">You will also be notified if trip spending exceeds the set budget.</p>
              </CardContent>
          </Card>
          <Card className="shadow-md bg-card opacity-70">
              <CardHeader>
                  <CardTitle className="text-lg text-primary flex items-center"><DollarSign className="mr-2 h-5 w-5"/>Currency Features</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">Advanced currency conversion and handling multiple currencies for expenses are planned for future enhancements.</p>
              </CardContent>
          </Card>
       </div>

    </div>
  );
}

