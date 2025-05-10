
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, MapPin, Sparkles, Luggage, UsersRound, Home, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/itinerary", label: "Itinerary", icon: ListChecks },
  { href: "/map", label: "Map", icon: MapPin },
  { href: "/recommendations", label: "Recommendations", icon: Sparkles },
  { href: "/packing-list", label: "Packing List", icon: Luggage },
  { href: "/polls", label: "Group Polls", icon: UsersRound },
  { href: "/expenses", label: "Expenses", icon: DollarSign },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu className="p-2">
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              className={cn(
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:bg-sidebar-accent focus:text-sidebar-accent-foreground",
                pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
              )}
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">
                {item.label}
              </span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}


    