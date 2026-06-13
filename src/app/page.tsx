'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard, PiggyBank, MessageSquare, ChevronRight } from 'lucide-react';
import ItineraryTab from '@/components/ItineraryTab';
import ExpensesTab from '@/components/ExpensesTab';
import PaymentsTab from '@/components/PaymentsTab';
import ChatTab from '@/components/ChatTab';

const MEMBERS = [
  "Aarav",
  "Ananya",
  "Ishaan",
  "Diya",
  "Kabir",
  "Meera",
  "Rohan",
  "Siddharth",
  "Tanvi",
  "Aditya"
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses' | 'payments' | 'chat'>('itinerary');
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Read current user from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    const storedUser = localStorage.getItem('susegad_user');
    if (storedUser && MEMBERS.includes(storedUser)) {
      setCurrentUser(storedUser);
    }
  }, []);

  const selectUser = (name: string) => {
    localStorage.setItem('susegad_user', name);
    setCurrentUser(name);
    setIsProfileSwitcherOpen(false);
  };

  // Prevent SSR flash of selected user
  if (!isMounted) {
    return <div style={styles.loadingScreen}>Susegad Goa Tracker...</div>;
  }

  // If no user is logged in, show the profile chooser overlay
  if (!currentUser) {
    return (
      <div style={styles.welcomeContainer}>
        <div style={styles.welcomeBox}>
          <div style={styles.sunGraphic}>🏖️</div>
          <h1 style={styles.welcomeTitle}>Susegad Goa '26</h1>
          <p style={styles.welcomeSubtitle}>
            Welcome to the Goa group planner! Select your name to check the itinerary, log shared expenses, and chat.
          </p>

          <div style={styles.memberChooserGrid}>
            <div style={styles.gridHeader}>Who are you?</div>
            {MEMBERS.map(name => (
              <button 
                key={name} 
                onClick={() => selectUser(name)}
                style={styles.welcomeUserBtn}
              >
                <span>{name}</span>
                <ChevronRight size={16} style={{ opacity: 0.5 }} />
              </button>
            ))}
          </div>
        </div>
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
        {activeTab === 'expenses' && <ExpensesTab currentUser={currentUser} members={MEMBERS} />}
        {activeTab === 'payments' && <PaymentsTab currentUser={currentUser} members={MEMBERS} />}
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

      {/* Profile Switcher Modal */}
      {isProfileSwitcherOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Switch Member Profile</h2>
              <button 
                className="modal-close" 
                onClick={() => setIsProfileSwitcherOpen(false)}
              >
                <XIcon />
              </button>
            </div>
            
            <p style={styles.switcherSub}>
              Switching profiles lets you act as another group member. This changes who actions (chats, payments, expenses) are attributed to.
            </p>

            <div style={styles.switcherList}>
              {MEMBERS.map(name => (
                <button
                  key={name}
                  onClick={() => selectUser(name)}
                  style={{
                    ...styles.switcherUserBtn,
                    backgroundColor: currentUser === name ? 'var(--primary-teal-soft)' : '#FFFFFF',
                    borderColor: currentUser === name ? 'var(--primary-teal)' : 'var(--border-color)',
                  }}
                >
                  <div style={styles.switcherUserLeft}>
                    <span style={{
                      ...styles.avatarCircle, 
                      backgroundColor: currentUser === name ? 'var(--primary-teal)' : 'var(--secondary-mustard)',
                      color: 'var(--bg-sand)'
                    }}>
                      {name.substring(0, 1)}
                    </span>
                    <span style={{ fontWeight: currentUser === name ? '600' : '400' }}>
                      {name} {currentUser === name ? '(You)' : ''}
                    </span>
                  </div>
                  {currentUser === name && (
                    <span style={{ color: 'var(--primary-teal)', fontSize: '12px', fontWeight: 'bold' }}>Active</span>
                  )}
                </button>
              ))}
            </div>
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
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: 'var(--bg-sand)',
    color: 'var(--primary-teal)',
    fontFamily: 'var(--font-outfit), sans-serif',
    fontSize: '22px',
    fontWeight: '700',
  },
  welcomeContainer: {
    backgroundColor: 'var(--bg-sand)',
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  welcomeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    border: '1.5px solid var(--border-color)',
    padding: '30px 24px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: 'var(--shadow-lg)',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  sunGraphic: {
    fontSize: '44px',
    marginBottom: '10px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--primary-teal)',
    fontFamily: 'var(--font-outfit), sans-serif',
    marginBottom: '8px',
  },
  welcomeSubtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    marginBottom: '24px',
  },
  memberChooserGrid: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  gridHeader: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    textAlign: 'left' as const,
    marginBottom: '4px',
  },
  welcomeUserBtn: {
    backgroundColor: 'var(--bg-sand)',
    border: '1.5px solid var(--border-color)',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    fontFamily: 'var(--font-inter), sans-serif',
    fontSize: '15px',
    color: 'var(--text-charcoal)',
    fontWeight: '600',
    width: '100%',
    transition: 'all 0.15s ease',
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
    paddingBottom: '90px', // Extra buffer for sticky bottom tabs
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
  switcherSub: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.45',
    marginBottom: '16px',
  },
  switcherList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    maxHeight: '350px',
    overflowY: 'auto' as const,
    padding: '4px',
  },
  switcherUserBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    border: '1.5px solid',
    borderRadius: '10px',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'var(--font-inter), sans-serif',
    fontSize: '14px',
    transition: 'all 0.15s ease',
  },
  switcherUserLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
};
