# Guitar Hero React — Full Redesign Spec

## Overview

Complete overhaul of the Guitar Hero React game: visual redesign to match real Guitar Hero aesthetics, new music system with pre-composed backing tracks, 2 new songs (5 total), longer charts, and more forgiving timing.

---

## 1. Visual Design

### Highway (Fretboard)
- 5 colored lanes: green, red, yellow, blue, orange
- Deep perspective: very narrow at top, wide at bottom
- Glowing lane dividers (colored lines matching each lane)
- Dark background with radial spotlight effect (soft light cone from top center)
- Horizontal fret lines scroll downward at game speed to create motion feel
- Overall palette: dark navy/black background, neon lane colors

### Notes
- Shape: rounded rectangle (capsule) — not flat ellipses
- Sustain notes: tall capsule extending upward from the note head
- Each note glows in its lane color (shadowBlur)
- Highlight: white reflection stripe on top-left of note head
- Hit animation: note disappears instantly with ring-burst flash

### Hit Zone (Bottom)
- 5 large circular buttons, one per lane, with matching colors
- Each button has: outer ring (always visible), inner fill (lit when pressed)
- When pressed: button fills with lane color + strong glow pulse
- When idle: dark fill, subtle colored ring

### HUD
- **Top bar:** Song title (center), Difficulty badge (right of title)
- **Left panel:** Score (large), Multiplier ×1/×2/×3/×4 (color-coded), Streak count
- **Right panel:** Rock Meter — arc gauge, green→yellow→red, fills with hits
- **Center popups:** PERFECT / GOOD / OK / MISS / STREAK BROKEN — brief, animated

---

## 2. Music System

### Architecture
- Backing track plays continuously from round start, regardless of key presses
- Key press hit → small accent "pluck" sound
- Key press miss → short low "thud" sound
- All audio via WebAudio API (oscillators + gain envelopes, no audio files)

### Backing Track Layers (per song)
1. **Drums:** kick (low sine sweep) + snare (noise burst) + hi-hat (filtered noise)
2. **Bass:** triangle oscillator, melodic line following chord progression
3. **Lead melody:** sawtooth oscillator with filter, plays the main hook
4. **Rhythm:** short chord stabs on off-beats (square oscillator, low gain)

### Chart Alignment
- Note `time` values are placed on exact beat/melody positions
- Sustain notes (`duration > 0`) align with held melody notes
- Chord notes (2-3 simultaneous lanes) align with chord stabs

---

## 3. Songs

All songs have **easy / medium / expert** charts. Target gameplay length ~90–120 seconds.

| # | Title | Style | BPM | Character |
|---|-------|-------|-----|-----------|
| 1 | Crazy Train | Classic Rock | 138 | Fast, rhythmic, single notes |
| 2 | Smoke on the Water | Hard Rock | 112 | Iconic riff, heavy sustains |
| 3 | Through the Flames | Power Metal | 180 | Very fast, expert-focused |
| 4 | Iron Storm | Heavy Metal | 120 | Heavy chords, dramatic |
| 5 | Neon Drive | Synth Rock | 130 | Melodic, long sustains, fun |

### Chart Complexity Requirements
- **Easy:** Single notes only, one lane at a time, sparse (every 1–2 beats)
- **Medium:** Singles + occasional 2-note chords, some sustains, moderate density
- **Expert:** Full chords (3 notes), rapid single-note runs, long sustains, dense patterns

---

## 4. Timing & Gameplay

### Hit Window
- PERFECT: ±0.08s → score: 100 × multiplier
- GOOD: ±0.15s → score: 70 × multiplier
- OK: ±0.25s → score: 40 × multiplier
- Miss: outside ±0.25s window

### Multiplier
- Starts at ×1
- +1 multiplier every 10 consecutive hits (max ×4)
- Resets to ×1 on any miss

### Rock Meter
- Starts at 50%
- Hit: +3% (capped at 100%)
- Miss: −8%
- Reaches 0%: GAME OVER — song stops, show fail screen with option to retry

### Game Over Screen
- Distinct from normal end screen
- Shows "GAME OVER" in red
- Shows how far through the song the player got (%)
- Retry / Menu buttons

### End Screen (normal completion)
- Grade: S/A/B/C/D/F based on hit percentage
- Stats: score, notes hit/total, misses, max streak, final rock meter %

---

## 5. File Structure

All changes are in `guitar-hero/src/`:

- `GuitarHero.jsx` — main component, visual redesign, game logic updates
- `songs.js` — 2 new songs added, all charts lengthened, backing track functions updated
- `styles.css` — minimal changes (layout only, canvas handles visuals)

No new files needed. The canvas handles all game visuals.
