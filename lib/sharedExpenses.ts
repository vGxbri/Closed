/**
 * Lógica de gastos compartidos
 * Cálculo de saldos netos y simplificación de deudas entre miembros del grupo.
 */

import { SharedExpenseWithDetails, SharedExpenseSettlement } from '../types/database';

export interface MemberBalance {
  userId: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export interface DebtTransfer {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

export function computeBalances(
  expenses: SharedExpenseWithDetails[],
  settlements: SharedExpenseSettlement[]
): Map<string, MemberBalance> {
  const balances = new Map<string, MemberBalance>();

  const getOrCreate = (userId: string): MemberBalance => {
    let b = balances.get(userId);
    if (!b) {
      b = { userId, totalPaid: 0, totalOwed: 0, netBalance: 0 };
      balances.set(userId, b);
    }
    return b;
  };

  for (const expense of expenses) {
    const payer = getOrCreate(expense.paid_by);
    payer.totalPaid += expense.amount_cents;

    const splitCount = expense.splits.length;
    if (splitCount === 0) continue;

    const perPerson = Math.floor(expense.amount_cents / splitCount);
    const remainder = expense.amount_cents - perPerson * splitCount;

    for (let i = 0; i < expense.splits.length; i++) {
      const split = expense.splits[i];
      const member = getOrCreate(split.user_id);
      const share = perPerson + (i < remainder ? 1 : 0);
      member.totalOwed += share;
    }
  }

  for (const s of settlements) {
    if (!s.is_resolved) continue;
    const from = getOrCreate(s.from_user_id);
    const to = getOrCreate(s.to_user_id);
    from.totalPaid += s.amount_cents;
    to.totalOwed += s.amount_cents;
  }

  for (const b of balances.values()) {
    b.netBalance = b.totalPaid - b.totalOwed;
  }

  return balances;
}

export function simplifyDebts(balances: Map<string, MemberBalance>): DebtTransfer[] {
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  for (const b of balances.values()) {
    if (b.netBalance > 0) {
      creditors.push({ userId: b.userId, amount: b.netBalance });
    } else if (b.netBalance < 0) {
      debtors.push({ userId: b.userId, amount: -b.netBalance });
    }
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const transfer = Math.min(creditors[ci].amount, debtors[di].amount);
    if (transfer > 0) {
      transfers.push({
        fromUserId: debtors[di].userId,
        toUserId: creditors[ci].userId,
        amountCents: transfer,
      });
    }
    creditors[ci].amount -= transfer;
    debtors[di].amount -= transfer;
    if (creditors[ci].amount === 0) ci++;
    if (debtors[di].amount === 0) di++;
  }

  return transfers;
}

export function formatCents(cents: number): string {
  const euros = Math.abs(cents) / 100;
  const formatted = euros.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${cents < 0 ? '-' : ''}${formatted} €`;
}
