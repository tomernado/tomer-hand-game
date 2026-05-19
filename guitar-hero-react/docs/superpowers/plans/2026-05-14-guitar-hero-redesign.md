# Guitar Hero React — Full Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Guitar Hero React game with real Guitar Hero aesthetics, melodic backing tracks synced to note charts, 5 songs with long interesting charts, rock meter, and forgiving timing.

**Architecture:** All visuals drawn on a single HTML5 canvas in `draw()`. Backing tracks are scheduled WebAudio oscillators. Song charts are arrays of `{time, lane, duration}` objects whose `time` values align with melody note times so key presses feel musical.

**Tech Stack:** React 18, Vite 5, WebAudio API, HTML5 Canvas (`roundRect` — Chrome 99+, Firefox 112+)

---

## File Map

| File | Changes |
|------|---------|
| `guitar-hero/src/GuitarHero.jsx` | Rock meter state, accuracy grades, full `draw()` rewrite, game-over screen, HUD rock meter |
| `guitar-hero/src/songs.js` | Melody data per song, new `startBacking` with melody scheduling, extended charts, 2 new songs |

---

## Task 1: Rock meter + accuracy system in game state

**Files:**
- Modify: `guitar-hero/src/GuitarHero.jsx`

- [ ] **Step 1: Add `rockMeter` and `lastAccuracy` to game state in `initRound`**

Find this block in `initRound`:
```js
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
};
```

Replace with:
```js
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
```

- [ ] **Step 2: Update `handleKey` to produce accuracy grades and update rock meter**

Find the hit detection block in `handleKey` (the `if (best)` branch):
```js
      if (best) {
        best.hit = true;
        g.hits += 1;
        g.streak += 1;
        if (g.streak > g.maxStreak) g.maxStreak = g.streak;
        g.mult = g.streak >= 30 ? 4 : g.streak >= 20 ? 3 : g.streak >= 10 ? 2 : 1;
        const acc = bestD < 0.05 ? 100 : bestD < 0.1 ? 70 : 50;
        g.score += acc * g.mult;
        g.flashes.push({ lane, time: t });
        playNote(lane);
      } else {
        playMiss();
        if (g.streak >= 5) {
          g.popup = {
            text: 'STREAK BROKEN!',
            color: '#e74c3c',
            at: ctx ? ctx.currentTime : performance.now() / 1000,
          };
        }
        g.streak = 0;
        g.mult = 1;
      }
```

Replace with:
```js
      if (best) {
        best.hit = true;
        g.hits += 1;
        g.streak += 1;
        if (g.streak > g.maxStreak) g.maxStreak = g.streak;
        g.mult = g.streak >= 30 ? 4 : g.streak >= 20 ? 3 : g.streak >= 10 ? 2 : 1;
        const accLabel = bestD < 0.08 ? 'PERFECT' : bestD < 0.15 ? 'GOOD' : 'OK';
        const accPts = accLabel === 'PERFECT' ? 100 : accLabel === 'GOOD' ? 70 : 40;
        g.score += accPts * g.mult;
        g.rockMeter = Math.min(1, g.rockMeter + 0.03);
        g.lastAccuracy = { text: accLabel, at: performance.now() / 1000 };
        g.flashes.push({ lane, time: t });
        playNote(lane);
      } else {
        playMiss();
        g.rockMeter = Math.max(0, g.rockMeter - 0.08);
        if (g.streak >= 5) {
          g.popup = { text: 'STREAK BROKEN!', color: '#e74c3c', at: performance.now() / 1000 };
        }
        g.streak = 0;
        g.mult = 1;
      }
```

- [ ] **Step 3: Update missed-note handler in `loop` to also drain rock meter**

Find in the loop's `g.chart.forEach`:
```js
      if (!n.hit && !n.missed && t > n.time + 0.35) {
        n.missed = true;
        g.misses += 1;
        if (g.streak >= 10) {
          g.popup = { text: 'STREAK BROKEN!', color: '#e74c3c', at: now };
        }
        g.streak = 0;
        g.mult = 1;
        playMiss();
      }
```

Replace with:
```js
      if (!n.hit && !n.missed && t > n.time + 0.35) {
        n.missed = true;
        g.misses += 1;
        g.rockMeter = Math.max(0, g.rockMeter - 0.08);
        if (g.streak >= 10) {
          g.popup = { text: 'STREAK BROKEN!', color: '#e74c3c', at: now };
        }
        g.streak = 0;
        g.mult = 1;
        playMiss();
      }
```

- [ ] **Step 4: Include `rockMeter` and `lastAccuracy` in `setHud` call inside `loop`**

Find:
```js
    setHud({
      score: g.score + Math.floor(g.chart.reduce((a, n) => a + n.sustainScore * 80, 0)),
      streak: g.streak,
      mult: g.mult,
      hit: g.hits,
      total: g.total,
      popup: g.popup && now - g.popup.at < 1.3 ? g.popup : null,
    });
```

Replace with:
```js
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
```

- [ ] **Step 5: Add game-over check in `loop` (rock meter reaches 0)**

Find in `loop`:
```js
    if (t > g.endTime) {
      finish();
      return;
    }
```

