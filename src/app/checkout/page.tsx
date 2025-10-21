'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/logo';
import { useLanguage } from '@/context/language-context';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = () => {
    setIsLoading(true);
    // Redirect directly to the Wompi payment link
    window.location.href = 'https://checkout.nequi.wompi.co/l/ko8i5q';
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
            <p className="text-4xl font-bold mb-2">$40,000 COP</p>
            <p className="text-muted-foreground">Pago único</p>
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
