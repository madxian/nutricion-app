
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface PaymentStatus {
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  registrationCode?: string;
}

export default function StatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore } = useFirebase();

  const reference = searchParams.get('reference');

  const docRef = reference ? doc(firestore, 'payment_codes', reference) : null;
  const { data: paymentData, isLoading } = useDoc<PaymentStatus>(docRef);

  useEffect(() => {
    if (!reference) {
      router.replace('/');
    }
  }, [reference, router]);
  
  useEffect(() => {
    if (paymentData?.status === 'APPROVED' && paymentData.registrationCode) {
      // If approved, wait a moment to show the success message, then redirect.
      const timer = setTimeout(() => {
        router.push(`/registro?code=${paymentData.registrationCode}`);
      }, 2000); // 2-second delay
      return () => clearTimeout(timer);
    }
  }, [paymentData, router]);

  if (!reference) {
    return null; // or a loading state while redirecting
  }

  const renderContent = () => {
    if (isLoading || !paymentData || paymentData.status === 'PENDING') {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Verificando estado del pago...</p>
          <p className="text-muted-foreground">Por favor, no cierres ni actualices esta página.</p>
        </div>
      );
    }

    if (paymentData.status === 'APPROVED') {
      return (
         <Alert variant="default" className="border-green-500 bg-green-50 text-green-800">
           <CheckCircle className="h-5 w-5 text-green-600" />
           <AlertTitle className="font-bold">¡Pago Aprobado!</AlertTitle>
           <AlertDescription>
             ¡Excelente! Tu pago ha sido procesado con éxito. En un momento serás redirigido a la página de registro con tu código.
           </AlertDescription>
         </Alert>
      );
    }

    if (paymentData.status === 'DECLINED') {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Pago Rechazado</AlertTitle>
          <AlertDescription>
            Lo sentimos, tu pago no pudo ser procesado. Por favor, revisa tus datos o intenta con otro método de pago.
          </AlertDescription>
          <Button variant="outline" className="mt-4 w-full" onClick={() => router.push('/checkout')}>
            Volver a Intentar
          </Button>
        </Alert>
      );
    }
    
    return null;
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 sm:p-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Procesando tu Acceso</CardTitle>
          <CardDescription className="text-center">
            Estamos confirmando tu transacción con Wompi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </main>
  );
}
