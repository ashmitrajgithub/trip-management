import { NextResponse } from 'next/server';
import { readDb, writeDb, Activity } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  if (supabase) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('day', { ascending: true })
      .order('time', { ascending: true });
    
    if (!error && data) {
      const mappedData = data.map((item: any) => ({
        id: item.id,
        day: Number(item.day),
        time: item.time,
        title: item.title,
        description: item.description,
        category: item.category,
        location: item.location,
        estimatedCost: Number(item.estimated_cost)
      }));
      return NextResponse.json(mappedData);
    } else if (error) {
      console.error("Supabase GET itinerary error:", error);
    }
  }

  // Fallback
  const db = await readDb(supabase);
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

    if (supabase) {
      const { error } = await supabase
        .from('activities')
        .insert([{
          id: newActivity.id,
          day: newActivity.day,
          time: newActivity.time,
          title: newActivity.title,
          description: newActivity.description,
          category: newActivity.category,
          location: newActivity.location,
          estimated_cost: newActivity.estimatedCost
        }]);
      
      if (!error) {
        return NextResponse.json({ success: true, activity: newActivity });
      } else {
        console.error("Supabase POST itinerary error:", error);
      }
    }

    // Fallback
    const db = await readDb(supabase);
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
    const body = await req.json();
    const { id, day, time, title, description, category, location, estimatedCost } = body;

    if (!id || !title || !day) {
      return NextResponse.json({ error: "ID, Title and Day are required fields" }, { status: 400 });
    }

    const updatedData = {
      day: Number(day),
      time: time || 'Flexible',
      title,
      description: description || '',
      category: category || 'Other',
      location: location || '',
      estimated_cost: Number(estimatedCost) || 0
    };

    if (supabase) {
      const { error } = await supabase
        .from('activities')
        .update(updatedData)
        .eq('id', id);
      
      if (!error) {
        return NextResponse.json({ success: true, activity: { id, ...updatedData, estimatedCost: updatedData.estimated_cost } });
      } else {
        console.error("Supabase PUT itinerary error:", error);
      }
    }

    // Fallback
    const db = await readDb(supabase);
    const index = db.itinerary.findIndex(item => item.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    db.itinerary[index] = {
      id,
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (supabase) {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);
      
      if (!error) {
        return NextResponse.json({ success: true });
      } else {
        console.error("Supabase DELETE itinerary error:", error);
      }
    }

    // Fallback
    const db = await readDb(supabase);
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
