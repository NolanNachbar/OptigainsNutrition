import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { format, addWeeks } from 'date-fns';
import { 
  UserNutritionProfile, 
  GoalType, 
  CoachingMode,
  WeeklyCheckIn 
} from '../utils/types';
import Actionbar from '../components/Actionbar';
import { getUserProfile, createOrUpdateUserProfile, createWeeklyCheckIn } from '../utils/database';
import { getWeightRange, calculateWeeklyAverages } from '../utils/nutritionDatabase';
import { calculateMacroTargets, adjustMacrosFromCheckIn } from '../utils/tdeeCalculator';

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
    
    setLoading(true);
    try {
      const userProfile = await getUserProfile(user.id);
      
      if (userProfile) {
        setProfile(userProfile);
      } else {
        // Create default profile
        const defaultProfile: UserNutritionProfile = {
          clerk_user_id: user.id,
          tdee_estimate: 2500,
          coaching_mode: 'collaborative',
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
        
        await createOrUpdateUserProfile(defaultProfile);
        setProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalChange = async (newGoal: GoalType) => {
    if (!profile || !user) return;
    
    try {
      // Get current weight for macro calculation
      const weights = await getWeightRange(
        user.id,
        format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        format(new Date(), 'yyyy-MM-dd')
      );
      
      const currentWeight = weights.length > 0 
        ? weights[weights.length - 1].weight 
        : 75; // Default 75kg if no weight data
      
      // Calculate new macros based on goal
      const newMacros = calculateMacroTargets(profile, profile.tdee_estimate, currentWeight);
      
      const updatedProfile = {
        ...profile,
        goal_type: newGoal,
        target_macros: {
          calories: newMacros.calories,
          protein: newMacros.protein,
          carbs: newMacros.carbs,
          fat: newMacros.fat,
          fiber: newMacros.fiber
        }
      };
      
      // Save to database
      await createOrUpdateUserProfile(updatedProfile);
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal. Please try again.');
    }
  };

  const handleCoachingModeChange = async (newMode: CoachingMode) => {
    if (!profile) return;
    
    try {
      const updatedProfile = {
        ...profile,
        coaching_mode: newMode
      };
      
      await createOrUpdateUserProfile(updatedProfile);
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating coaching mode:', error);
      alert('Failed to update coaching mode. Please try again.');
    }
  };

  const subDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  };

  const handleWeeklyCheckIn = async () => {
    if (!user || !profile) return;
    
    try {
      // Get week's data
      const weekStartDate = format(subDays(new Date(), 6), 'yyyy-MM-dd');
      const weekEndDate = format(new Date(), 'yyyy-MM-dd');
      
      // Get weekly averages
      const { macros: avgMacros, adherence } = await calculateWeeklyAverages(user.id, weekEndDate);
      
      // Get weight data
      const weights = await getWeightRange(user.id, weekStartDate, weekEndDate);
      const avgWeight = weights.length > 0
        ? weights.reduce((sum, w) => sum + w.weight, 0) / weights.length
        : 0;
      
      // Calculate weekly weight change
      const weekAgoWeights = await getWeightRange(
        user.id,
        format(subDays(new Date(), 13), 'yyyy-MM-dd'),
        format(subDays(new Date(), 7), 'yyyy-MM-dd')
      );
      
      const lastWeekAvgWeight = weekAgoWeights.length > 0
        ? weekAgoWeights.reduce((sum, w) => sum + w.weight, 0) / weekAgoWeights.length
        : avgWeight;
      
      const weeklyWeightChange = avgWeight - lastWeekAvgWeight;
      
      // Adjust macros if in coached mode
      let macroAdjustment = null;
      if (profile.coaching_mode === 'coached') {
        const adjustedMacros = adjustMacrosFromCheckIn(
          profile.target_macros,
          weeklyWeightChange,
          profile.goal_type,
          checkIn.energy_level!,
          checkIn.hunger_level!,
          checkIn.training_performance!
        );
        
        macroAdjustment = {
          calories: adjustedMacros.calories,
          protein: adjustedMacros.protein,
          carbs: adjustedMacros.carbs,
          fat: adjustedMacros.fat,
          fiber: adjustedMacros.fiber
        };
        
        // Update profile with new macros
        const updatedProfile = {
          ...profile,
          target_macros: macroAdjustment
        };
        
        await createOrUpdateUserProfile(updatedProfile);
        setProfile(updatedProfile);
      }
      
      // Save check-in
      await createWeeklyCheckIn({
        clerk_user_id: user.id,
        week_start_date: weekStartDate,
        average_weight: avgWeight,
        average_calories: avgMacros.calories,
        average_macros: avgMacros,
        adherence_percentage: adherence,
        energy_level: checkIn.energy_level!,
        hunger_level: checkIn.hunger_level!,
        training_performance: checkIn.training_performance!,
        notes: checkIn.notes,
        macro_adjustment: macroAdjustment || undefined
      });
      
      setShowCheckIn(false);
      setCheckIn({
        energy_level: 3,
        hunger_level: 3,
        training_performance: 3,
        notes: ''
      });
      
      alert('Check-in completed! Your nutrition plan has been updated.');
    } catch (error) {
      console.error('Error saving check-in:', error);
      alert('Failed to save check-in. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Actionbar />
        <div className="pt-24 flex items-center justify-center min-h-screen">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Actionbar />
      
      <div className="w-full pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6">Nutrition Coaching</h1>
          <div className="max-w-2xl mx-auto">
            {/* Current Plan */}
            <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Daily Calories</span>
              <span className="font-semibold">{profile?.target_macros.calories}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Protein</span>
              <span className="font-semibold">{profile?.target_macros.protein}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Carbs</span>
              <span className="font-semibold">{profile?.target_macros.carbs}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Fat</span>
              <span className="font-semibold">{profile?.target_macros.fat}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Fiber</span>
              <span className="font-semibold">{profile?.target_macros.fiber}g min</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-900 rounded-lg">
            <p className="text-sm text-blue-400">
              TDEE Estimate: {profile?.tdee_estimate} calories/day
            </p>
          </div>
        </div>

            {/* Goal Selection */}
            <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Goal</h2>
          <div className="space-y-2">
            {(['maintenance', 'cut', 'gain', 'recomp'] as GoalType[]).map((goal) => (
              <button
                key={goal}
                onClick={() => handleGoalChange(goal)}
                className={`w-full p-3 rounded-lg border-2 transition-colors ${
                  profile?.goal_type === goal
                    ? 'border-blue-600 bg-gray-900'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="font-medium capitalize">{goal}</div>
                <div className="text-sm text-gray-400">
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
            <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Coaching Style</h2>
          <div className="space-y-2">
            {(['coached', 'manual', 'collaborative'] as CoachingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleCoachingModeChange(mode)}
                className={`w-full p-3 rounded-lg border-2 transition-colors ${
                  profile?.coaching_mode === mode
                    ? 'border-blue-600 bg-gray-900'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="font-medium capitalize">{mode}</div>
                <div className="text-sm text-gray-400">
                  {mode === 'coached' && 'Automatic weekly adjustments'}
                  {mode === 'manual' && 'You control all settings'}
                  {mode === 'collaborative' && 'AI suggests, you approve'}
                </div>
              </button>
            ))}
          </div>
            </div>

            {/* Weekly Check-in */}
            <div className="bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Weekly Check-in</h2>
            <span className="text-sm text-gray-400">
              Next: {format(addWeeks(new Date(), 1), 'MMM d')}
            </span>
          </div>
          <p className="text-gray-400 mb-4">
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
        </div>
      </div>

      {/* Check-in Modal */}
      {showCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                          ? 'border-blue-600 bg-gray-900'
                          : 'border-gray-700'
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
                          ? 'border-blue-600 bg-gray-900'
                          : 'border-gray-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
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
                          ? 'border-blue-600 bg-gray-900'
                          : 'border-gray-700'
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
                className="flex-1 bg-gray-700 py-2 rounded-lg hover:bg-gray-600"
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