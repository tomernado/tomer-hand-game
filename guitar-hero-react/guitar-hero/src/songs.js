// ===== HELPERS =====
// sec(T, B, defs): create chart notes for a section
// defs: [beat, freq, lane, sustainBeats=0, minDiff=0][]
//   minDiff: 0=all difficulties, 1=medium+, 2=expert only
function sec(T, B, defs) {
  return defs.map(([beat, freq, lane, sus = 0, d = 0]) => ({
    time: Math.round((T + beat * B) * 1000) / 1000,
    lane,
    duration: sus > 0 ? Math.round(sus * B * 1000) / 1000 : 0,
    freq,
    _d: d,
  }));
}

function applyDiff(notes, level) {
  const thresh = level === 'easy' ? 0 : level === 'medium' ? 1 : 2;
  return notes
    .filter(n => (n._d || 0) <= thresh)
    .map(({ _d, ...n }) => n)
    .sort((a, b) => a.time - b.time);
}

// Build full background melody from chart notes (de-duped by time)
function chartToMelody(notes) {
  const seen = new Set();
  return notes
    .filter(n => { const k = n.time.toFixed(2); const ok = !seen.has(k); seen.add(k); return ok; })
    .sort((a, b) => a.time - b.time)
    .map(n => ({ t: n.time, freq: n.freq, dur: Math.max(0.14, n.duration || 0) }));
}

// =====================================================================
// SONG 1: CRAZY TRAIN (138 BPM, A minor pentatonic)
// Lanes: 0=A3(220) 1=C4(262) 2=E4(330) 3=G4(392) 4=A4(440)
// =====================================================================
const B1 = 60 / 138;

const s1_intro = T => sec(T, B1, [
  [0, 220, 0], [2, 220, 0], [4, 262, 1], [6, 330, 2],
  [3, 392, 3, 0, 1], [5, 392, 3, 0, 1], [7, 440, 4, 0, 1],
  [1, 220, 0, 0, 2], [3.5, 262, 1, 0, 2], [5.5, 330, 2, 0, 2],
]);

const s1_verse = T => sec(T, B1, [
  [0, 220, 0],         [0.5, 262, 1, 0, 1], [1, 330, 2, 0.1],
  [1.5, 392, 3, 0, 1], [2, 440, 4, 0.8],    [2.75, 392, 3, 0, 1],
  [3, 330, 2],         [3.5, 262, 1, 0, 1], [4, 220, 0, 0.8],
  [5, 262, 1],         [5.5, 330, 2, 0, 1], [6, 392, 3, 0.2],
  [6.5, 440, 4],       [7, 392, 3, 0, 1],   [7.5, 330, 2, 0.2],
  // expert 16th fills
  [0.25, 220, 0, 0, 2], [2.5, 440, 4, 0, 2], [4.5, 262, 1, 0, 2], [5.75, 330, 2, 0, 2],
]);

const s1_verse_b = T => sec(T, B1, [
  // denser verse variant - same notes + offbeats
  [0, 220, 0],         [0.5, 262, 1],        [1, 330, 2],
  [1.5, 392, 3],       [2, 440, 4, 0.6],     [2.75, 392, 3],
  [3, 330, 2],         [3.5, 262, 1],        [4, 220, 0, 0.6],
  [4.5, 262, 1, 0, 1], [5, 330, 2],          [5.5, 392, 3],
  [6, 440, 4],         [6.5, 392, 3],        [7, 330, 2],
  [7.5, 262, 1],
  // expert
  [0.25, 220, 0, 0, 2], [1.25, 330, 2, 0, 2], [2.5, 440, 4, 0, 2],
  [4.25, 262, 1, 0, 2], [6.25, 440, 4, 0, 2],
]);

