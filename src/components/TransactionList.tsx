import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import type { DocumentData, QueryDocumentSnapshot, QueryConstraint } from 'firebase/firestore';
import { auth, db, collection, query, orderBy, onSnapshot, doc, deleteDoc, getDocs, limit, startAfter, where } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { TransactionListSkeleton, TransactionListView } from './TransactionListView';
import { discardPendingCapture } from '../lib/transactionCapture';
import { formatCurrency } from '../lib/utils';
import type { PendingCapture, TransactionRecord } from './financeTypes';
import { Receipt, Trash2 } from 'lucide-react';

export type TransactionDurationFilter = 'today' | 'yesterday' | 'last7days' | 'all';

const TRANSACTION_PAGE_SIZE = 30;

function getDurationDateRange(duration: Exclude<TransactionDurationFilter, 'all'>) {
  const today = new Date();

  if (duration === 'today') {
    const date = format(today, 'yyyy-MM-dd');
    return { startDate: date, endDate: date };
  }

  if (duration === 'yesterday') {
    const date = format(subDays(today, 1), 'yyyy-MM-dd');
    return { startDate: date, endDate: date };
  }

  return {
    startDate: format(subDays(today, 6), 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  };
}

function getDateTimeBounds(startDate: string, endDate: string) {
  return {
    startDateTime: startDate ? `${startDate}T00:00:00` : '',
    endDateTime: endDate ? `${endDate}T23:59:59` : '',
  };
}

function normalizeTransactionDateTime(value: string) {
  if (!value) return '';
  if (value.includes('T')) return value;
  return `${value}T00:00:00`;
}

export function TransactionList({ householdId, refreshKey, onEdit, onReviewCapture }: { householdId: string; refreshKey: number; onEdit: (transaction: TransactionRecord) => void; onReviewCapture: (capture: PendingCapture) => void }) {
  const [transactions, setTransactions] = useState<TransactionRecord[] | null>(null);
  const [lastTransactionSnapshot, setLastTransactionSnapshot] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [viewingDetail, setViewingDetail] = useState<TransactionRecord | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [pendingCaptures, setPendingCaptures] = useState<PendingCapture[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDuration, setFilterDuration] = useState<TransactionDurationFilter>('today');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => getDurationDateRange('today').startDate);
  const [filterEndDate, setFilterEndDate] = useState(() => getDurationDateRange('today').endDate);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchTransactionsPage = useCallback(async (mode: 'reset' | 'append', cursor?: QueryDocumentSnapshot<DocumentData> | null) => {
    const path = `households/${householdId}/transactions`;

    if (mode === 'append') {
      setIsLoadingMoreTransactions(true);
    }

    try {
      const constraints: QueryConstraint[] = [];

      if (filterStartDate) {
        constraints.push(where('date', '>=', filterStartDate));
      }

      if (filterEndDate) {
        constraints.push(where('date', '<=', `${filterEndDate}\uf8ff`));
      }

      constraints.push(orderBy('date', 'desc'));

      if (mode === 'append' && cursor) {
        constraints.push(startAfter(cursor));
      }

      constraints.push(limit(TRANSACTION_PAGE_SIZE));

      const snapshot = await getDocs(query(collection(db, path), ...constraints));
      const data = snapshot.docs.map((snapshotDoc) => ({
        id: snapshotDoc.id,
        ...(snapshotDoc.data() as Omit<TransactionRecord, 'id'>),
      }));

      setTransactions((current) => mode === 'append' ? [...(current ?? []), ...data] : data);
      setLastTransactionSnapshot(snapshot.docs.at(-1) ?? null);
      setHasMoreTransactions(snapshot.docs.length === TRANSACTION_PAGE_SIZE);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      if (mode === 'reset') {
        setTransactions([]);
        setLastTransactionSnapshot(null);
        setHasMoreTransactions(false);
      }
    } finally {
      setIsLoadingMoreTransactions(false);
    }
  }, [filterEndDate, filterStartDate, householdId, refreshKey]);

  useEffect(() => {
    setTransactions(null);
    setLastTransactionSnapshot(null);
    setHasMoreTransactions(false);
    void fetchTransactionsPage('reset');
  }, [fetchTransactionsPage]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasMoreTransactions || isLoadingMoreTransactions) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (!hasMoreTransactions || isLoadingMoreTransactions || !lastTransactionSnapshot) return;
        void fetchTransactionsPage('append', lastTransactionSnapshot);
      },
      {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchTransactionsPage, hasMoreTransactions, isLoadingMoreTransactions, lastTransactionSnapshot]);

  useEffect(() => {
    const path = `households/${householdId}/categories`;
    const q = query(collection(db, path));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const categories = snapshot.docs.map((snapshotDoc) => String(snapshotDoc.data().name ?? ''));
        setCustomCategories(categories);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [householdId]);

  useEffect(() => {
    const userUid = auth.currentUser?.uid;
    if (!userUid) return;
    const path = `households/${householdId}/pendingCaptures`;
    const unsubscribe = onSnapshot(
      query(collection(db, path), where('authorUid', '==', userUid)),
      (snapshot) => setPendingCaptures(snapshot.docs
        .map((item) => ({ id: item.id, ...(item.data() as Omit<PendingCapture, 'id'>) }))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))),
      (error) => handleFirestoreError(error, OperationType.LIST, path),
    );
    return () => unsubscribe();
  }, [householdId]);

  const handleDiscardCapture = async (captureId: string) => {
    try {
      await discardPendingCapture(db, householdId, captureId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `households/${householdId}/pendingCaptures/${captureId}`);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    const path = `households/${householdId}/transactions/${deletingId}`;
    try {
      await deleteDoc(doc(db, path));
      setTransactions((current) => current?.filter((transaction) => transaction.id !== deletingId) ?? current);
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const viewModel = useMemo(() => {
    const transactionItems = transactions ?? [];
    const { startDateTime, endDateTime } = getDateTimeBounds(filterStartDate, filterEndDate);

    const uniqueCategories = Array.from(
      new Set([...transactionItems.map((transaction) => transaction.category), ...customCategories])
    ).sort();

    const filteredTransactions = transactionItems.filter((transaction) => {
      if (filterCategory && transaction.category !== filterCategory) {
        return false;
      }

      const transactionDateTime = normalizeTransactionDateTime(transaction.date);

      if (startDateTime && transactionDateTime < startDateTime) {
        return false;
      }

      if (endDateTime && transactionDateTime > endDateTime) {
        return false;
      }

      return true;
    });

    const groupedTransactions = Object.entries(
      filteredTransactions.reduce<Record<string, TransactionRecord[]>>((acc, transaction) => {
        const dateKey = format(parseISO(transaction.date), 'MMM dd, yyyy');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(transaction);
        return acc;
      }, {})
    ).map(([date, items]) => ({ date, items }));

    return {
      uniqueCategories,
      filteredTransactions,
      groupedTransactions,
    };
  }, [customCategories, filterCategory, filterEndDate, filterStartDate, transactions]);

  if (!transactions) {
    return <TransactionListSkeleton />;
  }

  return (
    <div className="space-y-5">
      {pendingCaptures.length > 0 && (
        <section className="rounded-3xl border border-indigo-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Capture menunggu konfirmasi</h2>
              <p className="mt-1 text-xs text-slate-500">Belum dihitung sebagai transaksi. Gambar tidak disimpan.</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{pendingCaptures.length}</span>
          </div>
          <ul className="space-y-2">
            {pendingCaptures.map((capture) => (
              <li key={capture.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3">
                <button type="button" onClick={() => onReviewCapture(capture)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="rounded-xl bg-white p-2 text-indigo-600"><Receipt className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{capture.category}</span>
                    <span className="block text-xs text-slate-500">{formatCurrency(capture.amount)} · {capture.date}</span>
                  </span>
                </button>
                <button type="button" onClick={() => void handleDiscardCapture(capture.id)} aria-label="Hapus capture tertunda" className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <TransactionListView
      transactions={transactions}
      groupedTransactions={viewModel.groupedTransactions}
      uniqueCategories={viewModel.uniqueCategories}
      filters={{
        showFilters,
        duration: filterDuration,
        category: filterCategory,
        startDate: filterStartDate,
        endDate: filterEndDate,
      }}
      deletingId={deletingId}
      hasMoreTransactions={hasMoreTransactions}
      isLoadingMoreTransactions={isLoadingMoreTransactions}
      loadMoreSentinelRef={loadMoreSentinelRef}
      viewingReceipt={viewingReceipt}
      viewingDetail={viewingDetail}
      onToggleFilters={() => setShowFilters((value) => !value)}
      onDurationFilterChange={(value) => {
        setFilterDuration(value);

        if (value === 'all') {
          setFilterStartDate('');
          setFilterEndDate('');
          return;
        }

        const range = getDurationDateRange(value);
        setFilterStartDate(range.startDate);
        setFilterEndDate(range.endDate);
      }}
      onCategoryFilterChange={setFilterCategory}
      onStartDateFilterChange={(value) => {
        setFilterStartDate(value);
        if (!value) setFilterEndDate('');
      }}
      onEndDateFilterChange={setFilterEndDate}
      onResetFilters={() => {
        const range = getDurationDateRange('today');
        setFilterDuration('today');
        setFilterCategory('');
        setFilterStartDate(range.startDate);
        setFilterEndDate(range.endDate);
      }}
      onViewDetail={setViewingDetail}
      onCloseDetail={() => setViewingDetail(null)}
      onViewReceipt={setViewingReceipt}
      onRequestDelete={setDeletingId}
      onConfirmDelete={handleDelete}
      onEdit={onEdit}
      />
    </div>
  );
}
