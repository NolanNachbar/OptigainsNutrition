// Energy expenditure component modeling
// Breaks down TDEE into BMR, TEF, EAT, and NEAT components

export interface BiologicalData {
  age: number;
  sex: 'male' | 'female';
  weightKg: number;
  heightCm: number;
  bodyFatPercentage?: number;
}

export interface ActivityData {
  activityLevel: 'sedentary' | 'lightly_active' | 'moderate' | 'very_active' | 'extra_active';
  exerciseMinutesPerWeek?: number;
  stepsPerDay?: number;
}

export interface EnergyComponents {
  bmr: number;           // Basal Metabolic Rate
  tef: number;           // Thermic Effect of Food (~10% of intake)
  eat: number;           // Exercise Activity Thermogenesis
  neat: number;          // Non-Exercise Activity Thermogenesis
  total: number;         // Total Daily Energy Expenditure
  confidence: number;    // 0-1 confidence score
}

export interface ComponentBreakdown {
  label: string;
  value: number;
  percentage: number;
  description: string;
  color: string;
}

/**
 * Calculate BMR using Mifflin-St Jeor or Katch-McArdle equations
 */
export function calculateBMR(data: BiologicalData): number {
  const { age, sex, weightKg, heightCm, bodyFatPercentage } = data;

  // If body fat percentage is provided, use Katch-McArdle (more accurate)
  if (bodyFatPercentage && bodyFatPercentage > 0 && bodyFatPercentage < 50) {
    const leanMassKg = weightKg * (1 - bodyFatPercentage / 100);
    return Math.round(370 + (21.6 * leanMassKg));
  }

  // Otherwise use Mifflin-St Jeor
  if (sex === 'male') {
    return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5);
  } else {
    return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161);
  }
}

/**
 * Calculate TEF (Thermic Effect of Food)
 * Typically 8-15% of total intake, we'll use 10% as default
 */
export function calculateTEF(dailyIntake: number, macros?: { protein: number; carbs: number; fat: number }): number {
  if (macros) {
    // More accurate TEF based on macronutrient composition
    // Protein: 20-30%, Carbs: 5-10%, Fat: 0-3%
    const proteinTEF = macros.protein * 4 * 0.25; // 25% TEF for protein
    const carbsTEF = macros.carbs * 4 * 0.075;    // 7.5% TEF for carbs
    const fatTEF = macros.fat * 9 * 0.02;         // 2% TEF for fat
    
    return Math.round(proteinTEF + carbsTEF + fatTEF);
  }
  
  // Simple approximation: 10% of intake
  return Math.round(dailyIntake * 0.10);
}

/**
 * Estimate EAT (Exercise Activity Thermogenesis)
 * Based on exercise minutes and intensity
 */
export function calculateEAT(
  weightKg: number,
  exerciseMinutesPerWeek: number = 0,
  intensity: 'low' | 'moderate' | 'high' = 'moderate'
): number {
  // METs (Metabolic Equivalent of Task) for different intensities
  const mets = {
    low: 3.5,      // Walking, light yoga
    moderate: 6,   // Jogging, cycling
    high: 9        // Running, HIIT
  };

  const metValue = mets[intensity];
  const minutesPerDay = exerciseMinutesPerWeek / 7;
  
  // Calories = METs × weight(kg) × time(hours)
  const dailyEAT = metValue * weightKg * (minutesPerDay / 60);
  
  return Math.round(dailyEAT);
}

/**
 * Calculate NEAT (Non-Exercise Activity Thermogenesis)
 * This is the most variable component
 */
export function calculateNEAT(
  bmr: number,
  activityLevel: ActivityData['activityLevel'],
  stepsPerDay?: number
): number {
  // Base multipliers for activity levels (excluding exercise)
  const neatMultipliers = {
    sedentary: 0.15,      // 15% of BMR
    lightly_active: 0.25,  // 25% of BMR
    moderate: 0.35,        // 35% of BMR
    very_active: 0.45,     // 45% of BMR
    extra_active: 0.55     // 55% of BMR
  };

  let neat = bmr * neatMultipliers[activityLevel];

  // Adjust based on step count if provided
  if (stepsPerDay) {
    // Rough estimate: 0.04 calories per step for average person
    const stepCalories = stepsPerDay * 0.04;
    // Replace base NEAT with step-based calculation if higher
    neat = Math.max(neat, stepCalories);
  }

  return Math.round(neat);
}

