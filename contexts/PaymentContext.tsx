'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PaymentData {
  item: {
    name: string;
    price: string;
    color?: string;
  };
  storeName: string;
  txHash: string;
  timestamp: number;
  userAddress: string;
  merchantAddress: string;
}

interface PaymentContextType {
  pendingPayments: PaymentData[];
  successfulPayments: PaymentData[]; // Add this line
  addPendingPayment: (payment: PaymentData) => void;
  addSuccessfulPayment: (payment: PaymentData) => void; // Add this line
  processPendingPayments: () => PaymentData[];
  clearPendingPayments: () => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [pendingPayments, setPendingPayments] = useState<PaymentData[]>([]);
  const [successfulPayments, setSuccessfulPayments] = useState<PaymentData[]>([]); // Add this line

  // Load pending payments from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('pendingPayments');
    if (stored) {
      try {
        setPendingPayments(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading pending payments:', error);
      }
    }
  }, []);

  // Save to localStorage whenever pendingPayments changes
  useEffect(() => {
    localStorage.setItem('pendingPayments', JSON.stringify(pendingPayments));
  }, [pendingPayments]);

  const addPendingPayment = (payment: PaymentData) => {
    setPendingPayments(prev => [...prev, payment]);
  };

  const addSuccessfulPayment = (payment: PaymentData) => { // Add this function
    // Add to successful payments state
    setSuccessfulPayments(prev => [...prev, payment]);
    
    // This should trigger:
    // 1. User receipt creation (already handled in this component)
    // 2. Merchant notification/redirect to create merchant receipt
    // 3. Any other global state updates needed
  };

  const processPendingPayments = () => {
    const payments = [...pendingPayments];
    setPendingPayments([]);
    return payments;
  };

  const clearPendingPayments = () => {
    setPendingPayments([]);
  };

  return (
    <PaymentContext.Provider value={{
      pendingPayments,
      successfulPayments, // Add this line
      addPendingPayment,
      addSuccessfulPayment, // Add this line
      processPendingPayments,
      clearPendingPayments
    }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}