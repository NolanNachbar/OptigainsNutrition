import React, { Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

// Utils and Components
import { initializeDatabase } from "./utils/database";
import Footer from "./components/Footer";
import { DateProvider } from "./contexts/DateContext";

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
                        <DashboardPage />
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
                        <FoodDiaryPage />
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
                        <AddFoodPage />
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
                        <ProgressPage />
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
                        <CoachingPage />
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
                        <FoodDatabasePage />
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
                        <SettingsPage />
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