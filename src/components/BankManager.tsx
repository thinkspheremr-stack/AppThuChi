import React, { useState, useMemo } from 'react';
import { Account, AccountType, Category, Transaction, DebtRecord, DebtPayment } from '../types';
import { formatCurrency, formatFriendlyDate, compareTransactionsSameDay } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { ReceiptScannerModal } from './ReceiptScannerModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import {
  Plus,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit2,
  Landmark,
  Wallet,
  Banknote,
  CreditCard,
  X,
  PiggyBank,
  Check,
  Building2,
  Coins,
  Camera,
  Pencil,
  Settings,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface BankManagerProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  currentMonth: string; // YYYY-MM
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string | null) => void;
  onAddAccount: (account: Omit<Account, 'id' | 'balance'>) => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => void;
  onOpenTransfer: (sourceAccountId?: string) => void;
  onOpenSalaryAllocation: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onAddBatchTransactions?: (transactions: Array<Omit<Transaction, 'id' | 'createdAt'>>) => void;
  onDeleteTransaction: (id: string) => void;
  debts?: DebtRecord[];
  onAddDebt?: (debt: Omit<DebtRecord, 'id' | 'createdAt' | 'paidAmount' | 'remainingAmount' | 'status' | 'payments'>) => void;
  onRecordPayment?: (debtId: string, payment: Omit<DebtPayment, 'id' | 'createdAt'>) => void;
  onAddCategory?: (category: Omit<Category, 'id'>) => Category | void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onResetCategories?: () => void;
  onNavigateToSheet?: (sheet: 'thuchi' | 'tietkiem' | 'tonghop' | 'ghino') => void;
}

