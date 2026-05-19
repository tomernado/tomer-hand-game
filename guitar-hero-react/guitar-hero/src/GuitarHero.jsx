import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SONGS } from './songs.js';

// ===== CONSTANTS =====
const LANE_COLORS = ['#2ecc71', '#e74c3c', '#f1c40f', '#3498db', '#e67e22'];
const LANE_KEYS = ['A', 'S', 'D', 'F', 'G'];
// Use e.code (physical key) instead of e.key (character) — works on any keyboard language
const CODE_TO_LANE = { KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3, KeyG: 4 };
const TRAVEL = 2.0; // seconds for a note to travel from top to hit zone

// ===== GAME BALANCE =====
const HIT_WINDOW = 1.2;
const PERFECT_WINDOW = 0.25;
const GOOD_WINDOW = 0.55;
const ROCK_GAIN_HIT = 0.06;
const ROCK_LOSS_MISS = 0.02;
const STREAK_POPUP_MIN = 10;

// ===== AUDIO ENGINE =====
let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null;
    }
  }
  return audioCtx;
}

const LANE_FREQS = [196, 247, 294, 370, 440]; // G3, B3, D4, F#4, A4

function playNote(lane, freq) {
  const ctx = getAudio();
  if (!ctx) return;
  freq = freq || LANE_FREQS[lane] || 220;
  const now = ctx.currentTime;
  // Guitar pluck: triangle body + brief sawtooth attack, filter sweep
  [[0, 'triangle', 0.22], [7, 'sawtooth', 0.07], [-5, 'sawtooth', 0.05]].forEach(([detune, type, vol]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(4000, now);
    filt.frequency.exponentialRampToValueAtTime(600, now + 0.3);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(filt).connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.41);
  });
}

function playMiss() {
  const ctx = getAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 90;
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.11);
}

let bgNodes = [];

function scheduleDrums(ctx, startTime, bpm, totalSeconds) {
  const beat = 60 / bpm;
  // Reuse a single snare buffer for all snare hits (avoids per-beat allocation)
  const snareSamples = Math.floor(ctx.sampleRate * 0.1);
  const snareBuf = ctx.createBuffer(1, snareSamples, ctx.sampleRate);
  const snareData = snareBuf.getChannelData(0);
  for (let j = 0; j < snareSamples; j++) snareData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / snareSamples, 2.5);

  const beats = Math.ceil(totalSeconds / beat);
  for (let i = 0; i < beats; i++) {
    const t = startTime + i * beat;
    // Kick on every beat (simple: beat 1 & 3 of 4/4 = even beats)
    if (i % 2 === 0) {
      const k = ctx.createOscillator();
      const kg = ctx.createGain();
      k.frequency.setValueAtTime(100, t);
      k.frequency.exponentialRampToValueAtTime(35, t + 0.08);
      kg.gain.setValueAtTime(0.16, t);
      kg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      k.connect(kg).connect(ctx.destination);
      k.start(t); k.stop(t + 0.13);
      bgNodes.push(k);
    }
    // Snare on beats 2 & 4 (odd beats)
    if (i % 2 === 1) {
      const src = ctx.createBufferSource();
      const sg = ctx.createGain();
      src.buffer = snareBuf;
      sg.gain.setValueAtTime(0.10, t);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      src.connect(sg).connect(ctx.destination);
      src.start(t);
      bgNodes.push(src);
    }
  }
}

function scheduleBass(ctx, startTime, bassLine, repeatEvery, totalSeconds) {
  const repeats = Math.ceil(totalSeconds / repeatEvery) + 1;
  for (let rep = 0; rep < repeats; rep++) {
    bassLine.forEach(({ t: bt, freq, dur }) => {
      const t = startTime + rep * repeatEvery + bt;
      if (t > startTime + totalSeconds + 2) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + dur);
      bgNodes.push(osc);
    });
  }
}

function scheduleFullMelody(ctx, startTime, notes) {
  notes.forEach(({ t: mt, freq, dur }) => {
    const t = startTime + mt;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 3200;
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const d = Math.max(0.14, dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.015);
    gain.gain.setValueAtTime(0.07, t + d * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, t + d);
    osc.connect(filt).connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t + d + 0.01);
    bgNodes.push(osc);
  });
}

function startBacking(song) {
  const ctx = getAudio();
  if (!ctx) return;
  stopBacking();
  const t0 = ctx.currentTime + 0.05;
  const total = 130;
  scheduleDrums(ctx, t0, song.bpm, total);
  if (song.bassLine) scheduleBass(ctx, t0, song.bassLine, song.bassRepeat, total);
  if (song.fullMelody) scheduleFullMelody(ctx, t0, song.fullMelody);
}

