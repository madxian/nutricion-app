export type Goal = 'gain' | 'lose' | 'maintain';

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserData {
  name: string;
  email: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  sex?: Sex;
  activityLevel?: ActivityLevel;
  goal?: Goal;
  detailsLastUpdatedAt?: string; // ISO 8601 date string
}

export interface Meal {
  name: string;
  ingredients: string;
  instructions: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionSize: string;
}

export interface MealPlanOutput {
  breakfasts: Meal[];
  lunches: Meal[];
  snacks: Meal[];
  dinners: Meal[];
}
