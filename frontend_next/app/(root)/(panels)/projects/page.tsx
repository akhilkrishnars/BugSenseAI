"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Users,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  Folder,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  CalendarIcon,
  Check,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/shared/DatePicker";
import { useRouter } from "next/navigation";
import { useCreateProject, useDeleteProject, useProjects, useUpdateProject } from "@/services/api";

// Project type matching backend
type Project = {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "on-hold" | "archived";
  priority: "high" | "medium" | "low";
  teamMembers?: number;
  startDate: string;
  endDate?: string;
  bugs: {
    total: number;
    open: number;
    resolved: number;
    critical: number;
    high?: number;
    medium?: number;
    low?: number;
  };
  tags: string[];
  progress: number;
  created_at: string;
};

const statusColors = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "on-hold": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const priorityColors = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-emerald-500/20 text-emerald-400",
};

const statusOptions = [
  { value: "active", label: "Active", color: "text-emerald-400" },
  { value: "completed", label: "Completed", color: "text-blue-400" },
  { value: "on-hold", label: "On Hold", color: "text-amber-400" },
  { value: "archived", label: "Archived", color: "text-gray-400" },
];

const priorityOptions = [
  { value: "high", label: "High", color: "text-red-400" },
  { value: "medium", label: "Medium", color: "text-amber-400" },
  { value: "low", label: "Low", color: "text-emerald-400" },
];

const filterStatusOptions = [
  { value: "all", label: "All Status" },
  ...statusOptions,
];

const filterPriorityOptions = [
  { value: "all", label: "All Priority" },
  ...priorityOptions,
];

