"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Bug,
  AlertCircle,
  BarChart3,
  Download,
  Calendar,
  Activity,
  Code,
  Server,
  Globe,
  Zap,
  AlertTriangle,
  Gauge,
  Layers,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

// Shadcn UI Components
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

import { useAnalysis } from "@/services/api";

// Types
interface Stat {
  title: string;
  value: string;
  change: string;
  trend: string;
  icon: keyof typeof iconMap;
  color: string;
  description: string;
}

interface BugTrendData {
  period: string;
  reported: number;
  resolved: number;
  critical: number;
}

interface ProjectPerformanceData {
  name: string;
  bugs: number;
  resolved: number;
  active: number;
}

interface BugCategoryData {
  name: string;
  value: number;
  color?: string;
}

interface SeverityTrendData {
  period: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface SeverityDistributionData {
  severity: string;
  count: number;
  color: string;
}

interface TopIssue {
  id: string;
  title: string;
  severity: keyof typeof severityColors;
  project: string;
  reported: string;
  trend: keyof typeof trendIcons;
}

interface Insight {
  title: string;
  description: string;
}

interface BottomMetrics {
  totalProjects: number;
  totalBugs: number;
  totalResolved: number;
}

// Icon map
const iconMap = {
  Bug: Bug,
  AlertTriangle: AlertTriangle,
  Activity: Activity,
  Gauge: Gauge,
};

// Time range options
const timeRangeOptions = [
  { value: "7d", label: "Last 7 days", icon: Calendar },
  { value: "30d", label: "Last 30 days", icon: Calendar },
  { value: "90d", label: "Last 90 days", icon: Calendar },
  { value: "1y", label: "Last year", icon: Calendar },
] as const;

type TimeRange = (typeof timeRangeOptions)[number]["value"];

// Get appropriate X-axis label based on time range
const getXAxisLabel = (timeRange: TimeRange): string => {
  switch (timeRange) {
    case "7d":
      return "Day";
    case "30d":
      return "Week";
    case "90d":
      return "Week";
    case "1y":
      return "Month";
    default:
      return "Period";
  }
};

// Category colors mapping
const categoryColors: Record<string, string> = {
  Authentication: "#3b82f6",
  Performance: "#10b981",
  Crash: "#ef4444",
  Security: "#f59e0b",
  "User Interface": "#8b5cf6",
  Database: "#ec4899",
  API: "#14b8a6",
  Memory: "#f97316",
  Concurrency: "#6366f1",
  Other: "#6b7280",
  "UI/UX": "#8b5cf6",
  Backend: "#ef4444",
  Integration: "#14b8a6",
};

// Severity colors
const severityColors = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const severityChartColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#10b981",
};

const trendIcons = {
  rising: <TrendingUp className="h-4 w-4 text-red-400" />,
  declining: <TrendingDown className="h-4 w-4 text-emerald-400" />,
  stable: <Activity className="h-4 w-4 text-blue-400" />,
};

// Loading Skeleton Component
const AnalyticsSkeleton = () => (
  <div className="space-y-6">
    <div className="h-8 w-64 bg-white/5 rounded-lg animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-80 bg-white/5 rounded-xl animate-pulse" />
      ))}
    </div>
  </div>
);

// Error Component
const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <AlertCircle className="h-12 w-12 text-red-500" />
    <p className="text-red-500">{message}</p>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
    >
      Try Again
    </button>
  </div>
);

