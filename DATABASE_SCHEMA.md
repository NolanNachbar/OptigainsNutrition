# Database Schema

## Current Supabase Tables

### user_nutrition_profiles
Fields that exist in database:
- id
- clerk_user_id
- tdee_estimate
- coaching_mode
- goal_type
- target_macros (JSON)
- activity_level
- created_at
- updated_at

Fields the app expects but are missing:
- age
- biological_sex
- height_cm
- weight_kg
- experience_level
- protein_target
- diet_type
- body_weight_unit
- food_weight_unit

### nutrition_logs
- id
- clerk_user_id
- date
- calories
- protein
- carbs
- fat
- fiber (optional)
- weight (optional)
- notes (optional)
- adherence_score (optional)
- created_at
- updated_at

### meals
- id
- clerk_user_id
- food_id
- amount_grams
- meal_type
- logged_at
- nutrition_log_id (optional)
- notes (optional)

### foods
- id
- name
- brand (optional)
- barcode (optional)
- serving_size
- serving_unit (optional)
- calories_per_100g
- protein_per_100g
- carbs_per_100g
- fat_per_100g
- fiber_per_100g (optional)
- sugar_per_100g (optional)
- saturated_fat_per_100g (optional)
- sodium_per_100g (optional)
- clerk_user_id (for custom foods)
- created_at

### weight_entries
- id
- clerk_user_id
- date
- weight
- body_fat_percentage (optional)
- notes (optional)
- created_at

### weekly_check_ins
- id
- clerk_user_id
- week_start_date
- average_weight
- average_calories
- average_macros (JSON)
- adherence_percentage
- energy_level (1-5)
- hunger_level (1-5)
- training_performance (1-5)
- notes (optional)
- macro_adjustment (JSON, optional)
- created_at

### quick_add_foods
- id
- clerk_user_id
- food_id
- frequency
- last_used
- is_favorite (optional)

## Temporary Solution

Until the database schema is updated, we're storing additional user data in localStorage with the key `user_data_{clerk_user_id}` containing:
```json
{
  "age": 25,
  "biological_sex": "male",
  "height_cm": 180,
  "weight_kg": 75,
  "body_weight_unit": "metric",
  "food_weight_unit": "metric"
}
```

## To Add to Supabase

Run these SQL commands to add the missing columns:

```sql
-- Add missing columns to user_nutrition_profiles
ALTER TABLE user_nutrition_profiles
ADD COLUMN age INTEGER,
ADD COLUMN biological_sex VARCHAR(10),
ADD COLUMN height_cm NUMERIC(5,2),
ADD COLUMN weight_kg NUMERIC(6,2),
ADD COLUMN experience_level VARCHAR(20),
ADD COLUMN protein_target VARCHAR(20),
ADD COLUMN diet_type VARCHAR(20),
ADD COLUMN body_weight_unit VARCHAR(10),
ADD COLUMN food_weight_unit VARCHAR(10);

-- Add missing tables if they don't exist
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_user_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  weight NUMERIC(6,2),
  body_fat_percentage NUMERIC(4,1),
  neck NUMERIC(5,1),
  shoulders NUMERIC(5,1),
  chest NUMERIC(5,1),
  left_bicep NUMERIC(5,1),
  right_bicep NUMERIC(5,1),
  left_forearm NUMERIC(5,1),
  right_forearm NUMERIC(5,1),
  waist NUMERIC(5,1),
  hips NUMERIC(5,1),
  left_thigh NUMERIC(5,1),
  right_thigh NUMERIC(5,1),
  left_calf NUMERIC(5,1),
  right_calf NUMERIC(5,1),
  notes TEXT,
  photos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  servings INTEGER NOT NULL,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  instructions TEXT,
  ingredients JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```