const s1_chorus = T => sec(T, B1, [
  [0, 440, 4, 0.2],    [0.5, 392, 3, 0, 1],  [1, 330, 2],
  [1.5, 392, 3, 0.6],  [2.25, 440, 4, 0, 1], [2.5, 392, 3],
  [3, 330, 2, 0.8],    [4, 262, 1],           [4.5, 330, 2, 0, 1],
  [5, 392, 3],         [5.5, 440, 4, 0.2],    [6, 392, 3, 0, 1],
  [6.5, 330, 2],       [7, 262, 1],           [7.5, 220, 0, 0.3],
  // expert
  [0.25, 440, 4, 0, 2], [3.5, 220, 0, 0, 2], [5.75, 440, 4, 0, 2],
]);

const s1_chorus_b = T => sec(T, B1, [
  // heavier chorus with chords
  [0, 440, 4, 0.3],    [0.25, 392, 3, 0, 2], [0.5, 392, 3, 0, 1],
  [1, 330, 2],         [1.5, 392, 3, 0.5],   [2, 440, 4],
  [2.5, 392, 3],       [3, 330, 2, 0.7],     [3.5, 262, 1, 0, 1],
  [4, 220, 0],         [4.5, 330, 2],        [5, 440, 4],
  [5.5, 392, 3],       [6, 330, 2],          [6.5, 262, 1, 0, 1],
  [7, 220, 0, 0.5],    [7.5, 440, 4, 0, 1],
  // expert
  [0.75, 330, 2, 0, 2], [2.25, 440, 4, 0, 2], [5.25, 440, 4, 0, 2],
]);

const s1_bridge = T => sec(T, B1, [
  [0, 220, 0, 1.8],    [2, 220, 0, 0, 1],    [2.5, 262, 1, 0, 1],
  [3, 330, 2, 0.9],    [4, 220, 0, 1.8],     [6, 392, 3, 0.9],
  [7, 440, 4, 0.9],
  [5, 262, 1, 0, 1],   [5.5, 330, 2, 0, 2],
]);

const s1_run = T => sec(T, B1, [
  // 16th note run through scale - easy gets 8ths, expert gets full 16ths
  [0, 220, 0], [0.5, 262, 1], [1, 330, 2], [1.5, 392, 3],
  [2, 440, 4], [2.5, 392, 3], [3, 330, 2], [3.5, 262, 1],
  [4, 220, 0], [4.5, 262, 1], [5, 330, 2], [5.5, 392, 3],
  [6, 440, 4], [6.5, 392, 3], [7, 330, 2], [7.5, 262, 1],
  // expert 16ths (fill the gaps)
  [0.25, 262, 1, 0, 2], [0.75, 330, 2, 0, 2], [1.25, 392, 3, 0, 2],
  [1.75, 440, 4, 0, 2], [2.25, 392, 3, 0, 2], [2.75, 330, 2, 0, 2],
  [3.25, 262, 1, 0, 2], [3.75, 220, 0, 0, 2],
  [4.25, 262, 1, 0, 2], [4.75, 330, 2, 0, 2], [5.25, 392, 3, 0, 2],
  [5.75, 440, 4, 0, 2], [6.25, 392, 3, 0, 2], [6.75, 330, 2, 0, 2],
  [7.25, 262, 1, 0, 2],
]);

function makeSong1(level) {
  const BAR = B1 * 8;
  const T0 = 2;
  const arr = [
    // section, bar
    s1_intro(T0 + 0 * BAR), s1_intro(T0 + 1 * BAR),         // bars 0-1: intro
    s1_verse(T0 + 2 * BAR), s1_verse(T0 + 3 * BAR),         // bars 2-3: verse
    s1_verse(T0 + 4 * BAR), s1_verse_b(T0 + 5 * BAR),       // bars 4-5: verse (b)
    s1_chorus(T0 + 6 * BAR), s1_chorus(T0 + 7 * BAR),       // bars 6-7: chorus
    s1_chorus_b(T0 + 8 * BAR), s1_chorus_b(T0 + 9 * BAR),   // bars 8-9: chorus b
    s1_verse_b(T0 + 10 * BAR), s1_verse_b(T0 + 11 * BAR),   // bars 10-11: verse return
    s1_run(T0 + 12 * BAR), s1_run(T0 + 13 * BAR),           // bars 12-13: run/solo
    s1_bridge(T0 + 14 * BAR), s1_bridge(T0 + 15 * BAR),     // bars 14-15: bridge
    s1_verse(T0 + 16 * BAR), s1_verse_b(T0 + 17 * BAR),     // bars 16-17: verse
    s1_chorus_b(T0 + 18 * BAR), s1_chorus_b(T0 + 19 * BAR), // bars 18-19
    s1_chorus_b(T0 + 20 * BAR), s1_run(T0 + 21 * BAR),      // bars 20-21: final
    s1_chorus_b(T0 + 22 * BAR), s1_chorus_b(T0 + 23 * BAR), // bars 22-23: outro
  ];
  return applyDiff(arr.flat(), level);
}

