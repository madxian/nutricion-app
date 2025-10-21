
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@/context/user-context';
import type { MealPlanOutput, UserData, Meal, Goal } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Logo from './logo';
import { Flame, Beef, Carrot, Wheat, Utensils, Cookie, Salad, Coffee, ShoppingCart } from 'lucide-react';
import { getSampleMealPlan } from '@/lib/sample-data';
import { useLanguage } from '@/context/language-context';
import { shoppingLists, fixedIngredients } from '@/lib/shopping-lists';

// Harris-Benedict Formula Implementation
const calculateBMR = (userData: UserData): number => {
    if (userData.sex === 'male') {
        return 88.362 + (13.397 * userData.weightKg) + (4.799 * userData.heightCm) - (5.677 * userData.age);
    } else {
        return 447.593 + (9.247 * userData.weightKg) + (3.098 * userData.heightCm) - (4.330 * userData.age);
    }
};

const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
};

const calculateTDEE = (bmr: number, activityLevel: UserData['activityLevel']): number => {
    return bmr * (activityMultipliers[activityLevel || 'sedentary']);
};

const calculateCalorieTarget = (tdee: number, goal: UserData['goal']): number => {
    switch (goal) {
        case 'lose':
            return tdee - 500;
        case 'gain':
            return tdee + 500;
        case 'maintain':
        default:
            return tdee;
    }
};

const adjustMealPlan = (basePlan: MealPlanOutput, userData: UserData): MealPlanOutput => {
    const bmr = calculateBMR(userData);
    const tdee = calculateTDEE(bmr, userData.activityLevel);
    const userCalorieTarget = calculateCalorieTarget(tdee, userData.goal);

    let baseTotalCalories = 0;
    const mealTypesForCalc = ['breakfasts', 'lunches', 'snacks', 'dinners'] as const;
    mealTypesForCalc.forEach(mealType => {
      basePlan[mealType].forEach(meal => {
        baseTotalCalories += meal.calories;
      });
    });

    const numberOfMeals = basePlan.breakfasts.length; 
    const baseAverageDailyCalories = (baseTotalCalories / numberOfMeals);

    if (baseAverageDailyCalories === 0) return basePlan;

    const scalingFactor = userCalorieTarget / baseAverageDailyCalories;
    if (isNaN(scalingFactor) || scalingFactor <= 0) {
      return basePlan;
    }

    const adjustedPlan = JSON.parse(JSON.stringify(basePlan));
    const mealTypes = ['breakfasts', 'lunches', 'snacks', 'dinners'] as const;

    mealTypes.forEach(mealType => {
        adjustedPlan[mealType] = adjustedPlan[mealType].map((meal: Meal) => {
            const adjustedIngredients = meal.ingredients.replace(/(\d+(\.\d+)?)/g, (match, numberStr) => {
                const num = parseFloat(numberStr);
                if (num > 1 || numberStr.includes('.')) {
                    const scaledNum = num * scalingFactor;
                    return String(Math.round(scaledNum));
                }
                return numberStr;
            });

            return {
                ...meal,
                calories: Math.round(meal.calories * scalingFactor),
                protein: Math.round(meal.protein * scalingFactor),
                carbs: Math.round(meal.carbs * scalingFactor),
                fat: Math.round(meal.fat * scalingFactor),
                ingredients: adjustedIngredients,
            };
        });
    });

    return adjustedPlan;
};

