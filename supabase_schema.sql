-- OptiGains Nutrition Database Schema
-- This script will drop and recreate tables to ensure clean setup

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in reverse order of dependencies)
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

-- User nutrition profiles table
CREATE TABLE public.user_nutrition_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  clerk_user_id text NOT NULL UNIQUE,
  tdee_estimate integer NOT NULL DEFAULT 2500,
  coaching_mode text NOT NULL DEFAULT 'coached' CHECK (coaching_mode IN ('coached', 'manual', 'collaborative')),
  goal_type text NOT NULL DEFAULT 'maintenance' CHECK (goal_type IN ('maintenance', 'gain', 'cut', 'recomp')),
  activity_level text NOT NULL DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  target_calories integer NOT NULL DEFAULT 2500,
  target_protein integer NOT NULL DEFAULT 150,
  target_carbs integer NOT NULL DEFAULT 250,
  target_fat integer NOT NULL DEFAULT 80,
  target_fiber integer DEFAULT 30,
  height_cm numeric(5,2),
  age integer,
  sex text CHECK (sex IN ('male', 'female', 'other')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_nutrition_profiles_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX idx_user_nutrition_profiles_clerk_user 
ON public.user_nutrition_profiles USING btree (clerk_user_id) TABLESPACE pg_default;

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
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT foods_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX idx_foods_name 
ON public.foods USING btree (name) TABLESPACE pg_default;

CREATE INDEX idx_foods_barcode 
ON public.foods USING btree (barcode) TABLESPACE pg_default;

CREATE INDEX idx_foods_user 
ON public.foods USING btree (user_id) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_foods_updated_at 
BEFORE UPDATE ON foods 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

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
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX idx_weight_entries_user_date 
ON public.weight_entries USING btree (clerk_user_id, date DESC) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;

-- Daily nutrition logs table
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
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX idx_nutrition_logs_user_date 
ON public.nutrition_logs USING btree (clerk_user_id, date DESC) TABLESPACE pg_default;

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
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX idx_meals_user_date 
ON public.meals USING btree (clerk_user_id, logged_at DESC) TABLESPACE pg_default;

CREATE INDEX idx_meals_food 
ON public.meals USING btree (food_id) TABLESPACE pg_default;

CREATE INDEX idx_meals_nutrition_log 
ON public.meals USING btree (nutrition_log_id) TABLESPACE pg_default;

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
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX idx_quick_add_foods_user 
ON public.quick_add_foods USING btree (clerk_user_id) TABLESPACE pg_default;

CREATE INDEX idx_quick_add_foods_frequency 
ON public.quick_add_foods USING btree (clerk_user_id, frequency DESC) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.quick_add_foods ENABLE ROW LEVEL SECURITY;

-- Meal templates table
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
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX idx_meal_templates_user 
ON public.meal_templates USING btree (clerk_user_id) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_meal_templates_updated_at 
BEFORE UPDATE ON meal_templates 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Weekly check-ins table
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
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX idx_weekly_check_ins_user_date 
ON public.weekly_check_ins USING btree (clerk_user_id, week_start_date DESC) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.weekly_check_ins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables
-- Note: These policies use auth.jwt() ->> 'sub' to match Clerk's JWT structure

-- User nutrition profiles policies
CREATE POLICY "Users can view own nutrition profile" ON public.user_nutrition_profiles
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own nutrition profile" ON public.user_nutrition_profiles
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own nutrition profile" ON public.user_nutrition_profiles
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Foods policies (allow viewing all foods, but only modifying own)
CREATE POLICY "Anyone can view public foods" ON public.foods
    FOR SELECT USING (user_id IS NULL OR auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own foods" ON public.foods
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own foods" ON public.foods
    FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own foods" ON public.foods
    FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

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

-- Create views for common queries

-- View for daily nutrition summary with meals
CREATE OR REPLACE VIEW daily_nutrition_summary AS
SELECT 
    n.clerk_user_id,
    n.date,
    n.calories as logged_calories,
    n.protein as logged_protein,
    n.carbs as logged_carbs,
    n.fat as logged_fat,
    n.fiber as logged_fiber,
    COUNT(DISTINCT m.id) as meal_count,
    json_agg(
        json_build_object(
            'meal_type', m.meal_type,
            'food_name', f.name,
            'amount_grams', m.amount_grams,
            'calories', ROUND((f.calories_per_100g * m.amount_grams / 100)::numeric, 2)
        ) ORDER BY m.logged_at
    ) as meals
FROM nutrition_logs n
LEFT JOIN meals m ON n.id = m.nutrition_log_id
LEFT JOIN foods f ON m.food_id = f.id
GROUP BY n.id, n.clerk_user_id, n.date, n.calories, n.protein, n.carbs, n.fat, n.fiber;

-- Function to calculate nutrition totals for a day
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
    AND DATE(m.logged_at) = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to update nutrition log when meals change
CREATE OR REPLACE FUNCTION update_nutrition_log_from_meals()
RETURNS TRIGGER AS $$
DECLARE
    v_date date;
    v_totals record;
BEGIN
    -- Determine the date based on the operation
    IF TG_OP = 'DELETE' THEN
        v_date := DATE(OLD.logged_at);
    ELSE
        v_date := DATE(NEW.logged_at);
    END IF;
    
    -- Calculate new totals
    SELECT * INTO v_totals FROM calculate_daily_nutrition(
        COALESCE(NEW.clerk_user_id, OLD.clerk_user_id),
        v_date
    );
    
    -- Update or insert nutrition log
    INSERT INTO nutrition_logs (
        clerk_user_id, date, calories, protein, carbs, fat, fiber, sugar, saturated_fat, sodium
    ) VALUES (
        COALESCE(NEW.clerk_user_id, OLD.clerk_user_id),
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
    
    RETURN NEW;
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

-- Insert some sample public foods (optional, can be removed in production)
INSERT INTO public.foods (name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, is_verified) VALUES
('Chicken Breast (Cooked)', 'Generic', 165, 31, 0, 3.6, 0, true),
('Brown Rice (Cooked)', 'Generic', 112, 2.6, 23.5, 0.9, 1.8, true),
('Banana', 'Generic', 89, 1.1, 22.8, 0.3, 2.6, true),
('Greek Yogurt (Plain, Non-fat)', 'Generic', 59, 10.2, 3.6, 0.4, 0, true),
('Almonds', 'Generic', 579, 21.2, 21.6, 49.9, 12.5, true),
('Sweet Potato (Cooked)', 'Generic', 86, 1.6, 20.1, 0.1, 3, true),
('Olive Oil', 'Generic', 884, 0, 0, 100, 0, true),
('Eggs (Whole)', 'Generic', 155, 13, 1.1, 10.6, 0, true),
('Oatmeal (Dry)', 'Generic', 389, 16.9, 66.3, 6.9, 10.6, true),
('Broccoli (Cooked)', 'Generic', 35, 2.4, 7.2, 0.4, 3.3, true);