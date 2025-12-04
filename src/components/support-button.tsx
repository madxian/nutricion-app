'use client';

import { Button } from '@/components/ui/button';
import { LifeBuoy } from 'lucide-react';

export default function SupportButton() {
  const handleSupportClick = () => {
    // Open email client to contact support
    window.location.href = 'mailto:quehaypahoyrecetas@gmail.com?subject=Soporte%20App%20Nutrición';
  };

  return (
    <Button
      variant="destructive"
      className="fixed top-4 right-4 z-50 shadow-lg"
      onClick={handleSupportClick}
    >
      <LifeBuoy className="mr-2 h-4 w-4" />
      Contactar a Soporte
    </Button>
  );
}
