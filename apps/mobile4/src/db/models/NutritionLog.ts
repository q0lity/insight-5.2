/**
 * Nutrition Log Model
 */

import { field, text, json, relation } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';

import { SyncableModel } from './BaseModel';
import { TableNames } from '../schema';
import type { Entry } from './Entry';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink';

interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  brand?: string;
  notes?: string;
  confidence?: number;
  source?: 'manual' | 'ai_estimate' | 'database';
}

const sanitizeStringArray = (raw: unknown): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((s) => typeof s === 'string');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
};

const sanitizeFoodItems = (raw: unknown): FoodItem[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as FoodItem[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as FoodItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const sanitizeMetadata = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

export class NutritionLog extends SyncableModel {
  static table = TableNames.NUTRITION_LOGS;

  static associations = {
    [TableNames.ENTRIES]: { type: 'belongs_to' as const, key: 'entry_id' },
  };

  @field('entry_id') entryId!: string | null;
  @field('meal_type') mealType!: MealType;
  @text('title') title!: string | null;
  @field('eaten_at') eatenAt!: number;
  @field('calories') calories!: number | null;
  @field('protein_g') proteinG!: number | null;
  @field('carbs_g') carbsG!: number | null;
  @field('fat_g') fatG!: number | null;
  @field('fiber_g') fiberG!: number | null;
  @field('saturated_fat_g') saturatedFatG!: number | null;
  @field('trans_fat_g') transFatG!: number | null;
  @field('sugar_g') sugarG!: number | null;
  @field('sodium_mg') sodiumMg!: number | null;
  @field('potassium_mg') potassiumMg!: number | null;
  @field('cholesterol_mg') cholesterolMg!: number | null;
  @field('estimation_model') estimationModel!: string | null;
  @field('confidence') confidence!: number | null;
  @json('items', sanitizeFoodItems) items!: FoodItem[];
  @text('photo_uri') photoUri!: string | null;
  @text('notes') notes!: string | null;
  @field('goal_id') goalId!: string | null;
  @json('tags', sanitizeStringArray) tags!: string[];
  @text('location') location!: string | null;
  @json('metadata', sanitizeMetadata) metadata!: Record<string, unknown>;

  @relation(TableNames.ENTRIES, 'entry_id') entry!: Relation<Entry>;

  get macros() {
    return {
      protein: this.proteinG ?? 0,
      carbs: this.carbsG ?? 0,
      fat: this.fatG ?? 0,
      fiber: this.fiberG,
      saturatedFat: this.saturatedFatG,
      transFat: this.transFatG,
      sugar: this.sugarG,
      sodium: this.sodiumMg,
      potassium: this.potassiumMg,
      cholesterol: this.cholesterolMg,
    };
  }

  get totalCalories(): number {
    return this.calories ?? 0;
  }

  get isBreakfast(): boolean {
    return this.mealType === 'breakfast';
  }

  get isLunch(): boolean {
    return this.mealType === 'lunch';
  }

  get isDinner(): boolean {
    return this.mealType === 'dinner';
  }

  get isSnack(): boolean {
    return this.mealType === 'snack';
  }

  get isDrink(): boolean {
    return this.mealType === 'drink';
  }

  toSupabasePayload(): Record<string, unknown> {
    return {
      entry_id: this.entryId,
      meal_type: this.mealType,
      title: this.title,
      eaten_at: this.eatenAt ? new Date(this.eatenAt).toISOString() : null,
      calories: this.calories,
      protein_g: this.proteinG,
      carbs_g: this.carbsG,
      fat_g: this.fatG,
      fiber_g: this.fiberG,
      saturated_fat_g: this.saturatedFatG,
      trans_fat_g: this.transFatG,
      sugar_g: this.sugarG,
      sodium_mg: this.sodiumMg,
      potassium_mg: this.potassiumMg,
      cholesterol_mg: this.cholesterolMg,
      estimation_model: this.estimationModel,
      confidence: this.confidence,
      items: this.items,
      photo_uri: this.photoUri,
      notes: this.notes,
      goal_id: this.goalId,
      tags: this.tags,
      location: this.location,
      metadata: this.metadata,
    };
  }

  static fromSupabaseRow(row: Record<string, unknown>): Partial<NutritionLog> {
    const fromIso = (iso: string | null | undefined): number | null => {
      if (!iso) return null;
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? ms : null;
    };

    return {
      remoteId: row.id as string,
      userId: row.user_id as string,
      entryId: (row.entry_id as string) ?? null,
      mealType: (row.meal_type as MealType) ?? 'snack',
      title: (row.title as string) ?? null,
      eatenAt: fromIso(row.eaten_at as string | null) ?? Date.now(),
      calories: (row.calories as number) ?? null,
      proteinG: (row.protein_g as number) ?? null,
      carbsG: (row.carbs_g as number) ?? null,
      fatG: (row.fat_g as number) ?? null,
      fiberG: (row.fiber_g as number) ?? null,
      saturatedFatG: (row.saturated_fat_g as number) ?? null,
      transFatG: (row.trans_fat_g as number) ?? null,
      sugarG: (row.sugar_g as number) ?? null,
      sodiumMg: (row.sodium_mg as number) ?? null,
      potassiumMg: (row.potassium_mg as number) ?? null,
      cholesterolMg: (row.cholesterol_mg as number) ?? null,
      estimationModel: (row.estimation_model as string) ?? null,
      confidence: (row.confidence as number) ?? null,
      items: sanitizeFoodItems(row.items),
      photoUri: (row.photo_uri as string) ?? null,
      notes: (row.notes as string) ?? null,
      goalId: (row.goal_id as string) ?? null,
      tags: sanitizeStringArray(row.tags),
      location: (row.location as string) ?? null,
      metadata: sanitizeMetadata(row.metadata),
    } as unknown as Partial<NutritionLog>;
  }
}