const S1_BASS_REPEAT = B1 * 4;
const S1_BASS = [
  { t: 0, freq: 110, dur: B1 * 0.9 },
  { t: B1 * 2, freq: 110, dur: B1 * 0.9 },
  { t: B1 * 3, freq: 131, dur: B1 * 0.9 },
];

// =====================================================================
// SONG 2: SMOKE ON THE WATER (112 BPM, G minor)
// Lanes: 0=G3(196) 1=Bb3(233) 2=D4(294) 3=F4(349) 4=G4(392)
// =====================================================================
const B2 = 60 / 112;

const s2_riff_a = T => sec(T, B2, [
  // The iconic 3-note ascending pattern
  [0, 196, 0],         [1, 233, 1],         [1.5, 294, 2, 0.3],
  [3, 196, 0],         [4, 233, 1],         [4.5, 349, 3, 0, 1],
  [5, 294, 2, 0.5],    [6.5, 196, 0],       [7, 233, 1],
  [7.5, 294, 2, 0.25],
  // medium adds
  [0.5, 196, 0, 0, 1], [3.5, 196, 0, 0, 1],
  // expert chords
  [1.5, 196, 0, 0.3, 2], [4.5, 196, 0, 0, 2], [5, 196, 0, 0.5, 2],
]);

const s2_riff_b = T => sec(T, B2, [
  // Higher variation with F4 and G4 added
  [0, 196, 0],         [1, 294, 2],         [2, 392, 4, 0.5],
  [3, 349, 3],         [3.5, 294, 2],       [4, 233, 1],
  [4.5, 196, 0, 0.4],  [5.5, 294, 2],       [6, 392, 4, 0.4],
  [7, 349, 3],         [7.5, 294, 2, 0.3],
  // medium
  [0.5, 233, 1, 0, 1], [2.5, 392, 4, 0, 1], [5, 233, 1, 0, 1],
  // expert
  [1, 196, 0, 0, 2], [3.25, 233, 1, 0, 2], [6.5, 294, 2, 0, 2],
]);

const s2_chorus = T => sec(T, B2, [
  // Big, dramatic: open G, held, riff reprise
  [0, 196, 0, 1.8],    [2, 392, 4, 0.4],    [2.5, 349, 3, 0, 1],
  [3, 294, 2, 0.4],    [4, 196, 0, 1.8],    [6, 294, 2, 0.4],
  [6.5, 392, 4, 0, 1], [7, 349, 3, 0.4],
  // medium
  [1, 233, 1, 0, 1],   [5, 233, 1, 0, 1],
  // expert
  [0, 392, 4, 1.8, 2], [4, 392, 4, 1.8, 2], [6.25, 294, 2, 0, 2],
]);

const s2_fill = T => sec(T, B2, [
  // Connecting fills between main riff sections
  [0, 233, 1],         [0.5, 294, 2],       [1, 349, 3],
  [1.5, 392, 4, 0.3],  [2.5, 349, 3],       [3, 294, 2],
  [3.5, 233, 1],       [4, 196, 0, 0.4],    [5, 294, 2],
  [5.5, 349, 3, 0, 1], [6, 392, 4],         [7, 294, 2],
  [7.5, 196, 0, 0.3],
  // expert
  [0.25, 196, 0, 0, 2], [2, 392, 4, 0, 2], [4.5, 233, 1, 0, 2],
]);

