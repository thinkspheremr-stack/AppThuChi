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
import { Wallet, FileText } from 'lucide-react';

export default function App() {
  // Current active sheet: 'thuchi' (Sổ Thu Chi) | 'ghino' (Sổ Ghi Nợ)
  const [activeSheet, setActiveSheet] = useState<'thuchi' | 'ghino'>('thuchi');

  // Current month: YYYY-MM
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Core Data
  const [rawAccounts, setRawAccounts] = useState<Account[]>(() => {
    const stored = getStoredAccounts();
    const vcbOnly = stored.filter((a) => a.id === 'acc-vcb' || a.name.toLowerCase().includes('vietcombank'));
    return vcbOnly.length > 0 ? vcbOnly : stored;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStoredTransactions());
  const [categories, setCategories] = useState<Category[]>(() => getStoredCategories());
  const [reminders, setReminders] = useState<ReminderSetting[]>(() => getStoredReminders());
  const [debts, setDebts] = useState<DebtRecord[]>(() => getStoredDebts());

  // Filter state: filter by specific bank/wallet
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // User Auth & Cloud Sync state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStorage.getItem('so_thuchi_last_synced'));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Modals state
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState<TransactionType>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);

  // Auto-backup debounce timer ref
  const autoBackupTimeout = useRef<NodeJS.Timeout | null>(null);

  // Re-compute live account balances whenever transactions or rawAccounts change
  const accounts = useMemo(() => {
    return recalculateAccountBalances(rawAccounts, transactions);
  }, [rawAccounts, transactions]);

  // Persist accounts locally
  useEffect(() => {
    saveAccounts(rawAccounts);
  }, [rawAccounts]);

  // Persist transactions locally
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  // Persist reminders locally
  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Try fetching cloud data on sign-in
        try {
          setIsSyncing(true);
          const cloudData = await loadDataFromCloud(user);
          if (cloudData) {
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
          } else {
            // First time this user signs in: automatically backup current local data to cloud!
            const syncedTime = await backupDataToCloud(user, rawAccounts, transactions, categories, reminders);
            setLastSyncedAt(syncedTime);
            localStorage.setItem('so_thuchi_last_synced', syncedTime);
          }
        } catch (err) {
          console.error('Error syncing cloud on login:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Background Cloud Auto-Sync on data change when user is authenticated
  const triggerAutoBackup = (
    newAccounts: Account[],
    newTransactions: Transaction[],
    newCategories: Category[],
    newReminders: ReminderSetting[]
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
          newReminders
        );
        setLastSyncedAt(syncedTime);
        localStorage.setItem('so_thuchi_last_synced', syncedTime);
      } catch (err) {
        console.error('Auto backup failed:', err);
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
    triggerAutoBackup(rawAccounts, nextTransactions, categories, reminders);
  };

  const handleDeleteTransaction = (id: string) => {
    const nextTransactions = transactions.filter((t) => t.id !== id);
    setTransactions(nextTransactions);
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
    triggerAutoBackup(nextAccounts, transactions, categories, reminders);
  };

  const handleEditAccount = (acc: Account) => {
    const nextAccounts = rawAccounts.map((a) => (a.id === acc.id ? acc : a));
    setRawAccounts(nextAccounts);
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
  };

  const handleEditDebt = (updatedDebt: DebtRecord) => {
    const nextDebts = debts.map((d) => (d.id === updatedDebt.id ? updatedDebt : d));
    setDebts(nextDebts);
    saveDebts(nextDebts);
  };

  const handleDeleteDebt = (id: string) => {
    const nextDebts = debts.filter((d) => d.id !== id);
    setDebts(nextDebts);
    saveDebts(nextDebts);
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
          alert('Khôi phục dữ liệu thành công!');
        } else {
          alert('Tệp sao lưu không đúng định dạng!');
        }
      } catch (err) {
        alert('Có lỗi khi đọc file JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-16">
      {/* Navbar */}
      <Navbar
        currentMonth={currentMonth}
        currentUser={currentUser}
        lastSyncedAt={lastSyncedAt}
        isSyncing={isSyncing}
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 flex-1">
        {/* ========================================================================= */}
        {/* SHEET NAVIGATION: SỔ THU CHI & SỔ GHI NỢ                                  */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 border-b border-slate-200/90 pb-3 mb-6">
          {/* Sheet 1: Sổ Thu Chi */}
          <button
            type="button"
            onClick={() => setActiveSheet('thuchi')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeSheet === 'thuchi'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30 scale-102'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-2xs'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Sổ Thu Chi</span>
          </button>

          {/* Sheet 2: Sổ Ghi Nợ */}
          <button
            type="button"
            onClick={() => setActiveSheet('ghino')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
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
              onDeleteTransaction={handleDeleteTransaction}
            />

            {/* 2. BẢNG BÁO CÁO TỔNG HỢP DÒNG TIỀN, THU CHI & TIẾT KIỆM */}
            <FinancialReportTable
              accounts={accounts}
              transactions={transactions}
              categories={categories}
              currentMonth={currentMonth}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              onOpenTransfer={handleOpenTransfer}
              onOpenSalaryAllocation={() => setIsSalaryModalOpen(true)}
            />

            {/* 3. Monthly Charts & Bank Spending Analytics */}
            <MonthlyCharts
              currentMonth={currentMonth}
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              selectedAccountId={selectedAccountId}
            />

            {/* 4. Transactions List */}
            <TransactionList
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              currentMonth={currentMonth}
              selectedAccountId={selectedAccountId}
              onEditTransaction={handleEditTransactionClick}
              onDeleteTransaction={handleDeleteTransaction}
              onExportCSV={handleExportCSV}
            />
          </>
        )}

        {/* ========================================================================= */}
        {/* NỘI DUNG SHEET 2: SỔ GHI NỢ (BẢNG REPORT GHI NỢ)                          */}
        {/* ========================================================================= */}
        {activeSheet === 'ghino' && (
          <DebtManager
            debts={debts}
            accounts={accounts}
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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        lastSyncedAt={lastSyncedAt}
        isSyncing={isSyncing}
        onBackupNow={handleManualBackupNow}
        onRestoreFromCloud={handleManualRestoreFromCloud}
      />
    </div>
  );
}
