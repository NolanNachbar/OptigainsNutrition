import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { theme } from '../styles/theme';
import { useUser } from '@clerk/clerk-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  isAction?: boolean;
}

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn } = useUser();

  if (!isSignedIn) return null;

  const navItems: NavItem[] = [
    {
      path: '/dashboard',
      label: 'Home',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      path: '/diary',
      label: 'Diary',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      path: '/add-food',
      label: 'Add',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      ),
      isAction: true,
    },
    {
      path: '/progress',
      label: 'Progress',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      path: '/more',
      label: 'More',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/') return true;
    if (path === '/more') {
      // Check if current path is a secondary feature
      const secondaryPaths = ['/nutrition-dashboard', '/habits', '/expenditure', '/measurements', 
                            '/analytics', '/coaching', '/weekly-check-in', '/recipe-builder',
                            '/plate-coach', '/settings', '/profile'];
      return secondaryPaths.includes(location.pathname);
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <style>
        {`
          .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 56px;
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: env(safe-area-inset-bottom);
            z-index: 100;
            display: none;
          }

          @media (max-width: 768px) {
            .bottom-nav {
              display: flex;
            }
          }

          .nav-items {
            display: flex;
            justify-content: space-around;
            align-items: center;
            width: 100%;
            height: 100%;
            padding: 0 ${theme.spacing[4]};
          }

          .nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: ${theme.spacing[1]};
            padding: ${theme.spacing[2]};
            border-radius: ${theme.borderRadius.lg};
            transition: all ${theme.animation.duration.fast} ${theme.animation.easing.appleEase};
            cursor: pointer;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            position: relative;
            color: ${theme.colors.gray[500]};
          }

          .nav-item:active {
            transform: scale(0.95);
          }

          .nav-item.active {
            color: ${theme.colors.primary[500]};
          }

          .nav-item.action {
            flex: 0 0 auto;
          }

          .nav-item.action .nav-icon {
            width: 48px;
            height: 48px;
            background: ${theme.colors.primary[500]};
            border-radius: ${theme.borderRadius.full};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: ${theme.shadows.lg};
            color: white;
          }

          .nav-item.action:active .nav-icon {
            background: ${theme.colors.primary[600]};
          }

          .nav-label {
            font-size: ${theme.typography.fontSize.xs};
            font-weight: ${theme.typography.fontWeight.medium};
            margin-top: ${theme.spacing[1]};
          }

          .nav-item.action .nav-label {
            position: absolute;
            opacity: 0;
            pointer-events: none;
          }

          /* Hide desktop navigation on mobile when bottom nav is shown */
          @media (max-width: 768px) {
            .desktop-only-nav {
              display: none !important;
            }
            
            /* Add padding to page content to account for bottom nav */
            body {
              padding-bottom: calc(56px + env(safe-area-inset-bottom));
            }
          }
        `}
      </style>
      
      <nav className="bottom-nav">
        <div className="nav-items">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''} ${item.isAction ? 'action' : ''}`}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
            >
              <div className="nav-icon">
                {item.icon}
              </div>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

export default BottomNavigation;