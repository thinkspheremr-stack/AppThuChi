import React, { useState } from 'react';
import { Account, Category, Transaction } from '../types';
import { YearlyFinancialReportTable } from './YearlyFinancialReportTable';
import { FinancialReportTable } from './FinancialReportTable';
import { MonthlyCharts } from './MonthlyCharts';
import { CategoryTimelineReport } from './CategoryTimelineReport';
import { Calendar, BarChart3, Layers, CalendarDays, ArrowRight, PieChart } from 'lucide-react';

interface GeneralReportSheetProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  currentMonth: string; // YYYY-MM
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string | null) => void;
  onChangeMonth: (month: string) => void;
  onOpenTransfer?: () => void;
  onOpenSalaryAllocation?: () => void;
  onOpenCategoryManager?: () => void;
}

export const GeneralReportSheet: React.FC<GeneralReportSheetProps> = ({
  accounts,
  transactions,
  categories,
  currentMonth,
  selectedAccountId,
  onSelectAccount,
  onChangeMonth,
  onOpenTransfer,
  onOpenSalaryAllocation,
  onOpenCategoryManager,
}) => {
  const [activeView, setActiveView] = useState<'all' | 'year' | 'month' | 'charts' | 'category'>('all');
  const [yearStr, monthStr] = currentMonth.split('-');

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* SHEET HEADER & 4-TABLE NAVIGATION BAR                                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-900 text-sky-300 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              BẢNG TỔNG HỢP TÀI CHÍNH & BIỂU ĐỒ DÒNG TIỀN
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bao gồm 4 phần tổng hợp: <strong>1. Năm {yearStr}</strong> • <strong>2. Tháng {monthStr}/{yearStr}</strong> • <strong>3. Biểu Đồ</strong> • <strong>4. Báo Cáo Danh Mục</strong>
          </p>
        </div>

        {/* 4-Section Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveView('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'all'
                ? 'bg-white text-slate-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất Cả Bảng
          </button>

          <button
            type="button"
            onClick={() => setActiveView('year')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'year'
                ? 'bg-sky-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Năm {yearStr}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'month'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>2. Tháng {monthStr}/{yearStr}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('charts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'charts'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>3. Biểu Đồ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('category')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'category'
                ? 'bg-amber-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>4. Báo Cáo Danh Mục</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. BẢNG BÁO CÁO TỔNG HỢP TÀI CHÍNH & DÒNG TIỀN THEO NĂM                   */}
      {/* ========================================================================= */}
      {(activeView === 'all' || activeView === 'year') && (
        <section id="section-year" className="scroll-mt-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-6 h-6 rounded-lg bg-sky-600 text-white text-xs font-black flex items-center justify-center">
              1
            </span>
            <span className="text-xs font-black text-sky-950 uppercase tracking-wider">
              Bảng Báo Cáo Tổng Hợp Tài Chính & Dòng Tiền - Theo Năm
            </span>
          </div>
          <YearlyFinancialReportTable
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            currentMonth={currentMonth}
            onSelectMonth={onChangeMonth}
            onOpenTransfer={onOpenTransfer}
            onOpenSalaryAllocation={onOpenSalaryAllocation}
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. BẢNG BÁO CÁO TỔNG HỢP TÀI CHÍNH & DÒNG TIỀN THEO THÁNG (CHUẨN ẢNH 1)  */}
      {/* ========================================================================= */}
      {(activeView === 'all' || activeView === 'month') && (
        <section id="section-month" className="scroll-mt-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
              2
            </span>
            <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
              Bảng Báo Cáo Tổng Hợp Tài Chính & Dòng Tiền - Theo Tháng {monthStr}/{yearStr}
            </span>
          </div>
          <FinancialReportTable
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            currentMonth={currentMonth}
            selectedAccountId={selectedAccountId}
            onSelectAccount={onSelectAccount}
            onOpenTransfer={onOpenTransfer}
            onOpenSalaryAllocation={onOpenSalaryAllocation}
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. BÁO CÁO & BIỂU ĐỒ THÁNG (CHUẨN ẢNH 2)                                  */}
      {/* ========================================================================= */}
      {(activeView === 'all' || activeView === 'charts') && (
        <section id="section-charts" className="scroll-mt-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
              3
            </span>
            <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">
              Báo Cáo & Biểu Đồ Phân Tích Tháng {monthStr}/{yearStr}
            </span>
          </div>
          <MonthlyCharts
            currentMonth={currentMonth}
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            selectedAccountId={selectedAccountId}
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. BÁO CÁO THEO DANH MỤC VỚI 1 HOẶC NHIỀU NGÂN HÀNG & THEO THỜI GIAN       */}
      {/* ========================================================================= */}
      {(activeView === 'all' || activeView === 'category') && (
        <section id="section-category" className="scroll-mt-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-6 h-6 rounded-lg bg-amber-600 text-white text-xs font-black flex items-center justify-center">
              4
            </span>
            <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
              Báo Cáo Theo Danh Mục - 1 Hoặc Nhiều Ngân Hàng & Theo Dòng Thời Gian
            </span>
          </div>
          <CategoryTimelineReport
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            currentMonth={currentMonth}
            onSelectAccount={onSelectAccount}
            onOpenCategoryManager={onOpenCategoryManager}
          />
        </section>
      )}
    </div>
  );
};
