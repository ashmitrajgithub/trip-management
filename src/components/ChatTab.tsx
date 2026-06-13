'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, MapPin, Image as ImageIcon, Smile, X } from 'lucide-react';
import { ChatMessage } from '@/lib/db';

interface ChatTabProps {
  currentUser: string;
}

const EMOJIS = ['👍', '❤️', '🍻', '🌊', '🏖️'];

export default function ChatTab({ currentUser }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchMessages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/chat');
      if (!res.ok) throw new Error('Failed to fetch chat');
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // 3-second polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const msgText = text;
    setText('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: currentUser,
          text: msgText,
          type: 'text'
        })
      });
      if (!res.ok) throw new Error('Failed to send message');
      await fetchMessages(true);
    } catch (err: any) {
      alert(err.message || 'Error sending message');
      setText(msgText);
    } finally {
      setSending(false);
    }
  };

  // One-tap Location Share
  const handleShareLocation = async () => {
    if (sending) return;
    setSending(true);
    try {
      const locations = [
        { name: "Vagator Beach Sunset Point 🌅", query: "Vagator Beach Sunset Point" },
        { name: "Thalassa Restaurant Siolim 🍽️", query: "Thalassa Siolim" },
        { name: "Curlies Beach Shack Anjuna 🌊", query: "Curlies Anjuna" },
        { name: "Fontainhas Latin Quarter 🏛️", query: "Fontainhas Panaji" }
      ];
      const selected = locations[Math.floor(Math.random() * locations.length)];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: currentUser,
          text: `Shared location: ${selected.name}`,
          type: 'location',
          mediaUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.query + " Goa")}`
        })
      });
      if (!res.ok) throw new Error('Failed to share location');
      await fetchMessages(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  // One-tap Mock Sunset Photo Share
  const handleSharePhoto = async () => {
    if (sending) return;
    setSending(true);
    try {
      const images = [
        { text: "Sunset at Vagator beach right now! 🌅🌊", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60" },
        { text: "Chilling with Cashew Feni at the shack! 🍹🌴", url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=500&auto=format&fit=crop&q=60" }
      ];
      const selected = images[Math.floor(Math.random() * images.length)];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: currentUser,
          text: selected.text,
          type: 'image',
          mediaUrl: selected.url
        })
      });
      if (!res.ok) throw new Error('Failed to share image');
      await fetchMessages(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  // Reaction Click
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveReactionMenu(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'react',
          messageId,
          emoji,
          sender: currentUser
        })
      });
      if (!res.ok) throw new Error('Failed to toggle reaction');
      await fetchMessages(true);
    } catch (err: any) {
      console.error(err);
    }
  };

  const getInitials = (name: string) => name.slice(0, 2);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const getAvatarStyle = (sender: string) => {
    if (sender === currentUser) {
      return {
        backgroundColor: 'var(--primary-teal-soft)',
        color: 'var(--primary-teal)',
        border: '1px solid var(--primary-teal)',
      };
    }
    const colors = [
      { bg: 'rgba(217, 98, 43, 0.1)', text: 'var(--accent-terracotta)', border: '1px solid var(--accent-terracotta)' },
      { bg: 'rgba(232, 163, 61, 0.1)', text: 'var(--secondary-mustard)', border: '1px solid var(--secondary-mustard)' },
      { bg: 'rgba(78, 124, 102, 0.1)', text: 'var(--state-green)', border: '1px solid var(--state-green)' },
    ];
    const index = sender.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div style={styles.chatWrapper}>
      {/* Messages area */}
      <div style={styles.messagesArea}>
        {loading && messages.length === 0 ? (
          <div style={styles.centerText}>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={styles.emptyState}>
            <MessageSquare size={48} style={{ color: 'var(--primary-teal)', opacity: 0.4 }} />
            <h3>No messages yet</h3>
            <p>Send a message to start the Goa group chat!</p>
          </div>
        ) : (
          <div style={styles.messagesList}>
            {messages.map((msg, index) => {
              const isMe = msg.sender === currentUser;
              const showSender = index === 0 || messages[index - 1].sender !== msg.sender;
              const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

              return (
                <div 
                  key={msg.id} 
                  style={{
                    ...styles.messageRow,
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    marginTop: showSender ? '12px' : '4px',
                    position: 'relative'
                  }}
                >
                  {!isMe && showSender && (
                    <div style={{ ...styles.avatar, ...getAvatarStyle(msg.sender) }}>
                      {getInitials(msg.sender)}
                    </div>
                  )}
                  {!isMe && !showSender && <div style={styles.avatarSpacer} />}

                  <div 
                    style={{
                      ...styles.bubbleContainer,
                      alignItems: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {!isMe && showSender && (
                      <span style={styles.senderName}>{msg.sender}</span>
                    )}

                    {/* Chat Bubble Core */}
                    <div 
                      onClick={() => setActiveReactionMenu(activeReactionMenu === msg.id ? null : msg.id)}
                      style={{
                        ...styles.bubble,
                        backgroundColor: isMe ? 'var(--primary-teal)' : '#FFFFFF',
                        color: isMe ? 'var(--bg-sand)' : 'var(--text-charcoal)',
                        border: isMe ? 'none' : '1px solid var(--border-color)',
                        borderRadius: isMe 
                          ? '16px 16px 4px 16px' 
                          : '16px 16px 16px 4px',
                        cursor: 'pointer'
                      }}
                    >
                      {/* Location Message Type */}
                      {msg.type === 'location' ? (
                        <div style={styles.locationCard}>
                          <MapPin size={18} style={{ color: isMe ? '#FFFFFF' : 'var(--primary-teal)' }} />
                          <div>
                            <span style={{ fontWeight: '700', fontSize: '13px', display: 'block' }}>Group Location Pin</span>
                            <a 
                              href={msg.mediaUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                color: isMe ? 'var(--bg-sand)' : 'var(--primary-teal)',
                                textDecoration: 'underline',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Open in Google Maps
                            </a>
                          </div>
                        </div>
                      ) : msg.type === 'image' ? (
                        /* Image Message Type */
                        <div style={styles.imageCard}>
                          <img 
                            src={msg.mediaUrl} 
                            alt="Sunset" 
                            style={styles.sharedImage} 
                          />
                          <p style={{ ...styles.bubbleText, marginTop: '6px' }}>{msg.text}</p>
                        </div>
                      ) : (
                        /* Text Message Type */
                        <p style={styles.bubbleText}>{msg.text}</p>
                      )}

                      <span 
                        style={{
                          ...styles.bubbleTime,
                          color: isMe ? 'rgba(255, 248, 238, 0.7)' : 'var(--text-muted)'
                        }}
                      >
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    {/* Reaction badges container */}
                    {hasReactions && (
                      <div style={{
                        ...styles.reactionsContainer,
                        justifyContent: isMe ? 'flex-end' : 'flex-start'
                      }}>
                        {Object.entries(msg.reactions || {}).map(([emoji, users]) => {
                          const userReacted = users.includes(currentUser);
                          return (
                            <div 
                              key={emoji} 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleReaction(msg.id, emoji);
                              }}
                              style={{
                                ...styles.reactionBadge,
                                backgroundColor: userReacted ? 'var(--primary-teal-soft)' : 'rgba(0,0,0,0.04)',
                                borderColor: userReacted ? 'var(--primary-teal)' : 'transparent',
                              }}
                              title={`Reacted by: ${users.join(', ')}`}
                            >
                              <span>{emoji}</span>
                              <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{users.length}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Floating Reaction Menu Panel */}
                    {activeReactionMenu === msg.id && (
                      <div 
                        style={{
                          ...styles.reactionsMenu,
                          left: isMe ? 'auto' : '10px',
                          right: isMe ? '10px' : 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            style={styles.reactionMenuBtn}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button 
                          onClick={() => setActiveReactionMenu(null)}
                          style={{ ...styles.reactionMenuBtn, borderLeft: '1px solid rgba(0,0,0,0.1)' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} style={styles.inputForm}>
        {/* Attachments */}
        <div style={styles.attachmentBar}>
          <button 
            type="button" 
            onClick={handleShareLocation}
            style={styles.attachmentBtn}
            title="Share Beach Location"
          >
            <MapPin size={18} />
          </button>
          <button 
            type="button" 
            onClick={handleSharePhoto}
            style={styles.attachmentBtn}
            title="Share Sunset Photo"
          >
            <ImageIcon size={18} />
          </button>
        </div>

        <input 
          type="text" 
          style={styles.chatInput} 
          placeholder={`Message as ${currentUser}...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <button type="submit" style={styles.sendBtn} disabled={sending}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  chatWrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 128px)',
    position: 'relative',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(27, 75, 90, 0.02)',
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    maxWidth: '90%',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '700',
    flexShrink: 0,
  },
  avatarSpacer: {
    width: '32px',
    flexShrink: 0,
  },
  bubbleContainer: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 'calc(100% - 40px)',
    position: 'relative',
  },
  senderName: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--primary-teal)',
    marginBottom: '2px',
    marginLeft: '4px',
  },
  bubble: {
    padding: '10px 14px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    position: 'relative',
  },
  bubbleText: {
    fontSize: '14px',
    lineHeight: '1.4',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  bubbleTime: {
    fontSize: '9px',
    alignSelf: 'flex-end',
  },
  locationCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
  },
  imageCard: {
    display: 'flex',
    flexDirection: 'column',
  },
  sharedImage: {
    width: '100%',
    maxHeight: '160px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.1)',
  },
  reactionsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '4px',
  },
  reactionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '2px 6px',
    borderRadius: '8px',
    fontSize: '11px',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.15s',
  },
  reactionsMenu: {
    position: 'absolute',
    bottom: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    padding: '4px 8px',
    gap: '4px',
    zIndex: 999,
    animation: 'fadeInUp 0.15s ease-out',
  },
  reactionMenuBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    padding: '4px',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'transform 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputForm: {
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid var(--border-color)',
    padding: '10px 12px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    position: 'sticky',
    bottom: 0,
    zIndex: 10,
  },
  attachmentBar: {
    display: 'flex',
    gap: '4px',
  },
  attachmentBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-teal)',
    padding: '6px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--primary-teal-soft)',
  },
  chatInput: {
    flex: 1,
    border: '1.5px solid var(--border-color)',
    borderRadius: '24px',
    padding: '10px 16px',
    fontSize: '15px',
    outline: 'none',
    backgroundColor: 'var(--bg-sand)',
    fontFamily: 'var(--font-inter), sans-serif',
  },
  sendBtn: {
    backgroundColor: 'var(--primary-teal)',
    color: 'var(--bg-sand)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: 'var(--shadow-sm)',
  },
  centerText: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--text-muted)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    margin: 'auto',
    padding: '40px 20px',
    gap: '12px',
  },
};
