"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  MoreVertical,
  Download,
  RefreshCw,
  Tag,
  User,
  Calendar,
  BarChart3,
  ExternalLink,
  Copy,
  Bug,
  X,
  Save,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAllBugs } from "@/services/api";

type Bug = {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "critical" | "high" | "medium" | "low";
  predicted_severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence_score: number;
  project: string;
  projectId: number;
  assignee?: {
    id: string;
    name: string;
    avatar: string;
  };
  reporter?: {
    id: string;
    name: string;
    avatar: string;
  };
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  tags: string[];
  attachments?: number;
  comments?: number;
  steps_to_reproduce: string[];
  environment: string;
  browser?: string;
  os?: string;
};

const statusColors = {
  OPEN: "bg-red-500/20 text-red-400 border-red-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  RESOLVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const priorityColors = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-blue-500/20 text-blue-400",
};

const severityColors = {
  CRITICAL: "bg-red-500/10 text-red-400 border border-red-500/30",
  HIGH: "bg-orange-500/10 text-orange-400 border border-orange-500/30",
  MEDIUM: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  LOW: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
};

// Filter options for Popovers
const filterStatusOptions = [
  { value: "all", label: "All Status" },
  { value: "OPEN", label: "Open", color: "text-red-400" },
  { value: "IN_PROGRESS", label: "In Progress", color: "text-amber-400" },
  { value: "RESOLVED", label: "Resolved", color: "text-emerald-400" },
  { value: "CLOSED", label: "Closed", color: "text-blue-400" },
];

