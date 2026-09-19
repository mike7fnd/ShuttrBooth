/**
 * Built-in Web Audio API synthesizer for tactile, zero-latency mechanical camera audio
 * (Realistic shutter click, mirror slap, mechanical advance, and clean countdown ticks)
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Initialize or resume context on user gesture
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Pre-warm audio on user interaction to avoid any autoplay delay
 */
export function warmUpAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// Auto-warmup on first click or touch
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    warmUpAudio();
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
  };
  window.addEventListener('click', handleFirstInteraction, { passive: true });
  window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
}

export function isAudioEnabled(): boolean {
  return soundEnabled;
}

export function setAudioEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

/**
 * Crisp minimalist countdown tick (3... 2... 1...)
 */
export function playCountdownTick(isFinal: boolean = false): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 1200 : 750, now);
    if (isFinal) {
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.08);
    }
    
    // Quick organic envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(isFinal ? 0.25 : 0.15, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.12 : 0.06));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + (isFinal ? 0.13 : 0.07));
  } catch {
    // Safely ignore audio errors
  }
}

/**
 * Satisfying Multi-Layered Analog SLR Mechanical Shutter Sound
 * Features: Mirror slap + high-frequency aperture blade click + shutter curtain travel + motorized advance purr
 */
export function playShutterSound(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // --- LAYER 1: Punchy Sub / Low-Mid Mirror Slap Body ---
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(280, now);
    punchOsc.frequency.exponentialRampToValueAtTime(45, now + 0.045);

    punchGain.gain.setValueAtTime(0.4, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    punchOsc.connect(punchGain);
    punchGain.connect(ctx.destination);
    punchOsc.start(now);
    punchOsc.stop(now + 0.055);

    // --- LAYER 2: Crisp Metallic Mechanical Shutter Snap (White Noise Burst) ---
    const noiseDuration = 0.04;
    const bufferSize = Math.floor(ctx.sampleRate * noiseDuration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 3400;
    noiseFilter.Q.value = 2.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);

    // --- LAYER 3: Secondary Shutter Curtain Return Click (t + 55ms) ---
    const click2Time = now + 0.055;
    const click2Osc = ctx.createOscillator();
    const click2Gain = ctx.createGain();
    click2Osc.type = 'sine';
    click2Osc.frequency.setValueAtTime(520, click2Time);
    click2Osc.frequency.exponentialRampToValueAtTime(70, click2Time + 0.04);

    click2Gain.gain.setValueAtTime(0.3, click2Time);
    click2Gain.gain.exponentialRampToValueAtTime(0.001, click2Time + 0.045);

    click2Osc.connect(click2Gain);
    click2Gain.connect(ctx.destination);
    click2Osc.start(click2Time);
    click2Osc.stop(click2Time + 0.05);

    // --- LAYER 4: Tactile Motorized Film Advance Purr (t + 110ms to 220ms) ---
    const motorTime = now + 0.11;
    const motorOsc = ctx.createOscillator();
    const motorGain = ctx.createGain();
    motorOsc.type = 'sawtooth';
    motorOsc.frequency.setValueAtTime(180, motorTime);
    motorOsc.frequency.linearRampToValueAtTime(240, motorTime + 0.08);
    motorOsc.frequency.linearRampToValueAtTime(160, motorTime + 0.14);

    const motorFilter = ctx.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.frequency.value = 650;

    motorGain.gain.setValueAtTime(0.001, motorTime);
    motorGain.gain.linearRampToValueAtTime(0.06, motorTime + 0.02);
    motorGain.gain.linearRampToValueAtTime(0.05, motorTime + 0.09);
    motorGain.gain.exponentialRampToValueAtTime(0.001, motorTime + 0.14);

    motorOsc.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(ctx.destination);
    motorOsc.start(motorTime);
    motorOsc.stop(motorTime + 0.15);

  } catch {
    // Safely ignore
  }
}

/**
 * Subtle paper ejection / print slide sound
 */
export function playPrintSound(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.linearRampToValueAtTime(650, now + 0.25);
    osc.frequency.linearRampToValueAtTime(840, now + 0.45);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.08);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.52);
  } catch {
    // Ignore safely
  }
}
