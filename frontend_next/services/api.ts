import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Add request interceptor to add token to requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      // Get token from store instead of localStorage to ensure it's always up to date
      const token = useAuthStore.getState().accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip token refresh for login and register endpoints
    const isAuthEndpoint =
      originalRequest.url?.includes("/api/token/") ||
      originalRequest.url?.includes("/api/register/");

    // If it's an auth endpoint or not a 401 error, reject immediately
    if (
      isAuthEndpoint ||
      error.response?.status !== 401 ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    // If we're already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          // Retry with new token
          const newToken = useAuthStore.getState().accessToken;
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return api(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { refreshAccessToken, logout } = useAuthStore.getState();
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Update the token in the original request
        const newToken = useAuthStore.getState().accessToken;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Process queued requests
        processQueue();

        // Retry original request
        return api(originalRequest);
      } else {
        // Refresh failed - logout
        const error = new Error("Token refresh failed");
        processQueue(error);
        logout();

        // Only redirect if not on login page
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/auth/login")
        ) {
          window.location.href = "/auth/login";
        }

        return Promise.reject(error);
      }
    } catch (refreshError) {
      processQueue(refreshError);
      const { logout } = useAuthStore.getState();
      logout();

      // Only redirect if not on login page
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/auth/login")
      ) {
        window.location.href = "/auth/login";
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// API functions

// Login
export const login = async (username: string, password: string) => {
  const response = await api.post("/api/token/", { username, password });
  return response.data;
};

// In your api.ts file, update the useLogin hook
export const useLogin = () => {
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }) => login(username, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error: any) => {
      // Log the error but don't rethrow to prevent page refresh
      console.error("Login mutation error:", error);
      // The error will be available in the mutation's error state
      // and can be accessed in the component's onError callback
    },
    // Add this to prevent retries on auth errors
    retry: false,
  });
};

// Register
export const register = async (userData: any) => {
  const response = await api.post("/api/register/", userData);
  return response.data;
};

export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: any) => register(userData),
    onSuccess: () => {
      // Invalidate auth-related queries
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (error: any) => {
      console.error("Registration error:", error);
      throw error;
    },
  });
};

// Logout
export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
  delete api.defaults.headers.common["Authorization"];
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return () => {
    logout();
    queryClient.clear();
  };
};

// Get current user
export const useCurrentUser = () => {
  return useAuthStore((state) => state.user);
};

export const refreshToken = async (refreshToken: string) => {
  const response = await api.post("/api/token/refresh/", {
    refresh: refreshToken,
  });
  return response.data;
};

// Dashboard
export const dashboard = async () => {
  const response = await api.get("/api/dashboard/");
  return response.data;
};

export const useDashboard = () => {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboard(),
    retry: (failureCount, error: any) => {
      // Don't retry on 401
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
};

// All Bugs
export const allBugs = async () => {
  const response = await api.get("/api/bugs/");
  return response.data;
};

export const useAllBugs = () => {
  return useQuery({
    queryKey: ["allBugs"],
    queryFn: () => allBugs(),
    retry: (failureCount, error: any) => {
      // Don't retry on 401
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
};

// Single Bug
export const fetchBugDetails = async (id: string) => {
  const response = await api.get(`/api/bugs/${id}/`);
  return response.data;
};

export const useBugDetails = (id: string) => {
  return useQuery({
    queryKey: ["bugDetails", id],
    queryFn: () => fetchBugDetails(id),
    enabled: !!id,
    retry: (failureCount, error: any) => {
      // Don't retry on 401
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
};

// Update Bug Status
export const updateBugStatus = async (id: string, status: string) => {
  const response = await api.patch(`/api/bugs/${id}/status/`, { status });
  return response.data;
};

// Update Bug
export const updateBug = async (id: string, data: any) => {
  const response = await api.put(`/api/bugs/${id}/update/`, data);
  return response.data;
};

export const useUpdateBug = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateBug(id, data),
    onSuccess: (data, variables) => {
      // Invalidate the specific bug query
      queryClient.invalidateQueries({ queryKey: ["bugDetails"] });
      // Invalidate all bugs query
      queryClient.invalidateQueries({ queryKey: ["allBugs"] });
      // Invalidate dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      // Invalidate project details if project is affected
      queryClient.invalidateQueries({ queryKey: ["project"] });
      // Invalidate project bugs if project is affected
      queryClient.invalidateQueries({
        queryKey: ["projectBugs"],
      });
      // Invalidate bug details if project is affected
      queryClient.invalidateQueries({ queryKey: ["bugDetails"] });
    },
  });
};

// Delete Bug
export const deleteBug = async (id: string) => {
  const response = await api.delete(`/api/bugs/${id}/delete/`);
  return response.data;
};

export const useDeleteBug = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBug(id),
    onSuccess: () => {
      // Invalidate all bugs query
      queryClient.invalidateQueries({ queryKey: ["allBugs"] });
      // Invalidate dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      // Invalidate bug details if project is affected
      queryClient.invalidateQueries({ queryKey: ["bugDetails"] });
      // Invalidate project details if project is affected
      queryClient.invalidateQueries({ queryKey: ["project"] });
      // Invalidate project bugs if project is affected
      queryClient.invalidateQueries({ queryKey: ["projectBugs"] });
    },
  });
};

// Add Bug
export const addBug = async (data: {
  title: string;
  description: string;
  project: string;
  status: string;
  stepsToReproduce: string[];
  tags: string[];
}) => {
  const response = await api.post("/api/bugs/add/", data);
  return response.data;
};

export const useAddBug = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      project: string;
      status: string;
      stepsToReproduce: string[];
      tags: string[];
    }) => addBug(data),
    onSuccess: () => {
      // Invalidate all bugs query
      queryClient.invalidateQueries({ queryKey: ["allBugs"] });
      // Invalidate dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      // Invalidate bug details if project is affected
      queryClient.invalidateQueries({ queryKey: ["bugDetails"] });
      // Invalidate project
      queryClient.invalidateQueries({ queryKey: ["project"] });
      // Invalidate project bugs
      queryClient.invalidateQueries({ queryKey: ["projectBugs"] });
    },
  });
};

