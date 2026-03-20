// store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import api, { setAuthToken } from "@/services/api";

// Types
export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: "admin" | "developer" | "viewer" | string;
  avatar?: string;
  date_joined?: string;
  last_login?: string;
  is_active?: boolean;
  is_staff?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user?: User;
}

export interface AuthError {
  message: string;
  status?: number;
  details?: any;
}

// Store interface
interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  error: AuthError | null;
  
  // Refresh queue
  refreshPromise: Promise<boolean> | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh: string) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  clearAuth: () => void;
  refreshAccessToken: () => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
  setError: (error: AuthError | null) => void;
  setLoading: (isLoading: boolean) => void;
}

// Create the store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      refreshToken: null,
      error: null,
      refreshPromise: null,

      // Set user
      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        });
      },

      // Set tokens
      setTokens: (access, refresh) => {
        set({
          accessToken: access,
          refreshToken: refresh,
          error: null,
          refreshPromise: null, // Clear refresh promise on new tokens
        });

        // Set axios default header
        setAuthToken(access);
      },

      // Login action
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // Make login request
          const response = await api.post<AuthResponse>("/api/token/", {
            username,
            password,
          });

          const { access, refresh, user } = response.data;

          // Set tokens
          get().setTokens(access, refresh);

          // Fetch user details if not provided in login response
          let userData = user;
          if (!userData) {
            try {
              const userResponse = await api.get("/api/users/me/");
              userData = userResponse.data;
            } catch (userError) {
              console.warn("Could not fetch user details:", userError);
            }
          }

          // Set user
          get().setUser(
            userData || {
              id: 0,
              username,
              role: "user",
            },
          );

          set({ isLoading: false });
        } catch (error: any) {
          console.error("Login error:", error);

          // Handle different error types
          let errorMessage = "Login failed. Please check your credentials.";
          let errorStatus = error.response?.status;

          if (error.response?.data) {
            const data = error.response.data;
            if (data.detail) {
              errorMessage = data.detail;
            } else if (data.non_field_errors) {
              errorMessage = data.non_field_errors[0];
            } else if (data.username) {
              errorMessage = `Username: ${data.username[0]}`;
            } else if (data.password) {
              errorMessage = `Password: ${data.password[0]}`;
            }
          } else if (error.request) {
            errorMessage =
              "No response from server. Please check your connection.";
          }

          set({
            isLoading: false,
            error: {
              message: errorMessage,
              status: errorStatus,
              details: error.response?.data,
            },
          });

          throw error;
        }
      },

      // Logout action
      logout: () => {
        // Clear all auth data from state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          refreshPromise: null,
        });

        // Clear axios header
        setAuthToken(null);
      },

      // Check authentication status
      checkAuth: async () => {
        const { accessToken, refreshToken, refreshAccessToken, logout } = get();

        // If no tokens, not authenticated
        if (!accessToken || !refreshToken) {
          return false;
        }

        try {
          // Verify token with backend
          await api.post("/api/token/verify/", { token: accessToken });
          return true;
        } catch (error) {
          // Token is invalid, try to refresh
          try {
            const refreshed = await refreshAccessToken();
            return refreshed;
          } catch (refreshError) {
            // Refresh failed, logout
            logout();
            return false;
          }
        }
      },

      // Clear auth state
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          refreshPromise: null,
        });
        setAuthToken(null);
      },

      // Refresh access token with queue mechanism
      refreshAccessToken: async () => {
        const { refreshToken, refreshPromise } = get();

        // If no refresh token, can't refresh
        if (!refreshToken) {
          return false;
        }

        // If there's already a refresh in progress, return that promise
        if (refreshPromise) {
          return refreshPromise;
        }

        // Create new refresh promise
        const promise = (async () => {
          try {
            const response = await api.post<{ access: string }>(
              "/api/token/refresh/",
              {
                refresh: refreshToken,
              }
            );

            const { access } = response.data;

            // Update tokens
            set({ 
              accessToken: access,
              refreshPromise: null,
            });
            setAuthToken(access);

            return true;
          } catch (error) {
            console.error("Token refresh failed:", error);
            // Clear refresh promise on error
            set({ refreshPromise: null });
            
            // If refresh failed, logout
            get().logout();
            
            return false;
          }
        })();

        set({ refreshPromise: promise });
        
        return promise;
      },

      // Update user data
      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          const updatedUser = { ...user, ...userData };
          set({ user: updatedUser });
        }
      },

      // Set error
      setError: (error) => set({ error }),

      // Set loading state
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // Add validation to check if stored tokens are expired
      onRehydrateStorage: (state) => {
        // Check if tokens exist and might be expired
        if (state?.accessToken && state?.refreshToken) {
          // You can add token expiration check here if you store expiry time
          // For now, we'll let the first API call handle it
          console.log("Auth state rehydrated");
        }
      },
    }
  ),
);

// Selector hooks
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAccessToken = () => useAuthStore((state) => state.accessToken);

// Helper hook for auth actions
export const useAuthActions = () => {
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);
  const updateUser = useAuthStore((state) => state.updateUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setError = useAuthStore((state) => state.setError);
  const setLoading = useAuthStore((state) => state.setLoading);

  return {
    login,
    logout,
    checkAuth,
    refreshAccessToken,
    updateUser,
    clearAuth,
    setError,
    setLoading,
  };
};

export default useAuthStore;