Replace with:
```js
    if (g.rockMeter <= 0 && !g.gameOverFired) {
      g.gameOverFired = true;
      finish(true);
      return;
    }
    if (t > g.endTime) {
      finish(false);
      return;
    }
```

- [ ] **Step 6: Update `finish` to accept a `gameOver` flag**

Find:
```js
  const finish = () => {
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
    });
    gs.current = null;
    setScreen('end');
  };
```

Replace with:
```js
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
```

- [ ] **Step 7: Build and verify no errors**

```bash
cd guitar-hero && npx vite build
```
Expected: `✓ built in X.XXs`

- [ ] **Step 8: Commit**

```bash
git add guitar-hero/src/GuitarHero.jsx
git commit -m "feat: add rock meter, accuracy grades (PERFECT/GOOD/OK), game-over trigger"
```

---

## Task 2: Game-over display on end screen

**Files:**
- Modify: `guitar-hero/src/GuitarHero.jsx`

- [ ] **Step 1: Update the end screen render to show game-over state**

Find the end screen render — the `return (` block after `const gradeColor = ...`. Replace the entire end screen JSX with:

```jsx
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
```

- [ ] **Step 2: Build and verify**

```bash
cd guitar-hero && npx vite build
```

- [ ] **Step 3: Commit**

```bash
git add guitar-hero/src/GuitarHero.jsx
git commit -m "feat: game-over screen shows GAME OVER vs SONG COMPLETE"
```

---

## Task 3: Complete visual redesign of `draw()`

**Files:**
- Modify: `guitar-hero/src/GuitarHero.jsx`

- [ ] **Step 1: Replace the entire `draw` function**

Find `// ===== DRAW =====` and replace the entire `draw` function (from `const draw = (t) => {` to the closing `};` before `// ===== INPUT HANDLING =====`) with:

```js
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

    // --- Note gems (rounded rectangles) ---
    g.chart.forEach((n) => {
      const dt = n.time - t;
      if (dt > TRAVEL || dt < -0.35) return;
      if (n.hit) return;
      const d = 1 - dt / TRAVEL;
      if (d < 0 || d > 1.05) return;
      const nx = laneX(n.lane, d);
      const ny = depthY(d);
      const sc = laneScale(d);
      const nw = 40 * sc;
      const nh = 20 * sc;
      const nr = 5 * sc;

      cx.save();
      if (n.missed) {
        cx.globalAlpha = 0.2;
        cx.fillStyle = '#555';
      } else {
        cx.shadowColor = LANE_COLORS[n.lane];
        cx.shadowBlur = 18 * sc;
        cx.fillStyle = LANE_COLORS[n.lane];
      }
      cx.beginPath();
      cx.roundRect(nx - nw / 2, ny - nh / 2, nw, nh, nr);
      cx.fill();

      if (!n.missed) {
        // Dark center stripe
        cx.shadowBlur = 0;
        cx.fillStyle = 'rgba(0,0,0,0.3)';
        cx.beginPath();
        cx.roundRect(nx - nw * 0.25, ny - nh * 0.2, nw * 0.5, nh * 0.4, nr * 0.5);
        cx.fill();
        // Highlight gloss
        cx.fillStyle = 'rgba(255,255,255,0.45)';
        cx.beginPath();
        cx.roundRect(nx - nw * 0.35, ny - nh * 0.45, nw * 0.5, nh * 0.35, nr * 0.5);
        cx.fill();
      }
      cx.restore();
    });

    // --- Hit zone targets ---
    for (let i = 0; i < 5; i++) {
      const tx = laneX(i, 1);
      const ty = depthY(1);
      const pressed = g.pressed[i];
      const r = 24 * laneScale(1);

      cx.save();
      // Outer glow ring
      cx.shadowColor = LANE_COLORS[i];
      cx.shadowBlur = pressed ? 32 : 10;
      cx.strokeStyle = LANE_COLORS[i];
      cx.lineWidth = pressed ? 4 : 2.5;
      cx.beginPath();
      cx.arc(tx, ty, r, 0, Math.PI * 2);
      cx.stroke();

      // Inner fill
      cx.shadowBlur = 0;
      cx.fillStyle = pressed ? LANE_COLORS[i] : 'rgba(5,5,15,0.85)';
      cx.globalAlpha = pressed ? 0.9 : 1;
      cx.beginPath();
      cx.arc(tx, ty, r * 0.78, 0, Math.PI * 2);
      cx.fill();
      cx.globalAlpha = 1;

      // Inner ring detail
      if (!pressed) {
        cx.strokeStyle = LANE_COLORS[i] + '55';
        cx.lineWidth = 1.5;
        cx.beginPath();
        cx.arc(tx, ty, r * 0.55, 0, Math.PI * 2);
        cx.stroke();
      }

      // Key label
      cx.fillStyle = pressed ? '#000' : '#fff';
      cx.font = `bold ${Math.round(13 * laneScale(1))}px monospace`;
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

    // --- Rock Meter (drawn on canvas, right side) ---
    const rmX = W - 54, rmY = H / 2;
    const rmR = 38;
    const rmStart = Math.PI * 0.75;
    const rmEnd = Math.PI * 2.25;
    const rmMeter = g.rockMeter;

    // Background arc
    cx.save();
    cx.strokeStyle = 'rgba(255,255,255,0.1)';
    cx.lineWidth = 8;
    cx.lineCap = 'round';
    cx.beginPath();
    cx.arc(rmX, rmY, rmR, rmStart, rmEnd);
    cx.stroke();

    // Filled arc (green→yellow→red based on value)
    const rmColor = rmMeter > 0.6 ? '#2ecc71' : rmMeter > 0.3 ? '#f39c12' : '#e74c3c';
    cx.strokeStyle = rmColor;
    cx.shadowColor = rmColor;
    cx.shadowBlur = 10;
    cx.lineWidth = 8;
    cx.beginPath();
    cx.arc(rmX, rmY, rmR, rmStart, rmStart + (rmEnd - rmStart) * rmMeter);
    cx.stroke();
    cx.shadowBlur = 0;

    // Rock meter label
    cx.fillStyle = '#fff';
    cx.font = 'bold 9px sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('ROCK', rmX, rmY - 6);
    cx.fillText('METER', rmX, rmY + 6);

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
```

