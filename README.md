# Gravity Hopper — Sky Lab Physics Adventure

![Gravity Hopper Icon](assets/icon.svg)

**Gravity Hopper** is an original, child-friendly 2D educational physics platformer designed for ages **9–12**. Players guide **Bolt**, an articulated robot explorer, through 12 progressive levels inside a floating sky-canopy physics laboratory—learning **gravity, stored energy, kinetic (motion) energy, gravitational potential (height) energy, elastic springs, energy transfer, surface friction, slopes, momentum, air resistance, and mass/weight** through hands-on play.

---

## ✨ Key Features

- **Expressive Articulated Character Animation:** Inspired by classic 16-bit platformers, Bolt features multi-jointed swinging arms and hands, striding legs and boots, a reactive energy tail, blinking visor eyes, squash-and-stretch impact physics, and heroic **ledge-grabbing**.
- **Tactile Platformer Physics (`physics.js`):**
  - Immediate jump liftoff with **variable hold height** (holding Jump longer converts more Stored Energy into upward motion and height).
  - Coyote time, jump buffering, graceful apex hang-time, weighted descent, and automatic ledge-catching.
  - Finite battery enforcement: Bolt cannot jump endlessly when Stored Energy runs dry.
- **Live Educational Physics Tools:**
  - **3-Way Energy HUD:** Real-time meters for **⚡ Stored Energy (Battery)**, **💨 Kinetic Energy (Motion)**, and **⛰️ Gravitational Potential Energy (Height)** with colourblind-safe status tags (`(OK)`, `(MID)`, `(LOW!)`) and a live **Energy Transfer Ticker**.
  - **Force Vector Overlay (`H` / `VECTORS: ON`):** Displays live **Gravity ($F_g$)**, **Surface Friction ($F_f$)**, and **Air Drag / Fan Lift ($F_{air}$)** arrows directly on Bolt.
  - **Pause-and-Learn Hints & Collectible Notes:** Friendly hints appear after 3 failed attempts, and golden **Physics Notes (`📘`)** teach bite-sized concepts in child-friendly language.
  - **Interactive Post-Level Recap:** Every level concludes with a 3-line summary, a 1–3 Star rating (`★`), and an optional multiple-choice **Quick Physics Check**.
- **Mobile Phone & Tablet First-Class Controls:**
  - **Thumb-Slide D-Pad:** Slide your left thumb smoothly between `◀ LEFT` and `▶ RIGHT` without lifting your finger.
  - **Right-Thumb Action Cluster:** Large tactile **JUMP (HOLD = HIGHER)** button, dedicated **🪂 GLIDE** parachute button, contextual **📦 CRATE** pickup button, and top-bar **⛶ Fullscreen** mode.
- **100% Original, Private & Offline-Ready:**
  - Zero third-party libraries, no accounts, no ads, no tracking, and no external network requests.
  - All visuals are rendered on HTML5 Canvas and all sound effects are synthesized locally via the Web Audio API.

---

## 🚀 How to Run & Play

### Option 1: Play Locally Immediately
Simply double-click or open [`index.html`](index.html) in any modern desktop, tablet, or mobile browser. No build step or installation is required.

### Option 2: Run with a Local Development Server (for PWA Offline Caching)
To test the Service Worker (`sw.js`) and "Install App / Add to Home Screen" PWA features locally:

```bash
# Using Node.js
npx serve .

# Or using Python 3
python -m http.server 8000
```
Then open `http://localhost:8000` (or the port shown in your terminal).

---

## 🎮 Controls

| Action | Keyboard (Desktop / Laptop) | Touch (Mobile Phones & Tablets) |
|---|---|---|
| **Move / Run** | `←` / `→` Arrow keys or `A` / `D` | Left / Right D-Pad (supports thumb sliding) |
| **Variable Jump** | Tap `Space` / `↑` / `W` for a small hop; **hold** for a higher jump | Tap or **hold** `JUMP` button |
| **Ledge Grab** | Jump toward a platform edge in mid-air | Automatic when reaching a ledge edge |
| **Parachute Glider** | Hold `↓` / `S` while falling | Hold `🪂 GLIDE` button |
| **Pick Up / Drop Crate** | Press `X` near the Power Crate (Level 9) | Tap `📦 CRATE` button |
| **Toggle Physics Vectors** | Press `H` | Tap `⚡` in top bar or `VECTORS: ON` in HUD |
| **Sound Volume** | Click `🔊` button in top bar | Tap `🔊` button (cycles High / Low / Mute) |
| **Fullscreen** | Click `⛶` button in top bar | Tap `⛶` button in top bar |
| **Restart Level** | Press `R` | Tap `↻ Restart` in bottom bar or Pause menu |
| **Pause Game** | Press `P` or `Esc` | Tap `Ⅱ` button in top bar |

