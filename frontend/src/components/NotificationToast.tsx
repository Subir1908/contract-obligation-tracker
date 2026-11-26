import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import type { NotificationToastData } from '../types/obligation';

interface NotificationToastProps {
  toasts: NotificationToastData[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none no-print">
      {toasts.map((toast) => {
        let borderClass = 'border-white/[0.12]';
        let icon = <Info className="w-4 h-4 text-[#a1a1a6] flex-shrink-0 stroke-[1.5]" />;

        if (toast.type === 'success') {
          borderClass = 'border-[#4cc38a]/35';
          icon = <CheckCircle2 className="w-4 h-4 text-[#4cc38a] flex-shrink-0 stroke-[1.5]" />;
        } else if (toast.type === 'error') {
          borderClass = 'border-[#e5484d]/40';
          icon = <AlertCircle className="w-4 h-4 text-[#e5484d] flex-shrink-0 stroke-[1.5]" />;
        } else if (toast.type === 'warning') {
          borderClass = 'border-[#eab308]/35';
          icon = <AlertTriangle className="w-4 h-4 text-[#eab308] flex-shrink-0 stroke-[1.5]" />;
        }

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-[#19191b] text-[#ededed] border shadow-2xl ${borderClass}`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[13px] font-medium leading-tight">{toast.title}</h4>
              <p className="text-[12px] text-[#a1a1a6] mt-0.5 leading-relaxed break-words">
                {toast.message}
              </p>
              {toast.actionLabel && toast.onAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    onDismiss(toast.id);
                  }}
                  className="mt-2 text-[12px] font-medium text-[#ededed] underline underline-offset-2 hover:text-white cursor-pointer"
                >
                  {toast.actionLabel}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-[#71717a] hover:text-[#ededed] p-0.5 rounded transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
