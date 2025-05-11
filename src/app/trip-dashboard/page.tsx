"use client";

import React, { useEffect } from 'react';
import { useTripContext } from '@/contexts/TripContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Users, CalendarDays, DollarSign, ListChecks, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function TripDashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { selectedTrip, isLoadingSelectedTrip, selectedTripId, errorSelectedTrip, setSelectedTripId } = useTripContext();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  if (authLoading || (!currentUser && !isLoadingSelectedTrip && !selectedTripId) ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading dashboard...</p>
      </div>
    );
  }

  if (!selectedTripId) {
    return (
        <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-semibold mb-2">No Trip Selected</h1>
            <p className="text-muted-foreground mb-6">Please select a trip from your list to view its dashboard.</p>
            <Button onClick={() => router.push('/trips')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Go to My Trips
            </Button>
        </div>
    );
  }

  if (isLoadingSelectedTrip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading trip details...</p>
      </div>
    );
  }

  if (errorSelectedTrip) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Error Loading Trip</h1>
        <p className="text-muted-foreground mb-6">{errorSelectedTrip}</p>
        <Button onClick={() => router.push('/trips')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Trips
        </Button>
      </div>
    );
  }

  if (!selectedTrip) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Trip Not Found</h1>
        <p className="text-muted-foreground mb-6">The selected trip (ID: {selectedTripId}) could not be found. It might have been deleted.</p>
        <Button onClick={() => { setSelectedTripId(null); router.push('/trips'); }}>
             <ArrowLeft className="mr-2 h-4 w-4" /> Go to My Trips
        </Button>
      </div>
    );
  }

  const creator = selectedTrip.members[selectedTrip.createdBy];
  const memberCount = Object.keys(selectedTrip.members).length;
  const creatorName = creator?.name || creator?.email || `User...${selectedTrip.createdBy.substring(selectedTrip.createdBy.length -4)}`;


  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <Button variant="outline" size="sm" onClick={() => router.push('/trips')} className="mb-4 print:hidden">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Trips
            </Button>
            <h1 className="text-4xl font-bold text-primary">{selectedTrip.name}</h1>
            <p className="text-muted-foreground">
                Created by {creatorName} on {new Date(selectedTrip.createdAt).toLocaleDateString()}
            </p>
        </div>
        <Image
            src={`https://picsum.photos/seed/${selectedTrip.id}/300/200`}
            alt={`Image for ${selectedTrip.name}`}
            width={300}
            height={200}
            className="rounded-lg shadow-md object-cover"
            data-ai-hint="travel landscape"
        />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberCount}</div>
            <ul className="text-xs text-muted-foreground list-disc pl-4 mt-1 max-h-20 overflow-y-auto scrollbar-thin">
                {Object.values(selectedTrip.members).map(member => (
                    <li key={member.uid} className="truncate" title={member.name || member.email || `User...${member.uid.substring(member.uid.length - 4)}`}>
                        {member.name || member.email || `User...${member.uid.substring(member.uid.length - 4)}`}
                    </li>
                ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trip Created</CardTitle>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Date(selectedTrip.createdAt).toLocaleDateString()}</div>
            <p className="text-xs text-muted-foreground">
              {new Date(selectedTrip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </CardContent>
        </Card>

         <Card className="shadow-md lg:col-span-1 md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
                <Link href="/itinerary" passHref>
                    <Button variant="outline" className="w-full justify-start">
                        <ListChecks className="mr-2 h-4 w-4 text-accent"/> View Full Itinerary
                    </Button>
                </Link>
                 <Link href="/expenses" passHref>
                    <Button variant="outline" className="w-full justify-start">
                        <DollarSign className="mr-2 h-4 w-4 text-accent"/> Manage Expenses
                    </Button>
                </Link>
                 <Link href="/polls" passHref>
                    <Button variant="outline" className="w-full justify-start">
                        <Users className="mr-2 h-4 w-4 text-accent"/> View Polls
                    </Button>
                </Link>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl text-primary">Itinerary Overview</CardTitle>
                <CardDescription>A quick look at your planned activities. (Full details in Itinerary section)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-8">
                    <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
                    <p className="text-muted-foreground">Itinerary highlights will be shown here.</p>
                    <p className="text-xs text-muted-foreground mt-1">This section will show upcoming events once the itinerary feature is fully integrated with trip data.</p>
                     <Link href="/itinerary" passHref>
                        <Button variant="secondary" className="mt-4">Go to Itinerary</Button>
                    </Link>
                </div>
            </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl text-primary">Expense Summary</CardTitle>
                <CardDescription>A snapshot of your trip's finances. (Full details in Expenses section)</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
                    <p className="text-muted-foreground">Expense summary will be shown here.</p>
                    <p className="text-xs text-muted-foreground mt-1">This section will display key financial figures once the expenses feature is fully integrated with trip data.</p>
                    <Link href="/expenses" passHref>
                        <Button variant="secondary" className="mt-4">Go to Expenses</Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl text-primary">Trip Members</CardTitle>
        </CardHeader>
        <CardContent>
            {selectedTrip.members && Object.keys(selectedTrip.members).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.values(selectedTrip.members).map(member => (
                    <Card key={member.uid} className="bg-secondary/30 p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                            <Image 
                                src={`https://picsum.photos/seed/${member.uid}/40/40`} 
                                alt={member.name || "User avatar"} 
                                width={40} 
                                height={40} 
                                className="rounded-full" 
                                data-ai-hint="person avatar" 
                            />
                            <div>
                                <p className="font-semibold text-foreground text-sm truncate" title={member.name || member.email || `User...${member.uid.substring(member.uid.length - 4)}`}>
                                    {member.name || member.email || `User...${member.uid.substring(member.uid.length - 4)}`}
                                </p>
                                <p className="text-xs text-muted-foreground truncate" title={member.email || "No email"}>{member.email || "No email provided"}</p>
                            </div>
                        </div>
                    </Card>
                ))}
                </div>
            ) : (
                <p className="text-muted-foreground">No members listed for this trip yet.</p>
            )}
        </CardContent>
      </Card>

    </div>
  );
}
