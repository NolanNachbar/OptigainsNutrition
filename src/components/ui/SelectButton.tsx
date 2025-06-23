import React from 'react';
import { theme } from '../../styles/theme';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface SelectButtonGroupProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export const SelectButtonGroup: React.FC<SelectButtonGroupProps> = ({
  options,
  value,
  onChange,
  variant = 'default',
  className = '',
}) => {
  return (
    <div className={`select-button-group ${className}`}>
      <style>
        {`
          .select-button {
            width: 100%;
            padding: ${variant === 'compact' ? theme.spacing[3] : variant === 'detailed' ? theme.spacing[5] : theme.spacing[4]};
            background: rgba(255, 255, 255, 0.02);
            border: 2px solid rgba(255, 255, 255, 0.08);
            border-radius: ${theme.borderRadius.lg};
            cursor: pointer;
            transition: all ${theme.animation.duration.normal} ${theme.animation.easing.appleEase};
            text-align: left;
            position: relative;
            overflow: hidden;
          }
          
          .select-button:hover {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.12);
            transform: translateY(-1px);
          }
          
          .select-button.selected {
            background: ${theme.colors.primary[500]}15;
            border-color: ${theme.colors.primary[500]};
            box-shadow: 0 0 0 1px ${theme.colors.primary[500]}33 inset;
          }
          
          .select-button.selected::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, ${theme.colors.primary[500]}10 0%, transparent 100%);
            pointer-events: none;
          }
          
          .select-button-label {
            font-size: ${theme.typography.fontSize.base};
            font-weight: ${theme.typography.fontWeight.semibold};
            color: ${theme.colors.gray[100]};
            letter-spacing: ${theme.typography.letterSpacing.tight};
            text-transform: capitalize;
            display: flex;
            align-items: center;
            gap: ${theme.spacing[2]};
          }
          
          .select-button.selected .select-button-label {
            color: ${theme.colors.primary[400]};
          }
          
          .select-button-description {
            font-size: ${theme.typography.fontSize.sm};
            color: ${theme.colors.gray[400]};
            margin-top: ${theme.spacing[1]};
            line-height: ${theme.typography.lineHeight.relaxed};
          }
          
          .select-button-icon {
            width: 20px;
            height: 20px;
            color: ${theme.colors.gray[500]};
          }
          
          .select-button.selected .select-button-icon {
            color: ${theme.colors.primary[400]};
          }
          
          /* Ripple effect on click */
          .select-button::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
          }
          
          .select-button:active::after {
            width: 300px;
            height: 300px;
          }
        `}
      </style>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[2],
        }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`select-button ${value === option.value ? 'selected' : ''}`}
            type="button"
          >
            <div className="select-button-label">
              {option.icon && <span className="select-button-icon">{option.icon}</span>}
              {option.label}
            </div>
            {option.description && (
              <div className="select-button-description">{option.description}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Radio button style variant
interface RadioButtonGroupProps {
  options: { value: string | number; label: string; description?: string }[];
  value: string | number;
  onChange: (value: string | number) => void;
  className?: string;
}

export const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({
  options,
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={`radio-button-group ${className}`}>
      <style>
        {`
          .radio-button-group {
            display: flex;
            gap: ${theme.spacing[2]};
            padding: ${theme.spacing[1]};
            background: rgba(255, 255, 255, 0.03);
            border-radius: ${theme.borderRadius.lg};
          }
          
          .radio-button {
            flex: 1;
            padding: ${theme.spacing[2]} ${theme.spacing[3]};
            background: transparent;
            border: 2px solid transparent;
            border-radius: ${theme.borderRadius.md};
            cursor: pointer;
            transition: all ${theme.animation.duration.fast} ${theme.animation.easing.appleEase};
            font-size: ${theme.typography.fontSize.sm};
            font-weight: ${theme.typography.fontWeight.medium};
            color: ${theme.colors.gray[400]};
            text-align: left;
          }
          
          .radio-button-label {
            display: block;
          }
          
          .radio-button-description {
            font-size: ${theme.typography.fontSize.xs};
            font-weight: ${theme.typography.fontWeight.regular};
            color: ${theme.colors.gray[500]};
            margin-top: 2px;
          }
          
          .radio-button.selected .radio-button-description {
            color: rgba(255, 255, 255, 0.8);
          }
          
          .radio-button:hover {
            background: rgba(255, 255, 255, 0.05);
          }
          
          .radio-button.selected {
            background: ${theme.colors.primary[500]};
            color: white;
            border-color: ${theme.colors.primary[500]};
          }
          
          .radio-button:active {
            transform: scale(0.98);
          }
        `}
      </style>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`radio-button ${value === option.value ? 'selected' : ''}`}
          type="button"
        >
          <span className="radio-button-label">{option.label}</span>
          {option.description && (
            <span className="radio-button-description">{option.description}</span>
          )}
        </button>
      ))}
    </div>
  );
};