export default function Projects() {
  const router = useRouter();
  
  // React Query hooks
  const { data: projectsData = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<Project, "id" | "bugs" | "progress" | "created_at">>({
    name: "",
    description: "",
    status: "active",
    priority: "medium",
    teamMembers: 1,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    tags: [],
  });
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [tagInput, setTagInput] = useState("");

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Initialize dates
  useEffect(() => {
    if (formData.startDate) {
      setStartDate(new Date(formData.startDate));
    }
    if (formData.endDate) {
      setEndDate(new Date(formData.endDate));
    }
  }, [formData.startDate, formData.endDate]);

  // Filter projects
  const filteredProjects = (projectsData || []).filter((project: Project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || project.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProjectId(project.id);
      setFormData({
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        teamMembers: project.teamMembers || 1,
        startDate: project.startDate,
        endDate: project.endDate || "",
        tags: [...project.tags],
      });
      setStartDate(new Date(project.startDate));
      setEndDate(project.endDate ? new Date(project.endDate) : undefined);
    } else {
      setEditingProjectId(null);
      setFormData({
        name: "",
        description: "",
        status: "active",
        priority: "medium",
        teamMembers: 1,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        tags: [],
      });
      setStartDate(new Date());
      setEndDate(undefined);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProjectId(null);
    setTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedData = {
      name: formData.name,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      startDate: startDate ? startDate.toISOString().split("T")[0] : "",
      endDate: endDate ? endDate.toISOString().split("T")[0] : undefined,
      tags: formData.tags,
    };

    try {
      if (editingProjectId) {
        // Extract numeric ID from PROJ-001 format
        const numericId = parseInt(editingProjectId.replace("PROJ-", ""));
        await updateProjectMutation.mutateAsync({
          id: numericId.toString(),
          data: formattedData
        });
      } else {
        await createProjectMutation.mutateAsync(formattedData);
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      const numericId = parseInt(projectId.replace("PROJ-", ""));
      await deleteProjectMutation.mutateAsync(numericId.toString());
      setIsDeleting(null);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const getStatusLabel = (value: string) => {
    const option = statusOptions.find((opt) => opt.value === value);
    return option ? option.label : "Active";
  };

  const getPriorityLabel = (value: string) => {
    const option = priorityOptions.find((opt) => opt.value === value);
    return option ? option.label : "Medium";
  };

  const getFilterStatusLabel = (value: string) => {
    const option = filterStatusOptions.find((opt) => opt.value === value);
    return option ? option.label : "All Status";
  };

  const getFilterPriorityLabel = (value: string) => {
    const option = filterPriorityOptions.find((opt) => opt.value === value);
    return option ? option.label : "All Priority";
  };

  const stats = {
    total: projectsData?.length || 0,
    active: (projectsData || []).filter((p: Project) => p.status === "active").length,
    completed: (projectsData || []).filter((p: Project) => p.status === "completed").length,
    critical: (projectsData || []).reduce((sum: number, p: Project) => sum + (p.bugs?.critical || 0), 0),
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground">
            Manage and track all development projects
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl overflow-hidden bg-card border-white/10">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingProjectId ? "Edit Project" : "Create New Project"}
              </DialogTitle>
              <DialogDescription>
                {editingProjectId
                  ? "Update project details below."
                  : "Fill in the details to create a new project."}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 overflow-scrollbar overflow-y-auto max-h-[70vh] pr-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-[5px] bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/50"
                      >
                        <span
                          className={
                            statusColors[formData.status].split(" ")[1]
                          }
                        >
                          {getStatusLabel(formData.status)}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0 bg-card border-white/10">
                      <div className="py-1">
                        {statusOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                status: option.value as "active" | "completed" | "on-hold" | "archived",
                              })
                            }
                            className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <span className={option.color}>{option.label}</span>
                            {formData.status === option.value && (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-[5px] bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 resize-none"
                  placeholder="Describe the project..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Priority
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/50"
                      >
                        <span
                          className={
                            priorityColors[formData.priority].split(" ")[1]
                          }
                        >
                          {getPriorityLabel(formData.priority)}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0 bg-card border-white/10">
                      <div className="py-1">
                        {priorityOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                priority: option.value as "high" | "medium" | "low",
                              })
                            }
                            className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <span className={option.color}>{option.label}</span>
                            {formData.priority === option.value && (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date
                </label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  End Date (Optional)
                </label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 bg-white/5 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 hover:text-red-400 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), handleAddTag())
                    }
                    className="flex-1 px-4 py-[5px] bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                    placeholder="Add a tag and press Enter"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-[5px] bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="border-white/10 hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {(createProjectMutation.isPending || updateProjectMutation.isPending) ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingProjectId ? "Update Project" : "Create Project"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Projects",
            value: stats.total,
            icon: Folder,
            color: "bg-blue-500/10 text-blue-400",
          },
          {
            label: "Active",
            value: stats.active,
            icon: Clock,
            color: "bg-emerald-500/10 text-emerald-400",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: CheckCircle,
            color: "bg-purple-500/10 text-purple-400",
          },
          {
            label: "Critical Bugs",
            value: stats.critical,
            icon: AlertCircle,
            color: "bg-red-500/10 text-red-400",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-card/30 rounded-xl border border-white/10">
        <div className="flex-1 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-[5px] bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
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
                    <span>{option.label}</span>
                    {statusFilter === option.value && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/50"
              >
                {getFilterPriorityLabel(priorityFilter)}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-card border-white/10">
              <div className="py-1">
                {filterPriorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriorityFilter(option.value)}
                    className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span>{option.label}</span>
                    {priorityFilter === option.value && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center space-x-2 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors cursor-pointer ${viewMode === "grid" ? "bg-white/10" : "hover:bg-white/5"}`}
            >
              <div className="grid grid-cols-2 gap-0.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-1.5 w-1.5 bg-current"></div>
                ))}
              </div>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors cursor-pointer ${viewMode === "list" ? "bg-white/10" : "hover:bg-white/5"}`}
            >
              <div className="space-y-0.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-0.5 w-3 bg-current"></div>
                ))}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }
      >
        {filteredProjects.map((project: Project) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300 ${
              viewMode === "list" ? "flex" : ""
            }`}
          >
            {/* Project Header */}
            <div
              className={`p-6 border-b border-white/10 ${viewMode === "list" ? "flex-1" : ""}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                      <Folder className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.id}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {project.tags?.slice(0, 3).map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-white/5 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {project.tags?.length > 3 && (
                  <span className="px-2 py-1 bg-white/5 text-xs rounded-full">
                    +{project.tags.length - 3}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{formatDate(project.startDate)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-sm">
                    <AlertCircle className="h-3 w-3 text-red-400" />
                    <span>{project.bugs?.open || 0} open bugs</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                    <span>{project.bugs?.resolved || 0} resolved</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColors[project.status]}`}
                >
                  {project.status}
                </span>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${priorityColors[project.priority]}`}
                >
                  {project.priority}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenDialog(project)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setIsDeleting(project.id)}
                  className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="View Details"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="h-16 w-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
            <Folder className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No projects found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Get started by creating your first project"}
          </p>
          {(searchQuery || statusFilter !== "all" || priorityFilter !== "all") ? (
            <Button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setPriorityFilter("all");
              }}
              className="inline-flex items-center space-x-2 px-4 py-[5px] bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md font-semibold hover:opacity-90 transition-opacity"
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              onClick={() => handleOpenDialog()}
              className="inline-flex items-center space-x-2 px-4 py-[5px] bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </Button>
          )}
        </div>
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
                <h3 className="text-lg font-bold mb-2">Delete Project</h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete this project? This action
                  cannot be undone.
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => setIsDeleting(null)}
                    className="px-4 py-[5px] border border-white/10 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(isDeleting)}
                    disabled={deleteProjectMutation.isPending}
                    className="px-6 py-[5px] bg-red-500 text-white rounded-md font-semibold hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {deleteProjectMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Project"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}