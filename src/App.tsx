import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Account, Category, DebtPayment, DebtRecord, ReminderSetting, Transaction, TransactionType } from './types';
import {
  exportDataAsJSON,
  exportTransactionsAsCSV,
  getStoredAccounts,
  getStoredCategories,
  getStoredDebts,
  getStoredReminders,
  getStoredTransactions,
  recalculateAccountBalances,
  resetAllData,
  saveAccounts,
  saveCategories,
  saveDebts,
  saveReminders,
  saveTransactions,
} from './services/storageService';
import {
  calculateStreak,
  checkDueReminders,
  sendBrowserNotification,
} from './services/notificationService';
import { auth, onAuthStateChanged, User } from './services/firebase';
import { backupDataToCloud, loadDataFromCloud } from './services/cloudSyncService';
import { Navbar } from './components/Navbar';
import { FinancialReportTable } from './components/FinancialReportTable';
import { BankManager } from './components/BankManager';
import { MonthlyCharts } from './components/MonthlyCharts';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { ReminderModal } from './components/ReminderModal';
import { AuthModal } from './components/AuthModal';
import { SalaryAllocationModal } from './components/SalaryAllocationModal';
import { DebtManager } from './components/DebtManager';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { SavingsManager } from './components/SavingsManager';
import { GeneralReportSheet } from './components/GeneralReportSheet';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { DEFAULT_CATEGORIES } from './data/initialData';
import { Wallet, FileText, PiggyBank, Layers } from 'lucide-react';

