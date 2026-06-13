import { NextResponse } from 'next/server';
import { readDb, writeDb, ChatMessage } from '@/lib/db';
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
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: true })
      .limit(100);
    
    if (!error && data) {
      const mappedData = data.map((item: any) => ({
        id: item.id,
        sender: item.sender,
        text: item.text,
        timestamp: item.timestamp,
        type: item.type,
        mediaUrl: item.media_url,
        reactions: item.reactions || {}
      }));
      return NextResponse.json(mappedData);
    } else if (error) {
      console.error("Supabase GET chat messages error:", error);
    }
  }

  // Fallback (for local development fallback mode if Supabase is disabled)
  const db = await readDb(supabase);
  const limit = 100;
  const recentMessages = db.chat.slice(-limit);
  return NextResponse.json(recentMessages);
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
    const { sender, text, type, mediaUrl, action, messageId, emoji } = body;

    // Resolve members list
    let membersList = MEMBERS_FALLBACK;
    if (supabase) {
      const { data: profilesData } = await supabase.from('profiles').select('display_name');
      if (profilesData && profilesData.length > 0) {
        membersList = profilesData.map((p: any) => p.display_name);
      }
    }

    // Handle reaction toggles
    if (action === 'react') {
      if (!messageId || !emoji || !sender) {
        return NextResponse.json({ error: "Missing reaction details" }, { status: 400 });
      }

      if (!membersList.includes(sender)) {
        return NextResponse.json({ error: "Invalid sender" }, { status: 400 });
      }

      if (supabase) {
        // Fetch current message reactions
        const { data: msgData, error: fetchError } = await supabase
          .from('chat_messages')
          .select('reactions')
          .eq('id', messageId)
          .single();
        
        if (!fetchError && msgData) {
          const reactions = msgData.reactions || {};
          
          if (!reactions[emoji]) {
            reactions[emoji] = [];
          }

          if (reactions[emoji].includes(sender)) {
            reactions[emoji] = reactions[emoji].filter((name: string) => name !== sender);
            if (reactions[emoji].length === 0) {
              delete reactions[emoji];
            }
          } else {
            reactions[emoji].push(sender);
          }

          // Update reactions column
          const { error: updateError } = await supabase
            .from('chat_messages')
            .update({ reactions })
            .eq('id', messageId);

          if (!updateError) {
            return NextResponse.json({ success: true });
          } else {
            console.error("Supabase UPDATE reactions error:", updateError);
          }
        } else {
          console.error("Supabase SELECT message for reaction error:", fetchError);
        }
      }

      // Fallback
      const db = await readDb(supabase);
      const msgIndex = db.chat.findIndex(m => m.id === messageId);
      if (msgIndex === -1) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }

      const message = db.chat[msgIndex];
      if (!message.reactions) {
        message.reactions = {};
      }

      if (!message.reactions[emoji]) {
        message.reactions[emoji] = [];
      }

      if (message.reactions[emoji].includes(sender)) {
        message.reactions[emoji] = message.reactions[emoji].filter(name => name !== sender);
        if (message.reactions[emoji].length === 0) {
          delete message.reactions[emoji];
        }
      } else {
        message.reactions[emoji].push(sender);
      }

      db.chat[msgIndex] = message;
      await writeDb(db, supabase);

      return NextResponse.json({ success: true, message });
    }

    // Handle normal message posting
    if (!sender || !text || text.trim() === "") {
      return NextResponse.json({ error: "Sender and text content are required" }, { status: 400 });
    }

    if (!membersList.includes(sender)) {
      return NextResponse.json({ error: `Invalid sender name: ${sender}` }, { status: 400 });
    }

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sender,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      type: type || 'text',
      mediaUrl: mediaUrl || undefined,
      reactions: {}
    };

    if (supabase) {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          id: newMessage.id,
          sender: newMessage.sender,
          text: newMessage.text,
          timestamp: newMessage.timestamp,
          type: newMessage.type,
          media_url: newMessage.mediaUrl,
          reactions: newMessage.reactions
        }]);
      
      if (!error) {
        return NextResponse.json({ success: true, message: newMessage });
      } else {
        console.error("Supabase POST message error:", error);
      }
    }

    // Fallback
    const db = await readDb(supabase);
    db.chat.push(newMessage);
    
    if (db.chat.length > 500) {
      db.chat = db.chat.slice(-300);
    }

    await writeDb(db, supabase);

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Chat POST error:", error);
    return NextResponse.json({ error: "Failed to process chat action" }, { status: 500 });
  }
}
