import MealPlanDisplay from '@/components/meal-plan-display';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlanPage() {
  return (
    <main className="min-h-dvh bg-background">
        <Suspense fallback={<PlanSkeleton />}>
          <MealPlanDisplay />
        </Suspense>
    </main>
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
        <p className="text-lg text-primary animate-pulse">Adjusting your personalized meal plan...</p>
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
