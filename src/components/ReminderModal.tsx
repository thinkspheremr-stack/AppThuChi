import React, { useState } from 'react';
import { ReminderSetting, Transaction } from '../types';
import {
  calculateStreak,
  playNotificationChime,
  requestNotificationPermission,
  sendBrowserNotification,
} from '../services/notificationService';
import {
  Bell,
  Clock,
  Calendar,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Flame,
  Plus,
  Trash2,
  X,
  VolumeX,
  Sparkles,
} from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: ReminderSetting[];
  transactions: Transaction[];
  onSaveReminders: (reminders: ReminderSetting[]) => void;
  onOpenAddTransaction: () => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  reminders,
  transactions,
  onSaveReminders,
  onOpenAddTransaction,
}) => {
  const [reminderList, setReminderList] = useState<ReminderSetting[]>(reminders);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [testSent, setTestSent] = useState(false);

  const { streak, loggedToday } = calculateStreak(transactions);

  const handleToggle = (id: string) => {
    const updated = reminderList.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setReminderList(updated);
    onSaveReminders(updated);
  };

  const handleTimeChange = (id: string, time: string) => {
    const updated = reminderList.map((r) => (r.id === id ? { ...r, time } : r));
    setReminderList(updated);
    onSaveReminders(updated);
  };

  const handleDayChange = (id: string, day: number) => {
    const updated = reminderList.map((r) => (r.id === id ? { ...r, dayOfMonth: day } : r));
    setReminderList(updated);
    onSaveReminders(updated);
  };

  const handleSoundToggle = (id: string) => {
    const updated = reminderList.map((r) => (r.id === id ? { ...r, soundEnabled: !r.soundEnabled } : r));
    setReminderList(updated);
    onSaveReminders(updated);
  };

  const handleDelete = (id: string) => {
    const updated = reminderList.filter((r) => r.id !== id);
    setReminderList(updated);
    onSaveReminders(updated);
  };

  const handleAddCustom = () => {
    const newRem: ReminderSetting = {
      id: `rem-custom-${Date.now()}`,
      title: 'Nhắc nhở mới',
      type: 'daily',
      time: '21:00',
      enabled: true,
      message: '🔔 Đừng quên ghi lại các khoản chi tiêu của bạn!',
      soundEnabled: true,
    };
    const updated = [...reminderList, newRem];
    setReminderList(updated);
    onSaveReminders(updated);
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      sendBrowserNotification(
        'Đã bật thông báo thành công!',
        'Sổ Thu Chi sẽ nhắc bạn ghi chép chi tiêu đúng giờ mỗi ngày.',
        true
      );
    }
  };

  const handleTestAlert = () => {
    playNotificationChime();
    sendBrowserNotification(
      '🔔 Thử nghiệm thông báo Sổ Thu Chi',
      'Chuông báo & thông báo hoạt động rất tốt! Bạn sẽ không bỏ sót chi tiêu nào.',
      true
    );
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">Cài Đặt Nhắc Nhở Thu Chi</h3>
              <p className="text-[11px] text-slate-400">Tạo thói quen tài chính hàng ngày & hàng tháng</p>
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Daily Streak Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="text-xs text-amber-900 font-medium">Chuỗi ngày ghi chép liên tục</div>
                <div className="text-xl font-black text-amber-700">{streak} ngày liên tiếp 🔥</div>
                <div className="text-[11px] text-amber-800/80 mt-0.5">
                  {loggedToday ? '✓ Hôm nay bạn đã ghi chép rồi!' : '⚠️ Hôm nay bạn chưa nhập khoản chi nào!'}
                </div>
              </div>
            </div>

            {!loggedToday && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAddTransaction();
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm shrink-0 transition-colors"
              >
                Ghi ngay
              </button>
            )}
          </div>

          {/* Web Notification Permission Banner */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {notificationPermission === 'granted' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  {notificationPermission === 'granted'
                    ? 'Thông báo trình duyệt đã được bật'
                    : 'Chưa cấp quyền thông báo trình duyệt'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {notificationPermission === 'granted'
                    ? 'Bạn sẽ nhận được popup nhắc nhở đúng giờ'
                    : 'Hãy cấp quyền để máy tính / điện thoại nhắc nhở bạn'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {notificationPermission !== 'granted' ? (
                <button
                  onClick={handleRequestPermission}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Bật quyền
                </button>
              ) : (
                <button
                  onClick={handleTestAlert}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {testSent ? 'Đã phát chuông!' : 'Thử chuông'}
                </button>
              )}
            </div>
          </div>

          {/* List of Reminders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Danh sách nhắc nhở hàng ngày & hàng tháng
              </label>
              <button
                type="button"
                onClick={handleAddCustom}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm nhắc nhở
              </button>
            </div>

            {reminderList.map((rem) => (
              <div
                key={rem.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  rem.enabled ? 'border-slate-200 bg-white shadow-2xs' : 'border-slate-100 bg-slate-50/60 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        rem.type === 'daily'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {rem.type === 'daily' ? 'Hàng ngày' : 'Hàng tháng'}
                    </span>
                    <span className="font-semibold text-xs text-slate-800">{rem.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Sound toggle */}
                    <button
                      type="button"
                      onClick={() => handleSoundToggle(rem.id)}
                      className={`p-1 rounded-md text-xs ${
                        rem.soundEnabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={rem.soundEnabled ? 'Có phát chuông âm thanh' : 'Tắt chuông âm thanh'}
                    >
                      {rem.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>

                    {/* Enable switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rem.enabled}
                        onChange={() => handleToggle(rem.id)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>

                    {/* Delete button if custom */}
                    {reminderList.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleDelete(rem.id)}
                        className="p-1 text-slate-300 hover:text-rose-500"
                        title="Xóa"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-2.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {rem.message}
                </p>

                {/* Time & Day Settings */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Giờ nhắc:</span>
                    <input
                      type="time"
                      value={rem.time}
                      onChange={(e) => handleTimeChange(rem.id, e.target.value)}
                      className="px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                    />
                  </div>

                  {rem.type === 'monthly' && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ngày:</span>
                      <select
                        value={rem.dayOfMonth || 1}
                        onChange={(e) => handleDayChange(rem.id, Number(e.target.value))}
                        className="px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            Ngày {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Đóng & Lưu
          </button>
        </div>
      </div>
    </div>
  );
};
