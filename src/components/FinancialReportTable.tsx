import React, { useState } from 'react';
import { Account, Category, Transaction } from '../types';
import { formatCurrency, formatFriendlyDate, formatMonthYear } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  PiggyBank,
  Wallet,
  Landmark,
  Building2,
  Calendar,
  CheckCircle2,
  PieChart,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Coins,
  Sparkles,
  Info,
} from 'lucide-react';

interface FinancialReportTableProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  currentMonth: string; // YYYY-MM
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string | null) => void;
  onOpenTransfer?: () => void;
  onOpenSalaryAllocation?: () => void;
}

export const FinancialReportTable: React.FC<FinancialReportTableProps> = ({
  accounts,
  transactions,
  categories,
  currentMonth,
  selectedAccountId,
  onSelectAccount,
  onOpenTransfer,
  onOpenSalaryAllocation,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'all' | 'savings' | 'transfers'>('all');

  // Month parse
  const [yearStr, monthStr] = currentMonth.split('-');
  const monthNum = parseInt(monthStr, 10);
  const currentYear = parseInt(yearStr, 10);

  // Filter transactions of this month
  const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonth));

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // =========================================================================
  // 1. TÍNH TOÁN DÒNG TIỀN CHUẨN XÁC (FIX CHUYỂN NỘI BỘ KHÔNG LÀM TĂNG THU)
  // =========================================================================
  // NGUYÊN TẮC:
  // - Thu nhập thực tế (Tiền từ ngoài vào): CHỈ tính t.type === 'income' (Lương, thưởng, bán hàng...)
  // - Chuyển khoản giữa các ngân hàng là luân chuyển NỘI BỘ, KHÔNG PHẢI thu nhập từ ngoài và KHÔNG làm tăng Tổng Thu!
  const realExternalInflow = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // - Chi tiêu thực tế (Tiền chi ra ngoài): CHỈ tính t.type === 'expense' (Ăn uống, tiền nhà, mua sắm...)
  const realExternalOutflow = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // - Tổng chuyển tiền liên ngân hàng (nội bộ)
  const grandTotalBankTransfers = monthTransactions
    .filter(
      (t) =>
        t.type === 'transfer' &&
        t.toAccountId !== 'saving' &&
        !t.tags?.includes('saving')
    )
    .reduce((sum, t) => sum + t.amount, 0);

  // - Tổng chuyển vào Mục Tiết Kiệm (tích lũy tài sản)
  const grandTotalSavings = monthTransactions
    .filter(
      (t) =>
        t.type === 'transfer' &&
        (t.toAccountId === 'saving' || t.tags?.includes('saving'))
    )
    .reduce((sum, t) => sum + t.amount, 0);

  // - Thu chi ròng thực tế (Gia tăng tài sản ròng thực sự = Thu ngoài - Chi ngoài)
  const grandNetFlow = realExternalInflow - realExternalOutflow;

  // - Tổng số dư khả dụng hiện có của toàn bộ tài khoản
  const grandTotalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Tỷ lệ tiết kiệm thực tế
  const savingsRate =
    realExternalInflow > 0
      ? (((grandTotalSavings + Math.max(0, grandNetFlow - grandTotalSavings)) / realExternalInflow) * 100).toFixed(1)
      : '0.0';

  // Calculate detailed flow for each individual account
  const accountReportData = accounts.map((acc) => {
    // 1. External income directly into this account
    const accRealIncomes = monthTransactions.filter(
      (t) => t.type === 'income' && t.accountId === acc.id
    );
    const realIncome = accRealIncomes.reduce((sum, t) => sum + t.amount, 0);

    // 2. External expense directly from this account
    const accRealExpenses = monthTransactions.filter(
      (t) => t.type === 'expense' && t.accountId === acc.id
    );
    const realExpense = accRealExpenses.reduce((sum, t) => sum + t.amount, 0);

    // 3. Internal transfer RECEIVED from other banks
    const accTransfersReceived = monthTransactions.filter(
      (t) => t.type === 'transfer' && t.toAccountId === acc.id
    );
    const transferReceived = accTransfersReceived.reduce((sum, t) => sum + t.amount, 0);

    // 4. Internal transfer SENT to other banks
    const accTransfersSent = monthTransactions.filter(
      (t) =>
        t.type === 'transfer' &&
        t.accountId === acc.id &&
        t.toAccountId !== 'saving' &&
        !t.tags?.includes('saving')
    );
    const transferSent = accTransfersSent.reduce((sum, t) => sum + t.amount, 0);

    // 5. Transfer SENT to Savings
    const accSavingsSent = monthTransactions.filter(
      (t) =>
        t.type === 'transfer' &&
        t.accountId === acc.id &&
        (t.toAccountId === 'saving' || t.tags?.includes('saving'))
    );
    const savingsSent = accSavingsSent.reduce((sum, t) => sum + t.amount, 0);

    // Net cash flow change for this specific account this month
    const netChange =
      realIncome + transferReceived - (realExpense + transferSent + savingsSent);

    return {
      account: acc,
      initialBalance: acc.initialBalance || 0,
      currentBalance: acc.balance,
      realIncome,
      realExpense,
      transferReceived,
      transferSent,
      savingsSent,
      netChange,
      incomeCount: accRealIncomes.length,
      expenseCount: accRealExpenses.length,
      receivedCount: accTransfersReceived.length,
      sentCount: accTransfersSent.length,
      savingsCount: accSavingsSent.length,
    };
  });

  // All savings transfers of the month across all accounts
  const allMonthSavings = monthTransactions.filter(
    (t) => t.type === 'transfer' && (t.toAccountId === 'saving' || t.tags?.includes('saving'))
  );

  // All bank-to-bank transfers of the month
  const allBankTransfers = monthTransactions.filter(
    (t) => t.type === 'transfer' && t.toAccountId !== 'saving' && !t.tags?.includes('saving')
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden mb-6">
      {/* ========================================================================= */}
      {/* 1. REPORT HEADER & NAVIGATION                                             */}
      {/* ========================================================================= */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                BẢNG BÁO CÁO TỔNG HỢP TÀI CHÍNH & DÒNG TIỀN
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#bde0fe] text-sky-950 border border-sky-300">
                Tháng {monthNum}/{currentYear}
              </span>
            </div>
            <p className="text-xs text-sky-200/80 mt-0.5">
              Phân tách rõ Thu nhập thực tế từ ngoài vào & Luân chuyển tiền giữa các tài khoản
            </p>
          </div>
        </div>

        {/* Tab switchers in Report */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveReportTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeReportTab === 'all'
                ? 'bg-sky-400 text-slate-950 shadow-xs'
                : 'bg-white/10 hover:bg-white/20 text-sky-100'
            }`}
          >
            Tổng Hợp Ngân Hàng
          </button>

          <button
            onClick={() => setActiveReportTab('savings')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 'savings'
                ? 'bg-emerald-400 text-slate-950 shadow-xs'
                : 'bg-white/10 hover:bg-white/20 text-sky-100'
            }`}
          >
            <PiggyBank className="w-3.5 h-3.5" />
            <span>Mục Tiết Kiệm ({allMonthSavings.length})</span>
          </button>

          <button
            onClick={() => setActiveReportTab('transfers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 'transfers'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'bg-white/10 hover:bg-white/20 text-sky-100'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Chuyển Liên NH ({allBankTransfers.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DẢI CHỈ SỐ BÁO CÁO CỐT LÕI (KEY FINANCIAL METRICS BAR)                  */}
      {/* ĐÃ FIX: Tổng Thu chỉ tính nguồn tiền thực tế từ bên ngoài vào              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-slate-100 bg-slate-50/80 border-b border-slate-200/80 text-xs">
        {/* Metric 1: Tổng Thu Thực Tế (Không bị tăng do chuyển tiền nội bộ) */}
        <div className="p-3.5">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px] mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Tổng Thu (Từ bên ngoài)
          </div>
          <div className="text-base font-black text-emerald-600 tracking-tight">
            +{formatCurrency(realExternalInflow)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            <span>Lương, thưởng & nguồn ngoài</span>
          </div>
        </div>

        {/* Metric 2: Tổng Chi Thực Tế (Không tính chuyển khoản nội bộ) */}
        <div className="p-3.5">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px] mb-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Tổng Chi (Tiêu ra ngoài)
          </div>
          <div className="text-base font-black text-rose-600 tracking-tight">
            -{formatCurrency(realExternalOutflow)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Chi tiêu sinh hoạt, hóa đơn
          </div>
        </div>

        {/* Metric 3: Mục Tiết Kiệm */}
        <div className="p-3.5 bg-emerald-50/40">
          <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] mb-1">
            <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
            Mục Tiết Kiệm
          </div>
          <div className="text-base font-black text-emerald-700 tracking-tight">
            +{formatCurrency(grandTotalSavings)}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
            {allMonthSavings.length} khoản trích tích lũy
          </div>
        </div>

        {/* Metric 4: Chuyển Liên Ngân Hàng (Luân chuyển nội bộ) */}
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

        {/* Metric 5: Thu Chi Ròng Thực Tế */}
        <div className="p-3.5">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px] mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            Thu Chi Ròng Thực Tế
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

        {/* Metric 6: Tổng Số Dư Khả Dụng */}
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
      {/* 3. REPORT CONTENT: 3 VIEWS (TỔNG HỢP, MỤC TIẾT KIỆM, CHUYỂN KHOẢN)        */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5">
        {/* VIEW 1: BẢNG BÁO CÁO TỔNG HỢP THEO NGÂN HÀNG */}
        {activeReportTab === 'all' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
              <span>
                💡 Chuyển khoản nội bộ giữa các ngân hàng được hạch toán tách biệt ở 2 cột <strong>Nhận Chuyển</strong> và <strong>Chuyển Đi</strong> để không làm sai lệch Tổng Thu/Chi.
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Tài Khoản / Ngân Hàng</th>
                    <th className="py-3 px-4 text-right">Số Dư Đầu Kỳ</th>
                    <th className="py-3 px-4 text-right text-emerald-700">Thu Ngoài (+)</th>
                    <th className="py-3 px-4 text-right text-rose-700">Chi Ngoài (-)</th>
                    <th className="py-3 px-4 text-right text-teal-700">Nhận Chuyển (+)</th>
                    <th className="py-3 px-4 text-right text-blue-700">Chuyển Đi (-)</th>
                    <th className="py-3 px-4 text-right text-emerald-800">Tiết Kiệm</th>
                    <th className="py-3 px-4 text-right">Số Dư Hiện Có</th>
                    <th className="py-3 px-4 text-center">Biến Động Ròng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accountReportData.map((d) => {
                    const isSelected = selectedAccountId === d.account.id;
                    return (
                      <tr
                        key={d.account.id}
                        onClick={() => onSelectAccount(isSelected ? null : d.account.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-sky-50/70 font-semibold'
                            : 'hover:bg-slate-50/80 text-slate-700'
                        }`}
                      >
                        {/* Ngân hàng */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                              style={{ backgroundColor: d.account.color }}
                            >
                              <CategoryIcon name={d.account.iconName} className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{d.account.name}</div>
                              {d.account.accountNumber && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  STK: {d.account.accountNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Số dư đầu kỳ */}
                        <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-slate-500">
                          {formatCurrency(d.initialBalance)}
                        </td>

                        {/* Thu Nhập Thực Tế Từ Ngoài */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {d.realIncome > 0 ? (
                            <>
                              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                +{formatCurrency(d.realIncome)}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                ({d.incomeCount} khoản ngoài)
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Chi Tiêu Thực Tế Ra Ngoài */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {d.realExpense > 0 ? (
                            <>
                              <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                                -{formatCurrency(d.realExpense)}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                ({d.expenseCount} khoản chi)
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Nhận Chuyển Từ NH Khác (Nội bộ) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {d.transferReceived > 0 ? (
                            <>
                              <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                +{formatCurrency(d.transferReceived)}
                              </span>
                              <div className="text-[10px] text-teal-600 mt-0.5 font-medium">
                                ({d.receivedCount} lần nhận)
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Chuyển Đi Sang NH Khác (Nội bộ) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {d.transferSent > 0 ? (
                            <>
                              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                -{formatCurrency(d.transferSent)}
                              </span>
                              <div className="text-[10px] text-blue-600 mt-0.5 font-medium">
                                ({d.sentCount} lần chuyển)
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Mục Tiết Kiệm */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {d.savingsSent > 0 ? (
                            <>
                              <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
                                +{formatCurrency(d.savingsSent)}
                              </span>
                              <div className="text-[10px] text-emerald-600 mt-0.5">
                                ({d.savingsCount} quỹ)
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Số Dư Hiện Có */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="font-extrabold text-sm text-slate-900">
                            {formatCurrency(d.currentBalance)}
                          </span>
                        </td>

                        {/* Biến Động Dòng Tiền */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              d.netChange >= 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {d.netChange >= 0 ? (
                              <>
                                <TrendingUp className="w-3 h-3" />
                                <span>+{formatCurrency(d.netChange)}</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-3 h-3" />
                                <span>{formatCurrency(d.netChange)}</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* HÀNG TỔNG CỘNG CUỐI BẢNG */}
                  <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3 px-4 uppercase text-slate-800">
                      TỔNG CỘNG THỰC TẾ
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatCurrency(accounts.reduce((s, a) => s + (a.initialBalance || 0), 0))}
                    </td>
                    {/* Tổng Thu Ngoài: Không bị cộng dồn chuyển khoản nội bộ */}
                    <td className="py-3 px-4 text-right text-emerald-700 font-extrabold text-sm">
                      +{formatCurrency(realExternalInflow)}
                    </td>
                    {/* Tổng Chi Ngoài */}
                    <td className="py-3 px-4 text-right text-rose-700 font-extrabold text-sm">
                      -{formatCurrency(realExternalOutflow)}
                    </td>
                    {/* Tổng Nhận chuyển (Cân bằng nội bộ) */}
                    <td className="py-3 px-4 text-right text-teal-700">
                      +{formatCurrency(grandTotalBankTransfers)}
                    </td>
                    {/* Tổng Chuyển đi (Cân bằng nội bộ) */}
                    <td className="py-3 px-4 text-right text-blue-700">
                      -{formatCurrency(grandTotalBankTransfers)}
                    </td>
                    {/* Tổng Tiết kiệm */}
                    <td className="py-3 px-4 text-right text-emerald-800">
                      +{formatCurrency(grandTotalSavings)}
                    </td>
                    {/* Tổng Số Dư */}
                    <td className="py-3 px-4 text-right text-base text-slate-950 font-black">
                      {formatCurrency(grandTotalBalance)}
                    </td>
                    {/* Tỷ lệ tiết kiệm */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-extrabold text-xs text-indigo-700">
                        Thu chi ròng: +{formatCurrency(grandNetFlow)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: BÁO CÁO CHI TIẾT "MỤC TIẾT KIỆM" */}
        {activeReportTab === 'savings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <PiggyBank className="w-4 h-4 text-emerald-600" />
                  Danh Sách Khoản Tiền Đã Chuyển Vào Mục Tiết Kiệm (Tháng {monthNum})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Các khoản trích từ tài khoản ngân hàng chuyển sang tích lũy & tiết kiệm
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  Tổng tiền đã tích lũy
                </span>
                <div className="text-base font-black text-emerald-600">
                  +{formatCurrency(grandTotalSavings)}
                </div>
              </div>
            </div>

            {allMonthSavings.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                Chưa có khoản tiền nào chuyển vào Mục Tiết Kiệm trong tháng này.
                <br />
                Bạn có thể vào tab <strong>[ Chuyển ] ➔ [ Tiết kiệm ]</strong> trong bảng ngân hàng để ghi nhận ngay!
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-emerald-50/70 text-emerald-950 font-bold border-b border-emerald-100 text-[11px]">
                      <th className="py-2.5 px-4">Ngày</th>
                      <th className="py-2.5 px-4">Số Tiền Trích Vào Tiết Kiệm</th>
                      <th className="py-2.5 px-4">Tên Mục / Sổ Tiết Kiệm</th>
                      <th className="py-2.5 px-4">Trích Từ Ngân Hàng</th>
                      <th className="py-2.5 px-4">Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allMonthSavings.map((tx) => {
                      const fromAcc = accountMap.get(tx.accountId);
                      const dayNum = parseInt(tx.date.split('-')[2], 10);
                      return (
                        <tr key={tx.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                            <span className="font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[11px] mr-1.5">
                              {dayNum}
                            </span>
                            <span>{formatFriendlyDate(tx.date)}</span>
                          </td>
                          <td className="py-2.5 px-4 font-black text-emerald-600 text-sm whitespace-nowrap">
                            +{formatCurrency(tx.amount)}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{tx.description.replace('Mục Tiết kiệm: ', '')}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span
                              className="font-bold text-white px-2 py-0.5 rounded-md text-[11px]"
                              style={{ backgroundColor: fromAcc?.color || '#006533' }}
                            >
                              {fromAcc?.name || 'Ngân hàng'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 italic">
                            {tx.note || 'Trích từ tài khoản vào tiết kiệm'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: BÁO CÁO ĐIỀU CHUYỂN LIÊN NGÂN HÀNG */}
        {activeReportTab === 'transfers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                  Lịch Sử Chuyển Tiền Giữa Các Ngân Hàng (Tháng {monthNum})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Dòng tiền luân chuyển nội bộ giữa các tài khoản (Không tính vào thu nhập hay chi tiêu)
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  Tổng tiền điều chuyển nội bộ
                </span>
                <div className="text-base font-black text-blue-700">
                  {formatCurrency(grandTotalBankTransfers)}
                </div>
              </div>
            </div>

            {allBankTransfers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                Chưa có giao dịch chuyển tiền liên ngân hàng nào trong tháng này.
                <br />
                Bạn có thể vào tab <strong>[ Chuyển ] ➔ [ Ngân hàng ]</strong> trong bảng ngân hàng để chuyển nhanh!
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-blue-50/70 text-blue-950 font-bold border-b border-blue-100 text-[11px]">
                      <th className="py-2.5 px-4">Ngày</th>
                      <th className="py-2.5 px-4">Số Tiền Chuyển</th>
                      <th className="py-2.5 px-4">Từ Ngân Hàng</th>
                      <th className="py-2.5 px-4">Đến Ngân Hàng</th>
                      <th className="py-2.5 px-4">Nội Dung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allBankTransfers.map((tx) => {
                      const fromAcc = accountMap.get(tx.accountId);
                      const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : null;
                      const dayNum = parseInt(tx.date.split('-')[2], 10);
                      return (
                        <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                            <span className="font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[11px] mr-1.5">
                              {dayNum}
                            </span>
                            <span>{formatFriendlyDate(tx.date)}</span>
                          </td>
                          <td className="py-2.5 px-4 font-black text-blue-700 text-sm whitespace-nowrap">
                            {formatCurrency(tx.amount)}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              Từ: {fromAcc?.name || 'Ngân hàng gửi'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Đến: {toAcc?.name || 'Ngân hàng nhận'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-700">
                            {tx.description}
                            {tx.note && <span className="text-slate-400 italic ml-1">({tx.note})</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