- [ ] **Step 2: Remove the old rock meter from the React HUD overlay**

In the playing screen render, find `styles.hudRight` div and update it to remove the rock meter (now drawn on canvas). Replace the existing `hudLeft` and `hudRight` divs with:

```jsx
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
```

- [ ] **Step 3: Add accuracy popup in the playing screen render**

After the `{hud.popup && ...}` block, add:

```jsx
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
```

- [ ] **Step 4: Build and verify**

```bash
cd guitar-hero && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add guitar-hero/src/GuitarHero.jsx
git commit -m "feat: full visual redesign - Guitar Hero highway, rounded notes, circular targets, rock meter on canvas"
```

---

## Task 4: New backing track system with melody in `songs.js`

**Files:**
- Modify: `guitar-hero/src/songs.js`
- Modify: `guitar-hero/src/GuitarHero.jsx` (replace `startBacking` / `stopBacking`)

- [ ] **Step 1: Replace `startBacking` and `stopBacking` in `GuitarHero.jsx`**

Find `let bgNodes = [];` and everything through the closing `}` of `stopBacking`. Replace the entire block (from `let bgNodes = [];` to the end of `stopBacking`) with:

```js
let bgNodes = [];

function scheduleDrums(ctx, startTime, bpm, totalSeconds) {
  const beat = 60 / bpm;
  const steps = Math.ceil(totalSeconds / (beat * 0.5));
  for (let i = 0; i < steps; i++) {
    const t = startTime + i * beat * 0.5;
    // Kick on beat 1 & 3
    if (i % 4 === 0 || i % 4 === 2) {
      const k = ctx.createOscillator();
      const kg = ctx.createGain();
      k.frequency.setValueAtTime(110, t);
      k.frequency.exponentialRampToValueAtTime(38, t + 0.1);
      kg.gain.setValueAtTime(0.18, t);
      kg.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      k.connect(kg).connect(ctx.destination);
      k.start(t); k.stop(t + 0.15);
      bgNodes.push(k);
    }
    // Snare on beat 2 & 4
    if (i % 4 === 1 || i % 4 === 3) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / data.length, 2);
      const src = ctx.createBufferSource();
      const sg = ctx.createGain();
      src.buffer = buf;
      sg.gain.setValueAtTime(0.12, t);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      src.connect(sg).connect(ctx.destination);
      src.start(t);
      bgNodes.push(src);
    }
    // Hi-hat on every 8th note
    {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / data.length, 3);
      const src = ctx.createBufferSource();
      const hf = ctx.createBiquadFilter();
      const hg = ctx.createGain();
      hf.type = 'highpass';
      hf.frequency.value = 8000;
      src.buffer = buf;
      hg.gain.setValueAtTime(0.055, t);
      hg.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      src.connect(hf).connect(hg).connect(ctx.destination);
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

function scheduleMelody(ctx, startTime, melodyLine, repeatEvery, totalSeconds) {
  const repeats = Math.ceil(totalSeconds / repeatEvery) + 1;
  for (let rep = 0; rep < repeats; rep++) {
    melodyLine.forEach(({ t: mt, freq, dur, type = 'sawtooth' }) => {
      const t = startTime + rep * repeatEvery + mt;
      if (t > startTime + totalSeconds + 2) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 3200;
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.015);
      gain.gain.setValueAtTime(0.07, t + dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(filt).connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + dur + 0.01);
      bgNodes.push(osc);
    });
  }
}

function startBacking(song) {
  const ctx = getAudio();
  if (!ctx) return;
  stopBacking();
  const t0 = ctx.currentTime + 0.05;
  const total = 130; // schedule 130s
  scheduleDrums(ctx, t0, song.bpm, total);
  if (song.bassLine) scheduleBass(ctx, t0, song.bassLine, song.bassRepeat, total);
  if (song.melodyLine) scheduleMelody(ctx, t0, song.melodyLine, song.melodyRepeat, total);
}

function stopBacking() {
  bgNodes.forEach((n) => { try { n.stop(); } catch (e) {} });
  bgNodes = [];
}
```

