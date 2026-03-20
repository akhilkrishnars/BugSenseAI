"use client";

import { ArrowRight, Bot, User, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useState, Suspense } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useLogin } from "@/services/api";

const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Separate component that uses useSearchParams
function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";
  
  const { mutate: login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login(
      { username: data.username, password: data.password },
      {
        onSuccess: () => {
          toast.success("Login successful!");
          router.push(returnUrl);
        },
        onError: (error: any) => {
          // Extract the error message from the response
          let errorMessage = "Login failed. Please check your credentials.";
          
          // Check if error has response data
          if (error.response?.data?.detail) {
            errorMessage = error.response.data.detail;
          } else if (error.message) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          // Show toast with the error message
          toast.error(errorMessage);
        },
      }
    );
  };

  // Get error message from the mutation error for display in form
  const errorMessage = error 
    ? error?.response?.data?.detail || 
      error?.message || 
      "Login failed. Please check your credentials."
    : null;

  return (
    <>
      {/* Logo & Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="h-12 w-12 bg-gradient-primary rounded-xl flex items-center justify-center">
            <Bot className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary">
            BugSense AI
          </h1>
        </div>
        <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
        <p className="text-muted-foreground">
          Sign in to your account to continue
        </p>
      </motion.div>

      {/* Login Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-8"
      >
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
          >
            <p className="text-red-400 text-sm font-medium">
              {errorMessage}
            </p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="username"
            >
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                id="username"
                type="text"
                {...register("username")}
                className={`w-full pl-10 pr-4 py-3 bg-background/50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  errors.username
                    ? "border-red-500/50 focus:ring-red-500/50"
                    : "border-border focus:ring-red-500/50"
                }`}
                placeholder="Enter your username"
                disabled={isPending}
              />
            </div>
            {errors.username && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-sm text-red-400"
              >
                {errors.username.message}
              </motion.p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className={`w-full pl-10 pr-12 py-3 bg-background/50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  errors.password
                    ? "border-red-500/50 focus:ring-red-500/50"
                    : "border-border focus:ring-red-500/50"
                }`}
                placeholder="Enter your password"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
                disabled={isPending}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-sm text-red-400"
              >
                {errors.password.message}
              </motion.p>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-gradient-primary rounded-lg font-semibold hover-glow transition-all duration-300 shadow-glow-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </motion.button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-gradient-primary font-semibold hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>

      {/* Back to home */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center"
      >
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-4 w-4 rotate-180 mr-2" />
          Back to home
        </Link>
      </motion.div>
    </>
  );
}

// Main component with Suspense boundary
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-bugsense flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Suspense fallback={
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="h-12 w-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Bot className="h-7 w-7" />
              </div>
              <h1 className="text-3xl font-bold text-gradient-primary">
                BugSense AI
              </h1>
            </div>
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200/20 rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200/20 rounded w-64 mx-auto"></div>
            </div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}