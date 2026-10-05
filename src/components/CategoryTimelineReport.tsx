import React, { useState, useMemo } from 'react';
import { Account, Category, Transaction } from '../types';
import { formatCurrency, formatFriendlyDate } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import {
  Calendar,
  Layers,
  Landmark,
  Wallet,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Clock,
  Sparkles,
  PieChart,
  Check,
  CheckSquare,
  Square,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Table,
  Tag,
} from 'lucide-react';

interface CategoryTimelineReportProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  currentMonth: string; // YYYY-MM
  onSelectAccount?: (accountId: string | null) => void;
  onOpenCategoryManager?: () => void;
}

export const CategoryTimelineReport: React.FC<CategoryTimelineReportProps> = ({
  accounts,
  transactions,
  categories,
  currentMonth,
  onOpenCategoryManager,
}) => {
  const [yearStr, monthStr] = currentMonth.split('-');
  const currentYear = parseInt(yearStr, 10);
  const currentMonthNum = parseInt(monthStr, 10);

  // Chế độ xem: 'timeline' (Dòng thời gian & lũy kế) | 'matrix' (Ma trận danh mục 12 tháng)
  const [viewLayout, setViewLayout] = useState<'timeline' | 'matrix'>('timeline');

  // 1. BỘ LỌC NGÂN HÀNG (1 HOẶC NHIỀU NGÂN HÀNG)
  // Set chứa các accountId được chọn. Nếu rỗng => chọn Tất cả
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);

  // 2. BỘ LỌC DANH MỤC
  const [categoryType, setCategoryType] = useState<'all' | 'expense' | 'income'>('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 3. BỘ LỌC THỜI GIAN (ĐI THEO THỜI GIAN)
  // 'month' (Theo tháng hiện tại) | 'year' (Theo năm) | 'all' (Toàn bộ) | 'custom' (Tùy chọn từ ngày - đến ngày)
  const [timeMode, setTimeMode] = useState<'month' | 'year' | 'all' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(`${currentMonth}-01`);
  const [customEndDate, setCustomEndDate] = useState<string>(
    `${currentMonth}-${String(new Date().getDate()).padStart(2, '0')}`
  );
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Map tra cứu nhanh
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Toggle chọn / bỏ chọn 1 ngân hàng
  const toggleBank = (accId: string) => {
    setSelectedBankIds((prev) => {
      if (prev.includes(accId)) {
        return prev.filter((id) => id !== accId);
      } else {
        return [...prev, accId];
      }
    });
  };

  const selectAllBanks = () => setSelectedBankIds([]);
  const selectOnlyBank = (accId: string) => setSelectedBankIds([accId]);

  // Danh sách danh mục phù hợp theo loại
  const filteredCategoryList = useMemo(() => {
    if (categoryType === 'all') return categories;
    return categories.filter((c) => c.type === categoryType);
  }, [categories, categoryType]);

  // Lọc giao dịch theo các tiêu chí: Ngân hàng (1 hoặc nhiều) + Danh mục + Thời gian
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Lọc theo 1 hoặc nhiều ngân hàng
      if (selectedBankIds.length > 0) {
        const matchBank =
          selectedBankIds.includes(t.accountId) ||
          (t.type === 'transfer' && t.toAccountId && selectedBankIds.includes(t.toAccountId));
        if (!matchBank) return false;
      }

      // 2. Lọc theo Loại danh mục (Chi tiêu / Thu nhập / Tất cả)
      if (categoryType !== 'all' && t.type !== categoryType) {
        return false;
      }

      // 3. Lọc theo Danh mục cụ thể
      if (selectedCategoryId !== 'all' && t.categoryId !== selectedCategoryId) {
        return false;
      }

      // 4. Lọc theo Thời gian
      if (timeMode === 'month') {
        if (!t.date.startsWith(currentMonth)) return false;
      } else if (timeMode === 'year') {
        if (!t.date.startsWith(yearStr)) return false;
      } else if (timeMode === 'custom') {
        if (customStartDate && t.date < customStartDate) return false;
        if (customEndDate && t.date > customEndDate) return false;
      }

      // 5. Từ khóa tìm kiếm
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchNote = t.note?.toLowerCase().includes(q);
        const cat = t.categoryId ? categoryMap.get(t.categoryId) : null;
        const matchCat = cat?.name.toLowerCase().includes(q);
        if (!matchDesc && !matchNote && !matchCat) return false;
      }

      return true;
    });
  }, [
    transactions,
    selectedBankIds,
    categoryType,
    selectedCategoryId,
    timeMode,
    currentMonth,
    yearStr,
    customStartDate,
    customEndDate,
    searchKeyword,
    categoryMap,
  ]);

  // Sắp xếp theo thời gian và tính lũy kế
  const sortedTransactionsWithCumulative = useMemo(() => {
    // Sắp xếp tăng dần theo ngày để tính lũy kế chuẩn xác theo dòng thời gian
    const ascList = [...filteredTransactions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.order || 0) - (b.order || 0);
    });

    let runningTotal = 0;
    const withCumulative = ascList.map((tx) => {
      runningTotal += tx.amount;
      return {
        ...tx,
        cumulativeAmount: runningTotal,
      };
    });

    // Trả về theo thứ tự người dùng chọn (mới nhất trước hoặc cũ nhất trước)
    if (sortOrder === 'desc') {
      return withCumulative.reverse();
    }
    return withCumulative;
  }, [filteredTransactions, sortOrder]);

  // TỔNG HỢP & THỐNG KÊ
  const totalAmount = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );
  const totalTxCount = filteredTransactions.length;
  const averagePerTx = totalTxCount > 0 ? Math.round(totalAmount / totalTxCount) : 0;

  // PHÂN BỔ THEO TỪNG NGÂN HÀNG (Bank contribution)
  const bankDistribution = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions.forEach((t) => {
      const accId = t.accountId;
      map.set(accId, (map.get(accId) || 0) + t.amount);
    });

    return Array.from(map.entries())
      .map(([accId, amount]) => {
        const acc = accountMap.get(accId);
        const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
        return {
          accId,
          accName: acc?.name || 'Khác',
          accColor: acc?.color || '#3B82F6',
          amount,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, accountMap, totalAmount]);

  // PHÂN BỔ THEO MỐC THỜI GIAN (Ngày hoặc Tháng) để vẽ biểu đồ dòng thời gian
  const timeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions.forEach((t) => {
      // Nếu xem theo năm: nhóm theo YYYY-MM
      // Nếu xem theo tháng hoặc custom: nhóm theo YYYY-MM-DD
      const timeKey = timeMode === 'year' ? t.date.slice(0, 7) : t.date;
      map.set(timeKey, (map.get(timeKey) || 0) + t.amount);
    });

    const sortedKeys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    const maxVal = Math.max(...Array.from(map.values()), 1);

    return sortedKeys.map((key) => {
      const val = map.get(key) || 0;
      let label = key;
      if (timeMode === 'year') {
        const m = parseInt(key.split('-')[1], 10);
        label = `T${m}`;
      } else {
        const d = parseInt(key.split('-')[2], 10);
        label = `N${d}`;
      }
      return {
        key,
        label,
        amount: val,
        percentage: (val / maxVal) * 100,
      };
    });
  }, [filteredTransactions, timeMode]);

  // TÍNH TOÁN MA TRẬN 12 THÁNG THEO DANH MỤC & CÁC NGÂN HÀNG ĐƯỢC CHỌN
  const matrixData = useMemo(() => {
    // Lọc theo năm và các ngân hàng được chọn
    const yearTransactions = transactions.filter((t) => {
      if (!t.date.startsWith(yearStr)) return false;
      if (selectedBankIds.length > 0) {
        const matchBank =
          selectedBankIds.includes(t.accountId) ||
          (t.type === 'transfer' && t.toAccountId && selectedBankIds.includes(t.toAccountId));
        if (!matchBank) return false;
      }
      return true;
    });

    const expenseCategories = categories.filter((c) => c.type === 'expense');
    const incomeCategories = categories.filter((c) => c.type === 'income');

    const getCategoryMonthlyAmounts = (cat: Category) => {
      const amounts: number[] = Array(12).fill(0);
      yearTransactions.forEach((t) => {
        if (t.categoryId === cat.id && t.type === cat.type) {
          const m = parseInt(t.date.split('-')[1], 10);
          if (m >= 1 && m <= 12) {
            amounts[m - 1] += t.amount;
          }
        }
      });
      const total = amounts.reduce((a, b) => a + b, 0);
      return { category: cat, amounts, total };
    };

    const expenseRows = expenseCategories.map(getCategoryMonthlyAmounts);
    const incomeRows = incomeCategories.map(getCategoryMonthlyAmounts);

    const totalExpenseYear = expenseRows.reduce((sum, r) => sum + r.total, 0);
    const totalIncomeYear = incomeRows.reduce((sum, r) => sum + r.total, 0);

    const monthlyExpenseTotals = Array(12).fill(0);
    expenseRows.forEach((r) => {
      r.amounts.forEach((amt, idx) => {
        monthlyExpenseTotals[idx] += amt;
      });
    });

    const monthlyIncomeTotals = Array(12).fill(0);
    incomeRows.forEach((r) => {
      r.amounts.forEach((amt, idx) => {
        monthlyIncomeTotals[idx] += amt;
      });
    });

    const monthlyNetTotals = Array(12)
      .fill(0)
      .map((_, i) => monthlyIncomeTotals[i] - monthlyExpenseTotals[i]);
    const netYearTotal = totalIncomeYear - totalExpenseYear;

    return {
      expenseRows,
      incomeRows,
      totalExpenseYear,
      totalIncomeYear,
      monthlyExpenseTotals,
      monthlyIncomeTotals,
      monthlyNetTotals,
      netYearTotal,
    };
  }, [transactions, categories, yearStr, selectedBankIds]);

  // Xuất CSV báo cáo danh mục theo ngân hàng & thời gian
  const handleExportCSV = () => {
    if (viewLayout === 'matrix') {
      const headers = [
        'Loại',
        'Danh mục',
        'T1',
        'T2',
        'T3',
        'T4',
        'T5',
        'T6',
        'T7',
        'T8',
        'T9',
        'T10',
        'T11',
        'T12',
        'Tổng Cả Năm',
      ];
      const rows: any[][] = [];

      // Chi tiêu
      matrixData.expenseRows.forEach((r) => {
        rows.push([
          'Chi tiêu',
          `"${r.category.name}"`,
          ...r.amounts,
          r.total,
        ]);
      });
      rows.push([
        'Tổng Chi',
        '"TỔNG CHI TIÊU"',
        ...matrixData.monthlyExpenseTotals,
        matrixData.totalExpenseYear,
      ]);

      // Thu nhập
      matrixData.incomeRows.forEach((r) => {
        rows.push([
          'Thu nhập',
          `"${r.category.name}"`,
          ...r.amounts,
          r.total,
        ]);
      });
      rows.push([
        'Tổng Thu',
        '"TỔNG THU NHẬP"',
        ...matrixData.monthlyIncomeTotals,
        matrixData.totalIncomeYear,
      ]);

      // Ròng
      rows.push([
        'Thu Chi Ròng',
        '"THU CHI RÒNG"',
        ...matrixData.monthlyNetTotals,
        matrixData.netYearTotal,
      ]);

      const csvContent =
        '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Ma_tran_danh_muc_${yearStr}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (sortedTransactionsWithCumulative.length === 0) {
      alert('Không có dữ liệu giao dịch để xuất CSV!');
      return;
    }

    const headers = [
      'Ngày',
      'Giờ',
      'Ngân hàng / Ví',
      'Danh mục',
      'Loại',
      'Số tiền (VNĐ)',
      'Lũy kế (VNĐ)',
      'Nội dung',
      'Ghi chú',
    ];
    const rows = sortedTransactionsWithCumulative.map((t) => {
      const acc = accountMap.get(t.accountId);
      const cat = t.categoryId ? categoryMap.get(t.categoryId) : null;
      return [
        t.date,
        t.time || '',
        `"${acc?.name || ''}"`,
        `"${cat?.name || 'Chưa phân loại'}"`,
        t.type === 'expense' ? 'Chi tiêu' : 'Thu nhập',
        t.amount,
        t.cumulativeAmount,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_cao_danh_muc_${selectedCategoryId}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeCategoryObj =
    selectedCategoryId !== 'all' ? categoryMap.get(selectedCategoryId) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER BÁO CÁO                                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold shadow-xs">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                BÁO CÁO THEO DANH MỤC & NHIỀU NGÂN HÀNG (THEO DÒNG THỜI GIAN)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi chi tiết bất kỳ danh mục nào phát sinh qua <strong>1 hoặc nhiều ngân hàng</strong> và diễn biến theo thời gian
              </p>
            </div>
          </div>
        </div>

        {/* Actions & Layout Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Layout Toggle: Timeline vs Matrix */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewLayout('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'timeline'
                  ? 'bg-sky-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Dòng Thời Gian</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewLayout === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Ma Trận 12 Tháng</span>
            </button>
          </div>

          {/* Nút mở Modal Quản Lý Danh Mục */}
          {onOpenCategoryManager && (
            <button
              type="button"
              onClick={onOpenCategoryManager}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl transition-colors border border-amber-300 shadow-2xs cursor-pointer"
              title="Sửa, thêm hoặc bớt danh mục thu chi"
            >
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>Sửa / Thêm Danh Mục</span>
            </button>
          )}

          {/* Nút xuất CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors border border-slate-200/90 shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BỘ LỌC ĐA NĂNG: NGÂN HÀNG (1 HOẶC NHIỀU) • DANH MỤC • THỜI GIAN        */}
      {/* ========================================================================= */}
      <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/90 space-y-4">
        {/* HÀNG 1: CHỌN 1 HOẶC NHIỀU NGÂN HÀNG */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              Chọn 1 hoặc nhiều Ngân hàng / Ví:
            </span>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllBanks}
                className={`font-bold text-[11px] px-2 py-0.5 rounded transition-colors ${
                  selectedBankIds.length === 0
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-sky-700 hover:bg-sky-100'
                }`}
              >
                Tất cả ngân hàng ({accounts.length})
              </button>
              {selectedBankIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedBankIds([])}
                  className="text-slate-500 hover:text-slate-700 text-[11px] underline"
                >
                  Bỏ chọn lọc ({selectedBankIds.length} đã chọn)
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {accounts.map((acc) => {
              const isSelected =
                selectedBankIds.length === 0 || selectedBankIds.includes(acc.id);
              const isExplicitlyChosen = selectedBankIds.includes(acc.id);

              return (
                <div
                  key={acc.id}
                  onClick={() => toggleBank(acc.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                    isExplicitlyChosen
                      ? 'bg-white text-slate-900 border-sky-500 ring-2 ring-sky-400/40 shadow-xs'
                      : isSelected && selectedBankIds.length === 0
                      ? 'bg-white text-slate-700 border-slate-200 shadow-2xs hover:border-slate-300'
                      : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: acc.color || '#006533' }}
                  />
                  <span>{acc.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({formatCurrency(acc.balance)})
                  </span>
                  {isExplicitlyChosen ? (
                    <CheckSquare className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 italic">
            * Bấm vào từng ngân hàng để chọn 1 hoặc nhiều ngân hàng cùng lúc. Bấm &quot;Tất cả ngân hàng&quot; để tổng hợp toàn bộ.
          </p>
        </div>

        {/* HÀNG 2: CHỌN DANH MỤC & LOẠI */}
        <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Loại Danh Mục */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Loại:
            </label>
            <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setCategoryType('expense');
                  setSelectedCategoryId('all');
                }}
                className={`py-1 text-[11px] font-bold rounded-lg transition-colors ${
                  categoryType === 'expense'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Chi tiêu
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategoryType('income');
                  setSelectedCategoryId('all');
                }}
                className={`py-1 text-[11px] font-bold rounded-lg transition-colors ${
                  categoryType === 'income'
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Thu nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategoryType('all');
                  setSelectedCategoryId('all');
                }}
                className={`py-1 text-[11px] font-bold rounded-lg transition-colors ${
                  categoryType === 'all'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tất cả
              </button>
            </div>
          </div>

          {/* Chọn Danh Mục Cụ Thể */}
          <div className="sm:col-span-5">
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Danh mục cụ thể:</span>
              {activeCategoryObj && (
                <span className="text-[10px] text-slate-500 font-normal">
                  Đang chọn: <strong>{activeCategoryObj.name}</strong>
                </span>
              )}
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="all">Tất cả danh mục ({filteredCategoryList.length})</option>
              {filteredCategoryList.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.type === 'expense' ? 'Chi' : 'Thu'})
                </option>
              ))}
            </select>
          </div>

          {/* Tìm kiếm nội dung */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Tìm theo nội dung / ghi chú:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ví dụ: Cơm, Xăng, Lương..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* HÀNG 3: ĐI THEO THỜI GIAN (TIME BREAKDOWN) */}
        <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Thời gian:
            </span>

            <button
              type="button"
              onClick={() => setTimeMode('month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeMode === 'month'
                  ? 'bg-sky-600 text-white shadow-xs font-black'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Tháng {currentMonthNum}/{yearStr}
            </button>

            <button
              type="button"
              onClick={() => setTimeMode('year')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeMode === 'year'
                  ? 'bg-sky-600 text-white shadow-xs font-black'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Cả Năm {yearStr}
            </button>

            <button
              type="button"
              onClick={() => setTimeMode('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeMode === 'all'
                  ? 'bg-sky-600 text-white shadow-xs font-black'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Toàn Bộ Lịch Sử
            </button>

            <button
              type="button"
              onClick={() => setTimeMode('custom')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeMode === 'custom'
                  ? 'bg-sky-600 text-white shadow-xs font-black'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Tùy chọn khoảng ngày
            </button>
          </div>

          {/* Sắp xếp thứ tự thời gian */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Thứ tự:</span>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-100 flex items-center gap-1 transition-colors"
            >
              <ArrowUpDown className="w-3 h-3 text-slate-500" />
              <span>{sortOrder === 'desc' ? 'Mới nhất trước' : 'Cũ nhất trước'}</span>
            </button>
          </div>
        </div>

        {/* Khung nhập khoảng ngày khi chọn 'custom' */}
        {timeMode === 'custom' && (
          <div className="p-3 bg-white rounded-xl border border-sky-300 flex flex-wrap items-center gap-3 text-xs animate-in fade-in">
            <span className="font-bold text-sky-900">Từ ngày:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
            />
            <span className="font-bold text-sky-900">Đến ngày:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CHẾ ĐỘ 1: DÒNG THỜI GIAN & BIỂU ĐỒ CHI TIẾT                               */}
      {/* ========================================================================= */}
      {viewLayout === 'timeline' && (
        <>
          {/* 3. TỔNG HỢP CHỈ SỐ KPI & PHÂN BỔ THEO NGÂN HÀNG */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Tổng tiền phát sinh */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-sky-950 text-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-sky-300 font-semibold mb-1">
            <span>Tổng phát sinh danh mục:</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold">
              {totalTxCount} giao dịch
            </span>
          </div>
          <div className="text-2xl font-black text-amber-300 tracking-tight">
            {formatCurrency(totalAmount)}
          </div>
          <div className="text-[11px] text-sky-200/80 mt-1 flex items-center justify-between">
            <span>Trung bình / giao dịch:</span>
            <strong>{formatCurrency(averagePerTx)}</strong>
          </div>
        </div>

        {/* Card 2: Danh mục đang xem */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 mb-1">
            Danh mục & Phạm vi ngân hàng:
          </div>
          <div className="flex items-center gap-2.5 my-1">
            {activeCategoryObj ? (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                style={{ backgroundColor: activeCategoryObj.color }}
              >
                <CategoryIcon name={activeCategoryObj.icon} className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold">
                <Layers className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="text-sm font-black text-slate-900">
                {activeCategoryObj?.name || 'Tất cả danh mục'}
              </div>
              <div className="text-[11px] text-slate-500">
                {selectedBankIds.length === 0
                  ? 'Tổng hợp toàn bộ ngân hàng'
                  : `Đang lọc qua ${selectedBankIds.length} ngân hàng đã chọn`}
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-200">
            Thời gian: <strong>{timeMode === 'month' ? `Tháng ${currentMonthNum}/${yearStr}` : timeMode === 'year' ? `Năm ${yearStr}` : timeMode === 'all' ? 'Toàn bộ' : `${customStartDate} → ${customEndDate}`}</strong>
          </div>
        </div>

        {/* Card 3: Tỷ trọng các ngân hàng đóng góp vào danh mục */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Tỷ trọng theo ngân hàng:</span>
            <span className="text-[10px] text-slate-400">({bankDistribution.length} NH)</span>
          </div>

          {bankDistribution.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2">Chưa có giao dịch phát sinh</div>
          ) : (
            <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
              {bankDistribution.map((item) => (
                <div key={item.accId} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.accColor }}
                      />
                      {item.accName}:
                    </span>
                    <span className="font-black text-slate-900">
                      {formatCurrency(item.amount)} ({Math.round(item.percentage)}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.accColor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BIỂU ĐỒ CỘT DÒNG THỜI GIAN (VISUAL TIMELINE HISTOGRAM)                  */}
      {/* ========================================================================= */}
      {timeDistribution.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-sky-600" />
              Diễn biến phát sinh theo dòng thời gian ({timeDistribution.length} mốc thời gian):
            </span>
            <span className="text-[11px] text-slate-500">
              Đơn vị: VNĐ
            </span>
          </div>

          <div className="flex items-end gap-1.5 sm:gap-2 h-28 pt-4 overflow-x-auto pb-2">
            {timeDistribution.map((bar) => (
              <div
                key={bar.key}
                className="flex flex-col items-center gap-1 h-full justify-end group min-w-[28px] sm:min-w-[34px] flex-1"
              >
                <div className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {formatCurrency(bar.amount)}
                </div>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-sky-600 to-teal-400 group-hover:from-sky-500 group-hover:to-teal-300 transition-all shadow-2xs"
                  style={{ height: `${Math.max(10, bar.percentage)}%` }}
                  title={`${bar.key}: ${formatCurrency(bar.amount)}`}
                />
                <span className="text-[10px] font-bold text-slate-600">
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BẢNG DÒNG THỜI GIAN CHI TIẾT (TIMELINE TRANSACTIONS TABLE)              */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            Bảng chi tiết giao dịch theo dòng thời gian ({sortedTransactionsWithCumulative.length} dòng):
          </span>
          <span className="text-[11px] text-slate-500 italic">
            Cột Lũy Kế thể hiện tổng tiền tích lũy tăng dần theo thời gian
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-200">
                <th className="py-2.5 px-3 w-28">Thời gian</th>
                <th className="py-2.5 px-3 w-36">Ngân hàng / Ví</th>
                <th className="py-2.5 px-3 w-40">Danh mục</th>
                <th className="py-2.5 px-3">Nội dung & Ghi chú</th>
                <th className="py-2.5 px-3 w-36 text-right">Số tiền</th>
                <th className="py-2.5 px-3 w-36 text-right">Lũy kế theo thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTransactionsWithCumulative.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    Không tìm thấy giao dịch nào phù hợp với bộ lọc ngân hàng, danh mục và thời gian đã chọn.
                  </td>
                </tr>
              ) : (
                sortedTransactionsWithCumulative.map((tx) => {
                  const acc = accountMap.get(tx.accountId);
                  const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
                  const isExpense = tx.type === 'expense';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Cột 1: Thời gian */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                        <div className="font-bold text-slate-900">{tx.date}</div>
                        {tx.time && (
                          <div className="text-[10px] text-slate-400">{tx.time}</div>
                        )}
                      </td>

                      {/* Cột 2: Ngân hàng */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-2xs"
                          style={{ backgroundColor: acc?.color || '#006533' }}
                        >
                          <Landmark className="w-3.5 h-3.5" />
                          <span>{acc?.name || 'Tài khoản'}</span>
                        </span>
                      </td>

                      {/* Cột 3: Danh mục */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {cat ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold text-white shadow-2xs"
                            style={{ backgroundColor: cat.color || '#F97316' }}
                          >
                            <CategoryIcon name={cat.icon || 'HelpCircle'} className="w-3.5 h-3.5" />
                            <span>{cat.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa phân loại</span>
                        )}
                      </td>

                      {/* Cột 4: Nội dung */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800">{tx.description}</div>
                        {tx.note && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">
                            &quot;{tx.note}&quot;
                          </div>
                        )}
                      </td>

                      {/* Cột 5: Số tiền */}
                      <td
                        className={`py-2.5 px-3 text-right font-black whitespace-nowrap ${
                          isExpense ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isExpense ? '-' : '+'}
                        {formatCurrency(tx.amount)}
                      </td>

                      {/* Cột 6: Lũy kế theo thời gian */}
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap bg-slate-50/60">
                        {formatCurrency(tx.cumulativeAmount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {sortedTransactionsWithCumulative.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-300">
                  <td colSpan={4} className="py-3 px-3 uppercase tracking-wide">
                    Tổng cộng ({sortedTransactionsWithCumulative.length} giao dịch):
                  </td>
                  <td className="py-3 px-3 text-right text-sm text-sky-950">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td className="py-3 px-3 text-right text-sm text-emerald-800">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      </>
    )}

    {/* ========================================================================= */}
    {/* CHẾ ĐỘ 2: BẢNG MA TRẬN TỔNG HỢP DANH MỤC 12 THÁNG (MATRIX VIEW)           */}
    {/* ========================================================================= */}
    {viewLayout === 'matrix' && (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-indigo-50/80 rounded-2xl border border-indigo-200 shadow-2xs">
          <div>
            <h3 className="font-black text-sm sm:text-base text-indigo-950 flex items-center gap-2">
              <Table className="w-4 h-4 text-indigo-600" />
              Ma Trận Tổng Hợp Danh Mục Thu Chi 12 Tháng - Năm {yearStr}
            </h3>
            <p className="text-xs text-indigo-700/80 mt-1">
              Tổng hợp số liệu theo từng tháng từ Tháng 1 đến Tháng 12 cho{' '}
              <strong>
                {selectedBankIds.length === 0
                  ? 'tất cả ngân hàng'
                  : `${selectedBankIds.length} ngân hàng đã chọn`}
              </strong>
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs bg-white px-3.5 py-2 rounded-xl border border-indigo-200/90 shadow-2xs">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Tổng Chi Năm</div>
              <div className="font-black text-rose-600">-{formatCurrency(matrixData.totalExpenseYear)}</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Tổng Thu Năm</div>
              <div className="font-black text-emerald-600">+{formatCurrency(matrixData.totalIncomeYear)}</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Thu Chi Ròng</div>
              <div className={`font-black ${matrixData.netYearTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {matrixData.netYearTotal >= 0 ? '+' : ''}{formatCurrency(matrixData.netYearTotal)}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300 text-[11px]">
                <th className="py-3 px-3.5 sticky left-0 bg-slate-100 z-10 min-w-[200px] shadow-xs">
                  Danh Mục
                </th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <th
                    key={m}
                    className={`py-3 px-2 text-right min-w-[95px] whitespace-nowrap ${
                      m === currentMonthNum ? 'bg-sky-100 text-sky-950 font-black' : ''
                    }`}
                  >
                    Tháng {m}
                  </th>
                ))}
                <th className="py-3 px-3 text-right min-w-[120px] bg-slate-200 text-slate-900 font-black whitespace-nowrap">
                  Tổng Cả Năm
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* 1. SECTION: KHOẢN CHI TIÊU */}
              <tr className="bg-rose-50/80 border-y border-rose-200 font-black text-rose-950">
                <td colSpan={14} className="py-2.5 px-3.5 uppercase tracking-wide text-[11px]">
                  🔻 1. KHOẢN CHI TIÊU (EXPENSES)
                </td>
              </tr>
              {matrixData.expenseRows.map((row) => (
                <tr key={row.category.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3.5 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 text-[10px] shadow-2xs"
                        style={{ backgroundColor: row.category.color }}
                      >
                        <CategoryIcon name={row.category.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800 truncate">{row.category.name}</span>
                    </div>
                  </td>
                  {row.amounts.map((amt, idx) => (
                    <td
                      key={idx}
                      className={`py-2 px-2 text-right whitespace-nowrap ${
                        idx + 1 === currentMonthNum ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      {amt > 0 ? (
                        <span className="font-bold text-rose-600">-{formatCurrency(amt)}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right font-black text-rose-700 bg-rose-50/40 whitespace-nowrap">
                    {row.total > 0 ? `-${formatCurrency(row.total)}` : '-'}
                  </td>
                </tr>
              ))}
              {/* Tổng Dòng Chi */}
              <tr className="bg-rose-100/70 text-rose-950 font-black border-t-2 border-rose-300">
                <td className="py-3 px-3.5 sticky left-0 bg-rose-100 z-10 uppercase tracking-wide text-[11px] shadow-xs">
                  Tổng Chi Tiêu:
                </td>
                {matrixData.monthlyExpenseTotals.map((amt, idx) => (
                  <td key={idx} className="py-3 px-2 text-right whitespace-nowrap">
                    {amt > 0 ? `-${formatCurrency(amt)}` : '-'}
                  </td>
                ))}
                <td className="py-3 px-3 text-right text-rose-800 bg-rose-200/80 whitespace-nowrap">
                  -{formatCurrency(matrixData.totalExpenseYear)}
                </td>
              </tr>

              {/* 2. SECTION: KHOẢN THU NHẬP */}
              <tr className="bg-emerald-50/80 border-y border-emerald-200 font-black text-emerald-950">
                <td colSpan={14} className="py-2.5 px-3.5 uppercase tracking-wide text-[11px]">
                  🔺 2. KHOẢN THU NHẬP (INCOME)
                </td>
              </tr>
              {matrixData.incomeRows.map((row) => (
                <tr key={row.category.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3.5 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 text-[10px] shadow-2xs"
                        style={{ backgroundColor: row.category.color }}
                      >
                        <CategoryIcon name={row.category.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-slate-800 truncate">{row.category.name}</span>
                    </div>
                  </td>
                  {row.amounts.map((amt, idx) => (
                    <td
                      key={idx}
                      className={`py-2 px-2 text-right whitespace-nowrap ${
                        idx + 1 === currentMonthNum ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      {amt > 0 ? (
                        <span className="font-bold text-emerald-600">+{formatCurrency(amt)}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right font-black text-emerald-700 bg-emerald-50/40 whitespace-nowrap">
                    {row.total > 0 ? `+${formatCurrency(row.total)}` : '-'}
                  </td>
                </tr>
              ))}
              {/* Tổng Dòng Thu */}
              <tr className="bg-emerald-100/70 text-emerald-950 font-black border-t-2 border-emerald-300">
                <td className="py-3 px-3.5 sticky left-0 bg-emerald-100 z-10 uppercase tracking-wide text-[11px] shadow-xs">
                  Tổng Thu Nhập:
                </td>
                {matrixData.monthlyIncomeTotals.map((amt, idx) => (
                  <td key={idx} className="py-3 px-2 text-right whitespace-nowrap">
                    {amt > 0 ? `+${formatCurrency(amt)}` : '-'}
                  </td>
                ))}
                <td className="py-3 px-3 text-right text-emerald-800 bg-emerald-200/80 whitespace-nowrap">
                  +{formatCurrency(matrixData.totalIncomeYear)}
                </td>
              </tr>

              {/* 3. SECTION: THU CHI RÒNG */}
              <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-950">
                <td className="py-3 px-3.5 sticky left-0 bg-slate-900 z-10 uppercase tracking-wide text-[11px] shadow-xs">
                  ⚖️ Thu Chi Ròng (Thu - Chi):
                </td>
                {matrixData.monthlyNetTotals.map((net, idx) => (
                  <td
                    key={idx}
                    className={`py-3 px-2 text-right whitespace-nowrap font-black ${
                      net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {net >= 0 ? '+' : ''}
                    {formatCurrency(net)}
                  </td>
                ))}
                <td
                  className={`py-3 px-3 text-right font-black whitespace-nowrap ${
                    matrixData.netYearTotal >= 0 ? 'text-emerald-300 bg-slate-800' : 'text-rose-300 bg-slate-800'
                  }`}
                >
                  {matrixData.netYearTotal >= 0 ? '+' : ''}
                  {formatCurrency(matrixData.netYearTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);
};
