'use client'

import React, { useRef, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  Bot,
  User,
  Loader2,
  Satellite,
  Cloud,
  TreeDeciduous,
  FlaskConical,
  Leaf,
  TrendingUp,
  MapPin,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'

interface AIChatProps {
  initialLat?: number
  initialLng?: number
  className?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

interface ToolCall {
  name: string
  args: Record<string, unknown>
  result?: Record<string, unknown> | string | number | boolean | null
  state: 'calling' | 'completed' | 'error'
}

// Tool icon mapping
const toolIcons: Record<string, React.ReactNode> = {
  analyzeSatellite: <Satellite className="h-3.5 w-3.5" />,
  getWeather: <Cloud className="h-3.5 w-3.5" />,
  checkDeforestation: <AlertTriangle className="h-3.5 w-3.5" />,
  analyzeSoil: <FlaskConical className="h-3.5 w-3.5" />,
  recommendSpecies: <Leaf className="h-3.5 w-3.5" />,
  predictImpact: <TrendingUp className="h-3.5 w-3.5" />,
}

const toolLabels: Record<string, string> = {
  analyzeSatellite: 'Satellite Analysis',
  getWeather: 'Weather Data',
  checkDeforestation: 'Deforestation Check',
  analyzeSoil: 'Soil Analysis',
  recommendSpecies: 'Species Recommendation',
  predictImpact: 'Impact Prediction',
}

// Tool invocation renderer
function ToolInvocation({ toolCall }: { toolCall: ToolCall }) {
  const isLoading = toolCall.state === 'calling'
  const hasOutput = toolCall.state === 'completed'
  const hasError = toolCall.state === 'error'

  const getToolIcon = (name: string): React.ReactElement => {
    const icon = toolIcons[name]
    if (icon && React.isValidElement(icon)) {
      return icon
    }
    return <Sparkles className="h-3.5 w-3.5" />
  }

  return (
    <div className="my-2 rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md',
            isLoading
              ? 'bg-amber-500/20 text-amber-400'
              : hasError
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-emerald-500/20 text-emerald-400'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            getToolIcon(toolCall.name)
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            {toolLabels[toolCall.name] || toolCall.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? 'Fetching data...'
              : hasError
                ? 'Error occurred'
                : 'Complete'}
          </p>
        </div>
        {hasOutput && (
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            Success
          </Badge>
        )}
      </div>

      {hasOutput && toolCall.result && (
        <div className="mt-3 rounded-md bg-background/50 p-2 text-xs">
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-muted-foreground">
            {typeof toolCall.result === 'object' 
              ? JSON.stringify(toolCall.result, null, 2)
              : String(toolCall.result)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Message renderer
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn('flex gap-3 py-4', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-emerald-500/20 text-emerald-400'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          'flex max-w-[85%] flex-col gap-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {message.content && (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5',
              isUser
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-secondary/50 text-foreground rounded-tl-sm'
            )}
          >
            <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <table className="w-full border-collapse text-sm my-2">
                      {children}
                    </table>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border/50 bg-secondary/50 px-2 py-1 text-left font-medium">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border/50 px-2 py-1">
                      {children}
                    </td>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className
                    return isInline ? (
                      <code className="bg-secondary/70 px-1 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-secondary/70 p-2 rounded text-xs font-mono overflow-x-auto my-2">
                        {children}
                      </code>
                    )
                  },
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic">{children}</em>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/50 pl-3 my-2 italic text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {message.toolCalls?.map((toolCall, i) => (
          <ToolInvocation key={i} toolCall={toolCall} />
        ))}
      </div>
    </div>
  )
}

// Suggested prompts
const suggestedPrompts = [
  {
    icon: <MapPin className="h-4 w-4" />,
    label: 'Analyze this area',
    prompt: 'Analyze the current coordinates for afforestation potential',
  },
  {
    icon: <Leaf className="h-4 w-4" />,
    label: 'Best species',
    prompt: 'What tree species would be best suited for this location?',
  },
  {
    icon: <TreeDeciduous className="h-4 w-4" />,
    label: 'Forest health',
    prompt: 'Check for any deforestation alerts in this region',
  },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    label: 'Impact prediction',
    prompt: 'If I plant 50 hectares here, what would be the ecosystem impact over 10 years?',
  },
]

// Custom hook for chat functionality
function useCustomChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  const sendMessage = async (text: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    }

    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            parts: [{ type: 'text', text: m.content }],
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Chat API error:', errorData)
        throw new Error(errorData.error || 'Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        toolCalls: [],
      }

      let buffer = ''
      let hasContent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)

            if (parsed.type === 'text') {
              assistantMessage.content += parsed.text
              hasContent = true
              setMessages(prev => {
                const filtered = prev.filter(m => m.id !== assistantMessage.id)
                return [...filtered, { ...assistantMessage }]
              })
            } else if (parsed.type === 'tool-invocation') {
              const toolCall: ToolCall = {
                name: parsed.toolName,
                args: parsed.args,
                state: 'calling',
              }
              assistantMessage.toolCalls = [...(assistantMessage.toolCalls || []), toolCall]
              hasContent = true
              setMessages(prev => {
                const filtered = prev.filter(m => m.id !== assistantMessage.id)
                return [...filtered, { ...assistantMessage }]
              })
            } else if (parsed.type === 'tool-result') {
              const toolCalls = assistantMessage.toolCalls || []
              const toolIndex = toolCalls.findIndex(t => t.name === parsed.toolName && t.state === 'calling')
              if (toolIndex >= 0) {
                toolCalls[toolIndex] = {
                  ...toolCalls[toolIndex],
                  result: parsed.result,
                  state: 'completed',
                }
                assistantMessage.toolCalls = toolCalls
                setMessages(prev => {
                  const filtered = prev.filter(m => m.id !== assistantMessage.id)
                  return [...filtered, { ...assistantMessage }]
                })
              }
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e)
          }
        }
      }

      // Ensure final message is in the list
      if (hasContent) {
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== assistantMessage.id)
          return [...filtered, { ...assistantMessage }]
        })
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: errorMessage.includes('API key') || errorMessage.includes('configured')
            ? errorMessage
            : 'Sorry, I encountered an error. Please try again or check if API keys are configured.',
        },
      ])
    } finally {
      setIsStreaming(false)
    }
  }

  return { messages, sendMessage, isStreaming }
}

