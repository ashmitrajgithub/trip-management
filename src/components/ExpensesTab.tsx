'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Receipt, User, Check, X, Trash2, CheckSquare, Square, RefreshCw, BarChart3, Scan, Camera } from 'lucide-react';
import { Expense } from '@/lib/db';

interface MemberBalance {
  name: string;
  paid: number;
  spent: number;
  netBalance: number;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

interface ExpensesTabProps {
  currentUser: string;
  members: string[];
}

export default function ExpensesTab({ currentUser, members }: ExpensesTabProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalSpend, setTotalSpend] = useState(0);
  const [memberBalances, setMemberBalances] = useState<MemberBalance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser);
  const [splitAmong, setSplitAmong] = useState<string[]>(members);
  const [category, setCategory] = useState('Food');

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/expenses');
      if (!res.ok) throw new Error('Failed to fetch expenses');
      const data = await res.json();
      setExpenses(data.expenses);
      setTotalSpend(data.totalGroupSpend);
      setMemberBalances(data.memberBalances);
      setSettlements(data.settlements);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Update default payer when current user changes
  useEffect(() => {
    setPaidBy(currentUser);
  }, [currentUser]);

  const openAddModal = () => {
    setDescription('');
    setAmount('');
    setPaidBy(currentUser);
    setSplitAmong(members);
    setCategory('Food');
    setIsScanning(false);
    setIsOpen(true);
  };

  const handleToggleSplitMember = (name: string) => {
    if (splitAmong.includes(name)) {
      if (splitAmong.length > 1) {
        setSplitAmong(splitAmong.filter(n => n !== name));
      }
    } else {
      setSplitAmong([...splitAmong, name]);
    }
  };

  const handleSelectAll = () => {
    setSplitAmong(members);
  };

  const handleSelectNone = () => {
    setSplitAmong([currentUser]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || Number(amount) <= 0 || splitAmong.length === 0) {
      alert('Please fill out all fields.');
      return;
    }

    const body = {
      description,
      amount: Number(amount),
      paidBy,
      splitAmong,
      category
    };

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to create expense');

      setIsOpen(false);
      fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense? This will recalculate everyone\'s balances.')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete expense');
      fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSettleUp = async (settlement: Settlement) => {
    const confirmMsg = `Record a payment of ₹${settlement.amount} from ${settlement.from} to ${settlement.to}?`;
    if (!confirm(confirmMsg)) return;

    const body = {
      description: `Settlement: ${settlement.from} ➡️ ${settlement.to}`,
      amount: settlement.amount,
      paidBy: settlement.from,
      splitAmong: [settlement.to],
      category: 'Other'
    };

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to record settlement');
      fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Simulated OCR Scanning Action
  const handleScanReceipt = () => {
    setIsScanning(true);
    setScanStatus('Connecting to scanner sensor...');
    
    setTimeout(() => {
      setScanStatus('Analyzing receipt contents (Goan Shack format)...');
    }, 800);

    setTimeout(() => {
      // Pick random mock receipt details
      const mockReceipts = [
        { desc: "Britto's Shack Dinner & Cocktails 🍹", amt: "4850", cat: "Food" },
        { desc: "South Goa Cab fare 🚕", amt: "3200", cat: "Travel" },
        { desc: "Thalassa Siolim Booking 🍽️", amt: "7500", cat: "Food" },
        { desc: "Anjuna Flea Market cashew feni 🍾", amt: "1200", cat: "Drinks" }
      ];
      const selected = mockReceipts[Math.floor(Math.random() * mockReceipts.length)];
      
      setDescription(selected.desc);
      setAmount(selected.amt);
      setCategory(selected.cat);
      setIsScanning(false);
      setScanStatus('');
    }, 2200);
  };

  // Group spends by category
  const categoryTotals: Record<string, number> = {
    Food: 0,
    Stay: 0,
    Travel: 0,
    Activities: 0,
    Drinks: 0,
    Other: 0
  };

  expenses.forEach(exp => {
    const cat = exp.category || 'Other';
    if (categoryTotals[cat] !== undefined) {
      categoryTotals[cat] += Number(exp.amount);
    } else {
      categoryTotals['Other'] += Number(exp.amount);
    }
  });

  const getCategoryColorClass = (cat: string) => {
    switch (cat) {
      case 'Stay': return 'color-stay';
      case 'Food': return 'color-food';
      case 'Travel': return 'color-travel';
      case 'Activities': return 'color-activities';
      case 'Drinks': return 'color-drinks';
      default: return 'color-other';
    }
  };

  const myBalance = memberBalances.find(b => b.name === currentUser);

  // Compute Debt SVG nodes coordinates
  const getDebtFlowchart = () => {
    if (settlements.length === 0) return null;
    
    // Find all unique people involved
    const uniquePeople = Array.from(new Set([
      ...settlements.map(s => s.from),
      ...settlements.map(s => s.to)
    ]));

    // Let's divide them into debtors (who owe) vs creditors (who get back)
    // Map them positions
    const debtors = uniquePeople.filter(name => {
      const bal = memberBalances.find(b => b.name === name);
      return bal && bal.netBalance < 0;
    });

    const creditors = uniquePeople.filter(name => {
      const bal = memberBalances.find(b => b.name === name);
      return bal && bal.netBalance > 0;
    });

    const width = 340;
    const height = Math.max(debtors.length, creditors.length) * 80 + 40;

    // Debtors column on the left (x: 50)
    const debtorCoords: Record<string, { x: number; y: number }> = {};
    debtors.forEach((name, i) => {
      debtorCoords[name] = { x: 50, y: 50 + i * 80 };
    });

    // Creditors column on the right (x: 290)
    const creditorCoords: Record<string, { x: number; y: number }> = {};
    creditors.forEach((name, i) => {
      creditorCoords[name] = { x: 290, y: 50 + i * 80 };
    });

    return {
      width,
      height,
      debtors,
      creditors,
      debtorCoords,
      creditorCoords,
      settlements
    };
  };

  const flowchart = getDebtFlowchart();

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '30px' }}>
      {/* Financial Health Header */}
      <div className="glass-card" style={styles.summaryCard}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>TOTAL TRIP SPEND</span>
            <span className="mono-amount" style={styles.summaryValueBig}>
              ₹{totalSpend.toLocaleString('en-IN')}
            </span>
          </div>

          <div style={{ ...styles.summaryItem, borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
            <span style={styles.summaryLabel}>YOUR STATUS ({currentUser})</span>
            {myBalance ? (
              myBalance.netBalance > 0.01 ? (
                <div style={styles.positiveBalance}>
                  <span style={styles.balanceStatus}>YOU GET BACK</span>
                  <span className="mono-amount" style={styles.balanceValue}>
                    ₹{myBalance.netBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              ) : myBalance.netBalance < -0.01 ? (
                <div style={styles.negativeBalance}>
                  <span style={styles.balanceStatus}>YOU OWE</span>
                  <span className="mono-amount" style={styles.balanceValue}>
                    ₹{Math.abs(myBalance.netBalance).toLocaleString('en-IN')}
                  </span>
                </div>
              ) : (
                <div style={styles.settledBalance}>
                  <span style={styles.balanceStatus}>SETTLED UP</span>
                  <span className="mono-amount" style={styles.balanceValue}>₹0</span>
                </div>
              )
            ) : (
              <span style={styles.balanceValue}>Calculating...</span>
            )}
          </div>
        </div>
        <button onClick={openAddModal} className="btn-primary" style={styles.addBtn}>
          <Plus size={18} /> Log Expense
        </button>
      </div>

      {/* spending category charts */}
      {totalSpend > 0 && (
        <div className="glass-card" style={styles.categoryCard}>
          <div style={styles.cardHeaderSmall}>
            <BarChart3 size={16} style={{ color: 'var(--primary-teal)' }} />
            <h2 style={styles.sectionTitleSmall}>SPENDING BREAKDOWN</h2>
          </div>
          <div style={styles.categoryContainer}>
            {Object.entries(categoryTotals).map(([cat, amt]) => {
              const pct = totalSpend > 0 ? Math.round((amt / totalSpend) * 100) : 0;
              if (amt === 0) return null;
              return (
                <div key={cat} style={styles.catRow}>
                  <div style={styles.catMeta}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{cat}</span>
                    <span className="mono-amount" style={{ fontSize: '12px' }}>
                      ₹{amt.toLocaleString('en-IN')} ({pct}%)
                    </span>
                  </div>
                  <div className="cat-progress-bg">
                    <div 
                      className={`cat-progress-fill ${getCategoryColorClass(cat)}`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SVG Interactive Debt Graph Flowchart */}
      {flowchart && (
        <div className="glass-card" style={styles.graphCard}>
          <h2 style={styles.sectionTitle}>DEBT SETTLEMENT FLOW CHART</h2>
          <p style={styles.graphSubText}>Visual ledger of how cash flows to settle up the trip balances.</p>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0', overflowX: 'auto' }}>
            <svg width={flowchart.width} height={flowchart.height} style={{ backgroundColor: 'rgba(27,75,90,0.02)', borderRadius: '8px' }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-terracotta)" />
                </marker>
              </defs>

              {/* Draw Connections */}
              {flowchart.settlements.map((settle, i) => {
                const start = flowchart.debtorCoords[settle.from];
                const end = flowchart.creditorCoords[settle.to];
                if (!start || !end) return null;

                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2;

                return (
                  <g key={i}>
                    {/* Path Line */}
                    <line 
                      x1={start.x + 35} 
                      y1={start.y} 
                      x2={end.x - 35} 
                      y2={end.y} 
                      stroke="var(--accent-terracotta)" 
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      markerEnd="url(#arrow)"
                    />
                    {/* Value Badge */}
                    <rect 
                      x={midX - 25} 
                      y={midY - 12} 
                      width="50" 
                      height="20" 
                      rx="4" 
                      fill="var(--accent-terracotta)" 
                    />
                    <text 
                      x={midX} 
                      y={midY + 2} 
                      fill="#FFFFFF" 
                      fontSize="9px" 
                      fontWeight="bold" 
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      ₹{Math.round(settle.amount)}
                    </text>
                  </g>
                );
              })}

              {/* Draw Debtor Nodes */}
              {flowchart.debtors.map((name) => {
                const pt = flowchart.debtorCoords[name];
                return (
                  <g key={name} transform={`translate(${pt.x}, ${pt.y})`}>
                    <circle r="20" fill="var(--accent-terracotta)" />
                    <text fill="#FFFFFF" fontSize="10px" fontWeight="bold" textAnchor="middle" y="3">
                      {name.substring(0, 3)}
                    </text>
                  </g>
                );
              })}

              {/* Draw Creditor Nodes */}
              {flowchart.creditors.map((name) => {
                const pt = flowchart.creditorCoords[name];
                return (
                  <g key={name} transform={`translate(${pt.x}, ${pt.y})`}>
                    <circle r="20" fill="var(--state-green)" />
                    <text fill="#FFFFFF" fontSize="10px" fontWeight="bold" textAnchor="middle" y="3">
                      {name.substring(0, 3)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Debt Settlements Section */}
      {settlements.length > 0 && (
        <div style={styles.settlementSection}>
          <h2 style={styles.sectionTitle}>SIMPLIFIED DEBTS</h2>
          <div style={styles.settlementList}>
            {settlements.map((settle, i) => (
              <div key={i} style={styles.settleCard}>
                <div style={styles.settleInfo}>
                  <span style={styles.debtorName}>{settle.from}</span>
                  <span style={styles.settleArrow}>owes</span>
                  <span style={styles.creditorName}>{settle.to}</span>
                </div>
                <div style={styles.settleActionBlock}>
                  <span className="mono-amount" style={styles.settleAmount}>
                    ₹{settle.amount.toLocaleString('en-IN')}
                  </span>
                  {(currentUser === settle.from || currentUser === settle.to) && (
                    <button 
                      onClick={() => handleSettleUp(settle)}
                      style={styles.settleBtn}
                    >
                      <Check size={14} /> Settle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses Ledger */}
      <div style={styles.ledgerSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={styles.sectionTitle}>EXPENSE LEDGER</h2>
          <button onClick={fetchExpenses} style={styles.refreshBtn} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        {loading && expenses.length === 0 ? (
          <div style={styles.centerText}>Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div style={styles.emptyState}>
            <Receipt size={48} style={{ color: 'var(--primary-teal)', opacity: 0.4 }} />
            <h3>No expenses logged</h3>
            <p>Fronted money for food, travel or tickets? Add it now!</p>
          </div>
        ) : (
          <div style={styles.expensesList}>
            {expenses.map((exp) => {
              const myShare = exp.splitAmong.includes(currentUser) 
                ? exp.amount / exp.splitAmong.length 
                : 0;

              return (
                <div key={exp.id} style={styles.expenseCard}>
                  <div style={styles.expenseMain}>
                    <div style={styles.expenseMeta}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge badge-other`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                          {exp.category || 'Other'}
                        </span>
                        <h3 style={styles.expenseDesc}>{exp.description}</h3>
                      </div>
                      <div style={styles.expenseSubText}>
                        <span>Paid by <strong>{exp.paidBy}</strong></span>
                        <span style={styles.divider}>•</span>
                        <span>Split with {exp.splitAmong.length} {exp.splitAmong.length === 1 ? 'person' : 'people'}</span>
                      </div>
                    </div>
                    <div style={styles.expensePriceSection}>
                      <span className="mono-amount" style={styles.expensePrice}>
                        ₹{exp.amount.toLocaleString('en-IN')}
                      </span>
                      <span style={styles.expenseDate}>
                        {new Date(exp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div style={styles.expenseFooter}>
                    <span style={styles.myShareLabel}>
                      {exp.paidBy === currentUser ? (
                        <span style={{ color: 'var(--state-green)' }}>You paid ₹{exp.amount}</span>
                      ) : myShare > 0 ? (
                        <span>Your share: <strong className="mono-amount">₹{Math.round(myShare)}</strong></span>
                      ) : (
                        <span>Not involved</span>
                      )}
                    </span>
                    <button 
                      onClick={() => handleDelete(exp.id)} 
                      style={styles.deleteBtn}
                      title="Delete expense"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxHeight: '95vh' }}>
            <div className="modal-header">
              <h2>Log Group Expense</h2>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* OCR Receipt Camera Scanner Simulator */}
            {isScanning ? (
              <div style={styles.scannerWrapper}>
                <div className="camera-container">
                  <div className="camera-laser" />
                  <Camera size={36} style={{ color: '#FFFFFF', opacity: 0.5 }} />
                  <div style={styles.scanBadge}>SCANNING RECEIPT...</div>
                </div>
                <div style={styles.scannerStatus}>{scanStatus}</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={styles.scannerTriggerRow}>
                  <button 
                    type="button" 
                    onClick={handleScanReceipt} 
                    style={styles.scannerBtn}
                  >
                    <Scan size={14} /> Auto-Scan Goan Shack Receipt 📷
                  </button>
                </div>

                <div className="input-group">
                  <label className="input-label">Expense Description</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Calangute beach shacks food"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Amount Paid (₹)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="e.g. 3500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select 
                    className="input-field"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Food">Food 🍛</option>
                    <option value="Stay">Stay 🏨</option>
                    <option value="Travel">Travel 🚗</option>
                    <option value="Activities">Activities 🏄‍♂️</option>
                    <option value="Drinks">Drinks 🍹</option>
                    <option value="Other">Other 📍</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Who Paid?</label>
                  <select 
                    className="input-field"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                  >
                    {members.map(m => (
                      <option key={m} value={m}>{m} {m === currentUser ? '(You)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="input-label">Split Between Whom?</label>
                    <div style={styles.bulkSelect}>
                      <button type="button" onClick={handleSelectAll} style={styles.bulkBtn}>All</button>
                      <span style={{ color: 'var(--border-color)' }}>|</span>
                      <button type="button" onClick={handleSelectNone} style={styles.bulkBtn}>None</button>
                    </div>
                  </div>

                  <div style={styles.checkboxGrid}>
                    {members.map(name => {
                      const isChecked = splitAmong.includes(name);
                      return (
                        <div 
                          key={name} 
                          onClick={() => handleToggleSplitMember(name)}
                          style={{
                            ...styles.checkboxItem,
                            backgroundColor: isChecked ? 'var(--primary-teal-soft)' : '#FFFFFF',
                            borderColor: isChecked ? 'var(--primary-teal)' : 'var(--border-color)'
                          }}
                        >
                          {isChecked ? (
                            <CheckSquare size={16} style={{ color: 'var(--primary-teal)' }} />
                          ) : (
                            <Square size={16} style={{ color: 'var(--text-muted)' }} />
                          )}
                          <span style={{ fontSize: '14px', fontWeight: isChecked ? '600' : '400' }}>
                            {name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Selected: {splitAmong.length} friends. Split amount:{' '}
                    <span className="mono-amount">
                      ₹{amount && Number(amount) > 0 && splitAmong.length > 0 
                        ? Math.round(Number(amount) / splitAmong.length).toLocaleString('en-IN') 
                        : 0}
                    </span>{' '}
                    each.
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '12px' }}>
                  Save Expense
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  summaryCard: {
    backgroundColor: '#FFFFFF',
    border: '1.5px solid var(--border-color)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '20px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    alignItems: 'center',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  summaryLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  summaryValueBig: {
    fontSize: '22px',
    color: 'var(--primary-teal)',
  },
  positiveBalance: {
    display: 'flex',
    flexDirection: 'column',
  },
  negativeBalance: {
    display: 'flex',
    flexDirection: 'column',
  },
  settledBalance: {
    display: 'flex',
    flexDirection: 'column',
  },
  balanceStatus: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
  },
  balanceValue: {
    fontSize: '20px',
    color: 'var(--text-charcoal)',
  },
  addBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
  },
  categoryCard: {
    padding: '16px',
    marginBottom: '20px',
  },
  cardHeaderSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px',
  },
  sectionTitleSmall: {
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '0.04em',
  },
  categoryContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  catRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  catMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    fontWeight: '600',
  },
  graphCard: {
    padding: '16px',
    marginBottom: '20px',
  },
  graphSubText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '10px',
  },
  settlementSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '800',
    color: 'var(--primary-teal)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: '10px',
  },
  settlementList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  settleCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '10px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
  },
  settleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
  },
  debtorName: {
    fontWeight: '600',
    color: 'var(--accent-terracotta)',
  },
  settleArrow: {
    color: 'var(--text-muted)',
    fontSize: '12px',
  },
  creditorName: {
    fontWeight: '600',
    color: 'var(--state-green)',
  },
  settleActionBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  settleAmount: {
    fontWeight: '700',
    color: 'var(--primary-teal)',
  },
  settleBtn: {
    backgroundColor: 'var(--primary-teal-soft)',
    color: 'var(--primary-teal)',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  ledgerSection: {
    marginBottom: '20px',
  },
  expensesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    padding: '14px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  expenseMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseMeta: {
    flex: 1,
    paddingRight: '12px',
  },
  expenseDesc: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-charcoal)',
    lineHeight: '1.3',
  },
  expenseSubText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  divider: {
    color: 'rgba(45, 42, 38, 0.2)',
  },
  expensePriceSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  expensePrice: {
    fontSize: '16px',
    color: 'var(--primary-teal)',
  },
  expenseDate: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  expenseFooter: {
    borderTop: '1px solid rgba(27, 75, 90, 0.06)',
    paddingTop: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myShareLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(45, 42, 38, 0.35)',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  scannerTriggerRow: {
    marginBottom: '16px',
  },
  scannerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '12px',
    backgroundColor: 'var(--primary-teal-soft)',
    color: 'var(--primary-teal)',
    border: '1.5px dashed var(--primary-teal)',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  scannerWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 0',
  },
  scanBadge: {
    position: 'absolute',
    bottom: '10px',
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    border: '1px solid #00FF00',
    color: '#00FF00',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
  scannerStatus: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '500',
    marginTop: '4px',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    maxHeight: '180px',
    overflowY: 'auto',
    padding: '4px',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    border: '1.5px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  bulkSelect: {
    display: 'flex',
    gap: '6px',
    fontSize: '12px',
  },
  bulkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-teal)',
    fontWeight: '600',
    cursor: 'pointer',
  },
  centerText: {
    textAlign: 'center',
    padding: '30px 20px',
    color: 'var(--text-muted)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '16px',
    border: '1.5px dashed var(--border-color)',
    gap: '12px',
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
