'use client';

import React, { useState, useEffect } from 'react';
import { PiggyBank, Plus, X, Trash2, Calendar, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { Payment } from '@/lib/db';

interface MemberProgress {
  name: string;
  contributed: number;
  target: number;
  remaining: number;
  percentage: number;
}

interface PaymentsTabProps {
  currentUser: string;
  members: string[];
}

export default function PaymentsTab({ currentUser, members }: PaymentsTabProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPool, setTotalPool] = useState(0);
  const [targetPerPerson, setTargetPerPerson] = useState(5000);
  const [totalTargetPool, setTotalTargetPool] = useState(50000);
  const [memberProgress, setMemberProgress] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [payerName, setPayerName] = useState(currentUser);
  const [amount, setAmount] = useState('5000');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments');
      if (!res.ok) throw new Error('Failed to fetch payments');
      const data = await res.json();
      setPayments(data.payments);
      setTotalPool(data.totalPoolCollected);
      setTargetPerPerson(data.targetContributionPerPerson);
      setTotalTargetPool(data.totalTargetPool);
      setMemberProgress(data.memberProgress);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Sync default payer when current user changes
  useEffect(() => {
    setPayerName(currentUser);
    // Find what this user owes and default the input to that!
    const userProg = memberProgress.find(p => p.name === currentUser);
    if (userProg && userProg.remaining > 0) {
      setAmount(userProg.remaining.toString());
    } else {
      setAmount('5000');
    }
  }, [currentUser, memberProgress]);

  const openAddModal = () => {
    setPayerName(currentUser);
    const userProg = memberProgress.find(p => p.name === currentUser);
    if (userProg && userProg.remaining > 0) {
      setAmount(userProg.remaining.toString());
    } else {
      setAmount('5000');
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerName || !amount || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const body = {
      name: payerName,
      amount: Number(amount)
    };

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to log payment');

      setIsOpen(false);
      fetchPayments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment log?')) return;
    try {
      const res = await fetch(`/api/payments?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete payment');
      fetchPayments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const poolPercentage = Math.min(100, Math.round((totalPool / totalTargetPool) * 100)) || 0;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '20px' }}>
      {/* Pool Header card */}
      <div style={styles.poolCard}>
        <div style={styles.poolInfo}>
          <div>
            <span style={styles.poolLabel}>TOTAL ADVANCE POOL COLLECTED</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
              <span className="mono-amount" style={styles.poolValue}>
                ₹{totalPool.toLocaleString('en-IN')}
              </span>
              <span style={styles.poolTarget}>
                / ₹{totalTargetPool.toLocaleString('en-IN')} Target
              </span>
            </div>
          </div>
          <div style={styles.poolIconWrapper}>
            <PiggyBank size={28} style={{ color: 'var(--primary-teal)' }} />
          </div>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressBarBg}>
          <div style={{ ...styles.progressBarFill, width: `${poolPercentage}%` }} />
        </div>
        <div style={styles.progressText}>
          <span>{poolPercentage}% collected</span>
          <span>₹{targetPerPerson.toLocaleString('en-IN')} per person</span>
        </div>

        <button onClick={openAddModal} className="btn-primary" style={styles.addBtn}>
          <Plus size={18} /> Record Contribution
        </button>
      </div>

      {/* Contributors Progress */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>CONTRIBUTION STATUS</h2>
        <div style={styles.statusList}>
          {memberProgress.map((prog) => {
            const isCompleted = prog.contributed >= prog.target;
            return (
              <div key={prog.name} style={styles.statusRow}>
                <div style={styles.memberMeta}>
                  <span style={styles.memberName}>{prog.name}</span>
                  {isCompleted ? (
                    <span style={styles.badgeCompleted}>
                      <CheckCircle2 size={12} /> Paid
                    </span>
                  ) : (
                    <span style={styles.badgePending}>
                      <AlertCircle size={12} /> ₹{prog.remaining.toLocaleString('en-IN')} owed
                    </span>
                  )}
                </div>

                <div style={styles.progressCol}>
                  <div style={styles.memberAmtRow}>
                    <span className="mono-amount" style={styles.memberPaidAmt}>
                      ₹{prog.contributed.toLocaleString('en-IN')}
                    </span>
                    <span style={styles.memberTargetAmt}>/ ₹{prog.target}</span>
                  </div>
                  <div style={styles.smallProgressBg}>
                    <div 
                      style={{ 
                        ...styles.smallProgressFill, 
                        width: `${prog.percentage}%`,
                        backgroundColor: isCompleted ? 'var(--state-green)' : 'var(--secondary-mustard)' 
                      }} 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payments History */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>TRANSACTION HISTORY</h2>
        {loading && payments.length === 0 ? (
          <div style={styles.centerText}>Loading payments...</div>
        ) : payments.length === 0 ? (
          <div style={styles.emptyState}>
            <PiggyBank size={48} style={{ color: 'var(--primary-teal)', opacity: 0.4 }} />
            <h3>No payments recorded yet</h3>
            <p>Log the cash advance payments when someone deposits into the pool.</p>
          </div>
        ) : (
          <div style={styles.historyList}>
            {payments.map((p) => (
              <div key={p.id} style={styles.historyCard}>
                <div style={styles.historyLeft}>
                  <div style={styles.userAvatar}>
                    {p.name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 style={styles.historyUser}>{p.name}</h3>
                    <div style={styles.historyMeta}>
                      <Calendar size={12} />
                      <span>{new Date(p.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
                <div style={styles.historyRight}>
                  <span className="mono-amount" style={styles.historyAmount}>
                    + ₹{p.amount.toLocaleString('en-IN')}
                  </span>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    style={styles.deleteBtn}
                    title="Delete record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Record Pool Deposit</h2>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Who Deposited?</label>
                <select 
                  className="input-field"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                >
                  {members.map(m => (
                    <option key={m} value={m}>{m} {m === currentUser ? '(You)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Amount Deposited (₹)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                Log Payment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  poolCard: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid var(--border-color)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '24px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  poolInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poolLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  poolValue: {
    fontSize: '24px',
    color: 'var(--primary-teal)',
    fontWeight: '700',
  },
  poolTarget: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginLeft: '6px',
  },
  poolIconWrapper: {
    backgroundColor: 'var(--primary-teal-soft)',
    borderRadius: '12px',
    padding: '10px',
  },
  progressBarBg: {
    backgroundColor: 'rgba(27, 75, 90, 0.08)',
    height: '10px',
    borderRadius: '5px',
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: 'var(--primary-teal)',
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.4s ease-out',
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
  addBtn: {
    marginTop: '6px',
  },
  section: {
    marginBottom: '26px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '800',
    color: 'var(--primary-teal)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    marginBottom: '12px',
  },
  statusList: {
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    borderBottom: '1px solid rgba(27, 75, 90, 0.06)',
  },
  memberMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  memberName: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-charcoal)',
  },
  badgeCompleted: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '10px',
    color: 'var(--state-green)',
    fontWeight: '600',
  },
  badgePending: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '10px',
    color: 'var(--secondary-mustard)',
    fontWeight: '600',
  },
  progressCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
    width: '100px',
  },
  memberAmtRow: {
    fontSize: '12px',
    display: 'flex',
    alignItems: 'baseline',
  },
  memberPaidAmt: {
    fontWeight: '600',
    color: 'var(--text-charcoal)',
  },
  memberTargetAmt: {
    color: 'var(--text-muted)',
    fontSize: '10px',
  },
  smallProgressBg: {
    backgroundColor: 'rgba(45, 42, 38, 0.06)',
    height: '4px',
    borderRadius: '2px',
    width: '100%',
    overflow: 'hidden',
  },
  smallProgressFill: {
    height: '100%',
    borderRadius: '2px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '12px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
  },
  historyLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userAvatar: {
    backgroundColor: 'var(--secondary-mustard-soft)',
    color: 'var(--accent-terracotta)',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '12px',
    border: '1px solid var(--secondary-mustard)',
  },
  historyUser: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-charcoal)',
  },
  historyMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  historyRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  historyAmount: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--state-green)',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(45, 42, 38, 0.25)',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  centerText: {
    textAlign: 'center' as const,
    padding: '30px 20px',
    color: 'var(--text-muted)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    padding: '40px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '16px',
    border: '1.5px dashed var(--border-color)',
    gap: '12px',
  },
};
