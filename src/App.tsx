import React, { Suspense, useEffect, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { DashboardSkeleton } from "./components/ui/SkeletonLoader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RouteGuard, PublicRoute, ProfileGuard, OnboardingGuard } from "./components/RouteGuard";

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
    <ErrorBoundary level="app">
      <ClerkProvider publishableKey={clerkPubKey}>
        <DateProvider>
          <DatabaseInitializer>
            <Router>
              <ErrorBoundary level="page">
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
                <Route path="/sign-in" element={
                  <PublicRoute>
                    <SignInPage />
                  </PublicRoute>
                } />
                
                {/* Protected routes */}
                <Route path="/" element={
                  <RouteGuard requireAuth={true}>
                    <Navigate to="/dashboard" />
                  </RouteGuard>
                } />
                <Route path="/dashboard" element={
                  <ProfileGuard>
                    <DashboardPage />
                  </ProfileGuard>
                } />
                <Route path="/onboarding" element={
                  <OnboardingGuard>
                    <OnboardingPage />
                  </OnboardingGuard>
                } />
                <Route path="/diary" element={
                  <ProfileGuard>
                    <FoodDiaryPage />
                  </ProfileGuard>
                } />
                <Route path="/add-food" element={
                  <ProfileGuard>
                    <AddFoodPage />
                  </ProfileGuard>
                } />
                <Route path="/progress" element={
                  <ProfileGuard>
                    <ProgressPage />
                  </ProfileGuard>
                } />
                <Route path="/coaching" element={
                  <ProfileGuard>
                    <CoachingPage />
                  </ProfileGuard>
                } />
                <Route path="/foods" element={
                  <ProfileGuard>
                    <FoodDatabasePage />
                  </ProfileGuard>
                } />
                <Route path="/settings" element={
                  <ProfileGuard>
                    <SettingsPage />
                  </ProfileGuard>
                } />
                <Route path="/weekly-check-in" element={<ProfileGuard><WeeklyCheckInPage /></ProfileGuard>} />
                <Route path="/analytics" element={<ProfileGuard><AnalyticsPage /></ProfileGuard>} />
                <Route path="/recipe-builder" element={<ProfileGuard><RecipeBuilderPage /></ProfileGuard>} />
                <Route path="/measurements" element={<ProfileGuard><MeasurementsPage /></ProfileGuard>} />
                <Route path="/expenditure" element={<ProfileGuard><ExpenditurePage /></ProfileGuard>} />
                <Route path="/nutrition-dashboard" element={<ProfileGuard><NutritionDashboardPage /></ProfileGuard>} />
                <Route path="/habits" element={<ProfileGuard><HabitDashboardPage /></ProfileGuard>} />
                <Route path="/plate-coach" element={<ProfileGuard><PlateCoachPage /></ProfileGuard>} />
                <Route path="/data-export" element={<ProfileGuard><DataExportPage /></ProfileGuard>} />
                <Route path="/more" element={<ProfileGuard><MoreMenuPage /></ProfileGuard>} />
                <Route path="/profile" element={<ProfileGuard><SettingsPage /></ProfileGuard>} />
              </Routes>
              <Footer />
              <BottomNavigation />
              <RouteGuard requireAuth={true}>
                <FloatingActionButton />
              </RouteGuard>
                </Suspense>
              </ErrorBoundary>
            </Router>
          </DatabaseInitializer>
        </DateProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
};

export default App;