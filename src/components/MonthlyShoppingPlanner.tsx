import { useEffect, useMemo, useState } from 'react';
import { format, parseISO, subMonths } from 'date-fns';
import { deleteField } from 'firebase/firestore';
import {
  addDoc,
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn, formatCurrency } from '../lib/utils';
import type { ShoppingItemRecord } from './financeTypes';
import { ArchiveRestore, Check, ClipboardPlus, Pencil, ShoppingBasket, Trash2 } from 'lucide-react';

interface MonthlyShoppingPlannerProps {
  householdId: string;
}

interface ShoppingFormState {
  name: string;
  estimatedAmount: string;
  quantity: string;
  unit: string;
  notes: string;
}

const EMPTY_FORM: ShoppingFormState = {
  name: '',
  estimatedAmount: '',
  quantity: '',
  unit: '',
  notes: '',
};

function formatMonthLabel(monthKey: string) {
  return format(parseISO(`${monthKey}-01`), 'MMMM yyyy');
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export function MonthlyShoppingPlanner({ householdId }: MonthlyShoppingPlannerProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [items, setItems] = useState<ShoppingItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingPreviousMonth, setSyncingPreviousMonth] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<ShoppingFormState>(EMPTY_FORM);

  const previousMonthKey = useMemo(
    () => format(subMonths(parseISO(`${selectedMonth}-01`), 1), 'yyyy-MM'),
    [selectedMonth]
  );

  useEffect(() => {
    const path = `households/${householdId}/shoppingMonths/${selectedMonth}/items`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextItems = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<ShoppingItemRecord, 'id'>),
        }));
        setItems(nextItems);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [householdId, selectedMonth]);

  const summary = useMemo(() => {
    const totalItems = items.length;
    const checkedItems = items.filter((item) => item.isChecked).length;
    const estimatedTotal = items.reduce((total, item) => total + (item.estimatedAmount || 0), 0);
    const importedCount = items.filter((item) => item.lastImportedAt).length;

    return {
      totalItems,
      checkedItems,
      estimatedTotal,
      importedCount,
      completionRate: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0,
    };
  }, [items]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingItemId(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.currentUser || saving) return;

    const name = form.name.trim();
    const estimatedAmount = parseInt(form.estimatedAmount.replace(/\D/g, ''), 10) || 0;
    const quantity = form.quantity ? Number(form.quantity) : undefined;
    const unit = form.unit.trim();
    const notes = form.notes.trim();

    if (!name) return;

    setSaving(true);
    try {
      const path = `households/${householdId}/shoppingMonths/${selectedMonth}/items`;
      const payload = {
        name,
        estimatedAmount,
        quantity: quantity ?? deleteField(),
        unit: unit || deleteField(),
        notes: notes || deleteField(),
        updatedAt: new Date().toISOString(),
        authorUid: auth.currentUser.uid,
      };

      if (editingItemId) {
        await updateDoc(doc(db, `${path}/${editingItemId}`), payload);
      } else {
        await addDoc(collection(db, path), {
          ...payload,
          isChecked: false,
          createdAt: new Date().toISOString(),
        });
      }

      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingItemId ? OperationType.UPDATE : OperationType.CREATE, `households/${householdId}/shoppingMonths/${selectedMonth}/items`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChecked = async (item: ShoppingItemRecord) => {
    const path = `households/${householdId}/shoppingMonths/${selectedMonth}/items/${item.id}`;
    try {
      await updateDoc(doc(db, path), {
        isChecked: !item.isChecked,
        checkedAt: !item.isChecked ? new Date().toISOString() : deleteField(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleEdit = (item: ShoppingItemRecord) => {
    setEditingItemId(item.id);
    setForm({
      name: item.name,
      estimatedAmount: item.estimatedAmount ? new Intl.NumberFormat('id-ID').format(item.estimatedAmount) : '',
      quantity: item.quantity ? String(item.quantity) : '',
      unit: item.unit || '',
      notes: item.notes || '',
    });
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Hapus item belanja ini?')) return;

    const path = `households/${householdId}/shoppingMonths/${selectedMonth}/items/${itemId}`;
    try {
      await deleteDoc(doc(db, path));
      if (editingItemId === itemId) resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleCopyPreviousMonth = async () => {
    if (!auth.currentUser || syncingPreviousMonth) return;

    setSyncingPreviousMonth(true);
    try {
      const sourcePath = `households/${householdId}/shoppingMonths/${previousMonthKey}/items`;
      const targetPath = `households/${householdId}/shoppingMonths/${selectedMonth}/items`;
      const sourceSnapshot = await getDocs(query(collection(db, sourcePath), orderBy('createdAt', 'asc')));

      if (sourceSnapshot.empty) {
        alert(`Belum ada daftar belanja di ${formatMonthLabel(previousMonthKey)}.`);
        return;
      }

      const existingNames = new Set(items.map((item) => normalizeName(item.name)));
      const batch = writeBatch(db);
      let copiedCount = 0;

      sourceSnapshot.docs.forEach((snapshotDoc) => {
        const data = snapshotDoc.data() as Omit<ShoppingItemRecord, 'id'>;
        if (existingNames.has(normalizeName(data.name))) return;

        const targetRef = doc(collection(db, targetPath));
        batch.set(targetRef, {
          name: data.name,
          estimatedAmount: data.estimatedAmount || 0,
          ...(data.quantity ? { quantity: data.quantity } : {}),
          ...(data.unit ? { unit: data.unit } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
          isChecked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorUid: auth.currentUser?.uid,
        });
        existingNames.add(normalizeName(data.name));
        copiedCount += 1;
      });

      if (copiedCount === 0) {
        alert('Semua item dari bulan lalu sudah ada di bulan ini.');
        return;
      }

      await batch.commit();
      alert(`${copiedCount} item berhasil ditarik dari ${formatMonthLabel(previousMonthKey)}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `households/${householdId}/shoppingMonths/${selectedMonth}/items`);
    } finally {
      setSyncingPreviousMonth(false);
    }
  };

  const handleImportTransaction = async (item: ShoppingItemRecord) => {
    if (!auth.currentUser || importingId) return;
    if (item.estimatedAmount <= 0) {
      alert('Isi estimasi harga dulu sebelum dicatat ke transaksi.');
      return;
    }

    setImportingId(item.id);
    const transactionPath = `households/${householdId}/transactions`;
    const itemPath = `households/${householdId}/shoppingMonths/${selectedMonth}/items/${item.id}`;

    try {
      const transactionRef = await addDoc(collection(db, transactionPath), {
        householdId,
        type: 'expense',
        amount: item.estimatedAmount,
        category: 'Belanja Bulanan',
        note: item.notes ? `${item.name} - ${item.notes}` : item.name,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        authorUid: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || auth.currentUser.email || '',
      });

      await updateDoc(doc(db, itemPath), {
        isChecked: true,
        checkedAt: new Date().toISOString(),
        lastTransactionId: transactionRef.id,
        lastImportedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, transactionPath);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <section className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
            <ShoppingBasket className="h-5 w-5 text-amber-500" />
            <h3>Belanja Bulanan</h3>
          </div>
          <p className="text-sm text-slate-500">
            Simpan daftar belanja rumah tangga per bulan, tarik item dari bulan lalu, lalu catat ke transaksi saat benar-benar dibeli.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:min-w-56">
          <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Bulan aktif</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => {
              setSelectedMonth(event.target.value);
              resetForm();
            }}
            className="rounded-2xl border-none bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={handleCopyPreviousMonth}
            disabled={syncingPreviousMonth}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArchiveRestore className="h-4 w-4" />
            {syncingPreviousMonth ? 'Sedang menarik...' : `Tarik ${formatMonthLabel(previousMonthKey)}`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryTile label="Total item" value={`${summary.totalItems}`} tone="slate" />
        <SummaryTile label="Sudah dibeli" value={`${summary.checkedItems}`} tone="emerald" />
        <SummaryTile label="Estimasi total" value={formatCurrency(summary.estimatedTotal)} tone="amber" />
        <SummaryTile label="Masuk transaksi" value={`${summary.importedCount}`} tone="indigo" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Progress bulan ini</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {summary.totalItems === 0
                ? 'Belum ada daftar. Mulai dari item inti seperti beras, telur, minyak, dan sabun.'
                : `${summary.completionRate}% item sudah ditandai selesai.`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-slate-950">{summary.completionRate}%</p>
            <p className="text-xs text-slate-500">{summary.checkedItems}/{summary.totalItems || 0} item</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500 transition-all"
            style={{ width: `${Math.max(summary.totalItems > 0 ? summary.completionRate : 0, summary.totalItems > 0 ? 6 : 0)}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Nama item</label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Contoh: Beras 5kg"
            className="w-full rounded-xl border-none bg-white px-3 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Estimasi</label>
          <input
            type="tel"
            value={form.estimatedAmount}
            onChange={(event) => {
              const rawValue = event.target.value.replace(/\D/g, '');
              setForm((current) => ({
                ...current,
                estimatedAmount: rawValue ? new Intl.NumberFormat('id-ID').format(parseInt(rawValue, 10)) : '',
              }));
            }}
            placeholder="0"
            className="w-full rounded-xl border-none bg-white px-3 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Qty</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.quantity}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
            placeholder="1"
            className="w-full rounded-xl border-none bg-white px-3 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Satuan</label>
          <input
            type="text"
            value={form.unit}
            onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
            placeholder="kg / pcs"
            className="w-full rounded-xl border-none bg-white px-3 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Catatan</label>
          <input
            type="text"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Merek favorit atau prioritas"
            className="w-full rounded-xl border-none bg-white px-3 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : editingItemId ? 'Simpan perubahan' : 'Tambah item'}
          </button>
          {editingItemId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          Memuat daftar belanja...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Belum ada daftar</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">Mulai dari item yang paling rutin dibeli setiap bulan.</p>
          <p className="mt-1 text-sm text-slate-500">Setelah bulan pertama terisi, bulan berikutnya tinggal klik tarik dari bulan lalu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'rounded-2xl border px-4 py-4 transition-colors',
                item.isChecked ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white'
              )}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleChecked(item)}
                      className={cn(
                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                        item.isChecked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent hover:border-emerald-400'
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-semibold', item.isChecked ? 'text-emerald-900 line-through' : 'text-slate-900')}>
                        {item.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{formatCurrency(item.estimatedAmount || 0)}</span>
                        {(item.quantity || item.unit) && (
                          <span>
                            {item.quantity ? item.quantity : '-'} {item.unit || ''}
                          </span>
                        )}
                        {item.lastImportedAt && <span className="text-indigo-600">Sudah masuk transaksi</span>}
                      </div>
                      {item.notes && <p className="mt-2 text-sm text-slate-600">{item.notes}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleImportTransaction(item)}
                    disabled={importingId === item.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ClipboardPlus className="h-3.5 w-3.5" />
                    {importingId === item.id ? 'Mencatat...' : 'Catat transaksi'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'slate' | 'emerald' | 'amber' | 'indigo';
}) {
  const toneClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  }[tone];

  return (
    <div className={cn('rounded-2xl border p-4', toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] opacity-70">{label}</p>
      <p className="mt-2 text-base font-bold">{value}</p>
    </div>
  );
}
