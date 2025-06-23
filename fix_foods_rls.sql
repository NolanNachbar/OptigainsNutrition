-- Fix the foods table RLS policies to use 'user_id' instead of 'clerk_user_id'
-- Since the foods table uses 'user_id' column, not 'clerk_user_id'

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view foods" ON public.foods;
DROP POLICY IF EXISTS "Users can insert own foods" ON public.foods;
DROP POLICY IF EXISTS "Users can update own foods" ON public.foods;
DROP POLICY IF EXISTS "Users can delete own foods" ON public.foods;

-- Create corrected RLS policies for foods
-- Users can see public foods (where user_id IS NULL) and their own foods
CREATE POLICY "Users can view foods" ON public.foods
    FOR SELECT USING (user_id IS NULL OR auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own foods" ON public.foods
    FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own foods" ON public.foods
    FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own foods" ON public.foods
    FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);