function makeSong2(level) {
  const BAR = B2 * 8;
  const T0 = 2;
  const arr = [
    s2_riff_a(T0 + 0 * BAR), s2_riff_a(T0 + 1 * BAR),   // intro riff
    s2_riff_a(T0 + 2 * BAR), s2_riff_b(T0 + 3 * BAR),   // riff A + B
    s2_fill(T0 + 4 * BAR),   s2_riff_a(T0 + 5 * BAR),   // fill + riff
    s2_riff_b(T0 + 6 * BAR), s2_chorus(T0 + 7 * BAR),   // riff B + chorus
    s2_chorus(T0 + 8 * BAR), s2_riff_a(T0 + 9 * BAR),   // chorus + return
    s2_riff_a(T0 + 10 * BAR), s2_fill(T0 + 11 * BAR),   // verse return
    s2_riff_b(T0 + 12 * BAR), s2_riff_b(T0 + 13 * BAR), // chorus build
    s2_chorus(T0 + 14 * BAR), s2_chorus(T0 + 15 * BAR), // big chorus
    s2_riff_a(T0 + 16 * BAR), s2_fill(T0 + 17 * BAR),   // verse
    s2_riff_b(T0 + 18 * BAR), s2_chorus(T0 + 19 * BAR), // finale
  ];
  return applyDiff(arr.flat(), level);
}

const S2_BASS_REPEAT = B2 * 4;
const S2_BASS = [
  { t: 0, freq: 98, dur: B2 * 1.8 },
  { t: B2 * 2, freq: 98, dur: B2 * 1.8 },
];

// =====================================================================
// SONG 3: THROUGH THE FLAMES (180 BPM, E minor)
// Lanes: 0=E3(165) 1=G3(196) 2=A3(220) 3=B3(247) 4=E4(330)
// =====================================================================
const B3 = 60 / 180;

const s3_triplet = T => sec(T, B3, [
  // Galloping 8th note triplets up the scale
  [0, 165, 0], [0.33, 196, 1], [0.67, 220, 2],
  [1, 247, 3], [1.33, 330, 4], [1.67, 247, 3],
  [2, 220, 2], [2.33, 196, 1], [2.67, 165, 0],
  [3, 165, 0], [3.33, 220, 2], [3.67, 330, 4],
  [4, 247, 3, 0.4],
  [5, 165, 0], [5.33, 196, 1], [5.67, 220, 2],
  [6, 330, 4], [6.33, 247, 3], [6.67, 220, 2],
  [7, 196, 1], [7.5, 165, 0, 0.3],
  // expert only: full triplet every beat
  [0.17, 165, 0, 0, 2], [1.17, 247, 3, 0, 2], [2.17, 165, 0, 0, 2],
  [5.17, 165, 0, 0, 2], [6.17, 330, 4, 0, 2],
]);

const s3_run = T => sec(T, B3, [
  // Descending run then back up
  [0, 330, 4],   [0.5, 247, 3],  [1, 220, 2],   [1.5, 196, 1],
  [2, 165, 0, 0.4],
  [3, 196, 1],   [3.5, 220, 2],  [4, 247, 3],   [4.5, 330, 4, 0.3],
  [5.5, 247, 3], [6, 220, 2],    [6.5, 196, 1], [7, 165, 0],
  [7.5, 247, 3, 0, 1],
  // medium+ adds
  [0.25, 330, 4, 0, 1], [2.5, 165, 0, 0, 1], [5, 330, 4, 0, 1],
  // expert
  [0.75, 247, 3, 0, 2], [1.25, 196, 1, 0, 2], [3.25, 220, 2, 0, 2],
  [4.25, 330, 4, 0, 2], [6.25, 165, 0, 0, 2],
]);

const s3_breakdown = T => sec(T, B3, [
  // Slow and heavy, quarter note groove
  [0, 165, 0, 0.7],    [2, 196, 1, 0.7],    [4, 220, 2, 0.7],
  [6, 165, 0, 0.7],
  // medium adds
  [1, 165, 0, 0, 1],   [3, 220, 2, 0, 1],   [5, 247, 3, 0, 1],
  [7, 330, 4, 0.5, 1],
  // expert chords
  [0, 330, 4, 0.7, 2], [2, 247, 3, 0, 2],   [4, 330, 4, 0.3, 2],
]);