export function AIChat({ initialLat, initialLng, className }: AIChatProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const { messages, sendMessage, isStreaming } = useCustomChat()

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    // Append coordinates context if available
    let messageText = input
    if (initialLat && initialLng && !input.toLowerCase().includes('coordinate')) {
      messageText += ` (Current coordinates: ${initialLat.toFixed(4)}, ${initialLng.toFixed(4)})`
    }

    sendMessage(messageText)
    setInput('')
  }

  const handleSuggestedPrompt = (prompt: string) => {
    let messageText = prompt
    if (initialLat && initialLng) {
      messageText += ` at coordinates ${initialLat.toFixed(4)}, ${initialLng.toFixed(4)}`
    }
    sendMessage(messageText)
  }

  return (
    <Card
      className={cn(
        'flex h-full flex-col overflow-hidden border-border/50 bg-card/50 backdrop-blur',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20">
          <Bot className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">HABITAT-AI</h3>
          <p className="text-xs text-muted-foreground">
            GIS Expert Agent
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-xs',
            isStreaming
              ? 'border-amber-500/30 text-amber-400'
              : 'border-emerald-500/30 text-emerald-400'
          )}
        >
          {isStreaming ? 'Thinking...' : 'Online'}
        </Badge>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
              <TreeDeciduous className="h-8 w-8 text-emerald-400" />
            </div>
            <h4 className="mb-2 font-semibold text-foreground">
              Welcome to HABITAT-AI
            </h4>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              I can help you analyze satellite imagery, assess soil conditions,
              recommend species, and predict ecosystem impact for your
              reforestation projects.
            </p>

            {/* Suggested prompts */}
            <div className="grid w-full max-w-md grid-cols-2 gap-2">
              {suggestedPrompts.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-auto flex-col gap-1.5 py-3 text-left bg-secondary/30 hover:bg-secondary/50 border-border/50"
                  onClick={() => handleSuggestedPrompt(prompt.prompt)}
                >
                  <div className="flex w-full items-center gap-2 text-foreground">
                    {prompt.icon}
                    <span className="text-xs font-medium">{prompt.label}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isStreaming && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyzing...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border/50 p-4 shrink-0 bg-card/50"
      >
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about satellite analysis, species recommendations, or ecosystem impact..."
            className="min-h-[44px] max-h-32 resize-none bg-secondary/30 border-border/50"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
            className="h-11 w-11 shrink-0 bg-emerald-600 hover:bg-emerald-500"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {initialLat && initialLng && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            Context: {initialLat.toFixed(4)}, {initialLng.toFixed(4)}
          </p>
        )}
      </form>
    </Card>
  )
}
