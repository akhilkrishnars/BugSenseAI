"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Settings, HelpCircle, ChevronDown, User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useAuthActions } from "@/store/authStore";
import { toast } from "sonner";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();
  const { logout } = useAuthActions();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const notifications = [
    {
      id: 1,
      text: "New bug reported in Project Alpha",
      time: "5 min ago",
      read: false,
    },
    { id: 2, text: "Critical bug resolved", time: "1 hour ago", read: true },
    {
      id: 3,
      text: "Weekly analytics report ready",
      time: "2 hours ago",
      read: true,
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Get page title and subtitle based on path
  const getPageInfo = () => {
    switch (pathname) {
      case "/dashboard":
        return {
          title: "Dashboard",
          subtitle: "Monitor and manage your bug tracking workflow",
        };
      case "/projects":
        return {
          title: "Projects",
          subtitle: "Manage all your development projects",
        };
      case "/bugs":
        return {
          title: "All Bugs",
          subtitle: "Track and manage all reported issues",
        };
      case "/analytics":
        return {
          title: "Analytics",
          subtitle: "Insights and performance metrics",
        };
      default:
        if (pathname?.startsWith("/projects/")) {
          return {
            title: "Project Details",
            subtitle: "View and manage project details",
          };
        }
        if (pathname?.startsWith("/bugs/")) {
          return {
            title: "Bug Details",
            subtitle: "View and manage bug details",
          };
        }
        return {
          title: "Dashboard",
          subtitle: "Monitor and manage your bug tracking workflow",
        };
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showNotifications &&
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }

      if (
        showUserMenu &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications, showUserMenu]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.push("/auth/login");
  };

  const { title, subtitle } = getPageInfo();

  return (
    <header className="sticky top-0 z-40 mb-8">
      <div className="bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Left Section - Page Title */}
          <div className="flex items-center space-x-6 flex-1">
            <div>
              <h1 className="text-2xl font-bold text-gradient-primary">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {/* Right Section - Actions & User */}
          <div className="flex items-center space-x-3">
            {/* Help */}
            {/* <button
              className="p-2.5 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              title="Help & Documentation"
              onClick={() => setShowUserMenu(false)}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button> */}

            {/* Settings */}
            {/* <button
              className="p-2.5 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              title="Settings"
              onClick={() => {
                setShowUserMenu(false);
                router.push("/settings");
              }}
            >
              <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button> */}

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              {/* <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="p-2.5 hover:bg-white/5 rounded-xl transition-colors relative cursor-pointer"
              >
                <Bell className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button> */}

              {/* Notifications Dropdown */}
              {/* <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-card border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Notifications</h3>
                        <button 
                          className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                          onClick={() => {
                            console.log("Mark all as read");
                            setShowNotifications(false);
                          }}
                        >
                          Mark all as read
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                            !notification.read ? "bg-red-500/5" : ""
                          }`}
                          onClick={() => {
                            console.log("Notification clicked:", notification.id);
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div
                              className={`h-2 w-2 mt-1.5 rounded-full ${!notification.read ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`}
                            />
                            <div className="flex-1">
                              <p className="text-sm">{notification.text}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-white/10 text-center">
                      <button 
                        className="text-sm text-red-400 hover:text-red-300 font-medium cursor-pointer"
                        onClick={() => {
                          console.log("View all notifications");
                          setShowNotifications(false);
                        }}
                      >
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence> */}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded-xl transition-all duration-300 group cursor-pointer"
              >
                <div className="h-9 w-9 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:shadow-red-500/30">
                  <User className="h-4 w-4" />
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-semibold">
                    {user?.username || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role || "User"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden lg:block group-hover:rotate-180 transition-transform" />
              </button>

              {/* User Dropdown */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-card border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{user?.username || "User"}</p>
                          <p className="text-sm text-muted-foreground">
                            {user?.email || "User"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* <div className="p-2">
                      <button
                        onClick={() => {
                          router.push("/profile");
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push("/settings");
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
                    </div> */}

                    <div className="p-3 border-t border-white/10">
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 p-2.5 text-red-400 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}