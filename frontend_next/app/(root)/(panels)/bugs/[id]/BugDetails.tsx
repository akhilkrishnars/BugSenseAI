"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bug,
  Tag,
  AlertCircle,
  CheckCircle,
  Code,
  Info,
  Check,
  X,
  BarChart3,
  Shield,
  Zap,
  Cpu,
  Brain,
  Target,
  TrendingUp,
  Lightbulb,
  Clock,
  Calendar,
  RefreshCw,
  Copy,
  GitBranch,
  Users,
  Flag,
  Activity,
  BookOpen,
  FileText,
  AlertTriangle,
  Flame,
  Sparkles,
  Fingerprint,
  Layers,
  Gauge,
  Wind,
  Zap as ZapIcon,
  Loader2,
  Play,
  StopCircle,
  ChevronUp,
  ChevronDown,
  User,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Octagon,
  Pentagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useBugDetails } from "@/services/api";
import { toast } from "react-hot-toast";


type BugStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"; 
type BugPriority = "critical" | "high" | "medium" | "low";
type BugSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

type ConfidenceExplanation = {
  level: "High" | "Medium" | "Low";
  points: string[];
  keywords?: string[];
  similar_bug_score?: number;
  model_confidence?: number;
  explainability_score?: number;
  feature_contributions?: Array<{
    feature: string;
    contribution: number;
    impact: "positive" | "negative";
  }>;
};

type Bug = {
  id: string;
  title: string;
  description: string;
  status: BugStatus;
  priority: BugPriority;
  category: string | null;
  category_display: string | null;
  predicted_severity: BugSeverity;
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
  stepsToReproduce: string[];
  environment?: string;
  browser?: string;
  os?: string;
  device?: string;
  resolution?: string;
  version?: string;
  related_issues?: string[];
  logs?: string[];
  error_codes?: string[];
  ai_analysis?: {
    root_cause?: string;
    suggested_fix?: string;
    similar_bugs?: string[];
    risk_assessment?: string;
    priority_reason?: string;
    confidence_explanation?: ConfidenceExplanation;
  };
};

const statusColors: Record<BugStatus, string> = {
  OPEN: "bg-red-500/20 text-red-400 border-red-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  RESOLVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const priorityColors: Record<BugPriority, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const severityColors: Record<BugSeverity, string> = {
  CRITICAL: "bg-red-500/10 text-red-400 border border-red-500/30",
  HIGH: "bg-orange-500/10 text-orange-400 border border-orange-500/30",
  MEDIUM: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  LOW: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
};

const categoryColors: Record<string, string> = {
  authentication: "bg-purple-500/10 text-purple-400 border border-purple-500/30",
  performance: "bg-orange-500/10 text-orange-400 border border-orange-500/30",
  crash: "bg-red-500/10 text-red-400 border border-red-500/30",
  security: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
  ui: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  database: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  api: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30",
  memory: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  concurrency: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30",
  other: "bg-gray-500/10 text-gray-400 border border-gray-500/30",
};

