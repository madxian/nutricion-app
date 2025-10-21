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
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUser } from '@/context/user-context';
import Logo from './logo';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { addMonths, format, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

const GoalEnum = z.enum(['gain', 'lose', 'maintain']);
const formSchema = z.object({
  goal: GoalEnum,
});

export default function GoalForm() {
  const { user: userData, saveGoal } = useUser();
  const router = useRouter();
  const { t } = useLanguage();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goal: userData?.goal || 'maintain',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setFormData(values);
    setIsConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (formData) {
      await saveGoal(formData.goal, true); // Pass true to set the timestamp
    }
    setIsConfirmOpen(false);
  };

  const isProfileLocked = () => {
    if (!userData?.detailsLastUpdatedAt) {
      return false;
    }
    const lastUpdateDate = new Date(userData.detailsLastUpdatedAt);
    const unlockDate = addMonths(lastUpdateDate, 1);
    return isAfter(unlockDate, new Date());
  };

  const locked = isProfileLocked();

  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <div className="mb-4">
          <Logo />
        </div>
        <CardTitle>{t('goal.title')}</CardTitle>
        <CardDescription>
          {t('goal.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                      disabled={locked}
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4 transition-all hover:bg-secondary/50 has-[:checked]:bg-secondary">
                        <FormControl>
                          <RadioGroupItem value="lose" />
                        </FormControl>
                        <FormLabel className="font-normal w-full cursor-pointer">
                          {t('goal.lose_weight')}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4 transition-all hover:bg-secondary/50 has-[:checked]:bg-secondary">
                        <FormControl>
                          <RadioGroupItem value="maintain" />
                        </FormControl>
                        <FormLabel className="font-normal w-full cursor-pointer">
                          {t('goal.maintain_weight')}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4 transition-all hover:bg-secondary/50 has-[:checked]:bg-secondary">
                        <FormControl>
                          <RadioGroupItem value="gain" />
                        </FormControl>
                        <FormLabel className="font-normal w-full cursor-pointer">
                          {t('goal.gain_weight')}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-between items-center">
                <Button type="button" variant="ghost" onClick={() => router.back()}>{t('goal.back_button')}</Button>
                <Button type="submit" variant="default" disabled={locked}>{t('goal.generate_plan_button')}</Button>
            </div>
          </form>
        </Form>
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar tu objetivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Una vez guardado, no podrás modificar tus datos ni tu objetivo por 1 mes para asegurar la consistencia del plan. ¿Estás seguro de que este es tu objetivo?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Regresar y cambiar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}>Confirmar y generar plan</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
