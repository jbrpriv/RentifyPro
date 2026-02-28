'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import api from '@/utils/api';
import { MessageSquare, Send, Loader2, ArrowLeft, Users } from 'lucide-react';

const ROLE_COLORS = {
  landlord: 'bg-indigo-100 text-indigo-700',
  tenant: 'bg-green-100 text-green-700',
  property_manager: 'bg-amber-100 text-amber-700',
  admin: 'bg-red-100 text-red-700',
  law_reviewer: 'bg-purple-100 text-purple-700',
};

export default function MessagesPage() {
  const [user, setUser]           = useState(null);
  const [contacts, setContacts]   = useState([]);
  const [conversations, setConvs] = useState([]);
  const [active, setActive]       = useState(null);
  const [messages, setMessages]   = useState([]);
  const [content, setContent]     = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [sending, setSending]     = useState(false);
  const bottomRef                 = useRef(null);
  const socketRef                 = useRef(null);
  const activeRef                 = useRef(null);

  // Keep activeRef in sync for socket handler
  useEffect(() => { activeRef.current = active; }, [active]);

  // Initialize socket and user
  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (!stored) return;
    const u = JSON.parse(stored);
    setUser(u);
    fetchData();

    // Setup Socket.io
    const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    import('socket.io-client').then(({ io }) => {
      const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('register', u._id);
      });

      socket.on('new_message', (msg) => {
        const cur = activeRef.current;
        // Add to messages if it belongs to the current conversation
        if (
          cur &&
          String(msg.sender?._id || msg.sender) === String(cur.otherUserId) &&
          (msg.property?._id || msg.property || null)?.toString() === (cur.propertyId || null)?.toString()
        ) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
        }
        // Refresh conversation list
        fetchData(false);
      });

      return () => socket.disconnect();
    });
  }, []);

  useEffect(() => {
    if (active) fetchMessages();
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoadingConvs(true);
    try {
      const [inboxResp, contactsResp] = await Promise.all([
        api.get('/messages'),
        api.get('/users/contacts'),
      ]);
      setConvs(Array.isArray(inboxResp.data) ? inboxResp.data : []);
      setContacts(Array.isArray(contactsResp.data) ? contactsResp.data : []);
    } catch (err) { console.error(err); }
    finally { if (showLoader) setLoadingConvs(false); }
  };

  const fetchMessages = async () => {
    if (!active) return;
    setLoadingMsgs(true);
    try {
      const propertyId = active.propertyId || 'null';
      const { data } = await api.get(`/messages/${propertyId}/${active.otherUserId}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoadingMsgs(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || !active) return;
    setSending(true);
    try {
      const payload = {
        receiverId: active.otherUserId,
        content: content.trim(),
      };
      if (active.propertyId) payload.propertyId = active.propertyId;

      const { data } = await api.post('/messages', payload);
      setMessages(m => [...m, data]);
      setContent('');
      fetchData(false);
    } catch (err) { alert(err.response?.data?.message || 'Failed to send message'); }
    finally { setSending(false); }
  };

  const openConversation = (conv) => {
    const me = user?._id;
    const senderId  = conv.sender?._id || conv.sender;
    const otherUser = String(senderId) === String(me) ? conv.receiver : conv.sender;
    setActive({
      propertyId:    conv.property?._id || conv.property || null,
      otherUserId:   otherUser?._id || otherUser,
      otherName:     otherUser?.name || 'Unknown',
      propertyTitle: conv.property?.title || 'Direct Message',
    });
  };

  const openContactConversation = (contact) => {
    setActive({
      propertyId:    contact.propertyId || null,
      otherUserId:   contact.user?._id,
      otherName:     contact.user?.name || 'Unknown',
      propertyTitle: contact.propertyTitle || 'Direct Message',
      context:       contact.context,
    });
  };

  const me = user?._id;

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-0 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Sidebar */}
      <div className={`${active ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-col border-r border-gray-100`}>
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Messages</h1>
          <p className="text-xs text-gray-400">Real-time messaging</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-blue-400" /></div>
          ) : (
            <>
              {contacts.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-4 py-3 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Your Contacts
                  </p>
                  {contacts.map((c, i) => (
                    <button key={i} onClick={() => openContactConversation(c)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left ${
                        active?.otherUserId === c.user?._id && active?.propertyId === c.propertyId ? 'bg-blue-50' : ''
                      }`}>
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-black">{c.user?.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{c.user?.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${ROLE_COLORS[c.user?.role] || 'bg-gray-100 text-gray-600'}`}>
                            {c.context}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate">{c.propertyTitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {conversations.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-4 py-3">Recent Chats</p>
                  {conversations.map((conv, i) => {
                    const senderId  = conv.sender?._id || conv.sender;
                    const otherUser = String(senderId) === String(me) ? conv.receiver : conv.sender;
                    return (
                      <button key={i} onClick={() => openConversation(conv)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left">
                        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-600 text-xs font-black">{otherUser?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{otherUser?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 truncate">{conv.content?.substring(0, 40)}...</p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {contacts.length === 0 && conversations.length === 0 && (
                <div className="text-center py-16 px-4">
                  <MessageSquare className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                  <p className="text-sm font-bold text-gray-400">No contacts yet</p>
                  <p className="text-xs text-gray-300 mt-1">Contacts appear based on your role and active leases</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {active ? (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <button onClick={() => setActive(null)} className="md:hidden p-1 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-black">{active.otherName?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm font-black text-gray-900">{active.otherName}</p>
                <p className="text-[10px] text-gray-400">
                  {active.propertyTitle}{active.context ? ` · ${active.context}` : ''}
                  {socketRef.current?.connected && <span className="ml-2 text-green-500">● Live</span>}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-blue-400" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 text-gray-300 text-sm">Start the conversation</div>
              ) : (
                messages.map((msg) => {
                  const isMe = String(msg.sender?._id || msg.sender) === String(me);
                  return (
                    <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                        isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}>
                        {msg.content}
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-2">
              <input
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              />
              <button type="submit" disabled={sending || !content.trim()}
                className="bg-blue-600 text-white rounded-2xl px-4 py-2.5 hover:bg-blue-700 disabled:bg-blue-400 transition">
                {sending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-300">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4" />
              <p className="font-bold">Select a contact to start messaging</p>
              <p className="text-sm mt-1">Messages are delivered in real-time</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