const s3_shred = T => sec(T, B3, [
  // Very fast: alternating E3-E4 then scale run
  [0, 165, 0], [0.5, 330, 4], [1, 165, 0], [1.5, 330, 4],
  [2, 165, 0], [2.5, 330, 4], [3, 220, 2], [3.5, 247, 3],
  [4, 330, 4, 0.5],
  [5, 330, 4], [5.5, 247, 3], [6, 220, 2], [6.5, 196, 1],
  [7, 165, 0, 0.4],
  // expert 16ths
  [0.25, 165, 0, 0, 2], [0.75, 330, 4, 0, 2], [1.25, 165, 0, 0, 2],
  [1.75, 330, 4, 0, 2], [2.25, 165, 0, 0, 2], [2.75, 330, 4, 0, 2],
  [3.25, 220, 2, 0, 2], [3.75, 247, 3, 0, 2],
  [5.25, 247, 3, 0, 2], [5.75, 220, 2, 0, 2],
]);

function makeSong3(level) {
  const BAR = B3 * 8;
  const T0 = 2;
  const arr = [
    s3_breakdown(T0 + 0 * BAR), s3_breakdown(T0 + 1 * BAR), // intro: slow
    s3_triplet(T0 + 2 * BAR),   s3_triplet(T0 + 3 * BAR),   // triplet attack
    s3_run(T0 + 4 * BAR),       s3_run(T0 + 5 * BAR),       // descending run
    s3_triplet(T0 + 6 * BAR),   s3_shred(T0 + 7 * BAR),     // triplet + shred
    s3_breakdown(T0 + 8 * BAR), s3_breakdown(T0 + 9 * BAR), // breakdown
    s3_run(T0 + 10 * BAR),      s3_triplet(T0 + 11 * BAR),  // build
    s3_shred(T0 + 12 * BAR),    s3_shred(T0 + 13 * BAR),    // double shred
    s3_triplet(T0 + 14 * BAR),  s3_run(T0 + 15 * BAR),
    s3_shred(T0 + 16 * BAR),    s3_triplet(T0 + 17 * BAR),
    s3_shred(T0 + 18 * BAR),    s3_shred(T0 + 19 * BAR),    // finale blast
    s3_run(T0 + 20 * BAR),      s3_breakdown(T0 + 21 * BAR),
    s3_triplet(T0 + 22 * BAR),  s3_triplet(T0 + 23 * BAR),
    s3_run(T0 + 24 * BAR),      s3_shred(T0 + 25 * BAR),
    s3_triplet(T0 + 26 * BAR),  s3_shred(T0 + 27 * BAR),
    s3_shred(T0 + 28 * BAR),    s3_breakdown(T0 + 29 * BAR),
  ];
  return applyDiff(arr.flat(), level);
}

const S3_BASS_REPEAT = B3 * 2;
const S3_BASS = [
  { t: 0, freq: 82, dur: B3 * 0.4 },
  { t: B3 * 0.5, freq: 82, dur: B3 * 0.4 },
  { t: B3 * 1, freq: 98, dur: B3 * 0.8 },
];

// =====================================================================
// SONG 4: IRON STORM (120 BPM, A minor heavy metal)
// Lanes: 0=A2(110) 1=C3(131) 2=E3(165) 3=G3(196) 4=A3(220)
// =====================================================================
const B4 = 60 / 120;

const s4_chug = T => sec(T, B4, [
  // Palm-muted single notes, heavy rhythm
  [0, 110, 0], [0.5, 110, 0], [1, 131, 1], [1.5, 110, 0],
  [2, 165, 2, 0.4], [3, 196, 3, 0, 1], [3.5, 165, 2],
  [4, 110, 0], [4.5, 110, 0], [5, 131, 1], [5.5, 110, 0],
  [6, 220, 4, 0.5], [7, 196, 3, 0, 1], [7.5, 165, 2],
  // medium
  [1, 110, 0, 0, 1], [5, 110, 0, 0, 1],
  // expert: 16th note chug bursts
  [0.25, 110, 0, 0, 2], [0.75, 110, 0, 0, 2],
  [4.25, 110, 0, 0, 2], [4.75, 110, 0, 0, 2],
]);

