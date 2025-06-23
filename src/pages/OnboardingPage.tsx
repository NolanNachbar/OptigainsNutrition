import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SelectButtonGroup, RadioButtonGroup } from '../components/ui/SelectButton';
import { createOrUpdateUserProfile } from '../utils/database';
import { UserNutritionProfile, GoalType } from '../utils/types';

interface OnboardingData {
  // Biological Data
  dateOfBirth: string;
  biologicalSex: 'male' | 'female' | 'other';
  heightFeet: string;
  heightInches: string;
  heightCm: string;
  heightUnit: 'imperial' | 'metric';
  weight: string;
  weightUnit: 'kg' | 'lbs';
  bodyFatPercentage: string;
  
  // Activity Level
  activityLevel: 'sedentary' | 'lightly_active' | 'moderate' | 'very_active' | 'extra_active';
  
  // Goal Selection
  goal: GoalType;
  goalRate: number; // percentage of body weight per week
  coachingMode: 'coached' | 'collaborative' | 'manual';
  
  // Macro Preferences
  macroRatios: {
    protein: number;
    carbs: number;
    fat: number;
  };
  
  // Historical Data
  hasHistoricalData: boolean;
  recentCalories: string;
  loggingConsistency: 'never' | 'rarely' | 'sometimes' | 'often' | 'always';
}

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    // Biological Data
    dateOfBirth: '',
    biologicalSex: 'male',
    heightFeet: '',
    heightInches: '',
    heightCm: '',
    heightUnit: 'imperial',
    weight: '',
    weightUnit: 'lbs',
    bodyFatPercentage: '',
    
    // Activity Level
    activityLevel: 'moderate',
    
    // Goal Selection
    goal: 'maintenance',
    goalRate: 0.5, // 0.5% per week default
    coachingMode: 'collaborative',
    
    // Macro Preferences
    macroRatios: {
      protein: 30,
      carbs: 40,
      fat: 30
    },
    
    // Historical Data
    hasHistoricalData: false,
    recentCalories: '',
    loggingConsistency: 'never'
  });

  // ProfileGuard handles the redirect logic, so we don't need to check here

  const calculateAge = (): number => {
    if (!data.dateOfBirth) return 30; // default
    const today = new Date();
    const birthDate = new Date(data.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateTDEE = (): number => {
    const age = calculateAge();
    const weightKg = data.weightUnit === 'kg' 
      ? parseFloat(data.weight) 
      : parseFloat(data.weight) * 0.453592;
    
    let heightCm: number;
    if (data.heightUnit === 'metric') {
      heightCm = parseFloat(data.heightCm);
    } else {
      const feet = parseFloat(data.heightFeet) || 0;
      const inches = parseFloat(data.heightInches) || 0;
      heightCm = (feet * 12 + inches) * 2.54;
    }

    let bmr;
    
    // If body fat percentage is provided, use Katch-McArdle equation for more accuracy
    if (data.bodyFatPercentage && parseFloat(data.bodyFatPercentage) > 0) {
      const bodyFatPercent = parseFloat(data.bodyFatPercentage);
      const leanMass = weightKg * (1 - bodyFatPercent / 100);
      bmr = 370 + (21.6 * leanMass);
    } else {
      // Otherwise use Mifflin-St Jeor Equation
      if (data.biologicalSex === 'male') {
        bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
      } else if (data.biologicalSex === 'female') {
        bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
      } else {
        // For 'other', use average of male and female
        const maleBmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
        const femaleBmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
        bmr = (maleBmr + femaleBmr) / 2;
      }
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderate: 1.55,
      very_active: 1.725,
      extra_active: 1.9
    };

    return Math.round(bmr * activityMultipliers[data.activityLevel]);
  };

  const calculateMacros = (tdee: number) => {
    const weightKg = data.weightUnit === 'kg' 
      ? parseFloat(data.weight) 
      : parseFloat(data.weight) * 0.453592;

    let calories = tdee;
    
    // Adjust calories based on goal and rate
    if (data.goal === 'cut') {
      // For cutting, goalRate is % of body weight to lose per week
      // 1% per week = ~500 cal deficit per day (for 70kg person)
      const weeklyDeficit = weightKg * data.goalRate * 0.01 * 7700; // 7700 cal per kg of fat
      const dailyDeficit = weeklyDeficit / 7;
      calories = Math.round(tdee - dailyDeficit);
    } else if (data.goal === 'gain') {
      // For gaining, goalRate is % of body weight to gain per week
      const weeklyGain = weightKg * data.goalRate * 0.01 * 7700 * 0.5; // assume 50% muscle, 50% fat
      const dailySurplus = weeklyGain / 7;
      calories = Math.round(tdee + dailySurplus);
    } else if (data.goal === 'recomp') {
      calories = Math.round(tdee * 0.95); // slight deficit
    }
    
    // If historical data provided, use it to refine estimate
    if (data.hasHistoricalData && data.recentCalories) {
      const historicalCalories = parseInt(data.recentCalories);
      if (historicalCalories > 0) {
        // Blend historical with calculated (weighted average)
        calories = Math.round(calories * 0.7 + historicalCalories * 0.3);
      }
    }

    // Calculate macros based on ratios or defaults
    let protein, carbs, fat;
    
    if (data.coachingMode === 'manual' && data.macroRatios) {
      // Use user-defined ratios
      protein = Math.round((calories * data.macroRatios.protein / 100) / 4);
      carbs = Math.round((calories * data.macroRatios.carbs / 100) / 4);
      fat = Math.round((calories * data.macroRatios.fat / 100) / 9);
    } else {
      // Use goal-based defaults
      let proteinMultiplier = 2.2; // default g per kg
      
      switch (data.goal) {
        case 'cut':
          proteinMultiplier = 2.6; // Higher protein when cutting
          break;
        case 'gain':
          proteinMultiplier = 2.0; // Moderate protein when gaining
          break;
        case 'recomp':
          proteinMultiplier = 2.4;
          break;
      }
      
      protein = Math.round(weightKg * proteinMultiplier);
      fat = Math.round(weightKg * 0.8); // 0.8g per kg bodyweight
      const proteinCals = protein * 4;
      const fatCals = fat * 9;
      const carbCals = calories - proteinCals - fatCals;
      carbs = Math.round(carbCals / 4);
    }
    
    const fiber = Math.round(calories / 1000 * 14); // 14g per 1000 calories

    return { calories, protein, carbs, fat, fiber };
  };

  const handleNext = () => {
    if (step < 7) { // Updated to 7 steps
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1: // Biological Data
        const hasValidDate = data.dateOfBirth && new Date(data.dateOfBirth) < new Date();
        const hasValidHeight = data.heightUnit === 'metric' 
          ? parseFloat(data.heightCm) > 0 
          : (parseFloat(data.heightFeet) > 0 || parseFloat(data.heightInches) > 0);
        const hasValidWeight = parseFloat(data.weight) > 0;
        return hasValidDate && hasValidHeight && hasValidWeight;
      case 2: // Activity Level
        return true; // Always has a selection
      case 3: // Goal Selection
        return true; // Always has selections
      case 4: // Macro Preferences
        return true; // Always valid
      case 5: // Historical Data
        return true; // Optional step
      case 6: // Food Logging Preferences
        return true; // Always has defaults
      case 7: // Final Review
        return true; // Summary step
      default:
        return false;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const tdee = calculateTDEE();
      const macros = calculateMacros(tdee);
      
      let heightCm: number;
      if (data.heightUnit === 'metric') {
        heightCm = parseFloat(data.heightCm);
      } else {
        const feet = parseFloat(data.heightFeet) || 0;
        const inches = parseFloat(data.heightInches) || 0;
        heightCm = (feet * 12 + inches) * 2.54;
      }
      
      const profile: UserNutritionProfile = {
        clerk_user_id: user.id,
        tdee_estimate: tdee,
        coaching_mode: data.coachingMode,
        goal_type: data.goal,
        target_macros: macros,
        activity_level: data.activityLevel,
        age: calculateAge(),
        biological_sex: data.biologicalSex === 'other' ? 'male' : data.biologicalSex, // Store as male if other for DB compatibility
        height_cm: heightCm,
        weight_kg: data.weightUnit === 'kg' ? parseFloat(data.weight) : parseFloat(data.weight) * 0.453592,
        body_weight_unit: data.weightUnit === 'kg' ? 'metric' : 'imperial',
        food_weight_unit: 'metric'  // Always default food unit to metric
      };
      
      await createOrUpdateUserProfile(profile);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2 className="text-2xl font-bold mb-2">Biological Data</h2>
            <p className="text-gray-400 mb-8">We'll use this information to calculate your nutritional needs accurately</p>
            
            <div className="space-y-6">
              {/* Biological Sex */}
              <div>
                <label className="block text-sm font-medium mb-2">Sex</label>
                <RadioButtonGroup
                  value={data.biologicalSex}
                  onChange={(value) => setData({ ...data, biologicalSex: value as 'male' | 'female' | 'other' })}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={data.dateOfBirth}
                  onChange={(e) => setData({ ...data, dateOfBirth: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>


              {/* Height */}
              <div>
                <label className="block text-sm font-medium mb-2">Height</label>
                <div className="mb-2">
                  <RadioButtonGroup
                    value={data.heightUnit}
                    onChange={(value) => setData({ ...data, heightUnit: value as 'imperial' | 'metric' })}
                    options={[
                      { value: 'imperial', label: 'Feet & Inches' },
                      { value: 'metric', label: 'Centimeters' }
                    ]}
                  />
                </div>
                {data.heightUnit === 'imperial' ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={data.heightFeet}
                        onChange={(e) => setData({ ...data, heightFeet: e.target.value })}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Feet"
                        min="0"
                        max="8"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={data.heightInches}
                        onChange={(e) => setData({ ...data, heightInches: e.target.value })}
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Inches"
                        min="0"
                        max="11"
                        step="0.1"
                      />
                    </div>
                  </div>
                ) : (
                  <input
                    type="number"
                    value={data.heightCm}
                    onChange={(e) => setData({ ...data, heightCm: e.target.value })}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="Height in cm"
                    min="0"
                    max="300"
                  />
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium mb-2">Current Weight</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={data.weight}
                    onChange={(e) => setData({ ...data, weight: e.target.value })}
                    className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder={data.weightUnit === 'kg' ? 'Weight in kg' : 'Weight in lbs'}
                    step="0.1"
                    min="0"
                  />
                  <RadioButtonGroup
                    value={data.weightUnit}
                    onChange={(value) => setData({ ...data, weightUnit: value as 'kg' | 'lbs' })}
                    options={[
                      { value: 'lbs', label: 'lbs' },
                      { value: 'kg', label: 'kg' }
                    ]}
                  />
                </div>
              </div>

              {/* Body Fat Percentage */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Body Fat % <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  value={data.bodyFatPercentage}
                  onChange={(e) => setData({ ...data, bodyFatPercentage: e.target.value })}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="e.g., 15"
                  min="3"
                  max="60"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Improves TDEE accuracy. Leave blank if unknown.
                </p>
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2 className="text-2xl font-bold mb-2">Activity Level</h2>
            <p className="text-gray-400 mb-8">Select based on your job and lifestyle, NOT your exercise routine</p>
            
            <SelectButtonGroup
              value={data.activityLevel}
              onChange={(value) => setData({ ...data, activityLevel: value as any })}
              variant="detailed"
              options={[
                {
                  value: 'sedentary',
                  label: 'Sedentary',
                  description: 'Desk job with minimal movement. Less than 5,000 steps/day.',
                  icon: (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                {
                  value: 'lightly_active',
                  label: 'Lightly Active',
                  description: 'Desk job but some daily movement. 5,000-8,000 steps/day.',
                  icon: (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )
                },
                {
                  value: 'moderate',
                  label: 'Moderately Active',
                  description: 'On your feet part of the day. 8,000-10,000 steps/day. Teacher, retail.',
                  icon: (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                {
                  value: 'very_active',
                  label: 'Very Active',
                  description: 'Active job with lots of movement. 10,000-15,000 steps/day. Nurse, server.',
                  icon: (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )
                },
                {
                  value: 'extra_active',
                  label: 'Extremely Active',
                  description: 'Manual labor or very physical job. 15,000+ steps/day. Construction, farming.',
                  icon: (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    </svg>
                  )
                }
              ]}
            />
            
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400">
                <strong>Note:</strong> Your exercise routine will be factored in separately. This is only about your daily lifestyle activity.
              </p>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h2 className="text-2xl font-bold mb-2">Goal Selection</h2>
            <p className="text-gray-400 mb-6">Choose your nutrition goal</p>
            
            <div className="space-y-4">
              <SelectButtonGroup
                value={data.goal}
                onChange={(value) => setData({ ...data, goal: value as GoalType })}
                variant="detailed"
                options={[
                  {
                    value: 'cut',
                    label: 'Lose Weight',
                    description: 'Create a sustainable caloric deficit to lose body fat while preserving muscle mass',
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    )
                  },
                  {
                    value: 'gain',
                    label: 'Build Muscle',
                    description: 'Create a caloric surplus to build muscle and increase strength',
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    )
                  },
                  {
                    value: 'maintenance',
                    label: 'Maintain Weight',
                    description: 'Keep your current weight stable while improving body composition',
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )
                  },
                  {
                    value: 'recomp',
                    label: 'Body Recomposition',
                    description: 'Gain muscle while losing fat simultaneously',
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )
                  }
              ]}
            />

              {/* Goal Rate */}
              {(data.goal === 'cut' || data.goal === 'gain') && (
                <div className="mt-6">
                  <label className="block text-sm font-medium mb-2">
                    Rate of {data.goal === 'cut' ? 'Weight Loss' : 'Weight Gain'} (% body weight per week)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={data.goal === 'cut' ? 0.25 : 0.1}
                      max={data.goal === 'cut' ? 1.0 : 0.5}
                      step="0.05"
                      value={data.goalRate}
                      onChange={(e) => setData({ ...data, goalRate: parseFloat(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="w-16 text-right font-medium">{data.goalRate}%</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {data.goal === 'cut' 
                      ? `${(parseFloat(data.weight) * data.goalRate * 0.01 * (data.weightUnit === 'lbs' ? 1 : 2.205)).toFixed(1)} ${data.weightUnit}/week`
                      : `${(parseFloat(data.weight) * data.goalRate * 0.01 * (data.weightUnit === 'lbs' ? 1 : 2.205)).toFixed(1)} ${data.weightUnit}/week`
                    }
                  </div>
                </div>
              )}

              {/* Coaching Mode */}
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">How should the app adjust your goals?</label>
                <SelectButtonGroup
                  value={data.coachingMode}
                  onChange={(value) => setData({ ...data, coachingMode: value as any })}
                  variant="compact"
                  options={[
                    {
                      value: 'coached',
                      label: 'Coached',
                      description: 'App automatically adjusts based on progress'
                    },
                    {
                      value: 'collaborative',
                      label: 'Collaborative',
                      description: 'App suggests changes, you approve them'
                    },
                    {
                      value: 'manual',
                      label: 'Manual',
                      description: 'You control all changes'
                    }
                  ]}
                />
              </div>
            </div>
          </>
        );

      case 4: // Macro Preferences
        return (
          <>
            <h2 className="text-2xl font-bold mb-2">Macro Preferences</h2>
            <p className="text-gray-400 mb-6">Customize your macronutrient ratios (optional)</p>
            
            {data.coachingMode === 'manual' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Protein %</label>
                  <input
                    type="range"
                    min="15"
                    max="40"
                    value={data.macroRatios.protein}
                    onChange={(e) => setData({ 
                      ...data, 
                      macroRatios: { ...data.macroRatios, protein: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-400">{data.macroRatios.protein}%</span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Carbs %</label>
                  <input
                    type="range"
                    min="20"
                    max="60"
                    value={data.macroRatios.carbs}
                    onChange={(e) => setData({ 
                      ...data, 
                      macroRatios: { ...data.macroRatios, carbs: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-400">{data.macroRatios.carbs}%</span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Fat %</label>
                  <input
                    type="range"
                    min="15"
                    max="40"
                    value={data.macroRatios.fat}
                    onChange={(e) => setData({ 
                      ...data, 
                      macroRatios: { ...data.macroRatios, fat: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-400">{data.macroRatios.fat}%</span>
                </div>
                
                <p className="text-xs text-gray-500">
                  Total: {data.macroRatios.protein + data.macroRatios.carbs + data.macroRatios.fat}% 
                  (should equal 100%)
                </p>
              </div>
            ) : (
              <Card variant="glass">
                <p className="text-center text-gray-400">
                  The app will automatically optimize your macros based on your goals.
                </p>
              </Card>
            )}
          </>
        );

      case 5: // Historical Data
        return (
          <>
            <h2 className="text-2xl font-bold mb-2">Historical Data</h2>
            <p className="text-gray-400 mb-6">Help us improve accuracy with your past data (optional)</p>
            
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hasHistorical"
                  checked={data.hasHistoricalData}
                  onChange={(e) => setData({ ...data, hasHistoricalData: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="hasHistorical" className="text-sm">
                  I've been tracking calories recently
                </label>
              </div>
              
              {data.hasHistoricalData && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Average daily calories (last 2 weeks)
                    </label>
                    <input
                      type="number"
                      value={data.recentCalories}
                      onChange={(e) => setData({ ...data, recentCalories: e.target.value })}
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg"
                      placeholder="e.g., 2500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      How consistently do you track?
                    </label>
                    <SelectButtonGroup
                      value={data.loggingConsistency}
                      onChange={(value) => setData({ ...data, loggingConsistency: value as any })}
                      variant="compact"
                      options={[
                        { value: 'rarely', label: 'Rarely' },
                        { value: 'sometimes', label: 'Sometimes' },
                        { value: 'often', label: 'Often' },
                        { value: 'always', label: 'Always' }
                      ]}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        );

      case 6: // Food Logging Preferences
        return (
          <>
            <h2 className="text-2xl font-bold mb-2">Food Logging Preferences</h2>
            <p className="text-gray-400 mb-6">These can be changed later in settings</p>
            
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-300">
                <strong>Body Weight Units:</strong> {data.weightUnit === 'lbs' ? 'Imperial (lbs)' : 'Metric (kg)'}
              </p>
              <p className="text-sm text-gray-300 mt-2">
                <strong>Food Weight Units:</strong> Metric (grams)
              </p>
              <p className="text-xs text-gray-500 mt-3">
                You can change these preferences anytime in Settings → Units & Display
              </p>
            </div>
          </>
        );

      case 7: // Final Review
        const finalTdee = calculateTDEE();
        const finalMacros = calculateMacros(finalTdee);
        
        return (
          <>
            <h2 className="text-2xl font-bold mb-2">Your Starting Plan</h2>
            <p className="text-gray-400 mb-6">Review your personalized nutrition targets</p>
            
            <Card variant="glass" className="mb-6">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-blue-500 mb-2">{finalMacros.calories}</div>
                <div className="text-sm text-gray-400">Daily Calories</div>
              </div>
                
              
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="font-bold text-blue-500">{finalMacros.protein}g</div>
                  <div className="text-xs text-gray-400">Protein</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-500">{finalMacros.carbs}g</div>
                  <div className="text-xs text-gray-400">Carbs</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-orange-500">{finalMacros.fat}g</div>
                  <div className="text-xs text-gray-400">Fat</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-500">{finalMacros.fiber}g</div>
                  <div className="text-xs text-gray-400">Fiber</div>
                </div>
              </div>
            </Card>
            
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h3 className="font-semibold mb-2">What happens next?</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Track your food daily</li>
                <li>• Weigh yourself regularly</li>
                <li>• The app will adjust your targets based on progress</li>
                <li>• Check in weekly for updated recommendations</li>
              </ul>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">Step {step} of 7</span>
            <span className="text-sm text-gray-400">
              {step === 1 && 'Biological Data'}
              {step === 2 && 'Activity Level'}
              {step === 3 && 'Goal Selection'}
              {step === 4 && 'Macro Preferences'}
              {step === 5 && 'Historical Data'}
              {step === 6 && 'Preferences'}
              {step === 7 && 'Final Review'}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <Card variant="elevated" className="p-8">
          {renderStepContent()}
          
          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button
                onClick={handleBack}
                variant="secondary"
                size="lg"
                className="flex-1"
              >
                Back
              </Button>
            )}
            
            {step < 7 ? (
              <Button
                onClick={handleNext}
                variant="primary"
                size="lg"
                className="flex-1"
                disabled={!isStepValid()}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                variant="primary"
                size="lg"
                className="flex-1"
                loading={loading}
              >
                Get Started
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingPage;