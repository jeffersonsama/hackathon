import { useState, useRef, useEffect } from "react";
import { Mic, Square, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (blob: Blob, durationSec: number) => void;
  onCancel: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
}

export default function AudioRecorder({ onSend, onCancel, isRecording, onStartRecording }: Props) {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startTime = useRef(0);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!isRecording) return;
    startTime.current = Date.now();
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime.current) / 1000));
    }, 500);
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setDuration(0);
      onStartRecording();
    } catch {
      // Permission denied
    }
  };

  const stopAndSend = () => {
    if (!mediaRecorder.current || mediaRecorder.current.state !== "recording") return;
    const dur = Math.floor((Date.now() - startTime.current) / 1000);
    mediaRecorder.current.onstop = () => {
      mediaRecorder.current!.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      onSend(blob, dur);
    };
    mediaRecorder.current.stop();
    clearInterval(timerRef.current);
  };

  const cancel = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.onstop = () => {
        mediaRecorder.current!.stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.current.stop();
    }
    clearInterval(timerRef.current);
    setDuration(0);
    chunks.current = [];
    onCancel();
  };

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!isRecording) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={startRecording} title="Message vocal">
        <Mic className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1 bg-destructive/10 rounded-xl px-3 py-1.5 animate-in fade-in">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={cancel}>
        <Trash2 className="w-4 h-4" />
      </Button>
      <div className="flex items-center gap-2 flex-1">
        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-mono text-destructive">{formatDur(duration)}</span>
        <span className="text-xs text-muted-foreground">Enregistrement...</span>
      </div>
      <Button size="icon" className="h-8 w-8 bg-primary text-primary-foreground" onClick={stopAndSend}>
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}
