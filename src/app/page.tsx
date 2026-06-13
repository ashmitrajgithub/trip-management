'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard, PiggyBank, MessageSquare } from 'lucide-react';
import ItineraryTab from '@/components/ItineraryTab';
import ExpensesTab from '@/components/ExpensesTab';
import PaymentsTab from '@/components/PaymentsTab';
import ChatTab from '@/components/ChatTab';
import { createClient } from '@/utils/supabase/client';

const DEFAULT_MEMBERS = [
  "Aarav", "Ananya", "Ishaan", "Diya", "Kabir", "Meera", "Rohan", "Siddharth", "Tanvi", "Aditya"
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [members, setMembers] = useState<string[]>(DEFAULT_MEMBERS);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses' | 'payments' | 'chat'>('itinerary');
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    setIsMounted(true);
    const initSession = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user || userError) {
          window.location.href = '/login';
          return;
        }

        setCurrentUserEmail(user.email || '');

        // Try to get profile
        let displayName = '';
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        if (profile && profile.display_name) {
          displayName = profile.display_name;
        } else {
          // Fallback to metadata
          displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
          
          // Self-heal profile insertion
          try {
            await supabase.from('profiles').insert([{
              id: user.id,
              display_name: displayName,
              email: user.email || ''
            }]);
          } catch (e) {
            console.error('Failed to auto-insert profile:', e);
          }
        }

        setCurrentUser(displayName);

        // Fetch dynamic group members list
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('display_name')
          .order('display_name', { ascending: true });

        if (profiles && profiles.length > 0) {
          setMembers(profiles.map((p: any) => p.display_name));
        } else {
          // If no profiles loaded, use default fallback including current user
          const fallbackList = [...DEFAULT_MEMBERS];
          if (!fallbackList.includes(displayName)) {
            fallbackList.push(displayName);
          }
          setMembers(fallbackList);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  const handleLogOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (e) {
      console.error('Sign out error:', e);
      window.location.href = '/login';
    }
  };

  // Prevent SSR flash of selected user
  if (!isMounted || loading) {
    return (
      <div style={styles.loadingScreen}>
        <div className="sync-indicator" style={{ width: '12px', height: '12px', marginBottom: '16px' }} />
        <div>Susegad Goa Tracker...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={styles.loadingScreen}>
        <div>Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div style={styles.appShell}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.headerTitleContainer}>
          <span style={styles.palmIcon}>🌴</span>
          <h1 style={styles.logoText}>Susegad Goa</h1>
          <span className="sync-indicator" title="Connected to Supabase" />
        </div>
        <button 
          onClick={() => setIsProfileSwitcherOpen(true)}
          style={styles.profileBtn}
        >
          <span style={styles.avatarCircle}>{currentUser.substring(0, 1)}</span>
          <span style={styles.profileName}>{currentUser}</span>
        </button>
      </header>

      {/* Azulejo Tile Accent Line */}
      <div className="azulejo-pattern" />

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {activeTab === 'itinerary' && <ItineraryTab currentUser={currentUser} />}
        {activeTab === 'expenses' && <ExpensesTab currentUser={currentUser} members={members} />}
        {activeTab === 'payments' && <PaymentsTab currentUser={currentUser} members={members} />}
        {activeTab === 'chat' && <ChatTab currentUser={currentUser} />}
      </main>

      {/* Bottom Sticky Tab Navigation */}
      <nav style={styles.bottomNav}>
        <button 
          onClick={() => setActiveTab('itinerary')}
          style={{
            ...styles.navItem,
            color: activeTab === 'itinerary' ? 'var(--primary-teal)' : 'var(--text-muted)'
          }}
        >
          <Calendar size={22} style={activeTab === 'itinerary' ? styles.activeIcon : {}} />
          <span style={styles.navLabel}>Itinerary</span>
        </button>

        <button 
          onClick={() => setActiveTab('expenses')}
          style={{
            ...styles.navItem,
            color: activeTab === 'expenses' ? 'var(--primary-teal)' : 'var(--text-muted)'
          }}
        >
          <CreditCard size={22} style={activeTab === 'expenses' ? styles.activeIcon : {}} />
          <span style={styles.navLabel}>Expenses</span>
        </button>

        <button 
          onClick={() => setActiveTab('payments')}
          style={{
            ...styles.navItem,
            color: activeTab === 'payments' ? 'var(--primary-teal)' : 'var(--text-muted)'
          }}
        >
          <PiggyBank size={22} style={activeTab === 'payments' ? styles.activeIcon : {}} />
          <span style={styles.navLabel}>Pool</span>
        </button>

        <button 
          onClick={() => setActiveTab('chat')}
          style={{
            ...styles.navItem,
            color: activeTab === 'chat' ? 'var(--primary-teal)' : 'var(--text-muted)'
          }}
        >
          <MessageSquare size={22} style={activeTab === 'chat' ? styles.activeIcon : {}} />
          <span style={styles.navLabel}>Chat</span>
        </button>
      </nav>

      {/* Account Details Modal */}
      {isProfileSwitcherOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={styles.accountModalContent}>
            <div className="modal-header">
              <h2>My Account</h2>
              <button 
                className="modal-close" 
                onClick={() => setIsProfileSwitcherOpen(false)}
              >
                <XIcon />
              </button>
            </div>
            
            <div style={styles.accountDetailsBox}>
              <div style={styles.bigAvatarCircle}>
                {currentUser.substring(0, 2).toUpperCase()}
              </div>
              <h3 style={styles.accountName}>{currentUser}</h3>
              <p style={styles.accountEmail}>{currentUserEmail}</p>
              
              <div style={styles.statusBadgeRow}>
                <span className="sync-indicator" style={{ marginLeft: 0, marginRight: '6px' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  Connected to Supabase Auth
                </span>
              </div>
            </div>

            <button 
              onClick={handleLogOut}
              className="btn-primary"
              style={{
                backgroundColor: 'var(--accent-terracotta)',
                marginTop: '16px',
                height: '46px',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline SVGs/Helper components
function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
  appShell: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100dvh',
    width: '100%',
    position: 'relative' as const,
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
    gap: '6px',
  },
  palmIcon: {
    fontSize: '18px',
  },
  logoText: {
    fontSize: '19px',
    fontWeight: '800',
    color: 'var(--primary-teal)',
    fontFamily: 'var(--font-outfit), sans-serif',
  },
  profileBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--bg-sand)',
    border: '1px solid var(--border-color)',
    padding: '5px 10px',
    borderRadius: '20px',
    cursor: 'pointer',
  },
  avatarCircle: {
    backgroundColor: 'var(--primary-teal)',
    color: 'var(--bg-sand)',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '800',
    textTransform: 'uppercase' as const,
  },
  profileName: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--primary-teal)',
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px',
    paddingBottom: '90px',
    backgroundColor: 'var(--bg-sand)',
  },
  bottomNav: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    height: '66px',
    borderTop: '1px solid var(--border-color)',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    alignItems: 'center',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    boxShadow: '0 -4px 10px rgba(45, 42, 38, 0.04)',
    zIndex: 500,
  },
  navItem: {
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    fontFamily: 'var(--font-inter), sans-serif',
  },
  activeIcon: {
    transform: 'scale(1.05)',
    transition: 'transform 0.15s ease',
  },
  navLabel: {
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.01em',
  },
  accountModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: '28px',
    borderTopRightRadius: '28px',
    width: '100%',
    maxWidth: '420px',
    padding: '30px 24px',
    boxShadow: '0 -12px 36px rgba(15, 23, 42, 0.15)',
  },
  accountDetailsBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '24px 16px',
    backgroundColor: 'var(--bg-sand)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    marginBottom: '8px',
  },
  bigAvatarCircle: {
    backgroundColor: 'var(--primary-teal)',
    color: 'var(--bg-sand)',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '800',
    marginBottom: '12px',
    border: '2px solid rgba(255, 255, 255, 0.8)',
    boxShadow: 'var(--shadow-md)',
  },
  accountName: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--primary-teal)',
    fontFamily: 'var(--font-outfit), sans-serif',
  },
  accountEmail: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    marginTop: '4px',
    marginBottom: '16px',
  },
  statusBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid rgba(16, 185, 129, 0.12)',
  },
};
