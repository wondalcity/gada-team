import * as React from "react";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";

export interface AppLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  topNavVariant?: "transparent" | "white";
}

export function AppLayout({
  children,
  showBottomNav = true,
  topNavVariant = "white",
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <TopNav variant={topNavVariant} />
      <main className="pb-16 lg:pb-0">{children}</main>
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}