const s4_riff = T => sec(T, B4, [
  // Main melodic riff, heavier feel
  [0, 110, 0, 0.2],   [0.5, 131, 1],      [1, 165, 2],
  [1.5, 196, 3, 0, 1],[2, 220, 4, 0.6],   [3, 196, 3],
  [3.5, 165, 2],      [4, 131, 1, 0.4],   [5, 110, 0],
  [5.5, 131, 1, 0, 1],[6, 165, 2],        [6.5, 220, 4, 0, 1],
  [7, 196, 3, 0.4],
  // medium
  [0.75, 110, 0, 0, 1], [4.5, 131, 1, 0, 1],
  // expert chords
  [2, 110, 0, 0.6, 2], [4, 110, 0, 0.4, 2],
]);

const s4_power = T => sec(T, B4, [
  // Power chords section - big, dramatic
  [0, 110, 0, 1.8],    [2, 165, 2, 1.8],
  [4, 196, 3, 1.8],    [6, 220, 4, 1.8],
  // medium variations
  [1, 131, 1, 0, 1],   [3, 131, 1, 0, 1],
  [5, 131, 1, 0, 1],   [7, 110, 0, 0.8, 1],
  // expert: chord stack
  [0, 220, 4, 1.8, 2], [2, 110, 0, 1.8, 2],
  [4, 110, 0, 1.8, 2], [6, 131, 1, 1.8, 2],
]);

const s4_solo = T => sec(T, B4, [
  // Fast single note solo run
  [0, 220, 4],   [0.5, 196, 3],  [1, 165, 2],   [1.5, 131, 1],
  [2, 110, 0, 0.5], [3, 131, 1], [3.5, 165, 2], [4, 196, 3],
  [4.5, 220, 4, 0.4], [5.5, 196, 3], [6, 165, 2], [6.5, 131, 1],
  [7, 110, 0, 0.4],
  // medium
  [0.25, 220, 4, 0, 1], [2.5, 131, 1, 0, 1],
  // expert  fills
  [0.75, 196, 3, 0, 2], [1.25, 165, 2, 0, 2], [3.25, 165, 2, 0, 2],
  [4.25, 220, 4, 0, 2], [5, 220, 4, 0, 2],    [5.75, 165, 2, 0, 2],
]);

function makeSong4(level) {
  const BAR = B4 * 8;
  const T0 = 2;
  const arr = [
    s4_chug(T0 + 0 * BAR),  s4_chug(T0 + 1 * BAR),   // intro chug
    s4_riff(T0 + 2 * BAR),  s4_riff(T0 + 3 * BAR),   // riff
    s4_chug(T0 + 4 * BAR),  s4_riff(T0 + 5 * BAR),   // chug + riff
    s4_power(T0 + 6 * BAR), s4_power(T0 + 7 * BAR),  // power chords
    s4_riff(T0 + 8 * BAR),  s4_chug(T0 + 9 * BAR),   // verse return
    s4_riff(T0 + 10 * BAR), s4_riff(T0 + 11 * BAR),  // double riff
    s4_solo(T0 + 12 * BAR), s4_solo(T0 + 13 * BAR),  // solo
    s4_power(T0 + 14 * BAR), s4_power(T0 + 15 * BAR), // breakdown
    s4_chug(T0 + 16 * BAR), s4_riff(T0 + 17 * BAR),  // build
    s4_power(T0 + 18 * BAR), s4_solo(T0 + 19 * BAR), // finale
    s4_riff(T0 + 20 * BAR), s4_power(T0 + 21 * BAR), // outro
  ];
  return applyDiff(arr.flat(), level);
}

