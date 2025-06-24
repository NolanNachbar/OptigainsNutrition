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
import { getWeightRange, calculateWeeklyAverages } from '../utils/database';
import { calculateMacroTargets, adjustMacrosFromCheckIn } from '../utils/tdeeCalculator';
import { Card, MetricCard, CardGroup } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SelectButtonGroup, RadioButtonGroup } from '../components/ui/SelectButton';

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
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

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
    if (!profile || !user || saving) return;
    
    setSaving(true);
    setSavedMessage(null);
    
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
      setSavedMessage('Goal updated successfully!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCoachingModeChange = async (newMode: CoachingMode) => {
    if (!profile || saving) return;
    
    setSaving(true);
    setSavedMessage(null);
    
    try {
      const updatedProfile = {
        ...profile,
        coaching_mode: newMode
      };
      
      await createOrUpdateUserProfile(updatedProfile);
      setProfile(updatedProfile);
      setSavedMessage('Coaching style updated successfully!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (error) {
      console.error('Error updating coaching mode:', error);
      alert('Failed to update coaching mode. Please try again.');
    } finally {
      setSaving(false);
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
          
          {/* Success message */}
          {savedMessage && (
            <div className="max-w-2xl mx-auto mb-4">
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {savedMessage}
              </div>
            </div>
          )}
          
          <div className="max-w-2xl mx-auto">
            {/* Current Plan */}
            <Card variant="glass" className="mb-6">
              <h2 className="text-xl font-semibold mb-6">Current Plan</h2>
              <CardGroup columns={2} gap="sm">
                <MetricCard
                  title="Daily Calories"
                  value={profile?.target_macros.calories || 0}
                  icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    </svg>
                  }
                />
                <MetricCard
                  title="Protein"
                  value={`${profile?.target_macros.protein || 0}g`}
                  icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  }
                />
                <MetricCard
                  title="Carbs"
                  value={`${profile?.target_macros.carbs || 0}g`}
                  icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                />
                <MetricCard
                  title="Fat"
                  value={`${profile?.target_macros.fat || 0}g`}
                  icon={
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  }
                />
              </CardGroup>
          
              <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                <p className="text-sm text-blue-400">
                  TDEE Estimate: {profile?.tdee_estimate} calories/day
                </p>
              </div>
            </Card>

            {/* Goal Selection */}
            <Card variant="elevated" className="mb-6">
              <h2 className="text-xl font-semibold mb-6">Goal</h2>
              <div style={{ opacity: saving ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                <SelectButtonGroup
                  value={profile?.goal_type || 'maintenance'}
                  onChange={(value) => handleGoalChange(value as GoalType)}
                  options={[
                  {
                    value: 'maintenance',
                    label: 'Maintenance',
                    description: 'Maintain current weight',
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                  {
                    value: 'cut',
                    label: 'Cut',
                    description: 'Lose weight (20% deficit)',
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    ),
                  },
                  {
                    value: 'gain',
                    label: 'Gain',
                    description: 'Build muscle (15% surplus)',
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ),
                  },
                  {
                    value: 'recomp',
                    label: 'Recomp',
                    description: 'Lose fat, maintain muscle (5% deficit)',
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    ),
                  },
                ]}
                />
              </div>
            </Card>

            {/* Coaching Mode */}
            <Card variant="elevated" className="mb-6">
              <h2 className="text-xl font-semibold mb-6">Coaching Style</h2>
              <div style={{ opacity: saving ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                <SelectButtonGroup
                  value={profile?.coaching_mode || 'collaborative'}
                  onChange={(value) => handleCoachingModeChange(value as CoachingMode)}
                  options={[
                  {
                    value: 'coached',
                    label: 'Coached',
                    description: 'Automatic weekly adjustments',
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    ),
                  },
                  {
                    value: 'manual',
                    label: 'Manual',
                    description: 'You control all settings',
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    ),
                  },
                  {
                    value: 'collaborative',
                    label: 'Collaborative',
                    description: 'AI suggests, you approve',
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    ),
                  },
                ]}
                />
              </div>
            </Card>

            {/* Weekly Check-in */}
            <Card variant="glass">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Weekly Check-in</h2>
                <span className="text-sm text-gray-400">
                  Next: {format(addWeeks(new Date(), 1), 'MMM d')}
                </span>
              </div>
              <p className="text-gray-400 mb-4">
                Complete your weekly check-in to get updated macro targets based on your progress.
              </p>
              <Button
                onClick={() => setShowCheckIn(true)}
                variant="primary"
                size="lg"
                fullWidth
              >
                Start Check-in
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Check-in Modal */}
      {showCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card variant="elevated" className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-6">Weekly Check-in</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Energy Level (1-5)
                </label>
                <RadioButtonGroup
                  value={checkIn.energy_level || 3}
                  onChange={(value) => setCheckIn({ ...checkIn, energy_level: value as 1 | 2 | 3 | 4 | 5 })}
                  options={[
                    { value: 1, label: '1' },
                    { value: 2, label: '2' },
                    { value: 3, label: '3' },
                    { value: 4, label: '4' },
                    { value: 5, label: '5' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Hunger Level (1-5)
                </label>
                <RadioButtonGroup
                  value={checkIn.hunger_level || 3}
                  onChange={(value) => setCheckIn({ ...checkIn, hunger_level: value as 1 | 2 | 3 | 4 | 5 })}
                  options={[
                    { value: 1, label: '1' },
                    { value: 2, label: '2' },
                    { value: 3, label: '3' },
                    { value: 4, label: '4' },
                    { value: 5, label: '5' },
                  ]}
                />
                <p className="text-xs text-gray-400 mt-1">
                  1 = Never hungry, 5 = Always hungry
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Training Performance (1-5)
                </label>
                <RadioButtonGroup
                  value={checkIn.training_performance || 3}
                  onChange={(value) => setCheckIn({ ...checkIn, training_performance: value as 1 | 2 | 3 | 4 | 5 })}
                  options={[
                    { value: 1, label: '1' },
                    { value: 2, label: '2' },
                    { value: 3, label: '3' },
                    { value: 4, label: '4' },
                    { value: 5, label: '5' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes
                </label>
                <textarea
                  value={checkIn.notes}
                  onChange={(e) => setCheckIn({ ...checkIn, notes: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg resize-none focus:border-blue-500 focus:outline-none transition-colors"
                  rows={3}
                  placeholder="Any additional notes about your week..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleWeeklyCheckIn}
                variant="primary"
                size="lg"
                fullWidth
              >
                Submit Check-in
              </Button>
              <Button
                onClick={() => setShowCheckIn(false)}
                variant="secondary"
                size="lg"
                fullWidth
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CoachingPage;