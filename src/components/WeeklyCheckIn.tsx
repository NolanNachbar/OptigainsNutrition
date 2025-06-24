import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { 
  getUserProfile, 
  getWeightEntries, 
  getNutritionLogs, 
  createWeeklyCheckIn,
  getLatestWeeklyCheckIn,
  createOrUpdateUserProfile
} from '../utils/database';
import { calculateAdaptiveTDEE, getTDEERecommendations } from '../utils/adaptiveTDEE';
import { WeeklyCheckIn as WeeklyCheckInType, UserNutritionProfile } from '../utils/types';
import { startOfWeek } from 'date-fns';

interface CheckInStep {
  id: string;
  title: string;
  component: React.ReactNode;
}

export const WeeklyCheckIn: React.FC = () => {
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserNutritionProfile | null>(null);
  const [weekData, setWeekData] = useState<any>({});
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  // Form data
  const [energyLevel, setEnergyLevel] = useState(3);
  const [hungerLevel, setHungerLevel] = useState(3);
  const [trainingPerformance, setTrainingPerformance] = useState(3);
  const [notes, setNotes] = useState('');
  const [acceptRecommendations, setAcceptRecommendations] = useState(true);

  useEffect(() => {
    loadCheckInData();
  }, [user]);

  const loadCheckInData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get user profile
      const userProfile = await getUserProfile(user.id);
      if (!userProfile) return;
      setProfile(userProfile);
      
      // Get last check-in if needed later
      await getLatestWeeklyCheckIn(user.id);
      
      // Get weight data for past 2 weeks
      const weights = await getWeightEntries(user.id, 14);
      
      // Get nutrition logs for past week
      const logs = await getNutritionLogs(user.id, 7);
      
      // Calculate adaptive TDEE
      const tdeeData = calculateAdaptiveTDEE(
        weights,
        logs,
        userProfile.tdee_estimate
      );
      
      // Get recommendations
      const recs = getTDEERecommendations(
        tdeeData,
        userProfile.goal_type,
        0.5 // Default 0.5% per week
      );
      
      setRecommendations(recs);
      
      // Calculate week statistics
      const validLogs = logs.filter(log => log.calories > 0);
      const avgCalories = validLogs.length > 0
        ? Math.round(validLogs.reduce((sum, log) => sum + log.calories, 0) / validLogs.length)
        : 0;
        
      const avgMacros = validLogs.length > 0
        ? {
            protein: Math.round(validLogs.reduce((sum, log) => sum + log.protein, 0) / validLogs.length),
            carbs: Math.round(validLogs.reduce((sum, log) => sum + log.carbs, 0) / validLogs.length),
            fat: Math.round(validLogs.reduce((sum, log) => sum + log.fat, 0) / validLogs.length),
            fiber: Math.round(validLogs.reduce((sum, log) => sum + (log.fiber || 0), 0) / validLogs.length)
          }
        : { protein: 0, carbs: 0, fat: 0, fiber: 0 };
      
      const adherencePercentage = validLogs.length > 0
        ? Math.round(
            validLogs.reduce((sum, log) => {
              const targetCals = userProfile.target_macros.calories;
              const diff = Math.abs(log.calories - targetCals);
              const adherence = Math.max(0, 100 - (diff / targetCals) * 100);
              return sum + adherence;
            }, 0) / validLogs.length
          )
        : 0;
      
      setWeekData({
        tdeeData,
        avgCalories,
        avgMacros,
        adherencePercentage,
        loggingDays: validLogs.length,
        weightEntries: weights.length
      });
      
    } catch (error) {
      console.error('Error loading check-in data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCheckIn = async () => {
    if (!user || !profile) return;
    
    try {
      setLoading(true);
      
      // Create check-in record
      const checkIn: Omit<WeeklyCheckInType, 'id' | 'created_at'> = {
        clerk_user_id: user.id,
        week_start_date: startOfWeek(new Date()).toISOString(),
        average_weight: weekData.tdeeData.trendWeight,
        average_calories: weekData.avgCalories,
        average_macros: weekData.avgMacros,
        adherence_percentage: weekData.adherencePercentage,
        energy_level: energyLevel as 1 | 2 | 3 | 4 | 5,
        hunger_level: hungerLevel as 1 | 2 | 3 | 4 | 5,
        training_performance: trainingPerformance as 1 | 2 | 3 | 4 | 5,
        notes
      };
      
      // Apply recommendations if accepted
      if (acceptRecommendations && recommendations.length > 0) {
        const totalAdjustment = recommendations.reduce((sum, rec) => sum + rec.adjustment, 0);
        
        if (totalAdjustment !== 0) {
          const newCalories = profile.target_macros.calories + totalAdjustment;
          
          // Recalculate macros maintaining ratios
          const proteinRatio = profile.target_macros.protein * 4 / profile.target_macros.calories;
          const carbRatio = profile.target_macros.carbs * 4 / profile.target_macros.calories;
          const fatRatio = profile.target_macros.fat * 9 / profile.target_macros.calories;
          
          const newMacros = {
            calories: newCalories,
            protein: Math.round((newCalories * proteinRatio) / 4),
            carbs: Math.round((newCalories * carbRatio) / 4),
            fat: Math.round((newCalories * fatRatio) / 9),
            fiber: Math.round(newCalories / 1000 * 14)
          };
          
          checkIn.macro_adjustment = newMacros;
          
          // Update profile
          await createOrUpdateUserProfile({
            ...profile,
            target_macros: newMacros,
            tdee_estimate: weekData.tdeeData.currentTDEE
          });
        }
      }
      
      await createWeeklyCheckIn(checkIn);
      
      // Reset form
      setCurrentStep(0);
      setEnergyLevel(3);
      setHungerLevel(3);
      setTrainingPerformance(3);
      setNotes('');
      setAcceptRecommendations(true);
      
      // Reload data
      await loadCheckInData();
      
    } catch (error) {
      console.error('Error submitting check-in:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card variant="glass">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-700 border-t-blue-500 mx-auto"></div>
        </div>
      </Card>
    );
  }

  const steps: CheckInStep[] = [
    {
      id: 'overview',
      title: 'Week Overview',
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{weekData.loggingDays}/7</div>
              <div className="text-sm text-gray-400">Days Logged</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{weekData.adherencePercentage}%</div>
              <div className="text-sm text-gray-400">Adherence</div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Average Intake</span>
              <span className="font-semibold">{weekData.avgCalories} cal</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Trend Weight</span>
              <span className="font-semibold">{weekData.tdeeData?.trendWeight} kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Weekly Change</span>
              <span className={`font-semibold ${
                weekData.tdeeData?.weeklyChange > 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {weekData.tdeeData?.weeklyChange > 0 ? '+' : ''}{weekData.tdeeData?.weeklyChange} kg
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'subjective',
      title: 'How was your week?',
      component: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3">Energy Levels</label>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-gray-400">Low</span>
              <input
                type="range"
                min="1"
                max="5"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-400">High</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-3">Hunger Levels</label>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-gray-400">Low</span>
              <input
                type="range"
                min="1"
                max="5"
                value={hungerLevel}
                onChange={(e) => setHungerLevel(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-400">High</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-3">Training Performance</label>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-gray-400">Poor</span>
              <input
                type="range"
                min="1"
                max="5"
                value={trainingPerformance}
                onChange={(e) => setTrainingPerformance(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-400">Great</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg"
              rows={3}
              placeholder="Any additional notes about your week..."
            />
          </div>
        </div>
      )
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      component: (
        <div className="space-y-4">
          {recommendations.length > 0 ? (
            <>
              {recommendations.map((rec, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  rec.severity === 'warning' 
                    ? 'bg-orange-500/10 border-orange-500/30' 
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}>
                  <p className={`text-sm ${
                    rec.severity === 'warning' ? 'text-orange-400' : 'text-blue-400'
                  }`}>
                    {rec.message}
                  </p>
                  {rec.adjustment !== 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Suggested adjustment: {rec.adjustment > 0 ? '+' : ''}{rec.adjustment} calories
                    </p>
                  )}
                </div>
              ))}
              
              <div className="flex items-center gap-3 mt-6">
                <input
                  type="checkbox"
                  id="accept-recommendations"
                  checked={acceptRecommendations}
                  onChange={(e) => setAcceptRecommendations(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="accept-recommendations" className="text-sm">
                  Apply recommended adjustments to my targets
                </label>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-green-500 text-4xl mb-3">✓</div>
              <p className="text-gray-300">You're on track! Keep up the good work.</p>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <Card variant="elevated">
      <h2 className="text-xl font-semibold mb-6">Weekly Check-In</h2>
      
      {/* Progress indicator */}
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex-1 ${index < steps.length - 1 ? 'mr-2' : ''}`}
          >
            <div className={`h-1 rounded-full ${
              index <= currentStep ? 'bg-blue-500' : 'bg-gray-700'
            }`} />
          </div>
        ))}
      </div>
      
      {/* Current step content */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">{steps[currentStep].title}</h3>
        {steps[currentStep].component}
      </div>
      
      {/* Navigation */}
      <div className="flex gap-3">
        {currentStep > 0 && (
          <Button
            onClick={() => setCurrentStep(currentStep - 1)}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            Back
          </Button>
        )}
        
        {currentStep < steps.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            variant="primary"
            size="lg"
            className="flex-1"
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={handleSubmitCheckIn}
            variant="primary"
            size="lg"
            className="flex-1"
            loading={loading}
          >
            Complete Check-In
          </Button>
        )}
      </div>
    </Card>
  );
};