import type { TransactionRecord } from '../components/financeTypes';

const WEEKLY_CATEGORY = 'Belanja Mingguan';
const MONTHLY_CATEGORY = 'Belanja Bulanan';

const SYNONYM_MAP: Record<string, string[]> = {
  beras: ['beras', 'stok beras'],
  'minyak goreng': ['minyak', 'minyak goreng'],
  telur: ['telur', 'telur ayam'],
  sabun: ['sabun', 'sabun mandi', 'sabun cuci', 'sabun cair'],
  gula: ['gula', 'gula pasir'],
  kopi: ['kopi', 'kopi bubuk'],
  susu: ['susu', 'susu kental manis', 'susu bubuk'],
  mie: ['mie', 'mi', 'indomie', 'mie instan'],
  kecap: ['kecap', 'kecap manis'],
  saos: ['saos', 'saus', 'sambal'],
  deterjen: ['deterjen', 'rinso', 'soklin'],
  shampoo: ['shampoo', 'sampo', 'shampo'],
};

const REMOVAL_PATTERNS = [
  /\b(\d+)\s*(kg|gr|g|ml|l|liter|pcs|pack|sachet|biji|butir|ekor)\b/gi,
  /\bstok\b/gi,
  /\bbeli\b/gi,
];

function normalizeItemName(raw: string): string {
  let name = raw.trim().toLowerCase();
  for (const pattern of REMOVAL_PATTERNS) {
    name = name.replace(pattern, '').trim();
  }
  return name;
}

function findSynonymGroup(name: string): string | null {
  const normalized = normalizeItemName(name);
  for (const [canonical, aliases] of Object.entries(SYNONYM_MAP)) {
    if (normalized === canonical) return canonical;
    for (const alias of aliases) {
      if (normalized === alias) return canonical;
      if (normalized.includes(alias)) return canonical;
      if (alias.includes(normalized)) return canonical;
    }
  }
  return null;
}

function resolveDisplayName(normalizedName: string): string {
  return normalizedName
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function generateInsight(
  transactions: TransactionRecord[],
  currentShoppingNames: string[]
): {
  recommendations: Array<{ name: string; frequency: number; totalAmount: number; sourceCategory: string }>;
  totalCount: number;
} {
  const weekTxn = transactions.filter((t) => t.category === WEEKLY_CATEGORY);
  const monthTxn = transactions.filter((t) => t.category === MONTHLY_CATEGORY);
  const totalCount = weekTxn.length + monthTxn.length;

  const nameCount = new Map<string, { frequency: number; totalAmount: number; weeklyAmount: number; monthlyAmount: number }>();

  for (const txn of transactions) {
    const note = (txn.note || txn.category || '').trim().toLowerCase();
    if (!note) continue;

    const group = findSynonymGroup(note);
    const key = group || normalizeItemName(note);
    if (!key) continue;

    const existing = nameCount.get(key) || { frequency: 0, totalAmount: 0, weeklyAmount: 0, monthlyAmount: 0 };
    existing.frequency += 1;
    existing.totalAmount += txn.amount;
    if (txn.category === WEEKLY_CATEGORY) existing.weeklyAmount += txn.amount;
    else existing.monthlyAmount += txn.amount;
    nameCount.set(key, existing);
  }

  const shoppingNamesLower = new Set(currentShoppingNames.map((n) => n.trim().toLowerCase()));

  const recommendations = Array.from(nameCount.entries())
    .filter(([name]) => {
      const display = resolveDisplayName(name).toLowerCase();
      return !shoppingNamesLower.has(name) && !shoppingNamesLower.has(display);
    })
    .map(([name, data]) => ({
      name: resolveDisplayName(name),
      frequency: data.frequency,
      totalAmount: data.totalAmount,
      sourceCategory:
        data.monthlyAmount > 0 && data.weeklyAmount > 0
          ? 'both'
          : data.weeklyAmount > 0
            ? '03'
            : '04',
    }))
    .sort((a, b) => b.frequency - a.frequency || b.totalAmount - a.totalAmount)
    .slice(0, 20);

  return { recommendations, totalCount };
}
