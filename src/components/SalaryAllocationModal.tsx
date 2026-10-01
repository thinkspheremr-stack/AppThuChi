import React, { useState } from 'react';
import { Account, Category, Transaction } from '../types';
import { formatCurrency, formatMonthYear } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import {
  X,
  Sparkles,
  Landmark,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Coins,
  Wallet,
  TrendingUp,
} from 'lucide-react';

interface SalaryAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  currentMonth: string; // YYYY-MM
  onCompleteAllocation: (transactionsToCreate: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
}

export const SalaryAllocationModal: React.FC<SalaryAllocationModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  currentMonth,
  onCompleteAllocation,
}) => {
  // Step 1: Main Salary Account & Amount
  const [mainAccountId, setMainAccountId] = useState<string>(accounts[0]?.id || '');
  const [salaryAmount, setSalaryAmount] = useState<number | ''>(25000000);
  const [salaryDate, setSalaryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [salaryDescription, setSalaryDescription] = useState<string>(
    `Tiền lương ${formatMonthYear(currentMonth)}`
  );

  // Allocations to other accounts: record of accountId -> { amount: number, note: string }
  const otherAccounts = accounts.filter((a) => a.id !== mainAccountId);

  const defaultNotes: Record<string, string> = {
    wallet: 'Nạp ví ăn uống, cà phê & tiêu vặt',
    cash: 'Rút tiền mặt tiêu hàng ngày',
    bank: 'Phân bổ chi tiêu & tích lũy',
    credit: 'Thanh toán thẻ tín dụng',
  };

  const [allocations, setAllocations] = useState<
    Record<string, { amount: number | ''; note: string }>
  >(() => {
    const init: Record<string, { amount: number | ''; note: string }> = {};
    for (const acc of otherAccounts) {
      init[acc.id] = {
        amount: '',
        note: defaultNotes[acc.type] || 'Phân bổ chi tiêu',
      };
    }
    return init;
  });

  // Keep allocations in sync if mainAccountId changes
  const handleMainAccountChange = (newMainId: string) => {
    setMainAccountId(newMainId);
    const newOthers = accounts.filter((a) => a.id !== newMainId);
    const nextAlloc: Record<string, { amount: number | ''; note: string }> = {};
    for (const acc of newOthers) {
      nextAlloc[acc.id] = allocations[acc.id] || {
        amount: '',
        note: defaultNotes[acc.type] || 'Phân bổ chi tiêu',
      };
    }
    setAllocations(nextAlloc);
  };

  const handleAmountChange = (accId: string, val: string) => {
    setAllocations((prev) => ({
      ...prev,
      [accId]: {
        ...prev[accId],
        amount: val ? Number(val) : '',
      },
    }));
  };

  const handleNoteChange = (accId: string, note: string) => {
    setAllocations((prev) => ({
      ...prev,
      [accId]: {
        ...prev[accId],
        note,
      },
    }));
  };

  // Calculations
  const totalSalary = Number(salaryAmount) || 0;
  const totalAllocated = otherAccounts.reduce((sum, acc) => {
    const amt = Number(allocations[acc.id]?.amount) || 0;
    return sum + amt;
  }, 0);

  const remainingInMain = totalSalary - totalAllocated;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalSalary <= 0) {
      alert('Vui lòng nhập số tiền lương hợp lệ!');
      return;
    }

    if (totalAllocated > totalSalary) {
      alert('Tổng số tiền phân bổ vượt quá số tiền lương nhận được!');
      return;
    }

    const mainAcc = accounts.find((a) => a.id === mainAccountId);
    const salaryCat = categories.find((c) => c.name.toLowerCase().includes('lương') || c.type === 'income');

    const transactionsToCreate: Omit<Transaction, 'id' | 'createdAt'>[] = [];

    // 1. Transaction: Main Salary Income
    transactionsToCreate.push({
      type: 'income',
      amount: totalSalary,
      date: salaryDate,
      time: '09:00',
      accountId: mainAccountId,
      categoryId: salaryCat?.id,
      description: salaryDescription.trim() || `Nhận lương ${formatMonthYear(currentMonth)}`,
      note: `Khoản thu lương về ${mainAcc?.name || 'ngân hàng chính'}`,
    });

    // 2. Transactions: Transfers to other accounts
    for (const acc of otherAccounts) {
      const amt = Number(allocations[acc.id]?.amount) || 0;
      if (amt > 0) {
        const note = allocations[acc.id]?.note || `Phân bổ lương sang ${acc.name}`;
        transactionsToCreate.push({
          type: 'transfer',
          amount: amt,
          date: salaryDate,
          time: '09:30',
          accountId: mainAccountId, // Source: chi từ ngân hàng chính
          toAccountId: acc.id,      // Destination: thu vào ngân hàng nhận
          description: `Phân bổ lương: ${note}`,
          note: `Từ ${mainAcc?.name} sang ${acc.name}`,
        });
      }
    }

    onCompleteAllocation(transactionsToCreate);
    onClose();
  };

  if (!isOpen) return null;

  const mainAcc = accounts.find((a) => a.id === mainAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-blue-600/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">Phân Bổ Tiền Lương Về Các Ngân Hàng</h3>
              <p className="text-[11px] text-slate-500">
                Ghi nhận thu lương và tự động chia tiền, tạo chi & thu ở các tài khoản
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Section 1: Main Salary Inflow */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                1. Khoản Thu Lương Về (Tài khoản chính)
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Ghi nhận Thu
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngân hàng nhận lương:
                </label>
                <select
                  value={mainAccountId}
                  onChange={(e) => handleMainAccountChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Số dư: {formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tổng tiền lương nhận được:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="10000"
                    step="10000"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 pr-12 bg-white border border-slate-200 rounded-xl text-sm font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="25000000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    VNĐ
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày nhận lương:</label>
                <input
                  type="date"
                  value={salaryDate}
                  onChange={(e) => setSalaryDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả khoản thu:</label>
                <input
                  type="text"
                  value={salaryDescription}
                  onChange={(e) => setSalaryDescription(e.target.value)}
                  placeholder="Lương tháng..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Distribution to Other Accounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  2. Phân Bổ Sang Các Ngân Hàng & Ví Khác
                </h4>
                <p className="text-[11px] text-slate-400">
                  Tự động note Chi ở {mainAcc?.name} và Thu ở ngân hàng nhận
                </p>
              </div>

              {/* Remaining badge */}
              <div className="text-right">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    remainingInMain < 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  Giữ lại ở {mainAcc?.name}: {formatCurrency(remainingInMain)}
                </span>
              </div>
            </div>

            {/* List of other accounts */}
            <div className="space-y-2.5">
              {otherAccounts.map((acc) => {
                const item = allocations[acc.id] || { amount: '', note: '' };

                return (
                  <div
                    key={acc.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0 text-xs"
                          style={{ backgroundColor: acc.color }}
                        >
                          <CategoryIcon name={acc.iconName} className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-xs text-slate-800">{acc.name}</span>
                        <span className="text-[11px] text-slate-400">
                          (Số dư hiện tại: {formatCurrency(acc.balance)})
                        </span>
                      </div>

                      {/* Amount input */}
                      <div className="w-40 relative">
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          placeholder="Số tiền chuyển..."
                          value={item.amount}
                          onChange={(e) => handleAmountChange(acc.id, e.target.value)}
                          className="w-full px-2.5 py-1 pr-8 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold">
                          đ
                        </span>
                      </div>
                    </div>

                    {/* Note input */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] text-slate-400 shrink-0">Ghi chú mục đích:</span>
                      <input
                        type="text"
                        value={item.note}
                        onChange={(e) => handleNoteChange(acc.id, e.target.value)}
                        placeholder="Ví dụ: Tiền sinh hoạt, Tiết kiệm..."
                        className="flex-1 px-2.5 py-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Allocation Summary Bar */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span>Tiến độ phân bổ lương:</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(totalAllocated)} / {formatCurrency(totalSalary)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  remainingInMain < 0 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, totalSalary > 0 ? (totalAllocated / totalSalary) * 100 : 0)}%`,
                }}
              />
            </div>
            {remainingInMain < 0 && (
              <p className="text-[11px] text-rose-600 font-semibold">
                ⚠️ Số tiền phân bổ vượt quá lương {formatCurrency(Math.abs(remainingInMain))}!
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={remainingInMain < 0 || totalSalary <= 0}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
            >
              Xác Nhận Phân Bổ Lương
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
