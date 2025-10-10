'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Zap, 
  Brain, 
  Search, 
  TrendingUp, 
  BarChart3,
  Users,
  FileText,
  Calculator,
  Globe,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Paperclip,
  Smile,
  MoreHorizontal,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Target,
  PieChart,
  Building2,
  DollarSign,
  ArrowRight,
  Star,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEntityContext } from '@/hooks/useEntityContext';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'action' | 'insight' | 'error' | 'success';
  actions?: Array<{
    id: string;
    label: string;
    type: 'button' | 'link' | 'action';
    action: string;
    icon?: string;
  }>;
  confidence?: number;
  sources?: Array<{
    title: string;
    url?: string;
    type: 'internal' | 'external' | 'calculation';
  }>;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  category: 'finance' | 'forecasting' | 'investors' | 'analysis' | 'general';
}

const quickActions: QuickAction[] = [
  {
    id: 'dashboard-insights',
    label: 'Dashboard Insights',
    description: 'Explain current metrics and trends',
    icon: <BarChart3 className="w-4 h-4" />,
    action: 'analyze_dashboard',
    category: 'analysis'
  },
  {
    id: 'financial-forecast',
    label: 'Financial Forecast',
    description: 'Create or update financial projections',
    icon: <TrendingUp className="w-4 h-4" />,
    action: 'create_forecast',
    category: 'forecasting'
  },
  {
    id: 'investor-research',
    label: 'Investor Research',
    description: 'Look up investor information online',
    icon: <Users className="w-4 h-4" />,
    action: 'research_investor',
    category: 'investors'
  },
  {
    id: 'expense-analysis',
    label: 'Expense Analysis',
    description: 'Analyze and categorize expenses',
    icon: <Calculator className="w-4 h-4" />,
    action: 'analyze_expenses',
    category: 'finance'
  },
  {
    id: 'market-analysis',
    label: 'Market Analysis',
    description: 'Get current market insights',
    icon: <Globe className="w-4 h-4" />,
    action: 'market_analysis',
    category: 'analysis'
  },
  {
    id: 'entity-overview',
    label: 'Entity Overview',
    description: 'Get comprehensive entity summary',
    icon: <Building2 className="w-4 h-4" />,
    action: 'entity_overview',
    category: 'general'
  }
];

