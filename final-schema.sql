-- OptiGains Nutrition Database Schema - Final Version
-- Enhanced schema to align with TypeScript types and add missing fields

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS public.body_measurements CASCADE;
DROP TABLE IF EXISTS public.habit_entries CASCADE;
DROP TABLE IF EXISTS public.expenditure_data CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.weekly_check_ins CASCADE;
DROP TABLE IF EXISTS public.meal_templates CASCADE;
DROP TABLE IF EXISTS public.quick_add_foods CASCADE;
DROP TABLE IF EXISTS public.meals CASCADE;
DROP TABLE IF EXISTS public.nutrition_logs CASCADE;
DROP TABLE IF EXISTS public.weight_entries CASCADE;
DROP TABLE IF EXISTS public.foods CASCADE;
DROP TABLE IF EXISTS public.user_nutrition_profiles CASCADE;

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- User nutrition profiles table - Enhanced with missing fields
CREATE TABLE public.user_nutrition_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL UNIQUE,
  tdee_estimate integer NOT NULL DEFAULT 2500,
  coaching_mode text NOT NULL DEFAULT 'coached' CHECK (coaching_mode IN ('coached', 'manual', 'collaborative')),
  goal_type text NOT NULL DEFAULT 'maintenance' CHECK (goal_type IN ('maintenance', 'gain', 'cut', 'recomp')),
  activity_level text NOT NULL DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderate', 'very_active', 'extra_active')),
  target_calories integer NOT NULL DEFAULT 2500,
  target_protein integer NOT NULL DEFAULT 150,
  target_carbs integer NOT NULL DEFAULT 250,
  target_fat integer NOT NULL DEFAULT 80,
  target_fiber integer DEFAULT 30,
  height_cm numeric(5,2),
  age integer,
  biological_sex text CHECK (biological_sex IN ('male', 'female')),
  weight_kg numeric(5,2),
  experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  protein_target text CHECK (protein_target IN ('low', 'medium', 'high', 'very_high')),
  diet_type text CHECK (diet_type IN ('balanced', 'low_carb', 'low_fat', 'keto', 'plant_based')),
  body_weight_unit text DEFAULT 'metric' CHECK (body_weight_unit IN ('metric', 'imperial')),
  food_weight_unit text DEFAULT 'metric' CHECK (food_weight_unit IN ('metric', 'imperial')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_nutrition_profiles_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX idx_user_nutrition_profiles_clerk_user 
ON public.user_nutrition_profiles USING btree (clerk_user_id);

-- Enable RLS
ALTER TABLE public.user_nutrition_profiles ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_user_nutrition_profiles_updated_at 
BEFORE UPDATE ON user_nutrition_profiles 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Foods table (both public and user-created foods)
CREATE TABLE public.foods (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(255) NOT NULL,
  brand character varying(255),
  barcode character varying(100),
  serving_size numeric(10,2) NOT NULL DEFAULT 100,
  serving_unit character varying(50),
  calories_per_100g numeric(10,2) NOT NULL,
  protein_per_100g numeric(10,2) NOT NULL,
  carbs_per_100g numeric(10,2) NOT NULL,
  fat_per_100g numeric(10,2) NOT NULL,
  fiber_per_100g numeric(10,2),
  sugar_per_100g numeric(10,2),
  saturated_fat_per_100g numeric(10,2),
  sodium_per_100g numeric(10,2),
  user_id text, -- NULL for public foods
  clerk_user_id text, -- Alternative field name for user-created foods
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT foods_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX idx_foods_name ON public.foods USING btree (name);
CREATE INDEX idx_foods_barcode ON public.foods USING btree (barcode);
CREATE INDEX idx_foods_user ON public.foods USING btree (user_id);
CREATE INDEX idx_foods_clerk_user ON public.foods USING btree (clerk_user_id);

-- Enable RLS
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

-- Weight entries table
CREATE TABLE public.weight_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL,
  date date NOT NULL,
  weight numeric(5,2) NOT NULL, -- in kg
  body_fat_percentage numeric(4,2),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT weight_entries_pkey PRIMARY KEY (id),
  CONSTRAINT weight_entries_unique_user_date UNIQUE (clerk_user_id, date)
);

-- Create indexes
CREATE INDEX idx_weight_entries_user_date 
ON public.weight_entries USING btree (clerk_user_id, date DESC);

-- Enable RLS
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;

-- Daily nutrition logs table - Enhanced with missing fields
CREATE TABLE public.nutrition_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL,
  date date NOT NULL,
  calories numeric(10,2) NOT NULL DEFAULT 0,
  protein numeric(10,2) NOT NULL DEFAULT 0,
  carbs numeric(10,2) NOT NULL DEFAULT 0,
  fat numeric(10,2) NOT NULL DEFAULT 0,
  fiber numeric(10,2) DEFAULT 0,
  sugar numeric(10,2) DEFAULT 0,
  saturated_fat numeric(10,2) DEFAULT 0,
  sodium numeric(10,2) DEFAULT 0,
  weight numeric(5,2), -- Morning weight
  adherence_score integer CHECK (adherence_score >= 0 AND adherence_score <= 100),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT nutrition_logs_pkey PRIMARY KEY (id),
  CONSTRAINT nutrition_logs_unique_user_date UNIQUE (clerk_user_id, date)
);

