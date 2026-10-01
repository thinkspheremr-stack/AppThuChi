import React, { useState } from 'react';
import { Account, Category, Transaction } from '../types';
import { formatCurrency, formatMonthYear, getDaysInMonth } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import {
  PieChart as PieIcon,
  BarChart3,
  Landmark,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Info,
  Calendar,
} from 'lucide-react';

interface MonthlyChartsProps {
  currentMonth: string; // YYYY-MM
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  selectedAccountId: string | null;
}

export const MonthlyCharts: React.FC<MonthlyChartsProps> = ({
  currentMonth,
  transactions,
  accounts,
  categories,
  selectedAccountId,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'bank_breakdown' | 'category' | 'daily'>('overview');
  const [hoveredBar, setHoveredBar] = useState<{ day: number; expense: number; income: number } | null>(null);

  // Filter transactions for current month
  const monthTransactions = transactions.filter((t) => {
    const isThisMonth = t.date.startsWith(currentMonth);
    if (!isThisMonth) return false;
    if (selectedAccountId) {
      return t.accountId === selectedAccountId || (t.type === 'transfer' && t.toAccountId === selectedAccountId);
    }
    return true;
  });

  const expenseTransactions = monthTransactions.filter((t) => t.type === 'expense');
  const incomeTransactions = monthTransactions.filter((t) => t.type === 'income');

  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Previous month comparison
  const [yearStr, monthStr] = currentMonth.split('-');
  const currYear = parseInt(yearStr, 10);
  const currMonth = parseInt(monthStr, 10);
  const prevDate = new Date(currYear, currMonth - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  
  const prevMonthExpenses = transactions
    .filter((t) => t.date.startsWith(prevMonthStr) && t.type === 'expense' && (!selectedAccountId || t.accountId === selectedAccountId))
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseChangePercent = prevMonthExpenses > 0 
    ? ((totalExpense - prevMonthExpenses) / prevMonthExpenses) * 100 
    : 0;

  // --- Breakdown by Bank / Account ---
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const bankBreakdown = accounts
    .map((acc) => {
      const accExpenses = expenseTransactions.filter((t) => t.accountId === acc.id);
      const spent = accExpenses.reduce((sum, t) => sum + t.amount, 0);
      const percent = totalExpense > 0 ? (spent / totalExpense) * 100 : 0;
      const txCount = accExpenses.length;

      // Find top expense category for this bank
      const catCount: Record<string, number> = {};
      for (const tx of accExpenses) {
        if (tx.categoryId) {
          catCount[tx.categoryId] = (catCount[tx.categoryId] || 0) + tx.amount;
        }
      }
      let topCatId: string | null = null;
      let topCatAmount = 0;
      for (const [catId, amt] of Object.entries(catCount)) {
        if (amt > topCatAmount) {
          topCatAmount = amt;
          topCatId = catId;
        }
      }

      return {
        account: acc,
        spent,
        percent,
        txCount,
        topCategory: topCatId ? categoryMap.get(topCatId) : null,
        topCatAmount,
      };
    })
    .filter((b) => b.spent > 0 || !selectedAccountId)
    .sort((a, b) => b.spent - a.spent);

  // --- Breakdown by Category ---
  const categoryBreakdown = categories
    .filter((c) => c.type === 'expense')
    .map((cat) => {
      const catExpenses = expenseTransactions.filter((t) => t.categoryId === cat.id);
      const spent = catExpenses.reduce((sum, t) => sum + t.amount, 0);
      const percent = totalExpense > 0 ? (spent / totalExpense) * 100 : 0;
      return {
        category: cat,
        spent,
        percent,
        count: catExpenses.length,
      };
    })
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  // --- Daily Breakdown for Bar Chart ---
  const daysInMonth = getDaysInMonth(currYear, currMonth);
  const dailyData: { day: number; expense: number; income: number; dateStr: string }[] = [];
  let maxDailyAmount = 100000; // minimum floor

  for (let d = 1; d <= daysInMonth; d++) {
    const padD = String(d).padStart(2, '0');
    const dateStr = `${currentMonth}-${padD}`;
    const dayExp = expenseTransactions.filter((t) => t.date === dateStr).reduce((s, t) => s + t.amount, 0);
    const dayInc = incomeTransactions.filter((t) => t.date === dateStr).reduce((s, t) => s + t.amount, 0);

    dailyData.push({ day: d, expense: dayExp, income: dayInc, dateStr });
    if (dayExp > maxDailyAmount) maxDailyAmount = dayExp;
    if (dayInc > maxDailyAmount) maxDailyAmount = dayInc;
  }

  // Generate SVG Donut Segments helper
  const renderDonutChart = (items: { label: string; value: number; color: string }[], centerLabel: string, centerValue: string) => {
    const total = items.reduce((s, i) => s + i.value, 0);
    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <PieIcon className="w-12 h-12 mb-2 stroke-1 text-slate-300" />
          <p className="text-sm">Chưa có giao dịch chi tiêu trong tháng này</p>
        </div>
      );
    }

    const size = 200;
    const strokeWidth = 28;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
        <div className="relative w-48 h-48 shrink-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
            {items.map((item, idx) => {
              const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedAngle;
              accumulatedAngle += (item.value / total) * circumference;

              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 hover:opacity-85"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{centerLabel}</span>
            <span className="text-sm font-bold text-slate-800 line-clamp-1">{centerValue}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full max-w-xs space-y-2">
          {items.slice(0, 6).map((item, idx) => {
            const percent = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 truncate font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-500 font-semibold">{percent}%</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(item.value)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 mb-6">
      {/* Header & View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800">
              Báo Cáo & Biểu Đồ {formatMonthYear(currentMonth)}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp dữ liệu chi tiêu phân tách theo từng ngân hàng & ví điện tử
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tổng Quan
          </button>
          <button
            onClick={() => setActiveTab('bank_breakdown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'bank_breakdown'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            Theo Ngân Hàng
          </button>
          <button
            onClick={() => setActiveTab('category')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'category'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            Theo Danh Mục
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'daily'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Theo Ngày
          </button>
        </div>
      </div>

      {/* Quick Summary Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[11px] font-medium text-slate-500">Tổng thu nhập</div>
          <div className="text-base font-bold text-emerald-600 mt-0.5">{formatCurrency(totalIncome)}</div>
          <div className="text-[10px] text-slate-400 mt-1">{incomeTransactions.length} khoản thu</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[11px] font-medium text-slate-500">Tổng chi tiêu</div>
          <div className="text-base font-bold text-rose-600 mt-0.5">{formatCurrency(totalExpense)}</div>
          <div className="flex items-center gap-1 text-[10px] mt-1">
            {expenseChangePercent > 0 ? (
              <span className="text-rose-600 flex items-center font-semibold">
                <ArrowUpRight className="w-3 h-3" /> +{expenseChangePercent.toFixed(0)}% so với tháng trước
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center font-semibold">
                <ArrowDownRight className="w-3 h-3" /> {expenseChangePercent.toFixed(0)}% so với tháng trước
              </span>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[11px] font-medium text-slate-500">Tiết kiệm ròng</div>
          <div className={`text-base font-bold mt-0.5 ${netBalance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
            {formatCurrency(netBalance)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Tỷ lệ tích lũy: {totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="text-[11px] font-medium text-slate-500">Nguồn chi nhiều nhất</div>
          <div className="text-sm font-bold text-slate-800 mt-0.5 truncate">
            {bankBreakdown[0] ? bankBreakdown[0].account.name : 'Chưa có'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {bankBreakdown[0] ? `${bankBreakdown[0].percent.toFixed(1)}% tổng chi` : '0%'}
          </div>
        </div>
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart: By Bank / Wallet */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-emerald-600" />
                  Chi Tiêu Theo Ngân Hàng & Ví Điện Tử
                </h3>
                <span className="text-[11px] text-slate-400">Tỷ lệ %</span>
              </div>
              {renderDonutChart(
                bankBreakdown.map((b) => ({
                  label: b.account.name,
                  value: b.spent,
                  color: b.account.color,
                })),
                'Tổng Chi',
                formatCurrency(totalExpense)
              )}
            </div>

            {/* Donut Chart: By Category */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-indigo-600" />
                  Chi Tiêu Theo Danh Mục
                </h3>
                <span className="text-[11px] text-slate-400">Top phân loại</span>
              </div>
              {renderDonutChart(
                categoryBreakdown.map((c) => ({
                  label: c.category.name,
                  value: c.spent,
                  color: c.category.color,
                })),
                'Danh Mục',
                `${categoryBreakdown.length} mục`
              )}
            </div>
          </div>

          {/* Daily Trend Mini Preview */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Biểu Đồ Chi Tiêu Theo Từng Ngày Trong Tháng
              </h3>
              <button
                onClick={() => setActiveTab('daily')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Xem chi tiết →
              </button>
            </div>
            
            {/* Daily Bars Mini */}
            <div className="h-32 flex items-end gap-1 pt-6 px-1">
              {dailyData.map((d) => {
                const heightPercent = maxDailyAmount > 0 ? (d.expense / maxDailyAmount) * 100 : 0;
                return (
                  <div
                    key={d.day}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                    onMouseEnter={() => setHoveredBar(d)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <div
                      className={`w-full rounded-t transition-all duration-150 ${
                        d.expense > 0 ? 'bg-rose-400 hover:bg-rose-600' : 'bg-slate-200/50'
                      }`}
                      style={{ height: `${Math.max(4, heightPercent)}%` }}
                    />
                    <span className="text-[9px] text-slate-400 mt-1 scale-90">
                      {d.day % 5 === 0 || d.day === 1 ? d.day : ''}
                    </span>
                  </div>
                );
              })}
            </div>
            {hoveredBar && (
              <div className="mt-2 text-center text-xs font-medium text-slate-700 bg-white py-1 px-3 rounded-lg border border-slate-200 inline-block">
                Ngày {hoveredBar.day}/{monthStr}: Chi {formatCurrency(hoveredBar.expense)}
                {hoveredBar.income > 0 && ` | Thu ${formatCurrency(hoveredBar.income)}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: BANK BREAKDOWN (Chi Tiết Từng Ngân Hàng & Ví Điện Tử) */}
      {activeTab === 'bank_breakdown' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong>Chi tiết tổng hợp theo nguồn tiền:</strong> Giúp bạn nắm rõ mỗi ngân hàng hoặc ví điện tử (Vietcombank, Techcombank, MoMo, Tiền mặt...) được dùng cho mục đích gì và tài khoản nào đang bị bào mòn nhanh nhất.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Tài khoản / Ngân hàng</th>
                  <th className="py-3 px-3">Số dư hiện có</th>
                  <th className="py-3 px-3">Tổng chi tháng</th>
                  <th className="py-3 px-3">Tỷ lệ % chi</th>
                  <th className="py-3 px-3">Số lượt chi</th>
                  <th className="py-3 px-3">Chi nhiều nhất cho mục</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bankBreakdown.map((item) => (
                  <tr key={item.account.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Bank Name */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: item.account.color }}
                        >
                          <CategoryIcon name={item.account.iconName} className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{item.account.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {item.account.type === 'bank' ? 'Ngân hàng' : item.account.type === 'wallet' ? 'Ví điện tử' : 'Tiền mặt'}
                            {item.account.accountNumber ? ` • ${item.account.accountNumber}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {formatCurrency(item.account.balance)}
                    </td>

                    {/* Spent */}
                    <td className="py-3 px-3 font-bold text-rose-600">
                      {formatCurrency(item.spent)}
                    </td>

                    {/* Percent */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, item.percent))}%`,
                              backgroundColor: item.account.color,
                            }}
                          />
                        </div>
                        <span className="font-semibold text-slate-700">{item.percent.toFixed(1)}%</span>
                      </div>
                    </td>

                    {/* Tx count */}
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {item.txCount} giao dịch
                    </td>

                    {/* Top Category */}
                    <td className="py-3 px-3">
                      {item.topCategory ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 text-[10px]"
                            style={{ backgroundColor: item.topCategory.color }}
                          >
                            <CategoryIcon name={item.topCategory.icon} className="w-3 h-3" />
                          </span>
                          <span className="text-slate-800 font-medium">{item.topCategory.name}</span>
                          <span className="text-slate-400">({formatCurrency(item.topCatAmount)})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Không có chi tiêu</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: CATEGORY BREAKDOWN */}
      {activeTab === 'category' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryBreakdown.map((item) => (
              <div
                key={item.category.id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: item.category.color }}
                  >
                    <CategoryIcon name={item.category.icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800">{item.category.name}</h4>
                    <p className="text-[11px] text-slate-400">{item.count} giao dịch</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-rose-600">{formatCurrency(item.spent)}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{item.percent.toFixed(1)}% tổng chi</div>
                </div>
              </div>
            ))}
          </div>

          {categoryBreakdown.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              Chưa có chi tiêu danh mục nào trong tháng này
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: DAILY FULL BAR CHART */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Chi tiết chi tiêu & thu nhập từng ngày từ ngày 1 đến {daysInMonth}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Khoản chi
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Khoản thu
              </span>
            </div>
          </div>

          <div className="h-64 flex items-end gap-1.5 pt-6 pb-2 px-2 border-b border-slate-200">
            {dailyData.map((d) => {
              const expH = maxDailyAmount > 0 ? (d.expense / maxDailyAmount) * 100 : 0;
              const incH = maxDailyAmount > 0 ? (d.income / maxDailyAmount) * 100 : 0;

              return (
                <div
                  key={d.day}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  onMouseEnter={() => setHoveredBar(d)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <div className="w-full flex items-end justify-center gap-0.5 h-full">
                    {/* Expense bar */}
                    <div
                      className={`w-full rounded-t transition-all ${
                        d.expense > 0 ? 'bg-rose-500 group-hover:bg-rose-600' : 'bg-slate-100'
                      }`}
                      style={{ height: `${Math.max(2, expH)}%` }}
                    />
                    {/* Income bar */}
                    {d.income > 0 && (
                      <div
                        className="w-full rounded-t bg-emerald-500 group-hover:bg-emerald-600 transition-all"
                        style={{ height: `${Math.max(2, incH)}%` }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1.5 font-medium">{d.day}</span>
                </div>
              );
            })}
          </div>

          {hoveredBar ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800">
                  Ngày {hoveredBar.day}/{monthStr}/{yearStr}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-rose-600 font-bold">
                  Chi: {formatCurrency(hoveredBar.expense)}
                </span>
                <span className="text-emerald-600 font-bold">
                  Thu: {formatCurrency(hoveredBar.income)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-[11px] text-slate-400 italic">
              Rê chuột vào cột của từng ngày để xem chi tiết
            </div>
          )}
        </div>
      )}
    </div>
  );
};
