
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlusCircle, Edit2, Trash2, Users, DollarSign, CalendarDays, Landmark, Car, Utensils, Palette, AlertTriangle, Bell, CreditCard, CheckCircle, Send, Target, PieChart as LucidePieChartIcon, Filter, Loader2, Settings } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useTripContext } from '@/contexts/TripContext';
import Image from 'next/image';
import { Pie, Cell, PieLabelRenderProps, PieChart, ResponsiveContainer, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import type { Expense } from '@/types';
import { Separator } from '@/components/ui/separator';
import { addExpenseToDb, getExpensesForTripFromDb, updateExpenseInDb, deleteExpenseFromDb } from '@/firebase/tripService';


interface User {
  id: string;
  name: string;
  email?: string | null;
}

interface Balance {
  userId: string;
  userName: string;
  netBalance: number; 
  totalPaid: number;
  totalShare: number;
  isSettled: boolean;
}

const expenseCategories = ["Food", "Transport", "Accommodation", "Activities", "Shopping", "Miscellaneous"];
const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "INR"];
const BASE_APP_CURRENCY = 'USD';

const MOCK_RATES: Record<string, number> = {
  'EUR_USD': 1.08, 'GBP_USD': 1.27, 'JPY_USD': 0.0064, 'CAD_USD': 0.73, 'INR_USD': 0.012,
  'USD_EUR': 0.92, 'USD_GBP': 0.79, 'USD_JPY': 157.0, 'USD_CAD': 1.37, 'USD_INR': 83.0,
};

