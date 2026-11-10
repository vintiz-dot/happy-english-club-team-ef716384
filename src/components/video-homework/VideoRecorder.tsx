/**
 * The camera, for a child. Big buttons, the homework on a cue card, a
 * 3-2-1, retakes as often as they like, and only the take they choose is
 * sent. No score or judgement appears here - pronunciation is measured
 * quietly for the teacher.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Circle, RefreshCw, Square, Upload, SwitchCamera, Check, Volume2 } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_UPLOAD_BYTES,
  MIN_SECONDS,
  baseMime,
  canRecordHere,
  captureFrame,
  frameSchedule,
  pickAudioMime,
  pickVideoMime,
  type RecordedTake,
} from "@/lib/video/recorder";
import { startLivePronunciation, type LivePronunciation } from "@/lib/video/livePronunciation";
import { formatTimestamp } from "@/lib/videoHomework";
import { KID_STEPS, inAppBrowser, speak, stepFor } from "@/lib/video/kidVideo";

type Phase = "idle" | "preview" | "countdown" | "recording" | "review";

interface Props {
  maxSeconds: number;
  cueCard?: string | null;
  vocabulary?: string[];
  onUse: (take: RecordedTake) => void;
  busy?: boolean;
  /** The easy layout for Grade 1-3: steps, big buttons, English with Vietnamese under it. */
  kid?: boolean;
}