const generateShoppingList = (plan: MealPlanOutput | null, goal: Goal, language: 'es' | 'en'): Map<string, { total: number; unit: string }> => {
    const list = new Map<string, { total: number; unit: string }>();
    if (!plan || !goal) return list;

    const ingredientsToTrack = [...(shoppingLists[language][goal] || [])].sort((a, b) => b.length - a.length);
    if (ingredientsToTrack.length === 0 && goal !== 'maintain') return list;

    const allMeals = Object.values(plan).flat();

    allMeals.forEach(meal => {
        const lines = meal.ingredients.split('\n');
        
        lines.forEach(line => {
            const cleanedLine = line.replace(/•/g, '').trim().toLowerCase();
            
            const foundIngredient = ingredientsToTrack.find(trackIngredient => {
                const singularTrack = trackIngredient.toLowerCase().replace(/s$/, '');
                const pluralTrack = singularTrack + 's';
                const regex = new RegExp(`\\b(${singularTrack}|${pluralTrack})\\b`);
                return regex.test(cleanedLine);
            });

            if (foundIngredient) {
                const match = cleanedLine.match(/(\d+(\.\d+)?)\s*(g|gr|ml|unidad|unidades|taza|tazas|cucharada|cucharadas|cucharadita|cucharaditas|hoja|hojas|tsp|tbsp|slice|slices|cup|cups|unit|units)?/);
                
                if (match) {
                    const quantity = parseFloat(match[1]);
                    let unit = match[3] || 'unidades';

                    // Normalize units
                    const unitMap: Record<string, string> = {
                        'g': 'g', 'gr': 'g',
                        'taza': 'tazas', 'tazas': 'tazas', 'cup': 'cups', 'cups': 'cups',
                        'cucharada': 'cucharadas', 'cucharadas': 'cucharadas', 'tbsp': 'tbsp',
                        'cucharadita': 'cucharaditas', 'cucharaditas': 'cucharaditas', 'tsp': 'tsp',
                        'hoja': 'hojas', 'hojas': 'hojas',
                        'unidad': 'unidades', 'unidades': 'unidades', 'unit': 'units', 'units': 'units', 'slice': 'slices', 'slices': 'slices'
                    };
                    
                    unit = unitMap[unit] || unit;

                    if (!isNaN(quantity)) {
                        const existing = list.get(foundIngredient) || { total: 0, unit: unit };
                        // If units are different, we might need more complex logic, for now, we just add quantities
                        list.set(foundIngredient, {
                            total: existing.total + quantity,
                            unit: existing.unit
                        });
                    }
                }
            }
        });
    });
    
    const fixedItems = fixedIngredients[language];
    fixedItems.forEach(ingredient => {
        if (!list.has(ingredient)) {
            list.set(ingredient, { total: 1, unit: language === 'es' ? 'al gusto' : 'to taste' });
        }
    });
    
    const sortedList = new Map([...list.entries()].sort((a, b) => a[0].localeCompare(b[0])));
    return sortedList;
};