function stopBacking() {
  bgNodes.forEach((n) => { try { n.stop(); } catch (e) {} });
  bgNodes = [];
}

// ===== MAIN COMPONENT =====
export default function GuitarHero() {
  const [screen, setScreen] = useState('menu'); // menu | playing | end
  const [song, setSong] = useState(SONGS[0]);
  const [diff, setDiff] = useState('medium');
  const [stats, setStats] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [hud, setHud] = useState({
    score: 0, streak: 0, mult: 1, hit: 0, total: 0, popup: null,
    rockMeter: 0.5, accuracy: null,
  });

  const canvasRef = useRef(null);
  const gs = useRef(null); // game state (mutable, no re-renders)
  const rafRef = useRef(null);

  // ===== START GAME =====
  const begin = () => {
    getAudio(); // unlock audio context on user gesture
    setScreen('playing');
    setCountdown(3);
  };

  // ===== COUNTDOWN =====
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      initRound();
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 800);
    return () => clearTimeout(t);
  }, [countdown]);

  const initRound = () => {
    const chart = song.charts[diff].map((n) => ({
      ...n,
      hit: false,
      missed: false,
      released: false,
      sustainScore: 0,
    }));
    getAudio();
    gs.current = {
      chart,
      startTime: performance.now() / 1000,
      score: 0,
      streak: 0,
      maxStreak: 0,
      mult: 1,
      hits: 0,
      misses: 0,
      total: chart.length,
      pressed: [false, false, false, false, false],
      flashes: [],
      popup: null,
      lastMile: 0,
      endTime: chart.length ? chart[chart.length - 1].time + 3 : 5,
      rockMeter: 0.5,
      lastAccuracy: null,
    };
    startBacking(song);
    rafRef.current = requestAnimationFrame(loop);
  };

  // ===== MAIN LOOP =====
  const loop = useCallback(() => {
    const g = gs.current;
    if (!g) return;
    const now = performance.now() / 1000;
    const t = now - g.startTime;

    // Update sustains + missed notes
    g.chart.forEach((n) => {
      if (n.duration > 0 && n.hit && !n.released) {
        if (g.pressed[n.lane]) {
          if (t <= n.time + n.duration + 0.05) n.sustainScore += 0.016;
          else n.released = true;
        } else if (t > n.time + 0.1) {
          n.released = true;
        }
      }
      if (!n.hit && !n.missed && t > n.time + HIT_WINDOW) {
        n.missed = true;
        g.misses += 1;
        g.rockMeter = Math.max(0, g.rockMeter - ROCK_LOSS_MISS);
        if (g.streak >= STREAK_POPUP_MIN) {
          g.popup = { text: 'STREAK BROKEN!', color: '#e74c3c', at: now };
        }
        g.streak = 0;
        g.mult = 1;
        // no sound for auto-miss — only manual wrong-press plays miss sound
      }
    });

    // Streak milestone popups (every 25)
    const mile = Math.floor(g.streak / 25) * 25;
    if (mile >= 25 && mile !== g.lastMile) {
      g.lastMile = mile;
      g.popup = { text: `${mile} NOTE STREAK!`, color: '#ffcc00', at: now };
    }

    draw(t);

    setHud({
      score: g.score + Math.floor(g.chart.reduce((a, n) => a + n.sustainScore * 80, 0)),
      streak: g.streak,
      mult: g.mult,
      hit: g.hits,
      total: g.total,
      popup: g.popup && now - g.popup.at < 1.3 ? g.popup : null,
      rockMeter: g.rockMeter,
      accuracy: g.lastAccuracy && now - g.lastAccuracy.at < 0.7 ? g.lastAccuracy : null,
    });

    if (g.rockMeter <= 0 && !g.gameOverFired) {
      g.gameOverFired = true;
      finish(true);
      return;
    }
    if (t > g.endTime) {
      finish(false);
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // ===== DRAW =====
  const draw = (t) => {
    const c = canvasRef.current;
    if (!c) return;
    const cx = c.getContext('2d');
    const W = c.width;
    const H = c.height;
    const g = gs.current;

    // --- Background ---
    cx.fillStyle = '#06060f';
    cx.fillRect(0, 0, W, H);

    // Spotlight from above
    const spot = cx.createRadialGradient(W / 2, -40, 20, W / 2, H * 0.3, H * 0.85);
    spot.addColorStop(0, 'rgba(90,60,160,0.35)');
    spot.addColorStop(0.5, 'rgba(40,20,80,0.15)');
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = spot;
    cx.fillRect(0, 0, W, H);

    // --- Highway geometry ---
    const fbTopW = 170, fbBotW = 500;
    const fbTopY = 30, fbBotY = H - 55;

    const laneX = (lane, depth) => {
      const w = fbTopW + (fbBotW - fbTopW) * depth;
      return W / 2 - w / 2 + (lane + 0.5) * (w / 5);
    };
    const depthY = (d) => fbTopY + (fbBotY - fbTopY) * d;
    const laneScale = (d) => 0.3 + 0.7 * d;

    // Highway fill (trapezoid)
    cx.fillStyle = 'rgba(12,12,24,0.97)';
    cx.beginPath();
    cx.moveTo(W / 2 - fbTopW / 2, fbTopY);
    cx.lineTo(W / 2 + fbTopW / 2, fbTopY);
    cx.lineTo(W / 2 + fbBotW / 2, fbBotY);
    cx.lineTo(W / 2 - fbBotW / 2, fbBotY);
    cx.closePath();
    cx.fill();

    // Colored lane tint stripes
    for (let i = 0; i < 5; i++) {
      const xT0 = W / 2 - fbTopW / 2 + (fbTopW / 5) * i;
      const xT1 = W / 2 - fbTopW / 2 + (fbTopW / 5) * (i + 1);
      const xB0 = W / 2 - fbBotW / 2 + (fbBotW / 5) * i;
      const xB1 = W / 2 - fbBotW / 2 + (fbBotW / 5) * (i + 1);
      cx.fillStyle = LANE_COLORS[i] + '18';
      cx.beginPath();
      cx.moveTo(xT0, fbTopY);
      cx.lineTo(xT1, fbTopY);
      cx.lineTo(xB1, fbBotY);
      cx.lineTo(xB0, fbBotY);
      cx.closePath();
      cx.fill();
    }

    // Scrolling fret lines
    const fretCount = 7;
    const fretSpeed = 0.35;
    const fretOffset = (t * fretSpeed) % (1 / fretCount);
    for (let i = 0; i < fretCount + 1; i++) {
      const d = Math.min(1, (i / fretCount + fretOffset) % 1);
      if (d < 0.01) continue;
      const y = depthY(d);
      const w = fbTopW + (fbBotW - fbTopW) * d;
      const alpha = 0.06 + d * 0.12;
      cx.strokeStyle = `rgba(255,255,255,${alpha})`;
      cx.lineWidth = 1 + d * 1.5;
      cx.beginPath();
      cx.moveTo(W / 2 - w / 2, y);
      cx.lineTo(W / 2 + w / 2, y);
      cx.stroke();
    }

    // Lane dividers (glowing)
    for (let i = 0; i <= 5; i++) {
      const xT = W / 2 - fbTopW / 2 + (fbTopW / 5) * i;
      const xB = W / 2 - fbBotW / 2 + (fbBotW / 5) * i;
      cx.strokeStyle = 'rgba(255,255,255,0.18)';
      cx.lineWidth = 1;
      cx.beginPath();
      cx.moveTo(xT, fbTopY);
      cx.lineTo(xB, fbBotY);
      cx.stroke();
    }

    // Highway border glow
    cx.strokeStyle = 'rgba(180,120,255,0.3)';
    cx.lineWidth = 2;
    cx.beginPath();
    cx.moveTo(W / 2 - fbTopW / 2, fbTopY);
    cx.lineTo(W / 2 - fbBotW / 2, fbBotY);
    cx.stroke();
    cx.beginPath();
    cx.moveTo(W / 2 + fbTopW / 2, fbTopY);
    cx.lineTo(W / 2 + fbBotW / 2, fbBotY);
    cx.stroke();

    // --- Sustain trails ---
    g.chart.forEach((n) => {
      if (n.duration <= 0) return;
      const sD = (n.time - t) / TRAVEL;
      const eD = (n.time + n.duration - t) / TRAVEL;
      if (eD < 0 || sD > 1) return;
      const d0 = Math.max(0, Math.min(1, 1 - sD));
      const d1 = Math.max(0, Math.min(1, 1 - eD));
      const top = Math.min(d0, d1);
      const bot = Math.max(d0, d1);
      const yTop = depthY(top);
      const yBot = depthY(bot);
      const xTop = laneX(n.lane, top);
      const xBot = laneX(n.lane, bot);
      const wTop = 10 * laneScale(top);
      const wBot = 10 * laneScale(bot);
      const isHeld = n.hit && !n.released && g.pressed[n.lane];
      cx.globalAlpha = n.missed ? 0.15 : isHeld ? 0.95 : 0.5;
      cx.fillStyle = isHeld ? LANE_COLORS[n.lane] : 'rgba(200,200,255,0.7)';
      if (isHeld) {
        cx.shadowColor = LANE_COLORS[n.lane];
        cx.shadowBlur = 12;
      }
      cx.beginPath();
      cx.moveTo(xTop - wTop / 2, yTop);
      cx.lineTo(xTop + wTop / 2, yTop);
      cx.lineTo(xBot + wBot / 2, yBot);
      cx.lineTo(xBot - wBot / 2, yBot);
      cx.closePath();
      cx.fill();
      cx.shadowBlur = 0;
      cx.globalAlpha = 1;
    });

    // --- Note gems (circular buttons) ---
    g.chart.forEach((n) => {
      const dt = n.time - t;
      // Only draw while note is above or just at the hit zone (dt >= -0.08s = very brief pass-through)
      if (dt > TRAVEL || dt < -0.08) return;
      if (n.hit || n.missed) return; // disappear immediately on hit or miss
      const d = Math.max(0, 1 - dt / TRAVEL);
      if (d > 1.04) return; // clamp just past hit zone
      const nx = laneX(n.lane, Math.min(d, 1));
      const ny = depthY(Math.min(d, 1));
      const sc = laneScale(Math.min(d, 1));
      const nr = 22 * sc;
      const col = LANE_COLORS[n.lane];
      // Fade out in the brief window past the hit zone
      const alpha = d > 1.0 ? Math.max(0, 1 - (d - 1.0) / 0.04) : 1;

      cx.save();
      cx.globalAlpha = alpha;
      // Glow ring
      cx.shadowColor = col;
      cx.shadowBlur = 20 * sc;
      cx.strokeStyle = col;
      cx.lineWidth = 3 * sc;
      cx.beginPath();
      cx.arc(nx, ny, nr + 3 * sc, 0, Math.PI * 2);
      cx.stroke();
      cx.shadowBlur = 0;

      // 3D sphere gradient
      const grad = cx.createRadialGradient(nx - nr * 0.3, ny - nr * 0.3, nr * 0.05, nx, ny, nr);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.25, col);
      grad.addColorStop(1, col + '88');
      cx.fillStyle = grad;
      cx.beginPath();
      cx.arc(nx, ny, nr, 0, Math.PI * 2);
      cx.fill();

      // Dark center
      cx.fillStyle = 'rgba(0,0,0,0.28)';
      cx.beginPath();
      cx.arc(nx, ny, nr * 0.42, 0, Math.PI * 2);
      cx.fill();

      // Specular highlight
      cx.fillStyle = 'rgba(255,255,255,0.7)';
      cx.beginPath();
      cx.ellipse(nx - nr * 0.28, ny - nr * 0.3, nr * 0.28, nr * 0.18, -0.5, 0, Math.PI * 2);
      cx.fill();

      // Key letter
      cx.fillStyle = '#000';
      cx.font = `bold ${Math.round(11 * sc)}px monospace`;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(LANE_KEYS[n.lane], nx, ny + nr * 0.15);
      cx.restore();
    });

    // --- Hit zone targets ---
    for (let i = 0; i < 5; i++) {
      const tx = laneX(i, 1);
      const ty = depthY(1);
      const pressed = g.pressed[i];
      const r = 28 * laneScale(1);
      const col = LANE_COLORS[i];

      // Check if a note is approaching within 0.5s for pulse effect
      let approaching = false;
      g.chart.forEach((n) => {
        if (n.lane === i && !n.hit && !n.missed) {
          const dt = Math.abs(n.time - t);
          if (dt < 0.5) approaching = true;
        }
      });
      const pulse = approaching ? (Math.sin(t * 12) * 0.5 + 0.5) : 0;

      cx.save();
      // Outer glow ring — pulses when note approaching
      cx.shadowColor = col;
      cx.shadowBlur = pressed ? 45 : approaching ? 12 + pulse * 22 : 8;
      cx.strokeStyle = col;
      cx.lineWidth = pressed ? 5 : approaching ? 2 + pulse * 2 : 2;
      cx.beginPath();
      cx.arc(tx, ty, r, 0, Math.PI * 2);
      cx.stroke();

      // Second ring
      cx.shadowBlur = 0;
      cx.strokeStyle = col + (pressed ? 'cc' : '55');
      cx.lineWidth = 1.5;
      cx.beginPath();
      cx.arc(tx, ty, r * 1.22, 0, Math.PI * 2);
      cx.stroke();

      // Main fill
      if (pressed) {
        const grad = cx.createRadialGradient(tx - r * 0.3, ty - r * 0.3, r * 0.05, tx, ty, r * 0.9);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.3, col);
        grad.addColorStop(1, col + '88');
        cx.fillStyle = grad;
      } else {
        cx.fillStyle = approaching
          ? `rgba(${parseInt(col.slice(1,3),16)},${parseInt(col.slice(3,5),16)},${parseInt(col.slice(5,7),16)},${0.08 + pulse * 0.12})`
          : 'rgba(5,5,15,0.88)';
      }
      cx.beginPath();
      cx.arc(tx, ty, r * 0.82, 0, Math.PI * 2);
      cx.fill();

      // Key label
      cx.fillStyle = pressed ? '#000' : approaching ? col : '#aaa';
      cx.font = `bold ${Math.round(14 * laneScale(1))}px monospace`;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(LANE_KEYS[i], tx, ty);
      cx.restore();
    }

    // Hit line
    cx.strokeStyle = 'rgba(255,255,200,0.25)';
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(W / 2 - fbBotW / 2, fbBotY);
    cx.lineTo(W / 2 + fbBotW / 2, fbBotY);
    cx.stroke();

    // --- Rock Meter (right side of canvas) ---
    const rmX = W - 54, rmY = H / 2;
    const rmR = 38;
    const rmStart = Math.PI * 0.75;
    const rmEnd = Math.PI * 2.25;
    const rmMeter = g.rockMeter;

    cx.save();
    cx.strokeStyle = 'rgba(255,255,255,0.1)';
    cx.lineWidth = 8;
    cx.lineCap = 'round';
    cx.beginPath();
    cx.arc(rmX, rmY, rmR, rmStart, rmEnd);
    cx.stroke();

    const rmColor = rmMeter > 0.6 ? '#2ecc71' : rmMeter > 0.3 ? '#f39c12' : '#e74c3c';
    cx.strokeStyle = rmColor;
    cx.shadowColor = rmColor;
    cx.shadowBlur = 10;
    cx.lineWidth = 8;
    cx.beginPath();
    cx.arc(rmX, rmY, rmR, rmStart, rmStart + (rmEnd - rmStart) * rmMeter);
    cx.stroke();
    cx.shadowBlur = 0;

    cx.fillStyle = '#fff';
    cx.font = 'bold 9px sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('ROCK', rmX, rmY - 6);
    cx.fillText('METER', rmX, rmY + 6);
    cx.restore();

    // Danger flash when low
    if (rmMeter < 0.2 && Math.floor(t * 4) % 2 === 0) {
      cx.fillStyle = 'rgba(231,76,60,0.12)';
      cx.fillRect(0, 0, W, H);
    }

    // --- Hit flashes ---
    g.flashes = g.flashes.filter((f) => t - f.time < 0.45);
    g.flashes.forEach((f) => {
      const age = (t - f.time) / 0.45;
      const fcx = laneX(f.lane, 1);
      const fcy = depthY(1);
      const color = LANE_COLORS[f.lane];
      cx.save();

      cx.globalAlpha = (1 - age) * 0.9;
      cx.strokeStyle = color;
      cx.shadowColor = color;
      cx.shadowBlur = 28;
      cx.lineWidth = 6 * (1 - age);
      cx.beginPath();
      cx.ellipse(fcx, fcy, 28 + age * 70, (28 + age * 70) * 0.55, 0, 0, Math.PI * 2);
      cx.stroke();

      if (age > 0.1) {
        const age2 = (age - 0.1) / 0.9;
        cx.globalAlpha = (1 - age2) * 0.5;
        cx.lineWidth = 3 * (1 - age2);
        cx.beginPath();
        cx.ellipse(fcx, fcy, 18 + age2 * 50, (18 + age2 * 50) * 0.55, 0, 0, Math.PI * 2);
        cx.stroke();
      }

      cx.globalAlpha = Math.max(0, 0.95 - age * 2.8);
      cx.fillStyle = '#fff';
      cx.shadowBlur = 35;
      cx.beginPath();
      cx.ellipse(fcx, fcy, 20, 13, 0, 0, Math.PI * 2);
      cx.fill();

      cx.shadowBlur = 8;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const rr = 10 + age * 75;
        cx.globalAlpha = Math.max(0, (1 - age) * 0.8);
        cx.fillStyle = k % 2 === 0 ? color : '#fff';
        cx.beginPath();
        cx.arc(fcx + Math.cos(a) * rr, fcy + Math.sin(a) * rr * 0.5, 5 * (1 - age) + 1, 0, Math.PI * 2);
        cx.fill();
      }
      cx.restore();
    });

  };

  // ===== INPUT HANDLING =====
  const handleKey = (lane, isDown) => {
    const g = gs.current;
    if (!g) return;

    if (isDown) {
      if (g.pressed[lane]) return;
      g.pressed[lane] = true;
      const t = performance.now() / 1000 - g.startTime;

      // Find closest matching note in window
      let best = null;
      let bestD = Infinity;
      g.chart.forEach((n) => {
        if (n.lane !== lane || n.hit || n.missed) return;
        const d = Math.abs(n.time - t);
        if (d < HIT_WINDOW && d < bestD) { best = n; bestD = d; }
      });

      if (best) {
        best.hit = true;
        g.hits += 1;
        g.streak += 1;
        if (g.streak > g.maxStreak) g.maxStreak = g.streak;
        g.mult = g.streak >= 30 ? 4 : g.streak >= 20 ? 3 : g.streak >= 10 ? 2 : 1;
        const accLabel = bestD < PERFECT_WINDOW ? 'PERFECT' : bestD < GOOD_WINDOW ? 'GOOD' : 'OK';
        const accPts = accLabel === 'PERFECT' ? 100 : accLabel === 'GOOD' ? 70 : 40;
        g.score += accPts * g.mult;
        g.rockMeter = Math.min(1, g.rockMeter + ROCK_GAIN_HIT);
        g.lastAccuracy = { text: accLabel, at: performance.now() / 1000 };
        g.flashes.push({ lane, time: t });
        playNote(lane, best.freq);
      } else {
        playMiss();
        g.rockMeter = Math.max(0, g.rockMeter - ROCK_LOSS_MISS);
        if (g.streak >= STREAK_POPUP_MIN) {
          g.popup = { text: 'STREAK BROKEN!', color: '#e74c3c', at: performance.now() / 1000 };
        }
        g.streak = 0;
        g.mult = 1;
      }
    } else {
      g.pressed[lane] = false;
    }
  };

  // ===== KEYBOARD EVENTS =====
  useEffect(() => {
    if (screen !== 'playing') return;
    const onDown = (e) => {
      const lane = CODE_TO_LANE[e.code];
      if (lane === undefined) return;
      e.preventDefault();
      handleKey(lane, true);
    };
    const onUp = (e) => {
      const lane = CODE_TO_LANE[e.code];
      if (lane === undefined) return;
      e.preventDefault();
      handleKey(lane, false);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopBacking();
    };
  }, [screen]);

  // ===== FINISH =====
  const finish = (gameOver = false) => {
    stopBacking();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const g = gs.current;
    if (!g) return;
    const sustain = Math.floor(g.chart.reduce((a, n) => a + n.sustainScore * 80, 0));
    const finalScore = g.score + sustain;
    const pct = g.total > 0 ? Math.round((g.hits / g.total) * 100) : 0;
    let grade = 'F';
    if (pct >= 95) grade = 'S';
    else if (pct >= 85) grade = 'A';
    else if (pct >= 70) grade = 'B';
    else if (pct >= 55) grade = 'C';
    else if (pct >= 40) grade = 'D';
    setStats({
      score: finalScore,
      hits: g.hits,
      misses: g.misses,
      total: g.total,
      percent: pct,
      maxStreak: g.maxStreak,
      grade,
      gameOver,
    });
    gs.current = null;
    setScreen('end');
  };

  // ===== RENDER: MENU =====
  if (screen === 'menu') {
    return (
      <div style={styles.wrap}>
        <h1 style={styles.title}>🎸 GUITAR HERO</h1>
        <p style={styles.sub}>REACT EDITION</p>

        <p style={styles.sectionTitle}>★ SELECT SONG</p>
        <div style={styles.songGrid}>
          {SONGS.map((s) => (
            <div
              key={s.id}
              onClick={() => setSong(s)}
              style={{
                ...styles.songCard,
                border: `2px solid ${song.id === s.id ? s.color : '#2a2a4a'}`,
                boxShadow: song.id === s.id ? `0 0 14px ${s.color}88` : 'none',
              }}
            >
              <h4 style={{ margin: '0 0 4px', fontSize: 15, color: '#fff' }}>{s.title}</h4>
              <p style={{ margin: 0, fontSize: 11, color: '#999' }}>
                {s.artist} · {s.bpm} BPM
              </p>
            </div>
          ))}
        </div>

        <p style={styles.sectionTitle}>★ DIFFICULTY</p>
        <div style={styles.diffRow}>
          {[
            { id: 'easy', label: 'EASY', color: '#2ecc71' },
            { id: 'medium', label: 'MEDIUM', color: '#f39c12' },
            { id: 'expert', label: 'EXPERT', color: '#e74c3c' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDiff(d.id)}
              style={{
                ...styles.diffBtn,
                background: diff === d.id ? d.color : '#1a1a2e',
                border: `2px solid ${diff === d.id ? d.color : '#2a2a4a'}`,
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        <button style={styles.playBtn} onClick={begin}>
          ▶ ROCK ON
        </button>

        <p style={styles.keysInfo}>
          Keys: <span style={styles.kbd}>A</span>
          <span style={styles.kbd}>S</span>
          <span style={styles.kbd}>D</span>
          <span style={styles.kbd}>F</span>
          <span style={styles.kbd}>G</span>
          {' '}· Hold for sustained notes
        </p>
      </div>
    );
  }

  // ===== RENDER: PLAYING =====
  if (screen === 'playing') {
    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: 900 }}>
        <canvas
          ref={canvasRef}
          width={720}
          height={500}
          style={{ display: 'block', width: '100%', height: 'auto', background: '#000', borderRadius: 8 }}
        />

        <div style={styles.hudLeft}>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: '#ffcc00' }}>
            {hud.score.toLocaleString()}
          </div>
          <div style={{ fontSize: 16, color: '#ff8800', marginTop: 2, fontWeight: 700 }}>
            ×{hud.mult}
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, letterSpacing: 1 }}>
            STREAK: {hud.streak}
          </div>
          <div style={{ fontSize: 10, color: '#777', marginTop: 2, letterSpacing: 1 }}>
            {hud.hit}/{hud.total} NOTES
          </div>
        </div>

        <div style={styles.hudRight}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#ff3366' }}>SONG</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: song.color }}>{song.title}</div>
          <div style={{ fontSize: 11, marginTop: 2, color: '#aaa' }}>{diff.toUpperCase()}</div>
        </div>

        {hud.popup && (
          <div style={{
            ...styles.popup,
            color: hud.popup.color,
            textShadow: `0 0 16px ${hud.popup.color}, 3px 3px 0 #000`,
          }}>
            {hud.popup.text}
          </div>
        )}

        {hud.accuracy && (
          <div style={{
            position: 'absolute',
            bottom: '22%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'Impact, sans-serif',
            fontSize: 28,
            letterSpacing: 3,
            pointerEvents: 'none',
            color: hud.accuracy.text === 'PERFECT' ? '#ffcc00'
              : hud.accuracy.text === 'GOOD' ? '#2ecc71' : '#3498db',
            textShadow: '2px 2px 0 #000',
          }}>
            {hud.accuracy.text}
          </div>
        )}

        {countdown !== null && (
          <div style={styles.countdown}>{countdown === 0 ? 'GO!' : countdown}</div>
        )}

        {/* Mobile/touch buttons */}
        <div style={styles.touchRow}>
          {LANE_COLORS.map((c, i) => (
            <button
              key={i}
              onTouchStart={(e) => { e.preventDefault(); handleKey(i, true); }}
              onTouchEnd={(e) => { e.preventDefault(); handleKey(i, false); }}
              onMouseDown={() => handleKey(i, true)}
              onMouseUp={() => handleKey(i, false)}
              onMouseLeave={() => handleKey(i, false)}
              style={{
                flex: 1,
                maxWidth: 90,
                padding: '14px 0',
                background: c,
                border: '2px solid #000',
                borderRadius: 8,
                color: '#000',
                fontWeight: 800,
                fontSize: 16,
                fontFamily: 'monospace',
                cursor: 'pointer',
              }}
            >
              {LANE_KEYS[i]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ===== RENDER: END SCREEN =====
  const gradeColor = {
    S: '#ffcc00', A: '#2ecc71', B: '#3498db',
    C: '#f39c12', D: '#e67e22', F: '#e74c3c',
  }[stats?.grade] || '#fff';

  return (
    <div style={{ ...styles.wrap, textAlign: 'center' }}>
      {stats?.gameOver ? (
        <h2 style={{
          fontFamily: 'Impact, sans-serif', fontSize: 52, margin: '0 0 8px',
          color: '#e74c3c', textShadow: '0 0 20px rgba(231,76,60,0.8), 3px 3px 0 #7b0000',
          letterSpacing: 4,
        }}>
          GAME OVER
        </h2>
      ) : (
        <h2 style={{
          fontFamily: 'Impact, sans-serif', fontSize: 42, margin: '0 0 8px',
          color: '#ffcc00', textShadow: '0 0 16px rgba(255,204,0,0.7), 3px 3px 0 #c0392b',
          letterSpacing: 3,
        }}>
          SONG COMPLETE!
        </h2>
      )}
      <p style={{ color: '#aaa', letterSpacing: 2, margin: '4px 0 0' }}>
        {song.title} · {diff.toUpperCase()}
      </p>
      <div style={{
        fontSize: 80, fontWeight: 800, margin: '16px 0 0',
        fontFamily: 'Impact, sans-serif', letterSpacing: 2, color: gradeColor,
      }}>
        {stats?.percent}%
      </div>
      <div style={{ fontSize: 22, margin: '0 0 24px', color: '#fff', letterSpacing: 3 }}>
        GRADE:{' '}
        <span style={{ color: gradeColor, fontSize: 30, fontWeight: 800 }}>{stats?.grade}</span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
        maxWidth: 620, margin: '16px auto',
      }}>
        {[
          { l: 'SCORE', v: stats?.score.toLocaleString(), c: '#ffcc00' },
          { l: 'NOTES HIT', v: `${stats?.hits}/${stats?.total}`, c: '#ffcc00' },
          { l: 'MISSED', v: stats?.misses, c: '#e74c3c' },
          { l: 'MAX STREAK', v: stats?.maxStreak, c: '#ff8800' },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#1a1a2e', border: '1px solid #2a2a4a',
            borderRadius: 8, padding: 12,
          }}>
            <div style={{ fontSize: 10, color: '#888', letterSpacing: 2 }}>{s.l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
        <button onClick={() => { setScreen('playing'); setCountdown(3); }} style={styles.endBtn}>
          RETRY
        </button>
        <button onClick={() => setScreen('menu')} style={styles.endBtn}>
          MENU
        </button>
      </div>
    </div>
  );
}

// ===== STYLES =====
const styles = {
  wrap: {
    width: '100%',
    maxWidth: 900,
    padding: 24,
    boxSizing: 'border-box',
  },
  title: {
    textAlign: 'center',
    fontSize: 38,
    fontWeight: 900,
    letterSpacing: 2,
    margin: '0 0 4px',
    color: '#ffcc00',
    textShadow: '0 0 12px rgba(255,204,0,0.6), 2px 2px 0 #c0392b',
    fontFamily: 'Impact, Arial Black, sans-serif',
  },
  sub: {
    textAlign: 'center',
    fontSize: 13,
    color: '#aaa',
    margin: '0 0 24px',
    letterSpacing: 3,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#ffcc00',
    margin: '20px 0 10px',
    letterSpacing: 2,
    fontWeight: 700,
  },
  songGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 10,
  },
  songCard: {
    background: 'linear-gradient(180deg, #1a1a2e, #0d0d1a)',
    borderRadius: 8,
    padding: 12,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s',
  },
  diffRow: { display: 'flex', gap: 10, justifyContent: 'center' },
  diffBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 1,
  },
  playBtn: {
    display: 'block',
    margin: '28px auto 0',
    padding: '16px 48px',
    background: 'linear-gradient(180deg, #ff3366, #c0392b)',
    border: '3px solid #ffcc00',
    borderRadius: 10,
    color: '#fff',
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 3,
    cursor: 'pointer',
    fontFamily: 'Impact, sans-serif',
    textShadow: '1px 1px 0 #000',
  },
  keysInfo: {
    textAlign: 'center',
    marginTop: 18,
    fontSize: 12,
    color: '#888',
    letterSpacing: 1,
  },
  kbd: {
    display: 'inline-block',
    padding: '3px 8px',
    margin: '0 3px',
    background: '#1a1a2e',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#ffcc00',
    fontFamily: 'monospace',
    fontWeight: 700,
  },
  hudLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    background: 'rgba(0,0,0,0.75)',
    border: '2px solid #ffcc00',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#ffcc00',
    fontFamily: 'Impact, monospace',
    minWidth: 120,
  },
  hudRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    background: 'rgba(0,0,0,0.75)',
    border: '2px solid #ff3366',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#fff',
    textAlign: 'center',
    minWidth: 110,
  },
  popup: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: 'Impact, sans-serif',
    fontSize: 38,
    pointerEvents: 'none',
    letterSpacing: 2,
  },
  countdown: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Impact, sans-serif',
    fontSize: 120,
    color: '#ffcc00',
    textShadow: '0 0 30px #ff3366',
    zIndex: 10,
    borderRadius: 8,
  },
  touchRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 4px',
    background: '#0a0a14',
    marginTop: 4,
    borderRadius: 8,
  },
  endBtn: {
    padding: '12px 28px',
    background: '#1a1a2e',
    border: '2px solid #ffcc00',
    borderRadius: 8,
    color: '#ffcc00',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 2,
    fontFamily: 'Impact, sans-serif',
    fontSize: 16,
  },
};
