'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp && !displayName.trim()) {
        throw new Error('Display Name is required for sign up.');
      }

      // Supabase OTP sign-in / signup trigger
      const cleanEmail = email.toLowerCase().trim();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true, // creates a user if they do not exist
          emailRedirectTo: window.location.origin,
          data: isSignUp ? { display_name: displayName.trim() } : undefined
        }
      });

      if (otpError) throw otpError;

      setOtpSent(true);
      setMessage(`A 6-digit confirmation code has been sent to ${cleanEmail}! Please check your inbox (and spam folder).`);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please check your email format.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const cleanEmail = email.toLowerCase().trim();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: otp.trim(),
        type: 'email'
      });

      if (verifyError) throw verifyError;

      if (data.user) {
        // Automatic Admin Check for the user's specific email address
        const isAdminEmail = cleanEmail === 'trivediashmit3@gmail.com' || cleanEmail === 'trivediashmit3@gmailcom';
        
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        const name = isSignUp ? displayName.trim() : (data.user.user_metadata?.display_name || cleanEmail.split('@')[0]);

        if (!profile) {
          // Create user profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              display_name: name,
              email: cleanEmail,
              is_admin: isAdminEmail
            }]);
          
          if (insertError) {
            console.error("Profile creation error:", insertError);
          }
        } else if (isAdminEmail) {
          // If the profile already exists, ensure it has the admin flag enabled
          await supabase
            .from('profiles')
            .update({ is_admin: true })
            .eq('id', data.user.id);
        }

        setMessage('OTP Verified! Logging in...');
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-card" style={styles.box}>
        
        {otpSent && (
          <button 
            type="button" 
            onClick={() => {
              setOtpSent(false);
              setOtp('');
              setError('');
              setMessage('');
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={16} /> <span>Change Email</span>
          </button>
        )}

        <div style={styles.header}>
          <span style={styles.logoIcon}>🌴</span>
          <h1 style={styles.title}>Susegad Goa '26</h1>
          <p style={styles.subtitle}>
            {otpSent 
              ? 'Enter the 6-digit OTP code sent to your email to confirm your identity' 
              : isSignUp 
                ? 'Create your profile to join the group planner' 
                : 'Sign in to access itinerary, expenses & chat'}
          </p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}
        {message && <div style={styles.successAlert}>{message}</div>}

        {!otpSent ? (
          /* STEP 1: Enter Email / Name to request OTP */
          <form onSubmit={handleSendOtp} style={styles.form}>
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
                placeholder="trivediashmit3@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          /* STEP 2: Enter OTP Code to verify */
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <div className="input-group">
              <label className="input-label">6-Digit Verification Code</label>
              <input
                type="text"
                className="input-field"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: '18px', fontWeight: 'bold' }}
              />
            </div>

            <button type="submit" className="btn-primary" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Verifying...' : 'Confirm & Log In'}
            </button>
          </form>
        )}

        {!otpSent && (
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
        )}
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
    marginTop: '12px',
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
