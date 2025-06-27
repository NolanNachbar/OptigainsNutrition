import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { format, differenceInDays } from 'date-fns';
import { NutritionLog, UserNutritionProfile, Meal, MealType } from '../utils/types';
import Actionbar from '../components/Actionbar';
import { getUserProfile, getNutritionLog, getMealsByDate, getWeightEntries, getLatestWeeklyCheckIn } from '../utils/database';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MultiProgressRing } from '../components/ui/ProgressRing';
import { theme } from '../styles/theme';
// Removed unused imports
import { QuickAddPanel } from '../components/QuickAddPanel';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';
// import { useTDEEWorker } from '../hooks/useWebWorker'; // TODO: Implement worker usage
import { useCache, cacheKeys } from '../utils/cache';

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
  
  // Performance optimizations
  // const { calculateTDEE: workerCalculateTDEE } = useTDEEWorker(); // TODO: Use for heavy calculations
  const { getCached, setCached } = useCache<SimpleTDEEData>();

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

  const fetchTDEEData = useCallback(async () => {
    if (!user || !profile) return;

    // Check cache first
    const cacheKey = cacheKeys.tdee(user.id, today);
    const cached = getCached(cacheKey);
    if (cached) {
      setTdeeData(cached);
      return;
    }

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
      
      // Cache the result
      setCached(cacheKey, {
        currentTDEE: profile.tdee_estimate,
        weeklyChange,
        confidence: weights.length >= 14 ? 'high' : weights.length >= 7 ? 'medium' : 'low',
        trendDirection,
        adherenceScore
      });
    } catch (error) {
      console.error('Error fetching TDEE data:', error);
    }
  }, [user, profile, todayLog]);

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

  // Removed unused function

  // Calculate consumed macros from meals
  const consumedMacros = useMemo(() => {
    return meals.reduce((totals, meal) => {
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
  }, [meals]);

  const consumedCalories = consumedMacros.calories;
  const targetCalories = profile?.target_macros.calories || 0;
  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const calorieProgress = targetCalories > 0 ? (consumedCalories / targetCalories) * 100 : 0;

  // Group meals by type
  const mealGroups = useMemo(() => {
    return meals.reduce((groups, meal) => {
      const group = groups.find(g => g.type === meal.meal_type);
      if (group) {
        group.meals.push(meal);
      } else {
        groups.push({ type: meal.meal_type, meals: [meal] });
      }
      return groups;
    }, [] as { type: MealType; meals: Meal[] }[]);
  }, [meals]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="w-full pt-20 pb-24">
          <div className="max-w-4xl mx-auto px-4">
            <DashboardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-20 pb-24">
        <div className="max-w-4xl mx-auto px-4">
          {/* Simplified Header */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{format(new Date(), 'EEEE, MMMM d')}</p>
            <h1 className="text-2xl font-bold mt-1">Today's Overview</h1>
          </div>
          
          <div className="space-y-4">
            {/* Weekly Check-in Reminder */}
            {showCheckInReminder && (
              <Card variant="elevated" className="mb-6 bg-blue-500/10 border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
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

            {/* Primary Calorie Card - Hero Metric */}
            <Card variant="glass" className="mb-4" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
              <div className="text-center py-8">
                <div className="text-6xl font-bold tracking-tight mb-2">
                  {consumedCalories.toLocaleString()}
                </div>
                <div className="text-lg text-gray-400 mb-6">calories consumed</div>
                
                {/* Large centered progress ring */}
                <div className="flex justify-center mb-6">
                  <MultiProgressRing
                    size={200}
                    strokeWidth={16}
                    values={[
                      {
                        value: Math.min(calorieProgress, 100),
                        color: calorieProgress > 110 ? theme.colors.semantic.error : theme.colors.primary[500],
                        label: 'Progress'
                      }
                    ]}
                  />
                </div>
                
                <div className="flex justify-center gap-8">
                  <div>
                    <div className="text-2xl font-semibold">{targetCalories.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">target</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-blue-500">{remainingCalories.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">remaining</div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Macros Grid - Secondary Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card variant="elevated" padding="md">
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Protein</div>
                  <div className="text-2xl font-bold text-blue-400">{consumedMacros.protein}</div>
                  <div className="text-xs text-gray-600">/ {profile?.target_macros.protein || 0}g</div>
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-700"
                        style={{ width: `${Math.min((consumedMacros.protein / (profile?.target_macros.protein || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card variant="elevated" padding="md">
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Carbs</div>
                  <div className="text-2xl font-bold text-green-400">{consumedMacros.carbs}</div>
                  <div className="text-xs text-gray-600">/ {profile?.target_macros.carbs || 0}g</div>
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-700"
                        style={{ width: `${Math.min((consumedMacros.carbs / (profile?.target_macros.carbs || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card variant="elevated" padding="md">
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fat</div>
                  <div className="text-2xl font-bold text-orange-400">{consumedMacros.fat}</div>
                  <div className="text-xs text-gray-600">/ {profile?.target_macros.fat || 0}g</div>
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 transition-all duration-700"
                        style={{ width: `${Math.min((consumedMacros.fat / (profile?.target_macros.fat || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Add Panel */}
            <QuickAddPanel />

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

            {/* TDEE & Weight Trend Row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {tdeeData && (
                <Card variant="elevated" padding="md" hover onClick={() => navigate('/expenditure')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">TDEE</div>
                      <div className="text-2xl font-bold">{tdeeData.currentTDEE}</div>
                      <div className="text-xs text-gray-600">cal/day</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${tdeeData.weeklyChange > 0 ? 'text-red-400' : tdeeData.weeklyChange < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                        {tdeeData.weeklyChange > 0 ? '+' : ''}{tdeeData.weeklyChange.toFixed(1)}kg
                      </div>
                      <div className="text-xs text-gray-600">this week</div>
                    </div>
                  </div>
                </Card>
              )}
              
              <Card variant="elevated" padding="md" hover onClick={() => navigate('/weekly-check-in')}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Adherence</div>
                    <div className="text-2xl font-bold">{tdeeData?.adherenceScore || 0}%</div>
                    <div className="text-xs text-gray-600">today</div>
                  </div>
                  <div className="text-3xl opacity-20">📊</div>
                </div>
              </Card>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Card 
                variant="elevated" 
                padding="md" 
                hover 
                onClick={() => navigate('/analytics')}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Analytics</div>
                    <div className="text-xs text-gray-500">View trends</div>
                  </div>
                </div>
              </Card>
              
              <Card 
                variant="elevated" 
                padding="md" 
                hover 
                onClick={() => navigate('/recipe-builder')}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-1 h-1 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Recipes</div>
                    <div className="text-xs text-gray-500">Create meals</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Coaching Insights */}
            {recommendations.length > 0 && (
              <Card variant="glass" className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Today's Insights</h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/coaching')}>
                    View All
                  </Button>
                </div>
                <div className="space-y-2">
                  {recommendations.slice(0, 2).map((rec, index) => (
                    <div key={index} className="p-3 bg-gray-800/50 rounded-lg">
                      <p className="text-sm">{rec.message}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;