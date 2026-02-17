import type { ReactNode } from 'react';
import { ToastContext, useToastState } from '../../hooks/useToast';
import { Toast } from './Toast';

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const value = useToastState();

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast items={value.items} onDismiss={value.dismiss} />
    </ToastContext.Provider>
  );
}