export default function MealPlanDisplay() {
  const { user: userData, username, isLoading: isUserLoading, logout } = useUser();
  const [plan, setPlan] = useState<MealPlanOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { t, language } = useLanguage();
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('id')) {
        setPaymentSuccess(true);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    const fetchMealPlan = () => {
      if (!isUserLoading && userData?.goal && userData.name) {
        setIsLoading(true);
        try {
          const basePlan = getSampleMealPlan(userData.goal, language);
          const adjustedPlan = adjustMealPlan(basePlan, userData);
          setPlan(adjustedPlan);
        } catch (error) {
          console.error('Error adjusting meal plan:', error);
          toast({
            variant: 'destructive',
            title: t('plan.error_title'),
            description: "There was an issue adjusting your personalized plan. We've loaded a sample plan instead.",
          });
          setPlan(getSampleMealPlan(userData.goal, language));
        } finally {
          setIsLoading(false);
        }
      } else if (!isUserLoading) {
        setIsLoading(false);
      }
    };

    fetchMealPlan();
  }, [isUserLoading, userData, toast, t, language]);

  const shoppingList = useMemo(() => {
    if (plan && userData?.goal) {
      return generateShoppingList(plan, userData.goal, language);
    }
    return new Map();
  }, [plan, userData?.goal, language]);

  if (paymentSuccess) {
    return (
      <div className="container mx-auto max-w-lg py-16 px-4 text-center">
        <Alert variant="default" className="shadow-lg">
           <AlertTitle className="text-2xl font-bold">🌟 ¡Hola!</AlertTitle>
          <AlertDescription className="mt-4 text-base space-y-4">
            <p>Gracias por confiar en Tu Guía Nutricional: Qué hay pa’ hoy!</p>
            <p>Me hace muy feliz que te unas a esta aventura. Aquí vas a encontrar menús pensados en ti, con comida bien colombiana, rica, fácil de preparar y que se ajusta a tus metas. 🇨🇴🍲</p>
            <p>Ojalá disfrutes cada plato tanto como yo disfruto crearlos para ti. Y recuerda: comer rico también es parte del proceso, la nutrición no tiene por qué ser un castigo 🥑</p>
          </AlertDescription>
          <div className="mt-8">
            <Button onClick={() => router.push('/')}>Ir a Crear mi Cuenta</Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (isUserLoading || isLoading) {
    return <PlanSkeleton />;
  }

  if (!plan || !userData) {
    // This case should be handled by the provider redirecting, but as a fallback:
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4 text-center">
        <h1 className="text-2xl font-bold">{t('plan.error_title')}</h1>
        <p>{t('plan.error_description_load')}</p>
        <Button onClick={() => router.push('/details')} className="mt-4">{t('plan.retry_button')}</Button>
      </div>
    );
  }

  const mealTypes = [
    { key: 'breakfasts', title: t('plan.breakfasts'), icon: <Coffee className="w-5 h-5 mr-2" />, data: plan.breakfasts },
    { key: 'lunches', title: t('plan.lunches'), icon: <Salad className="w-5 h-5 mr-2" />, data: plan.lunches },
    { key: 'snacks', title: t('plan.snacks'), icon: <Cookie className="w-5 h-5 mr-2" />, data: plan.snacks },
    { key: 'dinners', title: t('plan.dinners'), icon: <Utensils className="w-5 h-5 mr-2" />, data: plan.dinners },
  ];

  const goalText: { [key: string]: string } = {
    gain: t('plan.goal_gain'),
    lose: t('plan.goal_lose'),
    maintain: t('plan.goal_maintain'),
  };

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
       <header className="flex justify-between items-center mb-8">
        <Logo />
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground hidden sm:inline">{t('plan.greeting', { username: username || '' })}</span>
          <Button variant="outline" onClick={logout}>{t('plan.logout_button')}</Button>
        </div>
      </header>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline mb-2">{t('plan.title')}</h1>
        <p className="text-lg text-muted-foreground">
          {t('plan.description_prefix')} {goalText[userData.goal]}.
        </p>
      </div>
      
      <Tabs defaultValue="breakfasts" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto">
          {mealTypes.map(mealType => (
            <TabsTrigger key={mealType.key} value={mealType.key} className="py-2">
              {mealType.icon} {mealType.title}
            </TabsTrigger>
          ))}
           <TabsTrigger value="shopping-list" className="py-2">
              <ShoppingCart className="w-5 h-5 mr-2" /> {t('plan.shopping_list')}
            </TabsTrigger>
        </TabsList>

        {mealTypes.map(mealType => (
          <TabsContent key={mealType.key} value={mealType.key}>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {mealType.data.map((meal, index) => (
                <AccordionItem value={`item-${index}`} key={index} className="border-b-0">
                  <Card className="shadow-md hover:shadow-lg transition-shadow">
                    <AccordionTrigger className="text-lg font-semibold p-6 hover:no-underline">
                      {t('plan.option', { index: index + 1 })}: {meal.name}
                    </AccordionTrigger>
                    <AccordionContent className="p-6 pt-0">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-bold text-md mb-2">{t('plan.ingredients')}</h3>
                          <p className="text-muted-foreground whitespace-pre-line">{meal.ingredients}</p>
                          <h3 className="font-bold text-md mt-4 mb-2">{t('plan.instructions')}</h3>
                          <p className="text-muted-foreground whitespace-pre-line">{meal.instructions}</p>
                        </div>
                        <div className="bg-secondary/50 p-4 rounded-lg">
                           <h3 className="font-bold text-md mb-3">{t('plan.nutritional_info')}</h3>
                          <p className="text-sm text-muted-foreground mb-4"><strong>{t('plan.serving_size')}:</strong> {meal.portionSize}</p>
                          <div className="space-y-3">
                              <div className="flex items-center justify-between"><span className="flex items-center"><Flame className="w-4 h-4 mr-2 text-accent"/>{t('plan.calories')}</span> <span className="font-mono">{meal.calories} kcal</span></div>
                              <div className="flex items-center justify-between"><span className="flex items-center"><Beef className="w-4 h-4 mr-2 text-red-500"/>{t('plan.protein')}</span> <span className="font-mono">{meal.protein} g</span></div>
                              <div className="flex items-center justify-between"><span className="flex items-center"><Wheat className="w-4 h-4 mr-2 text-yellow-600"/>{t('plan.carbs')}</span> <span className="font-mono">{meal.carbs} g</span></div>
                              <div className="flex items-center justify-between"><span className="flex items-center"><Carrot className="w-4 h-4 mr-2 text-orange-500"/>{t('plan.fats')}</span> <span className="font-mono">{meal.fat} g</span></div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        ))}
         <TabsContent value="shopping-list">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>{t('plan.shopping_list_title')}</CardTitle>
                <CardDescription>{t('plan.shopping_list_description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {Array.from(shoppingList.entries()).map(([ingredient, data]) => (
                    <li key={ingredient} className="flex justify-between border-b pb-2">
                      <span className="capitalize">{ingredient}</span>
                      <span>{data.total} {data.unit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
  );
}

function PlanSkeleton() {
    return (
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <header className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </header>
        <div className="text-center mb-8">
            <Skeleton className="h-10 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
        </div>
        <div className="text-center my-8">
          <p className="text-lg text-primary animate-pulse">Cargando ajustes...</p>
          <p className="text-muted-foreground">This may take a moment. Please wait.</p>
        </div>
        <Skeleton className="h-12 w-full mb-4" />
        <div className="space-y-2">
            {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
        </div>
      </div>
    );
  }
