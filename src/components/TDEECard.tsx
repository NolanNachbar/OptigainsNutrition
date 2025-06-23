import React from 'react';
import { MiniProgressRing } from './ui/ProgressRing';
import { theme } from '../styles/theme';

interface SimpleTDEEData {
  currentTDEE: number;
  weeklyChange: number;
  confidence: 'low' | 'medium' | 'high';
  trendDirection: 'gaining' | 'losing' | 'maintaining';
  adherenceScore: number;
}

interface TDEECardProps {
  tdeeData: SimpleTDEEData | null;
  isLoading?: boolean;
}

const TDEECard: React.FC<TDEECardProps> = ({ tdeeData, isLoading }) => {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
        <div style={{
          height: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: theme.borderRadius.md,
          width: '30%',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        <div style={{
          height: '32px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: theme.borderRadius.md,
          width: '50%',
          animation: 'pulse 2s ease-in-out infinite',
          animationDelay: '0.2s',
        }} />
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}
        </style>
      </div>
    );
  }

  if (!tdeeData) {
    return (
      <div>
        <h3 style={{
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.gray[100],
          marginBottom: theme.spacing[2],
        }}>
          TDEE Estimate
        </h3>
        <p style={{
          color: theme.colors.gray[400],
          fontSize: theme.typography.fontSize.sm,
        }}>
          Need more data to calculate TDEE
        </p>
      </div>
    );
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return theme.colors.semantic.success;
      case 'medium': return theme.colors.semantic.warning;
      case 'low': return theme.colors.semantic.error;
      default: return theme.colors.gray[400];
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'gaining': return '↗';
      case 'losing': return '↘';
      case 'maintaining': return '→';
      default: return '→';
    }
  };

  const formatWeeklyChange = (change: number) => {
    if (Math.abs(change) < 0.1) return 'maintaining';
    const direction = change > 0 ? 'gaining' : 'losing';
    return `${direction} ${Math.abs(change).toFixed(1)} lbs/week`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing[4],
      }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.gray[100],
          letterSpacing: theme.typography.letterSpacing.tight,
        }}>
          Your Metabolism
        </h3>
        <span style={{
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          color: getConfidenceColor(tdeeData.confidence),
          textTransform: 'capitalize',
          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
          backgroundColor: `${getConfidenceColor(tdeeData.confidence)}22`,
          borderRadius: theme.borderRadius.md,
        }}>
          {tdeeData.confidence} confidence
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4], flex: 1 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: theme.spacing[2] }}>
            <span style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.gray[100],
              letterSpacing: theme.typography.letterSpacing.tight,
            }}>
              {tdeeData.currentTDEE.toLocaleString()}
            </span>
            <span style={{
              color: theme.colors.gray[400],
              fontSize: theme.typography.fontSize.base,
            }}>
              calories/day
            </span>
          </div>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.gray[500],
            marginTop: theme.spacing[1],
          }}>
            Estimated TDEE
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: theme.spacing[4],
          paddingTop: theme.spacing[2],
          borderTop: `1px solid ${theme.colors.glass.borderDark}`,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <span style={{
                fontSize: theme.typography.fontSize.xl,
                color: tdeeData.trendDirection === 'gaining' ? theme.colors.semantic.success :
                       tdeeData.trendDirection === 'losing' ? theme.colors.semantic.error :
                       theme.colors.gray[400],
              }}>
                {getTrendIcon(tdeeData.trendDirection)}
              </span>
              <span style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.gray[300],
                fontWeight: theme.typography.fontWeight.medium,
              }}>
                {formatWeeklyChange(tdeeData.weeklyChange)}
              </span>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.gray[500],
              marginTop: theme.spacing[1],
            }}>
              Weight trend
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
              <MiniProgressRing
                value={tdeeData.adherenceScore}
                size={24}
                strokeWidth={3}
                color={tdeeData.adherenceScore >= 80 ? theme.colors.semantic.success :
                      tdeeData.adherenceScore >= 60 ? theme.colors.semantic.warning :
                      theme.colors.semantic.error}
              />
              <span style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.gray[100],
              }}>
                {tdeeData.adherenceScore}%
              </span>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.gray[500],
              marginTop: theme.spacing[1],
            }}>
              Adherence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TDEECard;