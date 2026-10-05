import React, { useState } from 'react';
import { User } from '../services/firebase';
import { formatMonthYear } from '../utils/formatters';
import {
  Wallet,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Bell,
  Plus,
  Download,
  Upload,
  RefreshCw,
  MoreVertical,
  Flame,
  CloudCheck,
  Cloud,
  Save,
  Check,
  ShieldCheck,
  Tag,
} from 'lucide-react';

interface NavbarProps {
  currentMonth: string; // YYYY-MM
  currentUser: User | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  isSaving?: boolean;
  saveSuccess?: boolean;
  isAutoSaving?: boolean;
  lastAutoSavedAt?: string | null;
  onManualSave?: () => void;
  onOpenBackupModal: () => void;
  onOpenCategoryModal?: () => void;
  onChangeMonth: (month: string) => void;
  onOpenAddModal: (type?: 'expense' | 'income' | 'transfer') => void;
  onOpenReminderModal: () => void;
  onOpenAuthModal: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCSV: () => void;
  onResetData: () => void;
  streak: number;
  loggedToday: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMonth,
  currentUser,
  lastSyncedAt,
  isSyncing,
  isSaving,
  saveSuccess,
  isAutoSaving,
  lastAutoSavedAt,
  onManualSave,
  onOpenBackupModal,
  onOpenCategoryModal,
  onChangeMonth,
  onOpenAddModal,
  onOpenReminderModal,
  onOpenAuthModal,
  onExportJSON,
  onImportJSON,
  onExportCSV,
  onResetData,
  streak,
  loggedToday,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Parse current month
  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 2, 1);
    const newY = prev.getFullYear();
    const newM = String(prev.getMonth() + 1).padStart(2, '0');
    onChangeMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const next = new Date(year, month, 1);
    const newY = next.getFullYear();
    const newM = String(next.getMonth() + 1).padStart(2, '0');
    onChangeMonth(`${newY}-${newM}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const newY = now.getFullYear();
    const newM = String(now.getMonth() + 1).padStart(2, '0');
    onChangeMonth(`${newY}-${newM}`);
  };

  const isCurrentMonthNow = () => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return currentMonth === nowStr;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Sổ Thu Chi
                </h1>
                <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                  Đa Ngân Hàng
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Quản lý chi tiêu & số dư tài khoản
              </p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center bg-slate-100/90 rounded-xl p-1 border border-slate-200/60 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 px-2.5 text-xs font-bold text-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatMonthYear(currentMonth)}</span>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isCurrentMonthNow() && (
              <button
                onClick={handleCurrentMonth}
                className="text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-md ml-1 transition-colors"
                title="Quay về tháng hiện tại"
              >
                Hôm nay
              </button>
            )}
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* 1. NÚT SAO LƯU & PHỤC HỒI (THEO ĐÚNG ẢNH USER) */}
            <button
              type="button"
              onClick={onOpenBackupModal}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs border border-teal-500/50 bg-[#0d1627] hover:bg-[#132238] text-teal-300 hover:text-teal-200 shadow-xs hover:border-teal-400 transition-all cursor-pointer active:scale-98"
              title="Mở bảng Sao lưu & Khôi phục toàn bộ (.json, Google Drive)"
            >
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Sao lưu & Phục hồi</span>
            </button>

            {/* 2. NÚT LƯU BIỂU CHI TIẾT (THEO ĐÚNG ẢNH USER) */}
            {onManualSave && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onManualSave}
                  disabled={isSaving || isAutoSaving}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-xl font-black text-xs shadow-xs transition-all cursor-pointer ${
                    saveSuccess
                      ? 'bg-emerald-600 text-white shadow-emerald-500/30 ring-2 ring-emerald-300 scale-102'
                      : isSaving || isAutoSaving
                      ? 'bg-amber-500 text-white animate-pulse cursor-wait'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:shadow-md hover:scale-102 active:scale-98'
                  }`}
                  title="Lưu tất cả dữ liệu vào máy & đồng bộ ngay lập tức"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Đã Lưu!</span>
                    </>
                  ) : isSaving || isAutoSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isAutoSaving ? 'Tự động lưu...' : 'Đang lưu...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Lưu biểu chi tiết</span>
                    </>
                  )}
                </button>

                {/* Tag trạng thái Tự động lưu 1 phút */}
                <div
                  className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 border border-emerald-200/90 text-[11px] font-semibold text-emerald-800"
                  title="Hệ thống tự động lưu biểu chi tiết định kỳ mỗi 1 phút"
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${
                        isAutoSaving ? 'animate-ping opacity-100' : 'opacity-60'
                      }`}
                    ></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <span>
                    {isAutoSaving
                      ? 'Đang lưu...'
                      : lastAutoSavedAt
                      ? `Tự lưu: ${lastAutoSavedAt}`
                      : 'Tự động lưu: 1p'}
                  </span>
                </div>
              </div>
            )}

            {/* Google Account & Cloud Sync button */}
            <button
              onClick={onOpenAuthModal}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                currentUser
                  ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title={currentUser ? `Đang đăng nhập: ${currentUser.email}` : 'Đăng nhập Gmail để sao lưu đám mây'}
            >
              {currentUser ? (
                <>
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Avatar"
                      className="w-5 h-5 rounded-full border border-emerald-300"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      {currentUser.displayName ? currentUser.displayName[0] : 'G'}
                    </div>
                  )}
                  <span className="hidden md:inline max-w-[100px] truncate">
                    {currentUser.displayName?.split(' ')[0] || 'Tài khoản'}
                  </span>
                  <CloudCheck className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Gmail Sao lưu</span>
                  <Cloud className="w-3.5 h-3.5 text-slate-400" />
                </>
              )}
            </button>

            {/* Quản Lý Danh Mục (Sửa, thêm, bớt) Button */}
            {onOpenCategoryModal && (
              <button
                type="button"
                onClick={onOpenCategoryModal}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Quản lý danh mục: Sửa tên, màu, thêm hoặc bớt danh mục"
              >
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>Danh Mục</span>
              </button>
            )}

            {/* Streak & Reminder Bell */}
            <button
              onClick={onOpenReminderModal}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              title="Cài đặt nhắc nhở chi tiêu"
            >
              <Bell className="w-4 h-4 text-amber-500" />
              <div className="flex items-center gap-1 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>{streak}d</span>
              </div>
              {!loggedToday && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
              )}
              {!loggedToday && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full" />
              )}
            </button>

            {/* Primary Add Transaction Button */}
            <button
              onClick={() => onOpenAddModal('expense')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ghi Chép Mới</span>
              <span className="sm:hidden">Ghi chép</span>
            </button>

            {/* More Options Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                title="Tùy chọn khác"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs font-medium text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenAuthModal();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Cloud className="w-4 h-4 text-emerald-600" />
                      {currentUser ? 'Quản lý sao lưu Gmail' : 'Đăng nhập Gmail sao lưu'}
                    </button>

                    {onOpenCategoryModal && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenCategoryModal();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-800 font-bold"
                      >
                        <Tag className="w-4 h-4 text-amber-500" />
                        Quản lý danh mục (Sửa/Thêm/Bớt)
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onExportCSV();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      Xuất dữ liệu Excel / CSV
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onExportJSON();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                      Sao lưu dữ liệu (JSON)
                    </button>

                    <label className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4 text-purple-600" />
                      Khôi phục từ file JSON
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          setIsMenuOpen(false);
                          onImportJSON(e);
                        }}
                        className="hidden"
                      />
                    </label>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (confirm('Khôi phục lại dữ liệu mẫu ban đầu? Toàn bộ giao dịch tùy chỉnh sẽ bị đặt lại.')) {
                          onResetData();
                        }
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Đặt lại dữ liệu mẫu
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

