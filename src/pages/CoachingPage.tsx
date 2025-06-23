import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { format, addWeeks } from 'date-fns';
import { 
  UserNutritionProfile, 
  GoalType, 
  CoachingMode, 
  Macros,
  WeeklyCheckIn 
} from '../utils/types';
import Actionbar from '../components/Actionbar';

const CoachingPage: React.FC = () => {
  const { user } = useUser();
  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [checkIn, setCheckIn] = useState<Partial<WeeklyCheckIn>>({
    energy_level: 3,
    hunger_level: 3,
    training_performance: 3,
    notes: ''
  });
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    // TODO: Implement actual database fetching
    // Mock data
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
    
    setLoading(false);
  };

  const handleGoalChange = async (newGoal: GoalType) => {
    if (!profile) return;
    
    // Calculate new macros based on goal
    let newCalories = profile.tdee_estimate;
    
    switch (newGoal) {
      case 'cut':
        newCalories = Math.round(profile.tdee_estimate * 0.8); // 20% deficit
        break;
      case 'gain':
        newCalories = Math.round(profile.tdee_estimate * 1.15); // 15% surplus
        break;
      case 'recomp':
        newCalories = Math.round(profile.tdee_estimate * 0.95); // 5% deficit
        break;
    }
    
    const newMacros = calculateMacros(newCalories, newGoal);
    
    setProfile({
      ...profile,
      goal_type: newGoal,
      target_macros: newMacros
    });
    
    // TODO: Save to database
  };

  const handleCoachingModeChange = async (newMode: CoachingMode) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      coaching_mode: newMode
    });
    
    // TODO: Save to database
  };

  const calculateMacros = (calories: number, goal: GoalType): Macros => {
    let proteinMultiplier = 0.8; // g per lb of body weight
    let fatPercentage = 0.25;
    
    switch (goal) {
      case 'cut':
        proteinMultiplier = 1.0;
        fatPercentage = 0.22;
        break;
      case 'gain':
        proteinMultiplier = 0.8;
        fatPercentage = 0.3;
        break;
      case 'recomp':
        proteinMultiplier = 0.9;
        fatPercentage = 0.25;
        break;
    }
    
    // Assume 165 lbs for now (TODO: get from user profile)
    const protein = Math.round(165 * proteinMultiplier);
    const fat = Math.round((calories * fatPercentage) / 9);
    const carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4);
    
    return {
      calories,
      protein,
      carbs,
      fat,
      fiber: 30
    };
  };

  const handleWeeklyCheckIn = async () => {
    if (!user) return;
    
    // TODO: Save check-in to database
    console.log('Weekly check-in:', checkIn);
    
    // TODO: Calculate new macros based on progress
    
    setShowCheckIn(false);
    setCheckIn({
      energy_level: 3,
      hunger_level: 3,
      training_performance: 3,
      notes: ''
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Actionbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Actionbar />
      
      <div className="container mx-auto px-4 py-6 max-w-md">
        <h1 className="text-2xl font-bold mb-6">Nutrition Coaching</h1>
        
        {/* Current Plan */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Daily Calories</span>
              <span className="font-semibold">{profile?.target_macros.calories}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Protein</span>
              <span className="font-semibold">{profile?.target_macros.protein}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Carbs</span>
              <span className="font-semibold">{profile?.target_macros.carbs}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fat</span>
              <span className="font-semibold">{profile?.target_macros.fat}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fiber</span>
              <span className="font-semibold">{profile?.target_macros.fiber}g min</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              TDEE Estimate: {profile?.tdee_estimate} calories/day
            </p>
          </div>
        </div>

        {/* Goal Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Goal</h2>
          <div className="space-y-2">
            {(['maintenance', 'cut', 'gain', 'recomp'] as GoalType[]).map((goal) => (
              <button
                key={goal}
                onClick={() => handleGoalChange(goal)}
                className={`w-full p-3 rounded-lg border-2 transition-colors ${
                  profile?.goal_type === goal
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium capitalize">{goal}</div>
                <div className="text-sm text-gray-600">
                  {goal === 'maintenance' && 'Maintain current weight'}
                  {goal === 'cut' && 'Lose weight (20% deficit)'}
                  {goal === 'gain' && 'Build muscle (15% surplus)'}
                  {goal === 'recomp' && 'Lose fat, maintain muscle (5% deficit)'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Coaching Mode */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Coaching Style</h2>
          <div className="space-y-2">
            {(['coached', 'manual', 'collaborative'] as CoachingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleCoachingModeChange(mode)}
                className={`w-full p-3 rounded-lg border-2 transition-colors ${
                  profile?.coaching_mode === mode
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium capitalize">{mode}</div>
                <div className="text-sm text-gray-600">
                  {mode === 'coached' && 'Automatic weekly adjustments'}
                  {mode === 'manual' && 'You control all settings'}
                  {mode === 'collaborative' && 'AI suggests, you approve'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Weekly Check-in */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Weekly Check-in</h2>
            <span className="text-sm text-gray-600">
              Next: {format(addWeeks(new Date(), 1), 'MMM d')}
            </span>
          </div>
          <p className="text-gray-600 mb-4">
            Complete your weekly check-in to get updated macro targets based on your progress.
          </p>
          <button
            onClick={() => setShowCheckIn(true)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Start Check-in
          </button>
        </div>
      </div>

      {/* Check-in Modal */}
      {showCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Weekly Check-in</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Energy Level (1-5)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setCheckIn({ ...checkIn, energy_level: level as 1 | 2 | 3 | 4 | 5 })}
                      className={`flex-1 py-2 rounded-lg border-2 ${
                        checkIn.energy_level === level
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Hunger Level (1-5)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setCheckIn({ ...checkIn, hunger_level: level as 1 | 2 | 3 | 4 | 5 })}
                      className={`flex-1 py-2 rounded-lg border-2 ${
                        checkIn.hunger_level === level
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  1 = Never hungry, 5 = Always hungry
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Training Performance (1-5)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setCheckIn({ ...checkIn, training_performance: level as 1 | 2 | 3 | 4 | 5 })}
                      className={`flex-1 py-2 rounded-lg border-2 ${
                        checkIn.training_performance === level
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes
                </label>
                <textarea
                  value={checkIn.notes}
                  onChange={(e) => setCheckIn({ ...checkIn, notes: e.target.value })}
                  className="w-full p-2 border rounded-lg resize-none"
                  rows={3}
                  placeholder="Any additional notes about your week..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleWeeklyCheckIn}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Submit Check-in
              </button>
              <button
                onClick={() => setShowCheckIn(false)}
                className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachingPage;