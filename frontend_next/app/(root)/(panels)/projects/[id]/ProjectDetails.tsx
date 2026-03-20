"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Folder,
  Tag,
  BarChart3,
  MessageSquare,
  Paperclip,
  Plus,
  Filter,
  Download,
  MoreVertical,
  ChevronRight,
  ExternalLink,
  Bug,
  Activity,
  Shield,
  Cpu,
  Search,
  Eye,
  Trash2,
  Check,
  X,
  Save,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Import Dialog components
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
import {
  useAddBug,
  useProject,
  useProjectBugs,
  useUpdateBug,
  useDeleteBug,
  useExportProject,
} from "@/services/api";
import { toast } from "sonner";

// Zod validation schema - Updated to match backend expectations
const bugFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.enum(["open", "in-progress", "resolved", "closed"]),
  project: z.string().min(1, "Project is required"),
  stepsToReproduce: z.array(z.string().min(1, "Step cannot be empty")),
  tags: z.array(z.string()),
});

type BugFormData = z.infer<typeof bugFormSchema>;

// Edit bug schema (only title and status)
const editBugSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  status: z.enum(["open", "in-progress", "resolved", "closed"]),
});

type EditBugFormData = z.infer<typeof editBugSchema>;

// Bug status options - Updated to match backend
const bugStatusOptions = [
  { value: "open", label: "Open", color: "text-red-400" },
  { value: "in-progress", label: "In Progress", color: "text-amber-400" },
  { value: "resolved", label: "Resolved", color: "text-emerald-400" },
  { value: "closed", label: "Closed", color: "text-blue-400" },
];

// Types from backend
interface BackendProject {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "on-hold" | "archived";
  priority: "high" | "medium" | "low";
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
}

interface BackendBug {
  id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "critical" | "high" | "medium" | "low";
  project: string;
  projectId: number;
  tags: string[];
  stepsToReproduce: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ProjectDetails({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id;

  const [activeTab, setActiveTab] = useState("overview");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState<BackendBug | null>(null);
  const [currentTag, setCurrentTag] = useState("");

  // Fetch project data
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useProject(projectId);

  // Fetch project bugs
  const {
    data: bugs = [],
    isLoading: bugsLoading,
    error: bugsError,
  } = useProjectBugs(projectId);

  // Add bug mutation
  const addBugMutationBase = useAddBug();

  const addBugMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      project: string;
      status: string;
      stepsToReproduce: string[];
      tags: string[];
    }) => addBugMutationBase.mutateAsync(data),
    onSuccess: () => {
      toast.success("Bug reported successfully!", {
        description: "The bug has been added to the project.",
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ["projectBugs", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      console.error("Failed to report bug:", error);

      // Check if it's a duplicate bug error
      if (error.response?.data?.error === "Duplicate bug detected") {
        const duplicateData = error.response.data as any;

        // Show duplicate bug toast with details
        const toastId = toast.custom(
          (t) => (
            <div className="flex items-start gap-3 bg-card border border-white/10 rounded-lg p-4 shadow-lg w-full max-w-md">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">
                  Duplicate Bug Detected
                </h4>
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {duplicateData.message}
                  </p>
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="font-medium text-red-400">
                      Similar Bug Found:
                    </p>
                    <p className="text-sm mt-1">
                      <span className="text-muted-foreground">ID:</span>{" "}
                      {duplicateData.duplicate.similar_bug_id}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Title:</span>{" "}
                      {duplicateData.duplicate.similar_bug_title}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">
                        Description:
                      </span>{" "}
                      {duplicateData.duplicate.similar_bug_description}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Status:</span>{" "}
                      {duplicateData.duplicate.similar_bug_status}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Priority:</span>{" "}
                      {duplicateData.duplicate.similar_bug_priority}
                    </p>
                    <p className="text-sm font-medium text-red-400 mt-2">
                      Similarity:{" "}
                      {duplicateData.duplicate.similarity_percentage}%
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => {
                      router.push(
                        `/bugs/${duplicateData.duplicate.similar_bug_id}`,
                      );
                      toast.dismiss(toastId);
                    }}
                  >
                    View Similar Bug
                  </Button>
                </div>
              </div>
            </div>
          ),
          {
            duration: 10000,
            position: "bottom-right",
          },
        );
      } else {
        // Handle other errors
        toast.error("Failed to report bug", {
          description:
            error.response?.data?.message || "An unexpected error occurred.",
          duration: 5000,
        });
      }
    },
  });

  // Update bug mutation
  const updateBugMutation = useUpdateBug();

  // Delete bug mutation
  const deleteBugMutation = useDeleteBug();

  // Export project mutation
  const exportProjectMutation = useExportProject();

