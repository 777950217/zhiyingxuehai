'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ConsultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

/**
 * 咨询开通弹窗 - 直接跳转到/contact联系页面
 */
export function ConsultDialog({ open, onOpenChange, title = '咨询开通' }: ConsultDialogProps) {
  const router = useRouter();

  useEffect(() => {
    if (open) {
      onOpenChange(false);
      router.push('/contact');
    }
  }, [open, onOpenChange, router]);

  return null;
}

/**
 * 便捷按钮组件：点击跳转到/contact联系页面
 */
export function ConsultButton({
  children,
  className = '',
  title = '咨询开通',
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const router = useRouter();

  return (
    <button className={className} onClick={() => router.push('/contact')}>
      {children || '咨询开通'}
    </button>
  );
}
