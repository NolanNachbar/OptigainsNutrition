import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { getUserProfile } from '../utils/database';

interface ProfileGuardProps {
  children: React.ReactNode;
  requireComplete?: boolean;
}

export const ProfileGuard: React.FC<ProfileGuardProps> = ({ children, requireComplete = true }) => {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [hasCompleteProfile, setHasCompleteProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkProfile = async () => {
      if (!isLoaded) return;
      
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(user.id);
        
        console.log('[ProfileGuard] Profile data:', profile);
        
        // Check if basic profile exists with required fields
        const isComplete = !!(
          profile && 
          profile.tdee_estimate && 
          profile.tdee_estimate > 0 &&
          profile.goal_type &&
          profile.coaching_mode &&
          profile.target_macros &&
          profile.activity_level
        );
        
        console.log('[ProfileGuard] Profile complete:', isComplete);
        setHasCompleteProfile(isComplete);
      } catch (error) {
        console.error('Error checking profile:', error);
        setHasCompleteProfile(false);
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [user, isLoaded]);

  // Show loading state
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-700 border-t-blue-500"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If requiring complete profile and doesn't have one, redirect to onboarding
  if (requireComplete && !hasCompleteProfile) {
    return <Navigate to="/onboarding" replace />;
  }

  // If not requiring complete profile (onboarding page) and has one, redirect to dashboard
  if (!requireComplete && hasCompleteProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};