"use client";

import { useState, useRef, useCallback } from "react";
import { User, Mic, MicOff, Send, MessageSquare } from "lucide-react";

interface ConversationEntry {
  role: "user" | "tech";
  text: string;
  timestamp: string;
  key_points?: string[];
  cost_context?: string | null;
  follow_up_offer?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

export default function HomeownerMode({ systemContext: initialContext = "" }: { systemContext?: string }) {
  const [question, setQuestion] = useState("");
  const [systemContext, setSystemContext] = useState(initialContext);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<AnySpeechRecognition>(null);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuestion((prev: string) => prev ? prev + " " + transcript : transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const sendQuestion = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setLoading(true);

    const userEntry: ConversationEntry = {
      role: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setConversation(prev => [...prev, userEntry]);

    try {
      const res = await fetch("/api/irrigation-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, systemContext }),
      });
      const data = await res.json();
      const a = data.analysis;
      const techEntry: ConversationEntry = {
        role: "tech",
        text: a.technician_response || "No response generated.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        key_points: a.key_points,
        cost_context: a.cost_context,
        follow_up_offer: a.follow_up_offer,
      };
      setConversation(prev => [...prev, techEntry]);
    } catch {
      setConversation(prev => [...prev, {
        role: "tech",
        text: "Unable to generate response. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">System Context (optional)</label>
        <input
          type="text"
          value={systemContext}
          onChange={e => setSystemContext(e.target.value)}
          placeholder="e.g. Hunter Pro-C, 8 zones, 2010 install, clay soil, NJ"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="min-h-48 max-h-96 overflow-y-auto space-y-3 pr-1">
        {conversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <User className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Homeowner questions appear here</p>
            <p className="text-xs mt-1">Tap the mic or type a question below</p>
          </div>
        ) : (
          conversation.map((entry, i) => (
            <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-sm rounded-2xl px-4 py-3 text-sm ${
                entry.role === "user"
                  ? "bg-emerald-800/40 border border-emerald-700/30 text-white"
                  : "bg-white/5 border border-white/10 text-gray-200"
              }`}>
                <p>{entry.text}</p>
                {entry.key_points && entry.key_points.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {entry.key_points.map((kp, j) => (
                      <li key={j} className="text-xs text-emerald-300 flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>{kp}
                      </li>
                    ))}
                  </ul>
                )}
                {entry.cost_context && (
                  <p className="text-xs text-amber-300/80 mt-2 border-t border-white/10 pt-2">{entry.cost_context}</p>
                )}
                {entry.follow_up_offer && (
                  <p className="text-xs text-water-300/60 mt-1 italic">{entry.follow_up_offer}</p>
                )}
                <p className={`text-xs mt-2 ${entry.role === "user" ? "text-emerald-500/60 text-right" : "text-gray-600"}`}>{entry.timestamp}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onPointerDown={startListening}
          onPointerUp={stopListening}
          className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            listening ? "bg-red-500 text-white animate-pulse" : "bg-white/10 text-gray-400 hover:bg-white/20"
          }`}
          title="Hold to speak"
        >
          {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && sendQuestion()}
            placeholder="Homeowner question…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 pr-10"
          />
          <button
            onClick={sendQuestion}
            disabled={!question.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {["How long should my zones run?", "Why does my lawn have dry spots?", "What does this repair cost?"].map(q => (
          <button key={q} onClick={() => setQuestion(q)} className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all">
            <MessageSquare className="w-3 h-3 inline mr-1" />{q}
          </button>
        ))}
      </div>
    </div>
  );
}
