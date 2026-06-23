import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import type { DocumentData, QueryDocumentSnapshot, QueryConstraint } from 'firebase/firestore';
import { db, collection, query, orderBy, onSnapshot, doc, deleteDoc, getDocs, limit, startAfter, where } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { TransactionListSkeleton, TransactionListView } from './TransactionListView';
import type { TransactionRecord } from './financeTypes';

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
    startDate: format(subDays(today, 7), 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  };
}

export function TransactionList({ householdId, refreshKey, onEdit }: { householdId: string; refreshKey: number; onEdit: (transaction: TransactionRecord) => void }) {
  const [transactions, setTransactions] = useState<TransactionRecord[] | null>(null);
  const [lastTransactionSnapshot, setLastTransactionSnapshot] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [viewingDetail, setViewingDetail] = useState<TransactionRecord | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
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
        constraints.push(where('date', '>=', `${filterStartDate}T00:00:00.000Z`));
      }

      if (filterEndDate) {
        constraints.push(where('date', '<=', `${filterEndDate}T23:59:59.999Z`));
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

    const uniqueCategories = Array.from(
      new Set([...transactionItems.map((transaction) => transaction.category), ...customCategories])
    ).sort();

    const filteredTransactions = transactionItems.filter((transaction) => {
      if (filterCategory && transaction.category !== filterCategory) {
        return false;
      }

      const dateOnly = transaction.date.split('T')[0];
      if (filterStartDate && dateOnly < filterStartDate) {
        return false;
      }

      if (filterEndDate && dateOnly > filterEndDate) {
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
  );
}