const S4_BASS_REPEAT = B4 * 4;
const S4_BASS = [
  { t: 0, freq: 55, dur: B4 * 0.8 },
  { t: B4 * 2, freq: 55, dur: B4 * 0.8 },
  { t: B4 * 3, freq: 65, dur: B4 * 0.8 },
];

// =====================================================================
// SONG 5: NEON DRIVE (130 BPM, C major)
// Lanes: 0=C4(262) 1=E4(330) 2=G4(392) 3=A4(440) 4=C5(523)
// =====================================================================
const B5 = 60 / 130;

const s5_arp = T => sec(T, B5, [
  // Ascending arpeggio pattern C-E-G-A-C
  [0, 262, 0],   [0.25, 330, 1], [0.5, 392, 2], [0.75, 440, 3],
  [1, 523, 4, 0.4],
  [2, 440, 3],   [2.25, 392, 2, 0, 1], [2.5, 330, 1], [2.75, 262, 0],
  [3, 262, 0, 0.5],
  [4, 330, 1],   [4.25, 392, 2], [4.5, 440, 3], [4.75, 523, 4],
  [5, 523, 4, 0.4],
  [6, 440, 3],   [6.5, 392, 2, 0, 1],  [7, 330, 1],   [7.5, 262, 0, 0.3],
  // expert fills
  [1.5, 523, 4, 0, 2], [1.75, 440, 3, 0, 2], [3.5, 262, 0, 0, 2],
  [5.5, 523, 4, 0, 2], [5.75, 440, 3, 0, 2],
]);

const s5_melody = T => sec(T, B5, [
  // Synth lead melody
  [0, 523, 4, 0.3],    [0.5, 440, 3],       [1, 392, 2, 0, 1],
  [1.5, 440, 3, 0.5],  [2.5, 523, 4],       [3, 440, 3, 0, 1],
  [3.5, 392, 2],       [4, 330, 1, 0.6],    [5, 262, 0],
  [5.5, 330, 1, 0, 1], [6, 392, 2],         [6.5, 440, 3, 0, 1],
  [7, 523, 4, 0.6],
  // medium adds
  [0.25, 523, 4, 0, 1], [2, 523, 4, 0, 1],  [4.5, 262, 0, 0, 1],
  // expert
  [0.75, 440, 3, 0, 2], [1.25, 392, 2, 0, 2], [3.25, 392, 2, 0, 2],
  [5.25, 330, 1, 0, 2], [6.25, 440, 3, 0, 2],
]);

const s5_groove = T => sec(T, B5, [
  // Syncopated groove, offbeat feel
  [0, 262, 0],         [0.75, 392, 2, 0, 1], [1, 440, 3],
  [1.5, 523, 4, 0.3],  [2.25, 392, 2],       [2.5, 330, 1, 0, 1],
  [3, 262, 0, 0.4],    [3.75, 440, 3, 0, 1], [4, 523, 4],
  [4.5, 440, 3],       [5, 392, 2, 0, 1],    [5.5, 330, 1],
  [6, 262, 0, 0.4],    [6.75, 392, 2, 0, 1], [7, 440, 3],
  [7.5, 523, 4, 0.3],
  // expert
  [0.5, 330, 1, 0, 2], [2, 523, 4, 0, 2],   [4.25, 392, 2, 0, 2],
  [5.75, 262, 0, 0, 2], [7.25, 440, 3, 0, 2],
]);

const s5_climax = T => sec(T, B5, [
  // Big outro: arpeggio + melody together, dense
  [0, 262, 0],   [0.25, 330, 1], [0.5, 392, 2], [0.75, 440, 3],
  [1, 523, 4, 0.6],
  [2, 523, 4],   [2.5, 440, 3],  [3, 392, 2],   [3.5, 330, 1],
  [4, 262, 0, 0.6], [4.75, 330, 1], [5, 392, 2], [5.5, 440, 3],
  [6, 523, 4, 0.8],
  // medium
  [1.5, 440, 3, 0, 1], [2.25, 392, 2, 0, 1], [4.5, 262, 0, 0, 1],
  // expert
  [0.125, 330, 1, 0, 2], [0.375, 440, 3, 0, 2],
  [2.25, 523, 4, 0, 2],  [3.25, 330, 1, 0, 2],
  [5.25, 440, 3, 0, 2],  [5.75, 523, 4, 0, 2],
]);

