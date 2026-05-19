# 🎸 Guitar Hero React

משחק גיטרה הירו בנוי ב-React + Vite. בדיוק כמו המקורי - עם פרטבורד בפרספקטיבה 3D,
לחיצות קצרות וארוכות, אקורדים, ו-3 רמות קושי.

## 🚀 איך להריץ

### דרישות מקדימות
- [Node.js](https://nodejs.org/) (גרסה 18 ומעלה)
- [VS Code](https://code.visualstudio.com/) (אופציונלי, אבל מומלץ)

### התקנה והרצה

1. **פתח את הפרויקט ב-VS Code:**
   ```bash
   code .
   ```

2. **פתח טרמינל ב-VS Code:** (`Ctrl+\`` או `Cmd+\``)

3. **התקן את החבילות:**
   ```bash
   npm install
   ```

4. **הפעל את שרת הפיתוח:**
   ```bash
   npm run dev
   ```

5. **פתח את הדפדפן בכתובת:** `http://localhost:3000`

זהו! המשחק רץ. כל שינוי שתעשה בקוד יתעדכן אוטומטית בדפדפן (Hot Reload).

## 🎮 איך לשחק

- **מקשים:** `A` `S` `D` `F` `G` (ירוק, אדום, צהוב, כחול, כתום)
- **לחיצה קצרה:** הקש על המקש כשהגם מגיע לעיגול בתחתית
- **לחיצה ארוכה (sustain):** החזק את המקש לאורך הזנב הצבעוני
- **אקורד:** כמה גמים בו זמנית = לחץ על כמה מקשים ביחד
- **רמות:** Easy / Medium / Expert

## 📁 מבנה הפרויקט

```
guitar-hero/
├── index.html              # נקודת הכניסה של HTML
├── package.json            # תלויות והסקריפטים
├── vite.config.js          # הגדרות Vite
└── src/
    ├── main.jsx            # אתחול React
    ├── styles.css          # סטיילים גלובליים
    ├── GuitarHero.jsx      # רכיב המשחק המרכזי
    └── songs.js            # הגדרת השירים והתבניות
```

## 🎵 הוספת שיר משלך

פתח את `src/songs.js`. כל שיר מורכב משלוש tracks (easy/medium/expert).

**תחביר התווים:**
- `"0"` = תו ירוק בודד (A)
- `"1"` = תו אדום (S)
- `"2"` = צהוב (D), `"3"` = כחול (F), `"4"` = כתום (G)
- `"01"` = אקורד: ירוק + אדום ביחד
- `"234"` = אקורד של 3 תווים
- `"0+"` = sustain קצר (0.5 שניות)
- `"2++"` = sustain ארוך (0.9 שניות)

**דוגמה:**
```js
function makeMySong(diff) {
  const bpm = 120;
  const b = 60 / bpm; // משך פעימה בשניות
  let pat = [];

  if (diff === 'easy') {
    const seq = ['0', '1', '2', '1'];
    for (let i = 0; i < 32; i++) {
      pat.push({ t: 2 + i * b, n: seq[i % seq.length] });
    }
  }
  // ... medium / expert
  return buildChart(pat);
}
```

ואז הוסף ל-`SONGS`:
```js
{
  id: 's4',
  title: 'השיר שלי',
  artist: 'אני',
  bpm: 120,
  color: '#9b59b6',
  charts: {
    easy: makeMySong('easy'),
    medium: makeMySong('medium'),
    expert: makeMySong('expert'),
  },
},
```

## ⚙️ פרמטרים שכדאי לדעת ב-GuitarHero.jsx

| משתנה | מיקום | מה הוא עושה |
|-------|--------|-------------|
| `TRAVEL` | למעלה | כמה זמן (שניות) לוקח לתו להגיע מלמעלה לקו - הקטן ערך = משחק מהיר יותר |
| `LANE_COLORS` | למעלה | הצבעים של 5 הלייניםא |
| `KEY_TO_LANE` | למעלה | מיפוי המקשים ללייניםא - תוכל לשנות ל-WASD למשל |
| חלון פגיעה | בתוך `handleKey` | `d < 0.18` - כמה שניות סובלנות לפני/אחרי הזמן המדויק |
| חישוב ציון | בתוך `handleKey` | perfect (100) / good (70) / okay (50) |
| מכפילים | בתוך `handleKey` | x2 ב-10, x3 ב-20, x4 ב-30 ניקודים ברצף |

## 🛠️ בנייה לייצור (Production)

```bash
npm run build
```

הקבצים יבנו ל-`dist/`. תוכל להעלות אותם לכל אחסון סטטי (Vercel, Netlify, GitHub Pages וכו').

```bash
npm run preview
```

מציג תצוגה מקדימה של ה-build המקומי.

## 💡 רעיונות להרחבה

- מוזיקה אמיתית עם `<audio>` במקום הסינתסייזר
- Star Power / Overdrive
- שמירת ניקודים גבוהים ב-localStorage
- מצב 2 שחקנים
- ייבוא קבצי Chart פורמט .chart (פורמט Clone Hero)
- אפקטים ויזואליים יותר עשירים (אש, ברק)
- כפתור Pause באמצע השיר
