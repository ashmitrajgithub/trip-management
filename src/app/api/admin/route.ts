import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

const DEFAULT_SETTINGS = {
  tripName: "Susegad Goa '26",
  poolTarget: 5000
};

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    if (!supabase) {
      return NextResponse.json({ error: "Supabase client not initialized" }, { status: 500 });
    }

    // Authenticate the session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the profiles table and is_admin column exist by doing a trial select
    const { data: profilesList, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, email, is_admin');

    if (profilesError) {
      console.error("Supabase GET profiles error:", profilesError);
      // Check for missing column/table indicators
      if (profilesError.code === 'PGRST205' || profilesError.message.includes('is_admin')) {
        return NextResponse.json({
          error: "Admin tables or columns not set up. Please run the SQL Setup Script in your Supabase SQL Editor.",
          code: "SQL_SETUP_REQUIRED"
        }, { status: 400 });
      }
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Determine admin status
    // Check if any registered profile is already marked as admin
    const hasAdmins = profilesList.some((p: any) => p.is_admin === true);
    
    // The current user
    const currentProfile = profilesList.find((p: any) => p.id === user.id);
    
    // If there are no admins in the system yet, allow self-healing promotion for the logged in user
    const isAdmin = currentProfile?.is_admin || !hasAdmins;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required", isAdmin: false }, { status: 403 });
    }

    // Fetch trip settings
    let settings = DEFAULT_SETTINGS;
    const { data: settingsData, error: settingsError } = await supabase
      .from('trip_settings')
      .select('value')
      .eq('key', 'trip_info')
      .single();

    if (!settingsError && settingsData) {
      settings = settingsData.value;
    }

    return NextResponse.json({
      isAdmin: true,
      users: profilesList,
      settings,
      hasNoAdmins: !hasAdmins
    });

  } catch (error: any) {
    console.error("Admin GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to process admin check" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    if (!supabase) {
      return NextResponse.json({ error: "Supabase client not initialized" }, { status: 500 });
    }

    // Authenticate the session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin access
    const { data: profilesList, error: profilesError } = await supabase
      .from('profiles')
      .select('id, is_admin');

    if (profilesError) {
      return NextResponse.json({
        error: "Profiles lookup failed. Verify table setup.",
        code: "SQL_SETUP_REQUIRED"
      }, { status: 400 });
    }

    const hasAdmins = profilesList.some((p: any) => p.is_admin === true);
    const currentProfile = profilesList.find((p: any) => p.id === user.id);
    const isAdmin = currentProfile?.is_admin || !hasAdmins;

    const body = await req.json();
    const { action } = body;

    // A user is allowed to promote themselves if there are no admins in the system
    if (action === 'promote_self') {
      if (hasAdmins && !currentProfile?.is_admin) {
        return NextResponse.json({ error: "Forbidden: Cannot promote yourself when admins already exist." }, { status: 403 });
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', user.id);

      if (updateError) throw updateError;
      return NextResponse.json({ success: true, message: "Promoted to administrator." });
    }

    // All other actions strictly require admin authorization
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin rights required" }, { status: 403 });
    }

    switch (action) {
      case 'toggle_admin': {
        const { targetUserId, is_admin } = body;
        if (!targetUserId) {
          return NextResponse.json({ error: "Target User ID is required" }, { status: 400 });
        }

        // Prevent self-demotion if it would leave the system with no admins
        if (targetUserId === user.id && !is_admin) {
          const otherAdmins = profilesList.filter((p: any) => p.is_admin && p.id !== user.id);
          if (otherAdmins.length === 0) {
            return NextResponse.json({ error: "Cannot demote yourself. You are the last remaining administrator." }, { status: 400 });
          }
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_admin })
          .eq('id', targetUserId);

        if (updateError) throw updateError;
        return NextResponse.json({ success: true });
      }

      case 'delete_user': {
        const { targetUserId } = body;
        if (!targetUserId) {
          return NextResponse.json({ error: "Target User ID is required" }, { status: 400 });
        }

        if (targetUserId === user.id) {
          return NextResponse.json({ error: "Cannot delete your own profile." }, { status: 400 });
        }

        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', targetUserId);

        if (deleteError) throw deleteError;
        return NextResponse.json({ success: true });
      }

      case 'update_settings': {
        const { tripName, poolTarget } = body;
        if (!tripName || !poolTarget) {
          return NextResponse.json({ error: "Trip Name and Pool Target are required" }, { status: 400 });
        }

        const { error: settingsError } = await supabase
          .from('trip_settings')
          .upsert([{
            key: 'trip_info',
            value: { tripName, poolTarget: Number(poolTarget) }
          }]);

        if (settingsError) throw settingsError;
        return NextResponse.json({ success: true });
      }

      case 'reset_data': {
        const { type } = body;
        if (!type) {
          return NextResponse.json({ error: "Reset type is required" }, { status: 400 });
        }

        let tableName = '';
        if (type === 'chat') tableName = 'chat_messages';
        else if (type === 'expenses') tableName = 'expenses';
        else if (type === 'payments') tableName = 'payments';
        else if (type === 'itinerary') tableName = 'activities';
        else if (type === 'packing') tableName = 'packing_items';
        else {
          return NextResponse.json({ error: "Invalid reset type" }, { status: 400 });
        }

        // Delete all rows in the target table
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .neq('id', 'dummy_non_existent_id'); // standard deletion filter matching everything

        if (deleteError) throw deleteError;
        return NextResponse.json({ success: true, message: `Cleared all rows in ${tableName}.` });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Admin POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute administrative task" }, { status: 500 });
  }
}
