export type Transcript = { role: "user" | "assistant"; delta: string; start_ms: number; end_ms: number };
export type Callbacks = { state(s: string): void; transcript(t: Transcript): void; levels(input: number, output: number): void; usage(seconds: number | null, tokens: number | null, final: boolean): void; error(message: string): void; playbackBlocked(blocked: boolean): void };
export class LiveCall {
  private peer: RTCPeerConnection | null = null;
  private events: RTCDataChannel | null = null;
  private mic: MediaStream | null = null;
  private audio = new Audio();
  private ctx: AudioContext | null = null;
  private input: (() => number) | null = null;
  private output: (() => number) | null = null;
  private frame = 0; private closed = false; private ready = false; private closing = false;
  private closeTimer?: ReturnType<typeof setTimeout>; private startTimer?: ReturnType<typeof setTimeout>; private maxTimer?: ReturnType<typeof setTimeout>;
  private seconds: number | null = null; private tokens = 0; private responseIds = new Set<string>();
  constructor(private cb: Callbacks) { this.audio.autoplay = true; this.audio.setAttribute("playsinline", ""); }
  // Reusable RMS buffer, adapted from Konsalting Profi's merak().
  private analyser(stream: MediaStream) {
    const a = this.ctx!.createAnalyser(); a.fftSize = 512; a.smoothingTimeConstant = .6;
    this.ctx!.createMediaStreamSource(stream).connect(a);
    const data = new Float32Array(a.fftSize);
    return () => { a.getFloatTimeDomainData(data); return Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length); };
  }
  private meter = () => {
    if (this.closed) return;
    this.cb.levels(this.input?.() ?? 0, this.audio.paused ? 0 : this.output?.() ?? 0);
    this.frame = requestAnimationFrame(this.meter);
  };
  async start(knowledge: string) {
    this.cb.state("connecting");
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Микрофон недоступен. Откройте страницу в Chrome или Safari по HTTPS.");
    this.ctx = new AudioContext(); await this.ctx.resume();
    const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (this.closed) { mic.getTracks().forEach(t => t.stop()); return; }
    this.mic = mic; this.input = this.analyser(mic); this.meter();
    const peer = new RTCPeerConnection(); this.peer = peer;
    peer.addEventListener("track", e => { if (this.closed || e.track.kind !== "audio") return; const s = new MediaStream([e.track]); this.audio.srcObject = s; this.output = this.analyser(s); void this.audio.play().catch(() => this.cb.playbackBlocked(true)); });
    peer.addEventListener("connectionstatechange", () => { if (this.closed) return; if (peer.connectionState === "failed") { this.cb.error("Связь прервалась. Итоговый расход не подтверждён."); this.dispose(); } else if (peer.connectionState === "disconnected") this.cb.state("reconnecting"); else if (peer.connectionState === "connected" && this.ready && !this.closing) this.cb.state("connected"); });
    mic.getTracks().forEach(t => peer.addTrack(t, mic));
    const channel = peer.createDataChannel("oai-events"); this.events = channel;
    channel.addEventListener("message", ({ data }) => {
      if (this.closed) return; let e; try { e = JSON.parse(data); } catch { return; }
      if (e.type === "session.started") { clearTimeout(this.startTimer); this.ready = true; this.cb.state("connected"); this.maxTimer = setTimeout(() => { this.cb.error("Пробный разговор ограничен 10 минутами. Можно начать новый."); this.stop(); }, 600000); }
      else if (e.type === "session.input_transcript.delta" || e.type === "session.output_transcript.delta") { if (typeof e.delta === "string" && typeof e.start_ms === "number" && typeof e.end_ms === "number") this.cb.transcript({ role: e.type.includes("input_") ? "user" : "assistant", delta: e.delta, start_ms: e.start_ms, end_ms: e.end_ms }); }
      else if (e.type === "session.usage.updated") { if (typeof e.usage?.seconds === "number") this.seconds = e.usage.seconds; this.cb.usage(this.seconds, this.tokens || null, false); }
      else if (e.type === "session.closed") { if (typeof e.usage?.seconds === "number") this.seconds = e.usage.seconds; this.cb.usage(this.seconds, this.tokens || null, true); this.dispose(); }
      else if (e.type === "response.event") { const nested = e.event; if (nested?.type === "response.completed") { const r = nested.response; if (r?.id && !this.responseIds.has(r.id)) { this.responseIds.add(r.id); this.tokens += r.usage?.total_tokens || 0; this.cb.usage(this.seconds, this.tokens || null, false); } } }
      else if (e.type === "error") this.cb.error("GPT-Live сообщил об ошибке сессии. Завершите разговор и проверьте подключение.");
    });
    channel.addEventListener("close", () => { if (!this.closed) { this.cb.error("Соединение закрыто без подтверждения итогового расхода."); this.dispose(); } });
    await peer.setLocalDescription(await peer.createOffer());
    if (peer.iceGatheringState !== "complete") await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { peer.removeEventListener("icegatheringstatechange", done); reject(new Error("Не удалось установить медиасоединение. Проверьте сеть или VPN.")); }, 10000);
      const done = () => { if (peer.iceGatheringState === "complete") { clearTimeout(timer); peer.removeEventListener("icegatheringstatechange", done); resolve(); } }; peer.addEventListener("icegatheringstatechange", done); done();
    });
    if (this.closed) return;
    const response = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sdp: peer.localDescription?.sdp, knowledge }) });
    const result = await response.json() as { error?: string; transport: { sdp: string } }; if (!response.ok) throw new Error(result.error || "Не удалось создать голосовую сессию."); if (this.closed) return;
    await peer.setRemoteDescription({ type: "answer", sdp: result.transport.sdp });
    if (!this.ready) this.startTimer = setTimeout(() => { this.cb.error("Сессия не подтвердила готовность. Проверьте сеть и доступ к GPT-Live."); this.dispose(); }, 20000);
  }
  mute(value: boolean) { this.mic?.getAudioTracks().forEach(t => { t.enabled = !value; }); }
  async play() { await this.ctx?.resume(); await this.audio.play(); this.cb.playbackBlocked(false); }
  stop() { if (this.closed || this.closing) return; this.closing = true; this.mute(true); this.audio.pause(); this.cb.levels(0, 0); this.cb.state("closing"); if (this.ready && this.events?.readyState === "open") { this.events.send(JSON.stringify({ type: "session.close" })); this.closeTimer = setTimeout(() => { this.cb.error("Разговор остановлен; итоговый расход не подтверждён сервером."); this.dispose(); }, 15000); } else this.dispose(); }
  dispose() { if (this.closed) return; this.closed = true; clearTimeout(this.closeTimer); clearTimeout(this.startTimer); clearTimeout(this.maxTimer); cancelAnimationFrame(this.frame); this.mic?.getTracks().forEach(t => t.stop()); this.events?.close(); this.peer?.close(); this.audio.pause(); this.audio.srcObject = null; void this.ctx?.close().catch(() => {}); this.cb.levels(0, 0); this.cb.state("idle"); }
}
