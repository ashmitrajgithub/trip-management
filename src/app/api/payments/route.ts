import { NextResponse } from 'next/server';
import { readDb, writeDb, Payment } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const db = await readDb(supabase);
  const { payments, members } = db;

  const TARGET_CONTRIBUTION_PER_MEMBER = 5000;

  const contributions: Record<string, number> = {};
  members.forEach(name => {
    contributions[name] = 0;
  });

  payments.forEach(p => {
    if (contributions[p.name] !== undefined) {
      contributions[p.name] += Number(p.amount);
    }
  });

  const totalPoolCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const memberProgress = members.map(name => {
    const contributed = contributions[name];
    const target = TARGET_CONTRIBUTION_PER_MEMBER;
    const remaining = Math.max(0, target - contributed);
    const percentage = Math.min(100, Math.round((contributed / target) * 100));

    return {
      name,
      contributed,
      target,
      remaining,
      percentage
    };
  });

  return NextResponse.json({
    payments: payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    totalPoolCollected,
    targetContributionPerPerson: TARGET_CONTRIBUTION_PER_MEMBER,
    totalTargetPool: TARGET_CONTRIBUTION_PER_MEMBER * members.length,
    memberProgress
  });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const db = await readDb(supabase);

    const body = await req.json();
    const { name, amount } = body;

    if (!name || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Name and a positive amount are required" }, { status: 400 });
    }

    if (!db.members.includes(name)) {
      return NextResponse.json({ error: `Invalid member name: ${name}` }, { status: 400 });
    }

    const newPayment: Payment = {
      id: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name,
      amount: Number(amount),
      date: new Date().toISOString()
    };

    db.payments.push(newPayment);
    await writeDb(db, supabase);

    return NextResponse.json({ success: true, payment: newPayment });
  } catch (error) {
    console.error("Payments POST error:", error);
    return NextResponse.json({ error: "Failed to log payment" }, { status: 500 });
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

    const filtered = db.payments.filter(item => item.id !== id);

    if (filtered.length === db.payments.length) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    db.payments = filtered;
    await writeDb(db, supabase);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payments DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
