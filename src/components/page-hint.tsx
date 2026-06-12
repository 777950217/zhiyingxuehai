import { Info } from 'lucide-react';

/**
 * Consistent info hint banner used across feature pages.
 * Light blue background + left border + Info icon.
 * Supports both `text` prop and `children` for flexibility.
 */
export function PageHint({ text, children }: { text?: string; children?: React.ReactNode }) {
  const content = text || children;
  return (
    <div className="flex items-start gap-2 rounded-md border-l-4 border-sky-400 bg-sky-50 px-3 py-2 text-sm text-sky-800">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
      <span>{content}</span>
    </div>
  );
}