- [ ] **Step 2: Build and verify**

```bash
cd guitar-hero && npx vite build
```

- [ ] **Step 3: Commit**

```bash
git add guitar-hero/src/GuitarHero.jsx
git commit -m "feat: new backing track system with separate drums, bass, and melody scheduling"
```

---

## Task 5: Extend songs 1–3 and add melody/bass data

**Files:**
- Modify: `guitar-hero/src/songs.js`

- [ ] **Step 1: Replace entire `songs.js` with extended versions of songs 1–3 plus new songs 4–5**

Replace the full file content of `guitar-hero/src/songs.js` with:

```js
// ===== CHART BUILDER =====
function buildChart(pattern) {
  return pattern.map((p) => {
    const notes = [];
    let str = p.n;
    let sustain = 0;
    if (str.endsWith('++')) { sustain = 1.0; str = str.slice(0, -2); }
    else if (str.endsWith('+')) { sustain = 0.5; str = str.slice(0, -1); }
    for (const c of str) {
      const lane = parseInt(c, 10);
      if (!isNaN(lane)) notes.push({ time: p.t, lane, duration: sustain });
    }
    return notes;
  }).flat();
}

// ===== SONG 1: Crazy Train style (138 BPM, A minor) =====
// Melody: A minor pentatonic runs, fast 16th note phrases
// Chart aligns with melody beats
const S1_MELODY_REPEAT = 8 * (60 / 138); // 8 beats ≈ 3.478s
const S1_MELODY = (() => {
  const b = 60 / 138;
  return [
    { t: 0,        freq: 220, dur: 0.16 }, // A3
    { t: b * 0.5,  freq: 262, dur: 0.16 }, // C4
    { t: b * 1,    freq: 330, dur: 0.18 }, // E4
    { t: b * 1.5,  freq: 392, dur: 0.18 }, // G4
    { t: b * 2,    freq: 440, dur: 0.30 }, // A4 (accent)
    { t: b * 2.75, freq: 392, dur: 0.16 }, // G4
    { t: b * 3,    freq: 330, dur: 0.16 }, // E4
    { t: b * 3.5,  freq: 294, dur: 0.16 }, // D4
    { t: b * 4,    freq: 262, dur: 0.45 }, // C4 (hold)
    { t: b * 5,    freq: 294, dur: 0.16 }, // D4
    { t: b * 5.5,  freq: 330, dur: 0.16 }, // E4
    { t: b * 6,    freq: 392, dur: 0.16 }, // G4
    { t: b * 6.5,  freq: 440, dur: 0.16 }, // A4
    { t: b * 7,    freq: 392, dur: 0.16 }, // G4
    { t: b * 7.5,  freq: 330, dur: 0.20 }, // E4
  ];
})();

const S1_BASS_REPEAT = 4 * (60 / 138);
const S1_BASS = (() => {
  const b = 60 / 138;
  return [
    { t: 0,       freq: 110, dur: b * 0.9 }, // A2
    { t: b * 2,   freq: 110, dur: b * 0.9 },
    { t: b * 3,   freq: 131, dur: b * 0.9 }, // C3
  ];
})();

function makeSong1(diff) {
  const b = 60 / 138;
  const mr = S1_MELODY_REPEAT;
  // Lane map: A3=0(green), C4=1(red), E4=2(yellow), G4=3(blue), A4=4(orange)
  const melodyLanes = [0, 1, 2, 3, 4, 3, 2, 1, 1, 1, 2, 3, 4, 3, 2];
  const melodyTimes = S1_MELODY.map(m => m.t);

  if (diff === 'easy') {
    const pat = [];
    const totalBars = 24; // ~83s
    for (let rep = 0; rep < totalBars; rep++) {
      // Easy: only the strong beats (every 2 melody notes)
      [0, 2, 4, 8, 10, 12].forEach(idx => {
        pat.push({ t: 2 + rep * mr + melodyTimes[idx], n: String(melodyLanes[idx]) });
      });
    }
    return buildChart(pat);
  }

  if (diff === 'medium') {
    const pat = [];
    const totalBars = 24;
    for (let rep = 0; rep < totalBars; rep++) {
      melodyTimes.forEach((mt, idx) => {
        // Medium: all melody notes, with sustain on the long ones
        const isSustain = idx === 4 || idx === 8;
        pat.push({ t: 2 + rep * mr + mt, n: String(melodyLanes[idx]) + (isSustain ? '+' : '') });
      });
    }
    return buildChart(pat);
  }

  // Expert: all melody notes + 16th note fills between beats
  const pat = [];
  const totalBars = 24;
  for (let rep = 0; rep < totalBars; rep++) {
    melodyTimes.forEach((mt, idx) => {
      const isSustain = idx === 4 || idx === 8;
      pat.push({ t: 2 + rep * mr + mt, n: String(melodyLanes[idx]) + (isSustain ? '+' : '') });
    });
    // Add 16th note run on beat 5-6 (expert fill)
    for (let f = 0; f < 4; f++) {
      pat.push({ t: 2 + rep * mr + b * (5 + f * 0.25), n: String(f % 5) });
    }
    // Chord on the accent
    pat.push({ t: 2 + rep * mr + b * 2.5, n: '24' });
  }
  return buildChart(pat);
}

// ===== SONG 2: Smoke on the Water (112 BPM, G minor) =====
// Melody: the iconic riff G-Bb-C / G-Bb-Db-C
const S2_MELODY_REPEAT = 8 * (60 / 112); // 8 beats ≈ 4.286s
const S2_MELODY = (() => {
  const b = 60 / 112;
  return [
    { t: 0,         freq: 98,  dur: 0.22 }, // G2
    { t: b * 1,     freq: 117, dur: 0.22 }, // Bb2
    { t: b * 1.5,   freq: 131, dur: 0.40 }, // C3 (hold)
    { t: b * 3,     freq: 98,  dur: 0.22 }, // G2
    { t: b * 4,     freq: 117, dur: 0.22 }, // Bb2
    { t: b * 4.5,   freq: 139, dur: 0.22 }, // Db3
    { t: b * 5,     freq: 131, dur: 0.55 }, // C3 (long hold)
    { t: b * 6.5,   freq: 98,  dur: 0.22 }, // G2
    { t: b * 7,     freq: 117, dur: 0.22 }, // Bb2
    { t: b * 7.5,   freq: 131, dur: 0.22 }, // C3
  ];
})();

const S2_BASS_REPEAT = 4 * (60 / 112);
const S2_BASS = (() => {
  const b = 60 / 112;
  return [
    { t: 0,      freq: 49, dur: b * 1.8 }, // G1
    { t: b * 2,  freq: 49, dur: b * 1.8 },
  ];
})();

function makeSong2(diff) {
  const mr = S2_MELODY_REPEAT;
  // Lane map: G2=0, Bb2=1, C3=2, Db3=3
  const melodyLanes = [0, 1, 2, 0, 1, 3, 2, 0, 1, 2];
  const melodyTimes = S2_MELODY.map(m => m.t);
  const sustainIdx = new Set([2, 6]);

  if (diff === 'easy') {
    const pat = [];
    for (let rep = 0; rep < 20; rep++) {
      [0, 1, 2, 3, 4, 6].forEach(idx => {
        pat.push({ t: 2 + rep * mr + melodyTimes[idx], n: String(melodyLanes[idx]) + (sustainIdx.has(idx) ? '+' : '') });
      });
    }
    return buildChart(pat);
  }

  if (diff === 'medium') {
    const pat = [];
    for (let rep = 0; rep < 20; rep++) {
      melodyTimes.forEach((mt, idx) => {
        pat.push({ t: 2 + rep * mr + mt, n: String(melodyLanes[idx]) + (sustainIdx.has(idx) ? '++' : '') });
      });
    }
    return buildChart(pat);
  }

  // Expert: full riff + chords on the C notes
  const pat = [];
  const b = 60 / 112;
  for (let rep = 0; rep < 20; rep++) {
    melodyTimes.forEach((mt, idx) => {
      const isChord = idx === 2 || idx === 6; // C3 notes become chords
      const n = isChord ? '02++' : String(melodyLanes[idx]);
      pat.push({ t: 2 + rep * mr + mt, n });
    });
    // Extra 16th fills on the power groove
    [b * 0.5, b * 2.5, b * 5.5, b * 7.25].forEach(bt => {
      pat.push({ t: 2 + rep * mr + bt, n: '1' });
    });
  }
  return buildChart(pat);
}

// ===== SONG 3: Through the Flames (180 BPM, E minor) =====
// Very fast power metal - gallop rhythm + melody runs
const S3_MELODY_REPEAT = 8 * (60 / 180); // 8 beats ≈ 2.667s
const S3_MELODY = (() => {
  const b = 60 / 180;
  return [
    { t: 0,          freq: 330, dur: 0.12 }, // E4
    { t: b * 0.333,  freq: 392, dur: 0.12 }, // G4
    { t: b * 0.667,  freq: 440, dur: 0.12 }, // A4
    { t: b * 1,      freq: 494, dur: 0.18 }, // B4
    { t: b * 1.5,    freq: 587, dur: 0.22 }, // D5
    { t: b * 2,      freq: 659, dur: 0.35 }, // E5 (accent)
    { t: b * 3,      freq: 587, dur: 0.12 }, // D5
    { t: b * 3.333,  freq: 523, dur: 0.12 }, // C5
    { t: b * 3.667,  freq: 494, dur: 0.12 }, // B4
    { t: b * 4,      freq: 440, dur: 0.50 }, // A4 (long)
    { t: b * 5.5,    freq: 392, dur: 0.12 }, // G4
    { t: b * 5.833,  freq: 440, dur: 0.12 }, // A4
    { t: b * 6.167,  freq: 494, dur: 0.12 }, // B4
    { t: b * 6.5,    freq: 523, dur: 0.12 }, // C5
    { t: b * 7,      freq: '24', dur: 0.30 }, // chord hit
    { t: b * 7.5,    freq: 330, dur: 0.15 }, // E4
  ];
})();

const S3_BASS_REPEAT = 2 * (60 / 180);
const S3_BASS = (() => {
  const b = 60 / 180;
  return [
    { t: 0,         freq: 82, dur: b * 0.4 },  // E2
    { t: b * 0.333, freq: 82, dur: b * 0.3 },
    { t: b * 0.667, freq: 82, dur: b * 0.3 },
    { t: b * 1,     freq: 98, dur: b * 0.9 },  // G2
  ];
})();

function makeSong3(diff) {
  const b = 60 / 180;
  const mr = S3_MELODY_REPEAT;
  const melodyLanes = [0, 1, 2, 3, 4, 4, 4, 3, 3, 2, 1, 2, 3, 3, '24', 0];
  const melodyTimes = [
    0, b*0.333, b*0.667, b*1, b*1.5, b*2, b*3, b*3.333,
    b*3.667, b*4, b*5.5, b*5.833, b*6.167, b*6.5, b*7, b*7.5,
  ];
  const sustainIdx = new Set([5, 9]);

  if (diff === 'easy') {
    const pat = [];
    for (let rep = 0; rep < 30; rep++) {
      [0, 3, 5, 9, 10, 14].forEach(idx => {
        const lane = String(melodyLanes[idx]);
        pat.push({ t: 2 + rep * mr + melodyTimes[idx], n: lane + (sustainIdx.has(idx) ? '+' : '') });
      });
    }
    return buildChart(pat);
  }

  if (diff === 'medium') {
    const pat = [];
    for (let rep = 0; rep < 30; rep++) {
      melodyTimes.forEach((mt, idx) => {
        if (typeof melodyLanes[idx] !== 'string') {
          pat.push({ t: 2 + rep * mr + mt, n: String(melodyLanes[idx]) + (sustainIdx.has(idx) ? '+' : '') });
        }
      });
    }
    return buildChart(pat);
  }

  // Expert: gallop triplets everywhere
  const pat = [];
  for (let rep = 0; rep < 30; rep++) {
    melodyTimes.forEach((mt, idx) => {
      const lane = String(melodyLanes[idx]);
      pat.push({ t: 2 + rep * mr + mt, n: lane + (sustainIdx.has(idx) ? '++' : '') });
    });
    // Gallop fills (triplets on odd beats)
    for (let i = 0; i < 8; i++) {
      if (i % 2 !== 0) {
        [0, 0.2, 0.4].forEach(off => {
          pat.push({ t: 2 + rep * mr + b * i + off * b, n: String(i % 5) });
        });
      }
    }
  }
  return buildChart(pat);
}

// ===== SONG 4: Iron Storm (120 BPM, A minor - heavy metal) =====
// Heavy chord stabs + fast single note runs, palm-mute feel
const S4_MELODY_REPEAT = 8 * (60 / 120); // 8 beats = 4s
const S4_MELODY = (() => {
  const b = 60 / 120;
  return [
    { t: 0,        freq: 110, dur: 0.14, type: 'square' }, // A2 (heavy)
    { t: b * 0.5,  freq: 110, dur: 0.14, type: 'square' }, // A2
    { t: b * 1,    freq: 131, dur: 0.14, type: 'square' }, // C3
    { t: b * 1.5,  freq: 110, dur: 0.14, type: 'square' }, // A2
    { t: b * 2,    freq: 165, dur: 0.20, type: 'square' }, // E3
    { t: b * 2.5,  freq: 175, dur: 0.20, type: 'square' }, // F3
    { t: b * 3,    freq: 196, dur: 0.35, type: 'sawtooth' }, // G3 (melodic hit)
    { t: b * 4,    freq: 220, dur: 0.55, type: 'sawtooth' }, // A3 (long sustain)
    { t: b * 5.5,  freq: 196, dur: 0.14, type: 'square' }, // G3
    { t: b * 6,    freq: 165, dur: 0.14, type: 'square' }, // E3
    { t: b * 6.5,  freq: 131, dur: 0.14, type: 'square' }, // C3
    { t: b * 7,    freq: 110, dur: 0.14, type: 'square' }, // A2
    { t: b * 7.5,  freq: 110, dur: 0.14, type: 'square' }, // A2
  ];
})();

const S4_BASS_REPEAT = 4 * (60 / 120);
const S4_BASS = (() => {
  const b = 60 / 120;
  return [
    { t: 0,       freq: 55, dur: b * 0.8 },  // A1
    { t: b * 2,   freq: 55, dur: b * 0.8 },
    { t: b * 3,   freq: 65, dur: b * 0.8 },  // C2
  ];
})();

function makeSong4(diff) {
  const b = 60 / 120;
  const mr = S4_MELODY_REPEAT;
  // A2=0, C3=1, E3=2, F3=2, G3=3, A3=4
  const melodyLanes = [0, 0, 1, 0, 2, 2, 3, 4, 3, 2, 1, 0, 0];
  const melodyTimes = S4_MELODY.map(m => m.t);
  const sustainIdx = new Set([7]);    // A3 long hold
  const chordIdx = new Set([6, 7]);   // chord hits

  if (diff === 'easy') {
    const pat = [];
    for (let rep = 0; rep < 22; rep++) {
      [0, 2, 4, 6, 7, 9, 11].forEach(idx => {
        pat.push({ t: 2 + rep * mr + melodyTimes[idx], n: String(melodyLanes[idx]) + (sustainIdx.has(idx) ? '++' : '') });
      });
    }
    return buildChart(pat);
  }

  if (diff === 'medium') {
    const pat = [];
    for (let rep = 0; rep < 22; rep++) {
      melodyTimes.forEach((mt, idx) => {
        const chord = chordIdx.has(idx) && rep % 2 === 0;
        const n = chord ? '23' : String(melodyLanes[idx]);
        pat.push({ t: 2 + rep * mr + mt, n: n + (sustainIdx.has(idx) ? '++' : '') });
      });
    }
    return buildChart(pat);
  }

  // Expert: palm mute 16th runs + chord stabs + long sustains
  const pat = [];
  for (let rep = 0; rep < 22; rep++) {
    melodyTimes.forEach((mt, idx) => {
      const chord = chordIdx.has(idx);
      const n = chord ? '02' : String(melodyLanes[idx]);
      pat.push({ t: 2 + rep * mr + mt, n: n + (sustainIdx.has(idx) ? '++' : '') });
    });
    // Fast palm-mute run on beat 1 (16th notes)
    for (let f = 0; f < 4; f++) {
      pat.push({ t: 2 + rep * mr + b * 0.25 * f, n: String(f % 2) });
    }
    // Power chord hits on beats 3 and 7
    pat.push({ t: 2 + rep * mr + b * 3, n: '013' });
    pat.push({ t: 2 + rep * mr + b * 7, n: '024' });
  }
  return buildChart(pat);
}

// ===== SONG 5: Neon Drive (130 BPM, C major - synth rock) =====
// Bright arpeggios + melodic sustains, fun and flowing
const S5_MELODY_REPEAT = 8 * (60 / 130); // 8 beats ≈ 3.692s
const S5_MELODY = (() => {
  const b = 60 / 130;
  return [
    // Ascending arp
    { t: 0,         freq: 262, dur: 0.14, type: 'square' }, // C4
    { t: b * 0.25,  freq: 330, dur: 0.14, type: 'square' }, // E4
    { t: b * 0.5,   freq: 392, dur: 0.14, type: 'square' }, // G4
    { t: b * 0.75,  freq: 523, dur: 0.14, type: 'square' }, // C5
    // Melodic phrase
    { t: b * 1,     freq: 440, dur: 0.22, type: 'sawtooth' }, // A4
    { t: b * 1.5,   freq: 392, dur: 0.22, type: 'sawtooth' }, // G4
    { t: b * 2,     freq: 494, dur: 0.45, type: 'sawtooth' }, // B4 (hold)
    // Descending arp
    { t: b * 3,     freq: 392, dur: 0.14, type: 'square' }, // G4
    { t: b * 3.25,  freq: 330, dur: 0.14, type: 'square' }, // E4
    { t: b * 3.5,   freq: 294, dur: 0.14, type: 'square' }, // D4
    { t: b * 3.75,  freq: 262, dur: 0.14, type: 'square' }, // C4
    // Big chorus hit
    { t: b * 4,     freq: 523, dur: 0.70, type: 'sawtooth' }, // C5 (long)
    // Bridge run
    { t: b * 5.5,   freq: 440, dur: 0.14, type: 'square' }, // A4
    { t: b * 5.75,  freq: 494, dur: 0.14, type: 'square' }, // B4
    { t: b * 6,     freq: 523, dur: 0.14, type: 'square' }, // C5
    { t: b * 6.25,  freq: 587, dur: 0.14, type: 'square' }, // D5
    // Final phrase
    { t: b * 6.5,   freq: 523, dur: 0.22, type: 'sawtooth' }, // C5
    { t: b * 7,     freq: 440, dur: 0.22, type: 'sawtooth' }, // A4
    { t: b * 7.5,   freq: 392, dur: 0.25, type: 'sawtooth' }, // G4
  ];
})();

const S5_BASS_REPEAT = 4 * (60 / 130);
const S5_BASS = (() => {
  const b = 60 / 130;
  return [
    { t: 0,      freq: 131, dur: b * 0.9 }, // C3
    { t: b * 2,  freq: 147, dur: b * 0.9 }, // D3
    { t: b * 3,  freq: 131, dur: b * 0.9 }, // C3
  ];
})();

function makeSong5(diff) {
  const b = 60 / 130;
  const mr = S5_MELODY_REPEAT;
  // C4=0, E4=1, G4=2, C5=3, A4=4, B4=3, D4=1, D5=4
  const melodyLanes = [0, 1, 2, 3, 4, 2, 3, 2, 1, 1, 0, 3, 4, 3, 3, 4, 3, 4, 2];
  const melodyTimes = S5_MELODY.map(m => m.t);
  const sustainIdx = new Set([6, 11]); // B4 and C5 long holds
  const chordIdx = new Set([11]);      // big chorus chord

  if (diff === 'easy') {
    const pat = [];
    for (let rep = 0; rep < 22; rep++) {
      [0, 2, 4, 5, 6, 11, 16, 18].forEach(idx => {
        pat.push({ t: 2 + rep * mr + melodyTimes[idx], n: String(melodyLanes[idx]) + (sustainIdx.has(idx) ? '++' : '') });
      });
    }
    return buildChart(pat);
  }

  if (diff === 'medium') {
    const pat = [];
    for (let rep = 0; rep < 22; rep++) {
      melodyTimes.forEach((mt, idx) => {
        const n = chordIdx.has(idx) ? '02' : String(melodyLanes[idx]);
        pat.push({ t: 2 + rep * mr + mt, n: n + (sustainIdx.has(idx) ? '++' : '') });
      });
    }
    return buildChart(pat);
  }

  // Expert: full arps + chords + fast bridge runs
  const pat = [];
  for (let rep = 0; rep < 22; rep++) {
    melodyTimes.forEach((mt, idx) => {
      const n = chordIdx.has(idx) ? '024' : String(melodyLanes[idx]);
      pat.push({ t: 2 + rep * mr + mt, n: n + (sustainIdx.has(idx) ? '++' : '') });
    });
    // Extra arp notes on the arp sections (beat 0 and beat 3)
    [b * 1.25, b * 1.75, b * 3.25, b * 3.5, b * 3.75].forEach((bt, fi) => {
      pat.push({ t: 2 + rep * mr + bt, n: String((fi + 2) % 5) });
    });
  }
  return buildChart(pat);
}

// ===== SONG LIST =====
export const SONGS = [
  {
    id: 's1',
    title: 'Crazy Train',
    artist: 'Classic Rock',
    bpm: 138,
    color: '#e74c3c',
    melodyLine: S1_MELODY,
    melodyRepeat: S1_MELODY_REPEAT,
    bassLine: S1_BASS,
    bassRepeat: S1_BASS_REPEAT,
    charts: { easy: makeSong1('easy'), medium: makeSong1('medium'), expert: makeSong1('expert') },
  },
  {
    id: 's2',
    title: 'Smoke on the Water',
    artist: 'Hard Rock',
    bpm: 112,
    color: '#3498db',
    melodyLine: S2_MELODY,
    melodyRepeat: S2_MELODY_REPEAT,
    bassLine: S2_BASS,
    bassRepeat: S2_BASS_REPEAT,
    charts: { easy: makeSong2('easy'), medium: makeSong2('medium'), expert: makeSong2('expert') },
  },
  {
    id: 's3',
    title: 'Through the Flames',
    artist: 'Power Metal',
    bpm: 180,
    color: '#f39c12',
    melodyLine: S3_MELODY.filter(n => typeof n.freq === 'number'),
    melodyRepeat: S3_MELODY_REPEAT,
    bassLine: S3_BASS,
    bassRepeat: S3_BASS_REPEAT,
    charts: { easy: makeSong3('easy'), medium: makeSong3('medium'), expert: makeSong3('expert') },
  },
  {
    id: 's4',
    title: 'Iron Storm',
    artist: 'Heavy Metal',
    bpm: 120,
    color: '#9b59b6',
    melodyLine: S4_MELODY,
    melodyRepeat: S4_MELODY_REPEAT,
    bassLine: S4_BASS,
    bassRepeat: S4_BASS_REPEAT,
    charts: { easy: makeSong4('easy'), medium: makeSong4('medium'), expert: makeSong4('expert') },
  },
  {
    id: 's5',
    title: 'Neon Drive',
    artist: 'Synth Rock',
    bpm: 130,
    color: '#1abc9c',
    melodyLine: S5_MELODY,
    melodyRepeat: S5_MELODY_REPEAT,
    bassLine: S5_BASS,
    bassRepeat: S5_BASS_REPEAT,
    charts: { easy: makeSong5('easy'), medium: makeSong5('medium'), expert: makeSong5('expert') },
  },
];
```