// Custom Tooltip for charts
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/90 backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-xl">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [open, setOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
  } = useAnalysis(timeRange);

  // Print Dashboard Function (instead of PDF export)
  const printDashboard = () => {
    if (isPrinting) return;
    
    try {
      setIsPrinting(true);
      
      // Save original title to restore later
      const originalTitle = document.title;
      const rangeLabel = timeRangeOptions.find(o => o.value === timeRange)?.label.replace(/\s+/g, '-') || '30-days';
      document.title = `Analytics-${rangeLabel}`;
      
      // Create print styles
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          /* Hide everything except the dashboard */
          body * {
            visibility: hidden;
          }
          .space-y-6, .space-y-6 * {
            visibility: visible;
          }
          .space-y-6 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #0a0a0a !important;
            color: #fafafa !important;
            padding: 20px !important;
          }
          
          /* Remove interactive elements */
          button, .cursor-pointer, [role="button"], 
          .popover-trigger, .popover-content, .cursor-pointer {
            display: none !important;
          }
          
          /* Fix blur effects */
          .backdrop-blur-sm {
            backdrop-filter: none !important;
            background: rgba(26, 26, 26, 0.95) !important;
          }
          
          /* Ensure all text is visible */
          p, h1, h2, h3, h4, span, div {
            color: #fafafa !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Fix chart colors and text */
          .recharts-wrapper {
            background: transparent !important;
          }
          .recharts-cartesian-grid line {
            stroke: #333 !important;
          }
          .recharts-text {
            fill: #fafafa !important;
            stroke: none !important;
          }
          .recharts-legend-item-text {
            color: #fafafa !important;
          }
          
          /* Ensure gradients print */
          [class*="gradient"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Fix card backgrounds */
          .bg-card, [class*="bg-card"] {
            background: #1a1a1a !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
          }
          
          /* Fix stats cards */
          .bg-gradient-to-br {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Page setup */
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `;
      
      document.head.appendChild(style);
      
      // Trigger print dialog
      window.print();
      
      // Clean up after print dialog closes (with delay)
      setTimeout(() => {
        document.head.removeChild(style);
        document.title = originalTitle;
        setIsPrinting(false);
      }, 1000);
      
    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to print. Please try again.");
      setIsPrinting(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  const chartVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        delay: 0.3,
        duration: 0.5,
      },
    },
  };

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  // Use data from API or fallback to empty arrays if not available
  const stats = (analyticsData?.stats as Stat[]) || [];
  const bugTrendData = (analyticsData?.bugTrendData as BugTrendData[]) || [];
  const projectPerformanceData =
    (analyticsData?.projectPerformanceData as ProjectPerformanceData[]) || [];
  const bugCategoryData =
    (analyticsData?.bugCategoryData as BugCategoryData[]) || [];
  const severityTrendData =
    (analyticsData?.severityTrendData as SeverityTrendData[]) || [];
  const severityDistributionData =
    (analyticsData?.severityDistributionData as SeverityDistributionData[]) ||
    [];
  const topIssues = (analyticsData?.topIssues as TopIssue[]) || [];
  const insights = (analyticsData?.insights as Insight[]) || [];
  const bottomMetrics = (analyticsData?.bottomMetrics as BottomMetrics) || {
    totalProjects: 0,
    totalBugs: 0,
    totalResolved: 0,
  };

  // Get current time range label
  const currentTimeRange =
    timeRangeOptions.find((option) => option.value === timeRange)?.label ||
    "Last 30 days";
  const xAxisLabel = getXAxisLabel(timeRange);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h2
            variants={itemVariants}
            className="text-2xl font-bold flex items-center gap-2"
          >
            <BarChart3 className="h-6 w-6 text-red-500" />
            Analytics Dashboard
          </motion.h2>
          <motion.p variants={itemVariants} className="text-muted-foreground">
            Insights and metrics for bug tracking and resolution
          </motion.p>
        </div>
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          {/* Shadcn Popover for time range selection */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[162px] justify-between bg-white/5 border-white/10 text-white hover:bg-white/10"
                disabled={isPrinting}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {currentTimeRange}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-1 bg-card border-white/10">
              <div className="flex flex-col space-y-1">
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTimeRange(option.value);
                      setOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      timeRange === option.value
                        ? "bg-white/10 text-white"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    {option.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Print Button (replaces Export PDF) */}
          <Button
            onClick={printDashboard}
            variant="outline"
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            disabled={isPrinting || isLoading}
          >
            <Download
              className={`mr-2 h-4 w-4 ${isPrinting ? "animate-bounce" : ""}`}
            />
            {isPrinting ? "Preparing Print..." : "Print / Save PDF"}
          </Button>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat: Stat, index: number) => {
          const IconComponent = iconMap[stat.icon] || Bug;
          return (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </div>
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg shadow-black/10`}
                >
                  <IconComponent className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bug Trends Chart */}
        <motion.div
          variants={chartVariants}
          className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">Bug Trends</h3>
              <p className="text-sm text-muted-foreground">
                Reported vs resolved over time ({currentTimeRange})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bugTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="period"
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  label={{
                    value: xAxisLabel,
                    position: "insideBottom",
                    offset: -5,
                    fill: "#666",
                  }}
                />
                <YAxis stroke="#666" fontSize={12} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{
                    paddingTop: "20px",
                    paddingBottom: "10px",
                  }}
                />
                <Bar
                  dataKey="reported"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  name="Reported"
                />
                <Bar
                  dataKey="resolved"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  name="Resolved"
                />
                <Bar
                  dataKey="critical"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  name="Critical"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Severity Trend Chart */}
        <motion.div
          variants={chartVariants}
          className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">Severity Trend</h3>
              <p className="text-sm text-muted-foreground">
                Bug distribution by severity over time ({currentTimeRange})
              </p>
            </div>
            <AlertCircle className="h-5 w-5 text-orange-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={severityTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="period"
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  label={{
                    value: xAxisLabel,
                    position: "insideBottom",
                    offset: -5,
                    fill: "#666",
                  }}
                />
                <YAxis stroke="#666" fontSize={12} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{
                    paddingTop: "20px",
                    paddingBottom: "10px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="critical"
                  stackId="1"
                  stroke={severityChartColors.critical}
                  fill={severityChartColors.critical}
                  fillOpacity={0.6}
                  name="Critical"
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stackId="1"
                  stroke={severityChartColors.high}
                  fill={severityChartColors.high}
                  fillOpacity={0.6}
                  name="High"
                />
                <Area
                  type="monotone"
                  dataKey="medium"
                  stackId="1"
                  stroke={severityChartColors.medium}
                  fill={severityChartColors.medium}
                  fillOpacity={0.6}
                  name="Medium"
                />
                <Area
                  type="monotone"
                  dataKey="low"
                  stackId="1"
                  stroke={severityChartColors.low}
                  fill={severityChartColors.low}
                  fillOpacity={0.6}
                  name="Low"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Bug Categories */}
        <motion.div
          variants={chartVariants}
          className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">Bug Categories</h3>
              <p className="text-sm text-muted-foreground">
                Distribution by type ({currentTimeRange})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-400" />
              <Server className="h-5 w-5 text-red-400" />
              <Globe className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-full min-h-[280px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bugCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name ?? "Unknown"}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {bugCategoryData.map(
                      (entry: BugCategoryData, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            categoryColors[entry.name] ||
                            entry.color ||
                            "#6b7280"
                          }
                        />
                      ),
                    )}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {bugCategoryData.map(
                (category: BugCategoryData, index: number) => (
                  <div key={category.name} className="flex items-center gap-3">
                    <div
                      className="h-8 w-1 rounded-full"
                      style={{
                        backgroundColor:
                          categoryColors[category.name] ||
                          category.color ||
                          "#6b7280",
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{category.name}</span>
                        <span className="font-medium">{category.value}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden mt-1">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${category.value}%` }}
                          transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor:
                              categoryColors[category.name] ||
                              category.color ||
                              "#6b7280",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </motion.div>

        {/* Severity Distribution */}
        <motion.div
          variants={chartVariants}
          className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">Severity Distribution</h3>
              <p className="text-sm text-muted-foreground">
                Bugs by severity level ({currentTimeRange})
              </p>
            </div>
            <AlertCircle className="h-5 w-5 text-orange-400" />
          </div>
          <div className="space-y-4">
            {severityDistributionData.map(
              (severity: SeverityDistributionData, index: number) => {
                const totalSeverityCount = severityDistributionData.reduce(
                  (acc: number, curr: SeverityDistributionData) =>
                    acc + curr.count,
                  0,
                );
                const percentage =
                  totalSeverityCount > 0
                    ? ((severity.count / totalSeverityCount) * 100).toFixed(1)
                    : "0";

                const color =
                  severityChartColors[severity.severity.toLowerCase()] ||
                  severity.color;

                return (
                  <motion.div
                    key={severity.severity}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    className="flex items-center gap-4 p-3 bg-white/5 rounded-lg"
                  >
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <div
                        className="h-4 w-4 rounded"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{severity.severity}</span>
                        <span className="font-bold">{severity.count}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>{percentage}% of total</span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {severity.severity === "Critical"
                            ? "Urgent"
                            : severity.severity === "High"
                              ? "Priority"
                              : "Normal"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              },
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Section - Top Issues & Project Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Issues */}
        <motion.div
          variants={itemVariants}
          className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Top Issues
              </h3>
              <p className="text-sm text-muted-foreground">
                Most critical bugs requiring attention ({currentTimeRange})
              </p>
            </div>
            <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm font-medium rounded-full">
              {topIssues.length} Active
            </span>
          </div>
          <div className="space-y-3">
            {topIssues.map((issue: TopIssue, index: number) => (
              <motion.div
                key={issue.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {issue.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                        severityColors[issue.severity]
                      }`}
                    >
                      {issue.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{issue.project}</span>
                    <span>•</span>
                    <span>{issue.reported}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {trendIcons[issue.trend]}
                      {issue.trend}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.href = `/bugs/${issue.id}`)}
                  className="text-xs bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  View
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Project Performance */}
        <motion.div
          variants={itemVariants}
          className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Project Performance
              </h3>
              <p className="text-sm text-muted-foreground">
                Bug metrics by project ({currentTimeRange})
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectPerformanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  type="number"
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="bugs"
                  fill="#ef4444"
                  name="Total Bugs"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="resolved"
                  fill="#10b981"
                  name="Resolved"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="active"
                  fill="#3b82f6"
                  name="Active"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Total Projects</p>
              <p className="text-xl font-bold">{bottomMetrics.totalProjects}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Total Bugs</p>
              <p className="text-xl font-bold">{bottomMetrics.totalBugs}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Resolved</p>
              <p className="text-xl font-bold">{bottomMetrics.totalResolved}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Insights & Recommendations */}
      {insights.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <Zap className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">
                AI Insights & Recommendations
              </h3>
              <p className="text-muted-foreground mb-4">
                Based on your analytics data ({currentTimeRange}), here are some
                actionable insights:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight: Insight, index: number) => (
                  <div key={index} className="p-3 bg-white/5 rounded-lg">
                    <h4 className="font-medium mb-2">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}