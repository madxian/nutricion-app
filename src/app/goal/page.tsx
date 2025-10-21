import GoalForm from '@/components/goal-form';

export default function GoalPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-lg">
        <GoalForm />
      </div>
    </main>
  );
}
