import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  X,
  Clock,
  Download,
  Upload,
  Cloud,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { Account, Category, DebtRecord, ReminderSetting, Transaction } from '../types';
import { User, signInWithGoogle, getCachedAccessToken } from '../services/firebase';
import { uploadBackupToGoogleDrive } from '../services/googleDriveService';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  reminders: ReminderSetting[];
  debts: DebtRecord[];
  currentMonth: string;
  currentUser: User | null;
  lastSyncedAt: string | null;
  onApplyBackupPayload: (payload: {
    accounts?: Account[];
    transactions?: Transaction[];
    categories?: Category[];
    reminders?: ReminderSetting[];
    debts?: DebtRecord[];
    currentMonth?: string;
  }) => void;
  onTriggerSaveAll?: () => Promise<void>;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  accounts,
  transactions,
  categories,
  reminders,
  debts,
  currentMonth,
  currentUser,
  lastSyncedAt,
  onApplyBackupPayload,
  onTriggerSaveAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isDriveSaving, setIsDriveSaving] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // File restore confirmation state
  const [pendingRestore, setPendingRestore] = useState<{
    fileName: string;
    exportedAt?: string;
    accountCount: number;
    transactionCount: number;
    debtCount: number;
    rawPayload: any;
  } | null>(null);

  const [restoreSuccess, setRestoreSuccess] = useState(false);

  if (!isOpen) return null;

  // Format date helper for filename
  const getFormattedNow = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  };

  // Format display timestamp like "08:33:21 02/10/2026"
  const formatDisplayTime = (isoString?: string | null) => {
    if (!isoString) {
      const localLast = localStorage.getItem('so_thuchi_last_local_save');
      if (localLast) return formatDisplayTime(localLast);
      return 'Chưa sao lưu';
    }
    try {
      const d = new Date(isoString);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    } catch {
      return isoString;
    }
  };

  // 1. Tải bản sao lưu JSON về máy tính / điện thoại
  const handleDownloadBackup = () => {
    setStatusError(null);
    try {
      const now = new Date();
      const filename = `Sao_luu_toan_bo_so_thuchi_[${getFormattedNow()}].json`;

      const payload = {
        app: 'So_Thu_Chi_Da_Ngan_Hang',
        version: '2.0',
        exportedAt: now.toISOString(),
        accounts,
        transactions,
        categories,
        reminders,
        debts,
        currentMonth,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      localStorage.setItem('so_thuchi_last_local_save', now.toISOString());
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err: any) {
      console.error('Lỗi khi tải bản sao lưu:', err);
      setStatusError('Không thể tạo file sao lưu: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  // 2. Lưu lên Google Drive
  const handleSaveToGoogleDrive = async () => {
    setStatusError(null);
    setDriveSuccess(null);

    // If not logged in, prompt Google Login first
    if (!currentUser) {
      try {
        await signInWithGoogle();
      } catch (err: any) {
        setStatusError('Vui lòng đăng nhập Google để lưu trữ trực tiếp lên Google Drive.');
        return;
      }
    }

    setIsDriveSaving(true);
    try {
      const now = new Date();
      const payload = {
        app: 'So_Thu_Chi_Da_Ngan_Hang',
        version: '2.0',
        exportedAt: now.toISOString(),
        accounts,
        transactions,
        categories,
        reminders,
        debts,
        currentMonth,
      };

      // Call Google Drive Service or fallback
      const token = getCachedAccessToken();
      if (token) {
        const result = await uploadBackupToGoogleDrive(payload, token);
        if (result && result.fileId) {
          localStorage.setItem('so_thuchi_last_local_save', now.toISOString());
          setDriveSuccess(`Đã lưu thành công tệp lên Google Drive của bạn! (${result.fileName})`);
          setTimeout(() => setDriveSuccess(null), 4000);
          return;
        }
      }

      // Fallback: trigger direct file download and notify
      handleDownloadBackup();
      setDriveSuccess('Đã tải tệp về máy, bạn có thể tải lên Google Drive của mình bất kỳ lúc nào.');
    } catch (err: any) {
      console.error('Google drive upload error:', err);
      handleDownloadBackup();
      setStatusError('Chưa cấp quyền Google Drive, đã tự động tải tệp sao lưu .json về máy cho bạn!');
    } finally {
      setIsDriveSaving(false);
    }
  };

  // 3. Xử lý khi người dùng chọn file .json để phục hồi
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Basic verification
        if (!parsed || (typeof parsed !== 'object')) {
          throw new Error('Định dạng tệp không hợp lệ.');
        }

        const accs = Array.isArray(parsed.accounts) ? parsed.accounts : [];
        const txs = Array.isArray(parsed.transactions) ? parsed.transactions : [];
        const dbs = Array.isArray(parsed.debts) ? parsed.debts : [];

        if (accs.length === 0 && txs.length === 0 && !parsed.categories) {
          throw new Error('Tệp sao lưu này không chứa dữ liệu sổ thu chi phù hợp.');
        }

        setPendingRestore({
          fileName: file.name,
          exportedAt: parsed.exportedAt,
          accountCount: accs.length,
          transactionCount: txs.length,
          debtCount: dbs.length,
          rawPayload: parsed,
        });
      } catch (err: any) {
        console.error('Lỗi đọc file backup:', err);
        setStatusError('Tệp không đúng cấu trúc (.json): ' + (err.message || 'Lỗi đọc tệp'));
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setStatusError('Không thể đọc file đã chọn.');
    };

    reader.readAsText(file);
  };

  // 4. Xác nhận phục hồi dữ liệu từ file
  const handleConfirmRestore = () => {
    if (!pendingRestore) return;

    try {
      onApplyBackupPayload(pendingRestore.rawPayload);
      setRestoreSuccess(true);
      setPendingRestore(null);
      setTimeout(() => {
        setRestoreSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Lỗi khi nạp dữ liệu:', err);
      setStatusError('Không thể phục hồi dữ liệu: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const effectiveLastTime = lastSyncedAt || localStorage.getItem('so_thuchi_last_local_save');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#0b1329] border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Sao lưu & Khôi phục toàn bộ
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Bảo vệ an toàn 100% dữ liệu khi thay máy tính, đổi trình duyệt hoặc chia sẻ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY SCROLLABLE */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Notifications */}
          {statusError && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{statusError}</span>
            </div>
          )}

          {downloadSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Đã tải thành công tệp sao lưu về máy của bạn! Hãy cất giữ cẩn thận.</span>
            </div>
          )}

          {driveSuccess && (
            <div className="p-3 bg-teal-950/40 border border-teal-500/30 rounded-xl text-xs text-teal-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
              <span>{driveSuccess}</span>
            </div>
          )}

          {restoreSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Khôi phục dữ liệu toàn bộ thành công! Sổ sách đã được cập nhật.</span>
            </div>
          )}

          {/* 3 STATS SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Tổng số tài khoản */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
              <span className="text-xs text-slate-400 font-medium">Tổng số tài khoản</span>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {accounts.length} <span className="text-xs font-normal text-slate-400">ngân hàng</span>
              </div>
            </div>

            {/* Card 2: Tổng giao dịch & ghi nợ */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
              <span className="text-xs text-slate-400 font-medium">Tổng công việc & tài liệu</span>
              <div className="text-xl font-black text-sky-400 mt-1">
                {transactions.length + debts.length} <span className="text-xs font-normal text-slate-400">hạng mục</span>
              </div>
            </div>

            {/* Card 3: Sao lưu gần nhất */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Sao lưu gần nhất</span>
              </span>
              <div className="text-xs sm:text-sm font-black text-amber-400 mt-1.5 truncate">
                {formatDisplayTime(effectiveLastTime)}
              </div>
            </div>
          </div>

          {/* SECTION 1: TẠO & TẢI BẢN SAO LƯU TOÀN BỘ (.JSON) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  1. Tạo & Tải bản sao lưu toàn bộ (.json)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Hệ thống sẽ gom toàn bộ danh sách tài khoản, biểu chi tiết, tài liệu đính kèm, nơi lưu trữ, công việc thành 1 tệp tin duy nhất <strong className="text-white font-bold">ghi rõ ngày, giờ sao lưu</strong>.
                </p>
              </div>
            </div>

            {/* Tên file tự động gắn ngày giờ */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Tên file tự động gắn ngày giờ:</span>
              <span className="text-emerald-400 font-mono text-[11px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20 truncate">
                Sao_luu_toan_bo_so_thuchi_[{getFormattedNow()}].json
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleSaveToGoogleDrive}
                disabled={isDriveSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700/80 text-teal-300 border border-teal-500/30 hover:border-teal-400 transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDriveSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                    <span>Đang tải lên Drive...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 text-teal-400" />
                    <span>Lưu lên Google Drive</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadBackup}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-2 shadow-xs hover:shadow-md cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Tải bản sao lưu này</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: KHÔI PHỤC LẠI TOÀN BỘ TỪ BẢN SAO LƯU */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-950/70 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  2. Khôi phục lại toàn bộ từ bản sao lưu
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Khi bạn chuyển sang máy tính mới, cài lại máy hoặc muốn hồi phục dữ liệu, hãy chọn tệp backup <strong className="text-sky-300 font-mono">.json</strong> đã lưu trước đó.
                </p>
              </div>
            </div>

            {/* Restore File Picker & Note */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-xs text-slate-400">
                Hệ thống sẽ hiển thị chi tiết thời gian sao lưu trước khi bạn quyết định nạp
              </span>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md cursor-pointer shrink-0 active:scale-98"
              >
                <Upload className="w-4 h-4" />
                <span>Chọn file sao lưu (.json) để phục hồi</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* PREVIEW DIALOG BEFORE ACTUAL RESTORE */}
            {pendingRestore && (
              <div className="mt-3 p-4 bg-slate-950/90 border-2 border-sky-500/40 rounded-xl space-y-3 animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                  <FileCheck className="w-4 h-4" />
                  <span>Xác nhận tệp sao lưu: {pendingRestore.fileName}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Thời gian sao lưu:</span>
                    <span className="font-bold text-amber-400">
                      {formatDisplayTime(pendingRestore.exportedAt)}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Tài khoản:</span>
                    <span className="font-bold text-emerald-400">
                      {pendingRestore.accountCount} ngân hàng
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Giao dịch:</span>
                    <span className="font-bold text-sky-400">
                      {pendingRestore.transactionCount} giao dịch
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Sổ ghi nợ:</span>
                    <span className="font-bold text-indigo-400">
                      {pendingRestore.debtCount} khoản nợ
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPendingRestore(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className="px-4 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Xác nhận nạp toàn bộ dữ liệu này</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/60 border-t border-slate-800">
          <p className="text-[11px] text-slate-400">
            Mẹo: Hãy lưu file backup vào Google Drive, USB hoặc gửi vào Email của bạn để không bao giờ bị mất dữ liệu.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors shrink-0"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
