'use client';

import { useState } from 'react';
import { Mic, Keyboard, Send, MoreVertical, Cpu } from 'lucide-react';

export default function AvatarInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    setIsTyping(false);
    // In the future: trigger Web Speech API here
  };

  const handleChatToggle = () => {
    setIsTyping(!isTyping);
    setIsRecording(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    // In the future: send text via WebSocket to OpenClaw
    console.log("Sending text:", inputText);
    setInputText('');
    setIsTyping(false);
  };

  return (
    <main className="relative flex flex-col h-screen w-screen bg-black overflow-hidden justify-center items-center">
      
      {/* Top Project Banner */}
      <div className="absolute top-8 left-0 w-full flex justify-center z-10 px-4 pointer-events-none">
        <div className="bg-zinc-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-zinc-700/50 shadow-2xl flex items-center gap-4">
          <Cpu className="w-5 h-5 text-zinc-400" />
          <h1 className="text-zinc-200 font-medium tracking-wider text-sm sm:text-base flex items-center gap-3">
            PROJECT CHLOE <span className="text-zinc-700">|</span> <span className="text-zinc-400 font-normal">OpenClaw Avatar MVP</span>
          </h1>
        </div>
      </div>

      {/* Default Grey Avatar Placeholder (Full Screen / Centered) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[85vw] h-[85vh] sm:w-[50vw] sm:h-[80vh] bg-zinc-800 rounded-3xl shadow-2xl flex items-center justify-center border border-zinc-700/50">
           {/* Temporary SVG placeholder until real image is dropped in */}
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

      {/* Control Overlay - Bottom Anchored */}
      <div className="absolute bottom-10 left-0 w-full flex flex-col items-center justify-end z-10 px-4">
        
        {/* Status Indicator (Optional) */}
        <div className="mb-6">
           {isRecording ? (
             <span className="animate-pulse bg-red-500/20 text-red-400 px-4 py-1.5 rounded-full text-sm font-medium border border-red-500/30">
               Listening...
             </span>
           ) : (
             <span className="text-zinc-500 text-sm font-medium">
               Ready
             </span>
           )}
        </div>

        {/* TextInput Box (Revealed when typing) */}
        {isTyping && (
          <form 
            onSubmit={handleSubmit}
            className="mb-6 w-full max-w-md bg-zinc-900/90 backdrop-blur-md p-2 rounded-2xl border border-zinc-700/50 flex items-center shadow-2xl transition-all"
          >
            <input 
              type="text" 
              className="flex-1 bg-transparent border-none text-white px-4 py-2 focus:outline-none placeholder-zinc-500"
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              autoFocus
            />
            <button 
              type="submit" 
              className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-6">
          
          {/* Settings / Extra Button */}
          <button className="p-4 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all backdrop-blur-sm shadow-lg">
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