const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
  if (fromCurrency === toCurrency) return amount;

  let amountInBase = amount;
  // Step 1: Convert 'fromCurrency' to BASE_APP_CURRENCY
  if (fromCurrency !== BASE_APP_CURRENCY) {
    const rateKey = `${fromCurrency}_${BASE_APP_CURRENCY}`;
    const rate = MOCK_RATES[rateKey];
    if (rate !== undefined) {
      amountInBase = amount * rate;
    } else {
      console.warn(`Rate from ${fromCurrency} to ${BASE_APP_CURRENCY} not found. Cannot convert.`);
      return amount; 
    }
  }

  // Step 2: Convert amount from BASE_APP_CURRENCY to 'toCurrency'
  if (toCurrency === BASE_APP_CURRENCY) {
    return amountInBase;
  }

  const rateKeyToTarget = `${BASE_APP_CURRENCY}_${toCurrency}`;
  const rateTo = MOCK_RATES[rateKeyToTarget];
  if (rateTo !== undefined) {
    return amountInBase * rateTo;
  } else {
    console.warn(`Rate from ${BASE_APP_CURRENCY} to ${toCurrency} not found. Returning amount in base currency.`);
    return amountInBase; 
  }
};


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
  
  const [users, setUsers] = useState<User[]>([]); 
  const [expensesForSelectedTrip, setExpensesForSelectedTrip] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Partial<Expense>>({ currency: currencies[0], category: expenseCategories[0] });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [totalGroupExpense, setTotalGroupExpense] = useState(0); // This will be in BASE_APP_CURRENCY
  const [settledStatus, setSettledStatus] = useState<Record<string, boolean>>({});

  const [tripBudget, setTripBudget] = useState<number | null>(null); // Stored in BASE_APP_CURRENCY
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState<string>("");

  const [displayCurrency, setDisplayCurrency] = useState<string>(currencies[0]);


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
  }, [currentUser]); 

  const fetchTripExpenses = useCallback(async () => {
    if (selectedTripId) {
      setIsLoadingExpenses(true);
      try {
        const fetchedExpenses = await getExpensesForTripFromDb(selectedTripId);
        setExpensesForSelectedTrip(fetchedExpenses);
      } catch (error) {
        console.error("Failed to fetch expenses:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load expenses for this trip." });
        setExpensesForSelectedTrip([]);
      } finally {
        setIsLoadingExpenses(false);
      }
    } else {
      setExpensesForSelectedTrip([]); 
    }
  }, [selectedTripId, toast]);

  useEffect(() => {
    fetchTripExpenses();
  }, [fetchTripExpenses]);


  const usersInCurrentTrip = useMemo(() => {
    if (selectedTrip && selectedTrip.members) {
      return Object.values(selectedTrip.members).map(member => {
        const fullUser = users.find(u => u.id === member.uid); 
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
    const activeUsers = usersInCurrentTrip;
    const currentExpenses = expensesForSelectedTrip;

    if (!selectedTripId || activeUsers.length === 0) {
      setBalances([]);
      setTotalGroupExpense(0);
      return;
    }

    let newTotalGroupExpenseInBase = 0;
    const userExpensesSummary: { [userId: string]: { paid: number; share: number } } = {}; // All values in BASE_APP_CURRENCY

    activeUsers.forEach(user => {
      userExpensesSummary[user.id] = { paid: 0, share: 0 };
    });

    currentExpenses.forEach(expense => {
      const amountInBaseCurrency = convertCurrency(expense.amount, expense.currency, BASE_APP_CURRENCY);
      newTotalGroupExpenseInBase += amountInBaseCurrency;

      if (userExpensesSummary[expense.paidByUserId] && activeUsers.some(u => u.id === expense.paidByUserId)) {
        userExpensesSummary[expense.paidByUserId].paid += amountInBaseCurrency;
      }

      const participantsInExpenseForThisTrip = expense.participantIds.filter(pid => activeUsers.some(u => u.id === pid));
      const numParticipants = participantsInExpenseForThisTrip.length;

      if (numParticipants > 0) {
        const sharePerParticipantInBase = amountInBaseCurrency / numParticipants;
        participantsInExpenseForThisTrip.forEach(pid => {
          if (userExpensesSummary[pid]) { 
            userExpensesSummary[pid].share += sharePerParticipantInBase;
          }
        });
      }
    });

    const newBalances: Balance[] = activeUsers.map(user => ({
      userId: user.id,
      userName: user.name,
      totalPaid: userExpensesSummary[user.id]?.paid || 0, // in BASE_APP_CURRENCY
      totalShare: userExpensesSummary[user.id]?.share || 0, // in BASE_APP_CURRENCY
      netBalance: (userExpensesSummary[user.id]?.paid || 0) - (userExpensesSummary[user.id]?.share || 0), // in BASE_APP_CURRENCY
      isSettled: settledStatus[user.id] || false,
    }));

    setBalances(newBalances);
    setTotalGroupExpense(newTotalGroupExpenseInBase); // Stored in BASE_APP_CURRENCY
  }, [expensesForSelectedTrip, usersInCurrentTrip, settledStatus, selectedTripId]);

  useEffect(() => {
    calculateBalancesAndTotal();
  }, [calculateBalancesAndTotal]); 

  useEffect(() => {
    if (tripBudget !== null && totalGroupExpense > tripBudget && selectedTripId) { // Both are in BASE_APP_CURRENCY
      const totalExpenseForDisplay = convertCurrency(totalGroupExpense, BASE_APP_CURRENCY, displayCurrency);
      const budgetForDisplay = convertCurrency(tripBudget, BASE_APP_CURRENCY, displayCurrency);
      toast({
        variant: "destructive",
        title: "Budget Exceeded",
        description: `The group has spent ${totalExpenseForDisplay.toFixed(2)} ${displayCurrency} for trip "${selectedTrip?.name || 'this trip'}", exceeding the budget of ${budgetForDisplay.toFixed(2)} ${displayCurrency}.`,
      });
    }
  }, [totalGroupExpense, tripBudget, toast, selectedTripId, selectedTrip?.name, displayCurrency]);


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

  const handleSubmitExpense = async () => {
    if (!selectedTripId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a trip before adding an expense." });
      return;
    }
    if (!currentExpense.description || !currentExpense.amount || !currentExpense.paidByUserId || !currentExpense.date || !currentExpense.category || !currentExpense.currency || (currentExpense.participantIds || []).length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please fill all required fields and select participants." });
      return;
    }

    const expenseDataToSave: Omit<Expense, 'id' | 'tripId'> = {
      description: currentExpense.description,
      amount: currentExpense.amount,
      currency: currentExpense.currency!,
      category: currentExpense.category!,
      paidByUserId: currentExpense.paidByUserId,
      date: currentExpense.date,
      participantIds: currentExpense.participantIds!,
    };
    
    let success = false;
    if (editingExpenseId) {
      success = await updateExpenseInDb(selectedTripId, editingExpenseId, expenseDataToSave);
      if (success) toast({ title: "Success", description: "Expense updated." });
    } else {
      const newExpenseId = await addExpenseToDb(selectedTripId, expenseDataToSave);
      if (newExpenseId) {
        success = true;
        toast({ title: "Success", description: "Expense added." });
      }
    }

    if (success) {
      fetchTripExpenses(); 
      setIsExpenseDialogOpen(false);
      setCurrentExpense({ currency: currencies[0], category: expenseCategories[0], participantIds: usersInCurrentTrip.map(u => u.id) }); 
      setEditingExpenseId(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Failed to ${editingExpenseId ? 'update' : 'add'} expense.` });
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setCurrentExpense(expense);
    setEditingExpenseId(expense.id);
    setIsExpenseDialogOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!selectedTripId) return;
    const success = await deleteExpenseFromDb(selectedTripId, id);
    if (success) {
      toast({ title: "Success", description: "Expense deleted." });
      fetchTripExpenses(); 
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete expense." });
    }
  };

  const openNewExpenseDialog = () => {
     if (!selectedTripId) {
      toast({ variant: "destructive", title: "Select a Trip", description: "Please select a trip first to add an expense to it." });
      return;
    }
    setCurrentExpense({ currency: currencies[0], category: expenseCategories[0], participantIds: usersInCurrentTrip.map(u => u.id), date: new Date().toISOString().split('T')[0], tripId: selectedTripId });
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
    // If tripBudget (in BASE_APP_CURRENCY) exists, convert it to string for input. Otherwise, empty.
    setBudgetInput(tripBudget !== null ? tripBudget.toString() : "");
    setIsBudgetDialogOpen(true);
  };

  const handleSaveBudget = () => {
    const newBudgetInBase = parseFloat(budgetInput); // Input is taken as BASE_APP_CURRENCY
    if (isNaN(newBudgetInBase) || newBudgetInBase < 0) {
      toast({ variant: "destructive", title: "Invalid Budget", description: "Please enter a valid positive number for the budget." });
      return;
    }
    setTripBudget(newBudgetInBase); 
    const budgetForDisplay = convertCurrency(newBudgetInBase, BASE_APP_CURRENCY, displayCurrency);
    toast({ title: "Success", description: `Budget for trip "${selectedTrip?.name}" set to ${budgetForDisplay.toFixed(2)} ${displayCurrency}.` });
    setIsBudgetDialogOpen(false);
  };

  const expenseDataForChart = expenseCategories.map(category => {
    const totalForCategoryInBase = expensesForSelectedTrip
      .filter(exp => exp.category === category)
      .reduce((sum, exp) => sum + convertCurrency(exp.amount, exp.currency, BASE_APP_CURRENCY), 0);
    return {
      name: category,
      total: totalForCategoryInBase, // This total is in BASE_APP_CURRENCY
      fill: categoryColors[category] || 'hsl(var(--muted))',
    };
  }).filter(item => item.total > 0);
  
  const chartConfig: ChartConfig = expenseCategories.reduce((config, category) => {
    const IconComponent = categoryIcons[category];
    config[category] = {
      label: category,
      color: categoryColors[category] || 'hsl(var(--muted))',
      icon: IconComponent ? IconComponent : undefined
    };
    return config;
  }, {} as ChartConfig);

  const budgetProgress = tripBudget && tripBudget > 0 ? (totalGroupExpense / tripBudget) * 100 : 0; // Both in BASE_APP_CURRENCY

  const totalGroupExpenseForDisplay = convertCurrency(totalGroupExpense, BASE_APP_CURRENCY, displayCurrency);
  const tripBudgetForDisplay = tripBudget !== null ? convertCurrency(tripBudget, BASE_APP_CURRENCY, displayCurrency) : null;

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
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
              <Label htmlFor="description" className="sm:text-right sm:col-span-1">Description <span className="text-destructive">*</span></Label>
              <Input id="description" name="description" value={currentExpense.description || ''} onChange={handleInputChange} className="sm:col-span-3 bg-background" placeholder="e.g., Lunch with team" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
              <Label htmlFor="amount" className="sm:text-right sm:col-span-1">Amount <span className="text-destructive">*</span></Label>
              <Input id="amount" name="amount" type="number" value={currentExpense.amount || ''} onChange={handleInputChange} className="sm:col-span-3 bg-background" placeholder="e.g., 50.00" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
              <Label htmlFor="currency" className="sm:text-right sm:col-span-1">Currency <span className="text-destructive">*</span></Label>
              <Select name="currency" value={currentExpense.currency} onValueChange={handleSelectChange('currency')}>
                <SelectTrigger className="sm:col-span-3 bg-background"><SelectValue placeholder="Select currency" /></SelectTrigger>
                <SelectContent>
                  {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
              <Label htmlFor="category" className="sm:text-right sm:col-span-1">Category <span className="text-destructive">*</span></Label>
              <Select name="category" value={currentExpense.category} onValueChange={handleSelectChange('category')}>
                <SelectTrigger className="sm:col-span-3 bg-background"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
              <Label htmlFor="paidByUserId" className="sm:text-right sm:col-span-1">Paid By <span className="text-destructive">*</span></Label>
              <Select name="paidByUserId" value={currentExpense.paidByUserId} onValueChange={handleSelectChange('paidByUserId')}>
                <SelectTrigger className="sm:col-span-3 bg-background"><SelectValue placeholder="Select who paid" /></SelectTrigger>
                <SelectContent>
                  {usersInCurrentTrip.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
              <Label htmlFor="date" className="sm:text-right sm:col-span-1">Date <span className="text-destructive">*</span></Label>
              <Input id="date" name="date" type="date" value={currentExpense.date || ''} onChange={handleInputChange} className="sm:col-span-3 bg-background"/>
            </div>
            
            <Separator className="my-2" />

            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-x-4 gap-y-2">
              <Label className="sm:text-right sm:col-span-1 pt-2">Participants <span className="text-destructive">*</span></Label>
              <div className="sm:col-span-3 space-y-2">
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
                 <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentExpense(prev => ({...prev, participantIds: usersInCurrentTrip.map(u => u.id)}))}>Select All</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentExpense(prev => ({...prev, participantIds: []}))}>Deselect All</Button>
                 </div>
              </div>
            </div>
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
                    Enter the total budget for this trip in {BASE_APP_CURRENCY}. You'll be alerted if spending exceeds this amount.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Label htmlFor="budgetAmount">Budget Amount ({BASE_APP_CURRENCY})</Label>
                <Input 
                    id="budgetAmount" 
                    type="number" 
                    value={budgetInput} 
                    onChange={(e) => setBudgetInput(e.target.value)} 
                    placeholder={`e.g., 1000 ${BASE_APP_CURRENCY}`}
                    className="bg-background"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveBudget} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Budget</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card className="mb-8 shadow-md bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-primary flex items-center"><Settings className="mr-2 h-5 w-5" /> Display Options</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="displayCurrencySelect">View financial summaries in:</Label>
          <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
            <SelectTrigger id="displayCurrencySelect" className="w-full md:w-[200px] bg-background mt-1">
              <SelectValue placeholder="Select display currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>


      {selectedTripId ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-md bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-primary">Total Expenses for {selectedTrip?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalGroupExpenseForDisplay.toFixed(2)} <span className="text-sm text-muted-foreground">{displayCurrency}</span></p>
                <p className="text-xs text-muted-foreground"> (Calculations in {BASE_APP_CURRENCY}, displayed in {displayCurrency})</p>
              </CardContent>
            </Card>
            <Card className="shadow-md bg-card">
                <CardHeader>
                    <CardTitle className="text-lg text-primary flex items-center"><Target className="mr-2"/>Budget for {selectedTrip?.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    {tripBudgetForDisplay !== null ? (
                        <>
                            <p className="text-2xl font-bold">{tripBudgetForDisplay.toFixed(2)} <span className="text-sm text-muted-foreground">{displayCurrency}</span></p>
                            <Progress value={budgetProgress} className="mt-2 h-3" />
                            <p className="text-xs text-muted-foreground mt-1">
                                Spent: {totalGroupExpenseForDisplay.toFixed(2)} {displayCurrency} ({budgetProgress.toFixed(1)}%)
                            </p>
                            {tripBudget !== null && totalGroupExpense > tripBudget && ( // Comparison in BASE_APP_CURRENCY
                                <p className="text-xs text-destructive font-semibold mt-1">Budget exceeded!</p>
                            )}
                        </>
                    ) : (
                        <p className="text-muted-foreground">No budget set yet for this trip (in {BASE_APP_CURRENCY}).</p>
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
                 {isLoadingExpenses ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : expenseDataForChart.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <ChartTooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  const convertedValue = convertCurrency(data.total, BASE_APP_CURRENCY, displayCurrency);
                                  return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                                            {data.name}
                                          </span>
                                          <span className="font-bold text-foreground">
                                            {convertedValue.toFixed(2)} {displayCurrency}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                        />
                        <Pie
                          data={expenseDataForChart} // dataKey 'total' is in BASE_APP_CURRENCY
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
              <CardDescription>Summary of who owes money or is owed money (in {displayCurrency}). "Mark as Settled" helps track when debts are cleared.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingExpenses ? (
                 <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
              ) : balances.length > 0 ? (
                <ul className="space-y-3">
                  {balances.map(balance => {
                    const totalPaidForDisplay = convertCurrency(balance.totalPaid, BASE_APP_CURRENCY, displayCurrency);
                    const totalShareForDisplay = convertCurrency(balance.totalShare, BASE_APP_CURRENCY, displayCurrency);
                    const netBalanceForDisplay = convertCurrency(balance.netBalance, BASE_APP_CURRENCY, displayCurrency);
                    return (
                      <li key={balance.userId} className="p-3 rounded-lg border bg-background">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-foreground">{balance.userName}</p>
                            <p className="text-xs text-muted-foreground">Paid: {totalPaidForDisplay.toFixed(2)} {displayCurrency}, Share: {totalShareForDisplay.toFixed(2)} {displayCurrency}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${balance.isSettled ? 'text-green-600' : (netBalanceForDisplay >= 0 ? 'text-green-600' : 'text-red-600')}`}>
                              {balance.isSettled 
                                  ? <span className="flex items-center justify-end"><CheckCircle className="w-4 h-4 mr-1" />Settled</span>
                                  : (netBalanceForDisplay >= 0 
                                      ? `Owed: ${netBalanceForDisplay.toFixed(2)} ${displayCurrency}` 
                                      : `Owes: ${Math.abs(netBalanceForDisplay).toFixed(2)} ${displayCurrency}`)}
                            </p>
                            {netBalanceForDisplay < 0 && !balance.isSettled && (
                              <Button
                                onClick={() => handleMarkAsSettled(balance.userId)}
                                size="sm"
                                variant="outline"
                                className="mt-1 text-xs h-auto py-1 px-2"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> Mark as Settled
                              </Button>
                            )}
                            {netBalanceForDisplay > 0 && !balance.isSettled && (
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
                    );
                  })}
                </ul>
              ) : (
                <p className="text-muted-foreground">No balances to display for this trip. Add some expenses or ensure trip members are correctly loaded!</p>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-primary">All Expenses for {selectedTrip?.name}</h2>
             {/* Download Report Button Removed */}
          </div>
          
          {isLoadingExpenses ? (
            <div className="flex items-center justify-center py-8">
                 <Loader2 className="h-10 w-10 animate-spin text-primary" />
                 <p className="ml-3 text-muted-foreground">Loading expenses...</p>
            </div>
          ) : expensesForSelectedTrip.length === 0 ? (
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
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {expensesForSelectedTrip.map(expense => {
                    const paidByUser = usersInCurrentTrip.find(u => u.id === expense.paidByUserId) || users.find(u => u.id === expense.paidByUserId) ; 
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
          )}
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
      
       {/* Removed Notification & Currency Feature Cards */}
    </div>
  );
}
