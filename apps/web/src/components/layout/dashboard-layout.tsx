import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import {
  Activity,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userType: "validator" | "client";
}

export default function DashboardLayout({
  children,
  userType,
}: DashboardLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // notifications state & seen tracking
  const [notifications, setNotifications] = useState<string[]>([]);
  const seenSites = useRef<Set<string>>(new Set());

  // handle resize
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close sidebar on mobile route change
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // open WS & listen for first‐ping and high‐latency
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://api.deepfry.tech/ws`);

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const payload = msg.data ?? msg;
        const url: string = payload.url;
        const rt: number | undefined =
          payload.responseTime ?? payload.latency;

        // first ping
        if (!seenSites.current.has(url)) {
          seenSites.current.add(url);
          setNotifications((prev) => [
            `✅ First ping for ${url}`,
            ...prev,
          ]);
        }
        // latency spike
        if (rt !== undefined && rt > 200) {
          setNotifications((prev) => [
            `⚠️ High latency (${rt} ms) for ${url}`,
            ...prev,
          ]);
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      setNotifications((prev) => [
        `❌ WebSocket error`,
        ...prev,
      ]);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItems = [
    {
      name: "Dashboard",
      href:
        userType === "validator"
          ? "/validator-dashboard"
          : "/client-dashboard",
      icon: <LayoutDashboard className="w-5 h-5 text-foreground" />,
    },
    {
      name: "Settings",
      href:
        userType === "validator"
          ? "/validator-dashboard/settings"
          : "/client-dashboard/settings",
      icon: <Settings className="w-5 h-5 text-foreground" />,
    },
  ];

  // sidebar JSX
  const renderSidebar = () => (
    <TooltipProvider>
      <div
        className={
          isMobile
            ? `fixed top-0 left-0 h-full w-64 bg-card border-r z-40 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `h-full flex flex-col bg-card border-r transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} shadow-lg`
        }
        style={isMobile ? { boxShadow: sidebarOpen ? '0 0 0 9999px rgba(0,0,0,0.3)' : 'none' } : {}}
        onClick={isMobile ? () => setSidebarOpen(false) : undefined}
      >
        {/* Header */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center py-4' : 'justify-between p-6'}`}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link to="/" className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                {!sidebarCollapsed && (
                  <span className="text-xl font-bold text-foreground">DeepFry</span>
                )}
              </Link>
            </TooltipTrigger>
            {sidebarCollapsed && <TooltipContent side="right">DeepFry</TooltipContent>}
          </Tooltip>
          {/* Desktop collapse/expand toggle */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className={`ml-2 border border-border rounded-full p-1 ${sidebarCollapsed ? 'bg-muted' : ''}`}
              onClick={e => { e.stopPropagation(); setSidebarCollapsed((v) => !v); }}
              tabIndex={0}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          )}
        </div>
        {/* Nav */}
        <nav className={`flex-1 ${sidebarCollapsed ? 'flex flex-col items-center justify-center gap-2' : 'px-3 py-2 space-y-1'}`}>
          {menuItems.map((item) => (
            <Tooltip key={item.name} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={item.href}
                  className={cn(
                    `flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md text-sm transition-colors`,
                    window.location.pathname === item.href ||
                      window.location.pathname + "/" === item.href
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 text-foreground hover:text-foreground"
                  )}
                  onClick={isMobile ? () => setSidebarOpen(false) : undefined}
                >
                  {item.icon}
                  {!sidebarCollapsed && item.name}
                </Link>
              </TooltipTrigger>
              {sidebarCollapsed && <TooltipContent side="right">{item.name}</TooltipContent>}
            </Tooltip>
          ))}
        </nav>
        {/* Status & Details */}
        {!sidebarCollapsed && (
          <div className="mt-6 px-3">
            <div className="border rounded-md p-4 text-center">
              <div className="text-sm font-medium text-foreground mb-2">
                {userType === "validator" ? "Validator Status" : "Website Status"}
              </div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-sm text-foreground">All systems online</span>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link
                  to={
                    userType === "validator"
                      ? "/validator-dashboard"
                      : "/client-dashboard"
                  }
                >
                  View Details
                </Link>
              </Button>
            </div>
          </div>
        )}
        {/* Avatar & user info at bottom */}
        <div className={`mt-auto border-t flex items-center ${sidebarCollapsed ? 'justify-center p-4' : 'gap-4 p-4'}`}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Avatar>
                <img
                  src="/user2.avif"
                  alt="User avatar"
                  className="rounded-full object-cover w-full h-full"
                />
                <AvatarFallback>
                  {user?.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            {sidebarCollapsed && <TooltipContent side="right">{user?.email}</TooltipContent>}
          </Tooltip>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email}
              </p>
              <p className="text-xs text-secondary-foreground capitalize">
                {userType}
              </p>
            </div>
          )}
          <Button size="icon" variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 text-foreground" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );

  // notifications dropdown
  const NotificationsMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-foreground" />
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-60 overflow-auto">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
        ) : (
          notifications.map((note, i) => (
            <DropdownMenuItem key={i} className="whitespace-normal">
              {note}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // HEADER with toggle button
  const renderHeader = () => (
    <header className="border-b px-4 py-3 flex items-center justify-between bg-background z-10 sticky top-0">
      <div className="flex items-center">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {/* Dashboard title or logo for mobile */}
        {isMobile && !sidebarOpen && (
          <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold text-foreground">
            <Activity className="h-6 w-6 text-primary" />
            DeepFry
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Notifications Dropdown */}
        <NotificationsMenu />
        <ThemeToggle />
        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar>
                <img
                  src={user?.avatar || "/user2.avif"}
                  alt="User avatar"
                  className="rounded-full object-cover w-full h-full"
                />
                <AvatarFallback>
                  {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/client-dashboard/settings`)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );

  return (
    <TooltipProvider>
      <div className="flex h-screen">
        {renderSidebar()}
        <div className="flex-1 overflow-auto min-w-0">
          {renderHeader()}
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