export default function BugDetails({ id }: { id: string }) {
  const router = useRouter();
  const { data: bugData, isLoading, error, refetch } = useBugDetails(id);

  const [bug, setBug] = useState<Bug | null>(null);
  const [activeTab, setActiveTab] = useState<
    "details"  | "analysis" | "explainability"
  >("details");
  const [showConfidenceDetails, setShowConfidenceDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    description: true,
    steps: true,
    ai_analysis: true,
  });

  useEffect(() => {
    if (bugData) {
      const transformedBug: Bug = {
        ...bugData,
        stepsToReproduce: bugData.stepsToReproduce || [],
        environment: bugData.environment || "Production",
        browser: bugData.browser || "Chrome",
        os: bugData.os || "Windows",
        device: bugData.device || "Desktop",
        version: bugData.version || "1.0.0",
      };
      setBug(transformedBug);
    }
  }, [bugData]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatStatus = (status: string) => {
    return status
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard!");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success("Bug details refreshed!");
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80)
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (score >= 60)
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 80) return TrendingUp;
    if (score >= 60) return Target;
    return AlertCircle;
  };

  const getStatusIcon = (status: BugStatus) => {
    switch(status) {
      case "OPEN": return AlertCircle;
      case "IN_PROGRESS": return Activity;
      case "RESOLVED": return CheckCircle;
      case "CLOSED": return Shield;
      default: return Bug;
    }
  };

  const getPriorityIcon = (priority: BugPriority) => {
    switch(priority) {
      case "critical": return Flame;
      case "high": return Zap;
      case "medium": return Target;
      case "low": return Wind;
      default: return Flag;
    }
  };

  const getSeverityIcon = (severity: BugSeverity) => {
    switch(severity) {
      case "CRITICAL": return AlertTriangle;
      case "HIGH": return ZapIcon;
      case "MEDIUM": return Gauge;
      case "LOW": return Wind;
      default: return AlertCircle;
    }
  };

  const generateExplainabilityPoints = () => {
    if (!bug?.ai_analysis?.confidence_explanation) return [];
    
    const explanation = bug.ai_analysis.confidence_explanation;
    const points = [];
    
    // Keyword impact
    if (explanation.keywords && explanation.keywords.length > 0) {
      points.push({
        type: "keywords",
        title: "Keyword Analysis",
        description: `Detected ${explanation.keywords.length} high-impact keywords: ${explanation.keywords.join(', ')}`,
        impact: "positive",
        details: "These keywords strongly indicate the predicted category"
      });
    }
    
    // Similar bug impact
    if (explanation.similar_bug_score) {
      const impact = explanation.similar_bug_score > 0.7 ? "positive" : "neutral";
      points.push({
        type: "similarity",
        title: "Historical Pattern Matching",
        description: `${Math.round(explanation.similar_bug_score * 100)}% similarity with existing bug patterns`,
        impact,
        details: explanation.similar_bug_score > 0.7 
          ? "Strong match with historical bugs reinforces confidence"
          : "Moderate pattern similarity, some uncertainty remains"
      });
    }
    
    // Model confidence impact
    if (explanation.model_confidence) {
      points.push({
        type: "model",
        title: "Model Confidence",
        description: `Model certainty: ${Math.round(explanation.model_confidence * 100)}%`,
        impact: explanation.model_confidence > 0.8 ? "positive" : explanation.model_confidence > 0.6 ? "neutral" : "negative",
        details: explanation.model_confidence > 0.8
          ? "High model confidence indicates clear pattern recognition"
          : explanation.model_confidence > 0.6
          ? "Moderate confidence, some ambiguity in classification"
          : "Low confidence due to unclear or ambiguous patterns"
      });
    }
    
    // Explainability score
    if (explanation.explainability_score) {
      points.push({
        type: "explainability",
        title: "Explainability Score",
        description: `${explanation.explainability_score}% of prediction can be explained`,
        impact: explanation.explainability_score > 85 ? "positive" : "neutral",
        details: explanation.explainability_score > 85
          ? "High transparency - we can clearly explain why this prediction was made"
          : "Moderate transparency - some factors are harder to explain"
      });
    }
    
    return points;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Bug className="h-6 w-6 text-red-400 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md p-8 bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl"
        >
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Error Loading Bug</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't load the bug details. Please try again.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={() => router.push("/bugs")}
              variant="outline"
              className="bg-white/5 border-white/10 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bugs
            </Button>
            <Button
              onClick={handleRefresh}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const ConfidenceIcon = bug.ai_analysis?.confidence_explanation
    ? getConfidenceIcon(bug.confidence_score * 100)
    : Zap;

  const StatusIcon = getStatusIcon(bug.status);
  const PriorityIcon = getPriorityIcon(bug.priority);
  const SeverityIcon = getSeverityIcon(bug.predicted_severity);
  const explainabilityPoints = generateExplainabilityPoints();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/bugs")}
              className="bg-white/5 border-white/10 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <span className="text-xs text-muted-foreground font-mono bg-white/5 px-2 py-1 rounded flex items-center gap-1">
              <Fingerprint className="h-3 w-3" />
              {bug.id}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="text-muted-foreground hover:text-white"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-muted-foreground hover:text-white"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                <Bug className="h-6 w-6 text-red-400" />
                {bug.title}
              </h1>
              <p className="text-muted-foreground">{bug.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-3">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border font-medium ${statusColors[bug.status]}`}
        >
          <StatusIcon className="h-4 w-4" />
          {formatStatus(bug.status)}
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border font-medium ${priorityColors[bug.priority]}`}
        >
          <PriorityIcon className="h-4 w-4" />
          {bug.priority.toUpperCase()} Priority
        </motion.div>
        
        {bug.category && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border font-medium ${categoryColors[bug.category] || "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}
            title={`Category: ${bug.category_display || bug.category}`}
          >
            <Layers className="h-4 w-4" />
            {bug.category_display || bug.category}
          </motion.div>
        )}
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border font-medium ${severityColors[bug.predicted_severity]}`}
        >
          <SeverityIcon className="h-4 w-4" />
          {bug.predicted_severity} Severity
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border font-medium cursor-pointer hover:opacity-90 transition-all ${getConfidenceColor(bug.confidence_score * 100)}`}
          onClick={() => setShowConfidenceDetails(!showConfidenceDetails)}
          title="Click to view AI confidence explanation"
        >
          <ConfidenceIcon className="h-4 w-4" />
          AI Confidence: {Math.round(bug.confidence_score * 100)}%
        </motion.div>
      </div>

      {/* Confidence Explanation Popup */}
      <AnimatePresence>
        {showConfidenceDetails && bug.ai_analysis?.confidence_explanation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card/80 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-400" />
                Explainable AI - Confidence Analysis
              </h3>
              <button
                onClick={() => setShowConfidenceDetails(false)}
                className="p-1 hover:bg-white/5 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">Model Confidence</span>
                </div>
                <div className="text-2xl font-bold">
                  {Math.round(bug.confidence_score * 100)}%
                </div>
                <div
                  className={`text-sm px-2 py-1 rounded-full inline-block ${getConfidenceColor(bug.confidence_score * 100)}`}
                >
                  {bug.ai_analysis.confidence_explanation.level} Confidence
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium">
                    Explainability Score
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {bug.ai_analysis.confidence_explanation
                    .explainability_score || 92}%
                </div>
                <div className="text-sm text-muted-foreground">
                  How well we can explain the prediction
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium">Similar Bug Score</span>
                </div>
                <div className="text-2xl font-bold">
                  {bug.ai_analysis.confidence_explanation.similar_bug_score
                    ? Math.round(
                        bug.ai_analysis.confidence_explanation
                          .similar_bug_score * 100,
                      ) + "%"
                    : "N/A"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Similarity with historical bugs
                </div>
              </div>
            </div>

            {/* Detected Keywords */}
            {bug.ai_analysis.confidence_explanation.keywords && (
              <div className="mb-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-400" />
                  Detected High-Impact Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {bug.ai_analysis.confidence_explanation.keywords.map(
                    (keyword, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="px-3 py-1 bg-amber-500/10 text-amber-400 text-sm rounded-full border border-amber-500/20"
                      >
                        {keyword}
                      </motion.span>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Explanation Points */}
            <div className="space-y-4">
              <h4 className="font-medium mb-2">
                Why the AI is{" "}
                {bug.ai_analysis.confidence_explanation.level.toLowerCase()}{" "}
                confidence:
              </h4>
              <ul className="space-y-3">
                {bug.ai_analysis.confidence_explanation.points.map(
                  (point, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-blue-400" />
                      </div>
                      <span className="text-muted-foreground">{point}</span>
                    </motion.li>
                  ),
                )}
              </ul>
            </div>

            {/* How it works */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-400" />
                How Explainable AI Works
              </h4>
              <p className="text-sm text-muted-foreground">
                Our backend AI analyzes bug descriptions using natural language
                processing and pattern matching. It looks for specific keywords,
                compares with historical bug patterns, and calculates similarity
                scores to provide transparent confidence levels and explanations.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="flex space-x-8 overflow-x-auto pb-1">
          {[
            { id: "details", label: "Details", icon: Info },
            { id: "analysis", label: "AI Analysis", icon: Brain },
            { id: "explainability", label: "Explainability", icon: Lightbulb },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-red-500 text-red-400"
                  : "border-transparent text-muted-foreground hover:text-white"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Details Tab */}
        {activeTab === "details" && (
          <>
            {/* Description Section */}
            <div className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('description')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-red-400" />
                  Description
                </h3>
                {expandedSections.description ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              
              <AnimatePresence>
                {expandedSections.description && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6"
                  >
                    <p className="text-muted-foreground whitespace-pre-line">
                      {bug.description}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Steps to Reproduce */}
            {bug.stepsToReproduce && bug.stepsToReproduce.length > 0 && (
              <div className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('steps')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Code className="h-5 w-5 text-red-400" />
                    Steps to Reproduce
                  </h3>
                  {expandedSections.steps ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                
                <AnimatePresence>
                  {expandedSections.steps && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6"
                    >
                      <ol className="space-y-3">
                        {bug.stepsToReproduce.map(
                          (step: string, index: number) => (
                            <motion.li
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex gap-3"
                            >
                              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-sm">
                                {index + 1}
                              </span>
                              <span className="text-muted-foreground">{step}</span>
                            </motion.li>
                          ),
                        )}
                      </ol>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Tags */}
            {bug.tags && bug.tags.length > 0 && (
              <div className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-red-400" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {bug.tags.map((tag: string, index: number) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/50"
                        onClick={() => {
                          router.push(`/bugs?tag=${tag}`);
                        }}
                      >
                        <Tag className="h-3 w-3 mr-2" />
                        {tag}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {/* AI Analysis Tab */}
        {activeTab === "analysis" && (
          <div className="space-y-6">
            {/* AI Analysis Card */}
            <div className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-400" />
                AI-Powered Bug Analysis
              </h3>

              {bug.ai_analysis ? (
                <div className="space-y-8">
                  {/* Root Cause */}
                  {bug.ai_analysis.root_cause && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <h4 className="font-medium mb-3 text-red-400 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Root Cause Analysis
                      </h4>
                      <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <p className="text-muted-foreground">
                          {bug.ai_analysis.root_cause}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Suggested Fix */}
                  {bug.ai_analysis.suggested_fix && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <h4 className="font-medium mb-3 text-emerald-400 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Suggested Fix
                      </h4>
                      <div className="bg-black/20 p-4 rounded-lg border border-emerald-500/20">
                        <pre className="text-muted-foreground whitespace-pre-wrap font-mono text-sm">
                          {bug.ai_analysis.suggested_fix}
                        </pre>
                      </div>
                    </motion.div>
                  )}

                  {/* Priority Reason */}
                  {bug.ai_analysis.priority_reason && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h4 className="font-medium mb-3 text-amber-400 flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Priority Assignment
                      </h4>
                      <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <p className="text-muted-foreground">
                          {bug.ai_analysis.priority_reason}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Risk Assessment */}
                  {bug.ai_analysis.risk_assessment && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h4 className="font-medium mb-3 text-amber-400 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Risk Assessment
                      </h4>
                      <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <p className="text-muted-foreground">
                          {bug.ai_analysis.risk_assessment}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Similar Bugs */}
                  {bug.ai_analysis.similar_bugs &&
                    bug.ai_analysis.similar_bugs.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <h4 className="font-medium mb-3 text-purple-400 flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Similar Historical Bugs
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {bug.ai_analysis.similar_bugs.map(
                            (similarBug: string, index: number) => (
                              <motion.div
                                key={index}
                                whileHover={{ scale: 1.05 }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
                                  onClick={() =>
                                    router.push(`/bugs/${similarBug}`)
                                  }
                                >
                                  {similarBug}
                                </Button>
                              </motion.div>
                            ),
                          )}
                        </div>
                      </motion.div>
                    )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No AI analysis available for this bug.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Explainability Tab */}
        {activeTab === "explainability" && (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                Why This Prediction?
              </h3>

              {bug.ai_analysis?.confidence_explanation ? (
                <div className="space-y-8">
                  {/* Overall Confidence */}
                  <div className="text-center p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                    <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {Math.round(bug.confidence_score * 100)}%
                    </div>
                    <div className="text-lg text-muted-foreground mb-4">
                      Overall Confidence Score
                    </div>
                    <div className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getConfidenceColor(bug.confidence_score * 100)}`}>
                      {bug.ai_analysis.confidence_explanation.level} Confidence Level
                    </div>
                  </div>

                  {/* Factor Breakdown */}
                  <div>
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-400" />
                      Factor Breakdown
                    </h4>
                    <div className="space-y-4">
                      {explainabilityPoints.map((point, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-4 rounded-lg border ${
                            point.impact === "positive" 
                              ? "bg-emerald-500/10 border-emerald-500/20" 
                              : point.impact === "neutral"
                              ? "bg-amber-500/10 border-amber-500/20"
                              : "bg-red-500/10 border-red-500/20"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium flex items-center gap-2">
                              {point.impact === "positive" ? (
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                              ) : point.impact === "neutral" ? (
                                <Target className="h-4 w-4 text-amber-400" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-400" />
                              )}
                              {point.title}
                            </h5>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              point.impact === "positive" 
                                ? "bg-emerald-500/20 text-emerald-400" 
                                : point.impact === "neutral"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                            }`}>
                              {point.impact === "positive" ? "Supporting" : point.impact === "neutral" ? "Neutral" : "Conflicting"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {point.description}
                          </p>
                          <p className="text-xs text-muted-foreground/80">
                            {point.details}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Explanation Points */}
                  <div>
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-400" />
                      Detailed Analysis
                    </h4>
                    <ul className="space-y-3">
                      {bug.ai_analysis.confidence_explanation.points.map(
                        (point, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-3 p-3 bg-white/5 rounded-lg"
                          >
                            <div className="h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="h-3 w-3 text-blue-400" />
                            </div>
                            <span className="text-sm text-muted-foreground">{point}</span>
                          </motion.li>
                        ),
                      )}
                    </ul>
                  </div>

                  {/* Keywords Impact */}
                  {bug.ai_analysis.confidence_explanation.keywords && (
                    <div>
                      <h4 className="font-medium mb-4 flex items-center gap-2">
                        <Tag className="h-5 w-5 text-amber-400" />
                        Keyword Impact Analysis
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {bug.ai_analysis.confidence_explanation.keywords.map(
                          (keyword, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center"
                            >
                              <span className="text-sm font-medium text-amber-400">
                                {keyword}
                              </span>
                              <div className="text-xs text-muted-foreground mt-1">
                                High impact keyword
                              </div>
                            </motion.div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {/* How the AI Works */}
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-purple-400" />
                      How the AI Reached This Conclusion
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      The AI analyzed your bug description by:
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Circle className="h-2 w-2 mt-1.5 text-blue-400 fill-blue-400" />
                        <span>Breaking down the text into key phrases and technical terms</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Circle className="h-2 w-2 mt-1.5 text-blue-400 fill-blue-400" />
                        <span>Comparing with patterns from thousands of historical bugs</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Circle className="h-2 w-2 mt-1.5 text-blue-400 fill-blue-400" />
                        <span>Identifying critical keywords that indicate specific categories</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Circle className="h-2 w-2 mt-1.5 text-blue-400 fill-blue-400" />
                        <span>Calculating similarity scores with existing bug reports</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Circle className="h-2 w-2 mt-1.5 text-blue-400 fill-blue-400" />
                        <span>Weighting each factor to determine the most likely classification</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No explainability data available for this prediction.
                </p>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}