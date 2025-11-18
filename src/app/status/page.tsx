
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface PaymentReference {
  registrationCode?: string;
  transactionId?: string;
  status?: 'APPROVED' | 'DECLINED' | 'PENDING' | 'ERROR' | 'UNKNOWN';
}

export default function StatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore } = useFirebase();

  const [tx, setTx] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'declined'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registrationCode, setRegistrationCode] = useState<string | null>(null);
  const [shouldPoll, setShouldPoll] = useState(true);

  // Normalize tx param from multiple possible names
  useEffect(() => {
    const candidateParams = ['id', 'tx', 'transaction_id', 'transactionId', 'reference', 'transaction'];
    let txFromParams: string | null = null;
    for (const p of candidateParams) {
      const v = searchParams.get(p);
      if (v) { txFromParams = v; break; }
    }
    console.log('StatusPage - parsed transaction param:', { txFromParams, allSearchParams: Array.from(searchParams.entries()) });

    if (!txFromParams) {
      setStatus('error');
      setErrorMessage('No se encontró el identificador de transacción en la URL. Verifica el link o contacta soporte.');
      return;
    }

    setTx(txFromParams);
  }, [searchParams]);

  // Polling + fallback lookup
  useEffect(() => {
    if (!tx) return;
    if (!firestore) return;
    if (!shouldPoll) return;

    let isMounted = true;

    const findPayment = async () => {
      try {
        console.log('StatusPage - checking payment_references for tx:', tx);
        // 1) Try direct doc by id in payment_references
        const paymentDocRef = doc(firestore, 'payment_references', tx);
        const docSnap = await getDoc(paymentDocRef);

        if (docSnap.exists()) {
          const paymentData = docSnap.data() as PaymentReference;
          console.log('StatusPage - found payment_references doc:', paymentData);

          if (paymentData.status === 'APPROVED' && paymentData.registrationCode) {
            if (!isMounted) return;
            setRegistrationCode(paymentData.registrationCode);
            setStatus('success');
            setShouldPoll(false);
            return;
          } else if (paymentData.status && paymentData.status !== 'PENDING' && paymentData.status !== 'APPROVED') {
            if (!isMounted) return;
            setStatus('declined');
            setErrorMessage(`Tu pago fue ${String(paymentData.status).toLowerCase()}. Por favor, intenta de nuevo o contacta a tu banco.`);
            setShouldPoll(false);
            return;
          } else {
            // exists but still pending/unknown -> keep polling
            console.log('StatusPage - payment_references exists but pending/unknown:', paymentData.status);
            return;
          }
        }

        // 2) Fallback: query payment_codes where transactionId == tx
        console.log('StatusPage - payment_references doc not found, querying payment_codes for transactionId ==', tx);
        const codesCol = collection(firestore, 'payment_codes');
        const q = query(codesCol, where('transactionId', '==', tx));
        const qSnap = await getDocs(q);

        if (!qSnap.empty) {
          const codeDoc = qSnap.docs[0];
          const codeData = codeDoc.data() as any;
          console.log('StatusPage - found payment_code via fallback:', { id: codeDoc.id, data: codeData });

          if (codeData.status === 'APPROVED' && codeData.registrationCode) {
            if (!isMounted) return;
            setRegistrationCode(codeData.registrationCode);
            setStatus('success');
            setShouldPoll(false);
            return;
          } else {
            if (!isMounted) return;
            setStatus('declined');
            setErrorMessage(`Pago detectado pero con estado: ${codeData.status || 'UNKNOWN'}.`);
            setShouldPoll(false);
            return;
          }
        }

        console.log('StatusPage - no payment_references or payment_codes found yet for tx:', tx);
      } catch (err) {
        console.error('StatusPage - error while checking payment status:', err);
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage('Hubo un error al verificar tu pago. Por favor contacta soporte con tu ID de transacción.');
        setShouldPoll(false);
      }
    };

    // Immediate check, then interval
    findPayment();
    const interval = setInterval(findPayment, 5000);

    // Stop polling after 10 minutes
    const timeout = setTimeout(() => {
      if (shouldPoll) {
        setStatus('error');
        setErrorMessage('No pudimos confirmar tu pago después de 10 minutos. Si el pago fue debitado, por favor contacta a soporte con tu ID de transacción.');
        setShouldPoll(false);
      }
    }, 600000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [tx, firestore, shouldPoll]);

  // Redirect to registro when we have the code
  useEffect(() => {
    if (status === 'success' && registrationCode) {
      const timer = setTimeout(() => {
        router.push(`/registro?code=${registrationCode}`);
      }, 1200); // corto delay para UX
      return () => clearTimeout(timer);
    }
  }, [status, registrationCode, router]);

  if (!tx && status === 'loading') {
    // still determining tx param
    return null;
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
            <p className="text-sm text-muted-foreground mt-2">ID: {tx}</p>
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
