'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User } from 'lucide-react'
import { useTheme } from 'next-themes'

function formatBotText(text: string) {
  const parts: React.ReactNode[] = []
  const lines = text.split('\n')
  
  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim()
    const isBullet = /^[-•*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)
    
    // Bold formatting: **text**
    const segments = line.split(/(\*\*[^*]+\*\*)/)
    const formatted = segments.map((seg, i) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={i} className="font-semibold">{seg.slice(2, -2)}</strong>
      }
      return seg
    })

    if (isBullet) {
      const content = trimmed.replace(/^[-•*]\s/, '').replace(/^\d+[.)]\s/, '')
      const bulletFormatted = content.split(/(\*\*[^*]+\*\*)/).map((seg, i) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return <strong key={i} className="font-semibold">{seg.slice(2, -2)}</strong>
        }
        return seg
      })
      parts.push(
        <div key={lineIdx} className="flex gap-1.5 items-start ml-1">
          <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
          <span>{bulletFormatted}</span>
        </div>
      )
    } else {
      if (lineIdx > 0 && trimmed) parts.push(<br key={`br-${lineIdx}`} />)
      if (trimmed) parts.push(<span key={lineIdx}>{formatted}</span>)
    }
  })
  
  return parts
}

interface Message {
  id: number
  text: string
  sender: 'bot' | 'user'
  timestamp: Date
}

export function ChatBot() {
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [hasClicked, setHasClicked] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hey! 👋 I'm Amal's AI assistant. Ask me anything about his work, skills, or just say hi!",
      sender: 'bot',
      timestamp: new Date()
    }
  ])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const userMessage: Message = { id: Date.now(), text: input.trim(), sender: 'user', timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    const userText = input.trim()
    setInput('')
    setIsTyping(true)
    try {
      const res = await fetch('https://serverless-chatbot-backend.vercel.app/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setMessages(prev => [...prev, { id: Date.now(), text: data.reply, sender: 'bot', timestamp: new Date() }])
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), text: "Oops, my servers are taking a quick nap. Try again in a second! 😴", sender: 'bot', timestamp: new Date() }])
    } finally {
      setIsTyping(false)
    }
  }

  const brandColor = 'var(--primary)'
  const brandGradient = 'var(--primary)'

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsOpen(true)
              setHasClicked(true)
            }}
            className={`fixed bottom-6 right-6 z-[200] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl cursor-pointer backdrop-blur-xl ${theme === 'light' ? 'bg-white/60 border-black/5 text-[#060606]' : 'bg-black/60 border-white/10 text-white'}`}
            style={{ 
              boxShadow: `0 8px 32px 0 rgba(0, 0, 0, ${theme === 'light' ? '0.1' : '0.3'})`,
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            <MessageCircle className="w-6 h-6" style={{ color: brandColor }} />
            {/* The ripple effect (only before first click) */}
            {!hasClicked && (
              <span className="absolute inset-0 rounded-full border border-transparent animate-ping" style={{ borderColor: brandColor, opacity: 0.5 }} />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-[200] w-[380px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-100px)] rounded-2xl overflow-hidden flex flex-col dark:bg-[#111111] bg-white dark:border-white/10 border-gray-200 border"
            style={{ boxShadow: `0 25px 60px -12px rgba(0, 0, 0, 0.3), 0 0 40px -10px ${brandColor}20` }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ background: brandGradient }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Amal's AI Assistant</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white/70 text-xs">Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 gentle-animation cursor-pointer">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div 
              className="flex-1 overflow-y-scroll px-4 py-4 space-y-3 scrollbar-thin"
              style={{ overscrollBehavior: 'contain', pointerEvents: 'auto' }}
            >
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ background: `${brandColor}20` }}>
                      <Bot className="w-3.5 h-3.5" style={{ color: brandColor }} />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user' ? 'text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}
                    style={msg.sender === 'user' ? { background: brandColor } : {}}
                  >
                    {msg.sender === 'bot' ? formatBotText(msg.text) : msg.text}
                  </div>
                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${brandColor}20` }}>
                    <Bot className="w-3.5 h-3.5" style={{ color: brandColor }} />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 border-t border-border">
              <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex items-center gap-2">
                <input
                  type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all"
                  style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                />
                <button type="submit" disabled={!input.trim()} className="w-10 h-10 rounded-xl flex items-center justify-center text-white gentle-animation hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 cursor-pointer" style={{ background: brandColor }}>
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-center text-[10px] text-muted-foreground mt-2 font-mono">Powered by AI</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
