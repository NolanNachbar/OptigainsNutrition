// Goal Mode Presets with Intelligent Target Calculation
import { UserNutritionProfile, Macros } from './types';

export type GoalType = 'maintenance' | 'cut' | 'gain' | 'recomp';
export type CutRate = 'conservative' | 'moderate' | 'aggressive';
export type GainRate = 'slow' | 'moderate';

export interface GoalPreset {
  type: GoalType;
  name: string;
  description: string;
  weeklyWeightTarget: number; // lbs per week
  calorieAdjustment: number; // percentage from TDEE
  proteinMultiplier: number; // g per kg bodyweight
  fatPercentage: number; // percentage of total calories
  benefits: string[];
  drawbacks: string[];
}

export const GOAL_PRESETS: Record<string, GoalPreset> = {
  maintenance: {
    type: 'maintenance',
    name: 'Maintenance',
    description: 'Maintain current weight while building habits',
    weeklyWeightTarget: 0,
    calorieAdjustment: 0,
    proteinMultiplier: 2.2,
    fatPercentage: 25,
    benefits: [
      'Sustainable long-term',
      'Maintain energy levels',
      'Build healthy habits',
      'No metabolic stress'
    ],
    drawbacks: [
      'No weight change',
      'Slower body composition changes'
    ]
  },
  
  cut_conservative: {
    type: 'cut',
    name: 'Conservative Cut',
    description: 'Gentle fat loss preserving muscle and energy',
    weeklyWeightTarget: -0.5,
    calorieAdjustment: -10,
    proteinMultiplier: 2.4,
    fatPercentage: 25,
    benefits: [
      'Minimal muscle loss',
      'Maintained performance',
      'Better adherence',
      'Less metabolic adaptation'
    ],
    drawbacks: [
      'Slower results',
      'Requires patience'
    ]
  },
  
  cut_moderate: {
    type: 'cut',
    name: 'Moderate Cut',
    description: 'Balanced approach to fat loss',
    weeklyWeightTarget: -1,
    calorieAdjustment: -20,
    proteinMultiplier: 2.6,
    fatPercentage: 20,
    benefits: [
      'Steady progress',
      'Good muscle retention',
      'Reasonable timeline'
    ],
    drawbacks: [
      'Some hunger expected',
      'Minor performance impact'
    ]
  },
  
  cut_aggressive: {
    type: 'cut',
    name: 'Aggressive Cut',
    description: 'Rapid fat loss for short-term goals',
    weeklyWeightTarget: -2,
    calorieAdjustment: -30,
    proteinMultiplier: 3.0,
    fatPercentage: 20,
    benefits: [
      'Fast results',
      'Short timeline'
    ],
    drawbacks: [
      'High hunger',
      'Muscle loss risk',
      'Performance decline',
      'Metabolic slowdown'
    ]
  },
  
  gain_slow: {
    type: 'gain',
    name: 'Lean Gaining',
    description: 'Slow muscle gain with minimal fat',
    weeklyWeightTarget: 0.25,
    calorieAdjustment: 5,
    proteinMultiplier: 2.2,
    fatPercentage: 25,
    benefits: [
      'Minimal fat gain',
      'Steady muscle growth',
      'Better body composition'
    ],
    drawbacks: [
      'Very slow progress',
      'Requires precision'
    ]
  },
  
  gain_moderate: {
    type: 'gain',
    name: 'Standard Bulking',
    description: 'Balanced muscle and strength gains',
    weeklyWeightTarget: 0.5,
    calorieAdjustment: 10,
    proteinMultiplier: 2.2,
    fatPercentage: 30,
    benefits: [
      'Good muscle growth',
      'Strength increases',
      'Higher energy'
    ],
    drawbacks: [
      'Some fat gain',
      'Need to cut later'
    ]
  },
  
  recomp: {
    type: 'recomp',
    name: 'Body Recomposition',
    description: 'Gain muscle while losing fat simultaneously',
    weeklyWeightTarget: 0,
    calorieAdjustment: 0,
    proteinMultiplier: 2.8,
    fatPercentage: 25,
    benefits: [
      'Muscle gain + fat loss',
      'Improved body composition',
      'No weight cycling'
    ],
    drawbacks: [
      'Very slow progress',
      'Requires consistency',
      'Hard to track progress'
    ]
  }
};

