import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { db, collection, query, orderBy, onSnapshot, doc, deleteDoc } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { TransactionListSkeleton, TransactionListView } from './TransactionListView';
import type { TransactionRecord } from './financeTypes';

export function TransactionList({ householdId, onEdit }: { householdId: string; onEdit: (transaction: TransactionRecord) => void }) {
  const [transactions, setTransactions] = useState<TransactionRecord[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [viewingDetail, setViewingDetail] = useState<TransactionRecord | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    const path = `households/${householdId}/transactions`;
    const q = query(collection(db, path), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<TransactionRecord, 'id'>),
        }));
        setTransactions(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setTransactions([]);
      }
    );

    return () => unsubscribe();
  }, [householdId]);

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
        category: filterCategory,
        startDate: filterStartDate,
        endDate: filterEndDate,
      }}
      deletingId={deletingId}
      viewingReceipt={viewingReceipt}
      viewingDetail={viewingDetail}
      onToggleFilters={() => setShowFilters((value) => !value)}
      onCategoryFilterChange={setFilterCategory}
      onStartDateFilterChange={(value) => {
        setFilterStartDate(value);
        if (!value) setFilterEndDate('');
      }}
      onEndDateFilterChange={setFilterEndDate}
      onResetFilters={() => {
        setFilterCategory('');
        setFilterStartDate('');
        setFilterEndDate('');
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
