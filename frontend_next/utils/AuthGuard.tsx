// components/auth/AuthGuard.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bot, AlertCircle } from 'lucide-react';
import useAuthStore from '@/store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean; // Allow pages to optionally require auth
  requiredRole?: string | string[]; // Role-based access control
  fallbackPath?: string; // Custom fallback path
}

// Public paths that don't require authentication
const publicPaths = [
  '/auth/login', 
  '/auth/register', 
  '/auth/forgot-password',
  '/auth/reset-password',
  '/', 
  '/about', 
  '/pricing',
  '/contact',
  '/privacy',
  '/terms'
];

// Paths that don't require authentication but have special handling
const openPaths = ['/blog', '/docs'];

export default function AuthGuard({ 
  children, 
  requireAuth = true,
  requiredRole,
  fallbackPath = '/auth/login'
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isAuthenticated, 
    checkAuth, 
    isLoading: authLoading,
    user 
  } = useAuthStore();
  
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublicPath, setIsPublicPath] = useState(false);
  const [isOpenPath, setIsOpenPath] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      setIsChecking(true);
      setError(null);
      
      // Check if current path is public
      const publicCheck = publicPaths.includes(pathname);
      const openCheck = openPaths.includes(pathname);
      
      setIsPublicPath(publicCheck);
      setIsOpenPath(openCheck);

      // Skip auth check for public paths
      if (publicCheck) {
        setIsChecking(false);
        return;
      }

      try {
        const isValid = await checkAuth();
        
        // For open paths, we don't require authentication
        if (openCheck) {
          setIsChecking(false);
          return;
        }

        // If authentication is required and user is not valid
        if (requireAuth && !isValid) {
          const returnUrl = encodeURIComponent(pathname);
          router.push(`${fallbackPath}?returnUrl=${returnUrl}`);
          return;
        }

        // Role-based access control
        if (requireAuth && isValid && requiredRole) {
          const userRole = user?.role;
          
          if (!userRole) {
            setError('Unable to verify user permissions');
            router.push('/dashboard'); // Redirect to default page
            return;
          }

          const hasRequiredRole = Array.isArray(requiredRole)
            ? requiredRole.includes(userRole)
            : userRole === requiredRole;

          if (!hasRequiredRole) {
            setError('You do not have permission to access this page');
            router.push('/dashboard'); // Redirect to dashboard
            return;
          }
        }
        
      } catch (err) {
        console.error('Auth check failed:', err);
        setError('Authentication failed. Please try again.');
        
        // On error, redirect to login for protected pages
        if (requireAuth) {
          const returnUrl = encodeURIComponent(pathname);
          router.push(`${fallbackPath}?returnUrl=${returnUrl}`);
        }
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [pathname, router, checkAuth, requireAuth, requiredRole, fallbackPath, user]);

  // Show loading spinner while checking auth
  if (isChecking || (authLoading && !isPublicPath && !isOpenPath)) {
    return (
      <div className="min-h-screen bg-gradient-bugsense flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="h-12 w-12 bg-gradient-primary rounded-xl flex items-center justify-center animate-pulse">
              <Bot className="h-7 w-7 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gradient-primary">
              BugSense AI
            </h1>
          </div>
          <p className="text-muted-foreground">Authenticating...</p>
        </motion.div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-bugsense flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-4">Access Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-gradient-primary rounded-lg font-semibold hover-glow transition-all duration-300"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // Allow access to public/open paths or authenticated paths
  if (isPublicPath || isOpenPath || isAuthenticated) {
    return <>{children}</>;
  }

  // This should not happen due to redirect, but just in case
  return null;
}