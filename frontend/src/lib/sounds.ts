// Notification sound utilities using Web Audio API (no external files needed)

function createAudioContext(): AudioContext {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio API unavailable");
  return new AudioContextClass();
}

export function playNotificationSound(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = createAudioContext();
    
    // Play a pleasant notification chime: two tones
    const playTone = (frequency: number, startTime: number, duration: number, volume = 0.3) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      oscillator.start(ctx.currentTime + startTime);
      oscillator.stop(ctx.currentTime + startTime + duration + 0.01);
    };

    // First tone (higher)
    playTone(880, 0, 0.15, 0.4); // A5
    // Second tone (lower)
    playTone(660, 0.12, 0.2, 0.35); // E5
    // Optional third tone
    playTone(523.25, 0.25, 0.25, 0.3); // C5
  } catch {
    // Silently fail if audio not available
  }
}

export function playAcceptSound(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = createAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 523.25; // C5
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.35);
  } catch {}
}

export function playRejectSound(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = createAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 200; // Low tone
    oscillator.type = "sawtooth";
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.25);
  } catch {}
}

export function playOnlineSound(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = createAudioContext();
    const playTone = (freq: number, delay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.16);
    };
    playTone(440, 0);    // A4
    playTone(554.37, 0.08); // C#5
    playTone(659.25, 0.16); // E5
  } catch {}
}

export function playOfflineSound(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = createAudioContext();
    const playTone = (freq: number, delay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.16);
    };
    playTone(659.25, 0);   // E5
    playTone(554.37, 0.08); // C#5
    playTone(440, 0.16);   // A4
  } catch {}
}