export const BankManager: React.FC<BankManagerProps> = ({
  accounts,
  categories,
  transactions,
  currentMonth,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onOpenTransfer,
  onOpenSalaryAllocation,
  onAddTransaction,
  onEditTransaction,
  onAddBatchTransactions,
  onDeleteTransaction,
  debts = [],
  onAddDebt,
  onRecordPayment,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onResetCategories,
  onNavigateToSheet,
}) => {
  // Active bank
  const activeAccountId = selectedAccountId || accounts[0]?.id || '';
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0];

  // 4 Main Tabs: 'chi' | 'thu' | 'chuyen' | 'chovay' (Theo đúng bản vẽ và vị trí bôi màu xanh)
  const [subTab, setSubTab] = useState<'chi' | 'thu' | 'chuyen' | 'chovay'>('chi');

  // Sub-modes inside [Chuyển]: 'bank' (Chuyển giữa các ngân hàng) | 'saving' (Mục Tiết kiệm) | 'loan' (Mục Cho vay)
  const [transferMode, setTransferMode] = useState<'bank' | 'saving' | 'loan'>('bank');
  // Sub-action inside [Cho vay]: 'lend' (Cho mượn) | 'repay' (Trả nợ / Thu nợ)
  const [loanAction, setLoanAction] = useState<'lend' | 'repay'>('lend');
  // Sub-filter inside [Cho vay]: 'all' (Tất cả) | 'lend' (Chỉ mục cho mượn) | 'repay' (Chỉ mục trả)
  const [loanFilter, setLoanFilter] = useState<'all' | 'lend' | 'repay'>('all');
  const [borrowerName, setBorrowerName] = useState<string>('');

  // Category Manager Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Month parse: e.g. "2026-09" -> year 2026, month 9
  const [yearStr, monthStr] = currentMonth.split('-');
  const monthNum = parseInt(monthStr, 10);

  // Today's day number as default
  const todayDay = new Date().getDate();

  // INLINE ENTRY STATE (Theo đúng bản vẽ: Ngày | Số tiền | Nội dung)
  // Ngày: gõ trực tiếp số (ví dụ: gõ 1 -> ngày 01, gõ 15 -> ngày 15)
  const [inputDay, setInputDay] = useState<string>(String(todayDay));
  // Số tiền: gõ 100 -> tự động thêm 000 thành 100.000 đ
  const [inputRawAmount, setInputRawAmount] = useState<string>('');
  const [autoAdd000, setAutoAdd000] = useState<boolean>(true);
  // Nội dung: gõ trực tiếp
  const [inputDescription, setInputDescription] = useState<string>('');
  // Danh mục chọn nhanh (Đồng nhất với khi up ảnh)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // AI Receipt Scanner Modal state
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);

  // Target account for transfer between banks
  const otherAccounts = accounts.filter((a) => a.id !== activeAccountId);
  const [targetBankId, setTargetBankId] = useState<string>(otherAccounts[0]?.id || '');

  // Saving name for transfer to saving
  const [savingTitle, setSavingTitle] = useState<string>('Tiết kiệm tích lũy');

  // Editing existing row inline state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editDay, setEditDay] = useState<string>('');
  const [editAmount, setEditAmount] = useState<number | ''>('');
  const [editDescription, setEditDescription] = useState<string>('');

  // Modal Add / Edit / Remove Account (Thêm / Bớt tài khoản)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<'list' | 'add'>('list');
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setType] = useState<AccountType>('bank');
  const [accBankName, setBankName] = useState('');
  const [accNumber, setAccountNumber] = useState('');
  const [accInitialBalance, setInitialBalance] = useState<number>(0);
  const [accColor, setColor] = useState('#006533');

  // Toast thông báo đồng bộ sang Sheet Sổ Ghi Nợ
  const [loanSyncToast, setLoanSyncToast] = useState<{ message: string; person?: string } | null>(null);

  // Calculate actual calculated amount (Hỗ trợ số lẻ như 0,217 = 217 đồng khi có autoAdd000)
  const normalizedInput = String(inputRawAmount || '').trim().replace(',', '.');
  const rawNum = parseFloat(normalizedInput) || 0;
  const calculatedAmount = autoAdd000 ? Math.round(rawNum * 1000) : Math.round(rawNum);

  // Month transactions for active account
  const monthTransactions = transactions.filter((t) => {
    if (!t.date.startsWith(currentMonth)) return false;
    return (
      t.accountId === activeAccountId ||
      (t.type === 'transfer' && t.toAccountId === activeAccountId)
    );
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // 1. Inflows (Thu) for this bank:
  // - Direct income into this bank
  // - Transfers from other banks into this bank ("Số chuyển đi ngân hàng là Phần thu của ngân hàng khác")
  // - Saving transfers initiated from this bank ("ngân hàng này chuyển Mục tiết kiệm thì ở trong Phần Thu sẽ xuất hiện Mục tiết kiệm")
  const inflows = monthTransactions.filter((t) => {
    if (t.type === 'income' && t.accountId === activeAccountId) return true;
    if (t.type === 'transfer' && t.toAccountId === activeAccountId) return true;
    // Saving transfer from this bank also appears in Thu as requested
    if (
      t.type === 'transfer' &&
      t.accountId === activeAccountId &&
      (t.toAccountId === 'saving' || t.tags?.includes('saving'))
    ) {
      return true;
    }
    return false;
  });
  const totalInflow = inflows.reduce((sum, t) => sum + t.amount, 0);

  // Separate real external income vs internal transfers received
  const directIncome = monthTransactions
    .filter((t) => t.type === 'income' && t.accountId === activeAccountId)
    .reduce((sum, t) => sum + t.amount, 0);

  const receivedTransfers = monthTransactions
    .filter((t) => t.type === 'transfer' && t.toAccountId === activeAccountId)
    .reduce((sum, t) => sum + t.amount, 0);

  // 2. Outflows (Chi) for this bank:
  // - Direct expenses
  const outflows = monthTransactions.filter(
    (t) => t.type === 'expense' && t.accountId === activeAccountId
  );
  const totalOutflow = outflows.reduce((sum, t) => sum + t.amount, 0);

  // 3. Transfers Out (Chuyển đi) from this bank:
  // - Transfers to another bank or to savings
  const transfersOut = monthTransactions.filter(
    (t) => t.type === 'transfer' && t.accountId === activeAccountId
  );

  // Transfers to other banks specifically
  const bankTransfersOut = transfersOut.filter(
    (t) => t.toAccountId !== 'saving' && !t.tags?.includes('saving')
  );

  // Transfers to savings specifically
  const savingsTransfersOut = transfersOut.filter(
    (t) => t.toAccountId === 'saving' || t.tags?.includes('saving')
  );
  const totalSavingsThisMonth = savingsTransfersOut.reduce((sum, t) => sum + t.amount, 0);

  // 4. Cho vay & Trả nợ theo tài khoản này trong tháng:
  const loanTransactions = monthTransactions.filter((t) => {
    const isThisAccount =
      t.accountId === activeAccountId || (t.type === 'transfer' && t.toAccountId === activeAccountId);
    if (!isThisAccount) return false;
    const isTagLoan = t.tags?.includes('loan') || t.tags?.includes('lend') || t.tags?.includes('repay');
    const isDescLoan =
      /mượn|cho vay|trả nợ|thu nợ|cho mượn|vay|thu hồi nợ|trả nợ vay/i.test(t.description || '') ||
      /mượn|cho vay|trả nợ|thu nợ|cho mượn|vay/i.test(t.note || '');
    return isTagLoan || isDescLoan;
  });

  // Mục Cho mượn (Khoản tiền chi ra / cho mượn từ tài khoản này)
  const loanLendList = loanTransactions.filter(
    (t) =>
      t.tags?.includes('lend') ||
      (t.type === 'expense' && !t.tags?.includes('repay')) ||
      /cho mượn|cho vay/i.test(t.description || '')
  );

  // Mục Trả (Khoản tiền người ta trả nợ / thu hồi về tài khoản này)
  const loanRepayList = loanTransactions.filter(
    (t) =>
      t.tags?.includes('repay') ||
      (t.type === 'income' && !t.tags?.includes('lend')) ||
      /trả|thu nợ|thu hồi/i.test(t.description || '')
  );

  const totalLoanOut = loanLendList.reduce((sum, t) => sum + t.amount, 0);
  const totalLoanIn = loanRepayList.reduce((sum, t) => sum + t.amount, 0);

  // Tính số tiền còn lại (running balance) của tài khoản đang chọn theo thứ tự thời gian
  // Bắt đầu từ số dư ban đầu, giảm khi chi tiêu/chuyển đi và tăng khi có thu nhập/chuyển vào
  const bankRunningBalances = useMemo(() => {
    if (!activeAccount) return new Map<string, number>();

    const allSorted = [...transactions]
      .filter(
        (t) =>
          t.accountId === activeAccountId ||
          (t.type === 'transfer' && t.toAccountId === activeAccountId)
      )
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return compareTransactionsSameDay(a, b);
      });

    let running = activeAccount.initialBalance || 0;
    const map = new Map<string, number>();

    allSorted.forEach((tx) => {
      if (tx.accountId === activeAccountId) {
        if (tx.type === 'income') running += tx.amount;
        else if (tx.type === 'expense' || tx.type === 'transfer') running -= tx.amount;
      }
      if (tx.type === 'transfer' && tx.toAccountId === activeAccountId) {
        running += tx.amount;
      }
      map.set(tx.id, running);
    });

    return map;
  }, [activeAccount, activeAccountId, transactions]);

  // Handle Quick Add / Transfer directly from the table row
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calculatedAmount || calculatedAmount <= 0 || !activeAccount) return;

    let dayNumber = parseInt(inputDay, 10);
    if (isNaN(dayNumber) || dayNumber < 1) dayNumber = 1;
    if (dayNumber > 31) dayNumber = 31;
    const formattedDate = `${currentMonth}-${String(dayNumber).padStart(2, '0')}`;

    if (subTab === 'chovay' || subTab === 'chuyen') {
      if (subTab === 'chovay' || transferMode === 'loan') {
        // Mục cho vay theo tài khoản (có mục cho mượn và có mục trả)
        // Nếu chưa nhập người mượn, cố gắng trích xuất từ nội dung ghi chú
        let person = borrowerName.trim();
        if (!person && inputDescription.trim()) {
          const match = inputDescription.trim().match(/^(?:cho|cho vay|mượn|cho mượn)\s+([a-zA-ZÀ-ỹ0-9\s]{2,25})/i);
          if (match && match[1]) {
            person = match[1].trim();
          } else if (inputDescription.trim().length <= 25) {
            person = inputDescription.trim();
          }
        }
        if (!person) person = 'Người mượn';

        if (loanAction === 'lend') {
          // 1. Cho mượn: Tiền xuất/chi từ tài khoản này
          const desc = inputDescription.trim() || `Cho ${person} mượn`;
          onAddTransaction({
            type: 'expense',
            amount: calculatedAmount,
            date: formattedDate,
            time: new Date().toTimeString().slice(0, 5),
            accountId: activeAccount.id,
            description: desc,
            note: `Cho mượn • Người mượn: ${person}`,
            tags: ['loan', 'lend'],
          });

          // Tự động đồng bộ vào Sheet Sổ Ghi Nợ
          if (onAddDebt) {
            onAddDebt({
              type: 'lend',
              personName: person,
              originalAmount: calculatedAmount,
              startDate: formattedDate,
              description: desc,
              accountId: activeAccount.id,
            });
          }

          setLoanSyncToast({
            message: `Đã ghi nhận khoản cho mượn ${formatCurrency(calculatedAmount)} và tự động ghi thông tin của "${person}" sang Sheet Sổ Ghi Nợ!`,
            person,
          });
        } else {
          // 2. Trả: Người mượn trả tiền về tài khoản này (Thu vào)
          const desc = inputDescription.trim() || `${person} trả tiền mượn`;
          onAddTransaction({
            type: 'income',
            amount: calculatedAmount,
            date: formattedDate,
            time: new Date().toTimeString().slice(0, 5),
            accountId: activeAccount.id,
            description: desc,
            note: `Thu nợ / Được trả • Người trả: ${person}`,
            tags: ['loan', 'repay'],
          });

          // Tự động cập nhật giảm dư nợ trong Sheet Sổ Ghi Nợ
          if (debts.length > 0 && onRecordPayment) {
            let matchingDebt = debts.find(
              (d) =>
                d.type === 'lend' &&
                d.status !== 'paid' &&
                person !== 'Người mượn' &&
                d.personName.toLowerCase().includes(person.toLowerCase())
            );
            if (!matchingDebt && debts.some((d) => d.type === 'lend' && d.status !== 'paid')) {
              matchingDebt = debts.find((d) => d.type === 'lend' && d.status !== 'paid');
            }
            if (matchingDebt) {
              onRecordPayment(matchingDebt.id, {
                amount: calculatedAmount,
                date: formattedDate,
                note: desc,
                accountId: activeAccount.id,
              });
              setLoanSyncToast({
                message: `Đã ghi nhận tiền trả và tự động cập nhật giảm dư nợ của "${matchingDebt.personName}" trong Sheet Sổ Ghi Nợ!`,
                person: matchingDebt.personName,
              });
            } else {
              setLoanSyncToast({
                message: `Đã ghi nhận tiền trả ${formatCurrency(calculatedAmount)} vào tài khoản ${activeAccount.name}!`,
                person,
              });
            }
          } else {
            setLoanSyncToast({
              message: `Đã ghi nhận tiền trả ${formatCurrency(calculatedAmount)} vào tài khoản ${activeAccount.name}!`,
              person,
            });
          }
        }
      } else if (transferMode === 'bank') {
        // Transfer between banks
        const targetId = targetBankId || otherAccounts[0]?.id;
        if (!targetId) {
          alert('Vui lòng thêm ít nhất một ngân hàng nhận trước khi chuyển khoản!');
          return;
        }
        const targetAcc = accounts.find((a) => a.id === targetId);

        onAddTransaction({
          type: 'transfer',
          amount: calculatedAmount,
          date: formattedDate,
          time: new Date().toTimeString().slice(0, 5),
          accountId: activeAccount.id, // Ngân hàng gửi
          toAccountId: targetId,       // Ngân hàng nhận
          description: inputDescription.trim() || `Chuyển sang ${targetAcc?.name || 'ngân hàng khác'}`,
          note: `Chuyển từ ${activeAccount.name} sang ${targetAcc?.name || 'tài khoản khác'}`,
        });
      } else if (transferMode === 'saving') {
        // Transfer to Saving ("ngân hàng này chuyển Mục tiết kiệm thì ở trong Phần Thu sẽ xuất hiện Mục tiết kiệm: ....")
        const saveName = savingTitle.trim() || 'Tiết kiệm tích lũy';
        onAddTransaction({
          type: 'transfer',
          amount: calculatedAmount,
          date: formattedDate,
          time: new Date().toTimeString().slice(0, 5),
          accountId: activeAccount.id,
          toAccountId: 'saving',
          categoryId: 'cat-invest',
          description: `Mục Tiết kiệm: ${saveName}`,
          note: inputDescription.trim() || 'Trích từ tài khoản gửi vào tiết kiệm',
          tags: ['saving'],
        });
      }
    } else {
      // Regular Chi or Thu
      const relevantCats = categories.filter(
        (c) => c.type === (subTab === 'thu' ? 'income' : 'expense')
      );
      const catToUse =
        selectedCategoryId && relevantCats.some((c) => c.id === selectedCategoryId)
          ? selectedCategoryId
          : relevantCats[0]?.id;

      onAddTransaction({
        type: subTab === 'thu' ? 'income' : 'expense',
        amount: calculatedAmount,
        date: formattedDate,
        time: new Date().toTimeString().slice(0, 5),
        accountId: activeAccount.id,
        categoryId: catToUse,
        description: inputDescription.trim() || (subTab === 'thu' ? 'Khoản thu' : 'Khoản chi'),
        note: `Ghi nhanh tại ${activeAccount.name}`,
      });
    }

    setInputRawAmount('');
    setInputDescription('');
    setBorrowerName('');
  };

  // Start inline editing of an existing row
  const handleStartEdit = (tx: Transaction) => {
    setEditingRowId(tx.id);
    const day = parseInt(tx.date.split('-')[2], 10);
    setEditDay(String(day));
    setEditAmount(tx.amount);
    setEditDescription(tx.description);
  };

  // Save inline edit
  const handleSaveEdit = (txId: string) => {
    let dayNumber = parseInt(editDay, 10);
    if (isNaN(dayNumber) || dayNumber < 1) dayNumber = 1;
    if (dayNumber > 31) dayNumber = 31;
    const formattedDate = `${currentMonth}-${String(dayNumber).padStart(2, '0')}`;

    const originalTx = transactions.find((t) => t.id === txId);
    if (originalTx && editAmount && Number(editAmount) > 0) {
      if (onEditTransaction) {
        onEditTransaction({
          ...originalTx,
          date: formattedDate,
          amount: Number(editAmount),
          description: editDescription.trim() || originalTx.description,
        });
      } else {
        onAddTransaction({
          ...originalTx,
          date: formattedDate,
          amount: Number(editAmount),
          description: editDescription.trim() || originalTx.description,
        });
        onDeleteTransaction(txId);
      }
    }
    setEditingRowId(null);
  };

  // Quick helper to add a common preset bank (e.g. when user wants to transfer but only has 1 account)
  const handleQuickAddPresetBank = (presetName: string, presetColor: string, presetType: AccountType) => {
    onAddAccount({
      name: presetName,
      type: presetType,
      bankName: presetName,
      accountNumber: '****' + Math.floor(1000 + Math.random() * 9000),
      initialBalance: 0,
      color: presetColor,
      iconName: presetType === 'wallet' ? 'Wallet' : 'Landmark',
    });
  };

  // Account modal submit
  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    let iconName = 'Landmark';
    if (accType === 'wallet') iconName = 'Wallet';
    else if (accType === 'cash') iconName = 'Banknote';
    else if (accType === 'credit') iconName = 'CreditCard';

    if (editingAccount) {
      onEditAccount({
        ...editingAccount,
        name: accName.trim(),
        type: accType,
        bankName: accBankName.trim(),
        accountNumber: accNumber.trim(),
        initialBalance: Number(accInitialBalance) || 0,
        color: accColor,
        iconName,
      });
    } else {
      onAddAccount({
        name: accName.trim(),
        type: accType,
        bankName: accBankName.trim(),
        accountNumber: accNumber.trim(),
        initialBalance: Number(accInitialBalance) || 0,
        color: accColor,
        iconName,
      });
    }

    setIsAccountModalOpen(false);
  };

  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setType('bank');
    setBankName('');
    setAccountNumber('');
    setInitialBalance(0);
    setColor('#006533');
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setType(acc.type);
    setBankName(acc.bankName || '');
    setAccountNumber(acc.accountNumber || '');
    setInitialBalance(acc.initialBalance || 0);
    setColor(acc.color);
    setIsAccountModalOpen(true);
  };

  // The active list based on user's selected subTab ('chi' | 'thu' | 'chuyen' | 'chovay')
  let currentList: Transaction[] = [];
  if (subTab === 'chi') {
    currentList = outflows;
  } else if (subTab === 'thu') {
    currentList = inflows;
  } else if (subTab === 'chuyen') {
    if (transferMode === 'bank') {
      currentList = bankTransfersOut;
    } else if (transferMode === 'saving') {
      currentList = savingsTransfersOut;
    } else {
      if (loanFilter === 'lend') currentList = loanLendList;
      else if (loanFilter === 'repay') currentList = loanRepayList;
      else currentList = loanTransactions;
    }
  } else {
    // subTab === 'chovay' (Mục cho vay theo tài khoản)
    if (loanFilter === 'lend') currentList = loanLendList;
    else if (loanFilter === 'repay') currentList = loanRepayList;
    else currentList = loanTransactions;
  }
  currentList = [...currentList].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return compareTransactionsSameDay(a, b);
  });

  return (
    <div className="space-y-4 mb-6">
      {/* ========================================================================= */}
      {/* KHUNG TRÊN: [Vietcombank] [Tháng 9] ở góc & Thu: ... Chi: ... ở giữa      */}
      {/* ========================================================================= */}
      <div className="bg-[#1b5e7d] text-white rounded-2xl shadow-md p-5 border border-sky-900/40">
        {/* Top Row: Bank Tabs & Month Badge & Action Tools */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-sky-600/40 pb-4">
          {/* List of Bank Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {accounts.map((acc) => {
              const isActive = acc.id === activeAccountId;
              return (
                <div key={acc.id} className="inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => onSelectAccount(acc.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      isActive
                        ? 'bg-purple-700 text-white ring-2 ring-white/60 shadow-md scale-105'
                        : 'bg-sky-800/80 hover:bg-sky-700 text-sky-100 hover:text-white'
                    }`}
                    style={isActive && acc.color ? { backgroundColor: acc.color } : undefined}
                    title={`Chọn tài khoản ${acc.name}`}
                  >
                    <CategoryIcon name={acc.iconName} className="w-4 h-4" />
                    <span>{acc.name}</span>
                  </button>
                </div>
              );
            })}

            {/* Thêm / Bớt tài khoản (Hợp nhất theo yêu cầu) */}
            <button
              type="button"
              onClick={() => {
                setAccountModalTab('list');
                setEditingAccount(null);
                setDeletingAccountId(null);
                setIsAccountModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-900/90 hover:bg-sky-800 text-sky-100 border border-sky-500/50 transition-all shadow-xs cursor-pointer hover:scale-102"
              title="Quản lý tài khoản: Thêm mới hoặc bớt/xóa tài khoản an toàn"
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Thêm / Bớt tài khoản</span>
            </button>
          </div>

          {/* Month Badge & Shortcuts */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* [Tháng 9] Badge */}
            <div className="px-3.5 py-1.5 bg-[#bde0fe] text-sky-950 font-extrabold text-xs rounded-xl shadow-xs border border-sky-300">
              Tháng {monthNum}
            </div>

            {/* Phân bổ lương button */}
            <button
              onClick={onOpenSalaryAllocation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              title="Phân bổ lương về các tài khoản"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phân Bổ Lương</span>
            </button>

            {/* Chuyển khoản button shortcut */}
            <button
              onClick={() => {
                setSubTab('chuyen');
                setTransferMode('bank');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              title="Chuyển tiền sang ngân hàng khác hoặc Tiết kiệm"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Chuyển Tiền</span>
            </button>

            {/* Up ảnh thông báo / Quét giao dịch AI */}
            <button
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs rounded-xl shadow-xs transition-all hover:scale-102 active:scale-98"
              title="Tải ảnh thông báo biến động số dư để AI tự động lấy thông tin giao dịch"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Up Ảnh Giao Dịch</span>
              <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold uppercase">
                AI
              </span>
            </button>

            {/* Edit active bank */}
            {activeAccount && (
              <button
                onClick={() => handleOpenEditAccount(activeAccount)}
                className="p-2 bg-sky-900/60 hover:bg-sky-800 rounded-xl text-sky-200 hover:text-white transition-colors"
                title="Sửa thông tin tài khoản này"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Center / Highlight: Số dư hiện có, Thu & Chi (Theo đúng yêu cầu: Chỉ để Số dư hiện tại, Thu, Chi) */}
        <div className="max-w-md mx-auto space-y-3 py-1">
          {/* Box 1: Số dư hiện có tại tài khoản */}
          <div className="bg-[#bde0fe] text-sky-950 rounded-xl p-3 flex items-center justify-between border border-sky-300/80 shadow-xs">
            <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              Số dư hiện có tại {activeAccount?.name}:
            </span>
            <span className="font-black text-lg text-sky-950">
              {formatCurrency(activeAccount?.balance || 0)}
            </span>
          </div>

          {/* Box 2: Thu (Tiền vào tài khoản) */}
          <div className="bg-[#bde0fe] text-sky-950 rounded-xl p-3 border border-sky-300/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Thu:
              </span>
              <span className="font-black text-lg text-emerald-800">
                +{formatCurrency(totalInflow)}
              </span>
            </div>
            {receivedTransfers > 0 && (
              <div className="text-[10px] text-sky-900 font-medium flex items-center justify-between pt-0.5 border-t border-sky-300/60">
                <span>Thu từ ngoài: +{formatCurrency(directIncome)}</span>
                <span className="font-bold text-teal-800">
                  Nhận từ NH khác: +{formatCurrency(receivedTransfers)}
                </span>
              </div>
            )}
          </div>

          {/* Box 3: Chi */}
          <div className="bg-[#bde0fe] text-sky-950 rounded-xl p-3 flex items-center justify-between border border-sky-300/80 shadow-xs">
            <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              Chi:
            </span>
            <span className="font-black text-lg text-rose-800">
              -{formatCurrency(totalOutflow)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KHUNG DƯỚI: TAB [Chi] [Thu:] [Chuyển] [Cho vay] (Theo đúng bản vẽ mới)    */}
      {/* ========================================================================= */}
      <div className="bg-[#1b5e7d] text-white rounded-2xl shadow-md p-5 border border-sky-900/40">
        {/* TOP ROW TABS: [Chi] [Thu:] [Chuyển] [Cho vay] */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSubTab('chi')}
              className={`px-5 py-2 rounded-xl text-sm font-black transition-all shadow-xs cursor-pointer ${
                subTab === 'chi'
                  ? 'bg-[#bde0fe] text-rose-900 ring-2 ring-rose-400/80 shadow-md scale-102'
                  : 'bg-sky-800/80 text-sky-200 hover:bg-sky-700 hover:text-white'
              }`}
            >
              Chi ({outflows.length})
            </button>

            <button
              type="button"
              onClick={() => setSubTab('thu')}
              className={`px-5 py-2 rounded-xl text-sm font-black transition-all shadow-xs cursor-pointer ${
                subTab === 'thu'
                  ? 'bg-[#bde0fe] text-emerald-900 ring-2 ring-emerald-400/80 shadow-md scale-102'
                  : 'bg-sky-800/80 text-sky-200 hover:bg-sky-700 hover:text-white'
              }`}
            >
              Thu: ({inflows.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setSubTab('chuyen');
                if (transferMode === 'loan') setTransferMode('bank');
              }}
              className={`px-5 py-2 rounded-xl text-sm font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                subTab === 'chuyen' && transferMode !== 'loan'
                  ? 'bg-[#bde0fe] text-blue-950 ring-2 ring-sky-400/80 shadow-md scale-102'
                  : 'bg-sky-800/80 text-sky-200 hover:bg-sky-700 hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Chuyển ({transfersOut.length})</span>
            </button>

            {/* MỤC CHO VAY THEO TÀI KHOẢN (VỊ TRÍ BÔI MÀU XANH) */}
            <button
              type="button"
              onClick={() => {
                setSubTab('chovay');
                setTransferMode('loan');
              }}
              className={`px-5 py-2 rounded-xl text-sm font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                subTab === 'chovay' || (subTab === 'chuyen' && transferMode === 'loan')
                  ? 'bg-[#bde0fe] text-amber-950 ring-2 ring-amber-400/90 shadow-md scale-102'
                  : 'bg-sky-800/80 text-amber-200 hover:bg-sky-700 hover:text-white'
              }`}
            >
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Cho vay ({loanTransactions.length})</span>
            </button>
          </div>

          {/* Toggle: Tự động thêm 000 */}
          <div className="flex items-center gap-2 bg-sky-900/60 px-3 py-1.5 rounded-xl border border-sky-600/40 text-xs">
            <span className="text-sky-200 font-medium">Tự động thêm &quot;000&quot; (k):</span>
            <button
              type="button"
              onClick={() => setAutoAdd000(!autoAdd000)}
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors ${
                autoAdd000
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {autoAdd000 ? 'BẬT (Gõ 100 = 100k)' : 'TẮT (Gõ đủ số)'}
            </button>
          </div>
        </div>

        {/* SUB-TABS ROW FOR [Chuyển]: [Ngân hàng], [Tiết kiệm] và [Cho vay] */}
        {subTab === 'chuyen' && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-sky-900/60 rounded-xl border border-sky-600/40 animate-in fade-in duration-150">
            <span className="text-xs font-bold text-sky-200 mr-2 flex items-center gap-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-300" />
              Loại chuyển:
            </span>

            <button
              type="button"
              onClick={() => setTransferMode('bank')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                transferMode === 'bank'
                  ? 'bg-[#bde0fe] text-blue-950 ring-2 ring-sky-400 font-black'
                  : 'bg-sky-800 text-sky-200 hover:bg-sky-700 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Ngân hàng</span>
            </button>

            <button
              type="button"
              onClick={() => setTransferMode('saving')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                transferMode === 'saving'
                  ? 'bg-[#bde0fe] text-blue-950 ring-2 ring-emerald-400 font-black'
                  : 'bg-sky-800 text-sky-200 hover:bg-sky-700 hover:text-white'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tiết kiệm</span>
            </button>

            {/* MỤC CHO VAY THEO TÀI KHOẢN (Đúng vị trí bôi màu xanh theo yêu cầu) */}
            <button
              type="button"
              onClick={() => setTransferMode('loan')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                transferMode === 'loan'
                  ? 'bg-[#bde0fe] text-blue-950 ring-2 ring-amber-400 font-black'
                  : 'bg-sky-800 text-sky-200 hover:bg-sky-700 hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Cho vay</span>
            </button>

            <span className="text-[11px] text-sky-300 ml-auto hidden sm:inline italic">
              {transferMode === 'bank'
                ? '💡 Số chuyển đi sẽ tự động trở thành Phần Thu của ngân hàng nhận'
                : transferMode === 'saving'
                ? '💡 Chuyển vào Tiết kiệm sẽ tự động xuất hiện trong Phần Thu (Mục Tiết kiệm)'
                : '💡 Quản lý Cho mượn (tiền ra) và Trả nợ (tiền vào) theo tài khoản này'}
            </span>
          </div>
        )}

        {/* BANNER THÔNG TIN & CHỌN MỤC: CHO MƯỢN VÀ TRẢ */}
        {(subTab === 'chovay' || (subTab === 'chuyen' && transferMode === 'loan')) && (
          <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-sky-950/80 via-slate-900/90 to-sky-950/80 border-2 border-sky-400/50 shadow-md animate-in fade-in space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold border border-amber-500/40 shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-amber-200 flex items-center gap-2">
                    <span>Mục Cho Vay / Mượn Nợ của {activeAccount?.name}:</span>
                  </div>
                  <div className="text-xs text-sky-200/90 flex flex-wrap items-center gap-3 sm:gap-4 mt-0.5">
                    <span className="text-amber-300 font-bold">
                      Đã cho mượn: <strong>-{formatCurrency(totalLoanOut)}</strong>
                    </span>
                    <span className="text-emerald-300 font-bold">
                      Đã được trả: <strong>+{formatCurrency(totalLoanIn)}</strong>
                    </span>
                    <span className="text-sky-300 italic">
                      (Dữ liệu người nợ & chi tiết các khoản được tự động lưu sang Sheet Sổ Ghi Nợ)
                    </span>
                  </div>
                </div>
              </div>

              {/* Shortcut sang Sheet Sổ Ghi Nợ */}
              {onNavigateToSheet && (
                <button
                  type="button"
                  onClick={() => onNavigateToSheet('ghino')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102"
                  title="Chuyển sang Sheet Sổ Ghi Nợ để theo dõi chi tiết danh sách người nợ"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Xem Sheet Sổ Ghi Nợ</span>
                </button>
              )}

              {/* 2 Nút bấm chuyển đổi trực tiếp: [Mục Cho mượn] & [Mục Trả] */}
              <div className="flex items-center gap-2 bg-black/50 p-1.5 rounded-xl border border-sky-500/40">
                <button
                  type="button"
                  onClick={() => {
                    setLoanAction('lend');
                    setLoanFilter('lend');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    loanAction === 'lend'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-amber-300 scale-102'
                      : 'text-amber-200 hover:text-white hover:bg-sky-800/60'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-rose-700" />
                  <span>Mục Cho mượn (Tiền ra)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoanAction('repay');
                    setLoanFilter('repay');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    loanAction === 'repay'
                      ? 'bg-emerald-400 text-slate-950 font-black shadow-md ring-2 ring-emerald-300 scale-102'
                      : 'text-emerald-200 hover:text-white hover:bg-sky-800/60'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-800" />
                  <span>Mục Trả (Tiền vào)</span>
                </button>
              </div>
            </div>

            {/* Bộ lọc hiển thị trong bảng: Tất cả | Chỉ mục cho mượn | Chỉ mục trả */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-sky-700/50 text-xs">
              <span className="text-sky-300 font-semibold flex items-center gap-1">
                Xem trong bảng:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLoanFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    loanFilter === 'all'
                      ? 'bg-sky-300 text-sky-950 font-black'
                      : 'bg-sky-900/60 text-sky-200 hover:bg-sky-800'
                  }`}
                >
                  Tất cả ({loanTransactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLoanFilter('lend')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    loanFilter === 'lend'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-sky-900/60 text-amber-200 hover:bg-sky-800'
                  }`}
                >
                  Khoản cho mượn ({loanLendList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLoanFilter('repay')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    loanFilter === 'repay'
                      ? 'bg-emerald-400 text-slate-950 font-black'
                      : 'bg-sky-900/60 text-emerald-200 hover:bg-sky-800'
                  }`}
                >
                  Khoản đã trả ({loanRepayList.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* THÔNG BÁO / HIGHLIGHT TRONG [Thu:]: MỤC TIẾT KIỆM (Đúng yêu cầu của bạn) */}
        {subTab === 'thu' && totalSavingsThisMonth > 0 && (
          <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border-2 border-emerald-400/50 flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
                <PiggyBank className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-emerald-200 uppercase tracking-wide">
                  Mục Tiết Kiệm: +{formatCurrency(totalSavingsThisMonth)}
                </div>
                <div className="text-[11px] text-emerald-300/90">
                  {savingsTransfersOut.length} khoản tiền đã trích từ {activeAccount?.name} vào mục Tiết kiệm
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-emerald-400/20 text-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-400/30">
              Đã ghi nhận trong Phần Thu
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DÒNG NHẬP LIỆU TRỰC TIẾP (INLINE INPUT ROW THEO ĐÚNG BẢN VẼ)               */}
        {/* ========================================================================= */}
        <form
          onSubmit={handleQuickSubmit}
          className="bg-sky-900/90 p-4 rounded-xl border-2 border-sky-400/50 mb-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-sky-200 uppercase tracking-wider flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  subTab === 'chi'
                    ? 'bg-rose-400'
                    : subTab === 'thu'
                    ? 'bg-emerald-400'
                    : subTab === 'chovay'
                    ? loanAction === 'lend'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                    : 'bg-blue-400'
                }`}
              />
              {subTab === 'chovay'
                ? loanAction === 'lend'
                  ? `Ghi khoản CHO MƯỢN từ tài khoản ${activeAccount?.name}:`
                  : `Ghi nhận người ta TRẢ TIỀN MƯỢN vào tài khoản ${activeAccount?.name}:`
                : subTab === 'chuyen'
                ? transferMode === 'bank'
                  ? `Chuyển tiền từ ${activeAccount?.name} sang ngân hàng khác:`
                  : transferMode === 'saving'
                  ? `Chuyển từ ${activeAccount?.name} vào Mục Tiết Kiệm:`
                  : loanAction === 'lend'
                  ? `Ghi khoản CHO MƯỢN từ tài khoản ${activeAccount?.name}:`
                  : `Ghi nhận người ta TRẢ TIỀN MƯỢN vào tài khoản ${activeAccount?.name}:`
                : `Ghi nhanh mục ${subTab === 'chi' ? 'CHI' : 'THU'} vào ${activeAccount?.name}:`}
            </span>
            <div className="flex items-center gap-2">
              {rawNum > 0 && (
                <span className="text-xs font-black text-amber-300 bg-black/30 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
                  Thành tiền: {formatCurrency(calculatedAmount)}
                </span>
              )}

              {/* Shortcut up ảnh nhanh khi nhác ghi */}
              <button
                type="button"
                onClick={() => setIsScannerModalOpen(true)}
                className="text-[11px] font-bold text-sky-100 hover:text-white bg-sky-800/80 hover:bg-emerald-600 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 border border-sky-500/50 shadow-2xs"
                title="Nhác ghi thì chụp lại thông báo để AI tự động điền"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-300" />
                <span>Nhác ghi? Up ảnh thông báo</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Cột 1: Ngày (gõ được luôn số 1..31) */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black text-sky-100">
                  Ngày (1-31)
                </label>
                <span className="text-[10px] text-sky-300 font-semibold">
                  {String(inputDay || 1).padStart(2, '0')}/{String(monthNum).padStart(2, '0')}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  placeholder="1"
                  value={inputDay}
                  onChange={(e) => setInputDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 text-sm font-black focus:outline-none focus:ring-2 focus:ring-sky-400 text-center shadow-inner"
                />
              </div>
              <span className="text-[10px] text-sky-300 block mt-0.5 text-center italic">
                (Gõ số ngày)
              </span>
            </div>

            {/* Cột 2: Số tiền (gõ 100 tự động thêm 000 phía sau) */}
            <div className="sm:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black text-sky-100">
                  {subTab === 'chi'
                    ? 'Số tiền chi'
                    : subTab === 'thu'
                    ? 'Số tiền thu'
                    : subTab === 'chovay' || transferMode === 'loan'
                    ? loanAction === 'lend'
                      ? 'Số tiền cho mượn'
                      : 'Số tiền người ta trả'
                    : 'Số tiền chuyển'}
                </label>
                <span className="text-[10px] text-amber-300 font-bold">
                  {autoAdd000 ? '+ 000' : ''}
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder={autoAdd000 ? 'Ví dụ: 100 hoặc 0,217' : '100000'}
                  value={inputRawAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Cho phép gõ số, dấu phẩy và dấu chấm
                    if (/^[0-9.,]*$/.test(val)) {
                      setInputRawAmount(val);
                    }
                  }}
                  className={`w-full px-3 py-2 pr-10 rounded-xl bg-white text-sm font-black focus:outline-none focus:ring-2 shadow-inner ${
                    subTab === 'chi'
                      ? 'text-rose-600 focus:ring-rose-400'
                      : subTab === 'thu'
                      ? 'text-emerald-700 focus:ring-emerald-400'
                      : subTab === 'chovay' || transferMode === 'loan'
                      ? loanAction === 'lend'
                        ? 'text-amber-500 focus:ring-amber-400'
                        : 'text-emerald-600 focus:ring-emerald-400'
                      : 'text-blue-700 focus:ring-blue-400'
                  }`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500 pointer-events-none">
                  {autoAdd000 ? 'k' : 'đ'}
                </span>
              </div>
              <span className="text-[10px] text-sky-300 block mt-0.5 text-center italic">
                {rawNum > 0
                  ? `= ${formatCurrency(calculatedAmount)}`
                  : '(Gõ 100 = 100.000 đ | Gõ 0,217 = 217 đ)'}
              </span>
            </div>

            {/* Cột 3: Tùy biến theo Tab */}
            {subTab === 'chovay' || subTab === 'chuyen' ? (
              subTab === 'chovay' || transferMode === 'loan' ? (
                // Mục Cho vay: Người mượn / Người trả
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-black text-sky-100 mb-1">
                    {loanAction === 'lend' ? 'Người mượn tiền:' : 'Người trả tiền:'}
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Dì Út, Bạn Nam, Anh Tuấn..."
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-inner"
                  />
                  <span className="text-[10px] text-amber-300 block mt-0.5 italic">
                    {loanAction === 'lend'
                      ? '(Ghi nhận người mượn tiền)'
                      : '(Ghi nhận người trả tiền)'}
                  </span>
                </div>
              ) : transferMode === 'bank' ? (
                // Chọn Ngân hàng nhận
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-black text-sky-100 mb-1">
                    Ngân hàng nhận tiền:
                  </label>
                  {otherAccounts.length > 0 ? (
                    <select
                      value={targetBankId}
                      onChange={(e) => setTargetBankId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-inner"
                    >
                      {otherAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickAddPresetBank('Techcombank', '#E01B22', 'bank')}
                        className="px-2 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition-colors"
                      >
                        + Thêm TCB
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAddPresetBank('MB Bank', '#0B4A99', 'bank')}
                        className="px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-colors"
                      >
                        + Thêm MB
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAddPresetBank('Ví MoMo', '#A50064', 'wallet')}
                        className="px-2 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-[10px] font-bold transition-colors"
                      >
                        + Thêm MoMo
                      </button>
                    </div>
                  )}
                  <span className="text-[10px] text-sky-300 block mt-0.5 italic">
                    (Tiền chuyển sẽ vào Thu của ngân hàng này)
                  </span>
                </div>
              ) : transferMode === 'saving' ? (
                // Mục Tiết kiệm
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-black text-sky-100 mb-1">
                    Tên mục / Sổ tiết kiệm:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tiết kiệm tích lũy, Quỹ khẩn cấp..."
                    value={savingTitle}
                    onChange={(e) => setSavingTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-inner"
                  />
                  <span className="text-[10px] text-emerald-300 block mt-0.5 italic">
                    (Sẽ hiện: Mục tiết kiệm: {savingTitle || '...'})
                  </span>
                </div>
              ) : null
            ) : null}

            {/* Cột 4: Nội Dung */}
            <div className={subTab === 'chuyen' || subTab === 'chovay' ? 'sm:col-span-4' : 'sm:col-span-3'}>
              <label className="block text-[11px] font-black text-sky-100 mb-1">
                Nội Dung
              </label>
              <input
                type="text"
                placeholder={
                  subTab === 'chi'
                    ? 'Ăn trưa, Cà phê, Mua đồ...'
                    : subTab === 'thu'
                    ? 'Lương, Thưởng, Nhận tiền...'
                    : transferMode === 'bank'
                    ? 'Sinh hoạt, Tiêu dùng...'
                    : transferMode === 'saving'
                    ? 'Gửi tiết kiệm tháng 9...'
                    : loanAction === 'lend'
                    ? 'Cho dì mượn việc gia đình...'
                    : 'Dì trả đợt 1, Trả nợ...'
                }
                value={inputDescription}
                onChange={(e) => setInputDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-inner"
              />
              <span className="text-[10px] text-sky-300 block mt-0.5 italic">
                (Ghi chú khoản giao dịch)
              </span>
            </div>

            {/* Cột 4b: Danh Mục (CHỖ MÀU VÀNG THEO YÊU CẦU ĐỂ ĐỒNG NHẤT KHI UP ẢNH) */}
            {subTab !== 'chuyen' && subTab !== 'chovay' && (
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black text-sky-100">
                    Danh Mục
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[10px] font-extrabold text-amber-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer bg-sky-950/60 hover:bg-sky-800 px-1.5 py-0.5 rounded border border-amber-400/40 shadow-2xs"
                    title="Mục sửa Danh mục, thêm hoặc bớt"
                  >
                    <Settings className="w-2.5 h-2.5 text-amber-300" />
                    <span>Sửa/Thêm</span>
                  </button>
                </div>
                <select
                  value={
                    selectedCategoryId &&
                    categories
                      .filter((c) => c.type === (subTab === 'thu' ? 'income' : 'expense'))
                      .some((c) => c.id === selectedCategoryId)
                      ? selectedCategoryId
                      : categories.filter((c) => c.type === (subTab === 'thu' ? 'income' : 'expense'))[0]?.id || ''
                  }
                  onChange={(e) => {
                    if (e.target.value === '__manage_categories__') {
                      setIsCategoryModalOpen(true);
                    } else {
                      setSelectedCategoryId(e.target.value);
                    }
                  }}
                  className="w-full px-2.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-inner"
                >
                  {categories
                    .filter((c) => c.type === (subTab === 'thu' ? 'income' : 'expense'))
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  <option value="__manage_categories__" className="text-amber-800 font-bold bg-amber-50">
                    ⚙️ + Sửa / Thêm / Bớt Danh Mục...
                  </option>
                </select>
                <span className="text-[10px] text-sky-300 block mt-0.5 italic">
                  (Bấm Sửa/Thêm để quản lý)
                </span>
              </div>
            )}

            {/* Cột 5: Nút Ghi */}
            <div className={subTab === 'chuyen' || subTab === 'chovay' ? 'sm:col-span-3' : 'sm:col-span-2'}>
              <button
                type="submit"
                className={`w-full py-2 px-3 rounded-xl text-xs font-black text-white shadow-md transition-all flex items-center justify-center gap-1 hover:scale-102 active:scale-98 cursor-pointer ${
                  subTab === 'chi'
                    ? 'bg-rose-600 hover:bg-rose-500 ring-2 ring-rose-400/50'
                    : subTab === 'thu'
                    ? 'bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-400/50'
                    : subTab === 'chovay' || transferMode === 'loan'
                    ? loanAction === 'lend'
                      ? 'bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-400/50'
                      : 'bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-400/50'
                    : 'bg-blue-600 hover:bg-blue-500 ring-2 ring-blue-400/50'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {subTab === 'chi'
                    ? 'Ghi Chi'
                    : subTab === 'thu'
                    ? 'Ghi Thu'
                    : subTab === 'chovay' || transferMode === 'loan'
                    ? loanAction === 'lend'
                      ? 'Ghi Cho Mượn'
                      : 'Ghi Nhận Trả'
                    : transferMode === 'bank'
                    ? 'Chuyển Khoản'
                    : 'Gửi Tiết Kiệm'}
                </span>
              </button>
            </div>
          </div>
        </form>

        {/* ========================================================================= */}
        {/* BẢNG DANH SÁCH: [ Ngày ] | [ Số tiền ] | [ Số tiền còn lại ] | [ Nội Dung ]*/}
        {/* ========================================================================= */}
        <div className="overflow-x-auto rounded-xl border border-sky-600/40 bg-sky-950/40">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#bde0fe] text-sky-950 font-black text-xs border-b border-sky-400">
                <th className="py-2.5 px-4 w-28">Ngày</th>
                <th className="py-2.5 px-4 w-36">Số tiền</th>
                <th className="py-2.5 px-4 w-36 text-right">Số tiền còn lại</th>
                <th className="py-2.5 px-4">
                  {subTab === 'chuyen' ? 'Nội Dung & Điểm Đến' : 'Nội Dung'}
                </th>
                <th className="py-2.5 px-3 text-right w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-800/60">
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sky-300 italic text-xs">
                    {subTab === 'chi'
                      ? `Chưa có giao dịch chi nào tại ${activeAccount?.name} trong tháng ${monthNum}.`
                      : subTab === 'thu'
                      ? `Chưa có giao dịch thu nào tại ${activeAccount?.name} trong tháng ${monthNum}.`
                      : subTab === 'chovay' || transferMode === 'loan'
                      ? loanFilter === 'lend'
                        ? `Chưa có khoản cho mượn nào tại ${activeAccount?.name} trong tháng ${monthNum}.`
                        : loanFilter === 'repay'
                        ? `Chưa có khoản người ta trả tiền mượn nào tại ${activeAccount?.name} trong tháng ${monthNum}.`
                        : `Chưa có giao dịch cho vay hoặc nhận trả nào tại ${activeAccount?.name} trong tháng ${monthNum}.`
                      : transferMode === 'bank'
                      ? `Chưa có giao dịch chuyển liên ngân hàng nào từ ${activeAccount?.name}.`
                      : `Chưa có giao dịch chuyển vào Mục Tiết Kiệm nào từ ${activeAccount?.name}.`}
                  </td>
                </tr>
              ) : (
                currentList.map((tx) => {
                  const isTransfer = tx.type === 'transfer';
                  const isSavingTx =
                    tx.toAccountId === 'saving' || tx.tags?.includes('saving');
                  const fromAcc = isTransfer ? accountMap.get(tx.accountId) : null;
                  const toAcc =
                    isTransfer && tx.toAccountId ? accountMap.get(tx.toAccountId) : null;
                  const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;

                  const isEditingThisRow = editingRowId === tx.id;
                  const dayNum = parseInt(tx.date.split('-')[2], 10);

                  if (isEditingThisRow) {
                    return (
                      <tr key={tx.id} className="bg-sky-900/90 text-white">
                        {/* Edit Ngày */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={editDay}
                            onChange={(e) => setEditDay(e.target.value)}
                            className="w-16 px-2 py-1 rounded bg-white text-slate-900 font-bold text-xs"
                          />
                        </td>

                        {/* Edit Số tiền */}
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={editAmount}
                            onChange={(e) =>
                              setEditAmount(e.target.value ? Number(e.target.value) : '')
                            }
                            className="w-32 px-2 py-1 rounded bg-white text-slate-900 font-bold text-xs"
                          />
                        </td>

                        {/* Ô trống cho cột Số tiền còn lại khi đang sửa */}
                        <td className="py-2 px-3 text-right text-slate-400 italic">
                          -
                        </td>

                        {/* Edit Nội dung */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-2 py-1 rounded bg-white text-slate-900 text-xs font-semibold"
                          />
                        </td>

                        {/* Save Edit */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleSaveEdit(tx.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white mr-1"
                            title="Lưu"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingRowId(null)}
                            className="p-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white"
                            title="Hủy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // Kiểm tra giao dịch Cho vay / Mượn nợ
                  const isLoanTx =
                    tx.tags?.includes('loan') ||
                    tx.tags?.includes('lend') ||
                    tx.tags?.includes('repay') ||
                    /mượn|cho vay|trả nợ|thu nợ|cho mượn|vay/i.test(tx.description || '') ||
                    /mượn|cho vay|trả nợ|thu nợ|cho mượn|vay/i.test(tx.note || '');
                  const isLendTx =
                    isLoanTx &&
                    (tx.tags?.includes('lend') ||
                      (tx.type === 'expense' && !tx.tags?.includes('repay')) ||
                      /cho mượn|cho vay/i.test(tx.description || ''));
                  const isRepayTx =
                    isLoanTx &&
                    (tx.tags?.includes('repay') ||
                      (tx.type === 'income' && !tx.tags?.includes('lend')) ||
                      /trả|thu nợ|thu hồi/i.test(tx.description || ''));

                  // Determine display styling
                  const isIncoming =
                    subTab === 'thu' ||
                    isRepayTx ||
                    (tx.type === 'income' && !isLendTx) ||
                    (tx.type === 'transfer' && tx.toAccountId === activeAccountId);
                  const isSavingInThu = subTab === 'thu' && isSavingTx;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-sky-800/40 transition-colors group text-sky-100"
                    >
                      {/* Cột 1: Ngày */}
                      <td className="py-2.5 px-4 font-semibold whitespace-nowrap text-sky-200">
                        <span className="font-black text-white bg-sky-900/80 px-2 py-0.5 rounded-md border border-sky-600/40 mr-1.5">
                          {dayNum}
                        </span>
                        <span>{formatFriendlyDate(tx.date)}</span>
                      </td>

                      {/* Cột 2: Số tiền */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tx)}
                          className="group/amtbtn flex items-center gap-1.5 cursor-pointer text-left focus:outline-none"
                          title="Bấm để sửa số tiền (sau khi sửa số tiền còn lại các ngày sau sẽ tự động tính lại)"
                        >
                          <span
                            className={`font-black text-xs px-2.5 py-1 rounded-md tracking-tight transition-all group-hover/amtbtn:ring-2 group-hover/amtbtn:ring-white/50 group-hover/amtbtn:scale-105 ${
                              isSavingInThu
                                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                : isLendTx
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : isRepayTx
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isIncoming
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : subTab === 'chi'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {isIncoming ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>
                          <Pencil className="w-3 h-3 text-sky-400 opacity-40 group-hover/amtbtn:opacity-100 transition-opacity" />
                        </button>
                      </td>

                      {/* Cột 3: Số tiền còn lại sau giao dịch */}
                      <td
                        className="py-2.5 px-4 text-right font-black text-amber-200 whitespace-nowrap text-xs"
                        title="Số tiền còn lại sau giao dịch (tự động tính và cập nhật cho các ngày tiếp theo)"
                      >
                        {formatCurrency(bankRunningBalances.get(tx.id) ?? activeAccount?.balance ?? 0)}
                      </td>

                      {/* Cột 4: Nội Dung */}
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-white flex flex-wrap items-center gap-1.5">
                          {isSavingInThu && (
                            <PiggyBank className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          {isLendTx ? (
                            <span className="font-extrabold text-[10px] text-amber-200 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1 shrink-0">
                              <ArrowUpRight className="w-3 h-3 text-rose-400" />
                              Mục Cho mượn
                            </span>
                          ) : isRepayTx ? (
                            <span className="font-extrabold text-[10px] text-emerald-200 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1 shrink-0">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                              Mục Trả
                            </span>
                          ) : null}
                          <span>{tx.description}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-sky-300 mt-0.5">
                          {isSavingTx ? (
                            <span className="font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                              Mục Tiết Kiệm: {tx.description.replace('Mục Tiết kiệm: ', '')}
                            </span>
                          ) : isTransfer ? (
                            <>
                              {tx.accountId === activeAccountId ? (
                                <span className="font-bold text-amber-300 bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-500/40">
                                  Chuyển sang: {toAcc?.name || 'Ngân hàng khác'}
                                </span>
                              ) : (
                                <span className="font-bold text-teal-300 bg-teal-900/60 px-1.5 py-0.5 rounded border border-teal-500/40">
                                  Nhận từ: {fromAcc?.name || 'Ngân hàng khác'}
                                </span>
                              )}
                            </>
                          ) : null}

                          {cat && !isSavingTx && !isLoanTx && (
                            <span className="text-sky-400">• {cat.name}</span>
                          )}
                          {tx.note && (
                            <span className="text-sky-300/80 italic">• &quot;{tx.note}&quot;</span>
                          )}
                        </div>
                      </td>

                      {/* Cột 4: Thao tác (Sửa / Xóa) */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(tx);
                          }}
                          className="p-1.5 rounded-lg text-sky-300 hover:text-white hover:bg-sky-700/80 transition-colors mr-1 inline-flex items-center justify-center"
                          title="Sửa dòng này"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTransaction(tx.id);
                          }}
                          className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-600 transition-colors inline-flex items-center justify-center"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL THÊM / BỚT TÀI KHOẢN (HỢP NHẤT QUẢN LÝ AN TOÀN)                    */}
      {/* ========================================================================= */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">
                    Quản Lý Tài Khoản (Thêm / Bớt Tài Khoản)
                  </h3>
                  <p className="text-xs text-sky-200/90">
                    Thêm ngân hàng/ví mới hoặc bớt/xóa an toàn tài khoản không còn dùng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAccountModalOpen(false);
                  setEditingAccount(null);
                  setDeletingAccountId(null);
                }}
                className="p-1.5 text-sky-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs bên trong Modal */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAccountModalTab('list');
                  setDeletingAccountId(null);
                }}
                className={`px-4 py-2 rounded-t-xl text-xs font-black transition-all border-b-2 cursor-pointer ${
                  accountModalTab === 'list'
                    ? 'border-sky-600 text-sky-700 bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Danh Sách & Bớt Tài Khoản ({accounts.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountModalTab('add');
                  if (!editingAccount) {
                    setAccName('');
                    setType('bank');
                    setBankName('');
                    setAccountNumber('');
                    setInitialBalance(0);
                    setColor('#006533');
                  }
                }}
                className={`px-4 py-2 rounded-t-xl text-xs font-black transition-all border-b-2 cursor-pointer ${
                  accountModalTab === 'add'
                    ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {editingAccount ? 'Sửa Tài Khoản' : '+ Thêm Tài Khoản Mới'}
              </button>
            </div>

            {/* Nội dung Tab */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {accountModalTab === 'list' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
                    <span className="font-bold">Danh sách tất cả tài khoản / ngân hàng / ví:</span>
                    <span className="italic">Bấm bút chì để sửa, bấm thùng rác để bớt/xóa</span>
                  </div>

                  <div className="space-y-2.5">
                    {accounts.map((acc) => {
                      const isDeleting = deletingAccountId === acc.id;
                      return (
                        <div
                          key={acc.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                                style={{ backgroundColor: acc.color || '#006533' }}
                              >
                                <CategoryIcon name={acc.iconName} className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                                  <span className="truncate">{acc.name}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                    {acc.type === 'wallet'
                                      ? 'Ví điện tử'
                                      : acc.type === 'cash'
                                      ? 'Tiền mặt'
                                      : acc.type === 'credit'
                                      ? 'Thẻ tín dụng'
                                      : 'Ngân hàng'}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                  <span>
                                    Số dư hiện tại:{' '}
                                    <strong className="text-emerald-700 font-bold">
                                      {formatCurrency(acc.balance || 0)}
                                    </strong>
                                  </span>
                                  {acc.accountNumber && (
                                    <span className="text-slate-400">STK: {acc.accountNumber}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Nút hành động */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  handleOpenEditAccount(acc);
                                  setAccountModalTab('add');
                                }}
                                className="p-2 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                                title="Sửa thông tin tài khoản này"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {accounts.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => setDeletingAccountId(acc.id)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Bớt / Xóa tài khoản này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic px-1">
                                  (Giữ lại)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Inline Confirmation when deleting */}
                          {isDeleting && (
                            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
                              <div className="flex items-center gap-2 text-xs text-rose-900 font-medium">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>
                                  Bạn có chắc chắn muốn bớt/xóa tài khoản{' '}
                                  <strong>&quot;{acc.name}&quot;</strong>?
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setDeletingAccountId(null)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 cursor-pointer"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteAccount(acc.id);
                                    setDeletingAccountId(null);
                                  }}
                                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg shadow-xs cursor-pointer"
                                >
                                  Xác nhận xóa
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Nút thêm mới chuyển sang tab Add */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccount(null);
                      setAccName('');
                      setType('bank');
                      setBankName('');
                      setAccountNumber('');
                      setInitialBalance(0);
                      setColor('#006533');
                      setAccountModalTab('add');
                    }}
                    className="w-full py-2.5 px-3 mt-3 rounded-xl border-2 border-dashed border-sky-300 hover:border-sky-500 hover:bg-sky-50 text-sky-800 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-sky-600" />
                    <span>+ Thêm Ngân Hàng / Ví Mới</span>
                  </button>
                </div>
              ) : (
                /* Tab Add / Edit Account Form */
                <form onSubmit={handleAccountSubmit} className="space-y-4">
                  {/* Preset Quick Suggestions */}
                  {!editingAccount && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <span className="text-[11px] font-bold text-slate-600 block">
                        Chọn nhanh mẫu tài khoản phổ biến:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { name: 'Techcombank', color: '#E01B22', type: 'bank' as AccountType },
                          { name: 'MB Bank', color: '#0B4A99', type: 'bank' as AccountType },
                          { name: 'VietinBank', color: '#005baa', type: 'bank' as AccountType },
                          { name: 'Agribank', color: '#800000', type: 'bank' as AccountType },
                          { name: 'Ví MoMo', color: '#A50064', type: 'wallet' as AccountType },
                          { name: 'Ví ZaloPay', color: '#0068FF', type: 'wallet' as AccountType },
                          { name: 'Tiền mặt', color: '#16a34a', type: 'cash' as AccountType },
                        ].map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setAccName(preset.name);
                              setBankName(preset.name);
                              setType(preset.type);
                              setColor(preset.color);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: preset.color }}
                            />
                            <span>+ {preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Loại tài khoản
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'bank', label: 'Ngân hàng', icon: Landmark },
                        { id: 'wallet', label: 'Ví điện tử', icon: Wallet },
                        { id: 'cash', label: 'Tiền mặt', icon: Banknote },
                        { id: 'credit', label: 'Tín dụng', icon: CreditCard },
                      ].map((t) => {
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setType(t.id as AccountType)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              accType === t.id
                                ? 'border-sky-600 bg-sky-50 text-sky-900 ring-1 ring-sky-500'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className="w-4 h-4 mb-1" />
                            <span className="text-[11px]">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên tài khoản / Ngân hàng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      placeholder="Ví dụ: Vietcombank, Techcombank, Ví MoMo..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>

                  {/* Number & Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Số tài khoản (tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={accNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="****1234"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Màu sắc nhận diện
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={accColor}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-10 h-10 p-0.5 rounded-xl border border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs text-slate-600 font-mono font-bold">
                          {accColor}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Balance */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số dư ban đầu (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={accInitialBalance}
                      onChange={(e) => setInitialBalance(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAccountModalTab('list')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Quay lại danh sách
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAccountModalOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Đóng
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer"
                      >
                        {editingAccount ? 'Lưu Thay Đổi' : 'Thêm Tài Khoản'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        accounts={accounts}
        categories={categories}
        activeAccountId={activeAccountId}
        currentMonth={currentMonth}
        onSaveTransactions={(batch) => {
          if (onAddBatchTransactions) {
            onAddBatchTransactions(batch);
          } else {
            batch.forEach((item) => onAddTransaction(item));
          }
        }}
      />

      {/* Category Manager Modal (Mục Sửa Danh mục, Thêm hoặc Bớt) */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        transactions={transactions}
        initialType={subTab === 'thu' ? 'income' : 'expense'}
        onAddCategory={(cat) => {
          if (onAddCategory) {
            const created = onAddCategory(cat);
            if (created) {
              setSelectedCategoryId(created.id);
            }
            return created;
          }
        }}
        onEditCategory={(cat) => onEditCategory && onEditCategory(cat)}
        onDeleteCategory={(catId) => onDeleteCategory && onDeleteCategory(catId)}
        onResetCategories={onResetCategories}
        onCategoryCreated={(newCat) => setSelectedCategoryId(newCat.id)}
      />

      {/* Toast thông báo đồng bộ sang Sheet Sổ Ghi Nợ */}
      {loanSyncToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900/95 text-white px-4 sm:px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-amber-400/60 backdrop-blur-md max-w-lg">
            <Coins className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-sky-100 flex-1">{loanSyncToast.message}</span>
            {onNavigateToSheet && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToSheet('ghino');
                  setLoanSyncToast(null);
                }}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                Mở Sổ Ghi Nợ
              </button>
            )}
            <button
              type="button"
              onClick={() => setLoanSyncToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
