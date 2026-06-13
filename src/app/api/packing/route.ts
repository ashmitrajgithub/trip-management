import { NextResponse } from 'next/server';
import { readDb, writeDb, PackingItem } from '@/lib/db';
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

    const { data, error } = await supabase
      .from('packing_items')
      .select('*');
    if (!error && data) {
      const mappedData = data.map((item: any) => ({
        id: item.id,
        item: item.item,
        checkedBy: item.checked_by || [],
        category: item.category
      }));
      return NextResponse.json(mappedData);
    } else if (error) {
      console.error("Supabase GET packing items error:", error);
    }
  }

  // Fallback
  const db = await readDb(supabase);
  return NextResponse.json(db.packingList || []);
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
    const { itemId, userName } = body;

    if (!itemId || !userName) {
      return NextResponse.json({ error: "Item ID and User Name are required" }, { status: 400 });
    }

    // Resolve members list dynamically
    let membersList = MEMBERS_FALLBACK;
    if (supabase) {
      const { data: profilesData } = await supabase.from('profiles').select('display_name');
      if (profilesData && profilesData.length > 0) {
        membersList = profilesData.map((p: any) => p.display_name);
      }
    }

    if (!membersList.includes(userName)) {
      return NextResponse.json({ error: "Invalid user name" }, { status: 400 });
    }

    if (supabase) {
      // Fetch current checked_by for item
      const { data: itemData, error: fetchError } = await supabase
        .from('packing_items')
        .select('checked_by')
        .eq('id', itemId)
        .single();
      
      if (!fetchError && itemData) {
        let checkedBy = itemData.checked_by || [];
        if (checkedBy.includes(userName)) {
          checkedBy = checkedBy.filter((name: string) => name !== userName);
        } else {
          checkedBy.push(userName);
        }

        // Update item
        const { error: updateError } = await supabase
          .from('packing_items')
          .update({ checked_by: checkedBy })
          .eq('id', itemId);
        
        if (!updateError) {
          // Fetch updated list and return
          const { data: listData, error: listError } = await supabase.from('packing_items').select('*');
          if (!listError && listData) {
            const mappedData = listData.map((item: any) => ({
              id: item.id,
              item: item.item,
              checkedBy: item.checked_by || [],
              category: item.category
            }));
            return NextResponse.json({ success: true, packingList: mappedData });
          }
        }
      }
      console.error("Supabase toggle packing error:", fetchError);
    }

    // Fallback
    const db = await readDb(supabase);
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

    if (supabase) {
      // Authenticate the session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

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

    if (supabase) {
      const { error: insertError } = await supabase
        .from('packing_items')
        .insert([{
          id: newItem.id,
          item: newItem.item,
          checked_by: newItem.checkedBy,
          category: newItem.category
        }]);
      
      if (!insertError) {
        // Fetch updated list and return
        const { data: listData, error: listError } = await supabase.from('packing_items').select('*');
        if (!listError && listData) {
          const mappedData = listData.map((item: any) => ({
            id: item.id,
            item: item.item,
            checkedBy: item.checked_by || [],
            category: item.category
          }));
          return NextResponse.json({ success: true, item: newItem, packingList: mappedData });
        }
      }
      console.error("Supabase insert packing item error:", insertError);
    }

    // Fallback
    const db = await readDb(supabase);
    if (!db.packingList) db.packingList = [];
    db.packingList.push(newItem);
    await writeDb(db, supabase);

    return NextResponse.json({ success: true, item: newItem, packingList: db.packingList });
  } catch (error) {
    console.error("Packing PUT error:", error);
    return NextResponse.json({ error: "Failed to add packing item" }, { status: 500 });
  }
}
