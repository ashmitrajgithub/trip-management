'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Shield, Users, Settings, AlertOctagon, ArrowLeft, Trash2, ShieldAlert, Check } from 'lucide-react';

interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  is_admin: boolean;
}

interface TripSettings {
  tripName: string;
  poolTarget: number;
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<TripSettings>({ tripName: "Susegad Goa '26", poolTarget: 5000 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasNoAdmins, setHasNoAdmins] = useState(false);
  const [sqlSetupRequired, setSqlSetupRequired] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'maintenance'>('members');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Settings Form States
  const [tripNameInput, setTripNameInput] = useState('');
  const [poolTargetInput, setPoolTargetInput] = useState('');
  
  const supabase = createClient();

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setCurrentUser(user);

      const res = await fetch('/api/admin');
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'SQL_SETUP_REQUIRED') {
          setSqlSetupRequired(true);
        } else if (res.status === 403) {
          setIsAdmin(false);
        } else {
          setError(data.error || 'Failed to load admin dashboard');
        }
        return;
      }

      setIsAdmin(data.isAdmin);
      setUsers(data.users || []);
      setSettings(data.settings || { tripName: "Susegad Goa '26", poolTarget: 5000 });
      setHasNoAdmins(data.hasNoAdmins || false);
      
      setTripNameInput(data.settings?.tripName || "Susegad Goa '26");
      setPoolTargetInput(String(data.settings?.poolTarget || 5000));
      
    } catch (err: any) {
      console.error(err);
      setError('An error occurred while fetching admin configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handlePromoteSelf = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'promote_self' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim ownership');
      
      setSuccess('Successfully promoted to Administrator!');
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    try {
      setError('');
      setSuccess('');
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_admin',
          targetUserId: userId,
          is_admin: !currentAdminStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle administrator role');
      
      setSuccess('User role updated successfully.');
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete profile "${name}"? This removes them from all splits, logs, and messages.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_user',
          targetUserId: userId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete profile');
      
      setSuccess(`Profile "${name}" removed successfully.`);
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          tripName: tripNameInput,
          poolTarget: Number(poolTargetInput)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');
      
      setSuccess('Trip configuration saved successfully.');
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetData = async (type: string, description: string) => {
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to permanently reset and clear all data in "${description}"? This action CANNOT be undone.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_data',
          type
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear data');
      
      setSuccess(`Successfully wiped all data in ${description}.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div className="sync-indicator" style={{ width: '12px', height: '12px', marginBottom: '16px' }} />
        <div>Verifying Admin Credentials...</div>
      </div>
    );
  }

  // Database tables not set up error screen
  if (sqlSetupRequired) {
    return (
      <div style={styles.container}>
        <div className="glass-card" style={styles.sqlSetupBox}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <ShieldAlert size={48} style={{ color: 'var(--accent-terracotta)', marginBottom: '8px' }} />
            <h1 style={styles.title}>Database Setup Required</h1>
            <p style={styles.subtitle}>
              The database schema has not been updated with the administrative control parameters yet.
            </p>
          </div>
          
          <div style={styles.sqlCodeBlockBox}>
            <p style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px', color: 'var(--primary-teal)' }}>
              Execute this script in your Supabase SQL Editor:
            </p>
            <pre style={styles.pre}>
{`-- 1. Add is_admin column to profiles
alter table public.profiles add column if not exists is_admin boolean default false;

-- 2. Create Trip Settings Table
create table if not exists public.trip_settings (
  key text primary key,
  value jsonb not null
);

-- Enable RLS on Trip Settings
alter table public.trip_settings enable row level security;

-- Policies for Trip Settings
create policy "Allow read access to authenticated" on public.trip_settings 
  for select to authenticated using (true);

create policy "Allow write access to admins" on public.trip_settings 
  for all to authenticated 
  using (
    (select is_admin from public.profiles where id = auth.uid()) = true
  )
  with check (
    (select is_admin from public.profiles where id = auth.uid()) = true
  );

-- Update profiles updates policy
drop policy if exists "Allow user update" on public.profiles;
create policy "Allow updates by owner or admin" on public.profiles 
  for update to authenticated 
  using (
    auth.uid() = id OR 
    (select is_admin from public.profiles where id = auth.uid()) = true
  )
  with check (
    auth.uid() = id OR 
    (select is_admin from public.profiles where id = auth.uid()) = true
  );`}
            </pre>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={() => window.location.href = '/'} className="btn-secondary" style={{ flex: 1 }}>
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <button onClick={fetchAdminData} className="btn-primary" style={{ flex: 1 }}>
              Retry Check
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized screen
  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <div className="glass-card" style={styles.box}>
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <AlertOctagon size={48} style={{ color: 'var(--accent-terracotta)', marginBottom: '12px' }} />
            <h2 style={styles.title}>Access Denied</h2>
            <p style={{ ...styles.subtitle, marginBottom: '24px' }}>
              You do not have administrative permissions to view this control panel.
            </p>
            <button onClick={() => window.location.href = '/'} className="btn-primary">
              <ArrowLeft size={16} /> Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appShell}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerTitleContainer}>
          <button onClick={() => window.location.href = '/'} style={styles.backBtn}>
            <ArrowLeft size={20} />
          </button>
          <Shield size={20} style={{ color: 'var(--accent-terracotta)' }} />
          <h1 style={styles.logoText}>Admin Console</h1>
        </div>
        <div style={styles.adminBadge}>
          System Administrator
        </div>
      </header>

      <div className="azulejo-pattern" />

      {/* Main Container */}
      <main style={styles.mainContent}>
        {/* Alerts */}
        {error && <div style={styles.errorAlert}>{error}</div>}
        {success && <div style={styles.successAlert}>{success}</div>}

        {/* Self-Promotion Callout */}
        {hasNoAdmins && (
          <div className="glass-card animate-fade-in" style={styles.bannerAlert}>
            <div style={{ flex: 1 }}>
              <h4 style={{ color: 'var(--primary-teal)', fontWeight: '800', fontSize: '14px' }}>No Administrators Found</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                There are currently no users marked as system administrators in the database. Promote yourself to configure settings.
              </p>
            </div>
            <button onClick={handlePromoteSelf} className="btn-primary" style={{ width: 'auto', padding: '8px 14px', fontSize: '13px' }}>
              Claim Owner Role
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={styles.tabBar}>
          <button 
            onClick={() => setActiveTab('members')}
            style={{ ...styles.tabBtn, borderBottom: activeTab === 'members' ? '3px solid var(--accent-terracotta)' : 'none', color: activeTab === 'members' ? 'var(--primary-teal)' : 'var(--text-muted)' }}
          >
            <Users size={16} />
            <span>Members</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            style={{ ...styles.tabBtn, borderBottom: activeTab === 'settings' ? '3px solid var(--accent-terracotta)' : 'none', color: activeTab === 'settings' ? 'var(--primary-teal)' : 'var(--text-muted)' }}
          >
            <Settings size={16} />
            <span>Trip Settings</span>
          </button>
          <button 
            onClick={() => setActiveTab('maintenance')}
            style={{ ...styles.tabBtn, borderBottom: activeTab === 'maintenance' ? '3px solid var(--accent-terracotta)' : 'none', color: activeTab === 'maintenance' ? 'var(--primary-teal)' : 'var(--text-muted)' }}
          >
            <AlertOctagon size={16} />
            <span>Maintenance</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div style={{ marginTop: '16px' }}>
          
          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="glass-card animate-fade-in" style={styles.card}>
              <div style={styles.cardHeader}>
                <h3>Registered Trip Members</h3>
                <span style={styles.badgeCount}>{users.length} registered</span>
              </div>
              <p style={styles.cardDesc}>
                Manage active users and promote trip planning coordinators to administrator privileges.
              </p>

              <div style={styles.userList}>
                {users.map((profile) => (
                  <div key={profile.id} style={styles.userRow}>
                    <div style={styles.userInfo}>
                      <div style={styles.avatar}>
                        {profile.display_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span style={styles.userName}>{profile.display_name}</span>
                        <span style={styles.userEmail}>{profile.email}</span>
                      </div>
                    </div>

                    <div style={styles.userActions}>
                      <button 
                        onClick={() => handleToggleAdmin(profile.id, profile.is_admin)}
                        style={{
                          ...styles.roleBtn,
                          backgroundColor: profile.is_admin ? 'var(--primary-teal-soft)' : 'transparent',
                          borderColor: profile.is_admin ? 'var(--primary-teal)' : 'var(--border-color)',
                          color: profile.is_admin ? 'var(--primary-teal)' : 'var(--text-muted)',
                        }}
                      >
                        {profile.is_admin ? 'Revoke Admin' : 'Make Admin'}
                      </button>
                      
                      {profile.id !== currentUser?.id && (
                        <button 
                          onClick={() => handleDeleteUser(profile.id, profile.display_name)}
                          style={styles.deleteBtn}
                          title="Delete member profile"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TRIP SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="glass-card animate-fade-in" style={styles.card}>
              <div style={styles.cardHeader}>
                <h3>Goa Trip Settings</h3>
              </div>
              <p style={styles.cardDesc}>
                Modify global settings that apply to all members.
              </p>

              <form onSubmit={handleSaveSettings} style={styles.form}>
                <div className="input-group">
                  <label className="input-label">Trip Display Title</label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={tripNameInput}
                    onChange={(e) => setTripNameInput(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Target Pool Contribution (INR per person)</label>
                  <input 
                    type="number" 
                    className="input-field"
                    value={poolTargetInput}
                    onChange={(e) => setPoolTargetInput(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ height: '46px', marginTop: '8px' }}>
                  Save Trip Settings
                </button>
              </form>
            </div>
          )}

          {/* MAINTENANCE TAB */}
          {activeTab === 'maintenance' && (
            <div className="glass-card animate-fade-in" style={styles.card}>
              <div style={styles.cardHeader}>
                <h3>Database Maintenance & Purges</h3>
              </div>
              <p style={styles.cardDesc}>
                Clear records to wipe test entries, reset chat timelines, or prepare for clean deployment.
              </p>

              <div style={styles.purgeList}>
                <div style={styles.purgeItem}>
                  <div>
                    <h4 style={styles.purgeTitle}>Group Chat Board</h4>
                    <p style={styles.purgeDesc}>Deletes all logs, images, and locations shared in chat.</p>
                  </div>
                  <button onClick={() => handleResetData('chat', 'Chat Board')} style={styles.purgeBtn}>
                    Reset Chat
                  </button>
                </div>

                <div style={styles.purgeItem}>
                  <div>
                    <h4 style={styles.purgeTitle}>Shared Expenses</h4>
                    <p style={styles.purgeDesc}>Deletes logged bills, balances, and calculated debt settlements.</p>
                  </div>
                  <button onClick={() => handleResetData('expenses', 'Shared Expenses')} style={styles.purgeBtn}>
                    Reset Expenses
                  </button>
                </div>

                <div style={styles.purgeItem}>
                  <div>
                    <h4 style={styles.purgeTitle}>Pool Payments</h4>
                    <p style={styles.purgeDesc}>Deletes pool deposits and resets contribution progress bars.</p>
                  </div>
                  <button onClick={() => handleResetData('payments', 'Pool Payments')} style={styles.purgeBtn}>
                    Reset Payments
                  </button>
                </div>

                <div style={styles.purgeItem}>
                  <div>
                    <h4 style={styles.purgeTitle}>Itinerary Activities</h4>
                    <p style={styles.purgeDesc}>Clears scheduled beach trips, meals, and estimated cost list.</p>
                  </div>
                  <button onClick={() => handleResetData('itinerary', 'Itinerary Activities')} style={styles.purgeBtn}>
                    Reset Itinerary
                  </button>
                </div>

                <div style={styles.purgeItem}>
                  <div>
                    <h4 style={styles.purgeTitle}>Packing Items Checklist</h4>
                    <p style={styles.purgeDesc}>Deletes checkmarks and checklist items from packing board.</p>
                  </div>
                  <button onClick={() => handleResetData('packing', 'Packing Checklist')} style={styles.purgeBtn}>
                    Reset Packing
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: 'var(--bg-sand)',
    color: 'var(--primary-teal)',
    fontFamily: 'var(--font-outfit), sans-serif',
    fontSize: '20px',
    fontWeight: '700',
  },
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: 'var(--bg-sand)',
  },
  box: {
    width: '100%',
    maxWidth: '400px',
    padding: '36px 24px',
    borderRadius: '24px',
    border: '1.5px solid var(--border-color)',
    backgroundColor: '#FFFFFF',
    boxShadow: 'var(--shadow-lg)',
  },
  sqlSetupBox: {
    width: '100%',
    maxWidth: '560px',
    padding: '32px 24px',
    borderRadius: '24px',
    border: '1.5px solid var(--border-color)',
    backgroundColor: '#FFFFFF',
    boxShadow: 'var(--shadow-lg)',
  },
  sqlCodeBlockBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.02)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    padding: '16px',
    marginTop: '16px',
  },
  pre: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono), monospace',
    color: 'var(--primary-teal-light)',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.5',
    maxHeight: '220px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--primary-teal)',
    fontFamily: 'var(--font-outfit), sans-serif',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '6px',
    lineHeight: '1.45',
  },
  appShell: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
    width: '100%',
    backgroundColor: 'var(--bg-sand)',
  },
  header: {
    backgroundColor: '#FFFFFF',
    height: '56px',
    padding: '0 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
    boxShadow: 'var(--shadow-sm)',
    flexShrink: 0,
  },
  headerTitleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '19px',
    fontWeight: '800',
    color: 'var(--primary-teal)',
    fontFamily: 'var(--font-outfit), sans-serif',
  },
  adminBadge: {
    backgroundColor: 'var(--accent-terracotta-soft)',
    color: 'var(--accent-terracotta)',
    fontSize: '11px',
    fontWeight: '800',
    padding: '4px 10px',
    borderRadius: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  mainContent: {
    flex: 1,
    padding: '20px 16px',
    maxWidth: '650px',
    width: '100%',
    margin: '0 auto',
  },
  errorAlert: {
    backgroundColor: 'var(--state-rust-soft)',
    color: 'var(--state-rust)',
    padding: '12px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '16px',
    border: '1px solid rgba(239, 68, 68, 0.15)',
  },
  successAlert: {
    backgroundColor: 'var(--state-green-soft)',
    color: 'var(--state-green)',
    padding: '12px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '16px',
    border: '1px solid rgba(16, 185, 129, 0.15)',
  },
  bannerAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1.5px solid var(--secondary-mustard)',
    borderLeft: '5px solid var(--secondary-mustard)',
    marginBottom: '20px',
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
    gap: '16px',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '10px 4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: '700',
    fontFamily: 'var(--font-inter), sans-serif',
    transition: 'all 0.15s ease',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    border: '1.5px solid var(--border-color)',
    padding: '24px 20px',
    boxShadow: 'var(--shadow-sm)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  badgeCount: {
    backgroundColor: 'var(--primary-teal-soft)',
    color: 'var(--primary-teal)',
    fontSize: '12px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '8px',
  },
  cardDesc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.45',
    marginBottom: '20px',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  userRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    backgroundColor: 'var(--bg-sand)',
    borderRadius: '12px',
    border: '1.5px solid var(--border-color)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    backgroundColor: 'var(--primary-teal)',
    color: 'var(--bg-sand)',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '800',
  },
  userName: {
    display: 'block',
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--primary-teal)',
  },
  userEmail: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  userActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  roleBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1.5px solid',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#EF4444',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  purgeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  purgeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '16px',
    borderBottom: '1.5px dashed var(--border-color)',
  },
  purgeTitle: {
    fontSize: '15px',
    fontWeight: '800',
    color: 'var(--primary-teal)',
  },
  purgeDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  purgeBtn: {
    backgroundColor: 'transparent',
    color: '#EF4444',
    border: '1.5px solid #EF4444',
    padding: '8px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};
