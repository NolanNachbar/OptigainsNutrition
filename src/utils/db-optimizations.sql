-- Database Performance Optimizations for OptiGains
-- Run these queries in Supabase SQL editor

-- 1. Index for meal queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_meals_user_date 
ON meals(clerk_user_id, date) 
INCLUDE (meal_type, food_id, amount_grams);

-- 2. Index for weight entries
CREATE INDEX IF NOT EXISTS idx_weight_user_date 
ON weight_entries(clerk_user_id, date DESC);

-- 3. Index for nutrition logs
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date 
ON nutrition_logs(clerk_user_id, date DESC);

-- 4. Full-text search index for foods
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_foods_name_trgm 
ON foods USING gin(name gin_trgm_ops);

-- Alternative: Use GiST for better performance with LIKE queries
CREATE INDEX IF NOT EXISTS idx_foods_name_gist 
ON foods USING gist(name gist_trgm_ops);

-- 5. Index for user's custom foods
CREATE INDEX IF NOT EXISTS idx_foods_user 
ON foods(user_id) 
WHERE user_id IS NOT NULL;

-- 6. Composite index for quick-add foods
CREATE INDEX IF NOT EXISTS idx_quick_add_user_frequency 
ON quick_add_foods(clerk_user_id, frequency DESC, last_used DESC);

-- 7. Index for weekly check-ins
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_user_date 
ON weekly_check_ins(clerk_user_id, week_start_date DESC);

-- 8. Create materialized view for user stats (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_daily_stats AS
SELECT 
  clerk_user_id,
  date,
  COUNT(DISTINCT meal_type) as meals_logged,
  SUM(CASE WHEN f.calories_per_100g IS NOT NULL 
       THEN m.amount_grams * f.calories_per_100g / 100 
       ELSE 0 END) as total_calories,
  SUM(CASE WHEN f.protein_per_100g IS NOT NULL 
       THEN m.amount_grams * f.protein_per_100g / 100 
       ELSE 0 END) as total_protein,
  SUM(CASE WHEN f.carbs_per_100g IS NOT NULL 
       THEN m.amount_grams * f.carbs_per_100g / 100 
       ELSE 0 END) as total_carbs,
  SUM(CASE WHEN f.fat_per_100g IS NOT NULL 
       THEN m.amount_grams * f.fat_per_100g / 100 
       ELSE 0 END) as total_fat
FROM meals m
LEFT JOIN foods f ON m.food_id = f.id
GROUP BY clerk_user_id, date;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_user_daily_stats_user_date 
ON user_daily_stats(clerk_user_id, date DESC);

-- 9. Function to refresh materialized view (call this daily)
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_daily_stats;
END;
$$ LANGUAGE plpgsql;

-- 10. Optimize frequently used query patterns with prepared statements
PREPARE get_user_meals_by_date (text, date) AS
SELECT m.*, f.*
FROM meals m
JOIN foods f ON m.food_id = f.id
WHERE m.clerk_user_id = $1 AND m.date = $2
ORDER BY m.meal_type, m.logged_at;

-- 11. Add table partitioning for large tables (if data grows)
-- Example: Partition meals table by month
-- CREATE TABLE meals_2024_01 PARTITION OF meals
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 12. Vacuum and analyze tables for better query planning
VACUUM ANALYZE meals;
VACUUM ANALYZE foods;
VACUUM ANALYZE weight_entries;
VACUUM ANALYZE nutrition_logs;