// Calculate target macros based on goal preset
export const calculateTargetMacros = (
  profile: UserNutritionProfile,
  preset: GoalPreset,
  currentWeight?: number
): Macros => {
  const tdee = profile.tdee_estimate;
  const targetCalories = Math.round(tdee * (1 + preset.calorieAdjustment / 100));
  
  // Use current weight if available, otherwise estimate from TDEE
  const weight = currentWeight || estimateWeightFromTDEE(profile);
  
  // Calculate protein target
  const proteinGrams = Math.round(weight * preset.proteinMultiplier);
  const proteinCalories = proteinGrams * 4;
  
  // Calculate fat target
  const fatCalories = Math.round(targetCalories * (preset.fatPercentage / 100));
  const fatGrams = Math.round(fatCalories / 9);
  
  // Remaining calories go to carbs
  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  const carbGrams = Math.round(remainingCalories / 4);
  
  // Calculate fiber target (14g per 1000 calories)
  const fiberGrams = Math.round((targetCalories / 1000) * 14);
  
  return {
    calories: targetCalories,
    protein: proteinGrams,
    carbs: Math.max(carbGrams, 50), // minimum 50g carbs
    fat: fatGrams,
    fiber: fiberGrams
  };
};

// Estimate weight from TDEE and profile data
const estimateWeightFromTDEE = (profile: UserNutritionProfile): number => {
  // Since we don't have height, age, or sex in the profile, use a simple estimation
  // based on TDEE and activity level
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  
  const multiplier = activityMultipliers[profile.activity_level];
  const estimatedBMR = profile.tdee_estimate / multiplier;
  
  // Rough estimate: average BMR of 1500 corresponds to ~70kg
  // This gives us a simple linear relationship
  const estimatedWeight = (estimatedBMR / 1500) * 70;
  
  return Math.max(Math.min(estimatedWeight, 150), 40); // between 40-150kg
};

// Get recommended goal based on user profile
export const getRecommendedGoal = (profile: UserNutritionProfile): string => {
  // Simplified recommendation based on current goal and activity level
  // Since we don't have BMI data, we'll use activity level and current goal
  
  // If user already has a goal set, suggest variations of it
  if (profile.goal_type === 'cut') {
    return 'cut_moderate';
  } else if (profile.goal_type === 'gain') {
    return 'gain_moderate';
  } else if (profile.goal_type === 'recomp') {
    return 'recomp';
  } else {
    return 'maintenance';
  }
};

// Apply goal preset to user profile
export const applyGoalPreset = (
  profile: UserNutritionProfile,
  presetKey: string,
  currentWeight?: number
): UserNutritionProfile => {
  const preset = GOAL_PRESETS[presetKey];
  if (!preset) {
    throw new Error(`Unknown goal preset: ${presetKey}`);
  }
  
  const targetMacros = calculateTargetMacros(profile, preset, currentWeight);
  
  return {
    ...profile,
    goal_type: preset.type,
    target_macros: targetMacros
  };
};

// Validate if current targets match a preset
export const detectCurrentPreset = (profile: UserNutritionProfile): string | null => {
  const currentCalories = profile.target_macros.calories;
  const tdee = profile.tdee_estimate;
  const calorieAdjustment = ((currentCalories - tdee) / tdee) * 100;
  
  // Find the preset that best matches current settings
  for (const [key, preset] of Object.entries(GOAL_PRESETS)) {
    const adjustmentDiff = Math.abs(calorieAdjustment - preset.calorieAdjustment);
    if (adjustmentDiff < 3) { // within 3% tolerance
      return key;
    }
  }
  
  return null; // custom settings
};

// Get preset categories for UI grouping
export const getPresetsByCategory = () => {
  return {
    'Weight Loss': [
      GOAL_PRESETS.cut_conservative,
      GOAL_PRESETS.cut_moderate,
      GOAL_PRESETS.cut_aggressive
    ],
    'Weight Gain': [
      GOAL_PRESETS.gain_slow,
      GOAL_PRESETS.gain_moderate
    ],
    'Maintain/Recomp': [
      GOAL_PRESETS.maintenance,
      GOAL_PRESETS.recomp
    ]
  };
};