-- Migration: Extend nutrition_logs with full micronutrients
-- Date: 2026-01-03
-- Description: Adds extended macronutrient columns for comprehensive nutrition tracking

-- Add new micronutrient columns to nutrition_logs table
ALTER TABLE public.nutrition_logs
  ADD COLUMN IF NOT EXISTS fiber_g numeric,
  ADD COLUMN IF NOT EXISTS saturated_fat_g numeric,
  ADD COLUMN IF NOT EXISTS trans_fat_g numeric,
  ADD COLUMN IF NOT EXISTS sugar_g numeric,
  ADD COLUMN IF NOT EXISTS sodium_mg numeric,
  ADD COLUMN IF NOT EXISTS potassium_mg numeric,
  ADD COLUMN IF NOT EXISTS cholesterol_mg numeric,
  ADD COLUMN IF NOT EXISTS estimation_model text;

-- Add comments for documentation
COMMENT ON COLUMN public.nutrition_logs.fiber_g IS 'Dietary fiber in grams';
COMMENT ON COLUMN public.nutrition_logs.saturated_fat_g IS 'Saturated fat in grams';
COMMENT ON COLUMN public.nutrition_logs.trans_fat_g IS 'Trans fat in grams';
COMMENT ON COLUMN public.nutrition_logs.sugar_g IS 'Total sugars in grams';
COMMENT ON COLUMN public.nutrition_logs.sodium_mg IS 'Sodium in milligrams';
COMMENT ON COLUMN public.nutrition_logs.potassium_mg IS 'Potassium in milligrams';
COMMENT ON COLUMN public.nutrition_logs.cholesterol_mg IS 'Cholesterol in milligrams';
COMMENT ON COLUMN public.nutrition_logs.estimation_model IS 'AI model used for estimation (e.g., gpt-4o)';

-- Add workout weight unit preference column to workout_rows
ALTER TABLE public.workout_rows
  ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'lb';

COMMENT ON COLUMN public.workout_rows.weight_unit IS 'Weight unit preference (lb or kg)';
