import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Tags } from 'lucide-react';
import { collection, db, onSnapshot, orderBy, query } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '../lib/utils';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './TransactionForm';
import type { CategoryRecord, TransactionType } from './financeTypes';

interface CategoriesPageProps {
  householdId: string;
}

export function CategoriesPage({ householdId }: CategoriesPageProps) {
  const [activeType, setActiveType] = useState<TransactionType>('expense');
  const [customCategories, setCustomCategories] = useState<CategoryRecord[]>([]);

  useEffect(() => {
    const path = `households/${householdId}/categories`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const categories = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<CategoryRecord, 'id'>),
        }));
        setCustomCategories(categories);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [householdId]);

  const categories = useMemo(() => {
    const defaults = activeType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const customs = customCategories.filter((item) => item.type === activeType).map((item) => item.name);

    return [
      ...defaults.map((name) => ({ name, source: 'Default' })),
      ...customs.map((name) => ({ name, source: 'Custom' })),
    ];
  }, [activeType, customCategories]);

  const activeDefaultCount = activeType === 'income' ? INCOME_CATEGORIES.length : EXPENSE_CATEGORIES.length;
  const activeCustomCount = customCategories.filter((item) => item.type === activeType).length;
  const activeTone = activeType === 'income'
    ? {
        label: 'Pemasukan',
        text: 'text-emerald-700',
        soft: 'bg-emerald-50',
        border: 'border-emerald-100',
        icon: <ArrowDownRight className="h-4 w-4" />,
      }
    : {
        label: 'Pengeluaran',
        text: 'text-rose-700',
        soft: 'bg-rose-50',
        border: 'border-rose-100',
        icon: <ArrowUpRight className="h-4 w-4" />,
      };

  return (
    <div className="space-y-6 pb-10">
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500">Kategori</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Daftar Kategori</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">Kategori yang tersedia saat mencatat transaksi.</p>
      </div>

      <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setActiveType('income')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
            activeType === 'income' ? 'bg-white text-emerald-700 shadow-sm shadow-slate-200/80' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <ArrowDownRight className="h-4 w-4" />
          <span>Pemasukan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveType('expense')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
            activeType === 'expense' ? 'bg-white text-rose-700 shadow-sm shadow-slate-200/80' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Pengeluaran</span>
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/60">
        <div className="pr-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Total</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{categories.length}</p>
        </div>
        <div className="px-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Bawaan</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{activeDefaultCount}</p>
        </div>
        <div className="pl-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Custom</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{activeCustomCount}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', activeTone.soft, activeTone.text)}>
              {activeTone.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Aktif</p>
              <h3 className="text-base font-bold text-slate-950">{activeTone.label}</h3>
            </div>
          </div>
          <span className={cn('rounded-full border px-3 py-1 text-xs font-bold', activeTone.border, activeTone.soft, activeTone.text)}>
            {categories.length} kategori
          </span>
        </div>

        <div className="px-4">
        {categories.map((category, index) => (
          <div key={`${category.source}-${category.name}`} className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', activeTone.soft, activeTone.text)}>
                <Tags className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">{category.name}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">Kode kategori {String(index + 1).padStart(2, '0')}</p>
              </div>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
                category.source === 'Custom' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'
              )}
            >
              {category.source === 'Custom' ? 'Custom' : 'Default'}
            </span>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
