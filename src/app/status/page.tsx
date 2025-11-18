
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface PaymentReference {
  registrationCode: string;
  transactionId: string;
  // Firestore might add other fields like createdAt.
}

export default function StatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore } = useFirebase();

  // Wompi redirects with the transaction ID in the 'id' query parameter.
  const transactionId = searchParams.get('id');
  const [paymentData, setPaymentData] = useState<PaymentReference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) {
      // If there's no transactionId, there's nothing to check. Redirect home.
      router.replace('/');
      return;
    }

    const findPaymentByTransactionId = async () => {
      if (!firestore) return;

      const paymentQuery = query(
        collection(firestore, 'payment_references'),
        where('transactionId', '==', transactionId),
        limit(1)
      );

      try {
        const querySnapshot = await getDocs(paymentQuery);
        
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          setPaymentData(docSnap.data() as PaymentReference);
        }
        // If it's empty, we just keep polling.
      } catch (err) {
        console.error("Firestore query error:", err);
        setError("Hubo un error al verificar tu pago. Por favor, contacta a soporte.");
      } finally {
        setIsLoading(false);
      }
    };

    // Start polling immediately
    findPaymentByTransactionId();

    // Poll for the status every 5 seconds
    const interval = setInterval(() => {
        // Stop polling if we already found the data
        if (paymentData) {
            clearInterval(interval);
            return;
        }
        findPaymentByTransactionId();
    }, 5000); 

    // Stop polling after 2 minutes to prevent infinite loops
    const timeout = setTimeout(() => {
        clearInterval(interval);
        if (!paymentData) {
            setError("No pudimos confirmar tu pago después de 2 minutos. Si el pago fue debitado, por favor contacta a soporte con tu ID de transacción.");
        }
    }, 120000);

    return () => {
        clearInterval(interval);
        clearTimeout(timeout);
    };

  }, [transactionId, firestore, router, paymentData]);
  
  useEffect(() => {
    // This effect runs when `paymentData` is successfully populated.
    if (paymentData?.registrationCode) {
      // If found, wait a moment to show the success message, then redirect.
      const timer = setTimeout(() => {
        router.push(`/registro?code=${paymentData.registrationCode}`);
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [paymentData, router]);

  if (!transactionId) {
    return null; // or a loading state while redirecting
  }

  const renderContent = () => {
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Error al verificar</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
          <Button variant="outline" className="mt-4 w-full" onClick={() => router.push('/checkout')}>
            Volver a Intentar
          </Button>
        </Alert>
      );
    }

    if (paymentData && paymentData.registrationCode) {
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

    // Default to loading/polling state
    return (
        <div className="flex flex-col items-center justify-center text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Confirmando tu pago...</p>
          <p className="text-muted-foreground">Estamos esperando la confirmación de Wompi. Esto puede tomar un momento.</p>
        </div>
      );
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 sm:p-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Procesando tu Acceso</CardTitle>
          <CardDescription className="text-center">
            Verificando tu transacción. Por favor, no cierres esta página.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </main>
  );
}
