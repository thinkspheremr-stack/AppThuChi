import React from 'react';
import { Account, Transaction } from '../types';
import { formatCurrency, formatMonthYear } from '../utils/formatters';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  AlertTriangle,
  Flame,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface OverviewCardsProps {
  accounts: Account[];
  transactions: Transaction[];
  currentMonth: string; // YYYY-MM
  selectedAccountId: string | null;
  onOpenAddExpense: () => void;
  onOpenAddIncome: () => void;
  onOpenReminderModal: () => void;
  loggedToday: boolean;
  streak: number;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  accounts,
  transactions,
  currentMonth,
  selectedAccountId,
  onOpenAddExpense,
  onOpenAddIncome,
  onOpenReminderModal,
  loggedToday,
  streak,
}) => {
  // Filter for current month
  const monthTransactions = transactions.filter((t) => {
    const isThisMonth = t.date.startsWith(currentMonth);
    if (!isThisMonth) return false;
    if (selectedAccountId) {
      return t.accountId === selectedAccountId || (t.type === 'transfer' && t.toAccountId === selectedAccountId);
    }
    return true;
  });

  const totalExpense = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // Total balance of accounts (or selected account)
  const totalBalance = selectedAccountId
    ? accounts.find((a) => a.id === selectedAccountId)?.balance || 0
    : accounts.reduce((sum, a) => sum + a.balance, 0);

  const savingsRate = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4 mb-6">
      {/* Reminder & Streak Banner */}
      {!loggedToday && (
        <div className="bg-amber-500/10 border border-amber-300/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold flex items-center gap-1.5">
                Nhắc nhở hàng ngày: Bạn chưa ghi chép chi tiêu hôm nay!
              </div>
              <div className="text-xs text-amber-800/90 mt-0.5">
                Duy trì chuỗi {streak} ngày ghi chép liên tục để kiểm soát tài chính tối ưu.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddExpense}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Ghi chép ngay
            </button>
            <button
              onClick={onOpenReminderModal}
              className="text-xs text-amber-800 hover:text-amber-950 font-semibold px-2 py-1"
            >
              Cài giờ nhắc
            </button>
          </div>
        </div>
      )}

      {/* 4 Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets / Balance */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {selectedAccountId ? 'Số Dư Tài Khoản Này' : 'Tổng Tài Sản Hiện Có'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(totalBalance)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{selectedAccountId ? 'Đang lọc 1 tài khoản' : `${accounts.length} ngân hàng & ví`}</span>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Tổng Thu Tháng Này</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-emerald-600 tracking-tight">
            {formatCurrency(totalIncome)}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-400">
              {monthTransactions.filter((t) => t.type === 'income').length} khoản thu
            </span>
            <button
              onClick={onOpenAddIncome}
              className="text-[11px] text-emerald-600 font-semibold hover:underline"
            >
              + Thêm thu
            </button>
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Tổng Chi Tháng Này</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-rose-600 tracking-tight">
            {formatCurrency(totalExpense)}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-400">
              {monthTransactions.filter((t) => t.type === 'expense').length} khoản chi
            </span>
            <button
              onClick={onOpenAddExpense}
              className="text-[11px] text-rose-600 font-semibold hover:underline"
            >
              + Thêm chi
            </button>
          </div>
        </div>

        {/* Net Savings */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Thu Chi Ròng & Tích Lũy</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-xl font-extrabold tracking-tight ${
              netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {formatCurrency(netBalance, true)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Tỷ lệ tiết kiệm:</span>
            <span
              className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                Number(savingsRate) >= 20
                  ? 'bg-emerald-100 text-emerald-800'
                  : Number(savingsRate) >= 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {savingsRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
