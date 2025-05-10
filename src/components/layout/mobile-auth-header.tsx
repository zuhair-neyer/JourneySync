
"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';

export function MobileAuthHeader() {
  const { currentUser, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  // Wait until both isMobile is determined and auth state is resolved
  if (typeof isMobile === 'undefined' || authLoading) {
    // Optionally, only show loader if determined to be mobile and still loading auth
    if (typeof isMobile !== 'undefined' && isMobile && authLoading) {
        return (
            <div className="fixed top-4 right-4 z-50 p-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
        );
    }
    return null; // Don't render anything until isMobile is known and auth isn't loading
  }

  // Conditions to render the auth buttons:
  // 1. It IS mobile view.
  // 2. There is NO current user (user is not logged in).
  if (isMobile && !currentUser) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1 bg-card/80 backdrop-blur-sm p-1 rounded-md shadow-md">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:bg-accent/20 hover:text-primary px-2 py-1"
          asChild
        >
          <Link href="/login">
            <LogIn className="mr-1 h-4 w-4" />
            Log In
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:bg-accent/20 hover:text-primary px-2 py-1"
          asChild
        >
          <Link href="/signup">
            <UserPlus className="mr-1 h-4 w-4" />
            Sign Up
          </Link>
        </Button>
      </div>
    );
  }

  return null; // Otherwise, don't render anything
}
