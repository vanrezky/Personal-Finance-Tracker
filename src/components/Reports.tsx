import { useEffect, useMemo, useState } from 'react';
import { endOfDay, format, isWithinInterval, parseISO, startOfDay, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, X } from 'lucide-react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { db, collection, query, onSnapshot } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '../lib/utils';
import { ReportsSkeleton, ReportsView } from './ReportsView';
import type { CategoryExpenseDatum, DailyTrendDatum, MonthlyExpenseItem, TransactionRecord } from './financeTypes';

type ReportDateRangePickerProps = {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

function ReportDateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: ReportDateRangePickerProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();

  const hasSelectedRange = Boolean(startDate && endDate);
  const selectedRange = hasSelectedRange
    ? { from: parseISO(startDate), to: parseISO(endDate) }
    : undefined;

  const dateRangeLabel = hasSelectedRange
    ? startDate === endDate
      ? format(parseISO(startDate), 'd MMM yyyy', { locale: id })
      : `${format(parseISO(startDate), 'd MMM yyyy', { locale: id })} - ${format(parseISO(endDate), 'd MMM yyyy', { locale: id })}`
    : 'Pilih rentang tanggal';

  const openPicker = () => {
    setDraftRange(selectedRange);
    setIsDatePickerOpen(true);
  };

  const applyRange = (range: DateRange | undefined) => {
    const from = range?.from;
    const to = range?.to ?? range?.from;

    if (!from || !to) {
      return;
    }

    onStartDateChange(format(from, 'yyyy-MM-dd'));
    onEndDateChange(format(to, 'yyyy-MM-dd'));
  };

  return (
    <>
      <div className="rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/60">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Filter laporan</p>
            <h3 className="text-base font-bold text-slate-950">Rentang tanggal</h3>
            <p className="mt-1 text-sm text-slate-500">{dateRangeLabel}</p>
          </div>

          <button
            type="button"
            onClick={openPicker}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white sm:px-4 sm:py-3 sm:text-sm'
            )}
          >
            <span className="hidden sm:inline">Ubah tanggal</span>
            <span className="sm:hidden">Tanggal</span>
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isDatePickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 px-3 pb-3 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setIsDatePickerOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl sm:rounded-3xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Filter laporan</p>
                  <h3 className="text-lg font-bold text-slate-950">Pilih tanggal</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-4">
                <div className="rounded-3xl border border-slate-100 p-2">
                  <DayPicker
                    mode="range"
                    selected={draftRange ?? selectedRange}
                    onSelect={setDraftRange}
                    locale={id}
                    captionLayout="dropdown"
                    className="finance-date-picker"
                    disabled={{ after: new Date() }}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDraftRange(undefined)}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      applyRange(draftRange);
                      setIsDatePickerOpen(false);
                    }}
                    className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200/70 transition hover:bg-slate-800"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function Reports({ householdId }: { householdId: string }) {
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = `households/${householdId}/transactions`;
    const q = query(collection(db, path));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<TransactionRecord, 'id'>),
        }));
        setTransactions(data);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [householdId]);

  const viewModel = useMemo(() => {
    const filteredTransactions = transactions.filter((transaction) => {
      const transactionDate = parseISO(transaction.date);
      return isWithinInterval(transactionDate, {
        start: startOfDay(parseISO(startDate)),
        end: endOfDay(parseISO(endDate)),
      });
    });

    const { totalIncome, totalExpense } = filteredTransactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') acc.totalIncome += transaction.amount;
        else acc.totalExpense += transaction.amount;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0 }
    );

    const expenseTransactions = filteredTransactions.filter((transaction) => transaction.type === 'expense');

    const monthlyExpenseData = Object.values(
      expenseTransactions.reduce<Record<string, Omit<MonthlyExpenseItem, 'percentageOfPeriodExpense'>>>((acc, transaction) => {
        const monthDate = parseISO(transaction.date);
        const monthKey = format(monthDate, 'yyyy-MM');

        if (!acc[monthKey]) {
          acc[monthKey] = {
            monthKey,
            monthLabel: format(monthDate, 'MMM yyyy'),
            totalExpense: 0,
            transactionCount: 0,
          };
        }

        acc[monthKey].totalExpense += transaction.amount;
        acc[monthKey].transactionCount += 1;
        return acc;
      }, {})
    )
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((item) => ({
        ...item,
        percentageOfPeriodExpense: totalExpense > 0 ? (item.totalExpense / totalExpense) * 100 : 0,
      }));

    const highestExpenseMonth = monthlyExpenseData.reduce<MonthlyExpenseItem | null>((highest, item) => {
      if (!highest || item.totalExpense > highest.totalExpense) {
        return item;
      }
      return highest;
    }, null);

    const averageMonthlyExpense = monthlyExpenseData.length > 0 ? totalExpense / monthlyExpenseData.length : 0;
    const latestMonth = monthlyExpenseData[monthlyExpenseData.length - 1];
    const previousMonth = monthlyExpenseData[monthlyExpenseData.length - 2];
    const latestMonthDelta = latestMonth && previousMonth ? latestMonth.totalExpense - previousMonth.totalExpense : null;
    const latestMonthDeltaLabel = latestMonthDelta === null
      ? 'Belum ada pembanding bulan sebelumnya.'
      : latestMonthDelta === 0
        ? `Stabil dibanding ${previousMonth?.monthLabel}.`
        : `${latestMonthDelta > 0 ? '+' : '-'}Rp${new Intl.NumberFormat('id-ID').format(Math.abs(latestMonthDelta))} vs ${previousMonth?.monthLabel}`;

    const categoryData = expenseTransactions
      .reduce<CategoryExpenseDatum[]>((acc, transaction) => {
        const existing = acc.find((item) => item.name === transaction.category);
        if (existing) {
          existing.value += transaction.amount;
        } else {
          acc.push({ name: transaction.category, value: transaction.amount });
        }
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value);

    const dailyData = filteredTransactions
      .reduce<DailyTrendDatum[]>((acc, transaction) => {
        const rawDate = parseISO(transaction.date);
        const dateLabel = format(rawDate, 'dd MMM');
        const existing = acc.find((item) => item.date === dateLabel);

        if (existing) {
          if (transaction.type === 'income') existing.income += transaction.amount;
          else existing.expense += transaction.amount;
        } else {
          acc.push({
            date: dateLabel,
            rawDate,
            income: transaction.type === 'income' ? transaction.amount : 0,
            expense: transaction.type === 'expense' ? transaction.amount : 0,
          });
        }

        return acc;
      }, [])
      .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    return {
      totalIncome,
      totalExpense,
      monthlyExpenseData,
      highestExpenseMonth,
      averageMonthlyExpense,
      latestMonthLabel: latestMonth?.monthLabel,
      latestMonthDelta,
      latestMonthDeltaLabel,
      categoryData,
      dailyData,
    };
  }, [endDate, startDate, transactions]);

  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="space-y-8 pb-12">
      <ReportDateRangePicker
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />
      <ReportsView
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        {...viewModel}
      />
    </div>
  );
}
