import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../styles/theme';

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  color?: string;
}

export const FloatingActionButton: React.FC = () => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions: QuickAction[] = [
    {
      label: 'Scan Barcode',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M8 20H6m-2-4v-2m0-2v-2m0-2V6m4-2h2M8 4H6" />
        </svg>
      ),
      action: () => navigate('/add-food?scan=true'),
      color: theme.colors.purple[500],
    },
    {
      label: 'Quick Add',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      action: () => navigate('/add-food?quick=true'),
      color: theme.colors.orange[500],
    },
    {
      label: 'Add Meal',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      action: () => navigate('/add-food'),
      color: theme.colors.green[500],
    },
  ];

  return (
    <>
      <style>
        {`
          .fab-container {
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 90;
            display: flex;
            flex-direction: column-reverse;
            align-items: flex-end;
            gap: ${theme.spacing[3]};
          }

          @media (min-width: 769px) {
            .fab-container {
              bottom: 30px;
              right: 30px;
            }
          }

          .fab-main {
            width: 56px;
            height: 56px;
            border-radius: ${theme.borderRadius.full};
            background: ${theme.colors.primary[500]};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: ${theme.shadows.dark.xl};
            cursor: pointer;
            transition: all ${theme.animation.duration.normal} ${theme.animation.easing.appleEase};
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            border: none;
            outline: none;
          }

          .fab-main:hover {
            background: ${theme.colors.primary[600]};
            transform: scale(1.05);
          }

          .fab-main:active {
            transform: scale(0.95);
          }

          .fab-main.expanded {
            background: ${theme.colors.gray[700]};
            transform: rotate(45deg);
          }

          .fab-icon {
            transition: transform ${theme.animation.duration.normal} ${theme.animation.easing.appleEase};
          }

          .fab-actions {
            display: flex;
            flex-direction: column;
            gap: ${theme.spacing[2]};
            opacity: 0;
            pointer-events: none;
            transform: translateY(10px);
            transition: all ${theme.animation.duration.normal} ${theme.animation.easing.appleEase};
          }

          .fab-actions.visible {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
          }

          .fab-action-item {
            display: flex;
            align-items: center;
            gap: ${theme.spacing[3]};
            justify-content: flex-end;
          }

          .fab-action-label {
            background: ${theme.colors.gray[800]};
            color: white;
            padding: ${theme.spacing[2]} ${theme.spacing[3]};
            border-radius: ${theme.borderRadius.md};
            font-size: ${theme.typography.fontSize.sm};
            font-weight: ${theme.typography.fontWeight.medium};
            white-space: nowrap;
            box-shadow: ${theme.shadows.md};
            opacity: 0;
            transform: translateX(10px);
            transition: all ${theme.animation.duration.fast} ${theme.animation.easing.appleEase};
          }

          .fab-actions.visible .fab-action-label {
            opacity: 1;
            transform: translateX(0);
          }

          .fab-action-button {
            width: 48px;
            height: 48px;
            border-radius: ${theme.borderRadius.full};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: ${theme.shadows.lg};
            cursor: pointer;
            transition: all ${theme.animation.duration.fast} ${theme.animation.easing.appleEase};
            border: none;
            outline: none;
          }

          .fab-action-button:hover {
            transform: scale(1.1);
          }

          .fab-action-button:active {
            transform: scale(0.95);
          }

          .fab-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 89;
            opacity: 0;
            pointer-events: none;
            transition: opacity ${theme.animation.duration.normal} ${theme.animation.easing.appleEase};
          }

          .fab-backdrop.visible {
            opacity: 1;
            pointer-events: auto;
          }

          /* Stagger animation for action items */
          .fab-action-item:nth-child(1) .fab-action-label { transition-delay: 50ms; }
          .fab-action-item:nth-child(2) .fab-action-label { transition-delay: 100ms; }
          .fab-action-item:nth-child(3) .fab-action-label { transition-delay: 150ms; }
        `}
      </style>

      <div 
        className={`fab-backdrop ${isExpanded ? 'visible' : ''}`}
        onClick={() => setIsExpanded(false)}
      />

      <div className="fab-container">
        <button
          className={`fab-main ${isExpanded ? 'expanded' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Close quick actions' : 'Open quick actions'}
        >
          <svg className="fab-icon w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <div className={`fab-actions ${isExpanded ? 'visible' : ''}`}>
          {quickActions.map((action, index) => (
            <div key={index} className="fab-action-item">
              <span className="fab-action-label">{action.label}</span>
              <button
                className="fab-action-button"
                style={{ backgroundColor: action.color || theme.colors.primary[500] }}
                onClick={() => {
                  action.action();
                  setIsExpanded(false);
                }}
                aria-label={action.label}
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};