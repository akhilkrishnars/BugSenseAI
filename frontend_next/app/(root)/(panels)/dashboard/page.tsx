"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Bug,
  FolderKanban,
  BarChart3,
  Eye,
  MoreVertical,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { useDashboard } from "@/services/api";

// Color mapping for consistent UI
const statusColors: Record<string, string> = {
  Open: "#ef4444",
  "In Progress": "#f59e0b",
  Resolved: "#10b981",
  Closed: "#8b5cf6",
};

const priorityColors: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f59e0b",
  Medium: "#3b82f6",
  Low: "#10b981",
};

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard();
  const [timeRange, setTimeRange] = useState("week");

  // Transform data for charts
  const transformData = () => {
    if (!data) return null;

    // Transform bug status data with colors
    const bugStatusData = data?.bugStatus?.map((status: any) => ({
      ...status,
      color: statusColors[status.name] || "#6b7280",
    }));

    // Transform priority data with colors
    const priorityData = data?.priorityDistribution?.map((priority: any) => ({
      ...priority,
      color: priorityColors[priority.priority] || "#6b7280",
    }));

    return {
      stats: data.stats,
      bugStatusData,
      weeklyTrendData: data.weeklyTrends,
      priorityData,
      recentBugs: data.recentBugs,
    };
  };

  const transformedData = transformData();

  const statsCards = transformedData
    ? [
        {
          title: "Total Bugs",
          value: transformedData?.stats?.total_bugs.toString(),
          change: "+0%", // You might want to calculate this from historical data
          trend: "up",
          icon: Bug,
          color: "bg-red-500/10 text-red-400",
          detail: "Active issues",
        },
        {
          title: "Active Projects",
          value: transformedData?.stats?.active_projects.toString(),
          change: "+0",
          trend: "up",
          icon: FolderKanban,
          color: "bg-blue-500/10 text-blue-400",
          detail: "With active issues",
        },
        {
          title: "Resolved Today",
          value: transformedData?.stats?.resolved_today.toString(),
          change: "+0%",
          trend: "up",
          icon: CheckCircle,
          color: "bg-emerald-500/10 text-emerald-400",
          detail: "From yesterday",
        },
        {
          title: "Critical Bugs",
          value: transformedData?.stats?.critical_bugs.toString(),
          change: "+0",
          trend: transformedData?.stats?.critical_bugs > 0 ? "up" : "neutral",
          icon: AlertCircle,
          color: "bg-rose-500/10 text-rose-400",
          detail: "Needs immediate attention",
        },
      ]
    : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="font-medium">{label}</p>
          {payload?.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total =
        transformedData?.bugStatusData?.reduce(
          (a: any, b: any) => a + b.value,
          0,
        ) || 0;
      return (
        <div className="bg-card border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">{payload[0].value} bugs</p>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Error loading dashboard</h3>
          <p className="text-muted-foreground">
            Failed to load dashboard data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (!transformedData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">No data available</h3>
          <p className="text-muted-foreground">No dashboard data found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Overview</h2>
          <p className="text-muted-foreground">
            Real-time insights and analytics
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards?.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="flex items-center space-x-1">
                {stat.trend === "neutral" && (
                  <span className="h-4 w-4" /> // Empty space for alignment
                )}
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
            <p className="text-sm font-medium mb-1">{stat.title}</p>
            <p className="text-xs text-muted-foreground">{stat.detail}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bug Trends Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">Bug Trends</h3>
              <p className="text-sm text-muted-foreground">
                Weekly bug report vs resolution
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transformedData.weeklyTrendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="bugs"
                  stackId="1"
                  stroke="#ef4444"
                  fill="url(#colorBugs)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stackId="1"
                  stroke="#10b981"
                  fill="url(#colorResolved)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorBugs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="colorResolved"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Bug Status Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">Bug Status</h3>
              <p className="text-sm text-muted-foreground">
                Distribution by current status
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={transformedData.bugStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${percent ? (percent * 100).toFixed(0) : ""}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {transformedData?.bugStatusData?.map(
                    (entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ),
                  )}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Additional Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-lg font-bold">Bug Priority</h3>
              <p className="text-sm text-muted-foreground">
                Distribution by priority level
              </p>
            </div>
          </div>
          <div className="h-62">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transformedData.priorityData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="priority" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {transformedData?.priorityData?.map(
                    (entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Bugs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">Recent Bugs</h3>
              <p className="text-sm text-muted-foreground">
                Latest reported issues
              </p>
            </div>
            <button className="text-sm text-red-400 hover:text-red-300 font-medium">
              View all →
            </button>
          </div>
          <div className="space-y-3 h-68">
            {transformedData?.recentBugs?.slice(0, 3).map((bug: any) => (
              <div
                key={bug.id}
                className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        bug.priority === "Critical"
                          ? "bg-red-500 animate-pulse"
                          : bug.priority === "High"
                            ? "bg-amber-500"
                            : bug.priority === "Medium"
                              ? "bg-blue-500"
                              : "bg-emerald-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {bug.id}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            bug.status === "Open"
                              ? "bg-red-500/20 text-red-400"
                              : bug.status === "In Progress"
                                ? "bg-amber-500/20 text-amber-400"
                                : bug.status === "Resolved"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-purple-500/20 text-purple-400"
                          }`}
                        >
                          {bug.status}
                        </span>
                      </div>
                      <p className="font-medium truncate">{bug.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {bug.project} • {bug.time}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
