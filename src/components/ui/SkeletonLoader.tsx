import React from 'react';
import { theme } from '../../styles/theme';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  className = '',
  variant = 'rectangular',
  animation = 'pulse',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return { borderRadius: '50%' };
      case 'rounded':
        return { borderRadius: theme.borderRadius.lg };
      case 'text':
        return { borderRadius: theme.borderRadius.sm };
      default:
        return { borderRadius: theme.borderRadius.md };
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes skeleton-pulse {
            0% {
              opacity: 0.7;
            }
            50% {
              opacity: 0.4;
            }
            100% {
              opacity: 0.7;
            }
          }

          @keyframes skeleton-wave {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }

          .skeleton {
            background-color: ${theme.colors.gray[800]};
            position: relative;
            overflow: hidden;
          }

          .skeleton.pulse {
            animation: skeleton-pulse 1.5s ease-in-out infinite;
          }

          .skeleton.wave::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.05),
              transparent
            );
            animation: skeleton-wave 1.5s linear infinite;
          }
        `}
      </style>
      <div
        className={`skeleton ${animation} ${className}`}
        style={{
          width,
          height,
          ...getVariantStyles(),
        }}
      />
    </>
  );
};

// Dashboard Skeleton
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="mb-6">
        <Skeleton width="120px" height="16px" variant="text" className="mb-2" />
        <Skeleton width="200px" height="32px" variant="text" />
      </div>

      {/* Primary Calorie Card Skeleton */}
      <div className="bg-gray-800/50 rounded-xl p-8">
        <div className="text-center">
          <Skeleton width="180px" height="60px" variant="text" className="mx-auto mb-2" />
          <Skeleton width="150px" height="20px" variant="text" className="mx-auto mb-6" />
          <Skeleton width="200px" height="200px" variant="circular" className="mx-auto mb-6" />
          <div className="flex justify-center gap-8">
            <div>
              <Skeleton width="80px" height="28px" variant="text" className="mb-1" />
              <Skeleton width="60px" height="16px" variant="text" />
            </div>
            <div>
              <Skeleton width="80px" height="28px" variant="text" className="mb-1" />
              <Skeleton width="60px" height="16px" variant="text" />
            </div>
          </div>
        </div>
      </div>

      {/* Macros Grid Skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-4">
            <Skeleton width="60px" height="12px" variant="text" className="mx-auto mb-1" />
            <Skeleton width="40px" height="28px" variant="text" className="mx-auto mb-1" />
            <Skeleton width="50px" height="12px" variant="text" className="mx-auto mb-2" />
            <Skeleton width="100%" height="6px" variant="rounded" />
          </div>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton width="40px" height="40px" variant="rounded" />
              <div className="flex-1">
                <Skeleton width="80px" height="16px" variant="text" className="mb-1" />
                <Skeleton width="60px" height="12px" variant="text" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Food List Skeleton
export const FoodListSkeleton: React.FC = () => {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-gray-800/50 rounded-lg p-4 flex items-center gap-4">
          <div className="flex-1">
            <Skeleton width="60%" height="18px" variant="text" className="mb-2" />
            <Skeleton width="40%" height="14px" variant="text" />
          </div>
          <Skeleton width="80px" height="36px" variant="rounded" />
        </div>
      ))}
    </div>
  );
};

// Chart Skeleton
export const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6">
      <Skeleton width="150px" height="20px" variant="text" className="mb-4" />
      <div className="flex items-end justify-between gap-2" style={{ height: '200px' }}>
        {[0.7, 0.5, 0.8, 0.6, 0.9, 0.4, 0.7].map((height, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton
              width="100%"
              height={`${height * 100}%`}
              variant="rectangular"
              animation="wave"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => (
          <Skeleton key={i} width="24px" height="12px" variant="text" />
        ))}
      </div>
    </div>
  );
};

// Progress Card Skeleton
export const ProgressCardSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <Skeleton width="100px" height="16px" variant="text" className="mb-2" />
          <Skeleton width="120px" height="32px" variant="text" />
        </div>
        <Skeleton width="60px" height="60px" variant="circular" />
      </div>
      <Skeleton width="100%" height="8px" variant="rounded" className="mb-2" />
      <div className="flex justify-between">
        <Skeleton width="60px" height="14px" variant="text" />
        <Skeleton width="60px" height="14px" variant="text" />
      </div>
    </div>
  );
};