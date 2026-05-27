import { useState, useRef, useEffect } from 'react'
import { Search, Send, Phone, ChevronLeft, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { formatRelativeTime, sanitizeField } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { shops } from '@/data/mock'

const mockConversations = [
  {
    id: 1, shopId: 1, customerId: 1, customerName: 'Gerald Hutchins', customerPhone: '+1 (713) 881-4472',
    vehicle: '2019 Ford F-150', roId: 'RO-8841', unread: 2, lastActivity: '2026-05-17T09:15:00',
    messages: [
      { id: 1, from: 'shop', text: 'Hi Gerald, your F-150 is in the bay now. We found a couple things during inspection — I\'ll send photos shortly.', time: '2026-05-17T08:30:00' },
      { id: 2, from: 'shop', text: 'Engine air filter is pretty dirty. Recommend replacing — $38 parts + $10 labor. Want us to go ahead?', time: '2026-05-17T08:45:00' },
      { id: 3, from: 'customer', text: 'Yeah go ahead and do it. How long total?', time: '2026-05-17T09:00:00' },
      { id: 4, from: 'shop', text: 'Should be done by 2pm. I\'ll text you when it\'s ready for pickup.', time: '2026-05-17T09:05:00' },
      { id: 5, from: 'customer', text: 'Perfect, thanks!', time: '2026-05-17T09:15:00' },
    ],
  },
  {
    id: 2, shopId: 5, customerId: 7, customerName: 'Derek Williamson', customerPhone: '+1 (832) 798-5503',
    vehicle: '2022 BMW X5', roId: 'RO-8845', unread: 0, lastActivity: '2026-05-16T17:30:00',
    messages: [
      { id: 1, from: 'shop', text: 'Hi Derek, estimate for your X5 brake job is ready — $846.52 total. I\'ve sent the details to your email. Let me know if you\'d like to approve.', time: '2026-05-16T11:00:00' },
      { id: 2, from: 'customer', text: 'Looks good. Go ahead and schedule it.', time: '2026-05-16T12:30:00' },
      { id: 3, from: 'shop', text: 'Great! We have an opening Thursday at 9am. Does that work?', time: '2026-05-16T12:45:00' },
      { id: 4, from: 'customer', text: 'Thursday works. See you then.', time: '2026-05-16T17:30:00' },
    ],
  },
  {
    id: 3, shopId: 2, customerId: 4, customerName: 'Tanya Reeves', customerPhone: '+1 (713) 556-3847',
    vehicle: '2020 Honda Civic', roId: null, unread: 1, lastActivity: '2026-05-17T07:45:00',
    messages: [
      { id: 1, from: 'customer', text: 'Hi, my car has been making a clicking noise when I turn. Is that something you can look at?', time: '2026-05-17T07:45:00' },
    ],
  },
  {
    id: 4, shopId: 3, customerId: 2, customerName: 'Sandra Montoya', customerPhone: '+1 (281) 772-6931',
    vehicle: '2018 Chevrolet Equinox', roId: 'RO-8843', unread: 0, lastActivity: '2026-05-15T14:20:00',
    messages: [
      { id: 1, from: 'shop', text: 'Hi Sandra, your Equinox is ready for pickup! Total came to $613.78.', time: '2026-05-15T14:00:00' },
      { id: 2, from: 'customer', text: 'On my way! Can I pay with card when I get there?', time: '2026-05-15T14:15:00' },
      { id: 3, from: 'shop', text: 'Absolutely. We accept all major cards. See you soon!', time: '2026-05-15T14:20:00' },
    ],
  },
  {
    id: 5, shopId: 1, customerId: 5, customerName: 'Louis Bergman', customerPhone: '+1 (281) 663-0921',
    vehicle: '2021 Toyota Camry', roId: 'RO-8842', unread: 0, lastActivity: '2026-05-16T10:00:00',
    messages: [
      { id: 1, from: 'shop', text: 'Hey Louis, quick update — the solenoid pack we ordered arrived. We\'ll have your Camry done by end of day.', time: '2026-05-16T09:30:00' },
      { id: 2, from: 'customer', text: 'Great news. Thanks for keeping me updated.', time: '2026-05-16T10:00:00' },
    ],
  },
]

function ConversationList({ conversations, selected, onSelect, search }) {
  const filtered = conversations.filter(c => {
    const q = search.toLowerCase()
    return !q || c.customerName.toLowerCase().includes(q) || c.vehicle.toLowerCase().includes(q)
  })

  return (
    <div className="flex-1 overflow-y-auto">
      {filtered.map(conv => {
        const lastMsg = conv.messages[conv.messages.length - 1]
        const shop = shops.find(s => s.id === conv.shopId)
        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={cn(
              'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-150 border-b border-border',
              selected?.id === conv.id ? 'bg-orange-subtle/50' : 'hover:bg-surface'
            )}
          >
            <div className="w-9 h-9 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-orange">
                {conv.customerName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-text-primary truncate">{conv.customerName}</span>
                <span className="text-2xs text-text-muted flex-shrink-0">{formatRelativeTime(conv.lastActivity)}</span>
              </div>
              <div className="text-2xs text-text-muted truncate mt-0.5">{conv.vehicle} · {shop?.name}</div>
              <div className="text-xs text-text-secondary truncate mt-1">
                {lastMsg.from === 'shop' && <span className="text-text-muted">You: </span>}
                {lastMsg.text}
              </div>
            </div>
            {conv.unread > 0 && (
              <span className="w-5 h-5 rounded-full bg-orange text-white text-2xs font-bold flex items-center justify-center flex-shrink-0">
                {conv.unread}
              </span>
            )}
          </button>
        )
      })}
      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-text-muted">No conversations found</div>
      )}
    </div>
  )
}

