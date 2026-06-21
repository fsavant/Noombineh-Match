# 🍪 Noombineh! — Cookie Match

A cookie-themed **match-3 puzzle game** built with **React + Vite**.
Swap delicious decorated cookies, line up three or more, and watch the
sprinkles, coconut powder, and cocoa fly across the board!

> فارسی: یک بازی پازل مچ-۳ با تم کوکی، ساخته‌شده با React و Vite. کوکی‌های خوشمزه را جابجا کن، سه‌تایی یا بیشتر ردیف کن و جشن اسپرینکل و پودر نارگیل را تماشا کن!

---

## ✨ Features

- 6×6 board with 5 hand-drawn cookie types (chocolate, caramel, red jam, green jam, golden star)
- Icing decorations: drizzle stripes, jam dots, white flowers, blue borders
- Encouraging pop-up messages: `Noombadeh!`, `Soombadeh!`, `Noombingadazoo!`, `Soombinganzandoo!😎`
- Match effects: confetti cookies, sprinkles, coconut + cocoa powder bursting from the match position
- Falling cookies and honey drops in the chocolate background
- Auto-shuffle when no moves are possible
- Persistent local rankings / high-score board (saved in `localStorage`)
- Mobile-friendly, full-screen layout

---

## 🚀 Run locally (development)

You need **Node.js 18+** installed.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

---

## 📦 Build for production (web)

```bash
npm run build
```

The optimized static site is generated in the **`dist/`** folder.
You can preview the production build with:

```bash
npm run preview
```

---

## 📱 Build an Android APK (with Capacitor)

This project is pre-configured for [Capacitor](https://capacitorjs.com/),
which wraps the web build into a native Android app.

**Prerequisites:** Node.js, Android Studio (with the Android SDK).

```bash
# 1. Build the web app
npm run build

# 2. Add the Android platform (only the first time)
npm run cap:add:android

# 3. Copy the web build into the native project
npm run cap:sync

# 4. Open the project in Android Studio
npm run cap:open:android
```

Inside Android Studio, choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**
to generate your `app-debug.apk`. For a release/signed APK, follow Android
Studio's "Generate Signed Bundle / APK" wizard.

> Note: the `android/` folder is git-ignored. Re-run steps 2–3 after cloning.

---

## 🗂️ Project structure

```
noombineh-match/
├── index.html              # HTML entry point
├── package.json            # Dependencies & scripts
├── vite.config.js          # Vite config (relative base for WebView)
├── capacitor.config.json   # Capacitor config for Android
├── .gitignore
├── README.md
└── src/
    ├── main.jsx            # React entry, mounts <App/>
    ├── App.jsx             # Renders the game
    ├── NoombinehMatch.jsx  # The full game component
    └── index.css           # Base reset styles
```

---

## 🎮 How to play

1. Tap a cookie to select it (it highlights).
2. Tap an adjacent cookie (up / down / left / right) to swap them.
3. A swap only happens if it creates a line of 3+ matching cookies.
4. Clear cookies, score points, and chase the top of the rankings!

Buttons: **New Game**, **Shuffle**, **Save Score**, **Ranking**.

---

## 📝 License

Made with ❤️ by Flora. Free to use and modify for personal projects.
