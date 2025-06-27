-- OptiGains Nutrition - Complete Database Schema
-- Run these SQL commands in your Supabase SQL editor

-- 1. Expenditure Data Table (for TDEE tracking)
CREATE TABLE IF NOT EXISTS public.expenditure_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    date DATE NOT NULL,
    estimated_tdee INTEGER NOT NULL,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    weight_kg DECIMAL(5,2) NOT NULL,
    calories_consumed INTEGER NOT NULL,
    weight_change_7d DECIMAL(4,2) NOT NULL,
    weight_change_14d DECIMAL(4,2) NOT NULL,
    calorie_average_7d INTEGER NOT NULL,
    calorie_average_14d INTEGER NOT NULL,
    trend TEXT NOT NULL CHECK (trend IN ('gaining', 'losing', 'maintaining')),
    algorithm_version TEXT NOT NULL DEFAULT 'v3.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clerk_user_id, date)
);

-- Enable RLS
ALTER TABLE public.expenditure_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy for expenditure_data
CREATE POLICY "Users can only access their own expenditure data" ON public.expenditure_data
    FOR ALL USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- 2. Habit Tracking Table
CREATE TABLE IF NOT EXISTS public.habit_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    date DATE NOT NULL,
    logged_food BOOLEAN NOT NULL DEFAULT FALSE,
    logged_weight BOOLEAN NOT NULL DEFAULT FALSE,
    hit_calorie_target BOOLEAN NOT NULL DEFAULT FALSE,
    hit_protein_target BOOLEAN NOT NULL DEFAULT FALSE,
    exercise_completed BOOLEAN NOT NULL DEFAULT FALSE,
    sleep_hours DECIMAL(3,1),
    water_intake_liters DECIMAL(3,1),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
    hunger_level INTEGER CHECK (hunger_level >= 1 AND hunger_level <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clerk_user_id, date)
);

-- Enable RLS
ALTER TABLE public.habit_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy for habit_entries
CREATE POLICY "Users can only access their own habit entries" ON public.habit_entries
    FOR ALL USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- 3. Meal Templates Table
CREATE TABLE IF NOT EXISTS public.meal_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    foods JSONB NOT NULL, -- Array of {food_id, amount_grams}
    total_macros JSONB NOT NULL, -- {calories, protein, carbs, fat, fiber}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy for meal_templates
CREATE POLICY "Users can only access their own meal templates" ON public.meal_templates
    FOR ALL USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- 4. Update Weekly Check-ins Table (add new columns)
