
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/logo';
import { useLanguage } from '@/context/language-context';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// A simple function to generate a unique enough reference.
// In a real-world scenario, you might want a more robust UUID generator.
const generatePaymentReference = () => {
  return `nutritrack-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export default function CheckoutPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handlePayment = () => {
    setIsLoading(true);
    
    // 1. Generate a unique reference for this payment attempt.
    const reference = generatePaymentReference();

    // 2. Construct the Wompi URL with the reference and redirect URL.
    const wompiBaseUrl = 'https://checkout.wompi.co/l/AzfEIS';
    
    // We get the base URL of our app to construct the redirect URL dynamically.
    const redirectUrl = `${window.location.origin}/status`;

    // The URL is encoded to ensure special characters are handled correctly.
    const finalWompiUrl = `${wompiBaseUrl}?reference=${encodeURIComponent(reference)}&redirect-url=${encodeURIComponent(redirectUrl)}`;
    
    // 3. Redirect the user to Wompi.
    window.location.href = finalWompiUrl;
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mb-4">
              <Logo />
            </div>
            <CardTitle>Obtén tu acceso</CardTitle>
            <CardDescription>
              Realiza el pago para obtener tu código de registro y empezar a usar tu planificador de comidas personalizado.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">Pago único para acceso de por vida.</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handlePayment} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pagar ahora
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