/**
 * Calculate all energy expenditure components
 */
export function calculateEnergyComponents(
  biologicalData: BiologicalData,
  activityData: ActivityData,
  averageDailyIntake: number,
  actualTDEE?: number // From weight trend analysis
): EnergyComponents {
  // Calculate base components
  const bmr = calculateBMR(biologicalData);
  const tef = calculateTEF(averageDailyIntake);
  const eat = calculateEAT(
    biologicalData.weightKg,
    activityData.exerciseMinutesPerWeek || 0
  );
  
  // Calculate NEAT
  let neat = calculateNEAT(bmr, activityData.activityLevel, activityData.stepsPerDay);
  
  // Initial total
  let total = bmr + tef + eat + neat;
  
  // If we have actual TDEE from weight trend, adjust NEAT to match
  if (actualTDEE && actualTDEE > 0) {
    const difference = actualTDEE - total;
    neat = Math.max(0, neat + difference); // Adjust NEAT to reconcile
    total = actualTDEE;
  }
  
  // Calculate confidence based on data availability
  let confidence = 0.5; // Base confidence
  if (biologicalData.bodyFatPercentage) confidence += 0.1;
  if (activityData.exerciseMinutesPerWeek) confidence += 0.1;
  if (activityData.stepsPerDay) confidence += 0.1;
  if (actualTDEE) confidence += 0.2;
  
  return {
    bmr,
    tef,
    eat,
    neat,
    total,
    confidence: Math.min(confidence, 1)
  };
}

/**
 * Get component breakdown for visualization
 */
export function getComponentBreakdown(components: EnergyComponents): ComponentBreakdown[] {
  const { bmr, tef, eat, neat, total } = components;
  
  return [
    {
      label: 'BMR',
      value: bmr,
      percentage: (bmr / total) * 100,
      description: 'Basal Metabolic Rate - calories burned at rest',
      color: '#3B82F6' // Blue
    },
    {
      label: 'TEF',
      value: tef,
      percentage: (tef / total) * 100,
      description: 'Thermic Effect of Food - calories burned digesting',
      color: '#10B981' // Green
    },
    {
      label: 'EAT',
      value: eat,
      percentage: (eat / total) * 100,
      description: 'Exercise Activity - calories from planned exercise',
      color: '#F59E0B' // Orange
    },
    {
      label: 'NEAT',
      value: neat,
      percentage: (neat / total) * 100,
      description: 'Daily Activity - calories from movement and fidgeting',
      color: '#8B5CF6' // Purple
    }
  ];
}

/**
 * Explain why TDEE might be changing
 */
export function explainTDEEChange(
  previousComponents: EnergyComponents,
  currentComponents: EnergyComponents
): string[] {
  const explanations: string[] = [];
  const tdeeChange = currentComponents.total - previousComponents.total;
  
  if (Math.abs(tdeeChange) < 50) {
    return ['Your TDEE has remained stable.'];
  }
  
  // Check BMR change (from weight change)
  const bmrChange = currentComponents.bmr - previousComponents.bmr;
  if (Math.abs(bmrChange) > 20) {
    if (bmrChange > 0) {
      explanations.push(`BMR increased by ${Math.round(bmrChange)} calories due to weight gain.`);
    } else {
      explanations.push(`BMR decreased by ${Math.round(Math.abs(bmrChange))} calories due to weight loss.`);
    }
  }
  
  // Check NEAT change (metabolic adaptation)
  const neatChange = currentComponents.neat - previousComponents.neat;
  if (Math.abs(neatChange) > 50) {
    if (neatChange > 0) {
      explanations.push(`Daily activity increased by ${Math.round(neatChange)} calories - you're moving more!`);
    } else {
      explanations.push(`Daily activity decreased by ${Math.round(Math.abs(neatChange))} calories - possible metabolic adaptation.`);
    }
  }
  
  // Check EAT change
  const eatChange = currentComponents.eat - previousComponents.eat;
  if (Math.abs(eatChange) > 30) {
    if (eatChange > 0) {
      explanations.push(`Exercise burn increased by ${Math.round(eatChange)} calories.`);
    } else {
      explanations.push(`Exercise burn decreased by ${Math.round(Math.abs(eatChange))} calories.`);
    }
  }
  
  return explanations;
}