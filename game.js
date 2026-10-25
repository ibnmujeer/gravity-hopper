/**
 * GRAVITY HOPPER — Main Game Loop, Lush 16-Bit/Modern Renderer, Audio & UI
 *
 * Features:
 *  - Multi-layer parallax backgrounds (savanna mesas, canopy trees, floating lab spires)
 *  - Full articulated limb animation for Bolt (arms, hands, legs, feet, tail, ears, visor)
 *  - Live Physics Vector Overlay (Gravity Fg, Motion v, Friction Ff, Air Drag Fair)
 *  - 3-Way Energy HUD (Stored Battery <-> Kinetic Motion <-> Gravitational Potential Height)
 *  - Interactive Post-Level Recap with optional mini-quiz & Star Ratings
 *  - Mobile & Tablet touch controls with thumb-slide D-Pad and Fullscreen support
 */
(() => {
  'use strict';

  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const W = 960;
  const H = 600;
  const TAU = Math.PI * 2;

  // DOM Elements
  const statusEl = document.querySelector('#level-status');
  const soundBtn = document.querySelector('#sound-button');
  const hintsBtn = document.querySelector('#hints-button');
  const pauseBtn = document.querySelector('#pause-button');
  const fullscreenBtn = document.querySelector('#fullscreen-button');
  const restartBtn = document.querySelector('#restart-button');
  const helpBtn = document.querySelector('#help-button');
  const homeLink = document.querySelector('#home-link');
  const mobileControlsEl = document.querySelector('#mobile-controls');
  const touchCrateBtn = document.querySelector('#touch-crate');
  const touchGlideBtn = document.querySelector('#touch-glide');
  const dpadGroup = document.querySelector('#dpad-group');

  // LocalStorage Persistence (Progress, Best Energy, Stars, Notes, Settings)
  const STORAGE_KEY = 'gravity-hopper-v2';
  const store = {
    load() {
      try {
        const v2 = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (v2) return v2;
        const v1 = JSON.parse(localStorage.getItem('gravity-hopper-v1') || '{}');
        return { unlocked: v1.unlocked || 0, volume: v1.volume ?? 0.65, hints: v1.hints !== false, practice: !!v1.practice, stars: {}, notes: {} };
      } catch {
        return { unlocked: 0, volume: 0.65, hints: true, practice: false, stars: {}, notes: {} };
      }
    },
    save(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {}
    }
  };

  const saved = store.load();
  const settings = {
    volume: typeof saved.volume === 'number' ? saved.volume : 0.65,
    hints: saved.hints !== false,
    practice: saved.practice === true
  };

  // Game State
  let screen = 'menu'; // 'menu' | 'playing' | 'paused' | 'recap' | 'howto' | 'levels' | 'won'
  let guideTab = 'controls'; // 'controls' | 'teacher'
  let levelIndex = 0;
  let level = null;
  let player = null;
  let camX = 0;
  let camY = 0;
  let levelTime = 0;
  let menuTime = 0;
  let failures = 0;
  let message = '';
  let messageTime = 0;
  let noteBanner = '';
  let noteBannerTime = 0;
  let quizSelected = -1;
  let quizAnswered = false;
  let recapLines = [];
  let lastEarnedStars = 3;

  // Input State
  const keys = {};
  let jumpHeld = false;
  let jumpPressed = false;
  let mouse = { x: -100, y: -100 };
  let buttons = [];
  let particles = [];
  let floaters = [];
  let ambientMotes = [];
  let ac = null;

  // Initialize ambient floating sky motes
  for (let i = 0; i < 36; i++) {
    ambientMotes.push({
      x: Math.random() * 1200,
      y: Math.random() * 540,
      r: 1.2 + Math.random() * 2.4,
      speed: 8 + Math.random() * 18,
      phase: Math.random() * TAU
    });
  }

  // Atmospheric Sky & Canopy Palettes (Inspired by 1994 Savanna/Canopy & Sky-Lab Aesthetics)
  const THEMES = {
    dawn: {
      skyTop: '#24174a',
      skyMid: '#6b3074',
      skyBot: '#f38375',
      sunColor: '#ffd166',
      mesaFar: '#3d2352',
      mesaNear: '#28193d',
      treeTrunk: '#2a1829',
      canopyDark: '#1b4332',
      canopyLit: '#40916c'
    },
    savanna: {
      skyTop: '#3b2868',
      skyMid: '#94528b',
      skyBot: '#f6bd60',
      sunColor: '#ffea85',
      mesaFar: '#5e3c6e',
      mesaNear: '#3d2647',
      treeTrunk: '#301c28',
      canopyDark: '#2d5a27',
      canopyLit: '#6a994e'
    },
    sunset: {
      skyTop: '#1f1135',
      skyMid: '#7c2356',
      skyBot: '#ff7b54',
      sunColor: '#ffb703',
      mesaFar: '#45193d',
      mesaNear: '#2b1029',
      treeTrunk: '#220f1d',
      canopyDark: '#1f3a3d',
      canopyLit: '#487e76'
    },
    twilight: {
      skyTop: '#0f172a',
      skyMid: '#2e2963',
      skyBot: '#745c97',
      sunColor: '#d8f3dc',
      mesaFar: '#23204a',
      mesaNear: '#171533',
      treeTrunk: '#141229',
      canopyDark: '#1b3b4b',
      canopyLit: '#3a7ca5'
    },
    oasis: {
      skyTop: '#102542',
      skyMid: '#1d5c78',
      skyBot: '#8ce0c9',
      sunColor: '#fff3b0',
      mesaFar: '#19435c',
      mesaNear: '#112e42',
      treeTrunk: '#1a2c38',
      canopyDark: '#165b4c',
      canopyLit: '#4cc9a0'
    },
    sky: {
      skyTop: '#182048',
      skyMid: '#3a508c',
      skyBot: '#a3cef1',
      sunColor: '#ffffff',
      mesaFar: '#2c3d6e',
      mesaNear: '#1d284c',
      treeTrunk: '#212940',
      canopyDark: '#274c5e',
      canopyLit: '#5fa8d3'
    },
    finale: {
      skyTop: '#1a0b2e',
      skyMid: '#5a189a',
      skyBot: '#ff9e00',
      sunColor: '#ffd166',
      mesaFar: '#3c096c',
      mesaNear: '#240046',
      treeTrunk: '#1e0b2e',
      canopyDark: '#1b4332',
      canopyLit: '#52b788'
    }
  };

  // ---------------------------------------------------------------------------
  // WEB AUDIO SYNTHESIZER (Rich, Warm Arcade Sound Effects)
  // ---------------------------------------------------------------------------
  function playTone(freq, dur = 0.1, type = 'sine', vol = 0.04, slideTo = null, delay = 0) {
    if (settings.volume <= 0) return;
    try {
      ac ??= new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const start = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), start + dur);
      }
      gain.gain.setValueAtTime(Math.max(0.001, vol * settings.volume), start);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(start);
      osc.stop(start + dur);
    } catch {}
  }

  function playSfx(kind, power = 0.5) {
    if (settings.volume <= 0) return;
    switch (kind) {
      case 'jump':
        playTone(250 + power * 90, 0.13, 'triangle', 0.05, 520 + power * 180);
        break;
      case 'emptyJump':
        playTone(150, 0.12, 'sawtooth', 0.035, 95);
        break;
      case 'land':
        playTone(145, 0.07, 'sine', 0.035 * Math.max(0.4, power), 75);
        break;
      case 'springCompress':
        playTone(220, 0.09, 'triangle', 0.04, 150);
        break;
      case 'springLaunch':
        playTone(310, 0.12, 'triangle', 0.055, 680);
        playTone(460, 0.16, 'sine', 0.045, 920, 0.06);
        break;
      case 'note':
        playTone(587.33, 0.1, 'triangle', 0.05);
        playTone(880, 0.16, 'triangle', 0.05, null, 0.07);
        break;
      case 'ledge':
        playTone(340, 0.06, 'triangle', 0.04, 440);
        break;
      case 'crate':
        playTone(210, 0.09, 'square', 0.03, 290);
        break;
      case 'win':
        playTone(523.25, 0.12, 'triangle', 0.055, null, 0.0);
        playTone(659.25, 0.12, 'triangle', 0.055, null, 0.09);
        playTone(783.99, 0.14, 'triangle', 0.055, null, 0.18);
        playTone(1046.5, 0.28, 'triangle', 0.06, null, 0.27);
        break;
      case 'fail':
        playTone(240, 0.16, 'sine', 0.04, 150, 0);
        playTone(170, 0.22, 'sine', 0.035, 115, 0.12);
        break;
      case 'click':
        playTone(520, 0.045, 'sine', 0.03, 660);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // CANVAS DRAWING HELPERS
  // ---------------------------------------------------------------------------
  function rounded(x, y, w, h, r, fill, stroke, lineWidth = 1.5) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function text(str, x, y, size = 16, color = '#f8f9ff', weight = 700, align = 'left') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function addButton(label, x, y, w, h, action, style = 'gold', small = false) {
    const hovered = rectHit(mouse.x, mouse.y, { x, y, w, h });
    buttons.push({ label, x, y, w, h, action, style, small });

    let fill = '#261e47';
    let stroke = 'rgba(255, 224, 158, 0.35)';
    let ink = '#f8f9ff';

    if (style === 'gold' || style === 'mint') {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      if (style === 'gold') {
        grad.addColorStop(0, hovered ? '#ffe082' : '#ffd166');
        grad.addColorStop(1, hovered ? '#ff9e00' : '#f48c06');
        ink = '#1e1204';
        stroke = '#fff3b0';
      } else {
        grad.addColorStop(0, hovered ? '#88f7d4' : '#56efc4');
        grad.addColorStop(1, hovered ? '#2ec4b6' : '#16a085');
        ink = '#07221c';
        stroke = '#c6ffed';
      }
      fill = grad;
    } else if (style === 'quiet') {
      fill = hovered ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.08)';
      stroke = hovered ? '#ffd166' : 'rgba(255, 255, 255, 0.24)';
    } else if (style === 'locked') {
      fill = 'rgba(20, 18, 38, 0.65)';
      stroke = 'rgba(255, 255, 255, 0.1)';
      ink = '#7c86a6';
    }

    rounded(x, y, w, h, small ? 10 : 14, fill, stroke, hovered ? 2 : 1.5);
    text(label, x + w / 2, y + h / 2, small ? 11 : 14, ink, 800, 'center');
  }

  function rectHit(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  function addParticles(x, y, color, count = 8, speed = 150, sizeBase = 3) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
      const spd = (0.35 + Math.random() * 0.75) * speed;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd + (Math.random() - 0.5) * 60,
        vy: Math.sin(angle) * spd,
        life: 0.32 + Math.random() * 0.38,
        max: 0.7,
        size: sizeBase + Math.random() * 3,
        color
      });
    }
  }

  function say(s, x, y, color = '#ffe8a3') {
    floaters.push({ s, x, y, color, life: 2.2 });
  }

  // ---------------------------------------------------------------------------
  // LEVEL INITIALIZATION & STATE TRANSITIONS
  // ---------------------------------------------------------------------------
  function updateTopBar() {
    if (screen === 'playing' && level) {
      statusEl.textContent = `LEVEL ${String(levelIndex + 1).padStart(2, '0')} · ${level.name.toUpperCase()}`;
    } else {
      statusEl.textContent = 'Sky Lab Physics Adventure';
    }

    // Show/hide mobile touch controls based on screen state
    if (mobileControlsEl) {
      mobileControlsEl.style.opacity = screen === 'playing' ? '1' : '0';
      mobileControlsEl.style.pointerEvents = screen === 'playing' ? 'none' : 'none';
      const groups = mobileControlsEl.querySelectorAll('.dpad-group, .action-group');
      groups.forEach(g => {
        g.style.pointerEvents = screen === 'playing' ? 'auto' : 'none';
      });
    }
    if (touchCrateBtn) {
      touchCrateBtn.hidden = !(screen === 'playing' && level && level.crate);
    }
  }

  function initLevel(index) {
    levelIndex = Math.max(0, Math.min(index, window.LEVELS.length - 1));
    const raw = window.LEVELS[levelIndex];
    level = structuredClone(raw);

    level.platforms = level.platforms.map((p, i) => ({
      x: p[0],
      y: p[1],
      w: p[2],
      type: p[3],
      baseX: p[0],
      baseY: p[1],
      phase: i * 1.35,
      boingTime: 0
    }));

    level.notes = (level.notes || []).map(n => ({
      x: n[0],
      y: n[1],
      text: n[2] || 'Energy transforms from one form to another!',
      got: false
    }));

    level.fans = (level.fans || []).map(f => ({
      x: f[0],
      y: f[1],
      w: f[2],
      h: f[3]
    }));

    levelTime = 0;
    failures = 0;
    particles = [];
    floaters = [];
    camX = 0;
    camY = 0;
    message = '';
    messageTime = 0;
    noteBanner = '';
    noteBannerTime = 0;

    const startEnergy = settings.practice ? 100 : (level.energy ?? 100);
    player = window.Physics.createPlayer(level.start[0], level.start[1], startEnergy);
    screen = 'playing';
    updateTopBar();
  }

  function resetPlayerOnly() {
    const startEnergy = settings.practice ? 100 : (level.energy ?? 100);
    player = window.Physics.createPlayer(level.start[0], level.start[1], startEnergy);
    // Reset crate position if level has one
    if (window.LEVELS[levelIndex].crate) {
      level.crate = [...window.LEVELS[levelIndex].crate];
    }
    camX = 0;
    particles = [];
  }

  function handleFail(reason = '') {
    failures++;
    playSfx('fail');
    if (failures >= 3 && !settings.practice) {
      message = `💡 Physics Hint: ${level.hint}`;
    } else if (reason) {
      message = reason;
    } else {
      message = 'Oops! Bolt slipped off—let’s try that jump again!';
    }
    messageTime = 4.2;
    resetPlayerOnly();
  }

  function toggleCrateCarry() {
    if (screen !== 'playing' || !level || !level.crate) return;
    const cx = level.crate[0] + 15;
    const cy = level.crate[1] + 16;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const dist = Math.hypot(px - cx, py - cy);

    if (player.carry) {
      player.carry = false;
      level.crate = [
        Math.round(player.x + (player.face > 0 ? player.w + 4 : -32)),
        Math.round(player.y + player.h - 32)
      ];
      say('Crate set down — Mass reduced!', player.x + player.w / 2, player.y - 18, '#80ed99');
      playSfx('crate');
    } else if (dist < 95) {
      player.carry = true;
      say('Heavy Crate lifted! Mass increased (1.6x)', player.x + player.w / 2, player.y - 18, '#ffd166');
      playSfx('crate');
    } else {
      say('Step closer to the crate to pick it up!', player.x + player.w / 2, player.y - 18, '#ffadad');
    }
  }

  function finishLevel() {
    screen = 'recap';
    quizSelected = -1;
    quizAnswered = false;

    const sentences = level.lesson.match(/[^.?!]+[.?!]?/g) || [];
    recapLines = [
      settings.practice
        ? 'Practice run complete! Turn off Practice Mode to unlock levels & stars.'
        : `Awesome leap! Bolt cleared ${level.name}.`,
      level.idea,
      (sentences.at(-1) || 'Where did the energy transfer next?').trim()
    ];

    // Calculate 1 to 3 stars based on remaining energy and notes collected
    const notesGot = level.notes.filter(n => n.got).length;
    const allNotes = notesGot >= level.notes.length;
    lastEarnedStars = player.energy >= 35 && allNotes ? 3 : (player.energy >= 15 || allNotes ? 2 : 1);

    addParticles(player.x + player.w / 2, player.y + player.h / 2, '#ffd166', 28, 220, 4);
    playSfx('win');

    if (!settings.practice) {
      const data = store.load();
      data.unlocked = Math.max(data.unlocked || 0, Math.min(levelIndex + 1, window.LEVELS.length - 1));
      data.stars = data.stars || {};
      data.stars[levelIndex] = Math.max(data.stars[levelIndex] || 0, lastEarnedStars);
      data.notes = data.notes || {};
      if (allNotes) data.notes[levelIndex] = true;
      store.save(data);
    }
    updateTopBar();
  }

  // ---------------------------------------------------------------------------
  // KEYBOARD, POINTER & TOUCH CONTROLS (Optimized for Phones & Tablets)
  // ---------------------------------------------------------------------------
  function currentInput() {
    return {
      left: !!(keys.ArrowLeft || keys.KeyA || keys.touchLeft),
      right: !!(keys.ArrowRight || keys.KeyD || keys.touchRight),
      down: !!(keys.ArrowDown || keys.KeyS || keys.touchDown),
      jumpHeld,
      jumpPressed
    };
  }

  window.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!keys[e.code]) {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        jumpPressed = true;
      }
      if (e.code === 'KeyH') {
        toggleHints();
      }
      if (e.code === 'KeyR' && screen === 'playing') {
        initLevel(levelIndex);
      }
      if (e.code === 'KeyX' && screen === 'playing') {
        toggleCrateCarry();
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (screen === 'playing') screen = 'paused';
        else if (screen === 'paused') screen = 'playing';
        updateTopBar();
      }
      if (e.code === 'Enter' && e.target.tagName !== 'BUTTON') {
        if (screen === 'menu') initLevel(levelIndex);
        else if (screen === 'paused') screen = 'playing';
        else if (screen === 'recap') {
          if (settings.practice) initLevel(levelIndex);
          else if (levelIndex < window.LEVELS.length - 1) initLevel(levelIndex + 1);
          else screen = 'won';
        }
        updateTopBar();
      }
    }
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      jumpHeld = true;
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      jumpHeld = false;
    }
  });

  window.addEventListener('blur', () => {
    Object.keys(keys).forEach(k => { keys[k] = false; });
    jumpHeld = false;
  });

  // Canvas Pointer Events
  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (W / r.width),
      y: (e.clientY - r.top) * (H / r.height)
    };
  }

  canvas.addEventListener('pointermove', e => {
    mouse = canvasPoint(e);
  });

  canvas.addEventListener('pointerdown', e => {
    const p = canvasPoint(e);
    mouse = p;
    const hit = buttons.find(b => rectHit(p.x, p.y, b));
    if (hit) {
      playSfx('click');
      hit.action();
    }
  });

  // Left Thumb D-Pad: Support smooth thumb sliding between Left and Right buttons!
  if (dpadGroup) {
    const leftBtn = dpadGroup.querySelector('[data-control="left"]');
    const rightBtn = dpadGroup.querySelector('[data-control="right"]');

    const updateDpadFromTouch = e => {
      e.preventDefault();
      const rect = dpadGroup.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const isLeft = clientX < midX;
      keys.touchLeft = isLeft;
      keys.touchRight = !isLeft;
      leftBtn.classList.toggle('down', isLeft);
      rightBtn.classList.toggle('down', !isLeft);
    };

    const clearDpad = e => {
      e.preventDefault();
      keys.touchLeft = false;
      keys.touchRight = false;
      leftBtn.classList.remove('down');
      rightBtn.classList.remove('down');
    };

    dpadGroup.addEventListener('pointerdown', e => {
      dpadGroup.setPointerCapture(e.pointerId);
      updateDpadFromTouch(e);
    });
    dpadGroup.addEventListener('pointermove', e => {
      if (keys.touchLeft || keys.touchRight) updateDpadFromTouch(e);
    });
    dpadGroup.addEventListener('pointerup', clearDpad);
    dpadGroup.addEventListener('pointercancel', clearDpad);
  }

  // Right Thumb Action Buttons (Jump, Parachute Glide, Crate Grab)
  document.querySelectorAll('.action-group .touch-btn').forEach(btn => {
    const ctrl = btn.dataset.control;
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      btn.classList.add('down');
      if (ctrl === 'jump') {
        jumpHeld = true;
        jumpPressed = true;
      } else if (ctrl === 'down') {
        keys.touchDown = true;
      } else if (ctrl === 'crate') {
        toggleCrateCarry();
      }
    });

    const release = e => {
      e.preventDefault();
      btn.classList.remove('down');
      if (ctrl === 'jump') {
        jumpHeld = false;
      } else if (ctrl === 'down') {
        keys.touchDown = false;
      }
    };

    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
  });

  // Top Bar & Footer Buttons
  function toggleHints() {
    settings.hints = !settings.hints;
    hintsBtn.classList.toggle('active', settings.hints);
    store.save({ ...store.load(), hints: settings.hints });
  }

  function toggleSound() {
    settings.volume = settings.volume === 0 ? 0.4 : settings.volume < 0.55 ? 0.8 : 0;
    store.save({ ...store.load(), volume: settings.volume });
    updateSoundIcon();
    if (settings.volume > 0) playSfx('click');
  }

  function updateSoundIcon() {
    soundBtn.querySelector('span').textContent = settings.volume === 0 ? '🔇' : settings.volume < 0.55 ? '🔉' : '🔊';
    const label = settings.volume === 0 ? 'Sound muted' : `Sound ${Math.round(settings.volume * 100)}%`;
    soundBtn.setAttribute('aria-label', label);
    soundBtn.title = label;
  }

  hintsBtn.addEventListener('click', toggleHints);
  soundBtn.addEventListener('click', toggleSound);
  pauseBtn.addEventListener('click', () => {
    if (screen === 'playing') screen = 'paused';
    else if (screen === 'paused') screen = 'playing';
    updateTopBar();
  });
  restartBtn.addEventListener('click', () => {
    if (screen === 'playing' || screen === 'paused') initLevel(levelIndex);
  });
  helpBtn.addEventListener('click', () => {
    screen = screen === 'howto' ? 'menu' : 'howto';
    updateTopBar();
  });
  homeLink.addEventListener('click', e => {
    e.preventDefault();
    screen = 'menu';
    updateTopBar();
  });
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });
  }

  // ---------------------------------------------------------------------------
  // MAIN UPDATE STEP
  // ---------------------------------------------------------------------------
  function update(dt) {
    menuTime += dt;

    // Update ambient sky motes
    for (const m of ambientMotes) {
      m.x -= m.speed * dt;
      m.y += Math.sin(menuTime * 1.5 + m.phase) * 8 * dt;
      if (m.x < 0) m.x += 1200;
    }

    if (screen !== 'playing') return;
    levelTime += dt;

    const input = currentInput();
    const events = window.Physics.stepPhysics(player, level, input, dt, levelTime, settings);

    // Process Physics Events (Audio + Visual Particle Feedback)
    for (const ev of events) {
      if (ev.type === 'jump') {
        playSfx('jump', ev.power);
        addParticles(ev.x, ev.y, '#a3cef1', 9, 130, 3);
      } else if (ev.type === 'emptyJump') {
        playSfx('emptyJump');
        say('Battery low! Tap R or reach a Charger ⚡', ev.x, ev.y - 38, '#ff758f');
      } else if (ev.type === 'land') {
        playSfx('land', ev.strength);
        const pColor = ev.surface === 'rough' ? '#e9c46a' : ev.surface === 'ice' ? '#caf0f8' : '#dcd6f7';
        addParticles(ev.x, ev.y, pColor, Math.round(5 + ev.strength * 8), 115, 2.5);
      } else if (ev.type === 'springCompress') {
        playSfx('springCompress');
      } else if (ev.type === 'springLaunch') {
        playSfx('springLaunch');
        addParticles(ev.x, ev.y, '#ff85a1', 18, 210, 3.5);
        say('Elastic -> Kinetic Boost!', ev.x, ev.y - 28, '#ff9ebb');
      } else if (ev.type === 'ledgeGrab') {
        playSfx('ledge');
        addParticles(ev.x, ev.y, '#ffd166', 5, 80, 2);
      } else if (ev.type === 'chargeSpark') {
        addParticles(ev.x + (Math.random() - 0.5) * 24, ev.y, '#56efc4', 2, 95, 2.5);
      } else if (ev.type === 'surfaceParticle') {
        const c = ev.surface === 'ice' ? '#90e0ef' : ev.surface === 'rough' ? '#f4a261' : '#b8c0ff';
        addParticles(ev.x, ev.y, c, 2, 85, 2.2);
      }
    }

    // Collect Physics Energy Notes
    for (const note of level.notes) {
      if (!note.got && Math.hypot(player.x + player.w / 2 - note.x, player.y + player.h / 2 - note.y) < 34) {
        note.got = true;
        player.energy = Math.min(player.maxEnergy, player.energy + 18);
        noteBanner = `📘 ${note.text}`;
        noteBannerTime = 5.5;
        say('+18 Stored Energy!', note.x, note.y - 18, '#ffd166');
        addParticles(note.x, note.y, '#ffd166', 16, 160, 3);
        playSfx('note');
      }
    }

    // Check Weight Pad in Level 9 (depresses when Bolt carries the heavy crate over it)
    if (level.weightPad) {
      const [wx, wy, ww] = level.weightPad;
      const onPad = player.x + player.w > wx && player.x < wx + ww && Math.abs((player.y + player.h) - wy) < 18;
      if (onPad && player.carry && !level.weightPadTriggered) {
        level.weightPadTriggered = true;
        player.energy = Math.min(100, player.energy + 25);
        say('Weight Pad Pressed! +25 Bonus Energy!', wx + ww / 2, wy - 25, '#56efc4');
        addParticles(wx + ww / 2, wy, '#56efc4', 16, 160, 3);
        playSfx('note');
      }
    }

    // Check Exit Portal
    const ex = level.exit[0];
    const ey = level.exit[1];
    if (player.x + player.w > ex - 8 && player.x < ex + 54 && player.y + player.h > ey - 54 && player.y < ey + 28) {
      finishLevel();
      return;
    }

    // Check Fall Out of Bounds
    if (player.y > H + 110 || player.x > Math.max(1300, ex + 240)) {
      handleFail();
      return;
    }

    // Smooth Camera Follow with Look-Ahead
    const targetCamX = Math.max(0, Math.min(Math.max(0, ex - W * 0.65), player.x - W * 0.34 + player.face * 35));
    camX += (targetCamX - camX) * Math.min(1, dt * 7);

    // Update Active Particles & Floaters
    for (const a of particles) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.vy += 320 * dt;
      a.life -= dt;
    }
    particles = particles.filter(a => a.life > 0);

    for (const f of floaters) {
      f.y -= 24 * dt;
      f.life -= dt;
    }
    floaters = floaters.filter(f => f.life > 0);

    if (messageTime > 0) messageTime -= dt;
    if (noteBannerTime > 0) noteBannerTime -= dt;
  }

  // ---------------------------------------------------------------------------
  // LUSH MULTI-LAYER PARALLAX BACKGROUND (Inspired by 1994 Platformer Horizons)
  // ---------------------------------------------------------------------------
  function drawBackground(themeKey = 'savanna') {
    const pal = THEMES[themeKey] || THEMES.savanna;

    // 1. Rich Multi-Stop Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, pal.skyTop);
    skyGrad.addColorStop(0.52, pal.skyMid);
    skyGrad.addColorStop(1, pal.skyBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Warm Glowing Sun / Moon Disc with Atmospheric Halo
    const sunX = 720 - camX * 0.04;
    const sunY = 165;
    const sunHalo = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 150);
    sunHalo.addColorStop(0, pal.sunColor + '88');
    sunHalo.addColorStop(0.5, pal.sunColor + '22');
    sunHalo.addColorStop(1, 'transparent');
    ctx.fillStyle = sunHalo;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 150, 0, TAU);
    ctx.fill();

    ctx.fillStyle = pal.sunColor;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 44, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 3. Soft Layered Horizon Clouds / Striations
    ctx.fillStyle = 'rgba(255, 240, 210, 0.08)';
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 230 - camX * 0.06 + menuTime * 4) % 1250 + 1250) % 1250 - 150;
      const cy = 120 + (i % 3) * 58;
      rounded(cx, cy, 180 + (i % 2) * 70, 14, 7, 'rgba(255, 240, 210, 0.09)');
    }

    // 4. Distant Pride-Rock Style Mesas & Floating Sky Spires (Parallax 0.14)
    ctx.fillStyle = pal.mesaFar;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = -1; i < 6; i++) {
      const mx = i * 260 - (camX * 0.14) % 260;
      ctx.lineTo(mx, 440);
      ctx.lineTo(mx + 65, 310 + (i % 2) * 35);
      ctx.lineTo(mx + 135, 295 + (i % 2) * 35);
      ctx.lineTo(mx + 190, 420);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // 5. Midground Silhouette Ridges & Floating Bio-Lab Arches (Parallax 0.25)
    ctx.fillStyle = pal.mesaNear;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = -1; i < 6; i++) {
      const rx = i * 240 - (camX * 0.25) % 240;
      ctx.lineTo(rx, 495);
      ctx.quadraticCurveTo(rx + 60, 415, rx + 120, 445);
      ctx.quadraticCurveTo(rx + 180, 475, rx + 240, 490);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // 6. Iconic Acacia / Canopy Silhouette Trees (1994 Lion King Homage, Parallax 0.38)
    for (let i = 0; i < 4; i++) {
      const tx = ((i * 340 + 90 - camX * 0.38) % 1360 + 1360) % 1360 - 160;
      const baseY = 560;
      const topY = 270 + (i % 2) * 55;

      // Winding curved tree trunk & branches
      ctx.strokeStyle = pal.treeTrunk;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, baseY);
      ctx.bezierCurveTo(tx - 28, baseY - 90, tx + 35, topY + 75, tx + 8, topY);
      ctx.stroke();

      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(tx + 12, topY + 38);
      ctx.quadraticCurveTo(tx - 42, topY + 12, tx - 68, topY + 8);
      ctx.moveTo(tx + 10, topY + 25);
      ctx.quadraticCurveTo(tx + 52, topY + 8, tx + 78, topY + 4);
      ctx.stroke();

      // Flat-topped lush layered canopy pads
      ctx.fillStyle = pal.canopyDark;
      ctx.beginPath();
      ctx.ellipse(tx - 58, topY + 6, 52, 14, 0, 0, TAU);
      ctx.ellipse(tx + 68, topY + 2, 56, 15, 0, 0, TAU);
      ctx.ellipse(tx + 5, topY - 6, 78, 18, 0, 0, TAU);
      ctx.fill();

      ctx.fillStyle = pal.canopyLit;
      ctx.beginPath();
      ctx.ellipse(tx - 58, topY + 2, 44, 9, 0, 0, TAU);
      ctx.ellipse(tx + 68, topY - 2, 48, 10, 0, 0, TAU);
      ctx.ellipse(tx + 5, topY - 11, 66, 12, 0, 0, TAU);
      ctx.fill();
    }

    // 7. Drifting Golden Pollen / Sky Motes
    for (const m of ambientMotes) {
      const sx = ((m.x - camX * 0.5) % W + W) % W;
      ctx.fillStyle = 'rgba(255, 238, 170, 0.38)';
      ctx.beginPath();
      ctx.arc(sx, m.y, m.r, 0, TAU);
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------------------
  // PLATFORM, RAMP, SPRING & DEVICE RENDERING
  // ---------------------------------------------------------------------------
  function drawPlatform(r) {
    const { x, y, w, type, raw } = r;
    const sx = x - camX;
    if (sx + w < -40 || sx > W + 40) return;

    // 1. Sloped Ramps (Downhill / Uphill Stone & Brass Slideways)
    if (type === 'rampDown' || type === 'rampUp') {
      const yStart = type === 'rampDown' ? y : y + 90;
      const yEnd = type === 'rampDown' ? y + 90 : y;

      const grad = ctx.createLinearGradient(sx, y, sx, y + 110);
      grad.addColorStop(0, '#5c6f84');
      grad.addColorStop(1, '#2b3545');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx, yStart);
      ctx.lineTo(sx + w, yEnd);
      ctx.lineTo(sx + w, yEnd + 22);
      ctx.lineTo(sx, yStart + 22);
      ctx.closePath();
      ctx.fill();

      // Glowing slope top rail + direction chevrons
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx, yStart);
      ctx.lineTo(sx + w, yEnd);
      ctx.stroke();

      // Chevrons showing slope direction
      const steps = Math.floor(w / 42);
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const cx = sx + w * t;
        const cy = yStart + (yEnd - yStart) * t + 11;
        text(type === 'rampDown' ? '»' : '«', cx, cy, 13, '#ffe8a3', 900, 'center');
      }
      return;
    }

    // 2. Elastic Spring Pad (Compressible Multi-Coil Launcher)
    if (type === 'spring') {
      const compress = (player && player.activeSpring === raw)
        ? player.springCompress
        : (raw.boingTime > 0 ? -Math.sin(raw.boingTime * 28) * 0.35 : 0);
      const topOffset = compress * 9;

      // Base foundation block
      rounded(sx, y + 10, w, 12, 5, '#3b2447', '#ff85a1');

      // Zig-zag steel spring coils under the top cap
      ctx.strokeStyle = '#ffd6e0';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      const coils = 6;
      for (let i = 0; i <= coils; i++) {
        const cx = sx + 14 + (i / coils) * (w - 28);
        const cy = (i % 2 === 0) ? (y + 11) : (y - 3 + topOffset);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // Bouncy top cushion plate
      const capGrad = ctx.createLinearGradient(sx, y - 6 + topOffset, sx, y + 6 + topOffset);
      capGrad.addColorStop(0, '#ff758f');
      capGrad.addColorStop(1, '#c9184a');
      rounded(sx + 4, y - 5 + topOffset, w - 8, 9, 5, capGrad, '#ffccd5');
      return;
    }

    // 3. Standard, Ice, Rough Sand, Rubber, Charger, & Moving Platforms
    let bodyBottom = '#2c221e';
    let bodyMid = '#4a3b32';
    let topCap = '#7ae582';
    let rimStroke = '#b7efc5';

    if (type === 'ice') {
      bodyBottom = '#163a54';
      bodyMid = '#286684';
      topCap = '#90e0ef';
      rimStroke = '#caf0f8';
    } else if (type === 'rough') {
      bodyBottom = '#4a2c18';
      bodyMid = '#7f4f24';
      topCap = '#e9c46a';
      rimStroke = '#f4a261';
    } else if (type === 'rubber') {
      bodyBottom = '#2d1e4a';
      bodyMid = '#5a3d8a';
      topCap = '#c77dff';
      rimStroke = '#e0aaff';
    } else if (type === 'charger') {
      bodyBottom = '#123832';
      bodyMid = '#1f6357';
      topCap = '#56efc4';
      rimStroke = '#b8ffea';
    } else if (type.startsWith('moving')) {
      bodyBottom = '#1d2d44';
      bodyMid = '#3e5c76';
      topCap = '#ffb703';
      rimStroke = '#ffe8a3';
    }

    // Rock/Timber Platform Under-body with 16-bit bevelled depth
    const bodyGrad = ctx.createLinearGradient(sx, y, sx, y + 24);
    bodyGrad.addColorStop(0, bodyMid);
    bodyGrad.addColorStop(1, bodyBottom);
    rounded(sx, y + 2, w, 20, 8, bodyGrad, 'rgba(0,0,0,0.45)');

    // Decorative rock/rivet texture along platform body
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let i = 16; i < w - 12; i += 28) {
      ctx.beginPath();
      ctx.arc(sx + i, y + 12, 2.5, 0, TAU);
      ctx.fill();
    }

    // Lush Top Surface Turf / Material Layer
    rounded(sx - 1, y - 3, w + 2, 8, 4, topCap, rimStroke, 1.5);

    // Surface-specific visual details (accessible & colourblind-clear!)
    if (type === 'plain') {
      // Little grass/canopy tufts & hanging vine leaves
      ctx.fillStyle = '#40916c';
      for (let i = 12; i < w - 12; i += 22) {
        ctx.beginPath();
        ctx.arc(sx + i, y + 5, 4, 0, Math.PI);
        ctx.fill();
      }
    } else if (type === 'ice') {
      // Glistening ice crystals & icicles underneath
      ctx.fillStyle = '#caf0f8';
      for (let i = 14; i < w - 14; i += 24) {
        ctx.beginPath();
        ctx.moveTo(sx + i, y + 20);
        ctx.lineTo(sx + i + 4, y + 29);
        ctx.lineTo(sx + i + 8, y + 20);
        ctx.closePath();
        ctx.fill();
      }
      // Diagonal ice shine lines
      ctx.strokeStyle = '#ffffffaa';
      ctx.lineWidth = 2;
      for (let i = 18; i < w - 16; i += 32) {
        ctx.beginPath();
        ctx.moveTo(sx + i, y - 2);
        ctx.lineTo(sx + i + 8, y + 4);
        ctx.stroke();
      }
    } else if (type === 'rough') {
      // Coarse sand ripples & pebbles (high friction cue)
      ctx.fillStyle = '#bc6c25';
      for (let i = 8; i < w - 8; i += 12) {
        ctx.beginPath();
        ctx.arc(sx + i, y - 3, 2.6, Math.PI, TAU);
        ctx.fill();
      }
    } else if (type === 'rubber') {
      // High-grip rubber tread ridges
      ctx.fillStyle = '#3c096c';
      for (let i = 10; i < w - 10; i += 14) {
        ctx.fillRect(sx + i, y - 3, 6, 4);
      }
    } else if (type === 'charger') {
      // Glowing recharge aura & lightning bolt
      const pulse = 0.5 + 0.5 * Math.sin(levelTime * 6);
      rounded(sx + 6, y - 10, w - 12, 7, 3, `rgba(86, 239, 196, ${0.18 + pulse * 0.22})`);
      text('⚡ CHARGER ⚡', sx + w / 2, y + 12, 9, '#b8ffea', 900, 'center');
    } else if (type.startsWith('moving')) {
      // Thruster glow under moving platform
      const glow = 6 + Math.sin(levelTime * 12) * 2;
      ctx.fillStyle = 'rgba(255, 183, 3, 0.35)';
      ctx.beginPath();
      ctx.ellipse(sx + w / 2, y + 24, w * 0.32, glow, 0, 0, TAU);
      ctx.fill();
      text(type === 'movingH' ? '◀ ▶' : '▲ ▼', sx + w / 2, y + 12, 9, '#ffe8a3', 900, 'center');
    }
  }

  // ---------------------------------------------------------------------------
  // ARTICULATED CHARACTER RENDERER: "BOLT" (With Moving Arms, Hands, Legs & Feet!)
  // ---------------------------------------------------------------------------
  function drawArticulatedLimb(x0, y0, angle1, len1, angle2, len2, thickness, colorMain, colorJoint, pawColor) {
    const x1 = x0 + Math.sin(angle1) * len1;
    const y1 = y0 + Math.cos(angle1) * len1;
    const totalAngle2 = angle1 + angle2;
    const x2 = x1 + Math.sin(totalAngle2) * len2;
    const y2 = y1 + Math.cos(totalAngle2) * len2;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Upper & Lower Limb Segments
    ctx.strokeStyle = colorMain;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Knee / Elbow Joint Rivet
    ctx.fillStyle = colorJoint;
    ctx.beginPath();
    ctx.arc(x1, y1, thickness * 0.42, 0, TAU);
    ctx.fill();

    // Hand / Paw / Boot at the end of the limb
    ctx.fillStyle = pawColor;
    ctx.beginPath();
    ctx.ellipse(x2 + Math.sin(totalAngle2) * 2, y2 + 1, thickness * 0.68, thickness * 0.52, 0, 0, TAU);
    ctx.fill();

    return { x1, y1, x2, y2 };
  }

  function drawBolt() {
    const p = player;
    const cx = p.x - camX + p.w / 2;
    const cy = p.y + p.h / 2;
    const pose = window.Physics.computeBoltPose(p, levelTime);

    // 1. Draw Energy Conversion Motion Trail behind Bolt
    for (let i = p.trail.length - 1; i >= 0; i--) {
      const tr = p.trail[i];
      const alpha = (tr.life / 0.24) * 0.35;
      ctx.fillStyle = tr.energyType === 'potentialPeak'
        ? `rgba(255, 209, 102, ${alpha})`
        : `rgba(86, 239, 196, ${alpha})`;
      ctx.beginPath();
      ctx.arc(tr.x - camX, tr.y, 10 * (tr.life / 0.24), 0, TAU);
      ctx.fill();
    }

    // 2. Ground Shadow
    if (p.ground) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, p.y + p.h + 2, 16 * p.squashX, 4.5, 0, 0, TAU);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(cx, cy + pose.bodyBobY);

    // Parachute Glider Canopy (drawn above Bolt when gliding in air)
    if (p.airBrake) {
      ctx.save();
      const sway = Math.sin(levelTime * 6) * 0.08;
      ctx.rotate(sway);
      // Canopy suspension cords
      ctx.strokeStyle = '#ffe8a3';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-26, -34);
      ctx.lineTo(-6, -12);
      ctx.moveTo(26, -34);
      ctx.lineTo(6, -12);
      ctx.moveTo(0, -40);
      ctx.lineTo(0, -14);
      ctx.stroke();

      // Colorful segmented parachute dome
      const chuteGrad = ctx.createLinearGradient(-30, -52, 30, -30);
      chuteGrad.addColorStop(0, '#ff758f');
      chuteGrad.addColorStop(0.5, '#ffd166');
      chuteGrad.addColorStop(1, '#56efc4');
      ctx.fillStyle = chuteGrad;
      ctx.beginPath();
      ctx.arc(0, -30, 30, Math.PI, TAU);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Apply Squash & Stretch and Facing Direction
    ctx.scale(p.face * p.squashX, p.squashY);
    ctx.rotate(pose.torsoLean);

    // Battery Energy Core Color (Green -> Gold -> Red)
    const coreColor = p.energy > 50 ? '#56efc4' : p.energy > 22 ? '#ffd166' : '#ff5d73';

    // 3. Flowing Energy Tail (Wags with stride & arches during jumps like a cub's tail!)
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    const tailTipX = -22 - Math.cos(pose.tailWave) * 6;
    const tailTipY = 2 + Math.sin(pose.tailWave) * 12;
    ctx.quadraticCurveTo(-18, 10 + Math.sin(pose.tailWave) * 6, tailTipX, tailTipY);
    ctx.stroke();
    // Glowing tail tuft
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(tailTipX, tailTipY, 4, 0, TAU);
    ctx.fill();

    // 4. BACK LEG & BACK ARM (Rendered behind torso for depth)
    drawArticulatedLimb(
      -3, 8,
      pose.bHip, 8.5,
      -pose.bKnee, 8.5,
      5.2, '#b45309', '#78350f', '#f59e0b'
    );
    drawArticulatedLimb(
      -2, -3,
      pose.bShoulder, 7.5,
      pose.bElbow, 7.5,
      4.6, '#b45309', '#78350f', '#fde68a'
    );

    // 5. TORSO & CHEST ENERGY CORE
    const torsoGrad = ctx.createLinearGradient(0, -9, 0, 11);
    torsoGrad.addColorStop(0, '#ffd166');
    torsoGrad.addColorStop(1, '#ea580c');
    rounded(-9, -8, 18, 19, 8, torsoGrad, '#fff3b0', 1.6);

    // Glowing Chest Battery Gauge
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(2, 1, 5.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(2, 1, 3.6, 0, TAU);
    ctx.fill();

    // 6. EXPRESSIVE HEAD, CUB/LYNX EARS & VISOR EYES
    ctx.save();
    ctx.translate(1, -15);
    ctx.rotate(pose.headPitch);

    // Back Ear
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.moveTo(-8, -7);
    ctx.lineTo(-13, -16);
    ctx.lineTo(-2, -9);
    ctx.closePath();
    ctx.fill();

    // Head Shape
    rounded(-10, -9, 21, 16, 7.5, torsoGrad, '#fff3b0', 1.5);

    // Front Ear with golden inner tuft
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(4, -8);
    ctx.lineTo(10, -17);
    ctx.lineTo(1, -9);
    ctx.closePath();
    ctx.fill();

    // Dark Visor Faceplate
    rounded(-4, -6, 14, 9, 4.5, '#191636', '#4ea8de', 1);

    // Expressive Blinking / Action Eyes
    const isBlinking = (Math.floor(levelTime * 2.5) % 9 === 0) && p.animState === 'idle';
    ctx.fillStyle = coreColor;
    if (isBlinking) {
      ctx.fillRect(0, -2, 3.5, 1.5);
      ctx.fillRect(6, -2, 3.5, 1.5);
    } else {
      const eyeH = (p.animState === 'jump' || p.animState === 'fall') ? 2.6 : 2.1;
      ctx.beginPath();
      ctx.ellipse(2, -1.5, 1.9, eyeH, 0, 0, TAU);
      ctx.ellipse(7.5, -1.5, 1.9, eyeH, 0, 0, TAU);
      ctx.fill();
    }

    // Cheerful Mouth / Smile
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (p.exhaustedHopTimer > 0) {
      ctx.arc(4, 6, 2.2, 0, TAU);
    } else {
      ctx.arc(4, 4.5, 3, 0.15, Math.PI - 0.15);
    }
    ctx.stroke();
    ctx.restore();

    // 7. FRONT LEG & FRONT ARM (Rendered in front of torso for crisp action readability!)
    drawArticulatedLimb(
      2, 8,
      pose.fHip, 8.5,
      -pose.fKnee, 8.5,
      5.6, '#f59e0b', '#b45309', '#fff3b0'
    );
    drawArticulatedLimb(
      3, -2,
      pose.fShoulder, 7.8,
      pose.fElbow, 7.8,
      5.0, '#fbbf24', '#b45309', '#fffbeb'
    );

    // 8. CARRIED HEAVY CRATE (Held overhead by Bolt's raised hands!)
    if (p.carry) {
      rounded(-11, -39, 24, 19, 4, '#d97706', '#fef08a', 1.8);
      text('1.6x', 1, -29, 8, '#fffbeb', 900, 'center');
    }

    ctx.restore();

    // 9. LIVE PHYSICS FORCE VECTORS ON BOLT (When Learning Overlay / Hints are ON)
    if (settings.hints && screen === 'playing') {
      drawBoltForceVectors(p, cx, cy);
    }
  }

  /**
   * Draw real-time educational force vectors (Gravity Fg, Motion v, Friction Ff, Air Drag)
   * directly around Bolt so children see invisible physics forces in action!
   */
  function drawArrow(x1, y1, x2, y2, color, label = '') {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 8 * Math.cos(angle - 0.45), y2 - 8 * Math.sin(angle - 0.45));
    ctx.lineTo(x2 - 8 * Math.cos(angle + 0.45), y2 - 8 * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();

    if (label) {
      rounded(x2 - 28, y2 + (y2 > y1 ? 4 : -18), 56, 14, 5, 'rgba(15, 14, 34, 0.82)');
      text(label, x2, y2 + (y2 > y1 ? 11 : -11), 8.5, color, 800, 'center');
    }
    ctx.restore();
  }

  function drawBoltForceVectors(p, cx, cy) {
    // 1. Downward Gravity Vector (Always pulls downward while airborne or on slopes; stronger with Crate!)
    if (!p.ground || levelIndex === 1 || p.carry) {
      const gravLen = (p.carry ? 46 : 32);
      drawArrow(cx + 28, cy, cx + 28, cy + gravLen, '#ff9ebb', p.carry ? 'Gravity (Heavy)' : 'Gravity ↓');
    }

    // 2. Upward Air Resistance / Fan Lift Vector
    if (p.airBrake || p.inFan) {
      drawArrow(cx - 28, cy + 10, cx - 28, cy - 30, '#80ed99', p.inFan ? 'Fan Lift ↑' : 'Air Drag ↑');
    }

    // 3. Surface Friction Vector at Bolt's feet when moving on Ice / Sand / Rubber
    if (p.ground && Math.abs(p.vx) > 35 && ['ice', 'rough', 'rubber'].includes(p.surfaceType)) {
      const dir = -Math.sign(p.vx);
      const fLen = p.surfaceType === 'ice' ? 16 : p.surfaceType === 'rough' ? 38 : 44;
      const fLabel = p.surfaceType === 'ice' ? 'Low Friction' : 'Friction';
      drawArrow(cx, p.y + p.h + 8, cx + dir * fLen, p.y + p.h + 8, '#ffd166', fLabel);
    }
  }

  // ---------------------------------------------------------------------------
  // WORLD RENDERER (Fans, Platforms, Notes, Crate, Exit Portal, Hints)
  // ---------------------------------------------------------------------------
  function drawWorld() {
    const themeKey = level.theme || 'savanna';
    drawBackground(themeKey);

    // 1. Updraft Fans
    for (const f of level.fans) {
      const sx = f.x - camX;
      const windGrad = ctx.createLinearGradient(sx, f.y + f.h, sx, f.y);
      windGrad.addColorStop(0, 'rgba(144, 224, 239, 0.28)');
      windGrad.addColorStop(1, 'rgba(144, 224, 239, 0.03)');
      rounded(sx, f.y, f.w, f.h, 14, windGrad, 'rgba(144, 224, 239, 0.45)');

      // Rising animated wind stream lines
      ctx.strokeStyle = 'rgba(202, 240, 248, 0.55)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const lx = sx + 18 + (i * (f.w - 36)) / 4;
        const offset = ((levelTime * 110 + i * 35) % (f.h - 24));
        const ly = f.y + f.h - 14 - offset;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly - 18);
        ctx.stroke();
      }
      rounded(sx + 6, f.y + f.h - 14, f.w - 12, 14, 5, '#1d3557', '#90e0ef');
      text('▲ UPDRAFT FAN ▲', sx + f.w / 2, f.y + f.h - 7, 8.5, '#caf0f8', 900, 'center');
    }

    // 2. Platforms & Contextual Physics Labels
    for (const q of level.platforms) {
      const r = window.Physics.getPlatformState(q, levelTime);
      drawPlatform(r);

      if (settings.hints) {
        const cue = {
          spring: 'Spring stores Elastic Energy',
          ice: 'Ice: Low Friction (Slides!)',
          rough: 'Sand: High Friction (Slows!)',
          rubber: 'Rubber: High Grip Stop',
          charger: 'Charger: Refills Battery ⚡',
          movingH: 'Moving Platform: Shares Momentum',
          movingV: 'Moving Lift: Time Your Jump',
          rampDown: 'Downhill: Height -> Speed!',
          rampUp: 'Uphill: Speed -> Height!'
        }[q.type];

        if (cue && Math.abs(r.x + r.w / 2 - player.x) < 235) {
          const lx = r.x - camX + r.w / 2;
          const ly = r.y - 22;
          rounded(lx - 76, ly - 10, 152, 19, 7, 'rgba(18, 15, 38, 0.85)', 'rgba(255, 224, 158, 0.35)', 1);
          text(cue, lx, ly, 9, '#ffe8a3', 800, 'center');
        }
      }
    }

    // 3. Weight-Sensitive Pad in Level 9
    if (level.weightPad) {
      const [wx, wy, ww] = level.weightPad;
      const sx = wx - camX;
      const depressed = level.weightPadTriggered ? 4 : 0;
      rounded(sx, wy - 6 + depressed, ww, 8 - depressed, 3, level.weightPadTriggered ? '#56efc4' : '#ffb703', '#ffffff');
      if (settings.hints) {
        text(level.weightPadTriggered ? 'WEIGHT PAD ACTIVE ✓' : 'CARRY CRATE HERE', sx + ww / 2, wy - 16, 8.5, '#ffe8a3', 800, 'center');
      }
    }

    // 4. Collectible Golden Energy Notes
    for (const n of level.notes) {
      if (n.got) continue;
      const nx = n.x - camX;
      const ny = n.y + Math.sin(levelTime * 3.5 + n.x) * 5;
      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(Math.sin(levelTime * 2.2) * 0.1);

      // Glowing Aura
      ctx.fillStyle = 'rgba(255, 209, 102, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, TAU);
      ctx.fill();

      rounded(-12, -14, 24, 28, 6, '#ffd166', '#fffbeb', 1.8);
      text('📘', 0, 1, 13, '#1e1204', 900, 'center');
      ctx.restore();
    }

    // 5. Carryable Heavy Power Crate (Level 9)
    if (level.crate && !player.carry) {
      const cx = level.crate[0] - camX;
      const cy = level.crate[1];
      rounded(cx, cy, 30, 32, 6, '#d97706', '#fef08a', 2);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 5, cy + 5, 20, 22);
      text('MASS', cx + 15, cy + 13, 7.5, '#fffbeb', 900, 'center');
      text('1.6x', cx + 15, cy + 22, 8.5, '#fef08a', 900, 'center');

      if (settings.hints && Math.hypot(player.x - level.crate[0], player.y - level.crate[1]) < 150) {
        rounded(cx - 38, cy - 24, 106, 18, 6, 'rgba(18, 15, 38, 0.86)', '#ffd166');
        text('Press X or CRATE to Lift', cx + 15, cy - 15, 8.5, '#ffd166', 800, 'center');
      }
    }

    // 6. Swirling Quantum Exit Portal
    const ex = level.exit[0] - camX;
    const ey = level.exit[1];
    ctx.save();
    ctx.translate(ex + 24, ey + 2);

    // Outer & Inner Energy Rings
    const portalHalo = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    portalHalo.addColorStop(0, 'rgba(86, 239, 196, 0.75)');
    portalHalo.addColorStop(0.6, 'rgba(114, 9, 183, 0.45)');
    portalHalo.addColorStop(1, 'transparent');
    ctx.fillStyle = portalHalo;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 36, 0, 0, TAU);
    ctx.stroke();

    ctx.strokeStyle = '#56efc4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14 + Math.sin(levelTime * 5) * 2, 26, 0, 0, TAU);
    ctx.stroke();

    rounded(-24, 42, 48, 16, 6, '#240046', '#ffd166', 1.2);
    text('EXIT', 0, 50, 9, '#ffd166', 900, 'center');
    ctx.restore();

    // 7. Active Particles & Floating Text Popups
    for (const a of particles) {
      ctx.globalAlpha = Math.max(0, a.life / a.max);
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(a.x - camX, a.y, a.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 8. Draw Articulated Bolt Character
    drawBolt();

    for (const f of floaters) {
      ctx.globalAlpha = Math.min(1, f.life);
      rounded(f.x - camX - 88, f.y - 13, 176, 24, 8, 'rgba(18, 14, 38, 0.9)', 'rgba(255, 224, 158, 0.4)');
      text(f.s, f.x - camX, f.y - 1, 10, f.color || '#ffe8a3', 800, 'center');
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // EDUCATIONAL PHYSICS HUD (Stored, Kinetic, Potential Energy + Live Conversion)
  // ---------------------------------------------------------------------------
  function drawEnergyBar(label, icon, x, y, w, val, maxVal, barColor, statusTag) {
    const ratio = Math.max(0, Math.min(1, val / maxVal));
    text(`${icon} ${label}`, x, y, 9.5, '#dbe4ff', 800, 'left');
    text(`${Math.round(val)} ${statusTag}`, x + w, y, 9, '#ffe8a3', 800, 'right');

    rounded(x, y + 10, w, 9, 5, 'rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.2)', 1);
    if (ratio > 0.01) {
      rounded(x, y + 10, Math.max(8, w * ratio), 9, 5, barColor);
    }
  }

  function drawHUD() {
    // Top translucent HUD Dashboard
    rounded(14, 10, 932, 58, 16, 'rgba(18, 14, 38, 0.84)', 'rgba(255, 214, 138, 0.32)', 1.5);

    // Level Number, Title & Idea Badge
    rounded(24, 18, 54, 20, 6, '#ffd166');
    text(`LVL ${String(levelIndex + 1).padStart(2, '0')}`, 51, 28, 10, '#1d1204', 900, 'center');
    text(level.name, 86, 28, 14, '#ffffff', 850, 'left');
    text(level.idea, 24, 51, 10.5, '#b8ffea', 700, 'left');

    // 1. STORED ENERGY (Battery — Colourblind-safe status tags: FULL / MID / LOW!)
    const eVal = player.energy;
    const eColor = eVal > 55 ? '#56efc4' : eVal > 25 ? '#ffd166' : '#ff5d73';
    const eTag = settings.practice ? '(INF)' : eVal > 55 ? '(OK)' : eVal > 25 ? '(MID)' : '(LOW!)';
    drawEnergyBar('STORED', '⚡', 390, 24, 140, eVal, 100, eColor, eTag);

    // 2. KINETIC ENERGY (Motion / Speed)
    drawEnergyBar('MOTION (KINETIC)', '💨', 550, 24, 135, player.kineticEnergy, 100, '#4ea8de', '');

    // 3. POTENTIAL ENERGY (Height above Ground)
    drawEnergyBar('HEIGHT (POTENTIAL)', '⛰️', 705, 24, 135, player.potentialEnergy, 100, '#ffd166', '');

    // Live Energy Transfer Banner under the 3 bars
    text(`🔄 ${player.lastEnergyTransfer}`, 615, 54, 9.5, '#ffe8a3', 750, 'center');

    // In-Canvas Quick Pause / Hints Pill
    addButton(settings.hints ? 'VECTORS: ON' : 'VECTORS: OFF', 852, 20, 84, 38, toggleHints, settings.hints ? 'mint' : 'quiet', true);

    // Collectible Note Banner or Pause-and-Learn Hint Card
    if (noteBannerTime > 0) {
      rounded(190, 74, 580, 32, 10, 'rgba(26, 67, 50, 0.92)', '#56efc4', 2);
      text(noteBanner, 480, 90, 11.5, '#ffffff', 800, 'center');
    } else if (messageTime > 0) {
      rounded(180, 74, 600, 34, 10, 'rgba(48, 22, 58, 0.92)', '#ffd166', 2);
      text(message, 480, 91, 11.5, '#ffe8a3', 800, 'center');
    }
  }

  // ---------------------------------------------------------------------------
  // MENUS, LEVEL SELECT, GUIDE & POST-LEVEL RECAP WITH INTERACTIVE QUIZ
  // ---------------------------------------------------------------------------
  function drawModalPanel(w = 680, h = 450) {
    ctx.fillStyle = 'rgba(10, 8, 24, 0.72)';
    ctx.fillRect(0, 0, W, H);
    const x = (W - w) / 2;
    const y = (H - h) / 2;
    rounded(x, y, w, h, 24, 'rgba(24, 19, 49, 0.96)', 'rgba(255, 214, 138, 0.45)', 2);
    return { x, y, w, h };
  }

  function drawMenu() {
    drawBackground('savanna');
    buttons = [];

    // Demo animated Bolt running/leaping across a foreground branch on the title screen!
    const demoPlatform = { x: 330, y: 255, w: 300, type: 'plain' };
    camX = 0;
    drawPlatform(demoPlatform);

    if (!player) {
      player = window.Physics.createPlayer(460, 211, 100);
    }
    player.x = 464;
    player.y = 211 - Math.abs(Math.sin(menuTime * 3.2)) * 28;
    player.vy = -Math.cos(menuTime * 3.2) * 160;
    player.vx = 180;
    player.face = 1;
    player.ground = player.y >= 209;
    player.animState = player.ground ? 'run' : 'jump';
    player.stridePhase = menuTime * 9;
    drawBolt();

    // Hero Title Card
    rounded(190, 34, 580, 155, 24, 'rgba(20, 15, 42, 0.84)', 'rgba(255, 214, 138, 0.4)', 2);
    text('✨ INTERACTIVE PHYSICS ADVENTURE · AGES 9–12 ✨', 480, 62, 11, '#56efc4', 900, 'center');
    text('GRAVITY HOPPER', 480, 108, 44, '#ffd166', 900, 'center');
    text('Run, Leap, Bounce & Master the Forces of Energy with Bolt!', 480, 152, 13.5, '#e2eafc', 700, 'center');

    // Main Menu Buttons
    addButton('▶  PLAY ADVENTURE', 330, 310, 300, 54, () => initLevel(levelIndex), 'gold');
    addButton('🗺️  SELECT LEVEL (12)', 330, 376, 145, 42, () => { screen = 'levels'; updateTopBar(); }, 'quiet', true);
    addButton('📘  PHYSICS GUIDE', 485, 376, 145, 42, () => { screen = 'howto'; updateTopBar(); }, 'quiet', true);

    addButton(
      settings.practice ? '🧪 PRACTICE MODE: ON (UNLIMITED ENERGY)' : '🧪 PRACTICE MODE: OFF (NORMAL CHALLENGE)',
      330, 430, 300, 38,
      () => {
        settings.practice = !settings.practice;
        store.save({ ...store.load(), practice: settings.practice });
      },
      settings.practice ? 'mint' : 'quiet',
      true
    );

    text('100% Original · Offline Ready · Keyboard + Mobile & Tablet Touch Controls', 480, 505, 11, '#ffe8a3', 700, 'center');
  }

  function drawLevels() {
    drawBackground('twilight');
    const box = drawModalPanel(760, 490);
    buttons = [];

    text('CHOOSE YOUR SKY LAB LEVEL', 480, box.y + 38, 24, '#ffd166', 900, 'center');
    text('Earn up to ★★★ by finishing with spare Stored Energy and collecting the Golden Physics Note!', 480, box.y + 66, 11.5, '#cbd5e1', 650, 'center');

    const data = store.load();
    const unlocked = data.unlocked || 0;
    const starsMap = data.stars || {};

    window.LEVELS.forEach((lvl, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = box.x + 36 + col * 174;
      const y = box.y + 92 + row * 106;
      const open = i <= unlocked || settings.practice;
      const stars = starsMap[i] || 0;

      addButton(
        `${String(i + 1).padStart(2, '0')}. ${lvl.name}`,
        x, y, 160, 88,
        () => { if (open) initLevel(i); },
        open ? (i === levelIndex ? 'gold' : 'quiet') : 'locked',
        true
      );

      const subColor = open ? (i === levelIndex ? '#2b1903' : '#94a3b8') : '#64748b';
      text(lvl.label, x + 80, y + 22, 8.5, subColor, 850, 'center');

      if (open) {
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        text(starStr, x + 80, y + 68, 13, i === levelIndex ? '#1e1204' : '#ffd166', 900, 'center');
      } else {
        text('🔒 LOCKED', x + 80, y + 68, 9.5, '#64748b', 850, 'center');
      }
    });

    addButton('◀  BACK TO HOME', 380, box.y + 426, 200, 44, () => { screen = 'menu'; updateTopBar(); }, 'mint');
  }

  function drawHowto() {
    drawBackground('oasis');
    const box = drawModalPanel(760, 490);
    buttons = [];

    text('HOW TO PLAY & PHYSICS GUIDE', 480, box.y + 36, 23, '#ffd166', 900, 'center');

    // Tab Switcher: Player Controls vs. Parent/Teacher Guide
    addButton('🎮 CONTROLS & MECHANICS', 270, box.y + 62, 200, 34, () => { guideTab = 'controls'; }, guideTab === 'controls' ? 'gold' : 'quiet', true);
    addButton('🍎 PARENT & TEACHER GUIDE', 490, box.y + 62, 200, 34, () => { guideTab = 'teacher'; }, guideTab === 'teacher' ? 'gold' : 'quiet', true);

    if (guideTab === 'controls') {
      const rows = [
        ['MOVE & RUN', 'Use ◀ ▶ (or A/D), or slide your thumb across the mobile D-Pad.'],
        ['VARIABLE JUMP', 'Tap SPACE / JUMP for a low hop. Hold JUMP longer to leap higher (uses more energy!).'],
        ['LEDGE GRAB', 'Reach the edge of a cliff in mid-air and Bolt will heroically grab and pull up!'],
        ['3 ENERGY FORMS', 'Watch Stored (Battery) turn into Kinetic (Speed) and Potential (Height) energy.'],
        ['SURFACES & SLOPES', 'Ice slides far, Sand slows you down, Rubber grips tight, and Downhill Ramps add speed!'],
        ['GLIDE & CRATE', 'Hold DOWN / GLIDE to open Bolt’s parachute. Press X / CRATE to lift heavy loads.']
      ];
      rows.forEach((r, i) => {
        const ry = box.y + 126 + i * 46;
        rounded(box.x + 42, ry - 14, 155, 28, 8, 'rgba(86, 239, 196, 0.16)', '#56efc4', 1);
        text(r[0], box.x + 119, ry, 10, '#56efc4', 900, 'center');
        text(r[1], box.x + 212, ry, 12, '#f1f5f9', 650, 'left');
      });
    } else {
      text('Each level teaches one core physics concept through hands-on experimentation:', 480, box.y + 116, 12, '#b8ffea', 750, 'center');
      const concepts = [
        '• Lvl 1–2 (Energy & Gravity): Holding jump converts more Stored Energy; height creates Potential Energy.',
        '• Lvl 3 & 10 (Elastic Energy Transfer): Compressing a spring stores elastic energy and transfers it to Bolt.',
        '• Lvl 4 & 11 (Surface Friction): Ice reduces friction (sliding); rough sand & rubber increase friction.',
        '• Lvl 5 (Conservation & Budgeting): Energy cannot be created from nothing; finite batteries need smart hops.',
        '• Lvl 6–7 (Momentum & Slopes): Moving platforms share velocity; downhill ramps convert height into speed.',
        '• Lvl 8–9 (Air Drag & Mass): Parachutes & fans oppose gravity; carrying mass (1.6x crate) requires more force.'
      ];
      concepts.forEach((line, i) => {
        text(line, box.x + 52, box.y + 150 + i * 38, 12, '#f8fafc', 650, 'left');
      });
      text('Tip: Press H (or VECTORS: ON) anytime to show live Gravity, Friction, and Lift arrows on Bolt!', 480, box.y + 390, 11.5, '#ffd166', 800, 'center');
    }

    addButton('GOT IT — BACK TO GAME', 360, box.y + 426, 240, 44, () => { screen = 'menu'; updateTopBar(); }, 'mint');
  }

  function drawRecapModal() {
    const box = drawModalPanel(660, 440);
    buttons = [];

    const starsStr = settings.practice ? '🧪 PRACTICE RUN' : '★'.repeat(lastEarnedStars) + '☆'.repeat(3 - lastEarnedStars);
    text(starsStr, 480, box.y + 38, 22, '#ffd166', 900, 'center');
    text(`LEVEL ${levelIndex + 1} COMPLETE!`, 480, box.y + 68, 22, '#ffffff', 900, 'center');

    // 3-Line Post-Level Physics Recap
    rounded(box.x + 36, box.y + 92, box.w - 72, 92, 14, 'rgba(255, 255, 255, 0.06)', 'rgba(86, 239, 196, 0.35)');
    text(`1. What you did: ${recapLines[0]}`, 480, box.y + 114, 12, '#e2e8f0', 700, 'center');
    text(`2. Physics Idea: ${recapLines[1]}`, 480, box.y + 140, 12.5, '#56efc4', 850, 'center');
    text(`3. Think about it: ${recapLines[2]}`, 480, box.y + 166, 11.5, '#ffd166', 750, 'center');

    // Interactive Quick Check Question
    if (level.quiz) {
      text(`🧠 Quick Physics Check: ${level.quiz.q}`, 480, box.y + 208, 12.5, '#ffffff', 850, 'center');
      level.quiz.options.forEach((opt, idx) => {
        const oy = box.y + 226 + idx * 38;
        let style = 'quiet';
        if (quizAnswered) {
          if (idx === level.quiz.correct) style = 'mint';
          else if (idx === quizSelected) style = 'locked';
        }
        addButton(
          `${idx === 0 ? 'A' : idx === 1 ? 'B' : 'C'}.  ${opt}`,
          box.x + 56, oy, box.w - 112, 32,
          () => {
            quizSelected = idx;
            quizAnswered = true;
            playSfx(idx === level.quiz.correct ? 'note' : 'click');
          },
          style,
          true
        );
      });

      if (quizAnswered) {
        const isRight = quizSelected === level.quiz.correct;
        text(
          isRight ? '✅ Spot on! You think like a real physicist!' : '💡 Good try! Look at Choice A above to see why!',
          480, box.y + 354, 12, isRight ? '#56efc4' : '#ffd166', 850, 'center'
        );
      }
    }

    // Bottom Navigation Buttons
    if (settings.practice) {
      addButton('↻ PLAY AGAIN', 270, box.y + 374, 190, 44, () => initLevel(levelIndex), 'gold');
      addButton('🗺️ LEVEL SELECT', 480, box.y + 374, 190, 44, () => { screen = 'levels'; updateTopBar(); }, 'quiet', true);
    } else {
      addButton(
        levelIndex === window.LEVELS.length - 1 ? '🏆 FINISH ADVENTURE!' : '▶ NEXT LEVEL',
        265, box.y + 374, 215, 46,
        () => {
          if (levelIndex === window.LEVELS.length - 1) screen = 'won';
          else initLevel(levelIndex + 1);
          updateTopBar();
        },
        'gold'
      );
      addButton('↻ REPLAY', 495, box.y + 374, 140, 46, () => initLevel(levelIndex), 'quiet', true);
    }
  }

  function drawPausedModal() {
    const box = drawModalPanel(460, 340);
    buttons = [];
    text('GAME PAUSED', 480, box.y + 46, 25, '#ffd166', 900, 'center');
    text('Bolt’s stored energy is safe while you take a breather.', 480, box.y + 78, 12, '#cbd5e1', 650, 'center');

    addButton('▶ KEEP PLAYING', 350, box.y + 108, 260, 46, () => { screen = 'playing'; updateTopBar(); }, 'gold');
    addButton('↻ RESTART LEVEL (R)', 350, box.y + 164, 260, 40, () => initLevel(levelIndex), 'quiet', true);
    addButton(
      settings.practice ? '🧪 PRACTICE MODE: ON' : '🧪 PRACTICE MODE: OFF',
      350, box.y + 214, 260, 40,
      () => {
        settings.practice = !settings.practice;
        store.save({ ...store.load(), practice: settings.practice });
        resetPlayerOnly();
      },
      settings.practice ? 'mint' : 'quiet',
      true
    );
    addButton('🏠 MAIN MENU', 350, box.y + 264, 260, 40, () => { screen = 'menu'; updateTopBar(); }, 'quiet', true);
  }

  function drawVictoryModal() {
    const box = drawModalPanel(640, 390);
    buttons = [];
    text('🏆 SKY LAB ESCAPE COMPLETE! 🏆', 480, box.y + 52, 26, '#ffd166', 900, 'center');
    text('Bolt leaped free from the floating physics laboratory!', 480, box.y + 98, 15, '#ffffff', 800, 'center');
    text('You mastered Gravity, Stored Energy, Kinetic Motion, Potential Height,', 480, box.y + 136, 13, '#56efc4', 750, 'center');
    text('Elastic Springs, Surface Friction, Slopes, Momentum, Air Drag, and Mass!', 480, box.y + 162, 13, '#56efc4', 750, 'center');
    text('Question to share: Which physics force helped Bolt the most on your journey?', 480, box.y + 206, 12.5, '#ffe8a3', 800, 'center');

    addButton('▶ PLAY AGAIN FROM LEVEL 1', 250, box.y + 265, 225, 48, () => initLevel(0), 'gold');
    addButton('🗺️ CHOOSE ANY LEVEL', 490, box.y + 265, 215, 48, () => { screen = 'levels'; updateTopBar(); }, 'mint');
  }

  // ---------------------------------------------------------------------------
  // MASTER RENDER & ANIMATION LOOP
  // ---------------------------------------------------------------------------
  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (screen === 'menu') {
      drawMenu();
    } else if (screen === 'levels') {
      drawLevels();
    } else if (screen === 'howto') {
      drawHowto();
    } else {
      buttons = [];
      drawWorld();
      drawHUD();
      if (screen === 'paused') drawPausedModal();
      else if (screen === 'recap') drawRecapModal();
      else if (screen === 'won') drawVictoryModal();
    }
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    draw();
    jumpPressed = false;
    requestAnimationFrame(loop);
  }

  updateSoundIcon();
  hintsBtn.classList.toggle('active', settings.hints);
  updateTopBar();
  requestAnimationFrame(loop);
})();