> **Practice Mode:** Toggle **Practice Mode** on the Home screen or Pause menu for unlimited jump energy while practicing levels. Practice runs do not unlock new levels or award stars.

---

## 🍎 Parent & Teacher Guide (Physics Curriculum by Level)

By completing all 12 levels, children experience and can explain seven core physical science concepts:

| Level | Level Name | Physics Concept Demonstrated | Discussion Question for Kids |
|---|---|---|---|
| **01** | **Sunrise Canopy** | **Variable Jump & Stored Energy:** Holding jump longer uses more Stored Energy to create a stronger upward push. | *How did a quick tap compare with holding the jump button down?* |
| **02** | **Gravity Cliffs** | **Gravity & Potential Energy:** Gravity pulls downward constantly; climbing higher stores Gravitational Potential Energy. | *When did Bolt have the most Height (Potential) Energy, and what did it turn into while falling?* |
| **03** | **Coil Canyon** | **Elastic Springs:** A compressed spring stores Elastic Potential Energy and transfers it to Bolt on release. | *Why does dropping onto a spring from higher up squeeze the coil more?* |
| **04** | **Slip & Grip Ridge** | **Surface Friction:** Friction opposes sliding motion. Ice has very low friction, rough sand slows motion, and rubber provides high grip. | *Why did Bolt keep sliding on the blue ice even after you let go of the button?* |
| **05** | **Battery Oasis** | **Energy Conservation & Budgeting:** Usable energy is limited; small hops conserve stored battery energy compared to giant leaps. | *Why couldn't Bolt take the highest route using maximum jumps the whole way?* |
| **06** | **Pendulum Perch** | **Moving Platforms & Momentum:** Standing on a moving platform shares its velocity with Bolt when jumping off. | *How did jumping while the platform moved forward change your jump distance?* |
| **07** | **Mesa Rollerway** | **Slopes & Ramps:** Rolling downhill converts Potential (Height) Energy into Kinetic (Motion) speed; climbing uphill slows Bolt down. | *Why did Bolt speed up automatically on the downhill ramp?* |
| **08** | **Windward Spire** | **Air Resistance (Drag) & Updrafts:** Parachutes and upward fans push against gravity to reduce falling speed. | *What happened to Bolt's falling speed when the parachute glider opened?* |
| **09** | **Counterweight Gorge** | **Mass & Weight:** Carrying the heavy crate ($1.6\times$ mass) increases downward weight and requires more energy to lift. | *Why did jumping with the crate use more battery energy than jumping without it?* |
| **10** | **Relay Terraces** | **Energy Transfer Chains:** Energy is never destroyed—it transforms between Battery $\rightarrow$ Spring $\rightarrow$ Motion $\rightarrow$ Height. | *Where did the spring's stored energy go after it launched Bolt?* |
| **11** | **Cryo Canyon Run** | **Friction & Momentum Challenge:** Combining downhill ramp acceleration, low-friction ice, and elastic springs to cross a wide canyon. | *Why was the ice placed right at the bottom of the downhill ramp?* |
| **12** | **Horizon Escape** | **Final Synthesis:** Combining energy planning, chargers, springs, moving platforms, friction, and updraft fans. | *Which physics force or energy transfer helped you escape the lab?* |

---

## 📁 Project Structure & How to Extend

```text
phy-gravity-hopper/
├── index.html             # Main HTML5 shell, top bar, canvas, and mobile touch controls
├── styles.css             # Responsive mobile/tablet/desktop layout & glassmorphic UI styles
├── levels.js              # All 12 level layouts, sky themes, physics notes, and quiz questions
├── physics.js             # 2D physics engine, energy calculations, surface rules & limb kinematics
├── game.js                # Parallax renderer, articulated Bolt renderer, Web Audio SFX & menus
├── sw.js                  # Offline-first Service Worker cache
├── manifest.webmanifest   # Progressive Web App (PWA) manifest
├── README.md              # Documentation and Parent/Teacher guide
└── assets/
    └── icon.svg           # Custom vector icon of Bolt leaping through a gravity ring
```

### Adding or Customizing Levels
Open [`levels.js`](levels.js) and edit or append to `window.LEVELS`. Each level uses a `960 × 600` coordinate space:
- `theme`: `'dawn'` | `'savanna'` | `'sunset'` | `'twilight'` | `'oasis'` | `'sky'` | `'finale'`
- `platforms`: Array of `[x, y, width, type]` where `type` is `'plain'`, `'ice'`, `'rough'`, `'rubber'`, `'spring'`, `'charger'`, `'movingH'`, `'movingV'`, `'rampDown'`, or `'rampUp'`.
- `fans`: Array of `[x, y, width, height]` upward wind zones.
- `notes`: Array of `[x, y, 'Child-friendly physics explanation']`.
- `quiz`: `{ q: 'Question?', options: ['Right', 'Wrong 1', 'Wrong 2'], correct: 0 }`.