function makeSong5(level) {
  const BAR = B5 * 8;
  const T0 = 2;
  const arr = [
    s5_arp(T0 + 0 * BAR),    s5_arp(T0 + 1 * BAR),     // intro: arpeggio
    s5_melody(T0 + 2 * BAR), s5_melody(T0 + 3 * BAR),  // melody
    s5_arp(T0 + 4 * BAR),    s5_groove(T0 + 5 * BAR),  // arp + groove
    s5_melody(T0 + 6 * BAR), s5_melody(T0 + 7 * BAR),  // melody return
    s5_groove(T0 + 8 * BAR), s5_groove(T0 + 9 * BAR),  // groove section
    s5_arp(T0 + 10 * BAR),   s5_melody(T0 + 11 * BAR), // bridge
    s5_climax(T0 + 12 * BAR), s5_climax(T0 + 13 * BAR), // climax
    s5_arp(T0 + 14 * BAR),   s5_groove(T0 + 15 * BAR), // build
    s5_melody(T0 + 16 * BAR), s5_climax(T0 + 17 * BAR), // melody + climax
    s5_climax(T0 + 18 * BAR), s5_arp(T0 + 19 * BAR),   // final push
    s5_climax(T0 + 20 * BAR), s5_melody(T0 + 21 * BAR), // outro
  ];
  return applyDiff(arr.flat(), level);
}

const S5_BASS_REPEAT = B5 * 4;
const S5_BASS = [
  { t: 0, freq: 131, dur: B5 * 0.9 },
  { t: B5 * 2, freq: 147, dur: B5 * 0.9 },
  { t: B5 * 3, freq: 131, dur: B5 * 0.9 },
];

// =====================================================================
// EXPORT
// =====================================================================
export const SONGS = [
  {
    id: 's1', title: 'Crazy Train', artist: 'Classic Rock', bpm: 138, color: '#e74c3c',
    fullMelody: chartToMelody(makeSong1('expert')),
    bassLine: S1_BASS, bassRepeat: S1_BASS_REPEAT,
    charts: { easy: makeSong1('easy'), medium: makeSong1('medium'), expert: makeSong1('expert') },
  },
  {
    id: 's2', title: 'Smoke on the Water', artist: 'Hard Rock', bpm: 112, color: '#3498db',
    fullMelody: chartToMelody(makeSong2('expert')),
    bassLine: S2_BASS, bassRepeat: S2_BASS_REPEAT,
    charts: { easy: makeSong2('easy'), medium: makeSong2('medium'), expert: makeSong2('expert') },
  },
  {
    id: 's3', title: 'Through the Flames', artist: 'Power Metal', bpm: 180, color: '#f39c12',
    fullMelody: chartToMelody(makeSong3('expert')),
    bassLine: S3_BASS, bassRepeat: S3_BASS_REPEAT,
    charts: { easy: makeSong3('easy'), medium: makeSong3('medium'), expert: makeSong3('expert') },
  },
  {
    id: 's4', title: 'Iron Storm', artist: 'Heavy Metal', bpm: 120, color: '#9b59b6',
    fullMelody: chartToMelody(makeSong4('expert')),
    bassLine: S4_BASS, bassRepeat: S4_BASS_REPEAT,
    charts: { easy: makeSong4('easy'), medium: makeSong4('medium'), expert: makeSong4('expert') },
  },
  {
    id: 's5', title: 'Neon Drive', artist: 'Synth Rock', bpm: 130, color: '#1abc9c',
    fullMelody: chartToMelody(makeSong5('expert')),
    bassLine: S5_BASS, bassRepeat: S5_BASS_REPEAT,
    charts: { easy: makeSong5('easy'), medium: makeSong5('medium'), expert: makeSong5('expert') },
  },
];
