'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import {
  MessageSquare, Send, Loader2, X, Users, ChevronRight,
  Search, CheckCheck
} from 'lucide-react';

const ROLE_COLORS = {
  landlord:        { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  tenant:          { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  property_manager:{ bg: 'bg-amber-100',  text: 'text-amber-700'  },
  admin:           { bg: 'bg-rose-100',   text: 'text-rose-700'   },
  law_reviewer:    { bg: 'bg-violet-100', text: 'text-violet-700' },
};

function Avatar({ name, size = 'md', role }) {
  const c = ROLE_COLORS[role] || { bg: 'bg-slate-100', text: 'text-slate-600' };
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
  return (
    <div className={`${s} ${c.bg} ${c.text} rounded-2xl flex items-center justify-center font-black flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Notification Toast ────────────────────────────────────────────────────────
function NotificationToast({ notification, onDismiss, onOpen }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!notification) return;
    const t1 = setTimeout(() => setShow(true), 10);
    const t2 = setTimeout(() => { setShow(false); setTimeout(onDismiss, 400); }, 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <div
      onClick={() => { setShow(false); setTimeout(() => { onDismiss(); onOpen(notification); }, 200); }}
      className="fixed top-20 right-4 z-[200] cursor-pointer"
      style={{
        transition: 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: show ? 'translateX(0) scale(1)' : 'translateX(110%) scale(0.9)',
        opacity: show ? 1 : 0,
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3 w-80">
        <Avatar name={notification.senderName} size="md" role={notification.senderRole} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-sm font-black text-gray-900 truncate">{notification.senderName}</p>
            <button onClick={e => { e.stopPropagation(); setShow(false); setTimeout(onDismiss, 400); }}>
              <X className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
            </button>
          </div>
          <p className="text-xs text-gray-500 truncate">{notification.preview}</p>
          {notification.propertyTitle && (
            <p className="text-[10px] text-gray-300 mt-0.5 truncate">{notification.propertyTitle}</p>
          )}
        </div>
      </div>
      <span className="absolute -top-1 -right-1 flex h-4 w-4">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500" />
      </span>
    </div>
  );
}

// ── Chat Modal ────────────────────────────────────────────────────────────────
function ChatModal({ active, user, onClose, onNewMessage }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [show, setShow] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    setTimeout(() => setShow(true), 10);
    loadMessages();
    setTimeout(() => inputRef.current?.focus(), 350);
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Allow parent to push incoming socket messages into this modal
  useEffect(() => {
    if (!onNewMessage) return;
    onNewMessage.handler = (msg) => {
      const isRelevant =
        String(msg.sender?._id || msg.sender) === String(active?.otherUserId) ||
        String(msg.receiver?._id || msg.receiver) === String(active?.otherUserId);
      if (isRelevant) setMessages(m => [...m, msg]);
    };
  }, [active, onNewMessage]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const pid = active?.propertyId || 'null';
      const { data } = await api.get(`/messages/${pid}/${active?.otherUserId}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const close = () => { setShow(false); setTimeout(onClose, 300); };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    const draft = content.trim();
    const opt = { _id: `opt-${Date.now()}`, content: draft, sender: { _id: user?._id }, createdAt: new Date().toISOString(), _opt: true };
    setMessages(m => [...m, opt]);
    setContent('');
    try {
      const payload = { receiverId: active.otherUserId, content: draft };
      if (active.propertyId) payload.propertyId = active.propertyId;
      const { data } = await api.post('/messages', payload);
      setMessages(m => m.map(msg => msg._id === opt._id ? data : msg));
    } catch (err) {
      setMessages(m => m.filter(msg => msg._id !== opt._id));
      setContent(draft);
      alert(err.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  };

  const me = user?._id;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6"
      style={{ transition: 'opacity 300ms', opacity: show ? 1 : 0 }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={close} />
      <div
        className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden"
        style={{
          height: '82vh', maxHeight: '660px',
          transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: show ? 'translateY(0) scale(1)' : 'translateY(48px) scale(0.95)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <Avatar name={active?.otherName} size="md" role={active?.otherRole} />
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 leading-tight">{active?.otherName}</p>
            <p className="text-xs text-gray-400 truncate">{active?.propertyTitle || 'Direct Message'}</p>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-blue-400" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-blue-200" />
              </div>
              <p className="text-sm font-bold text-gray-300">Say hello 👋</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = String(msg.sender?._id || msg.sender) === String(me);
              const showTime = i === 0 || (new Date(msg.createdAt) - new Date(messages[i - 1]?.createdAt)) > 300000;
              return (
                <div key={msg._id}>
                  {showTime && (
                    <p className="text-center text-[10px] text-gray-300 font-semibold my-4">
                      {new Date(msg.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    } ${msg._opt ? 'opacity-60' : ''}`}>
                      {msg.content}
                      <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : ''}`}>
                        <span className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && !msg._opt && <CheckCheck className="w-3 h-3 text-blue-300" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-50 flex gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`Message ${active?.otherName?.split(' ')[0] || ''}...`}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
          />
          <button type="submit" disabled={sending || !content.trim()}
            className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-all active:scale-95">
            {sending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Contacts Panel ────────────────────────────────────────────────────────────
function ContactsPanel({ contacts, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => { setTimeout(() => setShow(true), 10); }, []);

  const close = () => { setShow(false); setTimeout(onClose, 300); };
  const select = (c) => { setShow(false); setTimeout(() => onSelect(c), 150); };

  const filtered = contacts.filter(c =>
    !search ||
    c.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.propertyTitle?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6"
      style={{ transition: 'opacity 300ms', opacity: show ? 1 : 0 }}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={close} />
      <div
        className="relative bg-white w-full sm:max-w-sm sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden"
        style={{
          maxHeight: '72vh',
          transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: show ? 'translateY(0) scale(1)' : 'translateY(48px) scale(0.95)',
        }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-black text-gray-900">Contacts</h2>
            <p className="text-xs text-gray-400">{contacts.length} available</p>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 pb-3">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-300">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No contacts found</p>
            </div>
          ) : filtered.map((c, i) => {
            const rc = ROLE_COLORS[c.user?.role] || { bg: 'bg-gray-100', text: 'text-gray-600' };
            return (
              <button key={i} onClick={() => select(c)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                <Avatar name={c.user?.name} size="md" role={c.user?.role} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{c.user?.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{c.propertyTitle}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${rc.bg} ${rc.text}`}>
                  {c.context}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [conversations, setConvs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [active, setActive] = useState(null);
  const [showContacts, setShowContacts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [search, setSearch] = useState('');
  const socketRef = useRef(null);
  const newMsgHandlerRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (!stored) { router.push('/login'); return; }
    const u = JSON.parse(stored);
    setUser(u);
    fetchData();

    const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    import('socket.io-client').then(({ io }) => {
      const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('connect', () => socket.emit('register', u._id));
      socket.on('new_message', (msg) => {
        fetchData(false);
        // Push to open chat modal if handler is registered
        if (newMsgHandlerRef.current?.handler) newMsgHandlerRef.current.handler(msg);
        // Toast only for incoming messages not in the currently open chat
        const cur = activeRef.current;
        const sId = String(msg.sender?._id || msg.sender);
        const isOpenChat = cur && sId === String(cur.otherUserId);
        const isMe = sId === String(u._id);
        if (!isMe && !isOpenChat) {
          setNotification({
            senderName: msg.sender?.name || 'Someone',
            senderRole: msg.sender?.role,
            preview: msg.content?.length > 50 ? msg.content.slice(0, 50) + '…' : msg.content,
            propertyTitle: msg.property?.title,
            msg,
          });
        }
      });
    });
    return () => socketRef.current?.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [inboxRes, contactsRes] = await Promise.all([
        api.get('/messages'),
        api.get('/users/contacts'),
      ]);
      setConvs(Array.isArray(inboxRes.data) ? inboxRes.data : []);
      setContacts(Array.isArray(contactsRes.data) ? contactsRes.data : []);
    } catch (err) { console.error(err); }
    finally { if (showLoader) setLoading(false); }
  };

  const openConversation = (conv) => {
    const me = user?._id;
    const sId = conv.sender?._id || conv.sender;
    const other = String(sId) === String(me) ? conv.receiver : conv.sender;
    setActive({
      propertyId: conv.property?._id || conv.property || null,
      otherUserId: other?._id || other,
      otherName: other?.name || 'Unknown',
      otherRole: other?.role,
      propertyTitle: conv.property?.title || 'Direct Message',
    });
  };

  const openContact = (contact) => {
    setShowContacts(false);
    setActive({
      propertyId: contact.propertyId || null,
      otherUserId: contact.user?._id,
      otherName: contact.user?.name || 'Unknown',
      otherRole: contact.user?.role,
      propertyTitle: contact.propertyTitle || 'Direct Message',
    });
  };

  const handleNotifOpen = (notif) => {
    const msg = notif.msg;
    const me = user?._id;
    const sId = msg.sender?._id || msg.sender;
    const other = String(sId) === String(me) ? msg.receiver : msg.sender;
    setActive({
      propertyId: msg.property?._id || msg.property || null,
      otherUserId: other?._id || other,
      otherName: other?.name || 'Unknown',
      otherRole: other?.role,
      propertyTitle: msg.property?.title || 'Direct Message',
    });
  };

  const me = user?._id;
  const filtered = conversations.filter(c => {
    if (!search) return true;
    const sId = c.sender?._id || c.sender;
    const other = String(sId) === String(me) ? c.receiver : c.sender;
    return other?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.property?.title?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <NotificationToast
        notification={notification}
        onDismiss={() => setNotification(null)}
        onOpen={handleNotifOpen}
      />

      {active && (
        <ChatModal
          active={active}
          user={user}
          onClose={() => { setActive(null); fetchData(false); }}
          onNewMessage={newMsgHandlerRef.current || (newMsgHandlerRef.current = {})}
        />
      )}

      {showContacts && (
        <ContactsPanel contacts={contacts} onSelect={openContact} onClose={() => setShowContacts(false)} />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Messages</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowContacts(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
            <Users className="w-4 h-4" />
            Contacts
            {contacts.length > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {contacts.length > 9 ? '9+' : contacts.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        {/* Conversations */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin w-7 h-7 text-blue-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-200" />
              </div>
              <p className="font-bold text-gray-400">
                {search ? 'No conversations match' : 'No conversations yet'}
              </p>
              {!search && (
                <p className="text-sm text-gray-300 mt-1">Press <strong>Contacts</strong> to start one</p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filtered.map((conv, i) => {
                const sId = conv.sender?._id || conv.sender;
                const other = String(sId) === String(me) ? conv.receiver : conv.sender;
                const isMine = String(sId) === String(me);
                const unread = conv.unreadCount > 0;
                return (
                  <li key={i}>
                    <button
                      onClick={() => openConversation(conv)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar name={other?.name} size="lg" role={other?.role} />
                        {unread && (
                          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className={`text-sm truncate ${unread ? 'font-black text-gray-900' : 'font-semibold text-gray-700'}`}>
                            {other?.name || 'Unknown'}
                          </p>
                          <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(conv.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isMine && <CheckCheck className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                          <p className={`text-xs truncate ${unread ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>
                            {isMine ? 'You: ' : ''}{conv.content}
                          </p>
                        </div>
                        {conv.property?.title && (
                          <p className="text-[10px] text-gray-300 truncate mt-0.5">{conv.property.title}</p>
                        )}
                      </div>
                      {unread && (
                        <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}