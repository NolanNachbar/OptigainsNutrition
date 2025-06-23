import React, { Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

// Pages
import SignInPage from "./pages/SignInPage";
import DashboardPage from "./pages/DashboardPage";
import FoodDiaryPage from "./pages/FoodDiaryPage";
import AddFoodPage from "./pages/AddFoodPage";
import ProgressPage from "./pages/ProgressPage";
import CoachingPage from "./pages/CoachingPage";
import FoodDatabasePage from "./pages/FoodDatabasePage";
import SettingsPage from "./pages/SettingsPage";
import OnboardingPage from "./pages/OnboardingPage";
import WeeklyCheckInPage from "./pages/WeeklyCheckInPage";

// Utils and Components
import { initializeDatabase } from "./utils/database";
import Footer from "./components/Footer";
import { DateProvider } from "./contexts/DateContext";
import { ProfileGuard } from "./components/ProfileGuard";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Component to initialize database with Clerk auth
const DatabaseInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useAuth();
  
  useEffect(() => {
    // Initialize database with Clerk token getter
    initializeDatabase(() => getToken({ template: 'supabase' }));
  }, [getToken]);
  
  return <>{children}</>;
};

const App: React.FC = () => {
  if (!clerkPubKey) {
    console.error("Clerk publishable key is missing!");
    return <div>Error: Clerk publishable key is missing!</div>;
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <DateProvider>
        <DatabaseInitializer>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/sign-in" element={<SignInPage />} />
                
                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <>
                      <SignedIn>
                        <Navigate to="/dashboard" />
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <DashboardPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/onboarding"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={false}>
                          <OnboardingPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/diary"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <FoodDiaryPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/add-food"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <AddFoodPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/progress"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <ProgressPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/coaching"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <CoachingPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/foods"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <FoodDatabasePage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <SettingsPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/weekly-check-in"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <WeeklyCheckInPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
              </Routes>
              <Footer />
            </Router>
          </Suspense>
        </DatabaseInitializer>
      </DateProvider>
    </ClerkProvider>
  );
};

export default App;