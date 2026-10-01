import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  signInWithGoogle,
  signOut,
  auth,
  getCachedAccessToken,
} from '../services/firebase';
import {
  uploadBackupToGoogleDrive,
  listDriveBackupFiles,
  downloadBackupFromGoogleDrive,
  DriveFileItem,
  DriveBackupResult,
} from '../services/googleDriveService';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  LogOut,
  X,
  CheckCircle2,
  AlertCircle,
  Mail,
  ShieldCheck,
  FolderOpen,
  Download,
  ExternalLink,
  HardDrive,
  RefreshCw,
  Info,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  onBackupNow: () => Promise<void>;
  onRestoreFromCloud: () => Promise<void>;
  onExportJSON?: () => void;
  onImportJSON?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGetBackupPayload?: () => any;
  onApplyBackupPayload?: (payload: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lastSyncedAt,
  isSyncing,
  onBackupNow,
  onRestoreFromCloud,
  onExportJSON,
  onImportJSON,
  onGetBackupPayload,
  onApplyBackupPayload,
}) => {
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmCloudRestore, setConfirmCloudRestore] = useState<boolean>(false);

  // Google Drive states
  const [isDriveSaving, setIsDriveSaving] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [showDriveList, setShowDriveList] = useState(false);
  const [lastDriveResult, setLastDriveResult] = useState<DriveBackupResult | null>(null);
  const [confirmDriveRestoreFile, setConfirmDriveRestoreFile] = useState<DriveFileItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAuthError(null);
      setSuccessMsg(null);
      setShowDriveList(false);
      setConfirmDriveRestoreFile(null);
      setConfirmCloudRestore(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
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
      setDriveFiles([]);
      setLastDriveResult(null);
      setSuccessMsg('Đã đăng xuất tài khoản Google.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  // Cloud Firestore operations
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
    setConfirmCloudRestore(false);
    try {
      await onRestoreFromCloud();
      setSuccessMsg('Đã tải và khôi phục dữ liệu từ đám mây thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setAuthError('Khôi phục thất bại hoặc tài khoản chưa có bản sao lưu trên đám mây!');
    }
  };

  // Google Drive: Save backup to Google Drive
  const handleSaveToDrive = async () => {
    setIsDriveSaving(true);
    setAuthError(null);
    try {
      let token = getCachedAccessToken();
      if (!token) {
        // Need sign-in with Drive scope
        const res = await signInWithGoogle();
        token = res.accessToken || null;
      }
      if (!token) {
        throw new Error('Chưa có quyền Google Drive. Vui lòng đăng nhập lại Google.');
      }

      const payload = onGetBackupPayload ? onGetBackupPayload() : {};
      const result = await uploadBackupToGoogleDrive(payload, token);
      setLastDriveResult(result);
      setSuccessMsg(`Đã lưu file "${result.fileName}" lên Google Drive của bạn thành công!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Lỗi khi lưu lên Drive:', err);
      setAuthError(err?.message || 'Không thể lưu lên Google Drive');
    } finally {
      setIsDriveSaving(false);
    }
  };

  // Google Drive: List backups from Google Drive
  const handleLoadDriveFiles = async () => {
    setIsDriveLoading(true);
    setAuthError(null);
    setShowDriveList(true);
    try {
      let token = getCachedAccessToken();
      if (!token) {
        const res = await signInWithGoogle();
        token = res.accessToken || null;
      }
      if (!token) {
        throw new Error('Chưa có quyền Google Drive. Vui lòng đăng nhập lại Google.');
      }

      const files = await listDriveBackupFiles(token);
      setDriveFiles(files);
      if (files.length === 0) {
        setSuccessMsg('Chưa tìm thấy file sao lưu SoThuChi nào trên Google Drive. Hãy bấm "Lưu Lên Drive" trước.');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Lỗi khi đọc file từ Drive:', err);
      setAuthError(err?.message || 'Không thể truy cập danh sách file Google Drive');
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Google Drive: Confirm and Restore from a specific Drive file
  const handleConfirmRestoreFromDrive = async (file: DriveFileItem) => {
    setIsDriveLoading(true);
    setAuthError(null);
    try {
      const token = getCachedAccessToken();
      if (!token) {
        throw new Error('Mất phiên đăng nhập Google. Vui lòng đăng nhập lại.');
      }

      const data = await downloadBackupFromGoogleDrive(file.id, token);
      if (!data || !data.accounts || !data.transactions) {
        throw new Error('File này trên Drive không đúng định dạng dữ liệu Sổ Thu Chi.');
      }

      if (onApplyBackupPayload) {
        onApplyBackupPayload(data);
      }

      setConfirmDriveRestoreFile(null);
      setSuccessMsg(`Đã nạp thành công bản sao lưu "${file.name}" từ Google Drive vào Sổ Thu Chi!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Lỗi khi khôi phục từ Drive:', err);
      setAuthError(err?.message || 'Không thể đọc bản sao lưu từ Google Drive');
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Local JSON file handlers
  const handleTriggerImportJSON = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onImportJSON) {
      onImportJSON(e);
      setSuccessMsg('Đã mở tệp sao lưu và nạp dữ liệu vào sổ thu chi thành công!');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-700 via-teal-700 to-sky-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight">Tài Khoản & Quản Lý Sao Lưu</h3>
              <p className="text-[11px] text-emerald-100">Đồng bộ Google Drive, Cloud & tệp dự phòng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Notification Messages */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* User Status Card */}
          {currentUser ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Avatar'}
                      className="w-11 h-11 rounded-full border-2 border-emerald-400 shadow-xs"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm text-slate-800 truncate">
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
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold rounded-xl border border-slate-200 hover:border-rose-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                  title="Đăng xuất để đổi tài khoản Gmail khác"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>

              <div className="pt-2.5 border-t border-slate-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Đã kết nối tài khoản Google</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {lastSyncedAt
                    ? `Lần cuối: ${new Date(lastSyncedAt).toLocaleTimeString('vi-VN')} ${new Date(lastSyncedAt).toLocaleDateString('vi-VN')}`
                    : 'Chưa sao lưu'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-white shadow-xs mx-auto flex items-center justify-center mb-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>

              <h4 className="font-extrabold text-sm text-slate-800 mb-1">
                Đăng Nhập Với Tài Khoản Google
              </h4>
              <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
                Đăng nhập để tự động lưu trữ lên <strong>Google Drive</strong> và đồng bộ đám mây trên mọi thiết bị.
              </p>

              <button
                onClick={handleGoogleSignIn}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition-all hover:shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Đăng Nhập Với Google (Gmail)</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MỤC 1: GOOGLE DRIVE (LƯU & MỞ TRỰC TIẾP TRÊN GOOGLE DRIVE CÁ NHÂN)         */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-emerald-50/50 to-sky-50/50 border-2 border-amber-300/80 space-y-3 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Google Drive (Lưu Trữ Cá Nhân)</span>
                    <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-amber-200 text-amber-900">
                      Mới
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Lưu file <strong>SoThuChi_Backup.json</strong> trực tiếp vào Google Drive của bạn
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Nút: Lưu lên Google Drive */}
              <button
                type="button"
                onClick={handleSaveToDrive}
                disabled={isDriveSaving}
                className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition-all hover:scale-101 active:scale-99 disabled:opacity-60"
              >
                <HardDrive className="w-4 h-4" />
                <span>{isDriveSaving ? 'Đang lưu lên Drive...' : 'Lưu Lên Google Drive'}</span>
              </button>

              {/* Nút: Xem file từ Drive */}
              <button
                type="button"
                onClick={handleLoadDriveFiles}
                disabled={isDriveLoading}
                className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs rounded-xl border-2 border-amber-300 shadow-xs transition-colors disabled:opacity-60"
              >
                <FolderOpen className="w-4 h-4 text-amber-600" />
                <span>{isDriveLoading ? 'Đang tải Drive...' : 'Xem & Mở Từ Drive'}</span>
              </button>
            </div>

            {/* Thông tin file vừa lưu trên Drive */}
            {lastDriveResult && (
              <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300 text-xs text-amber-950 flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="font-bold">Đã lưu: </span>
                  <span className="font-semibold">{lastDriveResult.fileName}</span>
                  <span className="text-[10px] text-amber-800 ml-1">
                    ({new Date(lastDriveResult.modifiedTime).toLocaleTimeString('vi-VN')})
                  </span>
                </div>
                {lastDriveResult.webViewLink && (
                  <a
                    href={lastDriveResult.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-900 hover:underline font-bold flex items-center gap-1 shrink-0 bg-white px-2 py-1 rounded-lg border border-amber-300"
                  >
                    <span>Mở Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Danh sách file tìm thấy trên Drive */}
            {showDriveList && (
              <div className="space-y-2 pt-1 border-t border-amber-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>File sao lưu trên Google Drive của bạn:</span>
                  <button
                    type="button"
                    onClick={handleLoadDriveFiles}
                    className="text-amber-700 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Làm mới</span>
                  </button>
                </div>

                {driveFiles.length === 0 ? (
                  <div className="p-3 bg-white rounded-xl text-center text-xs text-slate-500 italic border border-slate-200">
                    Chưa tìm thấy file nào. Hãy bấm &quot;Lưu Lên Google Drive&quot; ở trên để tạo bản lưu đầu tiên!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {driveFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">{file.name}</div>
                          <div className="text-[10px] text-slate-500">
                            Lần cập nhật: {new Date(file.modifiedTime).toLocaleString('vi-VN')}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                              title="Xem trên Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setConfirmDriveRestoreFile(file)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors"
                          >
                            Nạp Vào Sổ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Confirmation dialog for Drive restore */}
            {confirmDriveRestoreFile && (
              <div className="p-3.5 bg-white border-2 border-amber-400 rounded-2xl shadow-sm text-xs space-y-2 animate-in fade-in">
                <div className="font-extrabold text-amber-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Xác nhận nạp bản sao lưu từ Google Drive?</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Bản lưu <strong>&quot;{confirmDriveRestoreFile.name}&quot;</strong> sẽ được tải về và áp dụng vào sổ thu chi của bạn.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleConfirmRestoreFromDrive(confirmDriveRestoreFile)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-2xs"
                  >
                    Xác nhận nạp ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDriveRestoreFile(null)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* MỤC 2: SAO LƯU CLOUD FIRESTORE TỰ ĐỘNG                                    */}
          {/* ========================================================================= */}
          {currentUser && (
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đồng Bộ Đám Mây Nhanh (Cloud Firestore)</span>
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleManualBackup}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>{isSyncing ? 'Đang đồng bộ...' : 'Sao Lưu Lên Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmCloudRestore(true)}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs border border-sky-200 transition-colors disabled:opacity-50"
                >
                  <CloudDownload className="w-4 h-4 text-sky-600" />
                  <span>Tải Về Từ Cloud</span>
                </button>
              </div>

              {confirmCloudRestore && (
                <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs space-y-2 animate-in fade-in">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Xác nhận tải lại dữ liệu từ đám mây?</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Dữ liệu trên máy sẽ được cập nhật đồng bộ theo bản lưu gần nhất trên tài khoản Gmail của bạn.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleManualRestore}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-2xs"
                    >
                      Xác nhận tải về
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCloudRestore(false)}
                      className="px-3 py-1.5 bg-white text-slate-700 font-semibold text-xs rounded-lg border border-slate-200"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MỤC 3: MỞ TỆP SAO LƯU NGOẠI TUYẾN (.JSON)                                 */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-sky-50/50 to-slate-50 border-2 border-indigo-200/80 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-indigo-950 uppercase tracking-wide">
                    Mở Tệp Sao Lưu (.JSON) Ngoại Tuyến
                  </h4>
                  <p className="text-[11px] text-indigo-800/80">
                    Mở file khi mất mạng hoặc xem dữ liệu từ người khác gửi cho bạn
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleTriggerImportJSON}
                className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-indigo-50 text-indigo-900 font-extrabold text-xs rounded-xl border-2 border-indigo-300 shadow-xs hover:border-indigo-500 transition-all hover:scale-101 active:scale-99"
              >
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                <span>Mở Tệp Sao Lưu (.JSON)</span>
              </button>

              <button
                type="button"
                onClick={onExportJSON}
                className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Tải File Sao Lưu Về Máy</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Hỗ trợ 3 tầng lưu trữ: Google Drive, Cloud & File máy
          </span>
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
