import React, { ReactNode } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUserProfile } from '../utils/database';
import { useState, useEffect } from 'react';
import { UserNutritionProfile } from '../utils/types';
import { DashboardSkeleton } from './ui/SkeletonLoader';

interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireProfile?: boolean;
  requireOnboarding?: boolean;
  redirectTo?: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = true,
  requireProfile = false,
  requireOnboarding = false,
  redirectTo
}) => {
  const { user, isLoaded: userLoaded } = useUser();
  const location = useLocation();
  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(requireProfile || requireOnboarding);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || (!requireProfile && !requireOnboarding)) {
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);
        const userProfile = await getUserProfile(user.id);
        setProfile(userProfile);
      } catch (error) {
        console.error('[RouteGuard] Error fetching profile:', error);
        setProfileError('Failed to load user profile');
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };

    if (userLoaded && user) {
      fetchProfile();
    } else if (userLoaded && !user) {
      setProfileLoading(false);
    }
  }, [user, userLoaded, requireProfile, requireOnboarding]);

  // Show loading while checking authentication
  if (!userLoaded || (requireProfile || requireOnboarding) && profileLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="w-full pt-20 pb-24">
          <div className="max-w-4xl mx-auto px-4">
            <DashboardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Handle authentication requirement
  if (requireAuth && !user) {
    const loginUrl = `/sign-in?redirectUrl=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={redirectTo || loginUrl} replace />;
  }

  // Handle profile requirement
  if (requireProfile && user && !profile && !profileError) {
    return <Navigate to={redirectTo || '/onboarding'} replace />;
  }

  // Handle onboarding requirement
  if (requireOnboarding && user && profile) {
    // User has completed onboarding, redirect them away from onboarding pages
    return <Navigate to={redirectTo || '/dashboard'} replace />;
  }

  // Handle profile loading error
  if (profileError && (requireProfile || requireOnboarding)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Profile Loading Error</h2>
          <p className="text-gray-400 mb-6">{profileError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
};

// Specialized guard components for common use cases
export const AuthenticatedRoute: React.FC<{ children: ReactNode }> = ({ children }) => (
  <RouteGuard requireAuth={true}>
    {children}
  </RouteGuard>
);

export const ProfileGuard: React.FC<{ children: ReactNode }> = ({ children }) => (
  <RouteGuard requireAuth={true} requireProfile={true}>
    {children}
  </RouteGuard>
);

export const OnboardingGuard: React.FC<{ children: ReactNode }> = ({ children }) => (
  <RouteGuard requireAuth={true} requireOnboarding={true}>
    {children}
  </RouteGuard>
);

export const PublicRoute: React.FC<{ children: ReactNode }> = ({ children }) => (
  <RouteGuard requireAuth={false}>
    {children}
  </RouteGuard>
);

// Hook for accessing route guard state
export const useRouteGuard = () => {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userProfile = await getUserProfile(user.id);
        setProfile(userProfile);
      } catch (error) {
        console.error('[useRouteGuard] Error fetching profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded) {
      if (user) {
        fetchProfile();
      } else {
        setLoading(false);
      }
    }
  }, [user, isLoaded]);

  return {
    user,
    profile,
    isAuthenticated: !!user,
    hasProfile: !!profile,
    loading: !isLoaded || loading,
  };
};

// Higher-order component for route protection
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps?: Omit<RouteGuardProps, 'children'>
) {
  const GuardedComponent = (props: P) => (
    <RouteGuard {...guardProps}>
      <Component {...props} />
    </RouteGuard>
  );

  GuardedComponent.displayName = `withRouteGuard(${Component.displayName || Component.name})`;
  return GuardedComponent;
}

// Route guard configuration for different route types
export const routeGuardConfigs = {
  public: { requireAuth: false },
  authenticated: { requireAuth: true },
  protected: { requireAuth: true, requireProfile: true },
  onboarding: { requireAuth: true, requireOnboarding: true },
} as const;

export type RouteGuardConfig = keyof typeof routeGuardConfigs;