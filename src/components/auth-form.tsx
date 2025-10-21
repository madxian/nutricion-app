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

  const signupSchema = z.object({
    registrationCode: z.string().min(1, t('auth.registration_code_required')),
    email: z.string().email(t('auth.email_invalid')).min(1, t('auth.email_required')),
    password: z.string().min(6, t('auth.password_min_length')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.passwords_no_match'),
    path: ['confirmPassword'],
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      registrationCode: registrationCode || '', 
      email: '', 
      password: '', 
      confirmPassword: '' 
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

  const onSignup = async (values: z.infer<typeof signupSchema>) => {
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
          Tu guía de nutrición con el sazón Colombiano
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center gap-2 mb-4">
          <Button variant={language === 'es' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('es')}>Español</Button>
          <Button variant={language === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('en')}>English</Button>
        </div>
        <Tabs defaultValue="login" className="w-full">
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
              <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-6 pt-4">
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
                <Button type="submit" className="w-full" variant="default" disabled={isLoading}>
                   {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.signup_button')}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <a href="/checkout" className="underline hover:text-primary">
                    {t('auth.get_code_link')}
                  </a>
                </p>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
