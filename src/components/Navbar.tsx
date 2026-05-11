import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Ticket, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground glow-neon">
            <Ticket className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">PULSE<span className="text-primary">.</span></span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link to="/events">
            <Button variant="ghost" size="sm" className={loc.pathname.startsWith("/events") ? "text-primary" : ""}>Events</Button>
          </Link>
          {user && (
            <Link to="/my-tickets">
              <Button variant="ghost" size="sm" className={loc.pathname === "/my-tickets" ? "text-primary" : ""}>My Tickets</Button>
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className={loc.pathname.startsWith("/admin") ? "text-primary" : ""}>
                <LayoutDashboard className="mr-1.5 h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
          {user ? (
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
              <LogOut className="mr-1.5 h-4 w-4" /> Sign out
            </Button>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="glow-neon">
                <UserIcon className="mr-1.5 h-4 w-4" /> Sign in
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
