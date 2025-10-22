import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-3xl">Política de Privacidad</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none space-y-4">
            <p><strong>Fecha de Entrada en Vigor:</strong> 20 de septiembre de 2025</p>
            <p>
              Que hay Pa’ hoy ("nosotros") recopila y trata los datos personales de los usuarios ("usted") con el fin de ofrecer la Guía de Nutrición Digital.
            </p>

            <h2 className="font-bold text-xl">1. DATOS RECOPILADOS</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Nombre, correo electrónico, edad, sexo/género, peso, talla/altura, nivel de actividad física.</li>
              <li>Datos de acceso: usuario y contraseña.</li>
              <li>Datos de facturación y pago procesados por Wompi.</li>
            </ul>

            <h2 className="font-bold text-xl">2. FINALIDAD</h2>
            <p>Los datos se utilizan para:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Crear y administrar cuentas de usuario.</li>
              <li>Personalizar menús de nutrición usando la fórmula de Harris-Benedict.</li>
              <li>Procesar pagos y facturación mediante Wompi.</li>
              <li>Cumplir obligaciones legales y de seguridad.</li>
            </ul>

            <h2 className="font-bold text-xl">3. RETENCIÓN</h2>
            <p>
              Los datos se conservarán mientras la cuenta esté activa. Los datos de facturación se gestionan y conservan según la política de Wompi.
            </p>

            <h2 className="font-bold text-xl">4. DERECHOS DEL USUARIO</h2>
            <p>
              El usuario puede acceder, actualizar, rectificar o eliminar sus datos, escribiendo a quehaypahoyrecetas@gmail.com.
            </p>

            <h2 className="font-bold text-xl">5. TRANSFERENCIA INTERNACIONAL</h2>
            <p>
              La app usa Google Firebase y servidores de Google, lo cual puede implicar almacenamiento fuera de Colombia.
            </p>

            <h2 className="font-bold text-xl">6. CONTACTO</h2>
            <p>
              quehaypahoyrecetas@gmail.com
            </p>

            <div className="text-center pt-6">
                <Button asChild>
                    <Link href="/">Volver al Inicio</Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
