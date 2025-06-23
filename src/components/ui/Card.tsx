import React from 'react';
import { theme } from '../../styles/theme';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
  style,
}) => {
  const baseStyles: React.CSSProperties = {
    borderRadius: theme.borderRadius.xl,
    transition: `all ${theme.animation.duration.normal} ${theme.animation.easing.appleEase}`,
    position: 'relative',
    overflow: 'hidden',
  };

  const paddingMap = {
    none: '0',
    sm: theme.spacing[3],
    md: theme.spacing[5],
    lg: theme.spacing[6],
    xl: theme.spacing[8],
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: 'var(--card-background, rgba(255, 255, 255, 0.05))',
      boxShadow: theme.shadows.sm,
      border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
    },
    glass: {
      backgroundColor: theme.colors.glass.backgroundDark,
      backdropFilter: `blur(${theme.blur.xl})`,
      WebkitBackdropFilter: `blur(${theme.blur.xl})`,
      border: `1px solid ${theme.colors.glass.borderDark}`,
      boxShadow: `${theme.shadows.lg}, inset 0 1px 0 0 rgba(255, 255, 255, 0.05)`,
    },
    elevated: {
      backgroundColor: 'var(--card-background-elevated, rgba(28, 28, 30, 0.8))',
      boxShadow: theme.shadows.dark.lg,
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    outlined: {
      backgroundColor: 'transparent',
      border: '1px solid var(--card-border-outlined, rgba(255, 255, 255, 0.1))',
      boxShadow: 'none',
    },
  };

  const cursorStyle: React.CSSProperties = hover || onClick ? {
    cursor: onClick ? 'pointer' : 'default',
  } : {};

  const combinedStyles = {
    ...baseStyles,
    ...variantStyles[variant],
    ...cursorStyle,
    padding: paddingMap[padding],
    ...style,
  };

  return (
    <>
      <style>
        {`
          .optigains-card.hoverable:hover {
            transform: translateY(-2px);
            box-shadow: ${variant === 'outlined' ? 'none' : theme.shadows.dark.xl};
            ${variant === 'outlined' ? 'border-color: rgba(255, 255, 255, 0.2);' : ''}
          }
          .optigains-card.hoverable:active {
            transform: translateY(0);
            transition: all ${theme.animation.duration.fast} ${theme.animation.easing.easeOut};
          }
        `}
      </style>
      <div
        className={`optigains-card ${variant} ${hover ? 'hoverable' : ''} ${className}`}
        style={combinedStyles}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        } : undefined}
      >
      {/* Subtle gradient overlay for depth */}
      {variant === 'glass' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}
      
      {children}
    </div>
    </>
  );
};

// Additional styled card components for specific use cases
export const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}> = ({ title, value, subtitle, icon, trend, className }) => {
  return (
    <Card variant="glass" padding="lg" hover className={className}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.gray[400],
            marginBottom: theme.spacing[2],
            fontWeight: theme.typography.fontWeight.medium,
            letterSpacing: theme.typography.letterSpacing.wide,
            textTransform: 'uppercase',
          }}>
            {title}
          </div>
          
          <div style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.gray[100],
            letterSpacing: theme.typography.letterSpacing.tight,
            lineHeight: theme.typography.lineHeight.tight,
          }}>
            {value}
          </div>
          
          {subtitle && (
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.gray[500],
              marginTop: theme.spacing[1],
            }}>
              {subtitle}
            </div>
          )}
          
          {trend && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
              marginTop: theme.spacing[2],
              fontSize: theme.typography.fontSize.sm,
              color: trend.isPositive ? theme.colors.semantic.success : theme.colors.semantic.error,
            }}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        
        {icon && (
          <div style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.borderRadius.lg,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: theme.colors.primary[500],
          }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

// Card group component for consistent spacing
export const CardGroup: React.FC<{
  children: React.ReactNode;
  gap?: 'sm' | 'md' | 'lg';
  columns?: number;
  className?: string;
}> = ({ children, gap = 'md', columns = 1, className }) => {
  const gapMap = {
    sm: theme.spacing[3],
    md: theme.spacing[4],
    lg: theme.spacing[6],
  };

  return (
    <div
      className={`card-group ${className || ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: gapMap[gap],
      }}
    >
      {children}
    </div>
  );
};