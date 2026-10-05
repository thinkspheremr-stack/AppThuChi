import React, { useState, useMemo } from 'react';
import { Account, Category, Transaction, TransactionType } from '../types';
import { formatCurrency, formatFriendlyDate } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import {
  Search,
  Filter,
  Trash2,
  Edit3,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  Landmark,
  X,
  FileSpreadsheet,
  Wallet,
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  currentMonth: string; // YYYY-MM
  selectedAccountId: string | null;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onExportCSV: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts,
  categories,
  currentMonth,
  selectedAccountId,
  onEditTransaction,
  onDeleteTransaction,
  onExportCSV,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>(selectedAccountId || 'all');

  // Keep local account filter in sync if parent selectedAccountId changes
  React.useEffect(() => {
    if (selectedAccountId) {
      setAccountFilter(selectedAccountId);
    }
  }, [selectedAccountId]);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Filter transactions for this month + user filters
  const filtered = transactions.filter((t) => {
    // Month filter
    if (!t.date.startsWith(currentMonth)) return false;

    // Type filter
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;

    // Account filter
    if (accountFilter !== 'all') {
      const matchAccount = t.accountId === accountFilter || (t.type === 'transfer' && t.toAccountId === accountFilter);
      if (!matchAccount) return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchNote = t.note?.toLowerCase().includes(q);
      const matchAmount = String(t.amount).includes(q);
      const cat = t.categoryId ? categoryMap.get(t.categoryId) : null;
      const matchCat = cat?.name.toLowerCase().includes(q);
      return matchDesc || matchNote || matchAmount || matchCat;
    }

    return true;
  });

  // Tính số tiền còn lại (running balance) của từng tài khoản qua các giao dịch theo thứ tự thời gian
  // Bắt đầu từ số dư ban đầu, giảm khi chi tiêu/chuyển đi và tăng khi có tiền chuyển vào/thu nhập
  const balanceAfterMap = useMemo(() => {
    const runningPerAccount: Record<string, number> = {};
    accounts.forEach((acc) => {
      runningPerAccount[acc.id] = acc.initialBalance || 0;
    });

    const allSortedAsc = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if ((a.time || '') !== (b.time || '')) return (a.time || '').localeCompare(b.time || '');
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

    const map = new Map<
      string,
      {
        accountBalanceAfter: number;
        toAccountBalanceAfter?: number;
        totalBalanceAfter: number;
      }
    >();

    allSortedAsc.forEach((tx) => {
      if (tx.type === 'income') {
        runningPerAccount[tx.accountId] = (runningPerAccount[tx.accountId] || 0) + tx.amount;
      } else if (tx.type === 'expense') {
        runningPerAccount[tx.accountId] = (runningPerAccount[tx.accountId] || 0) - tx.amount;
      } else if (tx.type === 'transfer') {
        runningPerAccount[tx.accountId] = (runningPerAccount[tx.accountId] || 0) - tx.amount;
        if (tx.toAccountId && tx.toAccountId !== 'saving') {
          runningPerAccount[tx.toAccountId] = (runningPerAccount[tx.toAccountId] || 0) + tx.amount;
        }
      }

      const total = Object.values(runningPerAccount).reduce((s, v) => s + v, 0);

      map.set(tx.id, {
        accountBalanceAfter: runningPerAccount[tx.accountId] ?? 0,
        toAccountBalanceAfter: tx.toAccountId ? runningPerAccount[tx.toAccountId] : undefined,
        totalBalanceAfter: total,
      });
    });

    return map;
  }, [accounts, transactions]);

  // Group transactions by date (descending)
  const groupedByDate: Record<string, Transaction[]> = {};
  filtered.sort((a, b) => {
    // First sort by date desc, then by time desc
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.time || '').localeCompare(a.time || '');
  });

  for (const t of filtered) {
    if (!groupedByDate[t.date]) {
      groupedByDate[t.date] = [];
    }
    groupedByDate[t.date].push(t);
  }

  const dateKeys = Object.keys(groupedByDate);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Danh Sách Giao Dịch</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tìm thấy {filtered.length} giao dịch trong tháng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            title="Xuất danh sách ra file Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Xuất CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo nội dung, số tiền..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Account / Bank Filter */}
        <div>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="all">Tất cả ngân hàng & ví</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="all">Tất cả loại giao dịch</option>
            <option value="expense">Chỉ khoản chi</option>
            <option value="income">Chỉ khoản thu</option>
            <option value="transfer">Chuyển khoản nội bộ</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type === 'expense' ? 'Chi' : 'Thu'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction Groups */}
      {dateKeys.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm font-medium">Không tìm thấy giao dịch nào</p>
          <p className="text-xs text-slate-400 mt-1">Thử đổi từ khóa hoặc bộ lọc ngân hàng</p>
        </div>
      ) : (
        <div className="space-y-5">
          {dateKeys.map((dateStr) => {
            const dayTxs = groupedByDate[dateStr];
            const dayExpense = dayTxs
              .filter((t) => t.type === 'expense')
              .reduce((s, t) => s + t.amount, 0);
            const dayIncome = dayTxs
              .filter((t) => t.type === 'income')
              .reduce((s, t) => s + t.amount, 0);

            return (
              <div key={dateStr} className="space-y-1.5">
                {/* Date header */}
                <div className="flex items-center justify-between text-xs font-semibold px-2 py-1 bg-slate-100/70 rounded-lg text-slate-600">
                  <span>{formatFriendlyDate(dateStr)}</span>
                  <div className="flex items-center gap-3 text-[11px]">
                    {dayExpense > 0 && (
                      <span className="text-rose-600 font-bold">
                        Chi: -{formatCurrency(dayExpense)}
                      </span>
                    )}
                    {dayIncome > 0 && (
                      <span className="text-emerald-600 font-bold">
                        Thu: +{formatCurrency(dayIncome)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Day Items */}
                <div className="divide-y divide-slate-100">
                  {dayTxs.map((tx) => {
                    const acc = accountMap.get(tx.accountId);
                    const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : null;
                    const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;

                    return (
                      <div
                        key={tx.id}
                        className="group flex items-center justify-between py-3 px-2 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        {/* Left: Icon & Description & Bank Badge */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Icon */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                            style={{
                              backgroundColor:
                                tx.type === 'transfer'
                                  ? '#2563EB'
                                  : cat?.color || (tx.type === 'income' ? '#10B981' : '#F97316'),
                            }}
                          >
                            {tx.type === 'transfer' ? (
                              <ArrowRightLeft className="w-5 h-5" />
                            ) : (
                              <CategoryIcon name={cat?.icon || 'HelpCircle'} className="w-5 h-5" />
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-800 truncate">
                              {tx.description}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              {/* Bank badge */}
                              {tx.type === 'transfer' ? (
                                <>
                                  {accountFilter !== 'all' ? (
                                    accountFilter === tx.toAccountId ? (
                                      <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span>Thu: Nhận từ {acc?.name || 'Ngân hàng khác'}</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                        <span>Chi: Chuyển sang {toAcc?.name || 'Ngân hàng khác'}</span>
                                      </span>
                                    )
                                  ) : (
                                    <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                      <span>{acc?.name || 'Nguồn'}</span>
                                      <span>→</span>
                                      <span>{toAcc?.name || 'Đích'}</span>
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded text-[11px]"
                                  style={{
                                    backgroundColor: `${acc?.color || '#006533'}15`,
                                    color: acc?.color || '#006533',
                                  }}
                                >
                                  <Landmark className="w-3 h-3" />
                                  {acc?.name || 'Tài khoản'}
                                </span>
                              )}

                              {cat && (
                                <span className="text-slate-400 font-medium">
                                  • {cat.name}
                                </span>
                              )}

                              {tx.time && (
                                <span className="text-slate-400">
                                  • {tx.time}
                                </span>
                              )}

                              {tx.note && (
                                <span className="text-slate-400 italic truncate max-w-xs">
                                  • &quot;{tx.note}&quot;
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Running Balance & Actions */}
                        {(() => {
                          const balanceInfo = balanceAfterMap.get(tx.id);
                          let balanceToShow = balanceInfo?.accountBalanceAfter ?? 0;
                          let balanceAccountLabel = acc?.name || 'Tài khoản';

                          if (accountFilter !== 'all') {
                            if (accountFilter === tx.toAccountId) {
                              balanceToShow = balanceInfo?.toAccountBalanceAfter ?? 0;
                              balanceAccountLabel = toAcc?.name || 'Tài khoản nhận';
                            }
                          }

                          return (
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Cột 1: Số tiền giao dịch */}
                              <div className="text-right min-w-[100px]">
                                {tx.type === 'transfer' && accountFilter !== 'all' ? (
                                  accountFilter === tx.toAccountId ? (
                                    <>
                                      <div className="text-sm font-bold tracking-tight text-emerald-600">
                                        +{formatCurrency(tx.amount)}
                                      </div>
                                      <div className="text-[10px] text-emerald-600 font-semibold">
                                        Tiền nhận vào
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-sm font-bold tracking-tight text-rose-600">
                                        -{formatCurrency(tx.amount)}
                                      </div>
                                      <div className="text-[10px] text-rose-600 font-semibold">
                                        Tiền chuyển đi
                                      </div>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <div
                                      className={`text-sm font-bold tracking-tight ${
                                        tx.type === 'expense'
                                          ? 'text-rose-600'
                                          : tx.type === 'income'
                                          ? 'text-emerald-600'
                                          : 'text-blue-600'
                                      }`}
                                    >
                                      {tx.type === 'expense'
                                        ? `-${formatCurrency(tx.amount)}`
                                        : tx.type === 'income'
                                        ? `+${formatCurrency(tx.amount)}`
                                        : formatCurrency(tx.amount)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium capitalize">
                                      {tx.type === 'expense'
                                        ? 'Chi tiêu'
                                        : tx.type === 'income'
                                        ? 'Thu nhập'
                                        : 'Chuyển khoản'}
                                    </div>
                                  </>
                                )}

                                {/* Số tiền còn lại trên mobile */}
                                <div className="text-[10px] font-bold text-slate-600 sm:hidden mt-0.5">
                                  Còn lại: <span className="text-slate-900 font-black">{formatCurrency(balanceToShow)}</span>
                                </div>
                              </div>

                              {/* Cột 2: Số tiền còn lại sau giao dịch (Hiển thị nổi bật trên máy tính / tablet) */}
                              <div className="text-right px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 shrink-0 min-w-[130px] hidden sm:block">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-end gap-1">
                                  <Wallet className="w-3 h-3 text-slate-400" />
                                  <span>Số tiền còn lại</span>
                                </div>
                                <div className="text-sm font-black text-slate-900 tracking-tight">
                                  {formatCurrency(balanceToShow)}
                                </div>
                                <div className="text-[10px] font-semibold text-slate-500 truncate max-w-[125px]">
                                  {balanceAccountLabel}
                                </div>
                              </div>

                              {/* Cột 3: Thao tác Sửa / Xóa */}
                              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => onEditTransaction(tx)}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                                  title="Sửa giao dịch"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTransaction(tx.id);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Xóa giao dịch"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
