'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mic, Keyboard, Send, MoreVertical, Cpu, X, Save, Paperclip, Sun, Moon } from 'lucide-react';
import { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  loadOrCreateDeviceIdentity,
  buildDeviceAuthPayload,
  signDevicePayload,
  type DeviceIdentity,
} from '@/lib/device-identity';

const PDFJS_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155';

let _pdfjsMod: any = null;

async function getPdfJs(): Promise<any> {
  if (_pdfjsMod) return _pdfjsMod;
  _pdfjsMod = await import(/* webpackIgnore: true */ `${PDFJS_CDN_URL}/pdf.min.mjs`);
  _pdfjsMod.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN_URL}/pdf.worker.min.mjs`;
  return _pdfjsMod;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');
    pages.push(text);
  }
  return pages.join('\n\n');
}

const CLIENT_ID = "openclaw-control-ui";
const CLIENT_MODE = "webchat";
const CLIENT_VERSION = "1.0.0";
const ROLE = "operator";
const SCOPES = ["operator.admin", "operator.approvals", "operator.pairing"];

function generateUUID(): string {
  return crypto.randomUUID();
}

export default function AvatarInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio Analysis State
  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Chat History State
  const [messages, setMessages] = useState<{role: string, text: string, id?: string}[]>([
    { role: 'ai', text: 'Hello Big Jak. Systems are online. What do you need to do today?' }
  ]);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:18789');
  const [apiKey, setApiKey] = useState('');
  const [theme, setTheme] = useState('dark');

  // Gateway WebSocket State
  const wsRef = useRef<WebSocket | null>(null);
  const [gwConnected, setGwConnected] = useState(false);
  const pendingRef = useRef<Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>>(new Map());
  const deviceRef = useRef<DeviceIdentity | null>(null);
  const connectSentRef = useRef(false);
  const connectNonceRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRunsRef = useRef<Map<string, string>>(new Map()); // runId -> messageId

  // Load saved settings from local storage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('openclaw_gateway_url');
    const savedKey = localStorage.getItem('openclaw_api_key');
    const savedTheme = localStorage.getItem('openclaw_theme');
    if (savedUrl) setGatewayUrl(savedUrl);
    if (savedKey) setApiKey(savedKey);
    if (savedTheme) setTheme(savedTheme);
  }, []);

  // Update theme in DOM and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('openclaw_theme', theme);
  }, [theme]);

  // --- Gateway WebSocket Management ---

  const sendRequest = useCallback((method: string, params: any): Promise<any> => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("gateway not connected"));
    }
    const id = generateUUID();
    const frame = { type: "req", id, method, params };
    return new Promise((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject });
      ws.send(JSON.stringify(frame));
    });
  }, []);

  const sendConnect = useCallback(async (ws: WebSocket, token: string) => {
    if (connectSentRef.current) return;
    connectSentRef.current = true;

    let device: any = undefined;
    const isSecureContext = typeof crypto !== "undefined" && !!crypto.subtle;

    if (isSecureContext) {
      if (!deviceRef.current) {
        deviceRef.current = await loadOrCreateDeviceIdentity();
      }
      const identity = deviceRef.current;
      const signedAtMs = Date.now();
      const nonce = connectNonceRef.current ?? "";
      const payload = buildDeviceAuthPayload({
        deviceId: identity.deviceId,
        clientId: CLIENT_ID,
        clientMode: CLIENT_MODE,
        role: ROLE,
        scopes: SCOPES,
        signedAtMs,
        token: token || null,
        nonce,
      });
      const signature = await signDevicePayload(identity.privateKey, payload);
      device = {
        id: identity.deviceId,
        publicKey: identity.publicKey,
        signature,
        signedAt: signedAtMs,
        nonce,
      };
    }

    const params = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: CLIENT_ID,
        version: CLIENT_VERSION,
        platform: navigator.platform ?? "web",
        mode: CLIENT_MODE,
      },
      role: ROLE,
      scopes: SCOPES,
      device,
      caps: ["tool-events"],
      auth: token ? { token } : undefined,
      userAgent: navigator.userAgent,
      locale: navigator.language,
    };

    try {
      const hello = await sendRequest("connect", params);
      console.log("Gateway connected:", hello?.type);
      setGwConnected(true);
    } catch (err: any) {
      console.error("Gateway connect failed:", err.message ?? err);
      setMessages(prev => [...prev, {
        role: 'ai',
        text: `Gateway auth failed: ${err.message ?? 'unknown error'}. Check your token and gateway settings.`
      }]);
      ws.close(4008, "connect failed");
    }
  }, [sendRequest]);

  const handleGatewayMessage = useCallback((raw: string) => {
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { return; }

    if (parsed.type === "event") {
      // Handle connect challenge
      if (parsed.event === "connect.challenge") {
        const nonce = parsed.payload?.nonce;
        if (nonce) {
          connectNonceRef.current = nonce;
          const ws = wsRef.current;
          const token = apiKey;
          if (ws) void sendConnect(ws, token);
        }
        return;
      }

      // Handle agent streaming events
      if (parsed.event === "agent") {
        const { stream, data } = parsed.payload ?? {};
        if (stream === "assistant" && data?.text) {
          const runId = parsed.payload?.runId;
          if (runId && activeRunsRef.current.has(runId)) {
            const msgId = activeRunsRef.current.get(runId)!;
            setMessages(prev => prev.map(m =>
              m.id === msgId ? { ...m, text: data.text } : m
            ));
          }
        }
        return;
      }

      // Handle chat events (final state)
      if (parsed.event === "chat") {
        const { state, message: msg, runId } = parsed.payload ?? {};
        if (state === "final" && msg?.content?.[0]?.text && runId) {
          if (activeRunsRef.current.has(runId)) {
            const msgId = activeRunsRef.current.get(runId)!;
            const finalText = msg.content[0].text;
            setMessages(prev => prev.map(m =>
              m.id === msgId ? { ...m, text: finalText } : m
            ));
            activeRunsRef.current.delete(runId);
          }
        }
        return;
      }
      return;
    }

    // Handle responses
    if (parsed.type === "res") {
      const pending = pendingRef.current.get(parsed.id);
      if (pending) {
        // For agent requests, only resolve on the final "ok"/"error" response,
        // not the initial "accepted" acknowledgment
        const status = parsed.payload?.status;
        if (parsed.ok && status === "accepted") {
          // Store the runId mapping: the server-assigned runId may differ
          return;
        }
        pendingRef.current.delete(parsed.id);
        if (parsed.ok) {
          pending.resolve(parsed.payload);
        } else {
          pending.reject(new Error(parsed.error?.message ?? "request failed"));
        }
      }
    }
  }, [apiKey, sendConnect]);

  const connectGateway = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    let wsUrl = gatewayUrl;
    if (wsUrl.startsWith('http')) {
      wsUrl = wsUrl.replace(/^http/, 'ws');
    } else if (!wsUrl.startsWith('ws')) {
      wsUrl = `ws://${wsUrl}`;
    }
    wsUrl = wsUrl.replace(/\/$/, '');

    console.log("Connecting to gateway:", wsUrl);
    connectSentRef.current = false;
    connectNonceRef.current = null;
    setGwConnected(false);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Queue connect with a timeout in case no challenge arrives
    let connectTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      void sendConnect(ws, apiKey);
    }, 750);

    ws.onopen = () => {
      console.log("WebSocket open");
    };

    ws.onmessage = (ev) => {
      if (connectTimer && !connectSentRef.current) {
        // Challenge arrived before timer, cancel fallback
        const raw = ev.data as string;
        try {
          const p = JSON.parse(raw);
          if (p.type === "event" && p.event === "connect.challenge") {
            clearTimeout(connectTimer);
            connectTimer = null;
          }
        } catch {}
      }
      handleGatewayMessage(ev.data as string);
    };

    ws.onclose = (ev) => {
      console.log("WebSocket closed:", ev.code, ev.reason);
      wsRef.current = null;
      setGwConnected(false);
      pendingRef.current.forEach((p) => {
        p.reject(new Error(`gateway closed (${ev.code})`));
      });
      pendingRef.current.clear();
    };

    ws.onerror = () => { /* close handler fires next */ };
  }, [gatewayUrl, apiKey, handleGatewayMessage, sendConnect]);

  // Connect/reconnect when settings change
  useEffect(() => {
    if (!gatewayUrl || !apiKey) return;
    connectGateway();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectGateway]);

  // --- Audio / Voice ---

  const handleVoiceToggle = async () => {
    if (isSettingsOpen) return;
    
    if (!isRecording) {
      // Start Recording & Audio Analysis
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        setIsRecording(true);
        setIsTyping(false);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          // Normalize volume between 0 and 1 (with some sensitivity adjustment)
          setVolume(Math.min(1, average / 100));
          
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();
      } catch (err) {
        console.error("Microphone access denied or error:", err);
      }
    } else {
      // Stop Recording & Analysis
      stopAudioAnalysis();
      setIsRecording(false);
    }
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setVolume(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAudioAnalysis();
  }, []);

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

  const [isUploading, setIsUploading] = useState(false);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const sendViaResponsesApi = async (
    contentParts: any[],
    msgId: string,
  ) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-url': gatewayUrl,
        'x-gateway-token': apiKey || '',
      },
      body: JSON.stringify({
        model: 'openclaw',
        input: [
          {
            type: 'message',
            role: 'user',
            content: contentParts,
          },
        ],
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error ?? `API error (${response.status})`);
    }

    const outputText = result.output
      ?.filter((item: any) => item.type === 'message')
      ?.flatMap((item: any) => item.content)
      ?.filter((c: any) => c.type === 'output_text')
      ?.map((c: any) => c.text)
      ?.join('\n\n');

    if (outputText) {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, text: outputText } : m
      ));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;

    const currentInput = inputText.trim();
    const currentAttachment = attachment;
    const messageText = currentAttachment
      ? `[Attached: ${currentAttachment.name}] ${currentInput}`
      : currentInput;

    setMessages(prev => [...prev, { role: 'user', text: messageText }]);

    setInputText('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (!gwConnected) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Not connected to gateway. Check settings and try again.' }]);
      return;
    }

    const msgId = "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const idempotencyKey = "idk-" + Date.now();

    setMessages(prev => [...prev, { role: 'ai', text: '...', id: msgId }]);
    activeRunsRef.current.set(idempotencyKey, msgId);

    try {
      if (currentAttachment) {
        setIsUploading(true);
        try {
          const isImage = currentAttachment.type.startsWith('image/');
          const isPdf = currentAttachment.type === 'application/pdf'
            || currentAttachment.name.toLowerCase().endsWith('.pdf');

          if (isImage) {
            const dataUrl = await readFileAsDataUrl(currentAttachment);
            const base64Data = dataUrl.split(',')[1];
            const contentParts: any[] = [
              {
                type: 'input_image',
                source: {
                  type: 'base64',
                  media_type: currentAttachment.type,
                  data: base64Data,
                },
              },
              {
                type: 'input_text',
                text: currentInput || `Describe this image (${currentAttachment.name})`,
              },
            ];
            await sendViaResponsesApi(contentParts, msgId);
          } else if (isPdf) {
            const dataUrl = await readFileAsDataUrl(currentAttachment);
            const base64Data = dataUrl.split(',')[1];
            const pdfParts: any[] = [
              {
                type: 'input_file',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Data,
                  filename: currentAttachment.name,
                },
              },
              {
                type: 'input_text',
                text: currentInput || 'Analyze this document.',
              },
            ];
            try {
              await sendViaResponsesApi(pdfParts, msgId);
            } catch {
              const pdfText = await extractPdfText(currentAttachment);
              const agentMessage =
                `[File: ${currentAttachment.name}]\n\n--- FILE CONTENT ---\n${pdfText}\n--- END FILE CONTENT ---\n\n${currentInput || 'Analyze this document.'}`;
              const result = await sendRequest("agent", {
                message: agentMessage,
                sessionKey: "agent:main:main",
                idempotencyKey,
              });
              if (result?.result?.payloads?.[0]?.text) {
                setMessages(prev => prev.map(m =>
                  m.id === msgId ? { ...m, text: result.result.payloads[0].text } : m
                ));
              }
            }
          } else {
            const textContent = await currentAttachment.text();
            const agentMessage =
              `[File: ${currentAttachment.name}]\n\n--- FILE CONTENT ---\n${textContent}\n--- END FILE CONTENT ---\n\n${currentInput || 'Analyze this file.'}`;
            const result = await sendRequest("agent", {
              message: agentMessage,
              sessionKey: "agent:main:main",
              idempotencyKey,
            });
            if (result?.result?.payloads?.[0]?.text) {
              setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, text: result.result.payloads[0].text } : m
              ));
            }
          }
        } catch (uploadErr: any) {
          console.error("File processing error:", uploadErr);
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, text: `Error processing file: ${uploadErr.message ?? 'unknown'}` } : m
          ));
          activeRunsRef.current.delete(idempotencyKey);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      } else {
        const result = await sendRequest("agent", {
          message: currentInput,
          sessionKey: "agent:main:main",
          idempotencyKey,
        });
        if (result?.result?.payloads?.[0]?.text) {
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, text: result.result.payloads[0].text } : m
          ));
        }
      }

      activeRunsRef.current.delete(idempotencyKey);
    } catch (err: any) {
      console.error("Agent error:", err);
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, text: `Error: ${err.message ?? 'unknown'}` } : m
      ));
      activeRunsRef.current.delete(idempotencyKey);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('openclaw_gateway_url', gatewayUrl);
    localStorage.setItem('openclaw_api_key', apiKey);
    setIsSettingsOpen(false);
  };

  return (
    <main className={`relative flex flex-col h-screen w-screen overflow-hidden justify-center items-center transition-colors duration-500 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
      
      {/* Top Project Banner */}
      <div className="absolute top-4 sm:top-8 left-0 w-full flex justify-center z-10 px-4 pointer-events-none transition-opacity duration-300" style={{ opacity: isSettingsOpen ? 0.2 : 1 }}>
        <div className={`backdrop-blur-md px-3 sm:px-6 py-2 sm:py-3 rounded-2xl border shadow-2xl flex items-center gap-2 sm:gap-4 transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-zinc-900/80 border-zinc-700/50' 
            : 'bg-white/80 border-zinc-200'
        }`}>
          <Cpu className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`} />
          <h1 className={`font-medium tracking-wider text-xs sm:text-sm md:text-base flex items-center gap-2 sm:gap-3 transition-colors ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>
            PROJECT CHLOE <span className={`hidden sm:inline ${theme === 'dark' ? 'text-zinc-700' : 'text-zinc-300'}`}>|</span> <span className={`hidden sm:inline font-normal ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>OpenClaw Avatar MVP</span>
          </h1>
        </div>
      </div>

      {/* Full Screen Avatar Placeholder */}
      <div 
        className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`} 
        style={{ 
          transform: isSettingsOpen ? 'scale(1.05)' : 'scale(1)', 
          filter: isSettingsOpen ? 'blur(10px) brightness(0.4)' : 'none' 
        }}
      >
         {/* Temporary SVG placeholder */}
         <svg
            className={`w-24 h-24 sm:w-40 sm:h-40 transition-colors duration-300 ${theme === 'dark' ? 'text-zinc-700' : 'text-zinc-400'}`}
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

          {/* Radial Gradient Overlay for Immersive Effect */}
          <div 
            className="absolute inset-0 transition-opacity duration-500" 
            style={{
              background: theme === 'dark' 
                ? 'radial-gradient(circle at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.5) 100%)'
                : 'radial-gradient(circle at center, rgba(255,255,255,0) 30%, rgba(0,0,0,0.4) 100%)'
            }}
          ></div>
      </div>

      {/* Settings Modal Layer */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`border rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-200 transition-colors ${
            theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
          }`}>
            {/* Modal Header */}
            <div className={`flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}`}>
              <h2 className={`font-medium text-lg flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                <Cpu className={`w-5 h-5 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`} /> OpenClaw Connection
              </h2>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-zinc-500 hover:text-red-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Theme Toggle Section */}
              <div className="flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }">
                <div className="flex items-center gap-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} Appearance
                </div>
                <div 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-300'}`}
                >
                  <div className={`w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                    theme === 'dark' ? 'translate-x-6 bg-white text-zinc-900' : 'translate-x-0 bg-white text-zinc-400'
                  }`}>
                    {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gateway URL</label>
                <input 
                  type="text" 
                  value={gatewayUrl}
                  onChange={(e) => setGatewayUrl(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all ${
                    theme === 'dark' 
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-600 focus:ring-zinc-600' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400 focus:ring-zinc-400'
                  }`}
                  placeholder="http://localhost:19000"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">API Key (Token)</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all ${
                    theme === 'dark' 
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-600 focus:ring-zinc-600' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400 focus:ring-zinc-400'
                  }`}
                  placeholder="oc-..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t flex justify-end ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'}`}>
              <button 
                onClick={saveSettings}
                className={`px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm ${
                  theme === 'dark' ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-black'
                }`}
              >
                <Save className="w-4 h-4" /> Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Overlay - Bottom Anchored */}
      <div className={`absolute bottom-4 sm:bottom-8 left-0 w-full max-h-[calc(100vh-6rem)] flex flex-col items-center justify-end z-30 px-4 transition-all duration-300 ${isSettingsOpen ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100'}`}>
        
        {/* Status Indicator */}
        <div className="mb-6 h-8 flex items-center">
           {isRecording ? (
             <span className="animate-pulse bg-red-500/20 text-red-400 px-4 py-1.5 rounded-full text-sm font-medium border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
               Listening...
             </span>
           ) : isUploading ? (
             <span className="animate-pulse bg-blue-500/20 text-blue-400 px-4 py-1.5 rounded-full text-sm font-medium border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
               Uploading file...
             </span>
           ) : gwConnected ? (
             <span className={`text-sm font-medium transition-colors ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`}>
               Connected
             </span>
           ) : (
             <span className={`text-sm font-medium transition-colors ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}`}>
               {apiKey ? 'Connecting...' : 'Not configured'}
             </span>
           )}
        </div>

        {/* Chat Window */}
        {isTyping && (
          <div className={`mb-4 sm:mb-6 w-full sm:max-w-md max-h-[55vh] backdrop-blur-md rounded-3xl border flex flex-col overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] transition-all animate-in slide-in-from-bottom-4 duration-300 ${
            theme === 'dark' ? 'bg-zinc-900/90 border-zinc-700/50' : 'bg-white/90 border-zinc-200'
          }`}>
            
            {/* Chat History */}
            <div className="flex-1 min-h-0 max-h-[35vh] sm:max-h-[40vh] p-4 sm:p-5 overflow-y-auto flex flex-col gap-3 sm:gap-4 scroll-smooth">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-4 py-2.5 max-w-[85%] text-sm leading-relaxed shadow-sm transition-all duration-300 ${
                    msg.role === 'user' 
                      ? (theme === 'dark' ? 'bg-zinc-200 text-black rounded-2xl rounded-tr-sm font-medium' : 'bg-zinc-900 text-white rounded-2xl rounded-tr-sm font-medium')
                      : (theme === 'dark' ? 'bg-zinc-800 text-zinc-300 border border-zinc-700/50 rounded-2xl rounded-tl-sm' : 'bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-2xl rounded-tl-sm')
                  }`}>
                    <div className={`prose prose-sm max-w-none break-words ${
                      msg.role === 'user' 
                        ? (theme === 'dark' ? 'prose-zinc' : 'prose-invert prose-zinc') 
                        : (theme === 'dark' ? 'prose-invert prose-zinc' : 'prose-zinc')
                    } prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-white/10 prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:italic prose-table:border-collapse prose-th:border prose-th:border-zinc-500/30 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-zinc-500/30 prose-td:px-3 prose-td:py-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4`}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !match && !node?.position?.start?.line !== node?.position?.end?.line;
                            return !isInline ? (
                              <pre className="overflow-x-auto p-3 rounded-lg bg-black/50 my-2 border border-white/10">
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            ) : (
                              <code className="bg-zinc-500/20 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                {children}
                              </code>
                            );
                          },
                          table({ children }) {
                            return (
                              <div className="my-4 overflow-x-auto">
                                <table className="w-full border-collapse border border-zinc-500/30 text-xs sm:text-sm [&_th]:border [&_th]:border-zinc-500/30 [&_th]:p-2 [&_td]:border [&_td]:border-zinc-500/30 [&_td]:p-2 [&_thead]:bg-zinc-500/10">
                                  {children}
                                </table>
                              </div>
                            );
                          },
                          a({ children, href }) {
                            return (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                {children}
                              </a>
                            );
                          },
                          blockquote({ children }) {
                            return (
                              <blockquote className="border-l-4 border-zinc-500/50 pl-4 py-1 my-3 italic opacity-90">
                                {children}
                              </blockquote>
                            );
                          }
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Form Area */}
            <div className={`flex flex-col border-t transition-colors duration-300 ${theme === 'dark' ? 'border-zinc-800/80 bg-zinc-900' : 'border-zinc-100 bg-zinc-50'}`}>
              
              {/* Attachment Preview UI */}
              {attachment && (
                <div className={`px-4 py-2 flex items-center justify-between border-b transition-colors ${theme === 'dark' ? 'bg-zinc-800/50 border-zinc-800/80' : 'bg-zinc-100/50 border-zinc-200'}`}>
                  <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${theme === 'dark' ? 'text-zinc-300 bg-zinc-800 border-zinc-700/50' : 'text-zinc-600 bg-white border-zinc-200'}`}>
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
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-3 rounded-xl transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-black hover:bg-zinc-200'}`}
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <input 
                  type="text" 
                  className={`flex-1 border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all placeholder-zinc-500 ${
                    theme === 'dark' 
                      ? 'bg-zinc-950 border-zinc-800 text-white focus:border-zinc-600 focus:ring-zinc-600' 
                      : 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-400 focus:ring-zinc-400'
                  }`}
                  placeholder="Message Chloe..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className={`p-3.5 rounded-xl transition-colors shadow-sm ${theme === 'dark' ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-black'}`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4 sm:gap-6">
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`p-3 sm:p-4 rounded-full transition-all backdrop-blur-sm shadow-lg border ${
              theme === 'dark' 
                ? 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 border-zinc-700/50' 
                : 'bg-white/80 text-zinc-500 hover:text-black hover:bg-zinc-100 border-zinc-200'
            }`}
          >
            <MoreVertical className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button 
            onClick={handleVoiceToggle}
            className={`p-4 sm:p-6 rounded-full shadow-2xl transition-all duration-75 border-4 ${
              isRecording 
                ? 'bg-red-500 text-white border-red-400' 
                : (theme === 'dark' ? 'bg-white text-black hover:scale-105 border-transparent' : 'bg-zinc-900 text-white hover:scale-105 border-transparent')
            }`}
            style={{
              transform: isRecording ? `scale(${1 + volume * 0.4})` : 'scale(1)',
              boxShadow: isRecording 
                ? `0 0 ${20 + volume * 60}px rgba(239, 68, 68, ${0.4 + volume * 0.6})` 
                : undefined
            }}
          >
            <Mic className="w-7 h-7 sm:w-10 sm:h-10" />
          </button>

          <button 
            onClick={handleChatToggle}
            className={`p-3 sm:p-4 rounded-full transition-all backdrop-blur-sm shadow-lg border ${
              isTyping 
                ? (theme === 'dark' ? 'bg-white text-black border-transparent' : 'bg-zinc-900 text-white border-transparent')
                : (theme === 'dark' ? 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 border-zinc-700/50' : 'bg-white/80 text-zinc-500 hover:text-black hover:bg-zinc-100 border-zinc-200')
            }`}
          >
            <Keyboard className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

      </div>
    </main>
  );
}