
"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeftOpen } from "lucide-react"; 

export function PageContentSidebarTrigger() {
  const { open, isMobile, toggleSidebar } = useSidebar();

  // Only show the button if the sidebar is closed and not on a mobile view
  if (open || isMobile) {
    return null; 
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="fixed top-4 left-4 z-50 bg-card/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground text-primary shadow-md"
      aria-label="Open sidebar"
    >
      <PanelLeftOpen className="h-5 w-5" />
    </Button>
  );
}
