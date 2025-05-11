
"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, UserPlus, UserCircle, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AuthStatus() {
  const { currentUser, loading, logOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2 text-sidebar-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (currentUser) {
    const displayName = currentUser.displayName || currentUser.email;
    const fallbackInitial = displayName ? displayName[0].toUpperCase() : <UserCircle size={16}/>;

    return (
      <div className="flex flex-col items-start space-y-2 p-2">
        <div className="flex items-center gap-2 text-sm text-sidebar-foreground">
          <Avatar className="h-8 w-8">
            {currentUser.photoURL && <AvatarImage src={currentUser.photoURL} alt={displayName || 'User'} />}
            <AvatarFallback>
              {fallbackInitial}
            </AvatarFallback>
          </Avatar>
          <span className="truncate" title={displayName || undefined}>{displayName}</span>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={logOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1 p-2">
      <Button
        variant="ghost"
        className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        asChild
      >
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" />
          Log In
        </Link>
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        asChild
      >
        <Link href="/signup">
          <UserPlus className="mr-2 h-4 w-4" />
          Sign Up
        </Link>
      </Button>
    </div>
  );
}

