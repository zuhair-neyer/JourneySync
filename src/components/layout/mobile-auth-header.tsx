
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
            <div className="fixed top-4 right-4 z-50 p-1">
                <Button variant="ghost" size="icon-circular" className="text-primary bg-card/80 backdrop-blur-sm shadow-md" disabled>
                    <Loader2 className="h-6 w-6 animate-spin" />
                </Button>
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
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-transparent">
        <Button
          variant="ghost"
          size="icon-circular"
          className="text-primary hover:bg-accent/20 hover:text-primary bg-card/80 backdrop-blur-sm shadow-md"
          asChild
          aria-label="Log In"
        >
          <Link href="/login">
            <LogIn className="h-5 w-5" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-circular"
          className="text-primary hover:bg-accent/20 hover:text-primary bg-card/80 backdrop-blur-sm shadow-md"
          asChild
          aria-label="Sign Up"
        >
          <Link href="/signup">
            <UserPlus className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    );
  }

  return null; // Otherwise, don't render anything
}