// Project API

// Fetch all projects
export const fetchProjects = async () => {
  const response = await api.get("/api/projects/");
  return response.data;
};

export const useProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
    retry: (failureCount, error: any) => {
      // Don't retry on 401
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
};

// Fetch single project details
export const fetchProject = async (id: string) => {
  const response = await api.get(`/api/projects/${id}/`);
  return response.data;
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
    retry: (failureCount, error: any) => {
      // Don't retry on 401
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
};

// Create new project
export const createProject = async (data: any) => {
  const response = await api.post("/api/projects/", data);
  return response.data;
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

// Update project
export const updateProject = async (id: string, data: any) => {
  const response = await api.put(`/api/projects/${id}/`, data);
  return response.data;
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateProject(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.id] });
    },
  });
};

// Delete project
export const deleteProject = async (id: string) => {
  const response = await api.delete(`/api/projects/${id}/`);
  return response.data;
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

// Export Project
export const exportProject = async (id: string) => {
  // Handle both PROJ-123 format and numeric ID
  const projectId = id.includes("PROJ-") ? id : `PROJ-${id}`;
  const response = await api.get(`/api/projects/${projectId}/export/`);
  return response.data;
};

export const useExportProject = () => {
  return useMutation({
    mutationFn: (id: string) => exportProject(id),
    onSuccess: (data) => {
      console.log("Export successful:", data);

      // Open the file URL in a new tab to download
      if (data.file_url) {
        // If it's a relative URL, construct the full URL
        const baseURL = process.env.NEXT_PUBLIC_API_URL;
        const fullUrl = data.file_url.startsWith("http")
          ? data.file_url
          : `${baseURL}${data.file_url}`;

        window.open(fullUrl, "_blank");
      }
    },
    onError: (error: any) => {
      console.error("Export failed:", error);
      // You can add toast notification here
      if (error.response?.data?.error) {
        alert(`Export failed: ${error.response.data.error}`);
      } else {
        alert("Export failed. Please try again.");
      }
    },
  });
};

// Fetch project bugs
export const fetchProjectBugs = async (projectId: string) => {
  const response = await api.get(`/api/bugs/?project=${projectId}`);
  return response.data;
};

export const useProjectBugs = (projectId: string) => {
  return useQuery({
    queryKey: ["projectBugs", projectId],
    queryFn: () => fetchProjectBugs(projectId),
    enabled: !!projectId,
    retry: (failureCount, error: any) => {
      // Don't retry on 401
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
};

// Analysis API

export const fetchAnalysis = async (timeRange = "30d") => {
  const response = await api.get(`/api/analytics/?range=${timeRange}`);
  return response.data;
};

export const useAnalysis = (timeRange = "30d") => {
  return useQuery({
    queryKey: ["analysis", timeRange],
    queryFn: () => fetchAnalysis(timeRange),
    retry: (failureCount, error: any) => {
      // Don't retry on 401
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
};

export default api;
