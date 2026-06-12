'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface CardItem {
  key?: string;
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  color?: string;
  badge?: string;
  disabled?: boolean;
}

interface CardMapPageProps {
  title: string;
  subtitle?: string;
  cards: CardItem[];
  columns?: 2 | 3 | 4;
}

export function CardMapPage({ title, subtitle, cards, columns = 3 }: CardMapPageProps) {
  const router = useRouter();

  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  const handleCardClick = (href: string, disabled?: boolean) => {
    if (disabled) return;
    router.push(href);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
      </div>
      
      <div className={`grid ${gridCols[columns]} gap-4`}>
        {cards.map((card) => (
          <div
            key={card.key}
            onClick={() => handleCardClick(card.href, card.disabled)}
            className={`
              relative bg-white rounded-xl border border-slate-200 p-5
              transition-all duration-200 cursor-pointer
              ${card.disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/50'
              }
            `}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
                  {card.badge && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">{card.description}</p>
              </div>
              <ChevronRight className="flex-shrink-0 w-5 h-5 text-slate-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
