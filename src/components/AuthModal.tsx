import React, { useState } from 'react';
import { User, signInWithPopup, signOut, googleProvider, auth } from '../services/firebase';
import {
  Cloud,
  CloudCheck,
  CloudUpload,
  CloudDownload,
  LogOut,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Mail,
  ShieldCheck,
  Laptop,
  Smartphone,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  onBackupNow: () => Promise<void>;
  onRestoreFromCloud: () => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lastSyncedAt,
  isSyncing,
  onBackupNow,
  onRestoreFromCloud,
}) => {
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setSuccessMsg('Đăng nhập tài khoản Google thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      console.error(err);
      setAuthError('Đăng nhập thất bại. Vui lòng thử lại!');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSuccessMsg('Đã đăng xuất tài khoản Google.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleManualBackup = async () => {
    try {
      await onBackupNow();
      setSuccessMsg('Đã sao lưu toàn bộ dữ liệu lên đám mây thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setAuthError('Sao lưu không thành công, vui lòng kiểm tra kết nối mạng!');
    }
  };

  const handleManualRestore = async () => {
    if (confirm('Khôi phục từ đám mây sẽ ghi đè dữ liệu hiện tại bằng bản sao lưu trên đám mây. Bạn có chắc chắn muốn khôi phục?')) {
      try {
        await onRestoreFromCloud();
        setSuccessMsg('Đã tải và khôi phục dữ liệu từ đám mây thành công!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err) {
        setAuthError('Khôi phục thất bại hoặc chưa có bản sao lưu trên đám mây!');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">Tài Khoản Gmail & Sao Lưu</h3>
              <p className="text-[11px] text-slate-400">Đồng bộ dữ liệu trên mọi thiết bị qua Google</p>
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
        <div className="p-6 space-y-5">
          {/* Notification Messages */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* User Status Card */}
          {currentUser ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Avatar'}
                      className="w-11 h-11 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                      {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">
                      {currentUser.displayName || 'Người dùng Google'}
                    </div>
                    <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Sync status */}
              <div className="pt-3 border-t border-slate-200/70 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Đã kết nối đám mây</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {lastSyncedAt ? `Lần cuối: ${new Date(lastSyncedAt).toLocaleTimeString('vi-VN')} ${new Date(lastSyncedAt).toLocaleDateString('vi-VN')}` : 'Chưa sao lưu'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-white shadow-xs mx-auto flex items-center justify-center mb-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              </div>

              <h4 className="font-bold text-sm text-slate-800 mb-1">
                Đăng Nhập Với Tài Khoản Gmail
              </h4>
              <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
                Lưu trữ vĩnh viễn trên Cloud Firestore để bạn có thể mở và quản lý sổ thu chi ở bất kỳ đâu (Điện thoại, Máy tính).
              </p>

              <button
                onClick={handleGoogleSignIn}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition-all hover:shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                Tiếp tục với Google (Gmail)
              </button>
            </div>
          )}

          {/* Cloud Action Buttons (if logged in) */}
          {currentUser && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Thao tác đám mây
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleManualBackup}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50"
                >
                  <CloudUpload className="w-4 h-4" />
                  {isSyncing ? 'Đang tải lên...' : 'Sao lưu lên Cloud'}
                </button>

                <button
                  onClick={handleManualRestore}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  <CloudDownload className="w-4 h-4 text-blue-600" />
                  Tải về từ Cloud
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                💡 <strong>Tự động:</strong> Mỗi khi bạn thêm hoặc chỉnh sửa chi tiêu, hệ thống cũng sẽ tự động lưu lại vào tài khoản Gmail này để đảm bảo an toàn.
              </p>
            </div>
          )}

          {/* Multi-Device Feature Highlight */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
            <div className="flex items-center gap-1 text-blue-600 shrink-0 mt-0.5">
              <Laptop className="w-4 h-4" />
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-blue-900 leading-snug">
              <strong>Mở trên mọi thiết bị:</strong> Khi chuyển sang điện thoại hoặc máy tính khác, chỉ cần đăng nhập cùng tài khoản Gmail là toàn bộ sổ thu chi của bạn sẽ hiện ra ngay lập tức!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
