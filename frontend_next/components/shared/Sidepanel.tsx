"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Bug,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Bot,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    name: "All Bugs",
    href: "/bugs",
    icon: Bug,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
];

export default function Sidepanel() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const sidepanelRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle hover with smooth transitions
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (isCollapsed && !isMobile) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed && !isMobile) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 150);
    }
  };

  // Auto-collapse on mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !isCollapsed &&
        isMobile &&
        sidepanelRef.current &&
        !sidepanelRef.current.contains(event.target as Node)
      ) {
        setIsCollapsed(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCollapsed, isMobile]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle link click
  const handleLinkClick = () => {
    if (isMobile) {
      setIsCollapsed(true);
      setIsHovered(false);
    }
  };

  // Determine sidebar width based on state
  const sidebarWidth = isCollapsed ? (isHovered ? 280 : 95) : 280;

  return (
    <>
      {/* Sidebar Container - Using absolute on mobile, sticky on desktop */}
      <motion.aside
        ref={sidepanelRef}
        initial={{ width: 280 }}
        animate={{ width: sidebarWidth }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 200,
          mass: 0.5,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`sticky top-0 left-0 z-50 h-screen ${
          isMobile ? "absolute" : "sticky"
        } bg-gradient-to-b from-card to-card/80 backdrop-blur-xl border-r border-white/10 flex flex-col shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between min-h-[40px]">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-3 overflow-hidden h-10 min-w-10">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
                  <Bot className="h-5 w-5" />
                </div>
              </div>

              {/* Animated Text */}
              <AnimatePresence mode="wait">
                {(isHovered || !isCollapsed) && (
                  <motion.div
                    key="expanded-text"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="whitespace-nowrap">
                      <h1 className="text-xl font-bold text-gradient-primary">
                        BugSense AI
                      </h1>
                      <p className="text-xs text-muted-foreground">v2.1.0</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-2 hover:bg-white/5 rounded-lg transition-all duration-300 flex-shrink-0 cursor-pointer ${
                isCollapsed && !isHovered ? "mx-auto" : ""
              }`}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href);
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                      isActive
                        ? "bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-400 shadow-lg shadow-red-500/10 border border-red-500/20"
                        : "hover:bg-white/5 text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-red-600/5"
                        transition={{ type: "spring", bounce: 0.2 }}
                      />
                    )}

                    <div className="flex items-center space-x-3 relative z-10">
                      <div
                        className={`p-2.5 rounded-lg transition-all duration-300 ${
                          isActive
                            ? "bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30"
                            : "bg-white/5 group-hover:bg-white/10"
                        }`}
                      >
                        <item.icon
                          className={`h-4 w-4 transition-transform duration-300 ${
                            isActive ? "text-white" : ""
                          }`}
                        />
                      </div>

                      <AnimatePresence mode="wait">
                        {(isHovered || !isCollapsed) && (
                          <motion.span
                            key="nav-text"
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            transition={{ duration: 0.15 }}
                            className="font-medium whitespace-nowrap"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {(isHovered || !isCollapsed) && isActive && (
                        <motion.div
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          transition={{ duration: 0.15 }}
                          className="relative z-10 flex-shrink-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {!isCollapsed && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsCollapsed(true)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Toggle Button */}
      <AnimatePresence>
        {isCollapsed && isMobile && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsCollapsed(false)}
            className="fixed bottom-4 left-4 z-40 p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-full shadow-lg shadow-red-500/30"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}