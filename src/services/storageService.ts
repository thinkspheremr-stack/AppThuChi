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
  LAST_LOCAL_SAVE: 'so_thuchi_last_local_save',
};

export const getStoredAccounts = (): Account[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS;
  }
  try {
    const parsed: Account[] = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_ACCOUNTS;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
};

export const saveAccounts = (accounts: Account[]) => {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  localStorage.setItem(STORAGE_KEYS.LAST_LOCAL_SAVE, new Date().toISOString());
};

export const getStoredTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (data === null) {
    const initial = generateInitialTransactions();
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed: Transaction[] = JSON.parse(data);
    if (Array.isArray(parsed)) {
      let needsSave = false;

      // 1. Chuẩn hóa thứ tự giao dịch ngày 15/09/2026 theo đúng thực tế tài chính:
      // Khoản chuyển vào 11.000.000đ từ Vietcombank sang Bắc Á diễn ra TRƯỚC (order: 0, time: 16:19)
      // để số dư Bắc Á từ 2.000.000đ tăng lên 13.000.000đ.
      // Sau đó khoản trích 11.000.000đ trả chú diễn ra TIẾP THEO (order: 1, time: 16:20) để số dư về lại 2.000.000đ (không bị âm -9.000.000đ).
      // Cuối cùng khoản gửi tiết kiệm 2.000.000đ diễn ra (order: 2, time: 19:06) để số dư về 0đ.
      const tx15TransferIn = parsed.find(
        (t) =>
          t.date === '2026-09-15' &&
          t.type === 'transfer' &&
          t.amount === 11000000 &&
          (t.toAccountId === 'acc-bac-a' || t.description.toLowerCase().includes('bắc á'))
      );
      const tx15TransferOut11M = parsed.find(
        (t) =>
          t.date === '2026-09-15' &&
          t.type === 'transfer' &&
          t.amount === 11000000 &&
          (t.accountId === 'acc-bac-a' || t.note?.toLowerCase().includes('trả chú')) &&
          t.id !== tx15TransferIn?.id
      );
      const tx15TransferOut2M = parsed.find(
        (t) =>
          t.date === '2026-09-15' &&
          t.type === 'transfer' &&
          t.amount === 2000000
      );

      if (tx15TransferIn && tx15TransferOut11M) {
        if (
          tx15TransferIn.order !== 0 ||
          tx15TransferOut11M.order !== 1 ||
          (tx15TransferIn.time || '') >= (tx15TransferOut11M.time || '')
        ) {
          tx15TransferIn.order = 0;
          tx15TransferIn.time = '16:19';
          tx15TransferOut11M.order = 1;
          tx15TransferOut11M.time = '16:20';
          if (tx15TransferOut2M) {
            tx15TransferOut2M.order = 2;
            tx15TransferOut2M.time = '19:06';
          }
          needsSave = true;
        }
      }

      // 2. Chuẩn hóa thứ tự giao dịch ngày 29/09/2026 theo đúng thực tế tài chính:
      // Khoản chuyển vào 3.000.000đ diễn ra TRƯỚC (order: 0, time: 17:16) để số dư Vietcombank tăng lên 3.452.013đ
      // Sau đó khoản cho mượn 3.000.000đ diễn ra SAU (order: 1, time: 17:29) để số dư về lại 452.013đ (không bị âm tài khoản)
      const txTransferIn = parsed.find(
        (t) => t.date === '2026-09-29' && t.type === 'transfer' && t.amount === 3000000
      );
      const txExpenseOut = parsed.find(
        (t) => t.date === '2026-09-29' && t.type === 'expense' && t.amount === 3000000
      );

      if (txTransferIn && txExpenseOut) {
        if (
          txTransferIn.order !== 0 ||
          txExpenseOut.order !== 1 ||
          (txTransferIn.time || '') >= (txExpenseOut.time || '')
        ) {
          txTransferIn.order = 0;
          txTransferIn.time = '17:16';
          txExpenseOut.order = 1;
          txExpenseOut.time = '17:29';
          needsSave = true;
        }
      }

      if (needsSave) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(parsed));
      }

      return parsed;
    }
    return [];
  } catch {
    return [];
  }
};

