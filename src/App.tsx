import React, { Suspense, useEffect, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { DashboardSkeleton } from "./components/ui/SkeletonLoader";

// Critical pages loaded immediately
import SignInPage from "./pages/SignInPage";
import DashboardPage from "./pages/DashboardPage";
import AddFoodPage from "./pages/AddFoodPage";
import OnboardingPage from "./pages/OnboardingPage";

// Lazy load secondary pages
const FoodDiaryPage = lazy(() => import("./pages/FoodDiaryPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const CoachingPage = lazy(() => import("./pages/CoachingPage"));
const FoodDatabasePage = lazy(() => import("./pages/FoodDatabasePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const WeeklyCheckInPage = lazy(() => import("./pages/WeeklyCheckInPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const RecipeBuilderPage = lazy(() => import("./pages/RecipeBuilderPage"));
const MeasurementsPage = lazy(() => import("./pages/MeasurementsPage"));
const ExpenditurePage = lazy(() => import("./pages/ExpenditurePage"));
const NutritionDashboardPage = lazy(() => import("./pages/NutritionDashboardPage"));
const HabitDashboardPage = lazy(() => import("./pages/HabitDashboardPage"));
const PlateCoachPage = lazy(() => import("./pages/PlateCoachPage"));
const DataExportPage = lazy(() => import("./pages/DataExportPage"));
const MoreMenuPage = lazy(() => import("./pages/MoreMenuPage"));

// Utils and Components
import { initializeDatabase } from "./utils/database";
import Footer from "./components/Footer";
import BottomNavigation from "./components/BottomNavigation";
import { FloatingActionButton } from "./components/FloatingActionButton";
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
          <Router>
            <Suspense fallback={
              <div className="min-h-screen bg-gray-900">
                <div className="w-full pt-20 pb-24">
                  <div className="max-w-4xl mx-auto px-4">
                    <DashboardSkeleton />
                  </div>
                </div>
              </div>
            }>
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
                <Route
                  path="/analytics"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <AnalyticsPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/recipe-builder"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <RecipeBuilderPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/measurements"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <MeasurementsPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/expenditure"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <ExpenditurePage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/nutrition-dashboard"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <NutritionDashboardPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/habits"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <HabitDashboardPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/plate-coach"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <PlateCoachPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/data-export"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <DataExportPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/more"
                  element={
                    <>
                      <SignedIn>
                        <ProfileGuard requireComplete={true}>
                          <MoreMenuPage />
                        </ProfileGuard>
                      </SignedIn>
                      <SignedOut>
                        <RedirectToSignIn />
                      </SignedOut>
                    </>
                  }
                />
                <Route
                  path="/profile"
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
              </Routes>
              <Footer />
              <BottomNavigation />
              <SignedIn>
                <FloatingActionButton />
              </SignedIn>
            </Suspense>
          </Router>
        </DatabaseInitializer>
      </DateProvider>
    </ClerkProvider>
  );
};

export default App;