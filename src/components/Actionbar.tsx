import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OptigainDumbell from "../assets/react3.svg";
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
    { path: "/", label: "Home" },
    { path: "/workout-plan", label: "Plans" },
    { path: "/library-page", label: "Library" },
    { path: "/freestyle-lift", label: "Quick Lift" },
  ];

  return (
    <div className="action-bar">
      <div className="action-bar-container">
        {/* Logo and Brand */}
        <div className="brand-section" onClick={() => navigate("/")}>
          <img
            src={OptigainDumbell}
            alt="Optigains Logo"
            className="brand-logo"
          />
          <h1 className="brand-name">Optigains</h1>
        </div>

        {/* Navigation */}
        <nav className="nav-section">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-label">{item.label}</span>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m3.22-10.22l4.24-4.24m-4.24 13.68l4.24 4.24M1 12h6m6 0h6m-10.22 3.22l-4.24 4.24m13.68-4.24l4.24 4.24"></path>
            </svg>
          </button>
          
          <SignedIn>
            <UserButton />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="sign-in-button">Sign In</button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </div>
  );
};

export default ActionBar;