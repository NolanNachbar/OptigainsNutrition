import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { format, differenceInDays } from 'date-fns';
import { NutritionLog, UserNutritionProfile, Meal, MealType } from '../utils/types';
import Actionbar from '../components/Actionbar';
import { getUserProfile, createOrUpdateUserProfile, getNutritionLog, getMealsByDate, getWeightEntries, getLatestWeeklyCheckIn } from '../utils/database';
import { Card, MetricCard, CardGroup } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MultiProgressRing, MiniProgressRing } from '../components/ui/ProgressRing';
import { theme } from '../styles/theme';
import TDEECard from '../components/TDEECard';
import CoachingRecommendations from '../components/CoachingRecommendations';

// Simple TDEE types for now
interface SimpleTDEEData {
  currentTDEE: number;
  weeklyChange: number;
  confidence: 'low' | 'medium' | 'high';
  trendDirection: 'gaining' | 'losing' | 'maintaining';
  adherenceScore: number;
}

interface SimpleRecommendation {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  suggestedChanges?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [todayLog, setTodayLog] = useState<NutritionLog | null>(null);
  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tdeeData, setTdeeData] = useState<SimpleTDEEData | null>(null);
  const [recommendations, setRecommendations] = useState<SimpleRecommendation[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [showCheckInReminder, setShowCheckInReminder] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const initAndFetch = async () => {
      if (!isLoaded) return;
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Small delay to ensure auth is propagated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await fetchData();
        await fetchTDEEData();
      } catch (error) {
        console.error('[DashboardPage] Error during init:', error);
        setLoading(false);
      }
    };
    
    initAndFetch();
  }, [isLoaded, user, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTDEEData = async () => {
    if (!user || !profile) return;

    try {
      // Get weight entries for trend calculation
      const weights = await getWeightEntries(user.id, 30);
      
      // Calculate simple weight trend
      let weeklyChange = 0;
      if (weights.length >= 2) {
        const latestWeight = weights[0].weight;
        const weekAgoWeight = weights.find(w => {
          const daysDiff = Math.floor((new Date().getTime() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff >= 6 && daysDiff <= 8;
        })?.weight || latestWeight;
        
        weeklyChange = latestWeight - weekAgoWeight;
      }

      // Determine trend direction
      let trendDirection: 'gaining' | 'losing' | 'maintaining' = 'maintaining';
      if (weeklyChange > 0.2) trendDirection = 'gaining';
      else if (weeklyChange < -0.2) trendDirection = 'losing';

      // Simple adherence calculation
      const adherenceScore = todayLog ? Math.min(100, Math.round((todayLog.calories / profile.target_macros.calories) * 100)) : 0;

      setTdeeData({
        currentTDEE: profile.tdee_estimate,
        weeklyChange,
        confidence: weights.length >= 14 ? 'high' : weights.length >= 7 ? 'medium' : 'low',
        trendDirection,
        adherenceScore
      });

      // Generate simple recommendations
      const newRecommendations: SimpleRecommendation[] = [];
      
      if (profile.goal_type === 'cut' && trendDirection !== 'losing') {
        newRecommendations.push({
          type: 'calories',
          message: 'You may need to reduce calories slightly to continue losing weight.',
          severity: 'warning',
          suggestedChanges: { calories: -100 }
        });
      } else if (profile.goal_type === 'gain' && trendDirection !== 'gaining') {
        newRecommendations.push({
          type: 'calories',
          message: 'Consider increasing calories to support muscle growth.',
          severity: 'info',
          suggestedChanges: { calories: 150 }
        });
      }

      setRecommendations(newRecommendations);
    } catch (error) {
      console.error('Error fetching TDEE data:', error);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch user profile - ProfileGuard ensures it exists
      let userProfile = await getUserProfile(user.id);
      
      setProfile(userProfile);
      
      // Fetch today's nutrition log
      if (userProfile) {
        const log = await getNutritionLog(user.id, today);
        setTodayLog(log);
        
        // Fetch today's meals
        const todayMeals = await getMealsByDate(user.id, today);
        setMeals(todayMeals);
        
        // Check if weekly check-in is due
        const lastCheckIn = await getLatestWeeklyCheckIn(user.id);
        if (lastCheckIn) {
          const daysSinceLastCheckIn = differenceInDays(new Date(), new Date(lastCheckIn.week_start_date));
          setShowCheckInReminder(daysSinceLastCheckIn >= 7);
        } else {
          // No check-in history, show reminder
          setShowCheckInReminder(true);
        }
      }
      
      // Only set loading to false if we've successfully loaded everything
      // Add a minimum delay on first load to prevent flash
      if (!hasLoadedOnce) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setHasLoadedOnce(true);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleApplyRecommendation = async (changes: any) => {
    if (!profile) return;
    
    const updatedProfile = {
      ...profile,
      target_macros: {
        ...profile.target_macros,
        ...changes
      }
    };
    
    const success = await createOrUpdateUserProfile(updatedProfile);
    if (success) {
      setProfile(updatedProfile);
      await fetchData();
    }
  };

  // Calculate consumed macros from meals
  const consumedMacros = meals.reduce((totals, meal) => {
    if (!meal.food) return totals;
    const multiplier = meal.amount_grams / 100;
    return {
      calories: totals.calories + Math.round(meal.food.calories_per_100g * multiplier),
      protein: totals.protein + Math.round(meal.food.protein_per_100g * multiplier),
      carbs: totals.carbs + Math.round(meal.food.carbs_per_100g * multiplier),
      fat: totals.fat + Math.round(meal.food.fat_per_100g * multiplier),
      fiber: totals.fiber + Math.round((meal.food.fiber_per_100g || 0) * multiplier)
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const consumedCalories = consumedMacros.calories;
  const targetCalories = profile?.target_macros.calories || 0;
  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const calorieProgress = targetCalories > 0 ? (consumedCalories / targetCalories) * 100 : 0;

  // Group meals by type
  const mealGroups = meals.reduce((groups, meal) => {
    const group = groups.find(g => g.type === meal.meal_type);
    if (group) {
      group.meals.push(meal);
    } else {
      groups.push({ type: meal.meal_type, meals: [meal] });
    }
    return groups;
  }, [] as { type: MealType; meals: Meal[] }[]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-700 border-t-blue-500"></div>
            <p className="mt-4 text-gray-400">Loading your nutrition data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!</h1>
            <p className="text-gray-400 mt-2">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            {/* Weekly Check-in Reminder */}
            {showCheckInReminder && (
              <Card variant="elevated" className="mb-6 bg-blue-500/10 border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Time for your weekly check-in!</h3>
                      <p className="text-sm text-gray-400 mt-1">Review your progress and get personalized recommendations</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/weekly-check-in')}
                    variant="primary"
                    size="md"
                  >
                    Check In Now
                  </Button>
                </div>
              </Card>
            )}

            {/* Macros Summary */}
            <Card variant="glass" className="mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Today's Nutrition</h2>
                <MiniProgressRing
                  value={calorieProgress}
                  size={32}
                  strokeWidth={4}
                />
              </div>
              
              {/* Calorie Overview */}
              <div className="flex justify-between items-center mb-8">
                <div>
                  <div className="text-4xl font-bold">{consumedCalories.toLocaleString()}</div>
                  <div className="text-sm text-gray-400 mt-1">calories consumed</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-blue-500">{remainingCalories.toLocaleString()}</div>
                  <div className="text-sm text-gray-400 mt-1">remaining</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(calorieProgress, 100)}%` }}
                  />
                </div>
              </div>
              
              {/* Macro Distribution */}
              {consumedCalories > 0 && (
                <div className="flex justify-center mb-8">
                  <MultiProgressRing
                    size={160}
                    strokeWidth={20}
                    values={[
                      {
                        value: (consumedMacros.protein * 4 / consumedCalories) * 100,
                        color: theme.colors.blue[500],
                        label: 'Protein'
                      },
                      {
                        value: (consumedMacros.carbs * 4 / consumedCalories) * 100,
                        color: theme.colors.green[500],
                        label: 'Carbs'
                      },
                      {
                        value: (consumedMacros.fat * 9 / consumedCalories) * 100,
                        color: theme.colors.orange[500],
                        label: 'Fat'
                      }
                    ]}
                  />
                </div>
              )}
              
              {/* Macro Details */}
              <CardGroup>
                <MetricCard
                  title="Protein"
                  value={`${consumedMacros.protein}g`}
                  subtitle={`of ${profile?.target_macros.protein || 0}g`}
                />
                <MetricCard
                  title="Carbs"
                  value={`${consumedMacros.carbs}g`}
                  subtitle={`of ${profile?.target_macros.carbs || 0}g`}
                />
                <MetricCard
                  title="Fat"
                  value={`${consumedMacros.fat}g`}
                  subtitle={`of ${profile?.target_macros.fat || 0}g`}
                />
              </CardGroup>
            </Card>

            {/* Today's Meals */}
            {mealGroups.length > 0 && (
              <Card variant="elevated" className="mb-6">
                <h2 className="text-xl font-semibold mb-6">Today's Meals</h2>
                <div className="space-y-6">
                  {mealGroups.map((group) => (
                    <div key={group.type}>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium capitalize">{group.type}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/add-food?meal=${group.type}`)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {group.meals.map((meal) => (
                          <div key={meal.id} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                            <div>
                              <p className="font-medium">{meal.food?.name}</p>
                              <p className="text-sm text-gray-400">{meal.amount_grams}g</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{Math.round((meal.food?.calories_per_100g || 0) * meal.amount_grams / 100)} cal</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* TDEE & Coaching Section */}
            {tdeeData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <TDEECard tdeeData={tdeeData} />
                {recommendations.length > 0 && (
                  <CoachingRecommendations 
                    recommendations={recommendations}
                    onApplyChanges={(changes) => handleApplyRecommendation(changes)}
                  />
                )}
              </div>
            )}

            {/* Quick Actions */}
            <Card variant="elevated" className="mb-6">
              <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/diary')}
                  variant="primary"
                  size="lg"
                  className="w-full"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  }
                >
                  View Food Diary
                </Button>
                <Button
                  onClick={() => navigate('/add-food?meal=snack')}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  Add Food
                </Button>
                <Button
                  onClick={() => navigate('/progress')}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                >
                  View Progress
                </Button>
                <Button
                  onClick={() => navigate('/weekly-check-in')}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                >
                  Weekly Check-In
                </Button>
                <Button
                  onClick={() => navigate('/analytics')}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                >
                  View Analytics
                </Button>
              </div>
            </Card>

            {/* Today's Summary */}
            {todayLog && (
              <Card variant="glass">
                <h2 className="text-xl font-semibold mb-6">Today's Summary</h2>
                <CardGroup>
                  <MetricCard
                    title="Meals Logged"
                    value={meals.length.toString()}
                    subtitle="entries today"
                  />
                  <MetricCard
                    title="Fiber"
                    value={`${consumedMacros.fiber}g`}
                    subtitle="consumed"
                  />
                  <MetricCard
                    title="Goal Type"
                    value={profile?.goal_type || 'maintenance'}
                    subtitle="current program"
                  />
                </CardGroup>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;