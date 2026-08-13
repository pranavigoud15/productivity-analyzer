import { createContext, useContext } from 'react';

export const FocusContext = createContext(null);

export function useFocus() {
  const context = useContext(FocusContext);
  if (!context) throw new Error('useFocus must be used inside FocusProvider');
  return context;
}