  // React Hook Form with Zod validation for new bug
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm<BugFormData>({
    resolver: zodResolver(bugFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "open",
      project: "",
      stepsToReproduce: [""],
      tags: [],
    },
  });

  // React Hook Form for edit bug
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
    reset: resetEdit,
    setValue: setEditValue,
    watch: watchEdit,
  } = useForm<EditBugFormData>({
    resolver: zodResolver(editBugSchema),
    defaultValues: {
      title: "",
      status: "open",
    },
  });

  // Watch form values
  const watchedSteps = watch("stepsToReproduce");
  const watchedTags = watch("tags");
  const watchedStatus = watch("status");

  // Watch edit form values
  const watchedEditStatus = watchEdit("status");

  // Update form project when project loads
  useEffect(() => {
    if (project) {
      setValue("project", project.id);
    }
  }, [project, setValue]);

  // Handle form operations for new bug
  const handleOpenDialog = () => {
    reset({
      title: "",
      description: "",
      status: "open",
      project: project?.id || "",
      stepsToReproduce: [""],
      tags: [],
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentTag("");
    reset();
  };

  // Handle edit operations
  const handleOpenEditDialog = (bug: BackendBug) => {
    setSelectedBug(bug);
    resetEdit({
      title: bug.title,
      status: bug.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedBug(null);
    resetEdit();
  };

  // Handle delete operations
  const handleOpenDeleteDialog = (bug: BackendBug) => {
    setSelectedBug(bug);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedBug(null);
  };

  const onSubmit = async (data: BugFormData) => {
    try {
      await addBugMutation.mutateAsync({
        title: data.title,
        description: data.description,
        project: projectId.replace("PROJ-", ""),
        status: data.status,
        stepsToReproduce: data.stepsToReproduce,
        tags: data.tags,
      });

      console.log("Bug reported successfully!");
      handleCloseDialog();
    } catch (error) {
      console.error("Failed to report bug:", error);
    }
  };

  const onEditSubmit = async (data: EditBugFormData) => {
    if (!selectedBug) return;

    try {
      await updateBugMutation.mutateAsync({
        id: selectedBug.id,
        data: {
          id: selectedBug.id,
          title: data.title,
          status: data.status,
        },
      });

      console.log("Bug updated successfully!");
      handleCloseEditDialog();
    } catch (error) {
      console.error("Failed to update bug:", error);
    }
  };

  const handleDeleteBug = async () => {
    if (!selectedBug) return;

    try {
      await deleteBugMutation.mutateAsync(selectedBug.id);
      console.log("Bug deleted successfully!");
      handleCloseDeleteDialog();
    } catch (error) {
      console.error("Failed to delete bug:", error);
    }
  };

  const handleExportProject = async () => {
    try {
      await exportProjectMutation.mutateAsync(projectId.replace("PROJ-", ""));
      console.log("Project exported successfully!");
    } catch (error) {
      console.error("Failed to export project:", error);
    }
  };

  // Handle steps to reproduce
  const addStep = () => {
    const steps = [...watchedSteps, ""];
    setValue("stepsToReproduce", steps);
    trigger("stepsToReproduce");
  };

  const updateStep = (index: number, value: string) => {
    const steps = [...watchedSteps];
    steps[index] = value;
    setValue("stepsToReproduce", steps);
    trigger("stepsToReproduce");
  };

  const removeStep = (index: number) => {
    const steps = watchedSteps.filter((_, i) => i !== index);
    setValue("stepsToReproduce", steps.length > 0 ? steps : [""]);
    trigger("stepsToReproduce");
  };

  // Handle tags
  const addTag = () => {
    if (currentTag.trim() && !watchedTags.includes(currentTag.trim())) {
      const newTags = [...watchedTags, currentTag.trim()];
      setValue("tags", newTags);
      setCurrentTag("");
      trigger("tags");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = watchedTags.filter((tag) => tag !== tagToRemove);
    setValue("tags", newTags);
    trigger("tags");
  };

  // Get status label for display
  const getStatusLabel = (value: string) => {
    const option = bugStatusOptions.find((opt) => opt.value === value);
    return option ? option.label : "Open";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "on-hold":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "archived":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500/20 text-red-400";
      case "high":
        return "bg-orange-500/20 text-orange-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      case "low":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getBugStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-500/20 text-red-400";
      case "in-progress":
        return "bg-amber-500/20 text-amber-400";
      case "resolved":
        return "bg-emerald-500/20 text-emerald-400";
      case "closed":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Project not found</h3>
        <p className="text-muted-foreground mb-6">
          The project you're looking for doesn't exist.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md font-semibold hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Report Bug Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Report New Bug for {project.name}
            </DialogTitle>
            <DialogDescription>
              Fill in the details to report a new bug in this project.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 overflow-scrollbar overflow-y-auto pr-2 max-h-[60vh]"
          >
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    {...register("title")}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                    placeholder="Brief description of the bug"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description *
                  </label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 resize-none"
                    placeholder="Detailed description of the bug"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Status */}
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
                            bugStatusOptions.find(
                              (opt) => opt.value === watchedStatus,
                            )?.color
                          }
                        >
                          {getStatusLabel(watchedStatus)}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0 bg-card border-white/10">
                      <div className="py-1">
                        {bugStatusOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setValue(
                                "status",
                                option.value as BugFormData["status"],
                              )
                            }
                            className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <span className={option.color}>{option.label}</span>
                            {watchedStatus === option.value && (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Project (read-only since we're in a specific project) */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project *
                  </label>
                  <input
                    type="text"
                    value={project.name}
                    readOnly
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md text-muted-foreground"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {watchedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 bg-white/5 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
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
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addTag())
                      }
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                      placeholder="Add a tag and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
              {/* Steps to Reproduce */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Steps to Reproduce *
                </label>
                <div className="space-y-2">
                  {watchedSteps.map((step, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-sm text-muted-foreground mt-2">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={step}
                          onChange={(e) => updateStep(index, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault(); // Prevent form submission
                              // Optionally add a new step when pressing Enter on the last step
                              if (index === watchedSteps.length - 1) {
                                addStep();
                              }
                            }
                          }}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                          placeholder={`Step ${index + 1}`}
                        />
                        {errors.stepsToReproduce?.[index] && (
                          <p className="mt-1 text-sm text-red-400">
                            {errors.stepsToReproduce[index]?.message}
                          </p>
                        )}
                      </div>
                      {watchedSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-md cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addStep}
                    className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    + Add Step
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-white/10">
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
                disabled={isSubmitting || addBugMutation.isPending}
                className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || addBugMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Report Bug
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Bug Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Edit Bug</DialogTitle>
            <DialogDescription>
              Update the title and status of this bug.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  {...registerEdit("title")}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                  placeholder="Bug title"
                />
                {editErrors.title && (
                  <p className="mt-1 text-sm text-red-400">
                    {editErrors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/50"
                    >
                      <span
                        className={
                          bugStatusOptions.find(
                            (opt) => opt.value === watchedEditStatus,
                          )?.color
                        }
                      >
                        {getStatusLabel(watchedEditStatus)}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 bg-card border-white/10">
                    <div className="py-1">
                      {bugStatusOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setEditValue(
                              "status",
                              option.value as EditBugFormData["status"],
                            )
                          }
                          className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <span className={option.color}>{option.label}</span>
                          {watchedEditStatus === option.value && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditDialog}
                className="border-white/10 hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isEditSubmitting || updateBugMutation.isPending}
                className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditSubmitting || updateBugMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Bug
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Bug Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-6 w-6" />
              Delete Bug
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete this bug? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {selectedBug && (
            <div className="my-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="font-medium text-foreground">{selectedBug.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                ID: {selectedBug.id}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getBugStatusColor(selectedBug.status)}`}
                >
                  {selectedBug.status}
                </span>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedBug.priority)}`}
                >
                  {selectedBug.priority}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDeleteDialog}
              className="border-white/10 hover:bg-white/5 cursor-pointer"
              disabled={deleteBugMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteBug}
              disabled={deleteBugMutation.isPending}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteBugMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Bug
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {project.name}
              <span className="text-sm font-mono text-muted-foreground">
                {project.id}
              </span>
            </h2>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleOpenDialog}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Report Bug</span>
          </Button>
          <Button
            onClick={handleExportProject}
            className="flex items-center text-foreground gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-card/30 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(project.status)}`}
          >
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(project.priority)}`}
          >
            {project.priority} Priority
          </span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(project.startDate)} -{" "}
              {project.endDate ? formatDate(project.endDate) : "Ongoing"}
            </span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{project.bugs?.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total Bugs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{project.bugs?.open || 0}</div>
            <div className="text-xs text-muted-foreground">Open Bugs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{project.progress || 0}%</div>
            <div className="text-xs text-muted-foreground">Progress</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex space-x-6">
          {["overview", "bugs", "analytics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab
                  ? "text-red-400 border-b-2 border-red-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Open Bugs",
                  value: project.bugs?.open || 0,
                  icon: AlertCircle,
                  color: "from-red-500 to-red-600",
                },
                {
                  label: "Resolved",
                  value: project.bugs?.resolved || 0,
                  icon: CheckCircle,
                  color: "from-emerald-500 to-emerald-600",
                },
                {
                  label: "Critical",
                  value: project.bugs?.critical || 0,
                  icon: Shield,
                  color: "from-orange-500 to-orange-600",
                },
                {
                  label: "Progress",
                  value: `${project.progress || 0}%`,
                  icon: Activity,
                  color: "from-blue-500 to-blue-600",
                },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      </div>
                    </div>
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg shadow-black/10`}
                    >
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Project Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Project Details */}
              <div className="lg:col-span-3 space-y-6">
                {/* Tags */}
                <div className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-red-500" />
                    Technologies & Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.tags?.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 bg-white/5 text-sm rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recent Bugs */}
                <div className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Bug className="h-5 w-5 text-red-500" />
                      Recent Bugs
                    </h3>
                    <button
                      onClick={() => setActiveTab("bugs")}
                      className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                    >
                      View all <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {bugsLoading ? (
                      <div className="text-center py-4">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </div>
                    ) : (
                      bugs.slice(0, 5).map((bug: BackendBug) => (
                        <motion.div
                          key={bug.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-mono text-muted-foreground">
                                {bug.id}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${getBugStatusColor(bug.status)}`}
                              >
                                {bug.status}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(bug.priority)}`}
                              >
                                {bug.priority}
                              </span>
                            </div>
                            <p className="mt-2 font-medium">{bug.title}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Created: {formatDate(bug.createdAt)}</span>
                            </div>
                          </div>
                          <Link
                            href={`/bugs/${bug.id}`}
                            className="p-2 hover:bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </motion.div>
                      ))
                    )}
                    {!bugsLoading && bugs.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No bugs reported yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "bugs" && (
          <div className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg">
                  All Bugs in {project.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {bugs.length} bugs found
                </p>
              </div>
            </div>

            {/* Bug Table */}
            {bugsLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                        ID
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                        Title
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                        Priority
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                        Created
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bugs.map((bug: BackendBug) => (
                      <tr
                        key={bug.id}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="py-3 px-4 font-mono text-sm">
                          {bug.id}
                        </td>
                        <td className="py-3 px-4 font-medium">{bug.title}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 text-xs rounded-full ${getBugStatusColor(bug.status)}`}
                          >
                            {bug.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 text-xs rounded-full ${getPriorityColor(bug.priority)}`}
                          >
                            {bug.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {formatDate(bug.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/bugs/${bug.id}`}
                              className="p-1 hover:bg-white/5 rounded cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleOpenEditDialog(bug)}
                              className="p-1 hover:bg-white/5 rounded cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteDialog(bug)}
                              className="p-1 hover:bg-white/5 rounded cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bugs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No bugs found in this project
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="font-bold text-lg mb-6">Project Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-medium mb-3">
                    Bug Distribution by Priority
                  </h4>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Critical",
                        value: project.bugs?.critical || 0,
                        color: "bg-red-500",
                      },
                      {
                        label: "High",
                        value: project.bugs?.high || 0,
                        color: "bg-orange-500",
                      },
                      {
                        label: "Medium",
                        value: project.bugs?.medium || 0,
                        color: "bg-yellow-500",
                      },
                      {
                        label: "Low",
                        value: project.bugs?.low || 0,
                        color: "bg-blue-500",
                      },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span>{item.value}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{
                              width: project.bugs?.total
                                ? `${(item.value / project.bugs.total) * 100}%`
                                : "0%",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-medium mb-3">Bug Resolution Rate</h4>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">
                      {project.bugs?.total
                        ? Math.round(
                            (project.bugs.resolved / project.bugs.total) * 100,
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {project.bugs?.resolved || 0} resolved out of{" "}
                      {project.bugs?.total || 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-medium mb-3">Status Overview</h4>
                  <div className="space-y-4">
                    {[
                      {
                        label: "Open",
                        value: project.bugs?.open || 0,
                        color: "text-red-400",
                      },
                      {
                        label: "In Progress",
                        value: bugs.filter(
                          (b: BackendBug) => b.status === "in-progress",
                        ).length,
                        color: "text-amber-400",
                      },
                      {
                        label: "Resolved",
                        value: project.bugs?.resolved || 0,
                        color: "text-emerald-400",
                      },
                      {
                        label: "Closed",
                        value: bugs.filter(
                          (b: BackendBug) => b.status === "closed",
                        ).length,
                        color: "text-blue-400",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-3 w-3 rounded-full ${item.color} bg-current/20`}
                          />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-medium mb-3">Average Resolution Time</h4>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold">3.2</div>
                    <div className="text-sm text-muted-foreground">
                      <div>Days to resolve</div>
                      <div className="text-emerald-400">
                        ↓ 12% from last month
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