export default function App() {
  // Current active sheet: 'thuchi' | 'tietkiem' | 'tonghop' | 'ghino'
  const [activeSheet, setActiveSheet] = useState<'thuchi' | 'tietkiem' | 'tonghop' | 'ghino'>(() => {
    const saved = localStorage.getItem('so_thuchi_active_sheet');
    return saved === 'thuchi' || saved === 'tietkiem' || saved === 'tonghop' || saved === 'ghino'
      ? saved
      : 'thuchi';
  });

  // Current month: YYYY-MM (Persisted across F5)
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    return (
      localStorage.getItem('so_thuchi_current_month') ||
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    );
  });

  // Core Data (Persisted across F5)
  const [rawAccounts, setRawAccounts] = useState<Account[]>(() => getStoredAccounts());
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStoredTransactions());
  const [categories, setCategories] = useState<Category[]>(() => getStoredCategories());
  const [reminders, setReminders] = useState<ReminderSetting[]>(() => getStoredReminders());
  const [debts, setDebts] = useState<DebtRecord[]>(() => getStoredDebts());

  // Filter state: filter by specific bank/wallet (Persisted across F5)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => {
    return localStorage.getItem('so_thuchi_selected_account_id') || null;
  });

  // User Auth & Cloud Sync state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStorage.getItem('so_thuchi_last_synced'));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Manual Save State (For the Save button requested by user)
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [saveSuccessNotification, setSaveSuccessNotification] = useState(false);

  // Auto-Save State (Tự động lưu biểu chi tiết sau mỗi 1 phút)
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(() => {
    const last = localStorage.getItem('so_thuchi_last_local_save');
    if (!last) return null;
    try {
      const d = new Date(last);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return null;
    }
  });
  const [autoSaveToast, setAutoSaveToast] = useState<string | null>(null);

  // Modals state
  const [isBackupRestoreModalOpen, setIsBackupRestoreModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState<TransactionType>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Auto-backup debounce timer ref
  const autoBackupTimeout = useRef<NodeJS.Timeout | null>(null);

  // Re-compute live account balances whenever transactions or rawAccounts change
  const accounts = useMemo(() => {
    return recalculateAccountBalances(rawAccounts, transactions);
  }, [rawAccounts, transactions]);

  // Persist current month across F5
  useEffect(() => {
    localStorage.setItem('so_thuchi_current_month', currentMonth);
  }, [currentMonth]);

  // Persist selected account across F5
  useEffect(() => {
    if (selectedAccountId) {
      localStorage.setItem('so_thuchi_selected_account_id', selectedAccountId);
    }
  }, [selectedAccountId]);

  // Persist active sheet across F5
  useEffect(() => {
    localStorage.setItem('so_thuchi_active_sheet', activeSheet);
  }, [activeSheet]);

  // Persist accounts locally
  useEffect(() => {
    saveAccounts(rawAccounts);
  }, [rawAccounts]);

  // Persist transactions locally
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  // Persist categories locally
  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  // Persist reminders locally
  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

  // Persist debts locally
  useEffect(() => {
    saveDebts(debts);
  }, [debts]);

  // Firebase Auth Listener with smart timestamp check to NEVER overwrite recent local edits on F5
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          setIsSyncing(true);
          const cloudData = await loadDataFromCloud(user);
          if (cloudData) {
            const localSaveTime = localStorage.getItem('so_thuchi_last_local_save') || '';
            const cloudTime = cloudData.lastSyncedAt || '';
            const isLocalNewer =
              localSaveTime &&
              cloudTime &&
              new Date(localSaveTime).getTime() > new Date(cloudTime).getTime();

            if (isLocalNewer) {
              // Local data was edited more recently! Do not overwrite local with stale cloud data.
              // Instead, sync up the newer local data to cloud immediately.
              const syncedTime = await backupDataToCloud(
                user,
                rawAccounts,
                transactions,
                categories,
                reminders,
                debts
              );
              setLastSyncedAt(syncedTime);
              localStorage.setItem('so_thuchi_last_synced', syncedTime);
            } else {
              // Cloud data is newer or local is fresh. Safely apply cloud data.
              setLastSyncedAt(cloudData.lastSyncedAt);
              localStorage.setItem('so_thuchi_last_synced', cloudData.lastSyncedAt);
              if (cloudData.accounts && cloudData.accounts.length) {
                setRawAccounts(cloudData.accounts);
              }
              if (cloudData.transactions) {
                setTransactions(cloudData.transactions);
              }
              if (cloudData.categories && cloudData.categories.length) {
                setCategories(cloudData.categories);
              }
              if (cloudData.reminders && cloudData.reminders.length) {
                setReminders(cloudData.reminders);
              }
              if (cloudData.debts && cloudData.debts.length) {
                setDebts(cloudData.debts);
              }
            }
          } else {
            // First time this user signs in: automatically backup current local data to cloud!
            const syncedTime = await backupDataToCloud(
              user,
              rawAccounts,
              transactions,
              categories,
              reminders,
              debts
            );
            setLastSyncedAt(syncedTime);
            localStorage.setItem('so_thuchi_last_synced', syncedTime);
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          if (
            errMsg.includes('offline') ||
            errMsg.includes('unavailable') ||
            errMsg.includes('PERMISSION_DENIED')
          ) {
            console.warn('Đang làm việc ngoại tuyến (Offline mode). Dữ liệu được bảo toàn an toàn trên máy tính.');
          } else {
            console.warn('Thông báo đồng bộ tài khoản:', errMsg);
          }
        } finally {
          setIsSyncing(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Manual Save All Handler (Kích hoạt khi người dùng bấm nút "Lưu" ở thanh Navbar)
  const handleManualSaveAll = async () => {
    setIsManualSaving(true);
    try {
      // 1. Lưu ngay tức thì vào LocalStorage của trình duyệt
      saveAccounts(rawAccounts);
      saveTransactions(transactions);
      saveCategories(categories);
      saveReminders(reminders);
      saveDebts(debts);
      localStorage.setItem('so_thuchi_current_month', currentMonth);
      if (selectedAccountId) {
        localStorage.setItem('so_thuchi_selected_account_id', selectedAccountId);
      }
      localStorage.setItem('so_thuchi_active_sheet', activeSheet);
      const nowStr = new Date().toISOString();
      localStorage.setItem('so_thuchi_last_local_save', nowStr);

      // 2. Nếu đã đăng nhập Google / Firebase, sao lưu ngay lên Đám mây
      if (currentUser) {
        setIsSyncing(true);
        const syncedTime = await backupDataToCloud(
          currentUser,
          rawAccounts,
          transactions,
          categories,
          reminders,
          debts
        );
        setLastSyncedAt(syncedTime);
        localStorage.setItem('so_thuchi_last_synced', syncedTime);
      }

      setSaveSuccessNotification(true);
      setTimeout(() => {
        setSaveSuccessNotification(false);
      }, 2500);
    } catch (err: any) {
      console.warn('Thông báo khi lưu dữ liệu:', err?.message || err);
    } finally {
      setIsManualSaving(false);
      setIsSyncing(false);
    }
  };

  // Giữ tham chiếu mới nhất của toàn bộ dữ liệu để bộ hẹn giờ 1 phút luôn lưu đúng số liệu mới nhất
  const latestDataRef = useRef({
    rawAccounts,
    transactions,
    categories,
    reminders,
    debts,
    currentMonth,
    selectedAccountId,
    activeSheet,
    currentUser,
  });

  useEffect(() => {
    latestDataRef.current = {
      rawAccounts,
      transactions,
      categories,
      reminders,
      debts,
      currentMonth,
      selectedAccountId,
      activeSheet,
      currentUser,
    };
  }, [
    rawAccounts,
    transactions,
    categories,
    reminders,
    debts,
    currentMonth,
    selectedAccountId,
    activeSheet,
    currentUser,
  ]);

  // Bộ hẹn giờ: TỰ ĐỘNG LƯU BIỂU CHI TIẾT ĐỊNH KỲ MỖI 1 PHÚT (60.000ms)
  useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      const {
        rawAccounts: accs,
        transactions: txs,
        categories: cats,
        reminders: rems,
        debts: dbs,
        currentMonth: month,
        selectedAccountId: accId,
        activeSheet: sheet,
        currentUser: user,
      } = latestDataRef.current;

      try {
        setIsAutoSaving(true);
        // 1. Lưu tức thời toàn bộ dữ liệu vào LocalStorage của máy
        saveAccounts(accs);
        saveTransactions(txs);
        saveCategories(cats);
        saveReminders(rems);
        saveDebts(dbs);
        localStorage.setItem('so_thuchi_current_month', month);
        if (accId) {
          localStorage.setItem('so_thuchi_selected_account_id', accId);
        }
        localStorage.setItem('so_thuchi_active_sheet', sheet);
        const now = new Date();
        const nowStr = now.toISOString();
        localStorage.setItem('so_thuchi_last_local_save', nowStr);

        // 2. Đồng bộ lên đám mây nếu người dùng đã đăng nhập Google
        if (user) {
          const syncedTime = await backupDataToCloud(user, accs, txs, cats, rems, dbs);
          setLastSyncedAt(syncedTime);
          localStorage.setItem('so_thuchi_last_synced', syncedTime);
        }

        const pad = (n: number) => String(n).padStart(2, '0');
        const timeFormatted = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        setLastAutoSavedAt(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
        setAutoSaveToast(`Đã tự động lưu biểu chi tiết lúc ${timeFormatted}`);
        setTimeout(() => {
          setAutoSaveToast(null);
        }, 2500);
      } catch (err: any) {
        console.warn('Lỗi khi tự động lưu biểu chi tiết (1 phút):', err?.message || err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 60000); // 1 phút = 60,000ms

    return () => clearInterval(autoSaveInterval);
  }, []);

  // Background Cloud Auto-Sync on data change when user is authenticated
  const triggerAutoBackup = (
    newAccounts: Account[],
    newTransactions: Transaction[],
    newCategories: Category[],
    newReminders: ReminderSetting[],
    newDebts?: DebtRecord[]
  ) => {
    if (!currentUser) return;
    if (autoBackupTimeout.current) clearTimeout(autoBackupTimeout.current);

    autoBackupTimeout.current = setTimeout(async () => {
      try {
        setIsSyncing(true);
        const syncedTime = await backupDataToCloud(
          currentUser,
          newAccounts,
          newTransactions,
          newCategories,
          newReminders,
          newDebts || debts
        );
        setLastSyncedAt(syncedTime);
        localStorage.setItem('so_thuchi_last_synced', syncedTime);
      } catch (err: any) {
        console.warn('Auto backup notification:', err?.message || err);
      } finally {
        setIsSyncing(false);
      }
    }, 1500); // 1.5 second debounce
  };

  // Manual Backup Now Handler
  const handleManualBackupNow = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const syncedTime = await backupDataToCloud(currentUser, rawAccounts, transactions, categories, reminders);
      setLastSyncedAt(syncedTime);
      localStorage.setItem('so_thuchi_last_synced', syncedTime);
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual Restore Handler
  const handleManualRestoreFromCloud = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const cloudData = await loadDataFromCloud(currentUser);
      if (cloudData) {
        if (cloudData.accounts) setRawAccounts(cloudData.accounts);
        if (cloudData.transactions) setTransactions(cloudData.transactions);
        if (cloudData.categories) setCategories(cloudData.categories);
        if (cloudData.reminders) setReminders(cloudData.reminders);
        setLastSyncedAt(cloudData.lastSyncedAt);
        localStorage.setItem('so_thuchi_last_synced', cloudData.lastSyncedAt);
      } else {
        throw new Error('Chưa có dữ liệu trên đám mây');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate Streak & Logging Status
  const { streak, loggedToday } = useMemo(() => {
    return calculateStreak(transactions);
  }, [transactions]);

  // Setup periodic reminder schedule check (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const updated = checkDueReminders(reminders, transactions, (rem) => {
        sendBrowserNotification(
          rem.title,
          rem.message,
          rem.soundEnabled
        );
      });
      if (updated !== reminders) {
        setReminders(updated);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [reminders, transactions]);

  // --- Handlers for Transactions ---
  const handleOpenAddTransaction = (type: TransactionType = 'expense') => {
    setEditingTransaction(null);
    setTransactionModalType(type);
    setIsTransactionModalOpen(true);
  };

  const handleEditTransactionClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTransactionModalType(tx.type);
    setIsTransactionModalOpen(true);
  };

  const handleSaveTransaction = (
    data: Omit<Transaction, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    let nextTransactions: Transaction[];
    if (editingId) {
      // Edit existing
      nextTransactions = transactions.map((t) => (t.id === editingId ? { ...t, ...data } : t));
    } else {
      // Create new
      const newTx: Transaction = {
        ...data,
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Date.now(),
      };
      nextTransactions = [newTx, ...transactions];
    }
    setTransactions(nextTransactions);
    saveTransactions(nextTransactions);
    triggerAutoBackup(rawAccounts, nextTransactions, categories, reminders);
  };

  const handleSaveBatchTransactions = (
    batchData: Array<Omit<Transaction, 'id' | 'createdAt'>>
  ) => {
    if (!batchData.length) return;
    const newTxs: Transaction[] = batchData.map((d, index) => ({
      ...d,
      id: `tx-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now() - index * 10,
    }));
    const nextTransactions = [...newTxs, ...transactions];
    setTransactions(nextTransactions);
    saveTransactions(nextTransactions);
    triggerAutoBackup(rawAccounts, nextTransactions, categories, reminders);
  };

  const handleDeleteTransaction = (id: string) => {
    const nextTransactions = transactions.filter((t) => t.id !== id);
    setTransactions(nextTransactions);
    saveTransactions(nextTransactions);
    triggerAutoBackup(rawAccounts, nextTransactions, categories, reminders);
  };

  const handleUpdateTransactions = (nextTransactions: Transaction[]) => {
    setTransactions(nextTransactions);
    saveTransactions(nextTransactions);
    triggerAutoBackup(rawAccounts, nextTransactions, categories, reminders);
  };

  // --- Handlers for Accounts ---
  const handleAddAccount = (accData: Omit<Account, 'id' | 'balance'>) => {
    const newAcc: Account = {
      ...accData,
      id: `acc-${Date.now()}`,
      balance: accData.initialBalance || 0,
    };
    const nextAccounts = [...rawAccounts, newAcc];
    setRawAccounts(nextAccounts);
    saveAccounts(nextAccounts);
    triggerAutoBackup(nextAccounts, transactions, categories, reminders);
  };

  const handleEditAccount = (acc: Account) => {
    const nextAccounts = rawAccounts.map((a) => (a.id === acc.id ? acc : a));
    setRawAccounts(nextAccounts);
    saveAccounts(nextAccounts);
    triggerAutoBackup(nextAccounts, transactions, categories, reminders);
  };

  const handleDeleteAccount = (accountId: string) => {
    if (rawAccounts.length <= 1) {
      return;
    }
    const nextAccounts = rawAccounts.filter((a) => a.id !== accountId);
    setRawAccounts(nextAccounts);
    if (selectedAccountId === accountId) {
      setSelectedAccountId(nextAccounts[0]?.id || null);
    }
    triggerAutoBackup(nextAccounts, transactions, categories, reminders);
  };

  // --- Handlers for Categories (Sửa, Thêm & Bớt Danh Mục) ---
  const handleAddCategory = (catData: Omit<Category, 'id'>): Category => {
    const newCat: Category = {
      ...catData,
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const nextCategories = [...categories, newCat];
    setCategories(nextCategories);
    saveCategories(nextCategories);
    triggerAutoBackup(rawAccounts, transactions, nextCategories, reminders);
    return newCat;
  };

  const handleEditCategory = (updatedCat: Category) => {
    const nextCategories = categories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
    setCategories(nextCategories);
    saveCategories(nextCategories);
    triggerAutoBackup(rawAccounts, transactions, nextCategories, reminders);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const nextCategories = categories.filter((c) => c.id !== categoryId);
    setCategories(nextCategories);
    saveCategories(nextCategories);
    triggerAutoBackup(rawAccounts, transactions, nextCategories, reminders);
  };

  const handleResetCategories = () => {
    setCategories(DEFAULT_CATEGORIES);
    saveCategories(DEFAULT_CATEGORIES);
    triggerAutoBackup(rawAccounts, transactions, DEFAULT_CATEGORIES, reminders);
  };

  // --- Quick Transfer between Accounts ---
  const handleOpenTransfer = (sourceAccountId?: string) => {
    setEditingTransaction(null);
    setTransactionModalType('transfer');
    setIsTransactionModalOpen(true);
  };

  // --- Complete Salary Allocation in Batch ---
  const handleCompleteSalaryAllocation = (transactionsToCreate: Omit<Transaction, 'id' | 'createdAt'>[]) => {
    const newTxs: Transaction[] = transactionsToCreate.map((t, idx) => ({
      ...t,
      id: `tx-sal-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now() + idx,
    }));
    const nextTransactions = [...newTxs, ...transactions];
    setTransactions(nextTransactions);
    triggerAutoBackup(rawAccounts, nextTransactions, categories, reminders);
  };

  // --- Handlers for Debt Management (Sổ Ghi Nợ) ---
  const handleAddDebt = (debtData: Omit<DebtRecord, 'id' | 'createdAt' | 'paidAmount' | 'remainingAmount' | 'status' | 'payments'>) => {
    const newDebt: DebtRecord = {
      ...debtData,
      id: `debt-${Date.now()}`,
      paidAmount: 0,
      remainingAmount: debtData.originalAmount,
      status: 'unpaid',
      payments: [],
      createdAt: Date.now(),
    };
    const nextDebts = [newDebt, ...debts];
    setDebts(nextDebts);
    saveDebts(nextDebts);
    triggerAutoBackup(rawAccounts, transactions, categories, reminders, nextDebts);
  };

  const handleEditDebt = (updatedDebt: DebtRecord) => {
    const nextDebts = debts.map((d) => (d.id === updatedDebt.id ? updatedDebt : d));
    setDebts(nextDebts);
    saveDebts(nextDebts);
    triggerAutoBackup(rawAccounts, transactions, categories, reminders, nextDebts);
  };

  const handleDeleteDebt = (id: string) => {
    const nextDebts = debts.filter((d) => d.id !== id);
    setDebts(nextDebts);
    saveDebts(nextDebts);
    triggerAutoBackup(rawAccounts, transactions, categories, reminders, nextDebts);
  };

  const handleRecordDebtPayment = (debtId: string, paymentData: Omit<DebtPayment, 'id' | 'createdAt'>) => {
    const newPayment: DebtPayment = {
      ...paymentData,
      id: `pay-${Date.now()}`,
      createdAt: Date.now(),
    };

    const nextDebts = debts.map((debt) => {
      if (debt.id !== debtId) return debt;
      const nextPaid = debt.paidAmount + paymentData.amount;
      const nextRemaining = Math.max(0, debt.originalAmount - nextPaid);
      const nextStatus = nextRemaining === 0 ? ('paid' as const) : ('partial' as const);

      return {
        ...debt,
        paidAmount: nextPaid,
        remainingAmount: nextRemaining,
        status: nextStatus,
        payments: [...(debt.payments || []), newPayment],
      };
    });

    setDebts(nextDebts);
    saveDebts(nextDebts);
    triggerAutoBackup(rawAccounts, transactions, categories, reminders, nextDebts);
  };

  const handleMarkDebtAsPaid = (debtId: string) => {
    const nextDebts = debts.map((debt) => {
      if (debt.id !== debtId) return debt;
      return {
        ...debt,
        paidAmount: debt.originalAmount,
        remainingAmount: 0,
        status: 'paid' as const,
      };
    });
    setDebts(nextDebts);
    saveDebts(nextDebts);
    triggerAutoBackup(rawAccounts, transactions, categories, reminders, nextDebts);
  };

  // --- Backup / Restore / Reset ---
  const handleExportJSON = () => {
    exportDataAsJSON(rawAccounts, transactions, categories, reminders);
  };

  const handleExportCSV = () => {
    exportTransactionsAsCSV(transactions, accounts, categories);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.accounts && json.transactions) {
          setRawAccounts(json.accounts);
          setTransactions(json.transactions);
          if (json.reminders) setReminders(json.reminders);
          triggerAutoBackup(json.accounts, json.transactions, categories, json.reminders || reminders);
        } else {
          console.warn('Tệp sao lưu không đúng định dạng!');
        }
      } catch (err) {
        console.error('Có lỗi khi đọc file JSON:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Áp dụng dữ liệu từ file sao lưu toàn bộ
  const handleApplyBackupPayload = (payload: any) => {
    if (!payload || typeof payload !== 'object') return;

    if (Array.isArray(payload.accounts) && payload.accounts.length > 0) {
      setRawAccounts(payload.accounts);
      saveAccounts(payload.accounts);
    }
    if (Array.isArray(payload.transactions)) {
      setTransactions(payload.transactions);
      saveTransactions(payload.transactions);
    }
    if (Array.isArray(payload.categories) && payload.categories.length > 0) {
      setCategories(payload.categories);
      saveCategories(payload.categories);
    }
    if (Array.isArray(payload.reminders) && payload.reminders.length > 0) {
      setReminders(payload.reminders);
      saveReminders(payload.reminders);
    }
    if (Array.isArray(payload.debts)) {
      setDebts(payload.debts);
      saveDebts(payload.debts);
    }
    if (payload.currentMonth) {
      setCurrentMonth(payload.currentMonth);
      localStorage.setItem('so_thuchi_current_month', payload.currentMonth);
    }

    const nowStr = new Date().toISOString();
    localStorage.setItem('so_thuchi_last_local_save', nowStr);
    setSaveSuccessNotification(true);
    setTimeout(() => setSaveSuccessNotification(false), 3000);

    // Đồng bộ lên đám mây nếu đã đăng nhập
    if (currentUser) {
      backupDataToCloud(
        currentUser,
        payload.accounts || rawAccounts,
        payload.transactions || transactions,
        payload.categories || categories,
        payload.reminders || reminders,
        payload.debts || debts
      )
        .then((syncedTime) => {
          setLastSyncedAt(syncedTime);
          localStorage.setItem('so_thuchi_last_synced', syncedTime);
        })
        .catch((e) => console.warn('Cloud sync offline:', e?.message || e));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-16">
      {/* Navbar */}
      <Navbar
        currentMonth={currentMonth}
        currentUser={currentUser}
        lastSyncedAt={lastSyncedAt}
        isSyncing={isSyncing}
        isSaving={isManualSaving || isSyncing}
        saveSuccess={saveSuccessNotification}
        isAutoSaving={isAutoSaving}
        lastAutoSavedAt={lastAutoSavedAt}
        onManualSave={handleManualSaveAll}
        onOpenBackupModal={() => setIsBackupRestoreModalOpen(true)}
        onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
        onChangeMonth={setCurrentMonth}
        onOpenAddModal={(type) => handleOpenAddTransaction(type || 'expense')}
        onOpenReminderModal={() => setIsReminderModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onExportCSV={handleExportCSV}
        onResetData={resetAllData}
        streak={streak}
        loggedToday={loggedToday}
      />

      {/* Floating Save Success Toast */}
      {saveSuccessNotification && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-400 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Đã lưu toàn bộ dữ liệu an toàn vào máy & đồng bộ thành công!</span>
          </div>
        </div>
      )}

      {/* Floating Auto-Save 1 Minute Toast */}
      {autoSaveToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-[#0b1329]/95 text-emerald-300 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-emerald-500/40 font-bold text-xs backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{autoSaveToast} (định kỳ 1 phút)</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 flex-1">
        {/* ========================================================================= */}
        {/* SHEET NAVIGATION: SỔ THU CHI | SỔ TIẾT KIỆM | TỔNG HỢP | SỔ GHI NỢ        */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 border-b border-slate-200/90 pb-3 mb-6 overflow-x-auto">
          {/* Sheet 1: Sổ Thu Chi */}
          <button
            type="button"
            onClick={() => setActiveSheet('thuchi')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-black transition-all shrink-0 cursor-pointer ${
              activeSheet === 'thuchi'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30 scale-102'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-2xs'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Sổ Thu Chi</span>
          </button>

          {/* Sheet 2: Sổ Tiết Kiệm */}
          <button
            type="button"
            onClick={() => setActiveSheet('tietkiem')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-black transition-all shrink-0 cursor-pointer ${
              activeSheet === 'tietkiem'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 ring-2 ring-teal-500/30 scale-102'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-2xs'
            }`}
          >
            <PiggyBank className="w-4 h-4" />
            <span>Sổ Tiết Kiệm</span>
          </button>

          {/* Sheet 3: Bảng Tổng Hợp */}
          <button
            type="button"
            onClick={() => setActiveSheet('tonghop')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-black transition-all shrink-0 cursor-pointer ${
              activeSheet === 'tonghop'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 ring-2 ring-sky-500/30 scale-102'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-2xs'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Bảng Tổng Hợp</span>
          </button>

          {/* Sheet 4: Sổ Ghi Nợ */}
          <button
            type="button"
            onClick={() => setActiveSheet('ghino')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-black transition-all shrink-0 cursor-pointer ${
              activeSheet === 'ghino'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-500/30 scale-102'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-2xs'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Sổ Ghi Nợ</span>
            {debts.filter((d) => d.status !== 'paid').length > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  activeSheet === 'ghino'
                    ? 'bg-white/20 text-white'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {debts.filter((d) => d.status !== 'paid').length}
              </span>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* NỘI DUNG SHEET 1: SỔ THU CHI                                              */}
        {/* ========================================================================= */}
        {activeSheet === 'thuchi' && (
          <>
            {/* 1. Bank Accounts & Transactions Manager */}
            <BankManager
              accounts={accounts}
              categories={categories}
              transactions={transactions}
              currentMonth={currentMonth}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              onAddAccount={handleAddAccount}
              onEditAccount={handleEditAccount}
              onDeleteAccount={handleDeleteAccount}
              onOpenTransfer={handleOpenTransfer}
              onOpenSalaryAllocation={() => setIsSalaryModalOpen(true)}
              onAddTransaction={handleSaveTransaction}
              onEditTransaction={(updatedTx) => handleSaveTransaction(updatedTx, updatedTx.id)}
              onAddBatchTransactions={handleSaveBatchTransactions}
              onDeleteTransaction={handleDeleteTransaction}
              debts={debts}
              onAddDebt={handleAddDebt}
              onRecordPayment={handleRecordDebtPayment}
              onAddCategory={handleAddCategory}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategory}
              onResetCategories={handleResetCategories}
              onNavigateToSheet={(sheet) => setActiveSheet(sheet)}
            />

            {/* 2. Transactions List */}
            <TransactionList
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              currentMonth={currentMonth}
              selectedAccountId={selectedAccountId}
              onEditTransaction={handleEditTransactionClick}
              onDeleteTransaction={handleDeleteTransaction}
              onUpdateTransactions={handleUpdateTransactions}
              onEditAccount={handleEditAccount}
              onExportCSV={handleExportCSV}
            />
          </>
        )}

        {/* ========================================================================= */}
        {/* NỘI DUNG SHEET 2: SỔ TIẾT KIỆM & TÍCH LŨY MỤC TIÊU                        */}
        {/* ========================================================================= */}
        {activeSheet === 'tietkiem' && (
          <SavingsManager
            accounts={accounts}
            transactions={transactions}
            currentMonth={currentMonth}
            onAddTransaction={handleSaveTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {/* ========================================================================= */}
        {/* NỘI DUNG SHEET 3: BẢNG TỔNG HỢP (1. NĂM, 2. THÁNG, 3. BIỂU ĐỒ)            */}
        {/* ========================================================================= */}
        {activeSheet === 'tonghop' && (
          <GeneralReportSheet
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            currentMonth={currentMonth}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            onChangeMonth={setCurrentMonth}
            onOpenTransfer={handleOpenTransfer}
            onOpenSalaryAllocation={() => setIsSalaryModalOpen(true)}
            onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
          />
        )}

        {/* ========================================================================= */}
        {/* NỘI DUNG SHEET 4: SỔ GHI NỢ (BẢNG REPORT GHI NỢ)                          */}
        {/* ========================================================================= */}
        {activeSheet === 'ghino' && (
          <DebtManager
            debts={debts}
            accounts={accounts}
            transactions={transactions}
            currentMonth={currentMonth}
            onAddDebt={handleAddDebt}
            onEditDebt={handleEditDebt}
            onDeleteDebt={handleDeleteDebt}
            onRecordPayment={handleRecordDebtPayment}
            onMarkAsPaid={handleMarkDebtAsPaid}
          />
        )}
      </main>

      {/* Modals */}
      <SalaryAllocationModal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
        accounts={accounts}
        categories={categories}
        currentMonth={currentMonth}
        onCompleteAllocation={handleCompleteSalaryAllocation}
      />
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        accounts={accounts}
        categories={categories}
        initialType={transactionModalType}
        editingTransaction={editingTransaction}
        onSave={handleSaveTransaction}
        onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
      />

      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        reminders={reminders}
        transactions={transactions}
        onSaveReminders={(updated) => {
          setReminders(updated);
          triggerAutoBackup(rawAccounts, transactions, categories, updated);
        }}
        onOpenAddTransaction={() => handleOpenAddTransaction('expense')}
      />

      <BackupRestoreModal
        isOpen={isBackupRestoreModalOpen}
        onClose={() => setIsBackupRestoreModalOpen(false)}
        accounts={accounts}
        transactions={transactions}
        categories={categories}
        reminders={reminders}
        debts={debts}
        currentMonth={currentMonth}
        currentUser={currentUser}
        lastSyncedAt={lastSyncedAt}
        onApplyBackupPayload={handleApplyBackupPayload}
        onTriggerSaveAll={handleManualSaveAll}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        lastSyncedAt={lastSyncedAt}
        isSyncing={isSyncing}
        onBackupNow={handleManualBackupNow}
        onRestoreFromCloud={handleManualRestoreFromCloud}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onGetBackupPayload={() => ({
          accounts: rawAccounts,
          transactions,
          categories,
          reminders,
          exportedAt: new Date().toISOString(),
          version: 1,
        })}
        onApplyBackupPayload={(payload) => {
          if (payload.accounts && payload.transactions) {
            setRawAccounts(payload.accounts);
            setTransactions(payload.transactions);
            if (payload.reminders) setReminders(payload.reminders);
            triggerAutoBackup(
              payload.accounts,
              payload.transactions,
              categories,
              payload.reminders || reminders
            );
          }
        }}
      />

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        transactions={transactions}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        onResetCategories={handleResetCategories}
      />
    </div>
  );
}
