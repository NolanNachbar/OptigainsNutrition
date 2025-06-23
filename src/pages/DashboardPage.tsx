import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { format } from 'date-fns';
import { Macros, NutritionLog, UserNutritionProfile } from '../utils/types';
import Actionbar from '../components/Actionbar';
import { getUserProfile, createOrUpdateUserProfile, getNutritionLog, getMealsByDate, getWeightEntries } from '../utils/database';

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
import TDEECard from '../components/TDEECard';
import CoachingRecommendations from '../components/CoachingRecommendations';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [todayLog, setTodayLog] = useState<NutritionLog | null>(null);
  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tdeeData, setTdeeData] = useState<SimpleTDEEData | null>(null);
  const [recommendations, setRecommendations] = useState<SimpleRecommendation[]>([]);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const initAndFetch = async () => {
      if (isLoaded && user) {
        try {
          // Small delay to ensure auth is propagated
          await new Promise(resolve => setTimeout(resolve, 100));
          
          await fetchData();
          await fetchTDEEData();
        } catch (error) {
          console.error('[DashboardPage] Error during init:', error);
          setLoading(false);
        }
      }
    };
    
    initAndFetch();
  }, [isLoaded, user, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTDEEData = async () => {
    if (!user || !profile) return;

    try {
      // Get recent weight entries for basic TDEE display
      const weightEntries = await getWeightEntries(user.id, 30); // last 30 days
      
      // Simple TDEE data for display
      const simpleTDEE: SimpleTDEEData = {
        currentTDEE: profile.tdee_estimate,
        weeklyChange: 0, // TODO: calculate from weight entries
        confidence: weightEntries.length >= 14 ? 'medium' : 'low',
        trendDirection: 'maintaining',
        adherenceScore: 85 // TODO: calculate from nutrition logs
      };
      
      setTdeeData(simpleTDEE);

      // Simple recommendations
      const simpleRecs: SimpleRecommendation[] = [
        {
          type: 'info',
          message: 'Track consistently for personalized recommendations',
          severity: 'info'
        }
      ];
      setRecommendations(simpleRecs);
    } catch (error) {
      console.error('[DashboardPage] Error calculating TDEE:', error);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    
    
    try {
      // Fetch user profile
      let userProfile = await getUserProfile(user.id);
      
      // If no profile exists, create default one
      if (!userProfile) {
        const defaultProfile: UserNutritionProfile = {
          clerk_user_id: user.id,
          tdee_estimate: 2500,
          coaching_mode: 'coached',
          goal_type: 'maintenance',
          target_macros: {
            calories: 2500,
            protein: 180,
            carbs: 280,
            fat: 80,
            fiber: 30
          },
          activity_level: 'moderate'
        };

        const success = await createOrUpdateUserProfile(defaultProfile);
        if (success) {
          userProfile = await getUserProfile(user.id);
        }
      }

      if (userProfile) {
        setProfile(userProfile);
      }

      // Fetch today's nutrition log
      const log = await getNutritionLog(user.id, today);
      
      if (log) {
        setTodayLog(log);
      } else {
        // Calculate from meals if no log exists
        const meals = await getMealsByDate(user.id, today);
        
        if (meals && meals.length > 0) {
          const totals = meals.reduce((acc, meal) => {
            if (!meal.food) return acc;
            const multiplier = meal.amount_grams / 100;
            return {
              calories: acc.calories + (meal.food.calories_per_100g * multiplier),
              protein: acc.protein + (meal.food.protein_per_100g * multiplier),
              carbs: acc.carbs + (meal.food.carbs_per_100g * multiplier),
              fat: acc.fat + (meal.food.fat_per_100g * multiplier),
              fiber: (acc.fiber || 0) + ((meal.food.fiber_per_100g || 0) * multiplier)
            };
          }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

          setTodayLog({
            clerk_user_id: user.id,
            date: today,
            calories: Math.round(totals.calories),
            protein: Math.round(totals.protein),
            carbs: Math.round(totals.carbs),
            fat: Math.round(totals.fat),
            fiber: Math.round(totals.fiber || 0)
          });
        } else {
          setTodayLog({
            clerk_user_id: user.id,
            date: today,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (current: number, target: number): number => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getRemainingMacros = (): Macros => {
    if (!profile || !todayLog) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    return {
      calories: Math.max(0, profile.target_macros.calories - todayLog.calories),
      protein: Math.max(0, profile.target_macros.protein - todayLog.protein),
      carbs: Math.max(0, profile.target_macros.carbs - todayLog.carbs),
      fat: Math.max(0, profile.target_macros.fat - todayLog.fat),
      fiber: Math.max(0, (profile.target_macros.fiber || 30) - (todayLog.fiber || 0))
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <Actionbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  const remaining = getRemainingMacros();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Actionbar />
      
      <div className="page-content flex-1">
        <div className="centered-container">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {format(new Date(), 'EEEE, MMM d')}
            </h1>
            <p className="text-gray-400">Welcome back, {user?.firstName || 'there'}!</p>
          </div>

          <div className="w-full max-w-2xl">
            {/* TDEE and Coaching Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <TDEECard tdeeData={tdeeData} isLoading={loading} />
              {recommendations.length > 0 && (
                <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                  <CoachingRecommendations 
                    recommendations={recommendations.slice(0, 2)} 
                    onApplyChanges={(changes) => {
                      console.log('Apply coaching changes:', changes);
                      // TODO: Implement macro adjustment
                    }}
                  />
                </div>
              )}
            </div>

            {/* Calorie Overview Card */}
            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Calories</h2>
              <button
                onClick={() => navigate('/add-food')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Add Food
              </button>
            </div>
            
            {/* Calorie Ring */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#374151"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#3B82F6"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - (todayLog?.calories || 0) / (profile?.target_macros.calories || 1))}`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-white">{todayLog?.calories || 0}</div>
                  <div className="text-sm text-gray-400">of {profile?.target_macros.calories}</div>
                </div>
              </div>
              
              <div className="text-center mt-4">
                <p className="text-2xl font-semibold text-white">{remaining.calories}</p>
                <p className="text-gray-400">calories remaining</p>
              </div>
            </div>
          </div>

            {/* Macros Grid */}
            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-6">Macronutrients</h2>
            
            <div className="space-y-6">
              {/* Protein */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-gray-300">Protein</span>
                  <span className="text-sm text-gray-400">
                    {todayLog?.protein || 0}g / {profile?.target_macros.protein}g
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-red-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${calculatePercentage(todayLog?.protein || 0, profile?.target_macros.protein || 1)}%` }}
                  />
                </div>
              </div>

              {/* Carbs */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-gray-300">Carbohydrates</span>
                  <span className="text-sm text-gray-400">
                    {todayLog?.carbs || 0}g / {profile?.target_macros.carbs}g
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${calculatePercentage(todayLog?.carbs || 0, profile?.target_macros.carbs || 1)}%` }}
                  />
                </div>
              </div>

              {/* Fat */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-gray-300">Fat</span>
                  <span className="text-sm text-gray-400">
                    {todayLog?.fat || 0}g / {profile?.target_macros.fat}g
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${calculatePercentage(todayLog?.fat || 0, profile?.target_macros.fat || 1)}%` }}
                  />
                </div>
              </div>

              {/* Fiber */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-gray-300">Fiber</span>
                  <span className="text-sm text-gray-400">
                    {todayLog?.fiber || 0}g / {profile?.target_macros.fiber || 30}g
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${calculatePercentage(todayLog?.fiber || 0, profile?.target_macros.fiber || 30)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/diary')}
                className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 hover:bg-gray-750 transition-colors flex flex-col items-center"
              >
                <svg className="w-8 h-8 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="font-medium text-white">Food Diary</span>
              </button>
              
              <button
                onClick={() => navigate('/progress')}
                className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 hover:bg-gray-750 transition-colors flex flex-col items-center"
              >
                <svg className="w-8 h-8 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium text-white">Progress</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;