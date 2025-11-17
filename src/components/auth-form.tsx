
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
import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
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

interface AuthFormProps {
  defaultTab?: 'login' | 'signup';
}

export default function AuthForm({ defaultTab = 'login' }: AuthFormProps) {
  const { t, setLanguage, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { auth, firebaseApp } = useFirebase();
  
  const registrationCode = searchParams.get('code');
  const initialTab = registrationCode ? 'signup' : defaultTab;

  const loginSchema = z.object({
    email: z.string().email(t('auth.email_invalid')).min(1, t('auth.email_required')),
    password: z.string().min(1, t('auth.password_required')),
  });

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

  useEffect(() => {
    if (registrationCode) {
      signupForm.setValue('registrationCode', registrationCode);
    }
  }, [registrationCode, signupForm]);


  const onLogin = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      if (!auth) throw new Error("Auth service not available");
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: '¡Bienvenido de nuevo!',
        description: 'Has iniciado sesión correctamente.',
      });
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
      const functions = getFunctions(firebaseApp);
      const registerWithCode = httpsCallable(functions, 'registerWithCode');
      
      const result: any = await registerWithCode({
        email: values.email,
        password: values.password,
        registrationCode: values.registrationCode,
      });

      const customToken = result.data.customToken;
      if (customToken) {
        await signInWithCustomToken(auth, customToken);
        toast({
          title: '¡Cuenta Creada!',
          description: 'Tu cuenta ha sido creada con éxito. Ahora completa tus datos.',
        });
      } else {
        throw new Error('No se recibió el token de autenticación.');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        variant: 'destructive',
        title: 'Error en el Registro',
        description: error.message || 'Ocurrió un error inesperado.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTabChange = (value: string) => {
    if (value === 'signup') {
      router.push('/registro');
    } else {
      router.push('/');
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
        <Tabs defaultValue={initialTab} className="w-full" onValueChange={handleTabChange}>
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
                                  {language === 'es' ? 'Fecha de Entrada en Vigor: 20 de septiembre de 2025' : 'Effective Date: September 20, 2025'}
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="h-96 pr-6">
                                {language === 'es' ? (
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
                                ) : (
                                  <div className="prose dark:prose-invert max-w-none space-y-4 text-sm">
                                    <h3 className="font-bold text-lg">1. ACCEPTANCE</h3>
                                    <p>By registering in the app and using "Que hay Pa’ hoy," the user confirms they are over 18 years old and agree to these Terms.</p>
                                    <h3 className="font-bold text-lg">2. NATURE OF THE SERVICE</h3>
                                    <p>"Que hay Pa’ hoy" provides general nutrition recommendations based on the Harris-Benedict formula. It does not replace diagnosis or professional treatment.</p>
                                    <p>The content was reviewed by a professional nutritionist in Colombia from Universidad Javeriana. This review is general and does not constitute personalized prescription.</p>
                                    <h3 className="font-bold text-lg">3. EXCLUSIONS OF USE</h3>
                                    <p>The app must not be used by minors or by individuals with medical conditions requiring professional supervision.</p>
                                    <h3 className="font-bold text-lg">4. PAYMENTS AND REFUNDS</h3>
                                    <ul className="list-disc pl-5 space-y-2">
                                      <li>Model: one-time payment of COP $50,000 (VAT excluded).</li>
                                      <li>Processor: Wompi.</li>
                                      <li>Policy: no refunds for digital products.</li>
                                    </ul>
                                    <h3 className="font-bold text-lg">5. LIABILITY</h3>
                                    <p>We are not responsible for adverse effects derived from the use of the app. Users are responsible for consulting a health professional before making dietary changes.</p>
                                    <h3 className="font-bold text-lg">6. INTELLECTUAL PROPERTY</h3>
                                    <p>All app content is property of Que hay Pa’ hoy.</p>
                                    <h3 className="font-bold text-lg">7. GOVERNING LAW</h3>
                                    <p>These terms are governed by the laws of the Republic of Colombia.</p>
                                  </div>
                                )}
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
                                  {language === 'es' ? 'Fecha de Entrada en Vigor: 20 de septiembre de 2025' : 'Effective Date: September 20, 2025'}
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="h-96 pr-6">
                                {language === 'es' ? (
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
                                ) : (
                                  <div className="prose dark:prose-invert max-w-none space-y-4 text-sm">
                                    <p>Que hay Pa’ hoy ("we") collects and processes personal data of users ("you") in order to provide the Digital Nutrition Guide.</p>
                                    <h3 className="font-bold text-lg">1. DATA COLLECTED</h3>
                                    <ul className="list-disc pl-5 space-y-2">
                                      <li>Name, email address, age, sex/gender, weight, height, physical activity level.</li>
                                      <li>Access data: username and password.</li>
                                      <li>Billing and payment data processed through Wompi.</li>
                                    </ul>
                                    <h3 className="font-bold text-lg">2. PURPOSE</h3>
                                    <p>The data is used to:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                      <li>Create and manage user accounts.</li>
                                      <li>Personalize nutrition menus using the Harris-Benedict formula.</li>
                                      <li>Process payments and billing via Wompi.</li>
                                      <li>Comply with legal and security obligations.</li>
                                    </ul>
                                    <h3 className="font-bold text-lg">3. RETENTION</h3>
                                    <p>Data will be kept as long as the account is active. Billing data is managed and retained according to Wompi's policies.</p>
                                    <h3 className="font-bold text-lg">4. USER RIGHTS</h3>
                                    <p>Users may access, update, rectify, or delete their data by writing to quehaypahoyrecetas@gmail.com.</p>
                                    <h3 className="font-bold text-lg">5. INTERNATIONAL TRANSFER</h3>
                                    <p>The app uses Google Firebase and Google servers, which may imply storage outside Colombia.</p>
                                    <h3 className="font-bold text-lg">6. CONTACT</h3>
                                    <p>quehaypahoyrecetas@gmail.com</p>
                                  </div>
                                )}
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
                <div className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">{t('auth.contact_for_access')}</p>
                  <Button asChild>
                    <Link href="/checkout">
                      {t('auth.get_code_link')}
                    </Link>
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
