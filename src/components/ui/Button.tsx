import React, { forwardRef } from 'react';
import { theme } from '../../styles/theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      disabled,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing[2],
      fontFamily: theme.typography.fontFamily.sans,
      fontWeight: theme.typography.fontWeight.medium,
      letterSpacing: theme.typography.letterSpacing.normal,
      border: 'none',
      borderRadius: theme.borderRadius.lg,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: `all ${theme.animation.duration.normal} ${theme.animation.easing.appleEase}`,
      position: 'relative',
      overflow: 'hidden',
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled ? 0.5 : 1,
      userSelect: 'none',
      WebkitUserSelect: 'none',
    };

    const sizeStyles = {
      sm: {
        fontSize: theme.typography.fontSize.sm,
        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
        height: '32px',
      },
      md: {
        fontSize: theme.typography.fontSize.base,
        padding: `${theme.spacing[2.5]} ${theme.spacing[4]}`,
        height: '40px',
      },
      lg: {
        fontSize: theme.typography.fontSize.lg,
        padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
        height: '48px',
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.primary[500],
        color: 'white',
        boxShadow: `0 2px 8px ${theme.colors.primary[500]}33`,
      },
      secondary: {
        backgroundColor: theme.colors.gray[800],
        color: theme.colors.gray[100],
        border: `1px solid ${theme.colors.gray[700]}`,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: theme.colors.gray[200],
        border: `1px solid transparent`,
      },
      danger: {
        backgroundColor: theme.colors.semantic.error,
        color: 'white',
        boxShadow: `0 2px 8px ${theme.colors.semantic.error}33`,
      },
    };

    const hoverStyles = {
      primary: {
        backgroundColor: theme.colors.primary[600],
        transform: 'translateY(-1px)',
        boxShadow: `0 4px 16px ${theme.colors.primary[500]}44`,
      },
      secondary: {
        backgroundColor: theme.colors.gray[700],
        borderColor: theme.colors.gray[600],
      },
      ghost: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      danger: {
        backgroundColor: '#E6342E',
        transform: 'translateY(-1px)',
        boxShadow: `0 4px 16px ${theme.colors.semantic.error}44`,
      },
    };

    const activeStyles = {
      primary: {
        transform: 'translateY(0)',
        boxShadow: `0 2px 4px ${theme.colors.primary[500]}33`,
      },
      secondary: {
        backgroundColor: theme.colors.gray[900],
      },
      ghost: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
      },
      danger: {
        transform: 'translateY(0)',
        boxShadow: `0 2px 4px ${theme.colors.semantic.error}33`,
      },
    };

    const combinedStyles = {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style,
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        Object.assign(e.currentTarget.style, hoverStyles[variant]);
      }
      props.onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        Object.assign(e.currentTarget.style, variantStyles[variant]);
      }
      props.onMouseLeave?.(e);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        Object.assign(e.currentTarget.style, { ...hoverStyles[variant], ...activeStyles[variant] });
      }
      props.onMouseDown?.(e);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        Object.assign(e.currentTarget.style, hoverStyles[variant]);
      }
      props.onMouseUp?.(e);
    };

    return (
      <button
        ref={ref}
        className={`optigains-button ${variant} ${size} ${className}`}
        style={combinedStyles}
        disabled={disabled || loading}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LoadingSpinner size={size} />
          </div>
        )}
        
        {/* Button content */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            opacity: loading ? 0 : 1,
            transition: `opacity ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
          }}
        >
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </div>
      </button>
    );
  }
);

Button.displayName = 'Button';

// Loading spinner component
const LoadingSpinner: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const sizeMap = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <svg
      width={sizeMap[size]}
      height={sizeMap[size]}
      viewBox="0 0 16 16"
      fill="none"
      style={{
        animation: `spin 0.8s linear infinite`,
      }}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="28 56"
      />
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </svg>
  );
};

// Icon button variant
export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'children' | 'icon'>>(
  ({ size = 'md', style, ...props }, ref) => {
    const sizeMap = {
      sm: '32px',
      md: '40px',
      lg: '48px',
    };

    return (
      <Button
        ref={ref}
        size={size}
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          padding: 0,
          ...style,
        }}
        {...props}
      />
    );
  }
);

IconButton.displayName = 'IconButton';

// Button group component
export const ButtonGroup: React.FC<{
  children: React.ReactNode;
  gap?: 'sm' | 'md' | 'lg';
  vertical?: boolean;
  className?: string;
}> = ({ children, gap = 'md', vertical = false, className }) => {
  const gapMap = {
    sm: theme.spacing[2],
    md: theme.spacing[3],
    lg: theme.spacing[4],
  };

  return (
    <div
      className={`button-group ${className || ''}`}
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: gapMap[gap],
        width: vertical ? '100%' : 'auto',
      }}
    >
      {children}
    </div>
  );
};