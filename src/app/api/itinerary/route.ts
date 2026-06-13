import { NextResponse } from 'next/server';
import { readDb, writeDb, Activity } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const db = await readDb(supabase);

  // Sort by day, then by time
  const sortedItinerary = [...db.itinerary].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.time.localeCompare(b.time);
  });
  return NextResponse.json(sortedItinerary);
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const db = await readDb(supabase);

    const body = await req.json();
    const { day, time, title, description, category, location, estimatedCost } = body;

    if (!title || !day) {
      return NextResponse.json({ error: "Title and Day are required fields" }, { status: 400 });
    }

    const newActivity: Activity = {
      id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      day: Number(day),
      time: time || 'Flexible',
      title,
      description: description || '',
      category: category || 'Other',
      location: location || '',
      estimatedCost: Number(estimatedCost) || 0
    };

    db.itinerary.push(newActivity);
    await writeDb(db, supabase);

    return NextResponse.json({ success: true, activity: newActivity, itinerary: db.itinerary });
  } catch (error) {
    console.error("Itinerary POST error:", error);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const db = await readDb(supabase);

    const body = await req.json();
    const { id, day, time, title, description, category, location, estimatedCost } = body;

    if (!id || !title || !day) {
      return NextResponse.json({ error: "ID, Title and Day are required fields" }, { status: 400 });
    }

    const index = db.itinerary.findIndex(item => item.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    db.itinerary[index] = {
      ...db.itinerary[index],
      day: Number(day),
      time: time || 'Flexible',
      title,
      description: description || '',
      category: category || 'Other',
      location: location || '',
      estimatedCost: Number(estimatedCost) || 0
    };

    await writeDb(db, supabase);
    return NextResponse.json({ success: true, activity: db.itinerary[index], itinerary: db.itinerary });
  } catch (error) {
    console.error("Itinerary PUT error:", error);
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
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

    const filtered = db.itinerary.filter(item => item.id !== id);
    
    if (filtered.length === db.itinerary.length) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    db.itinerary = filtered;
    await writeDb(db, supabase);
    
    return NextResponse.json({ success: true, itinerary: db.itinerary });
  } catch (error) {
    console.error("Itinerary DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
}
