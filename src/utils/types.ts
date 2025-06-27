// src/utils/types.ts

// Nutrition Goals
export type GoalType = 'maintenance' | 'gain' | 'cut' | 'recomp';
export type CoachingMode = 'coached' | 'manual' | 'collaborative';

// Macronutrients
export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  saturatedFat?: number;
}

// User Profile
export interface UserNutritionProfile {
  id?: string;
  clerk_user_id: string;
  tdee_estimate: number;
  coaching_mode: CoachingMode;
  goal_type: GoalType;
  target_macros: Macros;
  activity_level: 'sedentary' | 'lightly_active' | 'moderate' | 'very_active' | 'extra_active';
  age?: number;
  biological_sex?: 'male' | 'female';
  height_cm?: number;
  weight_kg?: number;
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  protein_target?: 'low' | 'medium' | 'high' | 'very_high';
  diet_type?: 'balanced' | 'low_carb' | 'low_fat' | 'keto' | 'plant_based';
  body_weight_unit?: 'metric' | 'imperial';
  food_weight_unit?: 'metric' | 'imperial';
  created_at?: string;
  updated_at?: string;
}

// Food Database
export interface Food {
  id?: string;
  name: string;
  brand?: string;
  barcode?: string;
  serving_size: number; // in grams
  serving_unit?: string; // e.g., "cup", "slice", "piece"
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  sugar_per_100g?: number;
  saturated_fat_per_100g?: number;
  sodium_per_100g?: number;
  user_id?: string; // null for public foods
  clerk_user_id?: string; // Alternative field name for user-created foods
  is_verified?: boolean;
  created_at?: string;
}

// Meal Types
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// Meal Entry
export interface Meal {
  id?: string;
  clerk_user_id: string;
  food_id: string;
  food?: Food; // Populated when fetching
  amount_grams: number;
  meal_type: MealType;
  logged_at: string;
  nutrition_log_id?: string;
  notes?: string;
}

// Daily Nutrition Log
export interface NutritionLog {
  id?: string;
  clerk_user_id: string;
  date: string; // YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  weight?: number; // Morning weight in kg
  notes?: string;
  adherence_score?: number; // 0-100
  created_at?: string;
  updated_at?: string;
}

// Weight Entry
export interface WeightEntry {
  id?: string;
  clerk_user_id: string;
  date: string;
  weight: number; // in kg
  body_fat_percentage?: number;
  notes?: string;
  created_at?: string;
}

// Progress Data
export interface ProgressData {
  weightEntries: WeightEntry[];
  nutritionLogs: NutritionLog[];
  averageCalories: number;
  averageMacros: Macros;
  tdeeEstimate: number;
  weeklyWeightChange: number;
}

// Meal Template
export interface MealTemplate {
  id?: string;
  clerk_user_id: string;
  name: string;
  description?: string;
  foods: {
    food_id: string;
    amount_grams: number;
  }[];
  total_macros: Macros;
  created_at?: string;
}

// Quick Add Food
export interface QuickAddFood {
  id?: string;
  clerk_user_id: string;
  food_id: string;
  food?: Food;
  frequency: number; // Times used
  last_used: string;
  is_favorite?: boolean;
}

// Weekly Check-in
export interface WeeklyCheckIn {
  id?: string;
  clerk_user_id: string;
  week_start_date: string;
  average_weight: number;
  average_calories: number;
  average_macros: Macros;
  adherence_percentage: number;
  weight_change_kg: number;
  estimated_tdee: number;
  expenditure_trend: 'increasing' | 'decreasing' | 'stable';
  logging_days: number;
  energy_level: 1 | 2 | 3 | 4 | 5;
  hunger_level: 1 | 2 | 3 | 4 | 5;
  training_performance: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  photos?: string[]; // URLs to progress photos
  macro_adjustment?: Macros; // New targets after check-in
  created_at?: string;
}

// Expenditure Data
export interface ExpenditureData {
  id?: string;
  clerk_user_id: string;
  date: string;
  estimated_tdee: number;
  confidence: number; // 0-100%
  weight_kg: number;
  calories_consumed: number;
  weight_change_7d: number;
  weight_change_14d: number;
  calorie_average_7d: number;
  calorie_average_14d: number;
  trend: 'gaining' | 'losing' | 'maintaining';
  algorithm_version: string;
  created_at?: string;
}

// Habit Tracking
export interface HabitEntry {
  id?: string;
  clerk_user_id: string;
  date: string;
  logged_food: boolean;
  logged_weight: boolean;
  hit_calorie_target: boolean;
  hit_protein_target: boolean;
  exercise_completed: boolean;
  sleep_hours?: number;
  water_intake_liters?: number;
  stress_level: 1 | 2 | 3 | 4 | 5;
  energy_level: 1 | 2 | 3 | 4 | 5;
  hunger_level: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  created_at?: string;
}

// Recipe Types
export interface RecipeIngredient {
  food_id: string;
  food?: Food;
  amount_grams: number;
}

export interface Recipe {
  id?: string;
  clerk_user_id: string;
  name: string;
  description?: string;
  servings: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  instructions?: string;
  ingredients: RecipeIngredient[];
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
  // Calculated fields
  total_calories?: number;
  total_protein?: number;
  total_carbs?: number;
  total_fat?: number;
  total_fiber?: number;
  calories_per_serving?: number;
  protein_per_serving?: number;
  carbs_per_serving?: number;
  fat_per_serving?: number;
  fiber_per_serving?: number;
}

// Macro targets type alias
export type MacroTargets = Macros;

// Body Measurements
export interface BodyMeasurement {
  id?: string;
  clerk_user_id: string;
  date: string;
  // Core measurements
  weight?: number; // kg
  body_fat_percentage?: number;
  // Upper body
  neck?: number; // cm
  shoulders?: number;
  chest?: number;
  left_bicep?: number;
  right_bicep?: number;
  left_forearm?: number;
  right_forearm?: number;
  // Core
  waist?: number;
  hips?: number;
  // Lower body
  left_thigh?: number;
  right_thigh?: number;
  left_calf?: number;
  right_calf?: number;
  // Additional
  notes?: string;
  photos?: string[]; // URLs to progress photos
  created_at?: string;
}