export function VideoRecorder({ maxSeconds, cueCard, vocabulary = [], onUse, busy, kid = false }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [take, setTake] = useState<RecordedTake | null>(null);
  const [takeUrl, setTakeUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const liveRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRecRef = useRef<MediaRecorder | null>(null);
  const audioRecRef = useRef<MediaRecorder | null>(null);
  const videoChunks = useRef<Blob[]>([]);
  const audioChunks = useRef<Blob[]>([]);
  const frames = useRef<Blob[]>([]);
  const pronRef = useRef<LivePronunciation | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAt = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => {
    stopStream();
    pronRef.current?.cancel();
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, [stopStream]);

  useEffect(() => () => {
    if (takeUrl) URL.revokeObjectURL(takeUrl);
  }, [takeUrl]);

  const openCamera = async (mode = facing) => {
    setCameraError(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        await liveRef.current.play().catch(() => null);
      }
      setPhase("preview");
    } catch (e: any) {
      setCameraError(
        e?.name === "NotAllowedError"
          ? "The camera is blocked. Ask a grown-up to allow the camera and microphone for this site, then try again."
          : "We couldn't open the camera on this device.",
      );
    }
  };

  const flip = async () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    await openCamera(next);
  };

  const beginCountdown = () => {
    setCount(3);
    setPhase("countdown");
    let n = 3;
    const id = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(id);
        void startRecording();
      } else {
        setCount(n);
      }
    }, 1000);
  };

  const startRecording = async () => {
    const stream = streamRef.current;
    if (!stream) return;
    videoChunks.current = [];
    audioChunks.current = [];
    frames.current = [];

    const vMime = pickVideoMime();
    const vr = new MediaRecorder(stream, {
      ...(vMime ? { mimeType: vMime } : {}),
      videoBitsPerSecond: 900_000,
      audioBitsPerSecond: 64_000,
    });
    vr.ondataavailable = (e) => e.data.size && videoChunks.current.push(e.data);
    videoRecRef.current = vr;

    const aMime = pickAudioMime();
    audioRecRef.current = null;
    if (aMime && stream.getAudioTracks().length) {
      try {
        const ar = new MediaRecorder(new MediaStream(stream.getAudioTracks()), { mimeType: aMime, audioBitsPerSecond: 48_000 });
        ar.ondataavailable = (e) => e.data.size && audioChunks.current.push(e.data);
        audioRecRef.current = ar;
      } catch {
        audioRecRef.current = null; // the video's own sound is the fallback
      }
    }

    // No timeslice. With one (start(1000)) an iPhone writes a fragmented MP4
    // whose header carries no total length, and a teacher's desktop browser
    // then plays only the first 1-second fragment. One blob at stop() is a
    // normal file with its length in it.
    vr.start();
    audioRecRef.current?.start();
    startedAt.current = Date.now();
    setElapsed(0);
    setPhase("recording");

    // Pronunciation in parallel; it never blocks the recording.
    pronRef.current = null;
    startLivePronunciation(stream).then((p) => {
      if (videoRecRef.current?.state === "recording") pronRef.current = p;
      else p?.cancel();
    });

    const due = frameSchedule(maxSeconds);
    timerRef.current = window.setInterval(() => {
      const secs = (Date.now() - startedAt.current) / 1000;
      setElapsed(secs);
      if (due.length && secs >= due[0] && liveRef.current) {
        due.shift();
        captureFrame(liveRef.current).then((b) => b && frames.current.push(b));
      }
      if (secs >= maxSeconds) void stopRecording();
    }, 250);
  };

  const stopRecorder = (r: MediaRecorder | null) =>
    new Promise<void>((resolve) => {
      if (!r || r.state === "inactive") return resolve();
      r.onstop = () => resolve();
      r.stop();
    });

  const stopRecording = async () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const duration = (Date.now() - startedAt.current) / 1000;
    const vr = videoRecRef.current;
    videoRecRef.current = null;
    await Promise.all([stopRecorder(vr), stopRecorder(audioRecRef.current)]);
    const pronunciation = pronRef.current ? await pronRef.current.finish() : null;
    pronRef.current = null;
    stopStream();

    const videoMime = baseMime(vr?.mimeType, "video/webm");
    const video = new Blob(videoChunks.current, { type: videoMime });
    const audioMime = audioRecRef.current ? baseMime(audioRecRef.current.mimeType, "audio/webm") : null;
    const audio = audioMime && audioChunks.current.length ? new Blob(audioChunks.current, { type: audioMime }) : null;

    if (duration < MIN_SECONDS) {
      toast("That was very short! Try telling us a bit more 😊");
      await openCamera();
      return;
    }
    const next: RecordedTake = {
      video,
      videoMime,
      audio,
      audioMime: audio ? audioMime : null,
      frames: frames.current.slice(0, 6),
      durationSeconds: Math.round(duration),
      pronunciation,
    };
    setTake(next);
    setTakeUrl(URL.createObjectURL(video));
    setPhase("review");
  };

  const retake = async () => {
    setTake(null);
    if (takeUrl) URL.revokeObjectURL(takeUrl);
    setTakeUrl(null);
    await openCamera();
  };

  // For phones that cannot record in the browser: a video from the gallery.
  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("This video is too big (over 100 MB). Try a shorter one, or record it here.");
      return;
    }
    const url = URL.createObjectURL(file);
    const duration = await new Promise<number>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : 0);
      v.onerror = () => resolve(0);
      v.src = url;
    });
    if (duration > maxSeconds + 15) {
      toast.error(`This video is longer than ${Math.round(maxSeconds / 60)} minutes. Please choose a shorter one.`);
      URL.revokeObjectURL(url);
      return;
    }
    setTake({
      video: file,
      videoMime: baseMime(file.type, "video/mp4"),
      audio: null,
      audioMime: null,
      frames: [],
      durationSeconds: Math.round(duration),
      pronunciation: null,
    });
    setTakeUrl(url);
    setPhase("review");
  };

  const remaining = Math.max(0, maxSeconds - elapsed);
  const inApp = kid && typeof navigator !== "undefined" && inAppBrowser(navigator.userAgent);
  const step = stepFor(phase);
  /** English on top; in the easy layout the Vietnamese sits under it, smaller. */
  const label = (en: string, vi: string) =>
    kid ? (
      <span className="flex flex-col items-center leading-tight">
        <span>{en}</span>
        <span className="text-xs font-normal opacity-80">{vi}</span>
      </span>
    ) : (
      en
    );
  const big = kid ? "h-16 text-lg" : "";

  return (
    <div className="space-y-3">
      {kid && (
        <ol className="flex items-center justify-center gap-2" aria-label="Steps">
          {KID_STEPS.map((st, n) => (
            <li
              key={st.id}
              aria-current={st.id === step ? "step" : undefined}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 py-2 text-sm font-semibold ${
                st.id === step ? "border-primary bg-primary/10" : "border-transparent bg-muted/50 text-muted-foreground"
              }`}
            >
              <span className="text-xl">{st.emoji}</span>
              <span className="flex flex-col leading-tight"><span>{n + 1}. {st.en}</span><span className="text-[11px] font-normal">{st.vi}</span></span>
            </li>
          ))}
        </ol>
      )}
      {inApp && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <p>📱 If the camera does not work, open this page in <strong>Chrome</strong> or <strong>Safari</strong>. You can also choose a video you already made.</p>
          <p className="text-xs text-muted-foreground mt-1">Nếu máy quay không hoạt động, hãy mở trang này bằng Chrome hoặc Safari. Bạn cũng có thể chọn video đã quay sẵn.</p>
        </div>
      )}
      {cueCard && phase !== "review" && (
        <div className="rounded-2xl border-2 border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">🎬 Your video is about</p>
          <p className={kid ? "text-lg leading-relaxed" : "text-sm leading-relaxed"}>{cueCard}</p>
          {kid && (
            <Button type="button" variant="outline" size="sm" className="mt-2 h-9" onClick={() => speak(cueCard)}>
              <Volume2 className="h-4 w-4 mr-1.5" /> Listen · Nghe
            </Button>
          )}
          {vocabulary.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {vocabulary.slice(0, 10).map((w) => (
                <span key={w} className="text-xs rounded-full bg-white/80 dark:bg-white/10 border px-2 py-0.5">{w}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl bg-black aspect-video">
        <video
          ref={liveRef}
          className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""} ${phase === "review" || phase === "idle" ? "hidden" : ""}`}
          playsInline
          muted
          autoPlay
        />
        {phase === "review" && takeUrl && (
          <video src={takeUrl} className="h-full w-full object-contain" controls playsInline />
        )}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-white">
            <Camera className="h-10 w-10 opacity-80" />
            <p className="text-sm opacity-90">You can practise and record again as many times as you like.</p>
          </div>
        )}
        {phase === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className={`${kid ? "text-9xl" : "text-7xl"} font-bold text-white drop-shadow`}>{count}</span>
          </div>
        )}
        {phase === "recording" && (
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" /> {formatTimestamp(elapsed)}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${remaining < 20 ? "bg-amber-500 text-white" : "bg-black/50 text-white"}`}>
              {formatTimestamp(remaining)} left
            </span>
          </div>
        )}
        {phase === "preview" && (
          <button
            type="button"
            onClick={flip}
            className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white"
            aria-label="Switch camera"
          >
            <SwitchCamera className="h-5 w-5" />
          </button>
        )}
      </div>

      {cameraError && (
        <div className="text-sm text-destructive">
          <p>{cameraError}</p>
          {kid && <p className="text-xs">Hãy nhờ người lớn cho phép dùng máy quay và micro, rồi thử lại. Bạn cũng có thể chọn một video có sẵn.</p>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {phase === "idle" && (
          <>
            {canRecordHere() && (
              <Button size="lg" className={`h-12 flex-1 text-base ${big}`} onClick={() => openCamera()}>
                <Camera className="h-5 w-5 mr-2" /> {label("Open camera", "Mở máy quay")}
              </Button>
            )}
            <Button size="lg" variant="outline" className={`h-12 flex-1 ${big}`} onClick={() => fileInput.current?.click()}>
              <Upload className="h-5 w-5 mr-2" /> {label("Choose a video", "Chọn video")}
            </Button>
          </>
        )}
        {phase === "preview" && (
          <Button size="lg" className={`h-14 flex-1 text-base bg-red-600 hover:bg-red-700 ${kid ? "h-20 text-xl" : ""}`} onClick={beginCountdown}>
            <Circle className="h-5 w-5 mr-2 fill-current" /> {label("Start recording", "Bắt đầu quay")}
          </Button>
        )}
        {phase === "recording" && (
          <Button size="lg" variant="secondary" className={`h-14 flex-1 text-base ${kid ? "h-20 text-xl" : ""}`} onClick={() => void stopRecording()}>
            <Square className="h-5 w-5 mr-2 fill-current" /> {label("I'm finished", "Em xong rồi")}
          </Button>
        )}
        {phase === "review" && take && (
          <>
            <Button size="lg" variant="outline" className={`h-12 flex-1 ${big}`} onClick={retake} disabled={busy}>
              <RefreshCw className="h-5 w-5 mr-2" /> {label("Record again", "Quay lại")}
            </Button>
            <Button size="lg" className={`h-12 flex-1 text-base ${big}`} onClick={() => onUse(take)} disabled={busy}>
              <Check className="h-5 w-5 mr-2" /> {busy ? label("Sending…", "Đang gửi…") : label("Send this one", "Gửi video này")}
            </Button>
          </>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          void pickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
