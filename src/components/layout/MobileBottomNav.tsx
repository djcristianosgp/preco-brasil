import { Barcode, ChartLine, List, Map } from 'lucide-react';
import type { MobileTab } from '@/types/pricing';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
}

const NAV_ITEMS: Array<{ id: MobileTab; label: string; icon: typeof Map }> = [
  { id: 'mapa', label: 'Mapa', icon: Map },
  { id: 'itens', label: 'Itens', icon: List },
  { id: 'historico', label: 'Histórico', icon: ChartLine },
  { id: 'codigo', label: 'Código', icon: Barcode },
];

export function MobileBottomNav({ activeTab, onSelectTab }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal mobile"
      className="safe-pb fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'stroke-[2.25]' : ''}`} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
