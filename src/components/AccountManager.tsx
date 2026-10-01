import React, { useState } from 'react';
import { Account, AccountType, Category, Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { BankAccountDetail } from './BankAccountDetail';
import {
  Landmark,
  Wallet,
  Smartphone,
  Banknote,
  CreditCard,
  Plus,
  ArrowRightLeft,
  Filter,
  Check,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface AccountManagerProps {
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

export const AccountManager: React.FC<AccountManagerProps> = ({
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [color, setColor] = useState('#006533');

  // Compute month expenses and incomes per account
  const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonth));
  const totalMonthExpense = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const accountExpenses = accounts.reduce((acc, a) => {
    // Direct expense + transfer out from this account
    const spent = monthTransactions
      .filter((t) => (t.type === 'expense' && t.accountId === a.id) || (t.type === 'transfer' && t.accountId === a.id))
      .reduce((sum, t) => sum + t.amount, 0);
    acc[a.id] = spent;
    return acc;
  }, {} as Record<string, number>);

  const accountIncomes = accounts.reduce((acc, a) => {
    // Direct income + transfer in to this account
    const earned = monthTransactions
      .filter((t) => (t.type === 'income' && t.accountId === a.id) || (t.type === 'transfer' && t.toAccountId === a.id))
      .reduce((sum, t) => sum + t.amount, 0);
    acc[a.id] = earned;
    return acc;
  }, {} as Record<string, number>);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setName('');
    setType('bank');
    setBankName('Vietcombank');
    setAccountNumber('');
    setInitialBalance(0);
    setColor('#006533');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setBankName(acc.bankName || '');
    setAccountNumber(acc.accountNumber || '');
    setInitialBalance(acc.initialBalance || 0);
    setColor(acc.color);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let iconName = 'Landmark';
    if (type === 'wallet') iconName = 'Wallet';
    else if (type === 'cash') iconName = 'Banknote';
    else if (type === 'credit') iconName = 'CreditCard';

    if (editingAccount) {
      onEditAccount({
        ...editingAccount,
        name: name.trim(),
        type,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        initialBalance: Number(initialBalance) || 0,
        color,
        iconName,
      });
    } else {
      onAddAccount({
        name: name.trim(),
        type,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        initialBalance: Number(initialBalance) || 0,
        color,
        iconName,
      });
    }

    setIsModalOpen(false);
  };

  // Popular banks/wallets presets in Vietnam
  const PRESET_ORGANIZATIONS = [
    { name: 'Vietcombank', type: 'bank', color: '#006533' },
    { name: 'Techcombank', type: 'bank', color: '#E01B22' },
    { name: 'MB Bank', type: 'bank', color: '#0B4A99' },
    { name: 'VPBank', type: 'bank', color: '#009743' },
    { name: 'ACB', type: 'bank', color: '#005BAA' },
    { name: 'BIDV', type: 'bank', color: '#00558F' },
    { name: 'TPBank', type: 'bank', color: '#7E2A90' },
    { name: 'Ví MoMo', type: 'wallet', color: '#A50064' },
    { name: 'Ví ZaloPay', type: 'wallet', color: '#008FE5' },
    { name: 'Viettel Money', type: 'wallet', color: '#ED1C24' },
    { name: 'Tiền mặt', type: 'cash', color: '#10B981' },
  ];

  const handleApplyPreset = (preset: { name: string; type: string; color: string }) => {
    setName(preset.name);
    setBankName(preset.name);
    setType(preset.type as AccountType);
    setColor(preset.color);
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 mb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">
              Tài Khoản Ngân Hàng & Ví Điện Tử
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
              {accounts.length} tài khoản
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Bấm vào từng ngân hàng để xem & ghi chép riêng mục <strong>Thu</strong> và mục <strong>Chi</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Phân bổ lương */}
          <button
            onClick={onOpenSalaryAllocation}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
            title="Ghi nhận lương về và phân bổ tiền sang các ngân hàng/ví khác"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Phân Bổ Lương
          </button>

          {/* Chuyển khoản */}
          <button
            onClick={() => onOpenTransfer()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
            title="Chuyển tiền qua lại giữa các ngân hàng hoặc nạp ví"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Chuyển khoản
          </button>

          {/* Thêm tài khoản */}
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm tài khoản
          </button>
        </div>
      </div>

      {/* Expanded Bank Detail View (When a Bank is Clicked) */}
      {selectedAccount && (
        <BankAccountDetail
          account={selectedAccount}
          allAccounts={accounts}
          categories={categories}
          transactions={transactions}
          currentMonth={currentMonth}
          onClose={() => onSelectAccount(null)}
          onAddTransaction={onAddTransaction}
          onDeleteTransaction={onDeleteTransaction}
          onOpenTransfer={(srcId) => onOpenTransfer(srcId)}
          onOpenSalaryAllocation={onOpenSalaryAllocation}
        />
      )}

      {/* Grid of Bank Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {accounts.map((acc) => {
          const spentThisMonth = accountExpenses[acc.id] || 0;
          const incomeThisMonth = accountIncomes[acc.id] || 0;
          const isSelected = selectedAccountId === acc.id;

          const typeLabel =
            acc.type === 'bank'
              ? 'Ngân hàng'
              : acc.type === 'wallet'
              ? 'Ví điện tử'
              : acc.type === 'cash'
              ? 'Tiền mặt'
              : 'Thẻ tín dụng';

          return (
            <div
              key={acc.id}
              onClick={() => onSelectAccount(isSelected ? null : acc.id)}
              className={`relative cursor-pointer group rounded-xl p-3.5 border transition-all duration-200 ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-md'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Top Row: Icon & Name & Action */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: acc.color }}
                  >
                    <CategoryIcon name={acc.iconName} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-slate-800 truncate" title={acc.name}>
                      {acc.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>{typeLabel}</span>
                      {acc.accountNumber && (
                        <>
                          <span>•</span>
                          <span>{acc.accountNumber}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleOpenEdit(acc, e)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                    title="Chỉnh sửa tài khoản"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {accounts.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Bạn có chắc muốn xóa tài khoản "${acc.name}" không?`)) {
                          onDeleteAccount(acc.id);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Xóa tài khoản"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Balance */}
              <div className="mt-2.5">
                <div className="text-[11px] text-slate-500 font-medium">Số dư hiện tại</div>
                <div
                  className={`text-base font-bold tracking-tight ${
                    acc.balance < 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {formatCurrency(acc.balance)}
                </div>
              </div>

              {/* Monthly Inflow & Outflow Badges */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    Tiền vào (Thu):
                  </span>
                  <span className="font-semibold text-emerald-600">
                    +{formatCurrency(incomeThisMonth)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-rose-500" />
                    Tiền ra (Chi):
                  </span>
                  <span className="font-semibold text-rose-600">
                    -{formatCurrency(spentThisMonth)}
                  </span>
                </div>
              </div>

              {/* Click prompt */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span className="text-emerald-700 font-semibold group-hover:underline">
                  {isSelected ? 'Đang mở chi tiết Thu - Chi ▲' : 'Ấn để ghi Thu & Chi ▼'}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-180 text-emerald-600' : ''}`} />
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full p-0.5">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingAccount ? 'Chỉnh Sửa Tài Khoản' : 'Thêm Tài Khoản / Ngân Hàng Mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Presets */}
              {!editingAccount && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Chọn nhanh ngân hàng / ví phổ biến:
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                    {PRESET_ORGANIZATIONS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-slate-400 text-slate-700 font-medium transition-colors"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Type */}
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
                          type === t.id
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Vietcombank, Ví MoMo, Techcombank..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Account Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Số tài khoản / SĐT (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="****9821 hoặc 098..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Màu nhận diện
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-9 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <span className="text-xs text-slate-500 font-mono">{color}</span>
                  </div>
                </div>
              </div>

              {/* Initial Balance */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {editingAccount ? 'Số dư khởi điểm ban đầu (đ)' : 'Số dư hiện có lúc bắt đầu (đ)'}
                </label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  Hiển thị: {formatCurrency(initialBalance || 0)}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  {editingAccount ? 'Lưu Thay Đổi' : 'Thêm Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
