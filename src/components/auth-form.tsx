
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Logo from './logo';
import { useLanguage } from '@/context/language-context';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/context/user-context';
import { useAuth, useFirebase } from '@/firebase/provider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AuthForm() {
  const { t, setLanguage, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const { firestore } = useFirebase();
  const { saveUserData } = useUser();
  
  const registrationCode = searchParams.get('code');

  const loginSchema = z.object({
    email: z.string().email(t('auth.email_invalid')).min(1, t('auth.email_required')),
    password: z.string().min(1, t('auth.password_required')),
  });

  // We need to pass `t` to the function to get the latest translations
  const getSignupSchema = (t: (key: string) => string) => z.object({
    email: z.string().email(t('auth.email_invalid')).min(1, t('auth.email_required')),
    password: z.string().min(6, t('auth.password_min_length')),
    confirmPassword: z.string(),
    registrationCode: z.string().min(1, t('auth.registration_code_required')),
    acceptTerms: z.boolean().refine(val => val === true, { message: t('auth.accept_terms_error') }),
    acceptPrivacy: z.boolean().refine(val => val === true, { message: t('auth.accept_privacy_error') }),
    isAdult: z.boolean().refine(val => val === true, { message: t('auth.is_adult_error') }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.passwords_no_match'),
    path: ['confirmPassword'],
  });

  const [signupSchema, setSignupSchema] = useState(() => getSignupSchema(t));

  useEffect(() => {
    setSignupSchema(getSignupSchema(t));
  }, [t]);


  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<z.infer<ReturnType<typeof getSignupSchema>>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      email: '', 
      password: '', 
      confirmPassword: '',
      registrationCode: registrationCode || '',
      acceptTerms: false,
      acceptPrivacy: false,
      isAdult: false,
    },
  });

  // Effect to update form value if URL code changes
  useEffect(() => {
    if (registrationCode) {
      signupForm.setValue('registrationCode', registrationCode);
    }
  }, [registrationCode, signupForm]);


  const onLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: '¡Bienvenido de nuevo!',
        description: 'Has iniciado sesión correctamente.',
      });
      // The provider will handle redirection
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSignup = async (values: z.infer<ReturnType<typeof getSignupSchema>>) => {
    setIsLoading(true);
    try {
      // Step 1: Verify the registration code in Firestore
      const codeRef = doc(firestore, 'payment_codes', values.registrationCode);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists() || codeSnap.data()?.status !== 'APPROVED' || codeSnap.data()?.used) {
        toast({
            variant: 'destructive',
            title: 'Código Inválido',
            description: 'El código de registro no es válido, ya fue utilizado o ha expirado.',
        });
        setIsLoading(false);
        return;
      }
      
      // Step 2: Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Step 3: Create user document in Firestore via context
      if (user) {
        await saveUserData(user.uid, {
            email: values.email,
        });
        
        // Step 4: Mark the registration code as used
        await setDoc(codeRef, { used: true, usedBy: user.uid, usedAt: new Date().toISOString() }, { merge: true });
      }

      toast({
        title: '¡Cuenta Creada!',
        description: 'Tu cuenta ha sido creada con éxito. Ahora completa tus datos.',
      });
      // The provider will handle redirection to /details
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error en el Registro',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-2xl">
      <CardHeader className="text-center">
        <div className="mb-4">
            <Logo />
        </div>
        <CardDescription>
          {t('auth.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center gap-2 mb-4">
          <Button variant={language === 'es' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('es')}>Español</Button>
          <Button variant={language === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('en')}>English</Button>
        </div>
        <Tabs defaultValue={registrationCode ? 'signup' : 'login'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t('auth.login_tab')}</TabsTrigger>
            <TabsTrigger value="signup">{t('auth.signup_tab')}</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6 pt-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.email_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder="tu@correo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.password_label')}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" variant="default" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.login_button')}
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="signup">
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4 pt-4">
                 <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.email_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder="tu@correo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.password_label')}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.confirm_password_label')}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="registrationCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.registration_code_label')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('auth.registration_code_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          {t('auth.accept_terms_prefix')}{' '}
                          <Dialog>
                            <DialogTrigger asChild>
                              <span className="underline hover:text-primary cursor-pointer">{t('auth.terms_title')}</span>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle className="text-2xl">{t('auth.terms_title')}</DialogTitle>
                                <DialogDescription>
                                  Fecha de Entrada en Vigor: 20 de septiembre de 2025
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="h-96 pr-6">
                                <div className="prose dark:prose-invert max-w-none space-y-4 text-sm">
                                  <h3 className="font-bold text-lg">1. ACEPTACIÓN</h3>
                                  <p>Al registrarse en la app y usar "Que hay Pa’ hoy", el usuario confirma que es mayor de 18 años y acepta estos Términos.</p>
                                  <h3 className="font-bold text-lg">2. NATURALEZA DEL SERVICIO</h3>
                                  <p>"Que hay Pa’ hoy" ofrece recomendaciones generales de nutrición basadas en la fórmula de Harris-Benedict. No sustituye diagnóstico ni tratamiento profesional.</p>
                                  <p>El contenido fue avalado por un nutricionista profesional en Colombia de la Universidad Javeriana. El aval es general y no constituye prescripción personalizada.</p>
                                  <h3 className="font-bold text-lg">3. EXCLUSIONES DE USO</h3>
                                  <p>No debe usarse por menores de edad ni por personas con condiciones médicas que requieran supervisión profesional.</p>
                                  <h3 className="font-bold text-lg">4. PAGOS Y REEMBOLSOS</h3>
                                  <ul className="list-disc pl-5 space-y-2">
                                    <li>Modelo: pago único de $50.000 COP (sin IVA).</li>
                                    <li>Procesador: Wompi.</li>
                                    <li>Política: no hay reembolsos en productos digitales.</li>
                                  </ul>
                                  <h3 className="font-bold text-lg">5. RESPONSABILIDAD</h3>
                                  <p>No nos hacemos responsables de efectos adversos derivados del uso de la app. El usuario es responsable de consultar a un profesional de la salud antes de modificar su dieta.</p>
                                  <h3 className="font-bold text-lg">6. PROPIEDAD INTELECTUAL</h3>
                                  <p>Todo el contenido de la app es propiedad de Que hay Pa’ hoy.</p>
                                  <h3 className="font-bold text-lg">7. LEGISLACIÓN</h3>
                                  <p>Estos términos se rigen por las leyes de la República de Colombia.</p>
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="acceptPrivacy"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          {t('auth.accept_privacy_prefix')}{' '}
                           <Dialog>
                            <DialogTrigger asChild>
                               <span className="underline hover:text-primary cursor-pointer">{t('auth.privacy_title')}</span>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle className="text-2xl">{t('auth.privacy_title')}</DialogTitle>
                                <DialogDescription>
                                  Fecha de Entrada en Vigor: 20 de septiembre de 2025
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="h-96 pr-6">
                                <div className="prose dark:prose-invert max-w-none space-y-4 text-sm">
                                  <p>Que hay Pa’ hoy ("nosotros") recopila y trata los datos personales de los usuarios ("usted") con el fin de ofrecer la Guía de Nutrición Digital.</p>
                                  <h3 className="font-bold text-lg">1. DATOS RECOPILADOS</h3>
                                  <ul className="list-disc pl-5 space-y-2">
                                    <li>Nombre, correo electrónico, edad, sexo/género, peso, talla/altura, nivel de actividad física.</li>
                                    <li>Datos de acceso: usuario y contraseña.</li>
                                    <li>Datos de facturación y pago procesados por Wompi.</li>
                                  </ul>
                                  <h3 className="font-bold text-lg">2. FINALIDAD</h3>
                                  <p>Los datos se utilizan para:</p>
                                  <ul className="list-disc pl-5 space-y-2">
                                    <li>Crear y administrar cuentas de usuario.</li>
                                    <li>Personalizar menús de nutrición usando la fórmula de Harris-Benedict.</li>
                                    <li>Procesar pagos y facturación mediante Wompi.</li>
                                    <li>Cumplir obligaciones legales y de seguridad.</li>
                                  </ul>
                                  <h3 className="font-bold text-lg">3. RETENCIÓN</h3>
                                  <p>Los datos se conservarán mientras la cuenta esté activa. Los datos de facturación se gestionan y conservan según la política de Wompi.</p>
                                  <h3 className="font-bold text-lg">4. DERECHOS DEL USUARIO</h3>
                                  <p>El usuario puede acceder, actualizar, rectificar o eliminar sus datos, escribiendo a quehaypahoyrecetas@gmail.com.</p>
                                  <h3 className="font-bold text-lg">5. TRANSFERENCIA INTERNACIONAL</h3>
                                  <p>La app usa Google Firebase y servidores de Google, lo cual puede implicar almacenamiento fuera de Colombia.</p>
                                  <h3 className="font-bold text-lg">6. CONTACTO</h3>
                                  <p>quehaypahoyrecetas@gmail.com</p>
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="isAdult"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          {t('auth.is_adult_label')}
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" variant="default" disabled={isLoading}>
                   {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.signup_button')}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {t('auth.contact_for_access')}{' '}
                  <Link href="/checkout" className="underline hover:text-primary">
                    {t('auth.get_code_link')}
                  </Link>
                </p>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
