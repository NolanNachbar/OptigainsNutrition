import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { format } from 'date-fns';
import { Macros, NutritionLog, UserNutritionProfile } from '../utils/types';
import Actionbar from '../components/Actionbar';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [todayLog, setTodayLog] = useState<NutritionLog | null>(null);
  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    // TODO: Implement actual database fetching
    // For now, using mock data
    setProfile({
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
    });

    setTodayLog({
      user_id: user.id,
      date: today,
      calories: 1200,
      protein: 90,
      carbs: 140,
      fat: 40,
      fiber: 15
    });

    setLoading(false);
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
      <div className="min-h-screen bg-gray-100">
        <Actionbar showBackButton={false} />
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  const remaining = getRemainingMacros();

  return (
    <div className="min-h-screen bg-gray-100">
      <Actionbar showBackButton={false} />
      
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {format(new Date(), 'EEEE, MMM d')}
          </h1>
          <p className="text-gray-600">Welcome back, {user?.firstName}!</p>
        </div>

        {/* Calorie Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Calories</h2>
            <button
              onClick={() => navigate('/add-food')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Food
            </button>
          </div>
          
          <div className="relative h-32 w-32 mx-auto mb-4">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#E5E7EB"
                strokeWidth="16"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#3B82F6"
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - (todayLog?.calories || 0) / (profile?.target_macros.calories || 1))}`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold">{todayLog?.calories || 0}</div>
              <div className="text-sm text-gray-600">of {profile?.target_macros.calories}</div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xl font-semibold text-gray-800">{remaining.calories}</p>
            <p className="text-gray-600">calories remaining</p>
          </div>
        </div>

        {/* Macros Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Macros</h2>
          
          {/* Protein */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Protein</span>
              <span className="text-sm text-gray-600">
                {todayLog?.protein || 0}g / {profile?.target_macros.protein}g
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${calculatePercentage(todayLog?.protein || 0, profile?.target_macros.protein || 1)}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Carbs</span>
              <span className="text-sm text-gray-600">
                {todayLog?.carbs || 0}g / {profile?.target_macros.carbs}g
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${calculatePercentage(todayLog?.carbs || 0, profile?.target_macros.carbs || 1)}%` }}
              />
            </div>
          </div>

          {/* Fat */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Fat</span>
              <span className="text-sm text-gray-600">
                {todayLog?.fat || 0}g / {profile?.target_macros.fat}g
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${calculatePercentage(todayLog?.fat || 0, profile?.target_macros.fat || 1)}%` }}
              />
            </div>
          </div>

          {/* Fiber */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Fiber</span>
              <span className="text-sm text-gray-600">
                {todayLog?.fiber || 0}g / {profile?.target_macros.fiber || 30}g
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${calculatePercentage(todayLog?.fiber || 0, profile?.target_macros.fiber || 30)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/diary')}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="text-blue-600 text-2xl mb-2">📖</div>
            <div className="font-medium">Food Diary</div>
          </button>
          
          <button
            onClick={() => navigate('/progress')}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="text-green-600 text-2xl mb-2">📊</div>
            <div className="font-medium">Progress</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;