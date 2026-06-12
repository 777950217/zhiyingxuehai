'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  className?: string;
  label?: string;
}

export function BackButton({ className = '', label = '返回上一页' }: BackButtonProps) {
  const router = useRouter();
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className={`mb-4 text-slate-600 hover:text-slate-900 ${className}`}
    >
      <ArrowLeft className="w-4 h-4 mr-1" />
      {label}
    </Button>
  );
}
