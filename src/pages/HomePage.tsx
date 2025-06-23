import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { preloadWorkouts, resetWorkouts, debugCalendarAssignments } from "../utils/SupaBase";
import OptigainDumbell from "../assets/react3.svg";
import { useUser } from "@clerk/clerk-react"; // Import Clerk's useUser hook
import ActionBar from "../components/Actionbar";
import WeekViewWidget from "../components/WeekViewWidget";
import DevDatePicker from "../components/DevDatePicker";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser(); // Get the authenticated user

  useEffect(() => {
    if (user) {
      // Pass null and user to preloadWorkouts
      preloadWorkouts(null, user);
    }
  }, [user]); // Run this effect when the user changes

  const handleReset = async () => {
    if (!user) return;
    if (
      window.confirm(
        "Are you sure you want to reset all workouts to their default state? This cannot be undone."
      )
    ) {
      try {
        await resetWorkouts(null, user);
        alert("Workouts have been reset successfully!");
        window.location.reload(); // Reload the page to reflect changes
      } catch (error) {
        console.error("Error resetting workouts:", error);
        alert("Failed to reset workouts. Please try again.");
      }
    }
  };

  return (
    <div className="home-container">
      <ActionBar />
      <div className="home-content">
        <div className="logo-section">
          <img
            src={OptigainDumbell}
            alt="Optigain Dumbell Logo"
            className="app-logo"
          />
          <h1 className="app-title">Optigains</h1>
        </div>

        <div className="hero-section">
          <div className="welcome-message">
            <h2>Welcome back!</h2>
            <p>Ready to crush your next workout?</p>
          </div>
        </div>

        <WeekViewWidget />

        <div className="stats-overview">
          <div className="stat-card">
            <span className="stat-number">0</span>
            <span className="stat-label">Workouts This Week</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">4</span>
            <span className="stat-label">Available Plans</span>
          </div>
        </div>

        <div className="button-grid">
          <button
            onClick={() => navigate("/start-lift")}
            className="home-button primary"
          >
            <div className="button-content">
              <span className="button-title">Start Workout</span>
              <span className="button-description">Begin your training session</span>
            </div>
          </button>

          <button
            onClick={() => navigate("/workout-plan")}
            className="home-button secondary"
          >
            <div className="button-content">
              <span className="button-title">Workout Plans</span>
              <span className="button-description">Manage your training schedule</span>
            </div>
          </button>

          <button
            onClick={() => navigate("/library-page")}
            className="home-button secondary"
          >
            <div className="button-content">
              <span className="button-title">Exercise Library</span>
              <span className="button-description">Browse exercise database</span>
            </div>
          </button>

          <button
            onClick={() => navigate("/calc-page")}
            className="home-button secondary"
          >
            <div className="button-content">
              <span className="button-title">Calculators</span>
              <span className="button-description">Weight and progression tools</span>
            </div>
          </button>
        </div>

        {/* Development-only buttons */}
        {process.env.NODE_ENV === "development" && (
          <>
            <button
              onClick={handleReset}
              className="reset-button"
              style={{
                position: "fixed",
                bottom: "100px", // Positioned above the feedback bar
                right: "20px",
                padding: "0.5rem 1rem",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                zIndex: 1000,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
              }}
            >
              Reset to Default Workouts
            </button>
            <button
              onClick={() => user && debugCalendarAssignments(user)}
              className="debug-button"
              style={{
                position: "fixed",
                bottom: "150px", // Above reset button
                right: "20px",
                padding: "0.5rem 1rem",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                zIndex: 1000,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
              }}
            >
              Debug Calendar
            </button>
          </>
        )}
        
        {/* Development-only date picker */}
        <DevDatePicker />
      </div>
    </div>
  );
};

export default HomePage;

// import React from "react";

// const HomePage: React.FC = () => {
//   return (
//     <div>
//       <h1>Welcome to the Home Page!</h1>
//       <p>If you can see this, your app is working!</p>
//     </div>
//   );
// };

// export default HomePage;
