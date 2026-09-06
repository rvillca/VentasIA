import React, { createContext, useContext, useState, ReactNode } from 'react';
import { formatCurrency } from '../lib/storage';

interface FinancialPrivacyContextType {
  showBalances: boolean;
  toggleShowBalances: () => void;
  setShowBalances: (show: boolean) => void;
  formatBalance: (amount: number, placeholder?: string) => string;
}

const FinancialPrivacyContext = createContext<FinancialPrivacyContextType | undefined>(undefined);

export const FinancialPrivacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // By default, balances are HIDDEN as requested ("que por defecto este oculto")
  const [showBalances, setShowBalances] = useState<boolean>(false);

  const toggleShowBalances = () => {
    setShowBalances((prev) => !prev);
  };

  /**
   * Formats balance: if showBalances is true, shows real currency (e.g. "Bs. 150").
   * If showBalances is false, displays bank-style dots: "Bs. •••••"
   */
  const formatBalance = (amount: number, placeholder = 'Bs. •••••'): string => {
    if (showBalances) {
      return formatCurrency(amount);
    }
    return placeholder;
  };

  return (
    <FinancialPrivacyContext.Provider
      value={{
        showBalances,
        toggleShowBalances,
        setShowBalances,
        formatBalance,
      }}
    >
      {children}
    </FinancialPrivacyContext.Provider>
  );
};

export function useFinancialPrivacy(): FinancialPrivacyContextType {
  const context = useContext(FinancialPrivacyContext);
  if (!context) {
    throw new Error('useFinancialPrivacy must be used within a FinancialPrivacyProvider');
  }
  return context;
}
