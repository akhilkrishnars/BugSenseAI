"use client";

import {
  ArrowRight,
  Bot,
  User,
  Lock,
  Eye,
  EyeOff,
  Mail,
  UserCircle,
  Building,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRegister } from "@/services/api";

// Define the validation schema with Zod
const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(50, "Full name must be less than 50 characters")
      .regex(/^[a-zA-Z\s]*$/, "Full name can only contain letters and spaces"),
    organization: z
      .string()
      .max(100, "Organization name must be less than 100 characters")
      .optional(),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be less than 20 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ),
    email: z
      .string()
      .email("Please enter a valid email address")
      .min(5, "Email must be at least 5 characters")
      .max(100, "Email must be less than 100 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { mutate: registerUser, isPending, error } = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      organization: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    // Prepare user data for API
    const userData = {
      username: data.username,
      email: data.email,
      password: data.password,
      full_name: data.fullName,
      organization: data.organization || "",
    };

    registerUser(userData, {
      onSuccess: () => {
        // Redirect to login page or dashboard after successful registration
        router.push("/auth/login?registered=true");
      },
      onError: (error: any) => {
        // Error is already handled by the useRegister hook
        console.error("Registration error:", error);
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-bugsense flex items-center justify-center p-4">
      <div className="max-w-md w-full">
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
          <h2 className="text-2xl font-bold mb-2">Create Account</h2>
          <p className="text-muted-foreground">
            Get started with BugSense AI today
          </p>
        </motion.div>

        {/* Register Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-8"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <p className="text-red-400 text-sm font-medium">
                {error.response?.data?.detail || "Registration failed. Please try again."}
              </p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="fullName"
              >
                Full Name
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="fullName"
                  type="text"
                  {...register("fullName")}
                  className={`w-full pl-10 pr-4 py-3 bg-background/50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    errors.fullName
                      ? "border-red-500/50 focus:ring-red-500/50"
                      : "border-border focus:ring-red-500/50"
                  }`}
                  placeholder="John Doe"
                  disabled={isPending}
                />
              </div>
              {errors.fullName && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-400"
                >
                  {errors.fullName.message}
                </motion.p>
              )}
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="organization"
              >
                Organization
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="organization"
                  type="text"
                  {...register("organization")}
                  className={`w-full pl-10 pr-4 py-3 bg-background/50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    errors.organization
                      ? "border-red-500/50 focus:ring-red-500/50"
                      : "border-border focus:ring-red-500/50"
                  }`}
                  placeholder="Company name (optional)"
                  disabled={isPending}
                />
              </div>
              {errors.organization ? (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-400"
                >
                  {errors.organization.message}
                </motion.p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional - Helps us provide better team features
                </p>
              )}
            </div>

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
                  placeholder="Choose a username"
                  disabled={isPending}
                />
              </div>
              {errors.username ? (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-400"
                >
                  {errors.username.message}
                </motion.p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  3-20 characters, letters, numbers, and underscores only
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  className={`w-full pl-10 pr-4 py-3 bg-background/50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    errors.email
                      ? "border-red-500/50 focus:ring-red-500/50"
                      : "border-border focus:ring-red-500/50"
                  }`}
                  placeholder="you@example.com"
                  disabled={isPending}
                />
              </div>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-400"
                >
                  {errors.email.message}
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
                  placeholder="••••••••"
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

            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground">
                Password must contain:
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 ml-4">
                <li className="flex items-center">
                  <span className="h-1 w-1 rounded-full bg-current mr-2"></span>
                  At least 8 characters
                </li>
                <li className="flex items-center">
                  <span className="h-1 w-1 rounded-full bg-current mr-2"></span>
                  One uppercase letter
                </li>
                <li className="flex items-center">
                  <span className="h-1 w-1 rounded-full bg-current mr-2"></span>
                  One number
                </li>
                <li className="flex items-center">
                  <span className="h-1 w-1 rounded-full bg-current mr-2"></span>
                  One special character
                </li>
              </ul>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="confirmPassword"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  className={`w-full pl-10 pr-12 py-3 bg-background/50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    errors.confirmPassword
                      ? "border-red-500/50 focus:ring-red-500/50"
                      : "border-border focus:ring-red-500/50"
                  }`}
                  placeholder="••••••••"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
                  disabled={isPending}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm text-red-400"
                >
                  {errors.confirmPassword.message}
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
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-gradient-primary font-semibold hover:underline"
              >
                Sign in
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
      </div>
    </div>
  );
}