ALTER TABLE public.weekly_check_ins 
ADD COLUMN IF NOT EXISTS weight_change_kg DECIMAL(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_tdee INTEGER DEFAULT 2000,
ADD COLUMN IF NOT EXISTS expenditure_trend TEXT DEFAULT 'stable' CHECK (expenditure_trend IN ('increasing', 'decreasing', 'stable')),
ADD COLUMN IF NOT EXISTS logging_days INTEGER DEFAULT 7;

-- 5. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenditure_data_user_date ON public.expenditure_data(clerk_user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_entries_user_date ON public.habit_entries(clerk_user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_templates_user ON public.meal_templates(clerk_user_id);

-- 6. Create a function to automatically calculate habit streaks
CREATE OR REPLACE FUNCTION calculate_habit_streak(
    user_id TEXT,
    habit_column TEXT
) RETURNS INTEGER AS $$
DECLARE
    streak_count INTEGER := 0;
    current_date DATE := CURRENT_DATE;
    check_date DATE;
    habit_value BOOLEAN;
BEGIN
    -- Start from today and go backwards
    FOR i IN 0..99 LOOP -- Check up to 100 days back
        check_date := current_date - i;
        
        -- Get the habit value for this date
        EXECUTE format('SELECT %I FROM habit_entries WHERE clerk_user_id = $1 AND date = $2', habit_column)
        INTO habit_value
        USING user_id, check_date;
        
        -- If no entry found or habit not completed, break the streak
        IF habit_value IS NULL OR habit_value = FALSE THEN
            EXIT;
        END IF;
        
        streak_count := streak_count + 1;
    END LOOP;
    
    RETURN streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a function to auto-generate habit entries from nutrition/weight data
CREATE OR REPLACE FUNCTION update_habit_entry_from_logs(
    user_id TEXT,
    entry_date DATE
) RETURNS VOID AS $$
DECLARE
    nutrition_exists BOOLEAN := FALSE;
    weight_exists BOOLEAN := FALSE;
    calorie_target INTEGER;
    protein_target INTEGER;
    actual_calories INTEGER;
    actual_protein INTEGER;
    hit_cal_target BOOLEAN := FALSE;
    hit_prot_target BOOLEAN := FALSE;
BEGIN
    -- Check if nutrition log exists for this date
    SELECT EXISTS(
        SELECT 1 FROM nutrition_logs 
        WHERE clerk_user_id = user_id AND date = entry_date
    ) INTO nutrition_exists;
    
    -- Check if weight entry exists for this date
    SELECT EXISTS(
        SELECT 1 FROM weight_entries 
        WHERE clerk_user_id = user_id AND date = entry_date
    ) INTO weight_exists;
    
    -- Get targets and actual values
    IF nutrition_exists THEN
        SELECT target_calories, target_protein INTO calorie_target, protein_target
        FROM user_nutrition_profiles WHERE clerk_user_id = user_id;
        
        SELECT calories, protein INTO actual_calories, actual_protein
        FROM nutrition_logs WHERE clerk_user_id = user_id AND date = entry_date;
        
        -- Check if targets were hit (within 10% tolerance)
        IF actual_calories >= calorie_target * 0.9 AND actual_calories <= calorie_target * 1.1 THEN
            hit_cal_target := TRUE;
        END IF;
        
        IF actual_protein >= protein_target * 0.9 THEN
            hit_prot_target := TRUE;
        END IF;
    END IF;
    
    -- Insert or update habit entry
    INSERT INTO habit_entries (
        clerk_user_id, date, logged_food, logged_weight, 
        hit_calorie_target, hit_protein_target
    ) VALUES (
        user_id, entry_date, nutrition_exists, weight_exists,
        hit_cal_target, hit_prot_target
    )
    ON CONFLICT (clerk_user_id, date) 
    DO UPDATE SET
        logged_food = EXCLUDED.logged_food,
        logged_weight = EXCLUDED.logged_weight,
        hit_calorie_target = EXCLUDED.hit_calorie_target,
        hit_protein_target = EXCLUDED.hit_protein_target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create triggers to auto-update habit entries
CREATE OR REPLACE FUNCTION trigger_update_habit_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Update habit entry for the affected date
    PERFORM update_habit_entry_from_logs(NEW.clerk_user_id, NEW.date::DATE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DROP TRIGGER IF EXISTS update_habit_on_nutrition_log ON nutrition_logs;
CREATE TRIGGER update_habit_on_nutrition_log
    AFTER INSERT OR UPDATE ON nutrition_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_habit_entry();

DROP TRIGGER IF EXISTS update_habit_on_weight_entry ON weight_entries;
CREATE TRIGGER update_habit_on_weight_entry
    AFTER INSERT OR UPDATE ON weight_entries
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_habit_entry();

-- 9. Insert sample data for testing (optional)
-- You can uncomment this section to add some test data

/*
-- Sample expenditure data
INSERT INTO public.expenditure_data (
    clerk_user_id, date, estimated_tdee, confidence, weight_kg,
    calories_consumed, weight_change_7d, weight_change_14d,
    calorie_average_7d, calorie_average_14d, trend
) VALUES 
    ('user_2tamxurU2tBvlXCNC8KGQLGoN4Q', CURRENT_DATE - 1, 2800, 85, 75.5, 2750, -0.2, -0.4, 2750, 2780, 'losing'),
    ('user_2tamxurU2tBvlXCNC8KGQLGoN4Q', CURRENT_DATE, 2820, 88, 75.3, 2800, -0.1, -0.3, 2775, 2785, 'maintaining')
ON CONFLICT (clerk_user_id, date) DO NOTHING;

-- Sample habit entries
INSERT INTO public.habit_entries (
    clerk_user_id, date, logged_food, logged_weight, hit_calorie_target,
    hit_protein_target, exercise_completed, energy_level, hunger_level, stress_level
) VALUES 
    ('user_2tamxurU2tBvlXCNC8KGQLGoN4Q', CURRENT_DATE - 1, TRUE, TRUE, TRUE, TRUE, TRUE, 4, 3, 2),
    ('user_2tamxurU2tBvlXCNC8KGQLGoN4Q', CURRENT_DATE, TRUE, TRUE, FALSE, TRUE, FALSE, 3, 4, 3)
ON CONFLICT (clerk_user_id, date) DO NOTHING;
*/

-- 10. Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'expenditure_data', 
    'habit_entries', 
    'meal_templates',
    'user_nutrition_profiles',
    'nutrition_logs',
    'weight_entries',
    'weekly_check_ins',
    'meals',
    'foods',
    'quick_add_foods'
)
ORDER BY table_name;

-- Success message
SELECT 'Database setup complete! All MacroFactor features are now ready.' as status;