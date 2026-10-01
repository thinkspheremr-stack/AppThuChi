import { Account, Category, DebtRecord, MonthlyBudget, ReminderSetting, Transaction } from '../types';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_DEBTS, DEFAULT_REMINDERS, generateInitialTransactions } from '../data/initialData';

const STORAGE_KEYS = {
  ACCOUNTS: 'so_thuchi_accounts_v1',
  TRANSACTIONS: 'so_thuchi_transactions_v1',
  CATEGORIES: 'so_thuchi_categories_v1',
  REMINDERS: 'so_thuchi_reminders_v1',
  BUDGETS: 'so_thuchi_budgets_v1',
  LAST_ACTIVE: 'so_thuchi_last_active_v1',
  DEBTS: 'so_thuchi_debts_v1',
};

export const getStoredAccounts = (): Account[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS;
  }
  try {
    const parsed: Account[] = JSON.parse(data);
    // Filter to keep Vietcombank if old mock accounts exist
    const hasOldMocks = parsed.some((a) => a.id === 'acc-tcb' || a.id === 'acc-mb');
    if (hasOldMocks) {
      const vcbOnly = parsed.filter(
        (a) => a.id === 'acc-vcb' || a.name.toLowerCase().includes('vietcombank')
      );
      const result = vcbOnly.length > 0 ? vcbOnly : DEFAULT_ACCOUNTS;
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(result));
      return result;
    }
    return parsed.length > 0 ? parsed : DEFAULT_ACCOUNTS;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
};

export const saveAccounts = (accounts: Account[]) => {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
};

export const getStoredTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!data) {
    const initial = generateInitialTransactions();
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed: Transaction[] = JSON.parse(data);
    // Keep transactions belonging to remaining accounts
    const valid = parsed.filter(
      (t) =>
        t.accountId === 'acc-vcb' ||
        !['acc-tcb', 'acc-mb', 'acc-momo', 'acc-zalopay', 'acc-cash'].includes(t.accountId)
    );
    return valid.length > 0 ? valid : generateInitialTransactions();
  } catch {
    return generateInitialTransactions();
  }
};

export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

export const getStoredCategories = (): Category[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_CATEGORIES;
  }
};

export const saveCategories = (categories: Category[]) => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
};

export const getStoredReminders = (): ReminderSetting[] => {
  const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(DEFAULT_REMINDERS));
    return DEFAULT_REMINDERS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_REMINDERS;
  }
};

export const saveReminders = (reminders: ReminderSetting[]) => {
  localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
};

export const getStoredDebts = (): DebtRecord[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DEBTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(DEFAULT_DEBTS));
    return DEFAULT_DEBTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_DEBTS;
  }
};

export const saveDebts = (debts: DebtRecord[]) => {
  localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
};

export const getStoredBudgets = (): Record<string, MonthlyBudget> => {
  const data = localStorage.getItem(STORAGE_KEYS.BUDGETS);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
};

export const saveBudgets = (budgets: Record<string, MonthlyBudget>) => {
  localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
};

/**
 * Re-calculate real-time balances for all accounts based on initialBalance + all transactions
 */
export const recalculateAccountBalances = (accounts: Account[], transactions: Transaction[]): Account[] => {
  return accounts.map((acc) => {
    let currentBalance = acc.initialBalance || 0;

    for (const tx of transactions) {
      if (tx.accountId === acc.id) {
        if (tx.type === 'expense') {
          currentBalance -= tx.amount;
        } else if (tx.type === 'income') {
          currentBalance += tx.amount;
        } else if (tx.type === 'transfer') {
          currentBalance -= tx.amount; // Sent out
        }
      } else if (tx.type === 'transfer' && tx.toAccountId === acc.id) {
        currentBalance += tx.amount; // Received
      }
    }

    return {
      ...acc,
      balance: currentBalance,
    };
  });
};

/**
 * Reset all data to initial factory defaults
 */
export const resetAllData = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.REMINDERS);
  localStorage.removeItem(STORAGE_KEYS.BUDGETS);
  window.location.reload();
};

/**
 * Export data to JSON file
 */
export const exportDataAsJSON = (accounts: Account[], transactions: Transaction[], categories: Category[], reminders: ReminderSetting[]) => {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    accounts,
    transactions,
    categories,
    reminders,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sothuchi_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Export transactions to CSV
 */
export const exportTransactionsAsCSV = (transactions: Transaction[], accounts: Account[], categories: Category[]) => {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = ['Mã GD', 'Ngày', 'Giờ', 'Loại', 'Số tiền (VND)', 'Tài khoản / Ngân hàng', 'Đến tài khoản', 'Danh mục', 'Ghi chú'];
  const rows = transactions.map((t) => [
    t.id,
    t.date,
    t.time || '',
    t.type === 'expense' ? 'Chi tiêu' : t.type === 'income' ? 'Thu nhập' : 'Chuyển khoản',
    t.amount,
    accountMap.get(t.accountId) || t.accountId,
    t.toAccountId ? (accountMap.get(t.toAccountId) || t.toAccountId) : '',
    t.categoryId ? (categoryMap.get(t.categoryId) || t.categoryId) : '',
    `"${(t.description || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `giao_dich_sothuchi_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
