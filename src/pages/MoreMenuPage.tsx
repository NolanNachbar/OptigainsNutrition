import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
// Removed unused imports

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  description?: string;
  badge?: string;
}

const MoreMenuPage: React.FC = () => {
  const navigate = useNavigate();

  const menuSections: MenuSection[] = [
    {
      title: 'Nutrition & Tracking',
      items: [
        {
          label: 'Nutrition Dashboard',
          path: '/nutrition-dashboard',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
          description: 'Detailed nutrition analysis',
        },
        {
          label: 'Recipe Builder',
          path: '/recipe-builder',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
          description: 'Create and save custom recipes',
        },
        {
          label: 'Barcode Scanner',
          path: '/add-food?scan=true',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M8 20H6m-2-4v-2m0-2v-2m0-2V6m4-2h2M8 4H6" />
            </svg>
          ),
          description: 'Quick food scanning',
        },
      ],
    },
    {
      title: 'Insights & Coaching',
      items: [
        {
          label: 'Weekly Check-In',
          path: '/weekly-check-in',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          description: 'Review your weekly progress',
          badge: 'Due',
        },
        {
          label: 'Analytics',
          path: '/analytics',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
          description: 'Advanced data analysis',
        },
        {
          label: 'AI Coaching',
          path: '/coaching',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
          description: 'Personalized recommendations',
        },
        {
          label: 'Plate Coach',
          path: '/plate-coach',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          ),
          description: 'Visual portion guidance',
        },
      ],
    },
    {
      title: 'Body Metrics',
      items: [
        {
          label: 'Energy Expenditure',
          path: '/expenditure',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
          description: 'TDEE & metabolism analysis',
        },
        {
          label: 'Measurements',
          path: '/measurements',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          ),
          description: 'Track body measurements',
        },
        {
          label: 'Habits',
          path: '/habits',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          description: 'Daily habit tracking',
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          label: 'Profile',
          path: '/profile',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
          description: 'Personal information',
        },
        {
          label: 'Settings',
          path: '/settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
          description: 'App preferences',
        },
        {
          label: 'Data Export',
          path: '/data-export',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          description: 'Export your data',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="pt-20 pb-8 px-4">
        <h1 className="text-3xl font-bold tracking-tight">More</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {menuSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 px-2">
              {section.title}
            </h2>
            <Card variant="elevated" padding="none">
              <div className="divide-y divide-gray-800">
                {section.items.map((item, index) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors ${
                      index === 0 ? 'rounded-t-xl' : ''
                    } ${index === section.items.length - 1 ? 'rounded-b-xl' : ''}`}
                    style={{
                      minHeight: '56px', // Larger touch target
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                        {item.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-medium flex items-center gap-2">
                          {item.label}
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <div className="text-sm text-gray-500 mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        ))}

        <div className="pt-8 pb-4 text-center">
          <p className="text-sm text-gray-500">OptiGains v1.0.0</p>
          <p className="text-xs text-gray-600 mt-1">
            Built with evidence-based nutrition science
          </p>
        </div>
      </div>
    </div>
  );
};

export default MoreMenuPage;