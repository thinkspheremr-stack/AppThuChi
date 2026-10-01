import React, { useState } from 'react';
import { Account, AccountType, Category, Transaction } from '../types';
import { formatCurrency, formatFriendlyDate } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import {
  Plus,
  ArrowRightLeft,
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
  onDeleteTransaction: (id: string) => void;
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
  onDeleteTransaction,
}) => {
  // Active bank
  const activeAccountId = selectedAccountId || accounts[0]?.id || '';
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0];

  // 3 Main Tabs: 'chi' | 'thu' | 'chuyen' (Theo đúng bản vẽ mới nhất)
  const [subTab, setSubTab] = useState<'chi' | 'thu' | 'chuyen'>('chi');

  // Sub-modes inside [Chuyển]: 'bank' (Chuyển giữa các ngân hàng) | 'saving' (Mục Tiết kiệm)
  const [transferMode, setTransferMode] = useState<'bank' | 'saving'>('bank');

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

  // Modal Add / Edit Account
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setType] = useState<AccountType>('bank');
  const [accBankName, setBankName] = useState('');
  const [accNumber, setAccountNumber] = useState('');
  const [accInitialBalance, setInitialBalance] = useState<number>(0);
  const [accColor, setColor] = useState('#006533');

  // Calculate actual calculated amount
  const rawNum = Number(inputRawAmount) || 0;
  const calculatedAmount = autoAdd000 ? rawNum * 1000 : rawNum;

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

  // Handle Quick Add / Transfer directly from the table row
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calculatedAmount || calculatedAmount <= 0 || !activeAccount) return;

    let dayNumber = parseInt(inputDay, 10);
    if (isNaN(dayNumber) || dayNumber < 1) dayNumber = 1;
    if (dayNumber > 31) dayNumber = 31;
    const formattedDate = `${currentMonth}-${String(dayNumber).padStart(2, '0')}`;

    if (subTab === 'chuyen') {
      if (transferMode === 'bank') {
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
      } else {
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
      const defaultCat = categories.find(
        (c) => c.type === (subTab === 'thu' ? 'income' : 'expense')
      );

      onAddTransaction({
        type: subTab === 'thu' ? 'income' : 'expense',
        amount: calculatedAmount,
        date: formattedDate,
        time: new Date().toTimeString().slice(0, 5),
        accountId: activeAccount.id,
        categoryId: defaultCat?.id,
        description: inputDescription.trim() || (subTab === 'thu' ? 'Khoản thu' : 'Khoản chi'),
        note: `Ghi nhanh tại ${activeAccount.name}`,
      });
    }

    setInputRawAmount('');
    setInputDescription('');
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
      onAddTransaction({
        ...originalTx,
        date: formattedDate,
        amount: Number(editAmount),
        description: editDescription.trim() || originalTx.description,
      });
      onDeleteTransaction(txId);
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

  // The active list based on user's selected subTab ('chi' | 'thu' | 'chuyen')
  let currentList: Transaction[] = [];
  if (subTab === 'chi') {
    currentList = outflows;
  } else if (subTab === 'thu') {
    currentList = inflows;
  } else {
    // subTab === 'chuyen'
    currentList = transferMode === 'bank' ? bankTransfersOut : savingsTransfersOut;
  }

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
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isActive
                        ? 'bg-purple-700 text-white ring-2 ring-white/60 shadow-md scale-105'
                        : 'bg-sky-800/80 hover:bg-sky-700 text-sky-100 hover:text-white'
                    }`}
                    style={isActive && acc.color ? { backgroundColor: acc.color } : undefined}
                  >
                    <CategoryIcon name={acc.iconName} className="w-4 h-4" />
                    <span>{acc.name}</span>

                    {/* Delete button directly on tab if more than 1 account */}
                    {accounts.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAccount(acc.id);
                        }}
                        className="ml-1 p-0.5 rounded-full hover:bg-rose-600 hover:text-white text-sky-200/90 transition-colors"
                        title={`Xóa tài khoản ${acc.name}`}
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}

            {/* Thêm ngân hàng */}
            <button
              onClick={handleOpenAddAccount}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-900/70 hover:bg-sky-800 text-sky-200 border border-sky-600/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm ngân hàng/ví</span>
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

            {/* Delete active bank button */}
            {activeAccount && accounts.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAccount(activeAccount.id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                title={`Xóa ngân hàng ${activeAccount.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa ngân hàng</span>
              </button>
            )}
          </div>
        </div>

        {/* Center / Highlight: Thu: ... & Chi: ... */}
        <div className="max-w-md mx-auto space-y-3 py-1">
          {/* Box Thu */}
          <div className="bg-[#bde0fe] text-sky-950 rounded-xl p-3 border border-sky-300/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Thu (Tiền vào tài khoản):
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

          {/* Box Chi */}
          <div className="bg-[#bde0fe] text-sky-950 rounded-xl p-3 flex items-center justify-between border border-sky-300/80 shadow-xs">
            <span className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              Chi:
            </span>
            <span className="font-black text-lg text-rose-800">
              -{formatCurrency(totalOutflow)}
            </span>
          </div>

          {/* Subtext: Số dư hiện có của ngân hàng này */}
          <div className="text-center text-xs text-sky-200 font-medium pt-1">
            Số dư hiện có tại <strong>{activeAccount?.name}</strong>: {' '}
            <span className="font-bold text-white text-sm bg-sky-900/60 px-2 py-0.5 rounded-md">
              {formatCurrency(activeAccount?.balance || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KHUNG DƯỚI: TAB [Chi] [Thu:] [Chuyển] (Theo đúng bản vẽ mới)              */}
      {/* Trong [Chuyển]: có 2 mục [Ngân hàng] và [Tiết kiệm]                      */}
      {/* ========================================================================= */}
      <div className="bg-[#1b5e7d] text-white rounded-2xl shadow-md p-5 border border-sky-900/40">
        {/* TOP ROW TABS: [Chi] [Thu:] [Chuyển] */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSubTab('chi')}
              className={`px-6 py-2 rounded-xl text-sm font-black transition-all shadow-xs ${
                subTab === 'chi'
                  ? 'bg-[#bde0fe] text-rose-900 ring-2 ring-rose-400/80 shadow-md scale-102'
                  : 'bg-sky-800/80 text-sky-200 hover:bg-sky-700 hover:text-white'
              }`}
            >
              Chi ({outflows.length})
            </button>

            <button
              onClick={() => setSubTab('thu')}
              className={`px-6 py-2 rounded-xl text-sm font-black transition-all shadow-xs ${
                subTab === 'thu'
                  ? 'bg-[#bde0fe] text-emerald-900 ring-2 ring-emerald-400/80 shadow-md scale-102'
                  : 'bg-sky-800/80 text-sky-200 hover:bg-sky-700 hover:text-white'
              }`}
            >
              Thu: ({inflows.length})
            </button>

            <button
              onClick={() => setSubTab('chuyen')}
              className={`px-6 py-2 rounded-xl text-sm font-black transition-all shadow-xs flex items-center gap-1.5 ${
                subTab === 'chuyen'
                  ? 'bg-[#bde0fe] text-blue-950 ring-2 ring-sky-400/80 shadow-md scale-102'
                  : 'bg-sky-800/80 text-sky-200 hover:bg-sky-700 hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Chuyển ({transfersOut.length})</span>
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

        {/* SUB-TABS ROW FOR [Chuyển]: [Ngân hàng] và [Tiết kiệm] */}
        {subTab === 'chuyen' && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-sky-900/60 rounded-xl border border-sky-600/40 animate-in fade-in duration-150">
            <span className="text-xs font-bold text-sky-200 mr-2 flex items-center gap-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-300" />
              Loại chuyển:
            </span>

            <button
              type="button"
              onClick={() => setTransferMode('bank')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
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
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                transferMode === 'saving'
                  ? 'bg-[#bde0fe] text-blue-950 ring-2 ring-emerald-400 font-black'
                  : 'bg-sky-800 text-sky-200 hover:bg-sky-700 hover:text-white'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tiết kiệm</span>
            </button>

            <span className="text-[11px] text-sky-300 ml-auto hidden sm:inline italic">
              {transferMode === 'bank'
                ? '💡 Số chuyển đi sẽ tự động trở thành Phần Thu của ngân hàng nhận'
                : '💡 Chuyển vào Tiết kiệm sẽ tự động xuất hiện trong Phần Thu (Mục Tiết kiệm)'}
            </span>
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
                    : 'bg-blue-400'
                }`}
              />
              {subTab === 'chuyen'
                ? transferMode === 'bank'
                  ? `Chuyển tiền từ ${activeAccount?.name} sang ngân hàng khác:`
                  : `Chuyển từ ${activeAccount?.name} vào Mục Tiết Kiệm:`
                : `Ghi nhanh mục ${subTab === 'chi' ? 'CHI' : 'THU'} vào ${activeAccount?.name}:`}
            </span>
            {rawNum > 0 && (
              <span className="text-xs font-black text-amber-300 bg-black/30 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
                Thành tiền: {formatCurrency(calculatedAmount)}
              </span>
            )}
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
                  Số tiền {subTab === 'chi' ? 'chi' : subTab === 'thu' ? 'thu' : 'chuyển'}
                </label>
                <span className="text-[10px] text-amber-300 font-bold">
                  {autoAdd000 ? '+ 000' : ''}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder={autoAdd000 ? '100 (100.000đ)' : '100000'}
                  value={inputRawAmount}
                  onChange={(e) => setInputRawAmount(e.target.value)}
                  className={`w-full px-3 py-2 pr-10 rounded-xl bg-white text-sm font-black focus:outline-none focus:ring-2 shadow-inner ${
                    subTab === 'chi'
                      ? 'text-rose-600 focus:ring-rose-400'
                      : subTab === 'thu'
                      ? 'text-emerald-700 focus:ring-emerald-400'
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
                  : '(Gõ 100 = 100.000 đ)'}
              </span>
            </div>

            {/* Cột 3: Tùy biến theo Tab */}
            {subTab === 'chuyen' ? (
              transferMode === 'bank' ? (
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
              ) : (
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
              )
            ) : null}

            {/* Cột 4: Nội Dung */}
            <div className={subTab === 'chuyen' ? 'sm:col-span-2' : 'sm:col-span-5'}>
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
                    : 'Gửi tiết kiệm tháng 9...'
                }
                value={inputDescription}
                onChange={(e) => setInputDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-inner"
              />
              <span className="text-[10px] text-sky-300 block mt-0.5 italic">
                (Ghi chú khoản giao dịch)
              </span>
            </div>

            {/* Cột 5: Nút Ghi */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                className={`w-full py-2 px-3 rounded-xl text-xs font-black text-white shadow-md transition-all flex items-center justify-center gap-1 hover:scale-102 active:scale-98 ${
                  subTab === 'chi'
                    ? 'bg-rose-600 hover:bg-rose-500 ring-2 ring-rose-400/50'
                    : subTab === 'thu'
                    ? 'bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-400/50'
                    : 'bg-blue-600 hover:bg-blue-500 ring-2 ring-blue-400/50'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {subTab === 'chi'
                    ? 'Ghi Chi'
                    : subTab === 'thu'
                    ? 'Ghi Thu'
                    : transferMode === 'bank'
                    ? 'Chuyển Khoản'
                    : 'Gửi Tiết Kiệm'}
                </span>
              </button>
            </div>
          </div>
        </form>

        {/* ========================================================================= */}
        {/* BẢNG DANH SÁCH: [ Ngày ] | [ Số tiền ] | [ Nội Dung ]                     */}
        {/* ========================================================================= */}
        <div className="overflow-x-auto rounded-xl border border-sky-600/40 bg-sky-950/40">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#bde0fe] text-sky-950 font-black text-xs border-b border-sky-400">
                <th className="py-2.5 px-4 w-32">Ngày</th>
                <th className="py-2.5 px-4 w-44">Số tiền</th>
                <th className="py-2.5 px-4">
                  {subTab === 'chuyen' ? 'Nội Dung & Điểm Đến' : 'Nội Dung'}
                </th>
                <th className="py-2.5 px-3 text-right w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-800/60">
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sky-300 italic text-xs">
                    {subTab === 'chi'
                      ? `Chưa có giao dịch chi nào tại ${activeAccount?.name} trong tháng ${monthNum}.`
                      : subTab === 'thu'
                      ? `Chưa có giao dịch thu nào tại ${activeAccount?.name} trong tháng ${monthNum}.`
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
                            min="1000"
                            step="1000"
                            value={editAmount}
                            onChange={(e) =>
                              setEditAmount(e.target.value ? Number(e.target.value) : '')
                            }
                            className="w-32 px-2 py-1 rounded bg-white text-slate-900 font-bold text-xs"
                          />
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

                  // Determine display styling
                  const isIncoming =
                    subTab === 'thu' || (tx.type === 'transfer' && tx.toAccountId === activeAccountId);
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
                        <span
                          className={`font-black text-xs px-2.5 py-1 rounded-md tracking-tight ${
                            isSavingInThu
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
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
                      </td>

                      {/* Cột 3: Nội Dung */}
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {isSavingInThu && (
                            <PiggyBank className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
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

                          {cat && !isSavingTx && (
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

      {/* Modal Add / Edit Account */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingAccount ? 'Chỉnh Sửa Tài Khoản' : 'Thêm Ngân Hàng / Ví Mới'}
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit} className="p-5 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
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
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all ${
                          accType === t.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tên tài khoản / Ngân hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Ví dụ: Vietcombank, Techcombank, Ví MoMo..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Number & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Số tài khoản (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={accNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="****1234"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Màu sắc</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accColor}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <span className="text-xs text-slate-500 font-mono">{accColor}</span>
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Số dư ban đầu (đ)
                </label>
                <input
                  type="number"
                  value={accInitialBalance}
                  onChange={(e) => setInitialBalance(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {editingAccount && accounts.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteAccount(editingAccount.id);
                      setIsAccountModalOpen(false);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa ngân hàng này</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                  >
                    {editingAccount ? 'Lưu Thay Đổi' : 'Thêm Ngân Hàng'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