function MessageThread({ conversation, onBack }) {
  const [draft, setDraft] = useState('')
  const messagesEnd = useRef(null)

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages?.length])

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-20">💬</div>
          <p className="text-sm text-text-muted">Select a conversation</p>
        </div>
      </div>
    )
  }

  const shop = shops.find(s => s.id === conversation.shopId)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
        <button onClick={onBack} className="lg:hidden w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-border transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="w-8 h-8 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-orange">
            {conversation.customerName.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary">{conversation.customerName}</div>
          <div className="text-2xs text-text-muted">{conversation.vehicle} · {shop?.name}</div>
        </div>
        <div className="flex items-center gap-2">
          {conversation.roId && (
            <span className="text-2xs px-2 py-1 rounded-md bg-background border border-border text-text-muted font-medium">
              {conversation.roId}
            </span>
          )}
          <button className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-border transition-colors">
            <Phone size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {conversation.messages.map(msg => (
          <div key={msg.id} className={cn('flex', msg.from === 'shop' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
              msg.from === 'shop'
                ? 'bg-orange text-white rounded-br-md'
                : 'bg-surface border border-border text-text-primary rounded-bl-md'
            )}>
              {msg.text}
              <div className={cn(
                'text-2xs mt-1',
                msg.from === 'shop' ? 'text-white/60' : 'text-text-muted'
              )}>
                {new Date(msg.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>

      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-10 px-4 rounded-full bg-background border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40 transition-shadow"
            onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { sanitizeField(draft, 1000); setDraft('') } }}
          />
          <button
            disabled={!draft.trim()}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150',
              draft.trim()
                ? 'bg-orange text-white hover:bg-orange/90'
                : 'bg-border text-text-muted'
            )}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Messages() {
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const scoped = isAdvisor
    ? mockConversations.filter(c => c.shopId === session.shopId)
    : mockConversations

  const totalUnread = scoped.reduce((sum, c) => sum + c.unread, 0)

  return (
    <div className="h-full flex animate-fade-in">
      <div className={cn(
        'w-full lg:w-80 xl:w-96 border-r border-border flex flex-col',
        selected ? 'hidden lg:flex' : 'flex'
      )}>
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-text-primary">Messages</h1>
              {totalUnread > 0 && (
                <p className="text-2xs text-text-muted">{totalUnread} unread</p>
              )}
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(sanitizeField(e.target.value, 100))}
              placeholder="Search conversations..."
              className="w-full h-8 pl-9 pr-3 rounded-lg bg-background border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40 transition-shadow"
            />
          </div>
        </div>
        <ConversationList conversations={scoped} selected={selected} onSelect={setSelected} search={search} />
      </div>

      <div className={cn(
        'flex-1 flex flex-col min-w-0',
        !selected ? 'hidden lg:flex' : 'flex'
      )}>
        <MessageThread conversation={selected} onBack={() => setSelected(null)} />
      </div>
    </div>
  )
}
