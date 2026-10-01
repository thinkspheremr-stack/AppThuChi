import React, { useState } from 'react';
import { Account, Category, Transaction } from '../types';
import { formatCurrency, formatFriendlyDate, formatMonthYear } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Plus,
  Landmark,
  X,
  Calendar,
  Tag,
  Clock,
  Trash2,
  Edit2,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

interface BankAccountDetailProps {
  account: Account;
  allAccounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  currentMonth: string; // YYYY-MM
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenTransfer: (sourceAccountId: string) => void;
  onOpenSalaryAllocation: () => void;
}

export const BankAccountDetail: React.FC<BankAccountDetailProps> = ({
  account,
  allAccounts,
  categories,
  transactions,
  currentMonth,
  onClose,
  onAddTransaction,
  onDeleteTransaction,
  onOpenTransfer,
  onOpenSalaryAllocation,
}) => {
  // Quick inline form state for INFLOW (Thu)
  const [incomeAmount, setIncomeAmount] = useState<number | ''>('');
  const [incomeDesc, setIncomeDesc] = useState<string>('');
  const [incomeCatId, setIncomeCatId] = useState<string>(
    categories.find((c) => c.type === 'income')?.id || ''
  );
  const [incomeDate, setIncomeDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Quick inline form state for OUTFLOW (Chi)
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [expenseCatId, setExpenseCatId] = useState<string>(
    categories.find((c) => c.type === 'expense')?.id || ''
  );
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const accountMap = new Map(allAccounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Month transactions related to this account
  const monthTxs = transactions.filter((t) => {
    if (!t.date.startsWith(currentMonth)) return false;
    return t.accountId === account.id || (t.type === 'transfer' && t.toAccountId === account.id);
  });

  // INFLOWS (Thu vào tài khoản này):
  // 1. Direct Income to this account
  // 2. Transfers from other accounts into this account
  const inflows = monthTxs.filter(
    (t) => (t.type === 'income' && t.accountId === account.id) || (t.type === 'transfer' && t.toAccountId === account.id)
  );
  const totalInflow = inflows.reduce((sum, t) => sum + t.amount, 0);

  // OUTFLOWS (Chi ra khỏi tài khoản này):
  // 1. Direct Expense from this account
  // 2. Transfers from this account to other accounts
  const outflows = monthTxs.filter(
    (t) => (t.type === 'expense' && t.accountId === account.id) || (t.type === 'transfer' && t.accountId === account.id)
  );
  const totalOutflow = outflows.reduce((sum, t) => sum + t.amount, 0);

  // Handle Quick Add Income
  const handleQuickAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(incomeAmount);
    if (!amt || amt <= 0) return;

    onAddTransaction({
      type: 'income',
      amount: amt,
      date: incomeDate,
      time: new Date().toTimeString().slice(0, 5),
      accountId: account.id,
      categoryId: incomeCatId,
      description: incomeDesc.trim() || 'Khoản thu vào tài khoản',
      note: `Ghi thu trực tiếp tại ${account.name}`,
    });

    setIncomeAmount('');
    setIncomeDesc('');
  };

  // Handle Quick Add Expense
  const handleQuickAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (!amt || amt <= 0) return;

    onAddTransaction({
      type: 'expense',
      amount: amt,
      date: expenseDate,
      time: new Date().toTimeString().slice(0, 5),
      accountId: account.id,
      categoryId: expenseCatId,
      description: expenseDesc.trim() || 'Khoản chi từ tài khoản',
      note: `Ghi chi trực tiếp tại ${account.name}`,
    });

    setExpenseAmount('');
    setExpenseDesc('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border-2 border-emerald-500/30 overflow-hidden mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Account Detail Header */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
            style={{ backgroundColor: account.color }}
          >
            <CategoryIcon name={account.iconName} className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg tracking-tight">{account.name}</h3>
              <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                {account.type === 'bank' ? 'Ngân hàng' : account.type === 'wallet' ? 'Ví điện tử' : 'Tiền mặt'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
              <span>{account.bankName || account.name}</span>
              {account.accountNumber && (
                <>
                  <span>•</span>
                  <span>STK: {account.accountNumber}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Balance & Month Stats */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 font-medium">Số dư hiện tại</span>
            <div className="text-xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(account.balance)}
            </div>
          </div>

          <div className="h-8 w-px bg-white/20 hidden sm:block" />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSalaryAllocation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors"
              title="Phân bổ tiền lương về các ngân hàng & ví"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phân bổ lương</span>
            </button>

            <button
              onClick={() => onOpenTransfer(account.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
              title="Chuyển tiền từ ngân hàng này sang ngân hàng khác"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Chuyển khoản</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Đóng bảng chi tiết"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace: PHẦN THU vs PHẦN CHI */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50/60">
        {/* ========================================================= */}
        {/* COLUMN 1: PHẦN THU (TIỀN VÀO TÀI KHOẢN NÀY) */}
        {/* ========================================================= */}
        <div className="space-y-4">
          {/* Section Title & Monthly Total */}
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-800">
                  PHẦN THU: TIỀN VÀO {account.name.toUpperCase()}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Lương, thưởng, nhận tiền chuyển khoản từ ngân hàng khác
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-medium">Tổng thu tháng</span>
              <div className="text-base font-bold text-emerald-600">
                +{formatCurrency(totalInflow)}
              </div>
            </div>
          </div>

          {/* Quick Input Form for THU (Ghi cụ thể ở đây) */}
          <form
            onSubmit={handleQuickAddIncome}
            className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5 shadow-2xs"
          >
            <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-emerald-700" />
              Ghi cụ thể khoản thu vào {account.name}:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Số tiền (đ):</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  placeholder="Ví dụ: 15.000.000"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Danh mục:</label>
                <select
                  value={incomeCatId}
                  onChange={(e) => setIncomeCatId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {categories
                    .filter((c) => c.type === 'income')
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Nội dung: Lương công ty, Tiền thưởng, Nhận tiền..."
                  value={incomeDesc}
                  onChange={(e) => setIncomeDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Lưu Khoản Thu Này
            </button>
          </form>

          {/* List of Inflows for this Bank */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Lịch sử khoản thu & tiền nhận ({inflows.length} giao dịch)
            </div>

            {inflows.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                Chưa có khoản thu nào vào {account.name} trong tháng {formatMonthYear(currentMonth)}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {inflows.map((tx) => {
                  const isTransferIn = tx.type === 'transfer';
                  const fromAcc = isTransferIn ? accountMap.get(tx.accountId) : null;
                  const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;

                  return (
                    <div
                      key={tx.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors flex items-center justify-between gap-2 shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 text-xs"
                          style={{
                            backgroundColor: isTransferIn ? '#0284C7' : cat?.color || '#10B981',
                          }}
                        >
                          {isTransferIn ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <CategoryIcon name={cat?.icon || 'TrendingUp'} className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-800 truncate">
                            {tx.description}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            {isTransferIn && (
                              <span className="font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                                Nhận từ {fromAcc?.name || 'Ngân hàng khác'}
                              </span>
                            )}
                            {cat && <span>• {cat.name}</span>}
                            <span>• {formatFriendlyDate(tx.date)}</span>
                            {tx.time && <span>• {tx.time}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-xs text-emerald-600">
                          +{formatCurrency(tx.amount)}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm(`Xóa giao dịch "${tx.description}"?`)) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: PHẦN CHI (TIỀN RA KHỎI TÀI KHOẢN NÀY) */}
        {/* ========================================================= */}
        <div className="space-y-4">
          {/* Section Title & Monthly Total */}
          <div className="flex items-center justify-between border-b border-rose-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-800">
                  PHẦN CHI: TIỀN RA TỪ {account.name.toUpperCase()}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Ăn uống, mua sắm, hóa đơn, chuyển khoản sang ngân hàng khác
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-medium">Tổng chi tháng</span>
              <div className="text-base font-bold text-rose-600">
                -{formatCurrency(totalOutflow)}
              </div>
            </div>
          </div>

          {/* Quick Input Form for CHI (Ghi cụ thể ở đây) */}
          <form
            onSubmit={handleQuickAddExpense}
            className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2.5 shadow-2xs"
          >
            <div className="text-xs font-bold text-rose-900 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-rose-700" />
              Ghi cụ thể khoản chi từ {account.name}:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Số tiền chi (đ):</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  placeholder="Ví dụ: 50.000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Danh mục chi:</label>
                <select
                  value={expenseCatId}
                  onChange={(e) => setExpenseCatId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Nội dung: Ăn trưa, Cà phê, Đổ xăng, Shopee, Tiền nhà..."
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Lưu Khoản Chi Này
            </button>
          </form>

          {/* List of Outflows for this Bank */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Lịch sử khoản chi & tiền chuyển đi ({outflows.length} giao dịch)
            </div>

            {outflows.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                Chưa có khoản chi nào từ {account.name} trong tháng {formatMonthYear(currentMonth)}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {outflows.map((tx) => {
                  const isTransferOut = tx.type === 'transfer';
                  const toAcc = isTransferOut && tx.toAccountId ? accountMap.get(tx.toAccountId) : null;
                  const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;

                  return (
                    <div
                      key={tx.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-rose-300 transition-colors flex items-center justify-between gap-2 shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 text-xs"
                          style={{
                            backgroundColor: isTransferOut ? '#4F46E5' : cat?.color || '#F43F5E',
                          }}
                        >
                          {isTransferOut ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <CategoryIcon name={cat?.icon || 'TrendingDown'} className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-800 truncate">
                            {tx.description}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            {isTransferOut && (
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                Chuyển sang {toAcc?.name || 'Ngân hàng khác'}
                              </span>
                            )}
                            {cat && <span>• {cat.name}</span>}
                            <span>• {formatFriendlyDate(tx.date)}</span>
                            {tx.time && <span>• {tx.time}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-xs text-rose-600">
                          -{formatCurrency(tx.amount)}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm(`Xóa giao dịch "${tx.description}"?`)) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