-- Create indexes
CREATE INDEX idx_nutrition_logs_user_date 
ON public.nutrition_logs USING btree (clerk_user_id, date DESC);

-- Enable RLS
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_nutrition_logs_updated_at 
BEFORE UPDATE ON nutrition_logs 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Meals table (individual food entries)
CREATE TABLE public.meals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL,
  food_id uuid NOT NULL,
  amount_grams numeric(10,2) NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  logged_at timestamp with time zone NOT NULL DEFAULT now(),
  nutrition_log_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meals_pkey PRIMARY KEY (id),
  CONSTRAINT meals_food_id_fkey FOREIGN KEY (food_id) 
    REFERENCES foods (id) ON DELETE RESTRICT,
  CONSTRAINT meals_nutrition_log_id_fkey FOREIGN KEY (nutrition_log_id) 
    REFERENCES nutrition_logs (id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_meals_user_date 
ON public.meals USING btree (clerk_user_id, logged_at DESC);

CREATE INDEX idx_meals_food 
ON public.meals USING btree (food_id);

CREATE INDEX idx_meals_nutrition_log 
ON public.meals USING btree (nutrition_log_id);

-- Create index for common queries (without date extraction to avoid immutability issues)
CREATE INDEX idx_meals_user_enhanced
ON meals(clerk_user_id, meal_type, food_id, amount_grams, logged_at);

-- Enable RLS
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Quick add foods (frequently used foods)
CREATE TABLE public.quick_add_foods (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL,
  food_id uuid NOT NULL,
  frequency integer NOT NULL DEFAULT 1,
  last_used timestamp with time zone NOT NULL DEFAULT now(),
  is_favorite boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quick_add_foods_pkey PRIMARY KEY (id),
  CONSTRAINT quick_add_foods_unique_user_food UNIQUE (clerk_user_id, food_id),
  CONSTRAINT quick_add_foods_food_id_fkey FOREIGN KEY (food_id) 
    REFERENCES foods (id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_quick_add_foods_user 
ON public.quick_add_foods USING btree (clerk_user_id);

CREATE INDEX idx_quick_add_foods_frequency 
ON public.quick_add_foods USING btree (clerk_user_id, frequency DESC, last_used DESC);

-- Enable RLS
ALTER TABLE public.quick_add_foods ENABLE ROW LEVEL SECURITY;

-- Meal templates table - Enhanced with proper macro calculations
CREATE TABLE public.meal_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL,
  name character varying(255) NOT NULL,
  description text,
  foods jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of {food_id, amount_grams}
  total_calories numeric(10,2) NOT NULL DEFAULT 0,
  total_protein numeric(10,2) NOT NULL DEFAULT 0,
  total_carbs numeric(10,2) NOT NULL DEFAULT 0,
  total_fat numeric(10,2) NOT NULL DEFAULT 0,
  total_fiber numeric(10,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meal_templates_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX idx_meal_templates_user 
ON public.meal_templates USING btree (clerk_user_id);

-- Enable RLS
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_meal_templates_updated_at 
BEFORE UPDATE ON meal_templates 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Weekly check-ins table - Enhanced with additional fields
CREATE TABLE public.weekly_check_ins (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL,
  week_start_date date NOT NULL,
  average_weight numeric(5,2),
  average_calories numeric(10,2),
  average_protein numeric(10,2),
  average_carbs numeric(10,2),
  average_fat numeric(10,2),
  adherence_percentage integer CHECK (adherence_percentage >= 0 AND adherence_percentage <= 100),
  weight_change_kg numeric(5,2),
  estimated_tdee integer,
  expenditure_trend text CHECK (expenditure_trend IN ('increasing', 'decreasing', 'stable')),
  logging_days integer,
  energy_level integer CHECK (energy_level >= 1 AND energy_level <= 5),
  hunger_level integer CHECK (hunger_level >= 1 AND hunger_level <= 5),
  training_performance integer CHECK (training_performance >= 1 AND training_performance <= 5),
  sleep_quality integer CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  stress_level integer CHECK (stress_level >= 1 AND stress_level <= 5),
  notes text,
  photos text[], -- URLs to progress photos
  macro_adjustment jsonb, -- New macro targets after check-in
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT weekly_check_ins_pkey PRIMARY KEY (id),
  CONSTRAINT weekly_check_ins_unique_user_week UNIQUE (clerk_user_id, week_start_date)
);

-- Create indexes
CREATE INDEX idx_weekly_check_ins_user_date 
ON public.weekly_check_ins USING btree (clerk_user_id, week_start_date DESC);

-- Enable RLS
ALTER TABLE public.weekly_check_ins ENABLE ROW LEVEL SECURITY;

-- Expenditure data table - New table for TDEE tracking
CREATE TABLE public.expenditure_data (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL,
  date date NOT NULL,
  estimated_tdee integer NOT NULL,
  confidence integer CHECK (confidence >= 0 AND confidence <= 100),
  weight_kg numeric(5,2) NOT NULL,
  calories_consumed numeric(10,2) NOT NULL,
  weight_change_7d numeric(5,2),
  weight_change_14d numeric(5,2),
  calorie_average_7d numeric(10,2),
  calorie_average_14d numeric(10,2),
  trend text CHECK (trend IN ('gaining', 'losing', 'maintaining')),
  algorithm_version text NOT NULL DEFAULT 'v1.0',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expenditure_data_pkey PRIMARY KEY (id),
  CONSTRAINT expenditure_data_unique_user_date UNIQUE (clerk_user_id, date)
);

-- Create indexes
CREATE INDEX idx_expenditure_data_user_date 
ON public.expenditure_data USING btree (clerk_user_id, date DESC);

-- Enable RLS
ALTER TABLE public.expenditure_data ENABLE ROW LEVEL SECURITY;

-- Habit entries table - New table for habit tracking
CREATE TABLE public.habit_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL,
  date date NOT NULL,
  logged_food boolean DEFAULT false,
  logged_weight boolean DEFAULT false,
  hit_calorie_target boolean DEFAULT false,
  hit_protein_target boolean DEFAULT false,
  exercise_completed boolean DEFAULT false,
  sleep_hours numeric(3,1),
  water_intake_liters numeric(4,2),
  stress_level integer CHECK (stress_level >= 1 AND stress_level <= 5),
  energy_level integer CHECK (energy_level >= 1 AND energy_level <= 5),
  hunger_level integer CHECK (hunger_level >= 1 AND hunger_level <= 5),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT habit_entries_pkey PRIMARY KEY (id),
  CONSTRAINT habit_entries_unique_user_date UNIQUE (clerk_user_id, date)
);

-- Create indexes
CREATE INDEX idx_habit_entries_user_date 
ON public.habit_entries USING btree (clerk_user_id, date DESC);

-- Enable RLS
ALTER TABLE public.habit_entries ENABLE ROW LEVEL SECURITY;

-- Recipes table - New table for recipe management
CREATE TABLE public.recipes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL,
  name character varying(255) NOT NULL,
  description text,
  servings integer NOT NULL DEFAULT 1,
  prep_time_minutes integer,
  cook_time_minutes integer,
  instructions text,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of {food_id, amount_grams}
  is_public boolean DEFAULT false,
  total_calories numeric(10,2),
  total_protein numeric(10,2),
  total_carbs numeric(10,2),
  total_fat numeric(10,2),
  total_fiber numeric(10,2),
  calories_per_serving numeric(10,2),
  protein_per_serving numeric(10,2),
  carbs_per_serving numeric(10,2),
  fat_per_serving numeric(10,2),
  fiber_per_serving numeric(10,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipes_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX idx_recipes_user 
ON public.recipes USING btree (clerk_user_id);

CREATE INDEX idx_recipes_public 
ON public.recipes USING btree (is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_recipes_updated_at 
BEFORE UPDATE ON recipes 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Body measurements table - New table for comprehensive body tracking
CREATE TABLE public.body_measurements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL,
  date date NOT NULL,
  weight numeric(5,2),
  body_fat_percentage numeric(4,2),
  neck numeric(5,2),
  shoulders numeric(5,2),
  chest numeric(5,2),
  left_bicep numeric(5,2),
  right_bicep numeric(5,2),
  left_forearm numeric(5,2),
  right_forearm numeric(5,2),
  waist numeric(5,2),
  hips numeric(5,2),
  left_thigh numeric(5,2),
  right_thigh numeric(5,2),
  left_calf numeric(5,2),
  right_calf numeric(5,2),
  notes text,
  photos text[], -- URLs to progress photos
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT body_measurements_pkey PRIMARY KEY (id),
  CONSTRAINT body_measurements_unique_user_date UNIQUE (clerk_user_id, date)
);

-- Create indexes
CREATE INDEX idx_body_measurements_user_date 
ON public.body_measurements USING btree (clerk_user_id, date DESC);

-- Enable RLS
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables
-- User nutrition profiles policies
CREATE POLICY "Users can view own nutrition profile" ON public.user_nutrition_profiles
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own nutrition profile" ON public.user_nutrition_profiles
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own nutrition profile" ON public.user_nutrition_profiles
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Foods policies (allow viewing all foods, but only modifying own)
CREATE POLICY "Anyone can view public foods" ON public.foods
    FOR SELECT USING (user_id IS NULL OR auth.jwt() ->> 'sub' = user_id OR auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own foods" ON public.foods
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id OR auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own foods" ON public.foods
    FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id OR auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own foods" ON public.foods
    FOR DELETE USING (auth.jwt() ->> 'sub' = user_id OR auth.jwt() ->> 'sub' = clerk_user_id);

-- Weight entries policies
CREATE POLICY "Users can view own weight entries" ON public.weight_entries
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own weight entries" ON public.weight_entries
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own weight entries" ON public.weight_entries
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own weight entries" ON public.weight_entries
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Nutrition logs policies
CREATE POLICY "Users can view own nutrition logs" ON public.nutrition_logs
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own nutrition logs" ON public.nutrition_logs
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own nutrition logs" ON public.nutrition_logs
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own nutrition logs" ON public.nutrition_logs
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Meals policies
CREATE POLICY "Users can view own meals" ON public.meals
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own meals" ON public.meals
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own meals" ON public.meals
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own meals" ON public.meals
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Quick add foods policies
CREATE POLICY "Users can view own quick add foods" ON public.quick_add_foods
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own quick add foods" ON public.quick_add_foods
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own quick add foods" ON public.quick_add_foods
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own quick add foods" ON public.quick_add_foods
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Meal templates policies
CREATE POLICY "Users can view own meal templates" ON public.meal_templates
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own meal templates" ON public.meal_templates
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own meal templates" ON public.meal_templates
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own meal templates" ON public.meal_templates
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Weekly check-ins policies
CREATE POLICY "Users can view own weekly check-ins" ON public.weekly_check_ins
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own weekly check-ins" ON public.weekly_check_ins
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own weekly check-ins" ON public.weekly_check_ins
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own weekly check-ins" ON public.weekly_check_ins
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Expenditure data policies
CREATE POLICY "Users can view own expenditure data" ON public.expenditure_data
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own expenditure data" ON public.expenditure_data
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own expenditure data" ON public.expenditure_data
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own expenditure data" ON public.expenditure_data
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Habit entries policies
CREATE POLICY "Users can view own habit entries" ON public.habit_entries
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own habit entries" ON public.habit_entries
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own habit entries" ON public.habit_entries
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own habit entries" ON public.habit_entries
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Recipes policies
CREATE POLICY "Users can view own recipes and public recipes" ON public.recipes
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id OR is_public = true);

CREATE POLICY "Users can insert own recipes" ON public.recipes
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own recipes" ON public.recipes
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own recipes" ON public.recipes
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Body measurements policies
CREATE POLICY "Users can view own body measurements" ON public.body_measurements
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own body measurements" ON public.body_measurements
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own body measurements" ON public.body_measurements
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own body measurements" ON public.body_measurements
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Enhanced performance optimizations
-- Full-text search indexes for foods
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_foods_name_trgm 
ON foods USING gin(name gin_trgm_ops);

-- Index for user's custom foods
CREATE INDEX IF NOT EXISTS idx_foods_user_enhanced 
ON foods(clerk_user_id) 
WHERE clerk_user_id IS NOT NULL;

-- Note: Materialized view removed due to immutability issues with date extraction
-- Use application-level queries with WHERE logged_at::date = $date instead

-- Function removed since materialized view was removed due to immutability issues

-- Enhanced function to calculate nutrition totals for a day
CREATE OR REPLACE FUNCTION calculate_daily_nutrition(
    p_user_id text,
    p_date date
) RETURNS TABLE (
    total_calories numeric,
    total_protein numeric,
    total_carbs numeric,
    total_fat numeric,
    total_fiber numeric,
    total_sugar numeric,
    total_saturated_fat numeric,
    total_sodium numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(f.calories_per_100g * m.amount_grams / 100), 0) as total_calories,
        COALESCE(SUM(f.protein_per_100g * m.amount_grams / 100), 0) as total_protein,
        COALESCE(SUM(f.carbs_per_100g * m.amount_grams / 100), 0) as total_carbs,
        COALESCE(SUM(f.fat_per_100g * m.amount_grams / 100), 0) as total_fat,
        COALESCE(SUM(f.fiber_per_100g * m.amount_grams / 100), 0) as total_fiber,
        COALESCE(SUM(f.sugar_per_100g * m.amount_grams / 100), 0) as total_sugar,
        COALESCE(SUM(f.saturated_fat_per_100g * m.amount_grams / 100), 0) as total_saturated_fat,
        COALESCE(SUM(f.sodium_per_100g * m.amount_grams / 100), 0) as total_sodium
    FROM meals m
    JOIN foods f ON m.food_id = f.id
    WHERE m.clerk_user_id = p_user_id 
    AND m.logged_at::date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to update nutrition log when meals change
CREATE OR REPLACE FUNCTION update_nutrition_log_from_meals()
RETURNS TRIGGER AS $$
DECLARE
    v_date date;
    v_totals record;
    v_user_id text;
BEGIN
    -- Determine the date and user based on the operation
    IF TG_OP = 'DELETE' THEN
        v_date := OLD.logged_at::date;
        v_user_id := OLD.clerk_user_id;
    ELSE
        v_date := NEW.logged_at::date;
        v_user_id := NEW.clerk_user_id;
    END IF;
    
    -- Calculate new totals
    SELECT * INTO v_totals FROM calculate_daily_nutrition(v_user_id, v_date);
    
    -- Update or insert nutrition log
    INSERT INTO nutrition_logs (
        clerk_user_id, date, calories, protein, carbs, fat, fiber, sugar, saturated_fat, sodium
    ) VALUES (
        v_user_id,
        v_date,
        v_totals.total_calories,
        v_totals.total_protein,
        v_totals.total_carbs,
        v_totals.total_fat,
        v_totals.total_fiber,
        v_totals.total_sugar,
        v_totals.total_saturated_fat,
        v_totals.total_sodium
    )
    ON CONFLICT (clerk_user_id, date) DO UPDATE SET
        calories = EXCLUDED.calories,
        protein = EXCLUDED.protein,
        carbs = EXCLUDED.carbs,
        fat = EXCLUDED.fat,
        fiber = EXCLUDED.fiber,
        sugar = EXCLUDED.sugar,
        saturated_fat = EXCLUDED.saturated_fat,
        sodium = EXCLUDED.sodium,
        updated_at = now();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update nutrition logs when meals change
CREATE TRIGGER update_nutrition_log_on_meal_change
AFTER INSERT OR UPDATE OR DELETE ON meals
FOR EACH ROW
EXECUTE FUNCTION update_nutrition_log_from_meals();

-- Function to update quick add food frequency
CREATE OR REPLACE FUNCTION update_quick_add_frequency()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO quick_add_foods (clerk_user_id, food_id, frequency, last_used)
    VALUES (NEW.clerk_user_id, NEW.food_id, 1, now())
    ON CONFLICT (clerk_user_id, food_id) DO UPDATE SET
        frequency = quick_add_foods.frequency + 1,
        last_used = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update quick add foods when meals are added
CREATE TRIGGER update_quick_add_on_meal_insert
AFTER INSERT ON meals
FOR EACH ROW
EXECUTE FUNCTION update_quick_add_frequency();