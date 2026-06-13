import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export interface Activity {
  id: string;
  day: number;
  time: string;
  title: string;
  description: string;
  category: string;
  location?: string;
  estimatedCost: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  category: string;
  date: string;
}

export interface Payment {
  id: string;
  name: string;
  amount: number;
  date: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  type?: 'text' | 'location' | 'image';
  mediaUrl?: string;
  reactions?: Record<string, string[]>;
}

export interface PackingItem {
  id: string;
  item: string;
  checkedBy: string[];
  category: string;
}

export interface DbSchema {
  itinerary: Activity[];
  expenses: Expense[];
  payments: Payment[];
  chat: ChatMessage[];
  packingList: PackingItem[];
  members: string[];
}

const DB_PATH = path.join(process.cwd(), 'src/data/db.json');

// Initialize static fallback Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function readDb(supabaseClient?: any): Promise<DbSchema> {
  const client = supabaseClient || supabase;

  // Supabase Fetch
  if (client) {
    try {
      const { data, error } = await client
        .from('goa_trip_tracker')
        .select('state')
        .eq('id', 'trip_2026')
        .single();

      if (error) {
        // PGRST116 means row not found. Let's create it with initial mock database
        if (error.code === 'PGRST116') {
          console.log("Creating new trip_2026 record in Supabase...");
          const initialDb = getInitialMockDb();
          const { error: insertError } = await client
            .from('goa_trip_tracker')
            .insert([{ id: 'trip_2026', state: initialDb }]);
          if (insertError) throw insertError;
          return initialDb;
        }
        throw error;
      }
      return data.state as DbSchema;
    } catch (err) {
      console.error("Supabase read error, falling back to local file:", err);
    }
  }

  // Local JSON fallback
  try {
    if (!fs.existsSync(DB_PATH)) {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const initialDb = getInitialMockDb();
      fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return getInitialMockDb();
  }
}

export async function writeDb(data: DbSchema, supabaseClient?: any): Promise<boolean> {
  const client = supabaseClient || supabase;

  // Supabase Upsert
  if (client) {
    try {
      const { error } = await client
        .from('goa_trip_tracker')
        .upsert([{ id: 'trip_2026', state: data }]);

      if (!error) return true;
      throw error;
    } catch (err) {
      console.error("Supabase write error, falling back to local file:", err);
    }
  }

  // Local JSON fallback
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}

function getInitialMockDb(): DbSchema {
  return {
    itinerary: [],
    expenses: [],
    payments: [],
    chat: [],
    packingList: [
      { id: "pack_1", item: "Swimwear & Beach Clothes", checkedBy: [], category: "Clothing" },
      { id: "pack_2", item: "Sunscreen SPF 50+", checkedBy: [], category: "Essentials" },
      { id: "pack_3", item: "Polarized Sunglasses", checkedBy: [], category: "Clothing" }
    ],
    members: [
      "Aarav", "Ananya", "Ishaan", "Diya", "Kabir", "Meera", "Rohan", "Siddharth", "Tanvi", "Aditya"
    ]
  };
}
