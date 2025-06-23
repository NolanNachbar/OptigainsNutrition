import React from 'react';
import { theme } from '../../styles/theme';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
  label?: string;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 120,
  strokeWidth = 8,
  color = theme.colors.primary[500],
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  showValue = true,
  label,
  animate = true,
  className = '',
  style,
}) => {
  // Ensure value is between 0 and 100
  const normalizedValue = Math.min(100, Math.max(0, value));
  
  // Calculate circle dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;
  
  // Calculate font sizes based on ring size
  const valueFontSize = size * 0.24;
  const labelFontSize = size * 0.12;
  const percentFontSize = size * 0.14;

  return (
    <div
      className={`progress-ring ${className}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* SVG Ring */}
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
          position: 'absolute',
        }}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: animate
              ? `stroke-dashoffset ${theme.animation.duration.slow} ${theme.animation.easing.appleEase}`
              : 'none',
          }}
        />
      </svg>
      
      {/* Center content */}
      {showValue && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing[1],
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: theme.spacing[0.5],
            }}
          >
            <span
              style={{
                fontSize: valueFontSize,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.gray[100],
                letterSpacing: theme.typography.letterSpacing.tight,
                lineHeight: 1,
              }}
            >
              {Math.round(normalizedValue)}
            </span>
            <span
              style={{
                fontSize: percentFontSize,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.gray[400],
                letterSpacing: theme.typography.letterSpacing.normal,
              }}
            >
              %
            </span>
          </div>
          
          {label && (
            <span
              style={{
                fontSize: labelFontSize,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.gray[500],
                letterSpacing: theme.typography.letterSpacing.wide,
                textTransform: 'uppercase',
              }}
            >
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Animated progress ring with multiple values
interface MultiProgressRingProps {
  values: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
  size?: number;
  strokeWidth?: number;
  backgroundColor?: string;
  showLegend?: boolean;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const MultiProgressRing: React.FC<MultiProgressRingProps> = ({
  values,
  size = 120,
  strokeWidth = 8,
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  showLegend = true,
  animate = true,
  className = '',
  style,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Calculate cumulative offsets
  let cumulativeOffset = 0;
  const segments = values.map((item) => {
    const normalizedValue = Math.min(100, Math.max(0, item.value));
    const strokeDasharray = (normalizedValue / 100) * circumference;
    const segment = {
      ...item,
      strokeDasharray: `${strokeDasharray} ${circumference}`,
      strokeDashoffset: -cumulativeOffset,
      normalizedValue,
    };
    cumulativeOffset += strokeDasharray;
    return segment;
  });
  
  const total = segments.reduce((acc, seg) => acc + seg.normalizedValue, 0);

  return (
    <div className={`multi-progress-ring-container ${className}`} style={style}>
      <div
        className="multi-progress-ring"
        style={{
          width: size,
          height: size,
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* SVG Ring */}
        <svg
          width={size}
          height={size}
          style={{
            transform: 'rotate(-90deg)',
            position: 'absolute',
          }}
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Progress segments */}
          {segments.map((segment, index) => (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={segment.strokeDasharray}
              strokeDashoffset={segment.strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: animate
                  ? `all ${theme.animation.duration.slow} ${theme.animation.easing.appleEase} ${index * 100}ms`
                  : 'none',
              }}
            />
          ))}
        </svg>
        
        {/* Center content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing[0.5],
          }}
        >
          <span
            style={{
              fontSize: size * 0.24,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.gray[100],
              letterSpacing: theme.typography.letterSpacing.tight,
              lineHeight: 1,
            }}
          >
            {Math.round(total)}
          </span>
          <span
            style={{
              fontSize: size * 0.1,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.gray[500],
              letterSpacing: theme.typography.letterSpacing.wide,
              textTransform: 'uppercase',
            }}
          >
            Total
          </span>
        </div>
      </div>
      
      {/* Legend */}
      {showLegend && (
        <div
          style={{
            marginTop: theme.spacing[4],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
          }}
        >
          {segments.map((segment, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: segment.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.gray[400],
                  flex: 1,
                }}
              >
                {segment.label || `Value ${index + 1}`}
              </span>
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.gray[300],
                }}
              >
                {segment.normalizedValue}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Mini progress ring for inline use
export const MiniProgressRing: React.FC<{
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}> = ({
  value,
  size = 24,
  strokeWidth = 3,
  color = theme.colors.primary[500],
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
}) => {
  return (
    <ProgressRing
      value={value}
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      backgroundColor={backgroundColor}
      showValue={false}
      animate={false}
    />
  );
};