- [ ] **Step 2: Build and verify no errors**

```bash
cd guitar-hero && npx vite build
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 3: Commit**

```bash
git add guitar-hero/src/songs.js
git commit -m "feat: 5 songs with melody/bass data, extended charts 90s+, aligned note timing"
```

---

## Task 6: Final polish — menu song grid + hit window

**Files:**
- Modify: `guitar-hero/src/GuitarHero.jsx`

- [ ] **Step 1: Initialize `hud` with `rockMeter`, `accuracy` fields**

Find:
```js
  const [hud, setHud] = useState({
    score: 0, streak: 0, mult: 1, hit: 0, total: 0, popup: null,
  });
```

Replace with:
```js
  const [hud, setHud] = useState({
    score: 0, streak: 0, mult: 1, hit: 0, total: 0, popup: null,
    rockMeter: 0.5, accuracy: null,
  });
```

- [ ] **Step 2: Build and do final smoke test**

```bash
cd guitar-hero && npx vite build
```

Start dev server, play each song briefly, confirm:
- Notes fall and key presses register
- Rock meter visible on right side of canvas
- PERFECT/GOOD/OK pops up on hits
- Highway looks like Guitar Hero (colored lanes, scrolling frets)
- All 5 songs appear in menu

```bash
cd guitar-hero && npm run dev
```

- [ ] **Step 3: Final commit**

```bash
git add guitar-hero/src/GuitarHero.jsx
git commit -m "feat: complete Guitar Hero redesign - 5 songs, melody, rock meter, new visuals"
```
