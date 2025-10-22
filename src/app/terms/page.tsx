import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TermsAndConditionsPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-3xl">Términos y Condiciones</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none space-y-4">
            <p><strong>Fecha de Entrada en Vigor:</strong> 20 de septiembre de 2025</p>
            
            <h2 className="font-bold text-xl">1. ACEPTACIÓN</h2>
            <p>
              Al registrarse en la app y usar "Que hay Pa’ hoy", el usuario confirma que es mayor de 18 años y acepta estos Términos.
            </p>

            <h2 className="font-bold text-xl">2. NATURALEZA DEL SERVICIO</h2>
            <p>
              "Que hay Pa’ hoy" ofrece recomendaciones generales de nutrición basadas en la fórmula de Harris-Benedict. No sustituye diagnóstico ni tratamiento profesional.
            </p>
            <p>
              El contenido fue avalado por un nutricionista profesional en Colombia de la Universidad Javeriana. El aval es general y no constituye prescripción personalizada.
            </p>

            <h2 className="font-bold text-xl">3. EXCLUSIONES DE USO</h2>
            <p>
              No debe usarse por menores de edad ni por personas con condiciones médicas que requieran supervisión profesional.
            </p>

            <h2 className="font-bold text-xl">4. PAGOS Y REEMBOLSOS</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Modelo:</strong> pago único de $50.000 COP (sin IVA).</li>
              <li><strong>Procesador:</strong> Wompi.</li>
              <li><strong>Política:</strong> no hay reembolsos en productos digitales.</li>
            </ul>

            <h2 className="font-bold text-xl">5. RESPONSABILIDAD</h2>
            <p>
              No nos hacemos responsables de efectos adversos derivados del uso de la app. El usuario es responsable de consultar a un profesional de la salud antes de modificar su dieta.
            </p>

            <h2 className="font-bold text-xl">6. PROPIEDAD INTELECTUAL</h2>
            <p>
              Todo el contenido de la app es propiedad de Que hay Pa’ hoy.
            </p>

            <h2 className="font-bold text-xl">7. LEGISLACIÓN</h2>
            <p>
              Estos términos se rigen por las leyes de la República de Colombia.
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
