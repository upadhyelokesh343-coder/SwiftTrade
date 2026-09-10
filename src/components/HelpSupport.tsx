import React, { useState, useEffect, useRef } from 'react';
import { Headset, X, ChevronRight, Send, ArrowLeft, MessageSquare, CheckCircle2, History, User, Phone, Video, MoreVertical, Paperclip, Smile, CheckCheck, Clock, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, arrayUnion, limit } from 'firebase/firestore';
import { soundManager } from '../lib/sound';

interface HelpSupportProps {
  className?: string;
}

type SupportView = 'list' | 'chat' | 'history';

interface SupportReply {
  text: string;
  sender: 'admin' | 'user';
  timestamp: any;
}

interface SupportTicket {
  id: string;
  issue: string;
  message: string;
  userEmail: string;
  userId: string;
  userDisplayName?: string;
  timestamp: any;
  status: 'pending' | 'replied' | 'resolved';
  replies?: SupportReply[];
}

export const HelpSupport: React.FC<HelpSupportProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<SupportView>('list');
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // User's previous support tickets
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [userReplyText, setUserReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Notification state
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotif, setLatestNotif] = useState<{ id: string; title: string; message: string; ticketId?: string } | null>(null);
  const [toastNotif, setToastNotif] = useState<{ id: string; title: string; message: string } | null>(null);
  const seenNotifIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const issues = [
    { title: 'Earning Issue', desc: 'Queries regarding trading income or profits', icon: '💰' },
    { title: 'Add Money', desc: 'Issues with depositing funds to your account', icon: '💳' },
    { title: 'Withdraw Problem', desc: 'Delayed or failed withdrawal requests', icon: '🏦' },
    { title: 'Account Balance', desc: 'Discrepancy in demo or real wallet balance', icon: '📊' },
    { title: 'Other Issue', desc: 'Any other questions or technical support', icon: '❓' },
  ];

  // Listen for notifications targeting current user or broadcast ('ALL')
  useEffect(() => {
    const q = query(collection(db, 'notifications'), limit(40));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentUser = auth.currentUser;
      const currentUid = currentUser?.uid;
      let count = 0;
      let newest: any = null;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isForMe = data.userId === 'ALL' || (currentUid && data.userId === currentUid);
        if (isForMe && !data.read) {
          count++;
          newest = { id: docSnap.id, ...data };

          // If this is a newly arrived notification not seen before in this session
          if (!seenNotifIds.current.has(docSnap.id)) {
            seenNotifIds.current.add(docSnap.id);
            if (!isFirstLoad.current) {
              // Play pleasant melodic notification chime
              soundManager.playNotification();
              // Show toast banner
              setToastNotif({
                id: docSnap.id,
                title: data.title || 'SwiftTrade Notification',
                message: data.message || ''
              });
              setTimeout(() => {
                setToastNotif(null);
              }, 7000);
            }
          }
        }
      });

      isFirstLoad.current = false;
      setUnreadCount(count);
      setLatestNotif(newest);
    }, (err) => {
      console.log('Error listening to notifications:', err);
    });

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  // Fetch user's support tickets when modal is open or when new tickets arrive
  useEffect(() => {
    if (!isOpen || !auth.currentUser) return;

    const q = query(
      collection(db, 'support_messages'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tickets: SupportTicket[] = [];
      snapshot.forEach((doc) => {
        tickets.push({ id: doc.id, ...doc.data() } as SupportTicket);
      });
      // Sort client-side by timestamp descending
      tickets.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });
      setUserTickets(tickets);

      // If active ticket open, keep active ticket updated
      if (activeTicket) {
        const updated = tickets.find(t => t.id === activeTicket.id);
        if (updated) setActiveTicket(updated);
      }
    }, (err) => {
      console.log('Error fetching user support tickets:', err);
    });

    return () => unsubscribe();
  }, [isOpen, activeTicket?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [view, activeTicket?.replies, message]);

  const handleIssueSelect = (issueTitle: string) => {
    setSelectedIssue(issueTitle);
    setView('chat');
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isSending || !selectedIssue) return;

    setIsSending(true);
    const currentUser = auth.currentUser;
    const userEmail = currentUser?.email || 'guest@galaxtrade.com';
    const userId = currentUser?.uid || 'guest_' + Math.random().toString(36).substring(2, 9);
    const userDisplayName = currentUser?.displayName || userEmail.split('@')[0] || 'User';

    const fullMessage = message.trim();

    try {
      const docRef = await addDoc(collection(db, 'support_messages'), {
        issue: selectedIssue,
        message: fullMessage,
        userEmail,
        userId,
        userDisplayName,
        timestamp: serverTimestamp(),
        status: 'pending',
        replies: []
      });

      // Set as active ticket right away to show WhatsApp chat
      const newTicket: SupportTicket = {
        id: docRef.id,
        issue: selectedIssue,
        message: fullMessage,
        userEmail,
        userId,
        userDisplayName,
        timestamp: { toMillis: () => Date.now() },
        status: 'pending',
        replies: []
      };

      setActiveTicket(newTicket);
      setMessage('');
    } catch (error) {
      console.error('Error sending support message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendUserReply = async () => {
    if (!activeTicket || !userReplyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      const msgRef = doc(db, 'support_messages', activeTicket.id);
      const replyObj = {
        text: userReplyText.trim(),
        sender: 'user' as const,
        timestamp: new Date()
      };

      await updateDoc(msgRef, {
        replies: arrayUnion(replyObj),
        status: 'pending',
        updatedAt: new Date()
      });

      setUserReplyText('');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const resetModal = () => {
    setIsOpen(false);
    setView('list');
    setSelectedIssue(null);
    setMessage('');
    setActiveTicket(null);
    setUserReplyText('');
  };

  const markNotifRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
      setLatestNotif(null);
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return 'Just now';
    const date = ts.toMillis ? new Date(ts.toMillis()) : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    if (isNaN(date.getTime())) return 'Just now';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn("relative", className)}>
      {/* FLOATING REAL-TIME NOTIFICATION BANNER FROM ADMIN */}
      {latestNotif && !isOpen && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-[92%] max-w-md bg-[#182229] border border-[#00a884] rounded-2xl p-3.5 shadow-[0_10px_30px_rgba(0,168,132,0.4)] animate-in slide-in-from-top-4 duration-300 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 flex-1 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0 font-bold shadow text-lg">
              💬
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-[#00a884] flex items-center gap-1.5">
                <span>{latestNotif.title || 'New Support Reply'}</span>
                <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-mono uppercase font-black">NEW</span>
              </h4>
              <p className="text-xs text-gray-200 truncate font-sans mt-0.5">
                {latestNotif.message}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => {
                setIsOpen(true);
                markNotifRead(latestNotif.id);
                if (latestNotif.ticketId) {
                  const target = userTickets.find(t => t.id === latestNotif.ticketId);
                  if (target) {
                    setActiveTicket(target);
                    setView('chat');
                  }
                }
              }}
              className="px-3 py-1.5 bg-[#00a884] hover:bg-[#008069] text-white font-bold text-xs rounded-xl transition-all shadow active:scale-95"
            >
              Reply
            </button>
            <button
              onClick={() => markNotifRead(latestNotif.id)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Headset / Earphone Mic Button in Header */}
      <button
        onClick={() => {
          setIsOpen(true);
          if (latestNotif) {
            markNotifRead(latestNotif.id);
          }
        }}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 border border-emerald-500/40 text-white shadow-lg shadow-emerald-500/10 transition-all active:scale-95 group relative"
        title="WhatsApp Support"
      >
        <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:text-emerald-300 transition-colors relative">
          <Headset className="w-4 h-4 sm:w-5 sm:h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0B0E11] animate-ping" />
          )}
        </div>
        <span className="text-xs font-bold tracking-wide hidden sm:inline-block">Support</span>
        {unreadCount > 0 && (
          <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {/* FULL PAGE WHATSAPP-STYLE SUPPORT SCREEN */}
      {isOpen && (
        <div className="fixed inset-0 z-[250] bg-[#0b141a] text-white flex flex-col w-full h-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans">
          
          {/* WHATSAPP TOP HEADER */}
          <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 bg-[#202c33] border-b border-gray-800 sticky top-0 z-20 shadow-md">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  if (activeTicket) {
                    setActiveTicket(null);
                    setView('list');
                  } else if (view !== 'list') {
                    setView('list');
                  } else {
                    resetModal();
                  }
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Support Profile Avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold text-lg shadow-md border border-white/10">
                  <Headset className="w-5 h-5" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#202c33] rounded-full" />
              </div>

              <div>
                <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 leading-tight">
                  Galaxy Official Support
                  <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-1.5 py-0.5 rounded font-mono font-black">VERIFIED</span>
                </h1>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  online • 24/7 Active Desk
                </p>
              </div>
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center space-x-2 sm:space-x-3 text-gray-300">
              {userTickets.length > 0 && view === 'list' && (
                <button
                  onClick={() => setView('history')}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 text-[#00a884] hover:bg-[#00a884]/30 text-xs font-bold transition-all"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>My Chats ({userTickets.length})</span>
                </button>
              )}

              <button
                onClick={resetModal}
                className="p-2 rounded-full hover:bg-rose-500/20 hover:text-rose-400 text-gray-300 transition-colors"
                title="Close Support"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* MAIN WHATSAPP BODY CONTENT */}
          <div className="flex-1 overflow-y-auto bg-[#0b141a] relative flex flex-col justify-between"
               style={{
                 backgroundImage: `radial-gradient(#1f2c34 1px, transparent 1px)`,
                 backgroundSize: '24px 24px'
               }}>
            
            {/* VIEW 1: REASON SELECTION MENU */}
            {view === 'list' && !activeTicket ? (
              <div className="flex-1 flex flex-col justify-center max-w-lg w-full mx-auto p-4 sm:p-6 my-auto">
                {/* Notice Badge */}
                <div className="bg-[#182229] border border-[#00a884]/30 rounded-2xl p-4 text-center space-y-2 mb-6 shadow-xl">
                  <div className="w-12 h-12 bg-[#00a884]/20 border border-[#00a884]/40 rounded-full flex items-center justify-center text-[#00a884] mx-auto">
                    <Headset className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Select Reason to Start Chat</h2>
                  <p className="text-xs text-gray-400">
                    Choose the issue reason below. Your message will be tagged with this reason for instant assistance.
                  </p>
                </div>

                {/* Reason Options List */}
                <div className="space-y-2.5">
                  {issues.map((item) => (
                    <button
                      key={item.title}
                      onClick={() => handleIssueSelect(item.title)}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-gray-800 hover:border-[#00a884] transition-all group text-left active:scale-[0.99] shadow-md"
                    >
                      <div className="flex items-center space-x-3.5">
                        <span className="text-2xl p-2 rounded-xl bg-[#202c33] group-hover:bg-[#00a884]/20 transition-colors">
                          {item.icon}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-[#00a884] transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-[#00a884] group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>

                {userTickets.length > 0 && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={() => setView('history')}
                      className="inline-flex items-center space-x-2 text-xs font-bold text-[#00a884] hover:underline uppercase tracking-wider"
                    >
                      <History className="w-4 h-4" />
                      <span>View Previous Chat Conversations ({userTickets.length})</span>
                    </button>
                  </div>
                )}
              </div>
            ) : view === 'history' && !activeTicket ? (
              /* VIEW 2: MY TICKETS LIST */
              <div className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-3">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-800">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider text-gray-300">Your Support Conversations</h2>
                  <button
                    onClick={() => setView('list')}
                    className="text-xs text-[#00a884] hover:underline font-bold"
                  >
                    + New Support Query
                  </button>
                </div>

                {userTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      setActiveTicket(ticket);
                      setView('chat');
                    }}
                    className="p-4 rounded-xl bg-[#111b21] hover:bg-[#202c33] border border-gray-800 hover:border-[#00a884]/50 cursor-pointer transition-all space-y-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30">
                        📌 Reason: {ticket.issue}
                      </span>
                      <span className="text-[10px] text-gray-500">{formatTime(ticket.timestamp)}</span>
                    </div>

                    <p className="text-xs text-gray-300 line-clamp-2">{ticket.message}</p>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-800/60">
                      <span className={cn(
                        "font-bold uppercase tracking-wider text-[10px]",
                        ticket.status === 'replied' ? "text-emerald-400" :
                        ticket.status === 'resolved' ? "text-blue-400" : "text-amber-400"
                      )}>
                        • Status: {ticket.status === 'replied' ? 'Admin Replied' : ticket.status}
                      </span>
                      {ticket.replies && ticket.replies.length > 0 && (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5 text-[#00a884]" />
                          {ticket.replies.length} replies
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* VIEW 3: WHATSAPP ACTIVE CHAT THREAD (NEW OR EXISTING TICKET) */
              <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto p-3 sm:p-6 space-y-4">
                
                {/* Encryption / Security Notice Banner */}
                <div className="text-center my-2">
                  <span className="inline-block px-3 py-1.5 rounded-lg bg-[#182229] border border-amber-500/20 text-amber-300 text-[11px] font-medium shadow">
                    🔒 Messages are end-to-end encrypted with Galaxy Official Support Desk
                  </span>
                </div>

                {/* Selected Reason Header Tag */}
                <div className="bg-[#182229] border-l-4 border-[#00a884] rounded-r-xl p-3 flex items-center justify-between shadow-md">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-400">Selected Reason:</span>
                    <span className="text-xs font-black text-[#00a884] uppercase tracking-wide">
                      {activeTicket ? activeTicket.issue : selectedIssue}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {activeTicket ? `ID: #${activeTicket.id.slice(0, 8)}` : 'New Query'}
                  </span>
                </div>

                {/* CHAT MESSAGES THREAD */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  
                  {/* Message 1: Initial User Query Bubble */}
                  {activeTicket ? (
                    <>
                      {/* USER ORIGINAL MESSAGE BUBBLE */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-none bg-[#005c4b] p-3 text-white shadow-md space-y-1 relative group">
                          {/* Reason Quote Block inside WhatsApp bubble */}
                          <div className="bg-[#025144] border-l-4 border-[#00a884] p-2 rounded text-xs mb-2">
                            <p className="text-[10px] text-[#00a884] font-bold uppercase">Attached Reason</p>
                            <p className="text-xs font-bold text-white">{activeTicket.issue}</p>
                          </div>

                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeTicket.message}</p>
                          
                          <div className="flex items-center justify-end space-x-1 text-[10px] text-emerald-200/80 font-medium pt-1">
                            <span>{formatTime(activeTicket.timestamp)}</span>
                            <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                          </div>
                        </div>
                      </div>

                      {/* REPLIES THREAD */}
                      {activeTicket.replies && activeTicket.replies.map((reply, idx) => (
                        <div
                          key={idx}
                          className={cn("flex", reply.sender === 'user' ? "justify-end" : "justify-start")}
                        >
                          <div className={cn(
                            "max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-md space-y-1 relative",
                            reply.sender === 'user'
                              ? "bg-[#005c4b] text-white rounded-tr-none"
                              : "bg-[#202c33] text-gray-100 rounded-tl-none border border-gray-700/50"
                          )}>
                            {reply.sender === 'admin' && (
                              <p className="text-[11px] font-bold text-[#00a884] flex items-center gap-1">
                                🛡️ Support Admin Desk
                              </p>
                            )}

                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.text}</p>

                            <div className="flex items-center justify-end space-x-1 text-[10px] text-gray-400 font-medium pt-1">
                              <span>{formatTime(reply.timestamp)}</span>
                              {reply.sender === 'user' && <CheckCheck className="w-3.5 h-3.5 text-blue-300" />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    /* Initial prompt for user drafting message */
                    <div className="text-center py-6 text-gray-400 text-xs">
                      <p className="text-gray-300 font-medium">Write your message below for <span className="text-[#00a884] font-bold">{selectedIssue}</span></p>
                      <p className="text-[11px] text-gray-500 mt-1">Our support team will answer in real time.</p>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* WHATSAPP BOTTOM INPUT BAR */}
                <div className="pt-2 sticky bottom-0 z-20">
                  <div className="bg-[#202c33] p-2 rounded-2xl border border-gray-700/60 flex items-center space-x-2 shadow-2xl">
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                      <Paperclip className="w-5 h-5" />
                    </button>

                    <input
                      type="text"
                      value={activeTicket ? userReplyText : message}
                      onChange={(e) => activeTicket ? setUserReplyText(e.target.value) : setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (activeTicket) handleSendUserReply();
                          else handleSendMessage();
                        }
                      }}
                      placeholder={`Type a message... [Reason: ${activeTicket ? activeTicket.issue : selectedIssue}]`}
                      className="flex-1 bg-[#2a3942] border-none text-sm text-white placeholder:text-gray-400 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                    />

                    <button
                      onClick={() => activeTicket ? handleSendUserReply() : handleSendMessage()}
                      disabled={activeTicket ? (!userReplyText.trim() || isSendingReply) : (!message.trim() || isSending)}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white transition-all active:scale-95 shadow-lg",
                        (activeTicket ? userReplyText.trim() : message.trim())
                          ? "bg-[#00a884] hover:bg-[#008069]"
                          : "bg-gray-700 text-gray-500 cursor-not-allowed"
                      )}
                    >
                      {isSending || isSendingReply ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* WHATSAPP FOOTER */}
          <div className="py-2 px-4 bg-[#202c33] border-t border-gray-800 text-center text-[11px] text-gray-400">
            WhatsApp Style Live Support Desk • Connected directly to Admin
          </div>
        </div>
      )}

      {/* Real-time Floating Notification Banner with Audio Chime */}
      <AnimatePresence>
        {toastNotif && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[94vw] max-w-md bg-[#101721]/95 border border-cyan-500/50 rounded-2xl p-3.5 shadow-2xl shadow-cyan-950/80 backdrop-blur-xl flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/25 to-blue-500/25 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-300">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div 
              className="flex-1 min-w-0 cursor-pointer" 
              onClick={() => {
                setIsOpen(true);
                setView('history');
                setToastNotif(null);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate">{toastNotif.title}</span>
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Alert</span>
              </div>
              <p className="text-[11px] text-gray-300 line-clamp-2 mt-0.5 leading-snug">{toastNotif.message}</p>
            </div>
            <button 
              type="button"
              onClick={() => setToastNotif(null)}
              className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};



