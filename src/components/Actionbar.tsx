import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  UserButton,
  SignedIn,
  SignedOut,
  SignInButton,
} from "@clerk/clerk-react";
import "../styles/ActionBar.css";

const ActionBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items
  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/diary", label: "Diary" },
    { path: "/expenditure", label: "Expenditure" },
    { path: "/nutrition-dashboard", label: "Nutrition" },
    { path: "/habits", label: "Habits" },
    { path: "/plate-coach", label: "Plate Coach" },
  ];

  return (
    <div className="action-bar desktop-only-nav">
      <div className="action-bar-container">
        {/* Logo and Brand */}
        <div className="brand-section" onClick={() => navigate("/")}>
          <div className="brand-logo-wrapper">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="brand-logo">
              <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 8C16 8 20 12 20 16C20 20 16 24 16 24C16 24 12 20 12 16C12 12 16 8 16 8Z" fill="currentColor" fillOpacity="0.3"/>
              <circle cx="16" cy="16" r="4" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="brand-name">OptiGains</h1>
        </div>

        {/* Navigation */}
        <nav className="nav-section">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              aria-label={item.label}
              aria-current={location.pathname === item.path ? 'page' : undefined}
            >
              <span className="nav-label">{item.label}</span>
              {location.pathname === item.path && (
                <span className="nav-indicator" aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="user-section">
          <button
            onClick={() => navigate("/settings")}
            className="settings-button"
            title="Settings"
          >
            <svg className="settings-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path 
                d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" 
                stroke="currentColor" 
                strokeWidth="1.5"
              />
              <path 
                d="M10 3.5V1M10 19V16.5M16.5 10H19M1 10H3.5M14.5 5.5L16.5 3.5M3.5 16.5L5.5 14.5M14.5 14.5L16.5 16.5M3.5 3.5L5.5 5.5" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round"
              />
            </svg>
          </button>
          
          <SignedIn>
            <UserButton />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="sign-in-button" aria-label="Sign in">
                <span>Sign In</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="sign-in-icon">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </div>
  );
};

export default ActionBar;