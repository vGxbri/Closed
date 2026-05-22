import { useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { sharedExpensesService } from '../services/sharedExpenses.service';
import { SharedExpenseWithDetails, SharedExpenseSettlement } from '../types/database';
import { computeBalances, simplifyDebts, MemberBalance, DebtTransfer } from '../lib/sharedExpenses';

export function useSharedExpenses(groupId: string) {
  const [expenses, setExpenses] = useState<SharedExpenseWithDetails[]>([]);
  const [settlements, setSettlements] = useState<SharedExpenseSettlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFirstLoadRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    try {
      if (isFirstLoadRef.current) setIsLoading(true);
      const [exp, sett] = await Promise.all([
        sharedExpensesService.getExpenses(groupId),
        sharedExpensesService.getSettlements(groupId),
      ]);
      setExpenses(exp);
      setSettlements(sett);
      isFirstLoadRef.current = false;
    } catch (e) {
      console.error('Error loading shared expenses:', e);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();

      const channel = supabase
        .channel(`shared-expenses-realtime:${groupId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'shared_expenses',
          filter: `group_id=eq.${groupId}`,
        }, () => { fetchData(); })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'shared_expense_settlements',
          filter: `group_id=eq.${groupId}`,
        }, () => { fetchData(); })
        .subscribe();

      return () => { channel.unsubscribe(); };
    }, [fetchData, groupId])
  );

  const balances: Map<string, MemberBalance> = useMemo(
    () => computeBalances(expenses, settlements),
    [expenses, settlements]
  );

  const debts: DebtTransfer[] = useMemo(
    () => simplifyDebts(balances),
    [balances]
  );

  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount_cents, 0),
    [expenses]
  );

  const deleteExpense = useCallback(async (expenseId: string) => {
    await sharedExpensesService.deleteExpense(expenseId);
    await fetchData();
  }, [fetchData]);

  const settleDebt = useCallback(async (fromUserId: string, toUserId: string, amountCents: number) => {
    await sharedExpensesService.createSettlement(groupId, fromUserId, toUserId, amountCents);
    await fetchData();
  }, [groupId, fetchData]);

  return {
    expenses,
    settlements,
    balances,
    debts,
    totalSpent,
    isLoading,
    refetch: fetchData,
    deleteExpense,
    settleDebt,
  };
}
