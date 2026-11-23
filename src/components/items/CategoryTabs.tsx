import {
  Apple,
  Fuel,
  HardHat,
  Layers,
  Pill,
  ShoppingBasket,
  Zap,
} from 'lucide-react';
import type { CatalogItem, ItemCategory } from '@/types/pricing';

interface CategoryTabsProps {
  catalog: CatalogItem[];
  selectedCategory: ItemCategory;
  onSelectCategory: (category: ItemCategory) => void;
}

const CATEGORY_DEFS: Array<{
  id: ItemCategory;
  label: string;
  icon: typeof Fuel;
}> = [
  { id: 'combustiveis', label: 'Combustíveis', icon: Fuel },
  { id: 'energia', label: 'Energia & Gás', icon: Zap },
  { id: 'cesta-basica', label: 'Cesta Básica', icon: ShoppingBasket },
  { id: 'hortifruti', label: 'Hortifrúti', icon: Apple },
  { id: 'medicamentos', label: 'Medicamentos', icon: Pill },
  { id: 'construcao', label: 'Construção', icon: HardHat },
  { id: 'all', label: 'Todos', icon: Layers },
];

export function CategoryTabs({
  catalog,
  selectedCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  return (
    <nav
      aria-label="Categorias econômicas"
      className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1"
    >
      {CATEGORY_DEFS.map(({ id, label, icon: Icon }) => {
        const count =
          id === 'all'
            ? catalog.length
            : catalog.filter((item) => item.category === id).length;
        if (id !== 'all' && count === 0) return null;

        const active = selectedCategory === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectCategory(id)}
            aria-pressed={active}
            className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'border-border bg-surface text-muted-foreground hover:border-primary/30 hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{label}</span>
            <span
              className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                active ? 'bg-primary/15 text-primary' : 'bg-surface-muted text-muted-foreground'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
