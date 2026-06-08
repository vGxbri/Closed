/**
 * Servicio de gastos compartidos
 * Registro de gastos, reparto y liquidaciones entre miembros del grupo.
 */

import { groupsService } from './groups.service';
import { supabase } from '../lib/supabase';
import {
  SharedExpense,
  SharedExpenseWithDetails,
  SharedExpenseSettlement,
  CreateSharedExpenseInput,
} from '../types/database';

class SharedExpensesService {
  async getExpenses(groupId: string): Promise<SharedExpenseWithDetails[]> {
    const { data: expenses, error } = await supabase
      .from('shared_expenses')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!expenses || expenses.length === 0) return [];

    const expenseIds = expenses.map((e: SharedExpense) => e.id);
    const payerIds = [...new Set(expenses.map((e: SharedExpense) => e.paid_by))];

    const [splitsResult, allMembers] = await Promise.all([
      supabase
        .from('shared_expense_splits')
        .select('*')
        .in('expense_id', expenseIds),
      groupsService.fetchMembersForGroup(groupId),
    ]);

    if (splitsResult.error) throw splitsResult.error;

    const splitsByExpense = new Map<string, { expense_id: string; user_id: string }[]>();
    for (const s of splitsResult.data || []) {
      const arr = splitsByExpense.get(s.expense_id) || [];
      arr.push(s);
      splitsByExpense.set(s.expense_id, arr);
    }

    const payerIdSet = new Set(payerIds);
    const membersById = new Map<string, { display_name: string; avatar_url: string | null }>();
    for (const m of allMembers) {
      if (payerIdSet.has(m.user_id)) {
        membersById.set(m.user_id, {
          display_name: m.display_name,
          avatar_url: m.avatar_url,
        });
      }
    }

    return expenses.map((e: SharedExpense) => ({
      ...e,
      splits: splitsByExpense.get(e.id) || [],
      payer: membersById.get(e.paid_by),
    }));
  }

  async createExpense(input: CreateSharedExpenseInput): Promise<SharedExpense> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: expense, error } = await supabase
      .from('shared_expenses')
      .insert({
        group_id: input.group_id,
        amount_cents: input.amount_cents,
        description: input.description,
        paid_by: input.paid_by,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    const splits = input.split_user_ids.map((userId) => ({
      expense_id: expense.id,
      user_id: userId,
    }));

    const { error: splitsError } = await supabase
      .from('shared_expense_splits')
      .insert(splits);

    if (splitsError) throw splitsError;

    return expense as SharedExpense;
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const { error } = await supabase
      .from('shared_expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
  }

  async getSettlements(groupId: string): Promise<SharedExpenseSettlement[]> {
    const { data, error } = await supabase
      .from('shared_expense_settlements')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SharedExpenseSettlement[];
  }

  async createSettlement(
    groupId: string,
    fromUserId: string,
    toUserId: string,
    amountCents: number
  ): Promise<SharedExpenseSettlement> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('shared_expense_settlements')
      .insert({
        group_id: groupId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount_cents: amountCents,
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SharedExpenseSettlement;
  }

  async getExpenseCount(groupId: string): Promise<number> {
    const { count, error } = await supabase
      .from('shared_expenses')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (error) throw error;
    return count || 0;
  }

  async getTotalSpent(groupId: string): Promise<number> {
    const { data, error } = await supabase
      .from('shared_expenses')
      .select('amount_cents')
      .eq('group_id', groupId);

    if (error) throw error;
    return (data || []).reduce((sum: number, e: { amount_cents: number }) => sum + e.amount_cents, 0);
  }
}

export const sharedExpensesService = new SharedExpensesService();
