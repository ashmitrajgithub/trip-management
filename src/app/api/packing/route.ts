import { NextResponse } from 'next/server';
import { readDb, writeDb, PackingItem } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const db = await readDb(supabase);
  return NextResponse.json(db.packingList || []);
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const db = await readDb(supabase);

    const body = await req.json();
    const { itemId, userName } = body;

    if (!itemId || !userName) {
      return NextResponse.json({ error: "Item ID and User Name are required" }, { status: 400 });
    }

    if (!db.members.includes(userName)) {
      return NextResponse.json({ error: "Invalid user name" }, { status: 400 });
    }

    const itemIndex = db.packingList.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    const item = db.packingList[itemIndex];
    if (item.checkedBy.includes(userName)) {
      item.checkedBy = item.checkedBy.filter(name => name !== userName);
    } else {
      item.checkedBy.push(userName);
    }

    db.packingList[itemIndex] = item;
    await writeDb(db, supabase);

    return NextResponse.json({ success: true, packingList: db.packingList });
  } catch (error) {
    console.error("Packing POST error:", error);
    return NextResponse.json({ error: "Failed to toggle packing item" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const db = await readDb(supabase);

    const body = await req.json();
    const { item, category } = body;

    if (!item) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const newItem: PackingItem = {
      id: `pack_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      item,
      checkedBy: [],
      category: category || "Other"
    };

    if (!db.packingList) db.packingList = [];
    db.packingList.push(newItem);
    await writeDb(db, supabase);

    return NextResponse.json({ success: true, item: newItem, packingList: db.packingList });
  } catch (error) {
    console.error("Packing PUT error:", error);
    return NextResponse.json({ error: "Failed to add packing item" }, { status: 500 });
  }
}