export default function AllBugs() {
  // Use the React Query hook to fetch bugs
  const { data: apiData, isLoading, error, refetch } = useAllBugs();

  const [bugs, setBugs] = useState<Bug[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);

  const router = useRouter();

  // Update bugs state when data is fetched
  useEffect(() => {
    console.log("API Data:", apiData);

    if (apiData) {
      try {
        const dataArray = Array.isArray(apiData) ? apiData : [];

        if (dataArray.length === 0) {
          console.log("No bugs data received from API");
          setBugs([]);
          return;
        }

        // Transform API data to match our Bug type
        const transformedBugs: Bug[] = dataArray.map((bug: any) => {
          // Map the status from API format to our expected format
          let mappedStatus: Bug["status"] = "OPEN"; // default

          if (bug.status) {
            const statusLower = bug.status.toLowerCase();
            if (statusLower === "open") mappedStatus = "OPEN";
            else if (
              statusLower === "in-progress" ||
              statusLower === "in_progress"
            )
              mappedStatus = "IN_PROGRESS";
            else if (statusLower === "resolved") mappedStatus = "RESOLVED";
            else if (statusLower === "closed") mappedStatus = "CLOSED";
          }

          // Map severity with proper null handling
          let mappedSeverity: Bug["predicted_severity"] = "MEDIUM";
          if (bug.predicted_severity) {
            const severityUpper = bug.predicted_severity.toUpperCase();
            if (severityUpper === "CRITICAL") mappedSeverity = "CRITICAL";
            else if (severityUpper === "HIGH") mappedSeverity = "HIGH";
            else if (severityUpper === "MEDIUM") mappedSeverity = "MEDIUM";
            else if (severityUpper === "LOW") mappedSeverity = "LOW";
          }

          return {
            id: bug.id || `bug-${Date.now()}-${Math.random()}`,
            title: bug.title || "Untitled Bug",
            description: bug.description || "No description provided",
            status: mappedStatus,
            priority: (bug.priority?.toLowerCase() || "medium") as
              | "critical"
              | "high"
              | "medium"
              | "low",
            predicted_severity: mappedSeverity,
            confidence_score: bug.confidence_score || 0,
            project: bug.project || "Unassigned Project",
            projectId: bug.projectId || 0,
            createdAt: bug.createdAt || new Date().toISOString(),
            updatedAt: bug.updatedAt || new Date().toISOString(),
            tags: Array.isArray(bug.tags) ? bug.tags : [],
            steps_to_reproduce: Array.isArray(bug.stepsToReproduce)
              ? bug.stepsToReproduce
              : Array.isArray(bug.steps_to_reproduce)
                ? bug.steps_to_reproduce
                : [],
            environment: bug.environment || "Development",
            assignee: bug.assignee || undefined,
            reporter: bug.reporter || undefined,
            attachments: bug.attachments || 0,
            comments: bug.comments || 0,
            browser: bug.browser,
            os: bug.os,
            dueDate: bug.dueDate,
          };
        });

        console.log("Transformed bugs:", transformedBugs);
        setBugs(transformedBugs);
      } catch (error) {
        console.error("Error transforming bug data:", error);
        setBugs([]);
      }
    } else {
      console.log("No API data available");
      setBugs([]);
    }
  }, [apiData]);

  // Filter bugs
  const filteredBugs = bugs.filter((bug) => {
    const matchesSearch =
      bug.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || bug.status === statusFilter;
    const matchesProject =
      projectFilter === "all" || bug.project === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  // Get unique projects for filter dropdown
  const uniqueProjects = Array.from(new Set(bugs.map((bug) => bug.project)));
  const filterProjectOptions = [
    { value: "all", label: "All Projects" },
    ...uniqueProjects.map((project) => ({ value: project, label: project })),
  ];

  // Stats with all relevant metrics
  const stats = {
    total: bugs.length,
    open: bugs.filter((b) => b.status === "OPEN").length,
    inProgress: bugs.filter((b) => b.status === "IN_PROGRESS").length,
    resolved: bugs.filter((b) => b.status === "RESOLVED").length,
    closed: bugs.filter((b) => b.status === "CLOSED").length,
    critical: bugs.filter((b) => b.predicted_severity === "CRITICAL").length,
    high: bugs.filter((b) => b.predicted_severity === "HIGH").length,
    medium: bugs.filter((b) => b.predicted_severity === "MEDIUM").length,
    low: bugs.filter((b) => b.predicted_severity === "LOW").length,
  };

  // Delete bug handler
  const handleDelete = async (bugId: string) => {
    console.log("Deleting bug:", bugId);
    // TODO: Implement API call to delete bug
    await new Promise((resolve) => setTimeout(resolve, 500));
    await refetch();
    setIsDeleting(null);
  };

  const handleStatusChange = async (
    bugId: string,
    newStatus: Bug["status"],
  ) => {
    console.log("Changing status for bug:", bugId, "to", newStatus);
    // TODO: Implement API call to update bug status
    await new Promise((resolve) => setTimeout(resolve, 500));
    await refetch();
  };

  // Get filter status label for display
  const getFilterStatusLabel = (value: string) => {
    const option = filterStatusOptions.find((opt) => opt.value === value);
    return option ? option.label : "All Status";
  };

  // Get filter project label for display
  const getFilterProjectLabel = (value: string) => {
    const option = filterProjectOptions.find((opt) => opt.value === value);
    return option ? option.label : "All Projects";
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  const cardVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
    },
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Format status for display
  const formatStatus = (status: string) => {
    return status
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">Error loading bugs. Please try again.</p>
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 p-4 md:p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h2
            variants={itemVariants}
            className="text-2xl font-bold flex items-center gap-2"
          >
            <Bug className="h-6 w-6 text-red-500" />
            All Bugs
          </motion.h2>
          <motion.p variants={itemVariants} className="text-muted-foreground">
            Track and manage all reported issues across projects
          </motion.p>
        </div>
      </div>

      {/* Stats - Updated with 6 cards showing relevant metrics */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        {[
          {
            label: "Total Bugs",
            value: stats.total,
            icon: Bug,
            color: "from-blue-500 to-blue-600",
          },
          {
            label: "Open",
            value: stats.open,
            icon: AlertCircle,
            color: "from-red-500 to-red-600",
          },
          {
            label: "In Progress",
            value: stats.inProgress,
            icon: Clock,
            color: "from-amber-500 to-amber-600",
          },
          {
            label: "Resolved",
            value: stats.resolved,
            icon: CheckCircle,
            color: "from-emerald-500 to-emerald-600",
          },
          {
            label: "Critical",
            value: stats.critical,
            icon: AlertCircle,
            color: "from-red-500 to-red-600",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div
                className={`p-2 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg shadow-black/10`}
              >
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row gap-4 items-center justify-between p-4 bg-card/30 rounded-xl border border-white/10"
      >
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bugs by title, description, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {/* Status Filter with Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/50"
              >
                {getFilterStatusLabel(statusFilter)}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-card border-white/10">
              <div className="py-1">
                {filterStatusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span className={option.color || "text-current"}>
                      {option.label}
                    </span>
                    {statusFilter === option.value && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Project Filter with Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/50"
              >
                {getFilterProjectLabel(projectFilter)}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-card border-white/10">
              <div className="py-1">
                {filterProjectOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setProjectFilter(option.value)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span>{option.label}</span>
                    {projectFilter === option.value && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors cursor-pointer ${
                viewMode === "list" ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <div className="space-y-0.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-0.5 w-3 bg-current"></div>
                ))}
              </div>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <div className="grid grid-cols-2 gap-0.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-1.5 w-1.5 bg-current"></div>
                ))}
              </div>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Bugs List/Grid */}
      <motion.div
        variants={containerVariants}
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }
      >
        <AnimatePresence>
          {filteredBugs.map((bug, index) => (
            <motion.div
              key={bug.id}
              variants={viewMode === "grid" ? cardVariants : itemVariants}
              layout
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={`bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300 ${
                viewMode === "grid" ? "h-full flex flex-col" : ""
              }`}
            >
              {/* Bug Header */}
              <div
                className={`p-6 border-b border-white/10 ${viewMode === "grid" ? "flex-grow" : ""}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold truncate text-lg">
                        {bug.title}
                      </h3>
                      <span className="text-xs text-muted-foreground font-mono bg-white/5 px-2 py-0.5 rounded">
                        {bug.id.substring(0, 8)}...
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {bug.description}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {bug.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {bug.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-white/5 text-xs rounded-full flex items-center gap-1"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                    {bug.tags.length > 3 && (
                      <span className="px-2 py-1 bg-white/5 text-xs rounded-full">
                        +{bug.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Bug Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Project
                      </span>
                      <span
                        className="text-sm font-medium truncate ml-2"
                        title={bug.project}
                      >
                        {bug.project}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Status
                      </span>
                      <span
                        className={`text-sm ${bug.status === "OPEN" ? "text-red-400" : bug.status === "IN_PROGRESS" ? "text-amber-400" : bug.status === "RESOLVED" ? "text-emerald-400" : "text-blue-400"}`}
                      >
                        {formatStatus(bug.status)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Created
                      </span>
                      <span className="text-sm">
                        {formatDate(bug.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Updated
                      </span>
                      <span className="text-sm">
                        {formatDate(bug.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bug Footer */}
              <div className="p-4 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColors[bug.status] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}
                    title="Current workflow status"
                  >
                    {formatStatus(bug.status)}
                  </span>

                  {/* Priority Badge - With exclamation icon and solid background */}
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 ${
                      bug.priority === "critical"
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                        : bug.priority === "high"
                          ? "bg-orange-500 text-white"
                          : bug.priority === "medium"
                            ? "bg-yellow-500 text-white"
                            : "bg-blue-500 text-white"
                    }`}
                    title="Business priority for fixing"
                  >
                    {bug.priority === "critical" && (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {bug.priority === "high" && (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {bug.priority === "medium" && <Clock className="h-3 w-3" />}
                    {bug.priority === "low" && (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {bug.priority}
                  </span>

                  {/* Severity Badge - With scientific/analytical styling */}
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 bg-white/5 backdrop-blur-sm ${
                      bug.predicted_severity === "CRITICAL"
                        ? "text-red-400 border border-red-500/50"
                        : bug.predicted_severity === "HIGH"
                          ? "text-orange-400 border border-orange-500/50"
                          : bug.predicted_severity === "MEDIUM"
                            ? "text-yellow-400 border border-yellow-500/50"
                            : "text-blue-400 border border-blue-500/50"
                    }`}
                    title={`AI-predicted severity with ${Math.round(bug.confidence_score * 100)}% confidence`}
                  >
                    <BarChart3 className="h-3 w-3 opacity-70" />
                    <span className="uppercase text-[10px] tracking-wider">
                      {bug.predicted_severity}
                    </span>
                    {bug.confidence_score > 0 && (
                      <span className="text-[10px] opacity-60 font-mono">
                        {Math.round(bug.confidence_score * 100)}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/bugs/${bug.id}`)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {bug.status === "OPEN" && (
                    <button
                      onClick={() => handleStatusChange(bug.id, "IN_PROGRESS")}
                      className="px-3 py-1 text-xs bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors cursor-pointer"
                    >
                      Start Work
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredBugs.length === 0 && bugs.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="h-16 w-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
            <Bug className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No bugs found</h3>
          <p className="text-muted-foreground mb-6">
            {apiData
              ? "Try adjusting your search or filters"
              : "No bugs have been reported yet"}
          </p>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-white/10 rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="text-center">
                <div className="h-12 w-12 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Delete Bug Report</h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete this bug report? This action
                  cannot be undone.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setIsDeleting(null)}
                    className="px-4 py-2 border border-white/10 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(isDeleting)}
                    className="px-6 py-2 bg-red-500 text-white rounded-md font-semibold hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    Delete Bug
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pagination/Info */}
      {filteredBugs.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-between p-4 bg-card/30 rounded-xl border border-white/10"
        >
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{filteredBugs.length}</span>{" "}
            of <span className="font-medium">{bugs.length}</span> bugs
          </p>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <button className="px-3 py-1 text-sm bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-colors cursor-pointer">
              Previous
            </button>
            <span className="px-3 py-1 text-sm">1</span>
            <button className="px-3 py-1 text-sm bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-colors cursor-pointer">
              Next
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
