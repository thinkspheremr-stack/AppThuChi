import React, { useState, useMemo } from 'react';
import { Account, Category, Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  PiggyBank,
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Coins,
  CheckCircle2,
} from 'lucide-react';

interface YearlyFinancialReportTableProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  currentMonth: string; // YYYY-MM
  onSelectMonth?: (month: string) => void;
  onOpenTransfer?: () => void;
  onOpenSalaryAllocation?: () => void;
}

export const YearlyFinancialReportTable: React.FC<YearlyFinancialReportTableProps> = ({
  accounts,
  transactions,
  categories,
  currentMonth,
  onSelectMonth,
  onOpenTransfer,
  onOpenSalaryAllocation,
}) => {
  const currentYearNum = parseInt(currentMonth.split('-')[0], 10) || new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [activeReportTab, setActiveReportTab] = useState<'all' | 'months' | 'savings' | 'transfers'>('all');

  // Lấy danh sách các năm có giao dịch để hiển thị trong dropdown
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear());
    yearsSet.add(currentYearNum);
    transactions.forEach((t) => {
      const y = parseInt(t.date.slice(0, 4), 10);
      if (!isNaN(y)) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions, currentYearNum]);

  // Lọc tất cả giao dịch trong năm đã chọn
  const yearPrefix = `${selectedYear}-`;
  const yearTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(yearPrefix));
  }, [transactions, yearPrefix]);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // =========================================================================
  // 1. TÍNH TOÁN DÒNG TIỀN CẢ NĂM (NGUYÊN TẮC TÁCH BẠCH CHUYỂN KHOẢN NỘI BỘ)
  // =========================================================================
  // - Thu nhập thực tế (ngoài vào): Lương, thưởng, bán hàng...
  const realExternalInflow = useMemo(() => {
    return yearTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  // - Chi tiêu thực tế (ra ngoài): Tiêu dùng, hóa đơn, sinh hoạt...
  const realExternalOutflow = useMemo(() => {
    return yearTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  // - Chuyển khoản nội bộ giữa các ngân hàng trong năm
  const grandTotalBankTransfers = useMemo(() => {
    return yearTransactions
      .filter(
        (t) =>
          t.type === 'transfer' &&
          t.toAccountId !== 'saving' &&
          !t.tags?.includes('saving')
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  // - Chuyển vào mục Tiết Kiệm cả năm
  const grandTotalSavings = useMemo(() => {
    return yearTransactions
      .filter(
        (t) =>
          t.type === 'transfer' &&
          (t.toAccountId === 'saving' || t.tags?.includes('saving'))
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [yearTransactions]);

  // - Thu chi ròng cả năm (Tăng trưởng tài sản thực tế = Thu ngoài - Chi ngoài)
  const grandNetFlow = realExternalInflow - realExternalOutflow;

  // - Tổng số dư khả dụng hiện có
  const grandTotalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  }, [accounts]);

  // Danh sách các khoản gửi tiết kiệm cả năm
  const allYearSavings = useMemo(() => {
    return yearTransactions.filter(
      (t) => t.type === 'transfer' && (t.toAccountId === 'saving' || t.tags?.includes('saving'))
    );
  }, [yearTransactions]);

  // Danh sách các khoản chuyển khoản liên ngân hàng cả năm
  const allYearBankTransfers = useMemo(() => {
    return yearTransactions.filter(
      (t) => t.type === 'transfer' && t.toAccountId !== 'saving' && !t.tags?.includes('saving')
    );
  }, [yearTransactions]);

  // =========================================================================
  // 2. BÁO CÁO THEO TỪNG TÀI KHOẢN NGÂN HÀNG TRONG CẢ NĂM
  // =========================================================================
  const accountReportData = useMemo(() => {
    const yearStartStr = `${selectedYear}-01-01`;

    return accounts.map((acc) => {
      // Tính số dư đầu năm = số dư ban đầu + tổng biến động trước 01/01 của năm
      const prevTransactions = transactions.filter((t) => t.date < yearStartStr);
      let openingBalance = acc.initialBalance || 0;
      prevTransactions.forEach((t) => {
        if (t.accountId === acc.id) {
          if (t.type === 'income') openingBalance += t.amount;
          else if (t.type === 'expense') openingBalance -= t.amount;
          else if (t.type === 'transfer') openingBalance -= t.amount;
        }
        if (t.type === 'transfer' && t.toAccountId === acc.id) {
          openingBalance += t.amount;
        }
      });

      // 1. Thu ngoài vào tài khoản này trong năm
      const accIncomes = yearTransactions.filter(
        (t) => t.type === 'income' && t.accountId === acc.id
      );
      const realIncome = accIncomes.reduce((sum, t) => sum + t.amount, 0);

      // 2. Chi ngoài từ tài khoản này trong năm
      const accExpenses = yearTransactions.filter(
        (t) => t.type === 'expense' && t.accountId === acc.id
      );
      const realExpense = accExpenses.reduce((sum, t) => sum + t.amount, 0);

      // 3. Nhận chuyển khoản từ ngân hàng khác
      const accTransfersReceived = yearTransactions.filter(
        (t) => t.type === 'transfer' && t.toAccountId === acc.id
      );
      const transferReceived = accTransfersReceived.reduce((sum, t) => sum + t.amount, 0);

      // 4. Chuyển khoản sang ngân hàng khác
      const accTransfersSent = yearTransactions.filter(
        (t) =>
          t.type === 'transfer' &&
          t.accountId === acc.id &&
          t.toAccountId !== 'saving' &&
          !t.tags?.includes('saving')
      );
      const transferSent = accTransfersSent.reduce((sum, t) => sum + t.amount, 0);

      // 5. Trích vào mục Tiết Kiệm
      const accSavingsSent = yearTransactions.filter(
        (t) =>
          t.type === 'transfer' &&
          t.accountId === acc.id &&
          (t.toAccountId === 'saving' || t.tags?.includes('saving'))
      );
      const savingsSent = accSavingsSent.reduce((sum, t) => sum + t.amount, 0);

      // Biến động ròng cả năm của tài khoản này
      const netChange =
        realIncome + transferReceived - (realExpense + transferSent + savingsSent);

      return {
        account: acc,
        openingBalance,
        currentBalance: acc.balance,
        realIncome,
        realExpense,
        transferReceived,
        transferSent,
        savingsSent,
        netChange,
        incomeCount: accIncomes.length,
        expenseCount: accExpenses.length,
        receivedCount: accTransfersReceived.length,
        sentCount: accTransfersSent.length,
        savingsCount: accSavingsSent.length,
      };
    });
  }, [accounts, transactions, yearTransactions, selectedYear]);

  // =========================================================================
  // 3. MA TRẬN 12 THÁNG TRONG NĂM (THÁNG 1 ĐẾN THÁNG 12)
  // =========================================================================
  const monthlyBreakdown = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthKey = `${selectedYear}-${String(monthNum).padStart(2, '0')}`;
      const mTransactions = yearTransactions.filter((t) => t.date.startsWith(monthKey));

      const income = mTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = mTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const savings = mTransactions
        .filter(
          (t) =>
            t.type === 'transfer' &&
            (t.toAccountId === 'saving' || t.tags?.includes('saving'))
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const bankTransfers = mTransactions
        .filter(
          (t) =>
            t.type === 'transfer' &&
            t.toAccountId !== 'saving' &&
            !t.tags?.includes('saving')
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const net = income - expense;
      const isCurrentMonth = monthKey === currentMonth;

      return {
        monthNum,
        monthKey,
        income,
        expense,
        savings,
        bankTransfers,
        net,
        txCount: mTransactions.length,
        isCurrentMonth,
      };
    });
  }, [yearTransactions, selectedYear, currentMonth]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden mb-6">
      {/* ========================================================================= */}
      {/* 1. REPORT HEADER & YEAR SELECTOR                                          */}
      {/* ========================================================================= */}
      <div className="bg-[#0b1329] text-white p-4 sm:p-5 border-b border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Description */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950 text-sky-400 flex items-center justify-center font-black shadow-inner border border-sky-800/80 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white uppercase">
                  BẢNG BÁO CÁO TỔNG HỢP TÀI CHÍNH & DÒNG TIỀN
                </h2>

                {/* Năm Navigator */}
                <div className="flex items-center bg-sky-950/80 border border-sky-600/50 rounded-xl px-2 py-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedYear((y) => y - 1)}
                    className="p-1 hover:text-sky-300 transition-colors"
                    title="Năm trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2.5 text-xs font-black text-sky-200 tracking-wider">
                    Năm {selectedYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedYear((y) => y + 1)}
                    className="p-1 hover:text-sky-300 transition-colors"
                    title="Năm sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-300/90 mt-0.5">
                Báo cáo toàn cảnh dòng tiền, thu chi thực tế & luân chuyển nội bộ trong suốt cả năm {selectedYear}
              </p>
            </div>
          </div>

          {/* Action Tabs in Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveReportTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                activeReportTab === 'all'
                  ? 'bg-sky-500 text-slate-950 font-black shadow-sky-500/20'
                  : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Theo Ngân Hàng</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveReportTab('months')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                activeReportTab === 'months'
                  ? 'bg-sky-500 text-slate-950 font-black shadow-sky-500/20'
                  : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>12 Tháng Trong Năm</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveReportTab('savings')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                activeReportTab === 'savings'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mục Tiết Kiệm ({allYearSavings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveReportTab('transfers')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                activeReportTab === 'transfers'
                  ? 'bg-blue-500 text-slate-950 font-black'
                  : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Chuyển Liên NH ({allYearBankTransfers.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 6 SUMMARY CARDS THEO NĂM (CHUẨN FORM NHƯ ẢNH 1)                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y lg:divide-y-0 divide-x divide-slate-100 bg-slate-50/70 border-b border-slate-200 text-left">
        {/* Metric 1: Tổng Thu Cả Năm */}
        <div className="p-3.5">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px] mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Tổng Thu Cả Năm (Ngoài vào)
          </div>
          <div className="text-base font-black text-emerald-600 tracking-tight">
            +{formatCurrency(realExternalInflow)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Lương, thưởng & nguồn ngoài
          </div>
        </div>

        {/* Metric 2: Tổng Chi Cả Năm */}
        <div className="p-3.5">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px] mb-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Tổng Chi Cả Năm (Tiêu ra ngoài)
          </div>
          <div className="text-base font-black text-rose-600 tracking-tight">
            -{formatCurrency(realExternalOutflow)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Chi tiêu sinh hoạt, hóa đơn
          </div>
        </div>

        {/* Metric 3: Mục Tiết Kiệm Cả Năm */}
        <div className="p-3.5 bg-emerald-50/40">
          <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] mb-1">
            <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
            Mục Tiết Kiệm Cả Năm
          </div>
          <div className="text-base font-black text-emerald-700 tracking-tight">
            +{formatCurrency(grandTotalSavings)}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
            {allYearSavings.length} khoản trích tích lũy
          </div>
        </div>

        {/* Metric 4: Chuyển Liên NH Nội Bộ Cả Năm */}
        <div className="p-3.5 bg-blue-50/30">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px] mb-1">
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
            Chuyển Liên NH (Nội bộ)
          </div>
          <div className="text-base font-black text-blue-700 tracking-tight">
            {formatCurrency(grandTotalBankTransfers)}
          </div>
          <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
            Luân chuyển giữa các ví/NH
          </div>
        </div>

        {/* Metric 5: Thu Chi Ròng Thực Tế Cả Năm */}
        <div className="p-3.5">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px] mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            Thu Chi Ròng Cả Năm
          </div>
          <div
            className={`text-base font-black tracking-tight ${
              grandNetFlow >= 0 ? 'text-indigo-600' : 'text-rose-600'
            }`}
          >
            {grandNetFlow >= 0 ? '+' : ''}
            {formatCurrency(grandNetFlow)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Thu ngoài (-) Chi ngoài
          </div>
        </div>

        {/* Metric 6: Tổng Số Dư Hiện Có */}
        <div className="p-3.5 bg-sky-50/40">
          <div className="flex items-center gap-1.5 text-sky-900 font-bold text-[11px] mb-1">
            <Wallet className="w-3.5 h-3.5 text-sky-600" />
            Tổng Số Dư Khả Dụng
          </div>
          <div className="text-base font-black text-slate-900 tracking-tight">
            {formatCurrency(grandTotalBalance)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Tại {accounts.length} ngân hàng & ví
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. REPORT VIEWS (THEO NGÂN HÀNG, 12 THÁNG, TIẾT KIỆM, CHUYỂN KHOẢN)       */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5">
        {/* VIEW 1: BẢNG BÁO CÁO CẢ NĂM THEO TỪNG TÀI KHOẢN NGÂN HÀNG */}
        {activeReportTab === 'all' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span>
                💡 Chuyển khoản nội bộ giữa các ngân hàng trong năm {selectedYear} được hạch toán tách biệt ở 2 cột <strong>Nhận Chuyển</strong> và <strong>Chuyển Đi</strong> để không làm sai lệch Tổng Thu/Chi.
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-black border-b border-slate-200 text-[11px]">
                    <th className="py-3 px-3.5">TÀI KHOẢN / NGÂN HÀNG</th>
                    <th className="py-3 px-3.5 text-right">SỐ DƯ ĐẦU NĂM</th>
                    <th className="py-3 px-3.5 text-right text-emerald-700">THU NGOÀI (+)</th>
                    <th className="py-3 px-3.5 text-right text-rose-700">CHI NGOÀI (-)</th>
                    <th className="py-3 px-3.5 text-right text-emerald-700">NHẬN CHUYỂN (+)</th>
                    <th className="py-3 px-3.5 text-right text-blue-700">CHUYỂN ĐI (-)</th>
                    <th className="py-3 px-3.5 text-right text-emerald-700">TIẾT KIỆM</th>
                    <th className="py-3 px-3.5 text-right font-black">SỐ DƯ HIỆN CÓ</th>
                    <th className="py-3 px-3.5 text-center">BIẾN ĐỘNG RÒNG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accountReportData.map((row) => {
                    const acc = row.account;
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Account Name */}
                        <td className="py-3 px-3.5 font-bold">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0"
                              style={{ backgroundColor: acc.color || '#006533' }}
                            >
                              <CategoryIcon name={acc.iconName || 'Landmark'} className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-slate-900 font-extrabold">{acc.name}</div>
                              {acc.accountNumber && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  STK: {acc.accountNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Opening Balance */}
                        <td className="py-3 px-3.5 text-right font-semibold text-slate-600">
                          {formatCurrency(row.openingBalance)}
                        </td>

                        {/* External Income */}
                        <td className="py-3 px-3.5 text-right font-black text-emerald-600">
                          {row.realIncome > 0 ? (
                            <span className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              +{formatCurrency(row.realIncome)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* External Expense */}
                        <td className="py-3 px-3.5 text-right font-black text-rose-600">
                          {row.realExpense > 0 ? (
                            <span className="bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              -{formatCurrency(row.realExpense)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Transfers Received */}
                        <td className="py-3 px-3.5 text-right font-bold text-emerald-700">
                          {row.transferReceived > 0 ? (
                            <span>+{formatCurrency(row.transferReceived)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Transfers Sent */}
                        <td className="py-3 px-3.5 text-right font-bold text-blue-700">
                          {row.transferSent > 0 ? (
                            <span>-{formatCurrency(row.transferSent)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Savings Sent */}
                        <td className="py-3 px-3.5 text-right font-bold text-emerald-800">
                          {row.savingsSent > 0 ? (
                            <span className="text-emerald-700 bg-emerald-50/60 px-1.5 py-0.5 rounded">
                              +{formatCurrency(row.savingsSent)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Current Balance */}
                        <td className="py-3 px-3.5 text-right font-black text-slate-900 text-sm">
                          {formatCurrency(row.currentBalance)}
                        </td>

                        {/* Net Change */}
                        <td className="py-3 px-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black ${
                              row.netChange > 0
                                ? 'bg-emerald-100 text-emerald-700'
                                : row.netChange < 0
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.netChange > 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : row.netChange < 0 ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : null}
                            {row.netChange > 0 ? '+' : ''}
                            {formatCurrency(row.netChange)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-slate-900 text-[11px]">
                    <td className="py-3 px-3.5 uppercase tracking-wide">TỔNG CỘNG CẢ NĂM</td>
                    <td className="py-3 px-3.5 text-right text-slate-700">
                      {formatCurrency(
                        accountReportData.reduce((sum, r) => sum + r.openingBalance, 0)
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right text-emerald-600">
                      +{formatCurrency(realExternalInflow)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-rose-600">
                      -{formatCurrency(realExternalOutflow)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-emerald-700">
                      +{formatCurrency(grandTotalBankTransfers)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-blue-700">
                      -{formatCurrency(grandTotalBankTransfers)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-emerald-800">
                      +{formatCurrency(grandTotalSavings)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-slate-900 text-sm">
                      {formatCurrency(grandTotalBalance)}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="font-extrabold text-indigo-700">
                        Thu chi ròng: {grandNetFlow >= 0 ? '+' : ''}
                        {formatCurrency(grandNetFlow)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: MA TRẬN 12 THÁNG TRONG NĂM */}
        {activeReportTab === 'months' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span>
                📅 Tổng hợp dòng tiền chi tiết của 12 tháng trong năm <strong>{selectedYear}</strong>. Bấm vào nút <strong>Xem tháng</strong> để chuyển đến báo cáo tháng tương ứng.
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-black border-b border-slate-200 text-[11px]">
                    <th className="py-3 px-3.5">THỜI GIAN</th>
                    <th className="py-3 px-3.5 text-right text-emerald-700">THU NGOÀI (+)</th>
                    <th className="py-3 px-3.5 text-right text-rose-700">CHI NGOÀI (-)</th>
                    <th className="py-3 px-3.5 text-right text-emerald-700">TIẾT KIỆM (+)</th>
                    <th className="py-3 px-3.5 text-right text-indigo-700">THU CHI RÒNG</th>
                    <th className="py-3 px-3.5 text-center">SỐ GIAO DỊCH</th>
                    <th className="py-3 px-3.5 text-center">HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyBreakdown.map((m) => (
                    <tr
                      key={m.monthNum}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        m.isCurrentMonth ? 'bg-sky-50/60 font-semibold' : ''
                      }`}
                    >
                      {/* Month Label */}
                      <td className="py-3 px-3.5 font-bold">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${
                              m.isCurrentMonth
                                ? 'bg-sky-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {m.monthNum}
                          </span>
                          <span className="text-slate-900 font-extrabold">
                            Tháng {m.monthNum}/{selectedYear}
                          </span>
                          {m.isCurrentMonth && (
                            <span className="text-[10px] bg-sky-200 text-sky-800 px-1.5 py-0.5 rounded font-bold">
                              Tháng hiện tại
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Thu */}
                      <td className="py-3 px-3.5 text-right font-black text-emerald-600">
                        {m.income > 0 ? `+${formatCurrency(m.income)}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* Chi */}
                      <td className="py-3 px-3.5 text-right font-black text-rose-600">
                        {m.expense > 0 ? `-${formatCurrency(m.expense)}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* Tiết Kiệm */}
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-700">
                        {m.savings > 0 ? `+${formatCurrency(m.savings)}` : <span className="text-slate-300">-</span>}
                      </td>

                      {/* Thu Chi Ròng */}
                      <td className="py-3 px-3.5 text-right font-black">
                        <span
                          className={
                            m.net > 0
                              ? 'text-indigo-600'
                              : m.net < 0
                              ? 'text-rose-600'
                              : 'text-slate-400'
                          }
                        >
                          {m.net > 0 ? '+' : ''}
                          {formatCurrency(m.net)}
                        </span>
                      </td>

                      {/* Tx count */}
                      <td className="py-3 px-3.5 text-center text-slate-500 font-medium">
                        {m.txCount} giao dịch
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-3.5 text-center">
                        {onSelectMonth && (
                          <button
                            type="button"
                            onClick={() => onSelectMonth(m.monthKey)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 hover:bg-sky-200 text-sky-800 transition-colors cursor-pointer"
                          >
                            <span>Xem Tháng</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-slate-900 text-[11px]">
                    <td className="py-3 px-3.5 uppercase tracking-wide">TỔNG CỘNG 12 THÁNG</td>
                    <td className="py-3 px-3.5 text-right text-emerald-600">
                      +{formatCurrency(realExternalInflow)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-rose-600">
                      -{formatCurrency(realExternalOutflow)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-emerald-800">
                      +{formatCurrency(grandTotalSavings)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-indigo-700">
                      {grandNetFlow >= 0 ? '+' : ''}
                      {formatCurrency(grandNetFlow)}
                    </td>
                    <td className="py-3 px-3.5 text-center text-slate-700">
                      {yearTransactions.length} giao dịch
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: DANH SÁCH CÁC KHOẢN TIẾT KIỆM TRONG NĂM */}
        {activeReportTab === 'savings' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 pb-1">
              <span>
                🐷 Danh sách các khoản tiền đã trích từ tài khoản ngân hàng vào <strong>Mục Tiết Kiệm</strong> trong năm {selectedYear}.
              </span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Tổng tích lũy năm {selectedYear}: +{formatCurrency(grandTotalSavings)}
              </span>
            </div>

            {allYearSavings.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3">Ngày</th>
                      <th className="py-2.5 px-3">Ngân hàng nguồn</th>
                      <th className="py-2.5 px-3">Mục tiêu tiết kiệm</th>
                      <th className="py-2.5 px-3 text-right">Số tiền gửi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allYearSavings.map((tx) => {
                      const fromAcc = accountMap.get(tx.accountId);
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{tx.date}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{fromAcc?.name || 'Ngân hàng'}</td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">{tx.description}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                            +{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                Chưa có khoản trích tiết kiệm nào trong năm {selectedYear}.
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: CHUYỂN KHOẢN LIÊN NGÂN HÀNG TRONG NĂM */}
        {activeReportTab === 'transfers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 pb-1">
              <span>
                🔄 Luân chuyển tiền nội bộ giữa các ngân hàng trong năm {selectedYear} (không tính vào chi tiêu ngoài).
              </span>
              <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                Tổng luân chuyển: {formatCurrency(grandTotalBankTransfers)}
              </span>
            </div>

            {allYearBankTransfers.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3">Ngày</th>
                      <th className="py-2.5 px-3">Từ ngân hàng</th>
                      <th className="py-2.5 px-3">Đến ngân hàng</th>
                      <th className="py-2.5 px-3">Nội dung</th>
                      <th className="py-2.5 px-3 text-right">Số tiền chuyển</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allYearBankTransfers.map((tx) => {
                      const fromAcc = accountMap.get(tx.accountId);
                      const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : null;
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{tx.date}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{fromAcc?.name || 'Ngân hàng gửi'}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-800">{toAcc?.name || 'Ngân hàng nhận'}</td>
                          <td className="py-2.5 px-3 text-slate-700">{tx.description}</td>
                          <td className="py-2.5 px-3 text-right font-black text-blue-600">
                            {formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                Chưa có giao dịch chuyển liên ngân hàng nào trong năm {selectedYear}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
