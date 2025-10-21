
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
import { useUser } from '@/context/user-context';
import Logo from './logo';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/context/language-context';
import { addMonths, format, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase/provider';

export default function DetailsForm() {
  const { user: userData, saveUserData, logout } = useUser();
  const { t } = useLanguage();
  const router = useRouter();
  const auth = useAuth();

  const formSchema = z.object({
    name: z.string().min(2, t('details.name_min_length')),
    age: z.coerce.number().int().positive(t('details.age_positive')).min(12, t('details.age_min')),
    heightCm: z.coerce.number().positive(t('details.height_positive')),
    weightKg: z.coerce.number().positive(t('details.weight_positive')),
    sex: z.enum(['male', 'female'], { required_error: t('details.sex_required') }),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active'], { required_error: t('details.activity_level_required') }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: userData?.name || '',
      age: userData?.age || undefined,
      heightCm: userData?.heightCm || undefined,
      weightKg: userData?.weightKg || undefined,
      sex: userData?.sex || undefined,
      activityLevel: userData?.activityLevel || undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      saveUserData(currentUser.uid, values);
    } else {
      console.error("User not authenticated, cannot save data.");
      // Optionally, show a toast to the user
    }
  };

  const isProfileLocked = () => {
    if (!userData?.detailsLastUpdatedAt) {
      return false;
    }
    const lastUpdateDate = new Date(userData.detailsLastUpdatedAt);
    const unlockDate = addMonths(lastUpdateDate, 1); // Changed to 1 month
    return isAfter(unlockDate, new Date());
  };

  const getUnlockDate = () => {
    if (!userData?.detailsLastUpdatedAt) return '';
    const lastUpdateDate = new Date(userData.detailsLastUpdatedAt);
    const unlockDate = addMonths(lastUpdateDate, 1); // Changed to 1 month
    return format(unlockDate, "d 'de' MMMM 'de' yyyy", { locale: es });
  };
  
  const locked = isProfileLocked();
  const unlockDate = getUnlockDate();


  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <div className="mb-4">
            <Logo />
        </div>
        <CardTitle>{t('details.title')}</CardTitle>
        <CardDescription>
          {t('details.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {locked && (
            <Alert className="mb-6 bg-yellow-50 border-yellow-200">
                <Info className="h-4 w-4 text-yellow-700"/>
                <AlertTitle className="text-yellow-800 font-semibold">Tus datos están bloqueados</AlertTitle>
                <AlertDescription className="text-yellow-700">
                    Para asegurar la consistencia de tu plan, solo puedes actualizar tus datos y objetivo cada mes. Podrás actualizarlos de nuevo el <strong>{unlockDate}</strong>.
                </AlertDescription>
            </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('details.name_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('details.name_placeholder')} {...field} disabled={locked}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('details.age_label')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25" {...field} value={field.value ?? ''} disabled={locked}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heightCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('details.height_label')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="170" {...field} step="0.1" value={field.value ?? ''} disabled={locked}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('details.weight_label')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="70" {...field} step="0.1" value={field.value ?? ''} disabled={locked}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>{t('details.sex_label')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                      disabled={locked}
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="male" />
                        </FormControl>
                        <FormLabel className="font-normal">{t('details.sex_male')}</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="female" />
                        </FormControl>
                        <FormLabel className="font-normal">{t('details.sex_female')}</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('details.activity_level_label')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={locked}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('details.activity_level_placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sedentary">{t('details.activity_sedentary')}</SelectItem>
                      <SelectItem value="light">{t('details.activity_light')}</SelectItem>
                      <SelectItem value="moderate">{t('details.activity_moderate')}</SelectItem>
                      <SelectItem value="active">{t('details.activity_active')}</SelectItem>
                      <SelectItem value="very_active">{t('details.activity_very_active')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between items-center pt-4">
              <Button type="button" variant="ghost" onClick={logout}>{t('details.logout_button')}</Button>
              <Button type="submit" variant="default" disabled={locked}>{t('details.continue_button')}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
