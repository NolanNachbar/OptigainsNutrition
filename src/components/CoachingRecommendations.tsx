import React from 'react';
import { Button } from './ui/Button';
import { theme } from '../styles/theme';

interface SimpleRecommendation {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  suggestedChanges?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

interface CoachingRecommendationsProps {
  recommendations: SimpleRecommendation[];
  onApplyChanges?: (changes: any) => void;
}

const CoachingRecommendations: React.FC<CoachingRecommendationsProps> = ({ 
  recommendations, 
  onApplyChanges 
}) => {
  if (recommendations.length === 0) {
    return null;
  }

  const getSeverityStyles = (severity: string): React.CSSProperties => {
    switch (severity) {
      case 'success':
        return {
          backgroundColor: `${theme.colors.semantic.success}15`,
          borderColor: `${theme.colors.semantic.success}33`,
          color: theme.colors.semantic.success,
        };
      case 'warning':
        return {
          backgroundColor: `${theme.colors.semantic.warning}15`,
          borderColor: `${theme.colors.semantic.warning}33`,
          color: theme.colors.semantic.warning,
        };
      case 'info':
        return {
          backgroundColor: `${theme.colors.primary[500]}15`,
          borderColor: `${theme.colors.primary[500]}33`,
          color: theme.colors.primary[400],
        };
      default:
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          color: theme.colors.gray[100],
        };
    }
  };

  const getSeverityIcon = (severity: string) => {
    const iconStyle = { width: 20, height: 20 };
    const color = severity === 'success' ? theme.colors.semantic.success :
                  severity === 'warning' ? theme.colors.semantic.warning :
                  severity === 'info' ? theme.colors.primary[400] :
                  theme.colors.gray[400];
    
    switch (severity) {
      case 'success':
        return (
          <svg style={iconStyle} fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'warning':
        return (
          <svg style={iconStyle} fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg style={iconStyle} fill="none" stroke={color} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatSuggestedChanges = (changes: any) => {
    const parts = [];
    if (changes.calories) {
      parts.push(`${changes.calories > 0 ? '+' : ''}${changes.calories} calories`);
    }
    if (changes.protein) {
      parts.push(`${changes.protein > 0 ? '+' : ''}${changes.protein}g protein`);
    }
    if (changes.carbs) {
      parts.push(`${changes.carbs > 0 ? '+' : ''}${changes.carbs}g carbs`);
    }
    if (changes.fat) {
      parts.push(`${changes.fat > 0 ? '+' : ''}${changes.fat}g fat`);
    }
    return parts.join(', ');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
      <h3 style={{
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.gray[100],
        letterSpacing: theme.typography.letterSpacing.tight,
      }}>
        Coaching Insights
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
        {recommendations.map((rec, index) => {
          const severityStyles = getSeverityStyles(rec.severity);
          return (
            <div
              key={index}
              style={{
                borderRadius: theme.borderRadius.lg,
                border: `1px solid`,
                padding: theme.spacing[4],
                transition: `all ${theme.animation.duration.normal} ${theme.animation.easing.appleEase}`,
                ...severityStyles,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing[3] }}>
                <div style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: theme.borderRadius.lg,
                  backgroundColor: `${severityStyles.color}15`,
                  flexShrink: 0,
                }}>
                  {getSeverityIcon(rec.severity)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontSize: theme.typography.fontSize.sm,
                    lineHeight: theme.typography.lineHeight.relaxed,
                    color: theme.colors.gray[300],
                  }}>
                    {rec.message}
                  </p>
                  
                  {rec.suggestedChanges && (
                    <div style={{
                      marginTop: theme.spacing[3],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: theme.spacing[3],
                    }}>
                      <div style={{
                        fontSize: theme.typography.fontSize.xs,
                        color: theme.colors.gray[400],
                      }}>
                        Suggested: {formatSuggestedChanges(rec.suggestedChanges)}
                      </div>
                      
                      {onApplyChanges && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onApplyChanges(rec.suggestedChanges)}
                          style={{
                            fontSize: theme.typography.fontSize.xs,
                            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                            height: '28px',
                          }}
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CoachingRecommendations;