"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Video, Upload, Square, Scan, Zap, RefreshCw } from "lucide-react";
import CameraResult, { type DiagResult } from "@/components/irrigation/CameraResult";

type Mode = "idle" | "live" | "upload";

interface ScanEvent {
  id: number;
  result: DiagResult;
  timestamp: Date;
  suggested_diagnostic?: string;
}

export default function VideoScan() {
  const [mode, setMode]               = useState<Mode>("idle");
  const [analyzing, setAnalyzing]     = useState(false);
  const [autoMode, setAutoMode]       = useState(false);
  const [events, setEvents]           = useState<ScanEvent[]>([]);
  const [frameCount, setFrameCount]   = useState(0);
  const [streamError, setStreamError] = useState<string | null>(null);

  const videoRef        = useRef<HTMLVideoElement>(null);
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzingRef    = useRef(false);
  const eventIdRef      = useRef(0);

  const captureFrame = useCallback((): string | null => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || v.readyState < 2) return null;
    c.width  = v.videoWidth  || 1280;
    c.height = v.videoHeight || 720;
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.75);
  }, []);

  const analyzeFrame = useCallback(async (silent = false) => {
    if (analyzingRef.current) return;
    const frame = captureFrame();
    if (!frame) return;
    analyzingRef.current = true;
    setAnalyzing(true);
    setFrameCount(n => n + 1);
    try {
      const res = await fetch("/api/irrigation-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "smart_scan", image: frame }),
      });
      const data = await res.json();
      const a = data.analysis;
      if (a && !a.error && a.severity && a.severity !== "none") {
        const ev: ScanEvent = {
          id: ++eventIdRef.current,
          result: {
            brief:    a.brief   ?? "Finding detected",
            detail:   a.detail  ?? undefined,
            action:   a.action  ?? undefined,
            severity: a.severity,
          },
          timestamp: new Date(),
          suggested_diagnostic: a.suggested_diagnostic,
        };
        setEvents(prev => [ev, ...prev].slice(0, 15));
      } else if (!silent && a?.error) {
        setEvents(prev => [{
          id: ++eventIdRef.current,
          result: { brief: "Couldn't read this frame — try better lighting", severity: "mild" },
          timestamp: new Date(),
        }, ...prev].slice(0, 15));
      }
    } catch (err) {
      if (!silent) {
        setEvents(prev => [{
          id: ++eventIdRef.current,
          result: { brief: "Analysis failed — " + (err instanceof Error ? err.message : "Network error"), severity: "moderate" },
          timestamp: new Date(),
        }, ...prev].slice(0, 15));
      }
    } finally {
      analyzingRef.current = false;
      setAnalyzing(false);
    }
  }, [captureFrame]);

  useEffect(() => {
    if (autoMode && mode === "live") {
      autoIntervalRef.current = setInterval(() => analyzeFrame(true), 7000);
    } else {
      if (autoIntervalRef.current) { clearInterval(autoIntervalRef.current); autoIntervalRef.current = null; }
    }
    return () => { if (autoIntervalRef.current) clearInterval(autoIntervalRef.current); };
  }, [autoMode, mode, analyzeFrame]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const startLive = async () => {
    setStreamError(null);
    setEvents([]);
    setFrameCount(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.src = "";
        await videoRef.current.play();
      }
      streamRef.current = stream;
      setMode("live");
    } catch (err) {
      setStreamError("Camera access denied — " + (err instanceof Error ? err.message : "unknown error") + ". Upload a video instead.");
    }
  };

  const stop = useCallback(() => {
    if (autoIntervalRef.current) { clearInterval(autoIntervalRef.current); autoIntervalRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.src = ""; }
    setMode("idle");
    setAutoMode(false);
    setAnalyzing(false);
    analyzingRef.current = false;
  }, []);

  const openUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const url = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.load();
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
      setMode("upload");
      setAutoMode(false);
      setEvents([]);
      setFrameCount(0);
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative rounded-2xl overflow-hidden bg-[#020d18] border border-white/8" style={{ aspectRatio: "16/9" }}>
        <video
          ref={videoRef}
          playsInline
          muted
          loop={mode === "upload"}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            mode !== "idle" ? "opacity-100" : "opacity-0"
          }`}
        />

        {mode === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-900/30 border border-blue-500/25 flex items-center justify-center">
              <Video className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-center px-8">
              <p className="text-white text-sm font-semibold">Video scan</p>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                Live camera or uploaded video — AI reads frames as you scan
              </p>
            </div>
          </div>
        )}

        {mode === "live" && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-semibold tracking-wide">LIVE</span>
          </div>
        )}

        {mode === "upload" && (
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <span className="text-white text-xs font-semibold tracking-wide">VIDEO</span>
          </div>
        )}

        {autoMode && mode === "live" && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-900/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-emerald-600/40">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300 text-xs font-semibold">AUTO</span>
          </div>
        )}

        {analyzing && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
            <span className="text-white text-xs">Analyzing frame...</span>
          </div>
        )}

        {frameCount > 0 && (
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <span className="text-gray-400 text-xs">{frameCount} frame{frameCount !== 1 ? "s" : ""}</span>
          </div>
        )}

        {mode === "live" && !analyzing && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-28 h-28">
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-blue-400 rounded-tl" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-blue-400 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-blue-400 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-blue-400 rounded-br" />
            </div>
          </div>
        )}
      </div>

      {mode === "idle" ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={startLive}
            className="flex flex-col items-center gap-2 py-5 rounded-xl border border-blue-500/40 bg-blue-900/15 hover:bg-blue-900/25 transition-all active:scale-[0.97]">
            <Video className="w-5 h-5 text-blue-400" />
            <span className="text-blue-200 text-sm font-semibold">Live camera</span>
            <span className="text-gray-600 text-xs">Point &amp; scan</span>
          </button>
          <button onClick={openUpload}
            className="flex flex-col items-center gap-2 py-5 rounded-xl border border-white/10 bg-white/3 hover:border-blue-500/30 hover:bg-blue-900/10 transition-all active:scale-[0.97]">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300 text-sm font-semibold">Upload video</span>
            <span className="text-gray-600 text-xs">From gallery</span>
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => analyzeFrame(false)} disabled={analyzing}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600/25 border border-blue-500/50 text-blue-200 text-sm font-semibold hover:bg-blue-600/35 transition-all disabled:opacity-40">
            <Scan className="w-4 h-4" />
            {analyzing ? "Analyzing..." : "Analyze frame"}
          </button>

          {mode === "live" && (
            <button onClick={() => setAutoMode(!autoMode)}
              className={`flex items-center gap-1.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                autoMode
                  ? "border-emerald-600/60 bg-emerald-900/20 text-emerald-300"
                  : "border-white/10 bg-white/3 text-gray-400 hover:border-white/20 hover:text-gray-200"
              }`}>
              <Zap className="w-4 h-4" />
              Auto
            </button>
          )}

          {mode === "upload" && (
            <button onClick={openUpload}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-white/10 bg-white/3 text-gray-400 text-sm hover:border-white/20 transition-all">
              <Upload className="w-4 h-4" />
              Replace
            </button>
          )}

          <button onClick={stop}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-red-800/40 bg-red-900/8 text-red-400 text-sm hover:bg-red-900/18 transition-all">
            <Square className="w-4 h-4" />
          </button>
        </div>
      )}

      {streamError && (
        <CameraResult result={{ brief: streamError, severity: "moderate" }} />
      )}

      {autoMode && mode === "live" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-900/10 border border-emerald-700/20">
          <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-300">Analyzing every 7 seconds — findings log below in real time</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Findings log</p>
            <button onClick={() => setEvents([])} className="text-gray-600 text-xs hover:text-gray-400 transition-colors">Clear</button>
          </div>
          {events.map(ev => (
            <div key={ev.id} className="relative">
              <CameraResult result={ev.result} />
              <span className="absolute top-2.5 right-3 text-gray-600 text-xs">
                {ev.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}

      {mode !== "idle" && frameCount > 0 && events.length === 0 && !analyzing && (
        <CameraResult result={{
          brief: "No significant issues detected in analyzed frames",
          detail: "Continue scanning or use auto mode for continuous monitoring.",
          severity: "none",
        }} />
      )}

      <div className="px-3 py-2.5 rounded-xl border border-white/5 bg-white/2">
        <p className="text-gray-600 text-xs leading-relaxed">
          👓 <span className="text-gray-500 font-medium">Glasses-ready</span>
          {" — "}
          Auto mode runs the same live stream interface AR glasses will connect to. Future versions will overlay findings directly in your field of view.
        </p>
      </div>
    </div>
  );
}
