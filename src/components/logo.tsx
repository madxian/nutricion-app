import { UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

export default function Logo() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center gap-2">
      <UtensilsCrossed className="h-8 w-8 text-primary" />
      <h1 className="text-3xl font-bold font-headline text-gray-800">
        {t('auth.title')}
      </h1>
    </div>
  );
}
