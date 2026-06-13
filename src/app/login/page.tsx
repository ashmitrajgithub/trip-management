'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const supabase = createClient();

  useEffect(() => {
    // Check if user is already logged in, redirect if so
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        window.location.href = '/';
      }
    };
    checkUser();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          throw new Error('Display Name is required');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim()
            }
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Insert into public.profiles table
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              display_name: displayName.trim(),
              email: email
            }]);
          
          if (profileError) {
            console.error("Profile insert error:", profileError);
          }

          setMessage('Sign up successful! Please log in.');
          setIsSignUp(false);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        if (data.user) {
          // Successful login, redirect
          window.location.href = '/';
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-card" style={styles.box}>
        <div style={styles.header}>
          <span style={styles.logoIcon}>🌴</span>
          <h1 style={styles.title}>Susegad Goa '26</h1>
          <p style={styles.subtitle}>
            {isSignUp ? 'Create your profile to join the group planner' : 'Sign in to access itinerary, expenses & chat'}
          </p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}
        {message && <div style={styles.successAlert}>{message}</div>}

        <form onSubmit={handleAuth} style={styles.form}>
          {isSignUp && (
            <div className="input-group">
              <label className="input-label">Display Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Ashmit"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div style={styles.switchRow}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button 
            type="button" 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
            }}
            style={styles.switchBtn}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '8px',
  },
  title: {
    fontSize: '26px',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  submitBtn: {
    marginTop: '8px',
    height: '46px',
    fontWeight: '700',
  },
  errorAlert: {
    backgroundColor: 'var(--state-rust-soft)',
    color: 'var(--state-rust)',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '16px',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    textAlign: 'center',
  },
  successAlert: {
    backgroundColor: 'var(--state-green-soft)',
    color: 'var(--state-green)',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '16px',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    textAlign: 'center',
  },
  switchRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '6px',
    marginTop: '20px',
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-terracotta)',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
};
