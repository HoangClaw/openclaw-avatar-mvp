'use client';

import { useState, useEffect } from 'react';
import { Mic, Keyboard, Send, MoreVertical, Cpu, X, Save, Paperclip } from 'lucide-react';
import { useRef } from 'react';

export default function AvatarInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Chat History State
  const [messages, setMessages] = useState<{role: string, text: string}[]>([
    { role: 'ai', text: 'Hello Big Jak. Systems are online. What do you need to do today?' }
  ]);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:19000');
  const [apiKey, setApiKey] = useState('');

  // Load saved settings from local storage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('openclaw_gateway_url');
    const savedKey = localStorage.getItem('openclaw_api_key');
    if (savedUrl) setGatewayUrl(savedUrl);
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleVoiceToggle = () => {
    if (isSettingsOpen) return;
    setIsRecording(!isRecording);
    setIsTyping(false);
    // In the future: trigger Web Speech API here
  };

  const handleChatToggle = () => {
    if (isSettingsOpen) return;
    setIsTyping(!isTyping);
    setIsRecording(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;
    
    // Format message based on attachment
    const messageText = attachment 
      ? `[Attached: ${attachment.name}] ${inputText}`
      : inputText;

    // Append user message immediately
    setMessages(prev => [...prev, { role: 'user', text: messageText }]);
    
    // In the future: send text and file via WebSocket/REST to OpenClaw
    console.log("Sending text to", gatewayUrl);
    console.log("Message:", inputText);
    if (attachment) console.log("With file:", attachment.name);
    
    const submittedText = messageText;
    setInputText('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Mock an AI response for visual testing
    setTimeout(() => {
        setMessages(prev => [...prev, { role: 'ai', text: `I received: "${submittedText}". The OpenClaw backend integration is pending.` }]);
    }, 1200);
  };

  const saveSettings = () => {
    localStorage.setItem('openclaw_gateway_url', gatewayUrl);
    localStorage.setItem('openclaw_api_key', apiKey);
    setIsSettingsOpen(false);
  };

  return (
    <main className="relative flex flex-col h-screen w-screen bg-black overflow-hidden justify-center items-center">
      
      {/* Top Project Banner */}
      <div className="absolute top-8 left-0 w-full flex justify-center z-10 px-4 pointer-events-none transition-opacity duration-300" style={{ opacity: isSettingsOpen ? 0.2 : 1 }}>
        <div className="bg-zinc-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-zinc-700/50 shadow-2xl flex items-center gap-4">
          <Cpu className="w-5 h-5 text-zinc-400" />
          <h1 className="text-zinc-200 font-medium tracking-wider text-sm sm:text-base flex items-center gap-3">
            PROJECT CHLOE <span className="text-zinc-700">|</span> <span className="text-zinc-400 font-normal">OpenClaw Avatar MVP</span>
          </h1>
        </div>
      </div>

      {/* Default Grey Avatar Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500" style={{ transform: isSettingsOpen ? 'scale(0.95)' : 'scale(1)', filter: isSettingsOpen ? 'blur(4px) brightness(0.5)' : 'none' }}>
        <div className="w-[85vw] h-[85vh] sm:w-[50vw] sm:h-[80vh] bg-zinc-800 rounded-3xl shadow-2xl flex items-center justify-center border border-zinc-700/50">
           {/* Temporary SVG placeholder */}
           <svg
              className="w-32 h-32 text-zinc-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
        </div>
      </div>

      {/* Settings Modal Layer */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800">
              <h2 className="text-white font-medium text-lg flex items-center gap-2">
                <Cpu className="w-5 h-5 text-zinc-400" /> OpenClaw Connection
              </h2>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gateway URL</label>
                <input 
                  type="text" 
                  value={gatewayUrl}
                  onChange={(e) => setGatewayUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                  placeholder="http://localhost:19000"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">API Key (Token)</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                  placeholder="oc-..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end">
              <button 
                onClick={saveSettings}
                className="bg-white text-black hover:bg-zinc-200 px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Overlay - Bottom Anchored */}
      <div className={`absolute bottom-10 left-0 w-full flex flex-col items-center justify-end z-30 px-4 transition-all duration-300 ${isSettingsOpen ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100'}`}>
        
        {/* Status Indicator */}
        <div className="mb-6 h-8 flex items-center">
           {isRecording ? (
             <span className="animate-pulse bg-red-500/20 text-red-400 px-4 py-1.5 rounded-full text-sm font-medium border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
               Listening...
             </span>
           ) : (
             <span className="text-zinc-500 text-sm font-medium">
               Ready
             </span>
           )}
        </div>

        {/* Chat Window (Revealed when typing) */}
        {isTyping && (
          <div className="mb-6 w-full max-w-md bg-zinc-900/90 backdrop-blur-md rounded-3xl border border-zinc-700/50 flex flex-col overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] transition-all animate-in slide-in-from-bottom-4 duration-300">
            
            {/* Chat History */}
            <div className="h-64 sm:h-80 p-5 overflow-y-auto flex flex-col gap-4 scroll-smooth">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-4 py-2.5 max-w-[85%] text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-zinc-200 text-black rounded-2xl rounded-tr-sm font-medium shadow-sm' 
                      : 'bg-zinc-800 text-zinc-300 border border-zinc-700/50 rounded-2xl rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Form Area */}
            <div className="flex flex-col border-t border-zinc-800/80 bg-zinc-900">
              
              {/* Attachment Preview UI */}
              {attachment && (
                <div className="px-4 py-2 bg-zinc-800/50 flex items-center justify-between border-b border-zinc-800/80">
                  <div className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700/50">
                    <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="truncate max-w-[200px]">{attachment.name}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setAttachment(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }} 
                    className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form 
                onSubmit={handleSubmit}
                className="p-3 flex items-center gap-2"
              >
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {/* Attachment Button */}
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <input 
                  type="text" 
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder-zinc-500"
                  placeholder="Message Chloe..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="p-3.5 bg-white text-black rounded-xl hover:bg-zinc-200 transition-colors shadow-sm"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-6">
          
          {/* Settings / Extra Button */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-4 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all backdrop-blur-sm shadow-lg"
          >
            <MoreVertical className="w-6 h-6" />
          </button>

          {/* Center Voice Button */}
          <button 
            onClick={handleVoiceToggle}
            className={`p-6 rounded-full shadow-2xl transition-all duration-300 ${
              isRecording 
                ? 'bg-red-500 text-white scale-110 shadow-[0_0_40px_rgba(239,68,68,0.4)]' 
                : 'bg-white text-black hover:scale-105'
            }`}
          >
            <Mic className={`w-10 h-10 ${isRecording ? 'animate-pulse' : ''}`} />
          </button>

          {/* Keyboard / Text Chat Button */}
          <button 
            onClick={handleChatToggle}
            className={`p-4 rounded-full transition-all backdrop-blur-sm shadow-lg ${
              isTyping 
                ? 'bg-white text-black' 
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <Keyboard className="w-6 h-6" />
          </button>
        </div>

      </div>
    </main>
  );
}