export default function CASEAssistant() {
  const { selectedEntityId } = useEntityContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm NEX, your Next Generation financial assistant powered by GPT-5. I have comprehensive access to your NGI Capital database and real-time market data. Ask me anything about your financials, forecasts, market analysis, or strategic planning.",
      timestamp: new Date(),
      type: 'text',
      confidence: 0.95
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (message?: string) => {
    const messageToSend = message || input.trim();
    if (!messageToSend) return;
    
    const userMessage: Message = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
            try {
      // Call enhanced NEX endpoint with full API access
              const response = await fetch('/api/finance/ai/case-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
          message: messageToSend,
          context: 'comprehensive', // Full context access
                  entity_id: selectedEntityId,
          conversation_history: messages.slice(-10), // Extended context
          include_internet_search: true,
          include_dashboard_insights: true,
          include_forecasting: true,
          include_investor_research: true
                }),
              });

              const data = await response.json();

      const assistantMessage: Message = {
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
        type: data.type || 'text',
        actions: data.actions || [],
        confidence: data.confidence || 0.8,
        sources: data.sources || []
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle suggested actions
              if (data.actions && data.actions.length > 0) {
                console.log('NEX suggested actions:', data.actions);
                // TODO: Implement action handling in the UI
              }
            } catch (error) {
      const errorMessage: Message = {
                role: 'assistant',
                content: "I'm having trouble connecting to the AI service. Please check your API key configuration.",
                timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
            } finally {
              setIsLoading(false);
            }
  };

  const handleQuickAction = (action: QuickAction) => {
    const actionMessages = {
      'analyze_dashboard': 'Please analyze my current dashboard metrics and provide insights on key trends and areas for improvement.',
      'create_forecast': 'Help me create a comprehensive financial forecast for the next 12 months based on current data.',
      'research_investor': 'I need to research potential investors. Can you help me find information about relevant investors in our industry?',
      'analyze_expenses': 'Please analyze my recent expenses and provide recommendations for cost optimization.',
      'market_analysis': 'Give me a current market analysis relevant to our business and industry.',
      'entity_overview': 'Provide a comprehensive overview of our current entity structure and financial position.'
    };

    handleSend(actionMessages[action.action as keyof typeof actionMessages] || action.label);
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'action': return <Target className="w-4 h-4" />;
      case 'insight': return <Lightbulb className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'success': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getMessageColor = (type?: string) => {
    switch (type) {
      case 'action': return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'insight': return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'error': return 'bg-red-50 border-red-200 text-red-900';
      case 'success': return 'bg-green-50 border-green-200 text-green-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <TooltipProvider>
      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.05 }}
        onHoverStart={() => console.log('NEX hover start')}
        onHoverEnd={() => console.log('NEX hover end')}
      >
        <div className="relative group">
        <Button
          size="lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('NEX button clicked!', isOpen);
              setIsOpen(!isOpen);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="h-12 w-12 rounded-full shadow-xl bg-gradient-to-br from-blue-600 to-purple-600 dark:from-blue-500 dark:to-slate-900 hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-400 dark:hover:to-slate-800 transition-all duration-300 hover:scale-110 cursor-pointer relative z-10"
            style={{ pointerEvents: 'auto' }}
          >
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <motion.svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* NEX Robot Emblem - Next Generation Investors */}
                  
                  {/* Main rectangular body - modular segments */}
                  <motion.rect
                    x="6"
                    y="4"
                    width="12"
                    height="16"
                    rx="1"
                    fill="currentColor"
                    opacity="0.9"
                    animate={{ 
                      opacity: [0.9, 1, 0.9],
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  />
                  
                  {/* Vertical segment dividers */}
                  <line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
                  <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
                  <line x1="15" y1="4" x2="15" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
                  
                  {/* Horizontal segment dividers */}
                  <line x1="6" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
                  <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
                  <line x1="6" y1="16" x2="18" y2="16" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
                  
                  {/* Central processing unit - glowing core */}
                  <motion.rect
                    x="10"
                    y="10"
                    width="4"
                    height="4"
                    rx="0.5"
                    fill="white"
                    opacity="0.8"
                    animate={{ 
                      opacity: [0.8, 1, 0.8],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  />
                  
                  {/* Status indicators - corner lights */}
                  <motion.circle
                    cx="7"
                    cy="6"
                    r="0.8"
                    fill="currentColor"
                    opacity="0.7"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  />
                  <motion.circle
                    cx="17"
                    cy="6"
                    r="0.8"
                    fill="currentColor"
                    opacity="0.7"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  />
                  <motion.circle
                    cx="7"
                    cy="18"
                    r="0.8"
                    fill="currentColor"
                    opacity="0.7"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                  />
                  <motion.circle
                    cx="17"
                    cy="18"
                    r="0.8"
                    fill="currentColor"
                    opacity="0.7"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 1.5 }}
                  />
                  
                  {/* Subtle outer frame */}
                  <rect
                    x="5.5"
                    y="3.5"
                    width="13"
                    height="17"
                    rx="1.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    opacity="0.3"
                  />
                </motion.svg>
              )}
            </motion.div>
        </Button>
        
          {/* Animated pulse ring - stops on hover */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-blue-400 dark:border-blue-300 pointer-events-none"
            animate={{ 
              scale: [1, 1.2, 1], 
              opacity: [0.7, 0, 0.7] 
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              repeatDelay: 0
            }}
            whileHover={{
              scale: 1,
              opacity: 0.3
            }}
          />
          
        </div>
      </motion.div>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : '80vh'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              "fixed right-6 z-50 w-[420px] shadow-2xl rounded-2xl overflow-hidden",
              isMinimized ? "bottom-24" : "bottom-24"
            )}
          >
            <Card className="h-full flex flex-col bg-white/95 backdrop-blur-xl border-0">
              {/* Header */}
              <CardHeader className="pb-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-slate-900 text-white">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <motion.div
                      className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm shadow-lg"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Bot className="w-6 h-6" />
                    </motion.div>
                  <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xl">NEX</h3>
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          <Zap className="w-3 h-3 mr-1" />
                          GPT-5
                        </Badge>
                      </div>
                      <p className="text-sm text-white/80 flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        Next Generation Financial Assistant
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsMinimized(!isMinimized)}
                          className="text-white hover:bg-white/20 rounded-full"
                        >
                          {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Minimize</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsOpen(false)}
                          className="text-white hover:bg-white/20 rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Close</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardHeader>

              {!isMinimized && (
                <CardContent className="flex-1 flex flex-col p-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
                      <TabsTrigger value="chat" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="actions" className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Quick Actions
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="chat" className="flex-1 flex flex-col m-0">
              {/* Messages */}
                      <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                            <motion.div
                      key={idx}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className={cn(
                                  "text-xs font-semibold",
                                  msg.role === 'user' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                                )}>
                          {msg.role === 'user' ? 'U' : 'C'}
                        </AvatarFallback>
                      </Avatar>
                              <div className="flex-1 space-y-2">
                      <div
                                  className={cn(
                                    "rounded-2xl px-4 py-3 max-w-[85%] border",
                          msg.role === 'user'
                                      ? 'bg-blue-600 text-white ml-auto'
                                      : getMessageColor(msg.type)
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                      {msg.confidence && (
                                        <div className="flex items-center gap-1 mt-2">
                                          <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-green-500 transition-all duration-300"
                                              style={{ width: `${msg.confidence * 100}%` }}
                                            />
                                          </div>
                                          <span className="text-xs text-gray-500">
                                            {Math.round(msg.confidence * 100)}%
                        </span>
                      </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {msg.type && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="text-xs">
                                              {getMessageIcon(msg.type)}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>{msg.type}</TooltipContent>
                                        </Tooltip>
                                      )}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-gray-400 hover:text-gray-600"
                                            onClick={() => copyToClipboard(msg.content, `msg-${idx}`)}
                                          >
                                            {copiedMessageId === `msg-${idx}` ? (
                                              <Check className="w-3 h-3" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Copy message</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                  
                                  {/* Actions */}
                                  {msg.actions && msg.actions.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      <Separator />
                                      <div className="flex flex-wrap gap-2">
                                        {msg.actions.map((action, actionIdx) => (
                                          <Button
                                            key={actionIdx}
                                            variant="outline"
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => handleSend(action.action)}
                                          >
                                            {action.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Sources */}
                                  {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3">
                                      <Separator />
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-600">Sources:</p>
                                        {msg.sources.map((source, sourceIdx) => (
                                          <div key={sourceIdx} className="flex items-center gap-2 text-xs">
                                            <div className={cn(
                                              "w-2 h-2 rounded-full",
                                              source.type === 'internal' ? 'bg-blue-500' :
                                              source.type === 'external' ? 'bg-green-500' : 'bg-purple-500'
                                            )} />
                                            <span className="text-gray-600">{source.title}</span>
                    </div>
                  ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className={cn(
                                  "text-xs text-gray-500",
                                  msg.role === 'user' ? 'text-right' : 'text-left'
                                )}>
                                  {formatTimestamp(msg.timestamp)}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                          
                  {isLoading && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex gap-3"
                            >
                      <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                  C
                                </AvatarFallback>
                      </Avatar>
                              <div className="bg-gray-50 rounded-2xl px-4 py-3 border">
                        <div className="flex gap-1">
                                  <motion.div
                                    className="w-2 h-2 bg-gray-400 rounded-full"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                  />
                                  <motion.div
                                    className="w-2 h-2 bg-gray-400 rounded-full"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                  />
                                  <motion.div
                                    className="w-2 h-2 bg-gray-400 rounded-full"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                  />
                        </div>
                      </div>
                            </motion.div>
                  )}
                          <div ref={messagesEndRef} />
                </div>
                      </ScrollArea>

                      {/* Input Area */}
                      <div className="p-4 border-t bg-gray-50/50">
                <div className="flex gap-2">
                          <div className="flex-1 relative">
                  <Textarea
                              ref={inputRef}
                              placeholder="Ask NEX about your financials, forecasts, or market analysis..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                              className="min-h-[60px] resize-none pr-12"
                              disabled={isLoading}
                            />
                            <div className="absolute right-2 top-2 flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-gray-600"
                                    onClick={() => setIsListening(!isListening)}
                                  >
                                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Voice input</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-gray-600"
                                  >
                                    <Paperclip className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Attach file</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleSend()} 
                            disabled={isLoading || !input.trim()}
                            className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-slate-900 hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-400 dark:hover:to-slate-800"
                          >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          NEX can help with expense mapping, forecasts, financial analysis, and investor research
                </p>
              </div>
                    </TabsContent>

                    <TabsContent value="actions" className="flex-1 p-4 m-0">
                      <div className="space-y-4">
                        <div className="text-center">
                          <h3 className="font-semibold text-lg mb-2">Quick Actions</h3>
                          <p className="text-sm text-gray-600">Get instant insights and assistance</p>
                        </div>
                        
                        <div className="grid gap-3">
                          {Object.entries(
                            quickActions.reduce((acc, action) => {
                              if (!acc[action.category]) acc[action.category] = [];
                              acc[action.category].push(action);
                              return acc;
                            }, {} as Record<string, QuickAction[]>)
                          ).map(([category, actions]) => (
                            <div key={category} className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700 capitalize flex items-center gap-2">
                                {category === 'finance' && <DollarSign className="w-4 h-4" />}
                                {category === 'forecasting' && <TrendingUp className="w-4 h-4" />}
                                {category === 'investors' && <Users className="w-4 h-4" />}
                                {category === 'analysis' && <BarChart3 className="w-4 h-4" />}
                                {category === 'general' && <Building2 className="w-4 h-4" />}
                                {category}
                              </h4>
                              <div className="grid gap-2">
                                {actions.map((action) => (
                                  <motion.div
                                    key={action.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start h-auto p-4 text-left"
                                      onClick={() => handleQuickAction(action)}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className="text-blue-600 mt-0.5">
                                          {action.icon}
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-medium">{action.label}</div>
                                          <div className="text-sm text-gray-600 mt-1">
                                            {action.description}
                                          </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-400" />
                                      </div>
                                    </Button>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}