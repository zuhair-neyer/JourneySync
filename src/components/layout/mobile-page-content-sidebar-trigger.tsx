
"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeftOpen } from "lucide-react"; 

export function MobilePageContentSidebarTrigger() {
  const { openMobile, isMobile, toggleSidebar } = useSidebar();

  // Only show the button if it's mobile view AND the mobile sidebar is closed.
  if (!isMobile || openMobile) {
    return null; 
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="fixed top-4 left-4 z-50 bg-card/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground text-primary shadow-md md:hidden" // Ensures it's only on mobile
      aria-label="Open sidebar"
    >
      <PanelLeftOpen className="h-5 w-5" />
    </Button>
  );
}
