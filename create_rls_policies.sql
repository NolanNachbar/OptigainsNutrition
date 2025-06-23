-- Enable RLS on nutrition tables
ALTER TABLE public.user_nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_add_foods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own nutrition profiles" ON public.user_nutrition_profiles;
DROP POLICY IF EXISTS "Users can insert own nutrition profiles" ON public.user_nutrition_profiles;
DROP POLICY IF EXISTS "Users can update own nutrition profiles" ON public.user_nutrition_profiles;
DROP POLICY IF EXISTS "Users can delete own nutrition profiles" ON public.user_nutrition_profiles;

DROP POLICY IF EXISTS "Users can view own nutrition logs" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Users can insert own nutrition logs" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Users can update own nutrition logs" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Users can delete own nutrition logs" ON public.nutrition_logs;

DROP POLICY IF EXISTS "Users can view own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can insert own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can update own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can delete own meals" ON public.meals;

DROP POLICY IF EXISTS "Users can view foods" ON public.foods;
DROP POLICY IF EXISTS "Users can insert own foods" ON public.foods;
DROP POLICY IF EXISTS "Users can update own foods" ON public.foods;
DROP POLICY IF EXISTS "Users can delete own foods" ON public.foods;

DROP POLICY IF EXISTS "Users can view own weight entries" ON public.weight_entries;
DROP POLICY IF EXISTS "Users can insert own weight entries" ON public.weight_entries;
DROP POLICY IF EXISTS "Users can update own weight entries" ON public.weight_entries;
DROP POLICY IF EXISTS "Users can delete own weight entries" ON public.weight_entries;

DROP POLICY IF EXISTS "Users can view own weekly check-ins" ON public.weekly_check_ins;
DROP POLICY IF EXISTS "Users can insert own weekly check-ins" ON public.weekly_check_ins;
DROP POLICY IF EXISTS "Users can update own weekly check-ins" ON public.weekly_check_ins;
DROP POLICY IF EXISTS "Users can delete own weekly check-ins" ON public.weekly_check_ins;

DROP POLICY IF EXISTS "Users can view own meal templates" ON public.meal_templates;
DROP POLICY IF EXISTS "Users can insert own meal templates" ON public.meal_templates;
DROP POLICY IF EXISTS "Users can update own meal templates" ON public.meal_templates;
DROP POLICY IF EXISTS "Users can delete own meal templates" ON public.meal_templates;

DROP POLICY IF EXISTS "Users can view own quick add foods" ON public.quick_add_foods;
DROP POLICY IF EXISTS "Users can insert own quick add foods" ON public.quick_add_foods;
DROP POLICY IF EXISTS "Users can update own quick add foods" ON public.quick_add_foods;
DROP POLICY IF EXISTS "Users can delete own quick add foods" ON public.quick_add_foods;

-- Create RLS policies for user_nutrition_profiles
CREATE POLICY "Users can view own nutrition profiles" ON public.user_nutrition_profiles
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own nutrition profiles" ON public.user_nutrition_profiles
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own nutrition profiles" ON public.user_nutrition_profiles
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own nutrition profiles" ON public.user_nutrition_profiles
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Create RLS policies for nutrition_logs
CREATE POLICY "Users can view own nutrition logs" ON public.nutrition_logs
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own nutrition logs" ON public.nutrition_logs
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own nutrition logs" ON public.nutrition_logs
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own nutrition logs" ON public.nutrition_logs
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Create RLS policies for meals
CREATE POLICY "Users can view own meals" ON public.meals
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own meals" ON public.meals
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own meals" ON public.meals
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own meals" ON public.meals
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Create RLS policies for foods (more complex - users can see public foods and their own)
CREATE POLICY "Users can view foods" ON public.foods
    FOR SELECT USING (user_id IS NULL OR auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own foods" ON public.foods
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own foods" ON public.foods
    FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own foods" ON public.foods
    FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Create RLS policies for weight_entries
CREATE POLICY "Users can view own weight entries" ON public.weight_entries
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own weight entries" ON public.weight_entries
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own weight entries" ON public.weight_entries
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own weight entries" ON public.weight_entries
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Create RLS policies for weekly_check_ins
CREATE POLICY "Users can view own weekly check-ins" ON public.weekly_check_ins
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own weekly check-ins" ON public.weekly_check_ins
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own weekly check-ins" ON public.weekly_check_ins
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own weekly check-ins" ON public.weekly_check_ins
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Create RLS policies for meal_templates
CREATE POLICY "Users can view own meal templates" ON public.meal_templates
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own meal templates" ON public.meal_templates
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own meal templates" ON public.meal_templates
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own meal templates" ON public.meal_templates
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Create RLS policies for quick_add_foods
CREATE POLICY "Users can view own quick add foods" ON public.quick_add_foods
    FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own quick add foods" ON public.quick_add_foods
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can update own quick add foods" ON public.quick_add_foods
    FOR UPDATE USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own quick add foods" ON public.quick_add_foods
    FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);