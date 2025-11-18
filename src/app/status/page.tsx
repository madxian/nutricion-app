
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface PaymentReference {
  registrationCode?: string;
  transactionId: string;
  status: 'APPROVED' | 'DECLINED' | 'PENDING' | 'ERROR' | 'UNKNOWN';
}

export default function StatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore } = useFirebase();

  const transactionId = searchParams.get('id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'declined'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registrationCode, setRegistrationCode] = useState<string | null>(null);
  const [shouldPoll, setShouldPoll] = useState(true);

  useEffect(() => {
    if (!transactionId) {
      router.replace('/');
      return;
    }

    if (!firestore || !shouldPoll) {
      return;
    }

    const findPaymentByTransactionId = async () => {
      // Directly get the document using the transactionId as the document ID
      const paymentDocRef = doc(firestore, 'payment_references', transactionId);

      try {
        const docSnap = await getDoc(paymentDocRef);
        
        if (docSnap.exists()) {
          const paymentData = docSnap.data() as PaymentReference;

          if (paymentData.status === 'APPROVED' && paymentData.registrationCode) {
            setRegistrationCode(paymentData.registrationCode);
            setStatus('success');
            setShouldPoll(false);
          } else if (paymentData.status !== 'PENDING' && paymentData.status !== 'APPROVED') {
            setStatus('declined');
            setErrorMessage(`Tu pago fue ${paymentData.status.toLowerCase()}. Por favor, intenta de nuevo o contacta a tu banco.`);
            setShouldPoll(false);
          }
          // If status is PENDING or still no document, we keep polling.
        }
      } catch (err) {
        console.error("Firestore getDoc error:", err);
        setStatus('error');
        setErrorMessage("Hubo un error al verificar tu pago. Por favor, contacta a soporte.");
        setShouldPoll(false);
      }
    };

    // Start polling immediately
    findPaymentByTransactionId();

    const interval = setInterval(findPaymentByTransactionId, 5000); 

    // Stop polling after 10 minutes
    const timeout = setTimeout(() => {
      if (shouldPoll) {
        setStatus('error');
        setErrorMessage("No pudimos confirmar tu pago después de 10 minutos. Si el pago fue debitado, por favor contacta a soporte con tu ID de transacción.");
        setShouldPoll(false);
      }
    }, 600000); // 10 minutes

    return () => {
        clearInterval(interval);
        clearTimeout(timeout);
    };

  }, [transactionId, firestore, router, shouldPoll]);
  
  useEffect(() => {
    if (status === 'success' && registrationCode) {
      const timer = setTimeout(() => {
        router.push(`/registro?code=${registrationCode}`);
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [status, registrationCode, router]);

  if (!transactionId) {
    return null; // or a loading state while redirecting
  }

  const renderContent = () => {
    switch (status) {
      case 'success':
        return (
          <Alert variant="default" className="border-green-500 bg-green-50 text-green-800">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="font-bold">¡Pago Aprobado!</AlertTitle>
            <AlertDescription>
              ¡Excelente! Tu pago ha sido procesado con éxito. En un momento serás redirigido a la página de registro con tu código.
            </AlertDescription>
          </Alert>
        );
      case 'declined':
        return (
          <Alert variant="destructive">
            <XCircle className="h-5 w-5" />
            <AlertTitle className="font-bold">Pago Rechazado</AlertTitle>
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
            <Button variant="outline" className="mt-4 w-full" onClick={() => router.push('/checkout')}>
              Volver a Intentar
            </Button>
          </Alert>
        );
      case 'error':
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="font-bold">Error al verificar</AlertTitle>
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
            <Button variant="outline" className="mt-4 w-full" onClick={() => router.push('/checkout')}>
              Volver a Intentar
            </Button>
          </Alert>
        );
      case 'loading':
      default:
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Confirmando tu pago...</p>
            <p className="text-muted-foreground">Estamos esperando la confirmación de Wompi. Esto puede tomar un momento.</p>
          </div>
        );
    }
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
