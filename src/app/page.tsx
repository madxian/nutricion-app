import AuthForm from '@/components/auth-form';

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
    </main>
  );
}
