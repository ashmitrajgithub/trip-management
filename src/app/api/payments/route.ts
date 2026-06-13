import { NextResponse } from 'next/server';
import { readDb, writeDb, Payment } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

const MEMBERS_FALLBACK = [
  "Aarav", "Ananya", "Ishaan", "Diya", "Kabir", "Meera", "Rohan", "Siddharth", "Tanvi", "Aditya"
];

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  if (supabase) {
    // Authenticate the session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payments: Payment[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from('payments')
      .select('*');
    if (!error && data) {
      payments = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        amount: Number(item.amount),
        date: item.date
      }));
    } else if (error) {
      console.error("Supabase GET payments error:", error);
    }
  } else {
    // Fallback
    const db = await readDb(supabase);
    payments = db.payments;
  }

  // Resolve members list dynamically
  let membersList = MEMBERS_FALLBACK;
  if (supabase) {
    const { data: profilesData } = await supabase.from('profiles').select('display_name');
    if (profilesData && profilesData.length > 0) {
      membersList = profilesData.map((p: any) => p.display_name);
    }
  }

  const TARGET_CONTRIBUTION_PER_MEMBER = 5000;

  const contributions: Record<string, number> = {};
  membersList.forEach(name => {
    contributions[name] = 0;
  });

  payments.forEach(p => {
    if (contributions[p.name] !== undefined) {
      contributions[p.name] += Number(p.amount);
    }
  });

  const totalPoolCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const memberProgress = membersList.map(name => {
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
    totalTargetPool: TARGET_CONTRIBUTION_PER_MEMBER * membersList.length,
    memberProgress
  });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    if (supabase) {
      // Authenticate the session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const { name, amount } = body;

    if (!name || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Name and a positive amount are required" }, { status: 400 });
    }

    // Resolve members list dynamically
    let membersList = MEMBERS_FALLBACK;
    if (supabase) {
      const { data: profilesData } = await supabase.from('profiles').select('display_name');
      if (profilesData && profilesData.length > 0) {
        membersList = profilesData.map((p: any) => p.display_name);
      }
    }

    if (!membersList.includes(name)) {
      return NextResponse.json({ error: `Invalid member name: ${name}` }, { status: 400 });
    }

    const newPayment: Payment = {
      id: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name,
      amount: Number(amount),
      date: new Date().toISOString()
    };

    if (supabase) {
      const { error } = await supabase
        .from('payments')
        .insert([{
          id: newPayment.id,
          name: newPayment.name,
          amount: newPayment.amount,
          date: newPayment.date
        }]);
      if (!error) {
        return NextResponse.json({ success: true, payment: newPayment });
      } else {
        console.error("Supabase POST payment error:", error);
      }
    }

    // Fallback
    const db = await readDb(supabase);
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

    if (supabase) {
      // Authenticate the session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (supabase) {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);
      if (!error) {
        return NextResponse.json({ success: true });
      } else {
        console.error("Supabase DELETE payment error:", error);
      }
    }

    // Fallback
    const db = await readDb(supabase);
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
