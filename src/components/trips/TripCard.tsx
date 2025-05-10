
"use client";

import React from 'react';
import type { UserTripInfo } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaneTakeoff, Users, Edit } from 'lucide-react';
import { useTripContext } from '@/contexts/TripContext';

interface TripCardProps {
  tripInfo: UserTripInfo;
}

export function TripCard({ tripInfo }: TripCardProps) {
  const { setSelectedTripId, selectedTrip } = useTripContext();
  const isSelected = selectedTrip?.id === tripInfo.id;

  // In a real app, you might fetch member count or other details
  // For now, we'll just show the role.

  const handleSelectTrip = () => {
    setSelectedTripId(tripInfo.id);
  };

  return (
    <Card className={`shadow-md hover:shadow-lg transition-shadow ${isSelected ? 'border-primary ring-2 ring-primary' : 'bg-card'}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg text-primary flex items-center">
            <PlaneTakeoff className="w-5 h-5 mr-2 text-accent" />
            {tripInfo.name}
          </CardTitle>
          {/* Placeholder for member count or edit button */}
          {/* <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Edit className="h-4 w-4" />
          </Button> */}
        </div>
        <CardDescription>Role: {tripInfo.role}</CardDescription>
      </CardHeader>
      {/* <CardContent>
         <p className="text-sm text-muted-foreground flex items-center"><Users className="w-4 h-4 mr-1 text-muted-foreground" /> X members</p> 
      </CardContent> */}
      <CardFooter>
        <Button 
          onClick={handleSelectTrip} 
          variant={isSelected ? "default" : "outline"} 
          className="w-full"
          disabled={isSelected}
        >
          {isSelected ? "Selected" : "View Details"}
        </Button>
      </CardFooter>
    </Card>
  );
}