export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  localStorage.setItem(STORAGE_KEYS.LAST_LOCAL_SAVE, new Date().toISOString());
};

export const getStoredCategories = (): Category[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
};

export const saveCategories = (categories: Category[]) => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  localStorage.setItem(STORAGE_KEYS.LAST_LOCAL_SAVE, new Date().toISOString());
};

export const getStoredReminders = (): ReminderSetting[] => {
  const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(DEFAULT_REMINDERS));
    return DEFAULT_REMINDERS;
  }
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_REMINDERS;
  } catch {
    return DEFAULT_REMINDERS;
  }
};

export const saveReminders = (reminders: ReminderSetting[]) => {
  localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  localStorage.setItem(STORAGE_KEYS.LAST_LOCAL_SAVE, new Date().toISOString());
};

export const getStoredDebts = (): DebtRecord[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DEBTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(DEFAULT_DEBTS));
    return DEFAULT_DEBTS;
  }
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : DEFAULT_DEBTS;
  } catch {
    return DEFAULT_DEBTS;
  }
};

export const saveDebts = (debts: DebtRecord[]) => {
  localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  localStorage.setItem(STORAGE_KEYS.LAST_LOCAL_SAVE, new Date().toISOString());
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
  localStorage.setItem(STORAGE_KEYS.LAST_LOCAL_SAVE, new Date().toISOString());
};

/**
 * Re-calculate dynamic account balances based on initial balances + all completed transactions
 */
export const recalculateAccountBalances = (
  accounts: Account[],
  transactions: Transaction[]
): Account[] => {
  return accounts.map((acc) => {
    let balance = acc.initialBalance || 0;

    transactions.forEach((tx) => {
      if (tx.accountId === acc.id) {
        if (tx.type === 'income') {
          balance += tx.amount;
        } else if (tx.type === 'expense' || tx.type === 'transfer') {
          balance -= tx.amount;
        }
      }

      if (tx.type === 'transfer' && tx.toAccountId === acc.id) {
        balance += tx.amount;
      }
    });

    return {
      ...acc,
      balance,
    };
  });
};

/**
 * Reset all local storage back to clean initial state
 */
export const resetAllData = () => {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  localStorage.removeItem('so_thuchi_current_month');
  localStorage.removeItem('so_thuchi_selected_account_id');
  localStorage.removeItem('so_thuchi_active_sheet');
  localStorage.removeItem('so_thuchi_last_synced');
  localStorage.removeItem(STORAGE_KEYS.LAST_LOCAL_SAVE);
};

/**
 * Export all data as JSON file for offline backup
 */
export const exportDataAsJSON = (
  accounts: Account[],
  transactions: Transaction[],
  categories: Category[],
  reminders: ReminderSetting[],
  debts?: DebtRecord[]
) => {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    accounts,
    transactions,
    categories,
    reminders,
    debts: debts || [],
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `so-thuchi-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Export filtered transactions as CSV file for Excel
 */
export const exportTransactionsAsCSV = (
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
) => {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = ['Mã GD', 'Ngày', 'Giờ', 'Loại', 'Số tiền (VND)', 'Tài khoản', 'Danh mục', 'Nội dung', 'Ghi chú'];
  const rows = transactions.map((t) => [
    t.id,
    t.date,
    t.time || '',
    t.type === 'income' ? 'Thu nhập' : t.type === 'expense' ? 'Chi tiêu' : 'Chuyển khoản',
    t.amount,
    accountMap.get(t.accountId) || t.accountId,
    t.categoryId ? categoryMap.get(t.categoryId) || '' : '',
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `giao-dich-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
