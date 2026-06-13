import { NextResponse } from 'next/server';
import { readDb, writeDb, Expense } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const db = await readDb(supabase);
  const { expenses, members } = db;

  // Initialize financial structures
  const paidAmounts: Record<string, number> = {};
  const shareAmounts: Record<string, number> = {};
  const netBalances: Record<string, number> = {};

  members.forEach(name => {
    paidAmounts[name] = 0;
    shareAmounts[name] = 0;
    netBalances[name] = 0;
  });

  let totalGroupSpend = 0;

  // Calculate individual shares and paid amounts
  expenses.forEach(exp => {
    const amount = Number(exp.amount);
    totalGroupSpend += amount;

    // The person who paid gets a positive credit
    if (paidAmounts[exp.paidBy] !== undefined) {
      paidAmounts[exp.paidBy] += amount;
      netBalances[exp.paidBy] += amount;
    }

    // Split amount among group
    const splitCount = exp.splitAmong.length;
    if (splitCount > 0) {
      const share = amount / splitCount;
      exp.splitAmong.forEach(person => {
        if (shareAmounts[person] !== undefined) {
          shareAmounts[person] += share;
          netBalances[person] -= share;
        }
      });
    }
  });

  // Calculate debt settlements (minimize transactions)
  // Create copies of net balances for settlement logic
  const balances = { ...netBalances };

  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  Object.entries(balances).forEach(([name, bal]) => {
    // Round to 2 decimal places to avoid floating point issues
    const roundedBal = Math.round(bal * 100) / 100;
    if (roundedBal < -0.01) {
      debtors.push({ name, amount: Math.abs(roundedBal) });
    } else if (roundedBal > 0.01) {
      creditors.push({ name, amount: roundedBal });
    }
  });

  // Sort descending by amount to settle largest amounts first (greedy algorithm)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const amountToSettle = Math.min(debtor.amount, creditor.amount);
    
    if (amountToSettle > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amountToSettle * 100) / 100
      });
    }

    debtor.amount -= amountToSettle;
    creditor.amount -= amountToSettle;

    if (debtor.amount <= 0.01) {
      dIdx++;
    }
    if (creditor.amount <= 0.01) {
      cIdx++;
    }
  }

  // Formatting response
  const memberBalances = members.map(name => ({
    name,
    paid: Math.round(paidAmounts[name] * 100) / 100,
    spent: Math.round(shareAmounts[name] * 100) / 100,
    netBalance: Math.round(netBalances[name] * 100) / 100,
  }));

  return NextResponse.json({
    expenses: expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    totalGroupSpend: Math.round(totalGroupSpend * 100) / 100,
    memberBalances,
    settlements
  });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const db = await readDb(supabase);

    const body = await req.json();
    const { description, amount, paidBy, splitAmong, category } = body;

    if (!description || !amount || !paidBy || !splitAmong || splitAmong.length === 0) {
      return NextResponse.json({ error: "Missing required fields (description, amount, paidBy, splitAmong)" }, { status: 400 });
    }

    if (!db.members.includes(paidBy)) {
      return NextResponse.json({ error: `Invalid payer: ${paidBy}` }, { status: 400 });
    }

    // Verify all split members are valid
    for (const name of splitAmong) {
      if (!db.members.includes(name)) {
        return NextResponse.json({ error: `Invalid split member: ${name}` }, { status: 400 });
      }
    }

    const newExpense: Expense = {
      id: `exp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      description,
      amount: Number(amount),
      paidBy,
      splitAmong,
      category: category || 'Other',
      date: new Date().toISOString()
    };

    db.expenses.push(newExpense);
    await writeDb(db, supabase);

    return NextResponse.json({ success: true, expense: newExpense });
  } catch (error) {
    console.error("Expenses POST error:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const db = await readDb(supabase);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const filtered = db.expenses.filter(item => item.id !== id);

    if (filtered.length === db.expenses.length) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    db.expenses = filtered;
    await writeDb(db, supabase);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Expenses DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
