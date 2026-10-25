/**
 * GRAVITY HOPPER — 2D Physics & Articulated Character Kinematics Engine
 *
 * Implements:
 *  1. Responsive 16-bit era platforming physics (coyote time, jump buffer, apex hang-time,
 *     variable hold-to-jump energy conversion, and heroic ledge-grabbing).
 *  2. Educational physics simulation: Gravity (Fg), Surface Friction (ice, rough sand, rubber),
 *     Slope acceleration (g * sin(theta)), Elastic Spring compression & release,
 *     Moving Platform momentum transfer, Air Resistance / Updraft Fans, and Mass/Weight.
 *  3. Live Energy Accounting: Stored Energy (Battery), Kinetic Energy (Motion),
 *     Gravitational Potential Energy (Height), and Elastic Spring Energy.
 *  4. Multi-jointed limb kinematics for Bolt (head, torso, swinging arms/hands, striding legs/feet, tail).
 */
(() => {
  'use strict';

  // Physical & Game-Feel Constants (pixels & seconds on a 960x600 stage)
  const CONSTANTS = {
    GRAVITY_UP: 860,         // Base gravity during upward movement
    GRAVITY_APEX: 610,       // Reduced gravity near jump peak for graceful hang-time
    GRAVITY_DOWN: 1080,      // Weightier downward gravity for crisp landings
    GRAVITY_GLIDE: 360,      // Reduced effective gravity when parachute glider is open
    TERMINAL_VEL: 640,       // Max falling speed normally
    TERMINAL_GLIDE: 135,     // Max falling speed with parachute open
    JUMP_INITIAL_VY: -315,   // Instant upward impulse on tap
    JUMP_HOLD_ACCEL: -1480,  // Extra upward thrust while holding Jump during ascent
    JUMP_MAX_HOLD: 0.25,     // Max seconds that holding Jump boosts upward height
    JUMP_BASE_COST: 7,       // Stored energy used by a minimal tap hop
    JUMP_HOLD_COST_RATE: 68, // Stored energy used per second of holding Jump
    COYOTE_TIME: 0.12,       // Grace period after leaving a ledge where Jump still works
    JUMP_BUFFER: 0.13,       // Grace period when pressing Jump slightly before landing
    FLOOR_BASELINE_Y: 520,   // Reference floor Y for Gravitational Potential Energy (h = 0)
    CEILING_Y: 74            // Soft top boundary below HUD
  };

  // Surface Material Properties (Friction, Acceleration, Top Speed)
  const SURFACES = {
    plain:   { accel: 1120, decel: 960,  maxSpeed: 245, dragFactor: 0.0,  bounce: 0,    label: 'Normal Ground' },
    ice:     { accel: 460,  decel: 75,   maxSpeed: 315, dragFactor: 0.0,  bounce: 0,    label: 'Low Friction (Ice)' },
    rough:   { accel: 720,  decel: 1550, maxSpeed: 155, dragFactor: 0.35, bounce: 0,    label: 'High Friction (Sand)' },
    rubber:  { accel: 1450, decel: 2200, maxSpeed: 235, dragFactor: 0.0,  bounce: 0.22, label: 'High Grip (Rubber)' },
    spring:  { accel: 1000, decel: 950,  maxSpeed: 240, dragFactor: 0.0,  bounce: 1.0,  label: 'Elastic Spring' },
    charger: { accel: 1100, decel: 980,  maxSpeed: 240, dragFactor: 0.0,  bounce: 0,    label: 'Energy Charger' },
    movingH: { accel: 1120, decel: 1020, maxSpeed: 245, dragFactor: 0.0,  bounce: 0,    label: 'Moving Platform' },
    movingV: { accel: 1120, decel: 1020, maxSpeed: 245, dragFactor: 0.0,  bounce: 0,    label: 'Moving Lift' },
    rampDown:{ accel: 1150, decel: 780,  maxSpeed: 325, dragFactor: 0.0,  bounce: 0,    label: 'Downhill Slope' },
    rampUp:  { accel: 980,  decel: 1120, maxSpeed: 215, dragFactor: 0.0,  bounce: 0,    label: 'Uphill Slope' }
  };

  /**
   * Create a fresh Bolt player state at the level's starting coordinates.
   */
  function createPlayer(startX, startY, initialEnergy) {
    return {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      w: 32,
      h: 44,
      face: 1,
      ground: false,
      surfaceType: 'plain',
      standingPlatform: null,
      slopeAngle: 0,

      // Energy & Mass
      energy: initialEnergy,
      maxEnergy: 100,
      kineticEnergy: 0,
      potentialEnergy: 0,
      springEnergy: 0,
      lastEnergyTransfer: 'Stored -> Ready',
      mass: 1.0,
      carry: false,

      // Jump & Ledge-Grab State
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      jumpHoldTimer: 0,
      isJumpingUp: false,
      springCompress: 0,      // 0..1 compression when on a spring
      springTimer: 0,
      activeSpring: null,
      ledgeGrab: null,        // { x, y, dir, timer, plat } when hanging/climbing a ledge
      airBrake: false,

      // Animation & Feel State
      animState: 'idle',      // idle, walk, run, skid, jump, apex, fall, glide, spring, ledge, land
      stridePhase: 0,
      idleTime: 0,
      squashX: 1,
      squashY: 1,
      tilt: 0,
      landImpact: 0,
      exhaustedHopTimer: 0,
      trail: []
    };
  }

  /**
   * Compute live bounding box and velocity for any platform (including moving platforms & ramps).
   */
  function getPlatformState(p, levelTime) {
    let offsetX = 0;
    let offsetY = 0;
    let vx = 0;
    let vy = 0;

    if (p.type === 'movingH') {
      const freq = 0.9;
      const amp = 66;
      offsetX = Math.sin(levelTime * freq + p.phase) * amp;
      vx = Math.cos(levelTime * freq + p.phase) * amp * freq;
    } else if (p.type === 'movingV') {
      const freq = 1.0;
      const amp = 46;
      offsetY = Math.sin(levelTime * freq + p.phase) * amp;
      vy = Math.cos(levelTime * freq + p.phase) * amp * freq;
    }

    const x = p.baseX + offsetX;
    const y = p.baseY + offsetY;
    const isRamp = p.type === 'rampDown' || p.type === 'rampUp';

    return {
      x,
      y,
      w: p.w,
      h: isRamp ? 22 : 18,
      type: p.type,
      vx,
      vy,
      raw: p
    };
  }

  /**
   * Return the surface Y coordinate of a platform at a given horizontal X coordinate.
   */
  function getSurfaceY(platRect, worldX) {
    const t = Math.max(0, Math.min(1, (worldX - platRect.x) / platRect.w));
    if (platRect.type === 'rampDown') {
      return platRect.y + 90 * t;
    }
    if (platRect.type === 'rampUp') {
      return platRect.y + 90 * (1 - t);
    }
    return platRect.y;
  }

  /**
   * Main physics step for Bolt. Returns an array of feedback events (sfx, particles, messages).
   */
  function stepPhysics(player, level, input, dt, levelTime, settings) {
    const events = [];
    const p = player;
    const wasGround = p.ground;
    const oldX = p.x;
    const oldY = p.y;

    // Update mass based on whether Bolt is carrying the heavy crate
    p.mass = p.carry ? 1.6 : 1.0;

    // Decay timers & springy squash-and-stretch
    p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
    p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
    p.landImpact = Math.max(0, p.landImpact - dt * 4);
    p.exhaustedHopTimer = Math.max(0, p.exhaustedHopTimer - dt);
    p.squashX += (1 - p.squashX) * Math.min(1, dt * 14);
    p.squashY += (1 - p.squashY) * Math.min(1, dt * 14);

    if (input.jumpPressed) {
      p.jumpBufferTimer = CONSTANTS.JUMP_BUFFER;
    }

    // -------------------------------------------------------------------------
    // 1. LEDGE GRAB & CLIMB-UP STATE (1994 Platformer Heroic Ledge Catch)
    // -------------------------------------------------------------------------
    if (p.ledgeGrab) {
      p.ledgeGrab.timer += dt;
      p.vx = 0;
      p.vy = 0;
      p.animState = 'ledge';
      const lg = p.ledgeGrab;
      const pr = getPlatformState(lg.plat, levelTime);
      const edgeX = lg.dir > 0 ? pr.x - p.w + 6 : pr.x + pr.w - 6;
      const edgeY = getSurfaceY(pr, lg.dir > 0 ? pr.x + 2 : pr.x + pr.w - 2);

      // Smoothly pull Bolt up onto the ledge over 0.24s (or faster if holding Up/Jump/towards ledge)
      const speedUp = (input.jumpHeld || (lg.dir > 0 && input.right) || (lg.dir < 0 && input.left)) ? 1.5 : 1.0;
      lg.timer += dt * (speedUp - 1);
      const progress = Math.min(1, lg.timer / 0.24);

      if (progress < 0.55) {
        // Hanging & pulling chest up
        p.x = edgeX;
        p.y = edgeY - 12 - progress * 36;
      } else {
        // Stepping onto the top of the ledge
        const stepT = (progress - 0.55) / 0.45;
        p.x = edgeX + lg.dir * (18 * stepT);
        p.y = edgeY - p.h;
      }

      if (progress >= 1) {
        p.x = lg.dir > 0 ? pr.x + 8 : pr.x + pr.w - p.w - 8;
        p.y = edgeY - p.h;
        p.ground = true;
        p.coyoteTimer = CONSTANTS.COYOTE_TIME;
        p.ledgeGrab = null;
        p.squashX = 1.12;
        p.squashY = 0.88;
        events.push({ type: 'sfx', sound: 'step' });
      }
      updateEnergyMetrics(p, settings);
      return events;
    }

    // -------------------------------------------------------------------------
    // 2. SPRING COMPRESSION PHASE (Elastic Potential Energy Storage)
    // -------------------------------------------------------------------------
    if (p.activeSpring) {
      p.springTimer += dt;
      p.animState = 'spring';
      const sp = getPlatformState(p.activeSpring, levelTime);
      // Holding Jump while the spring compresses stores even more elastic energy!
      const targetCompress = input.jumpHeld ? 1.0 : Math.max(0.68, p.springCompress);
      p.springCompress += (targetCompress - p.springCompress) * Math.min(1, dt * 18);
      p.springEnergy = Math.round(p.springCompress * 100);
      p.y = sp.y - p.h + p.springCompress * 9;
      p.vx *= Math.pow(0.85, dt * 60);
      p.squashX = 1.24;
      p.squashY = 0.76;
      p.lastEnergyTransfer = 'Spring Compression -> Elastic Energy';

      if (p.springTimer >= 0.14) {
        const launchPower = (475 + p.springCompress * 195) / Math.sqrt(p.mass);
        p.vy = -launchPower;
        p.y = sp.y - p.h - 2;
        p.ground = false;
        p.coyoteTimer = 0;
        p.isJumpingUp = true;
        p.jumpHoldTimer = 0;
        p.energy = Math.min(p.maxEnergy, p.energy + 10);
        p.squashX = 0.76;
        p.squashY = 1.32;
        p.lastEnergyTransfer = 'Elastic Energy -> Motion (Kinetic)';
        if (p.activeSpring) {
          p.activeSpring.boingTime = 0.45;
        }
        events.push({
          type: 'springLaunch',
          x: p.x + p.w / 2,
          y: sp.y,
          power: p.springCompress
        });
        p.activeSpring = null;
        p.springCompress = 0;
        p.springTimer = 0;
        p.springEnergy = 0;
      } else {
        updateEnergyMetrics(p, settings);
        return events;
      }
    }

    // -------------------------------------------------------------------------
    // 3. CARRYING MOVING PLATFORM MOTION (Momentum Inheritance)
    // -------------------------------------------------------------------------
    if (wasGround && p.standingPlatform) {
      const prevPlat = getPlatformState(p.standingPlatform, levelTime - dt);
      const currPlat = getPlatformState(p.standingPlatform, levelTime);
      const dx = currPlat.x - prevPlat.x;
      const dy = currPlat.y - prevPlat.y;
      p.x += dx;
      p.y += dy;
    }

    // -------------------------------------------------------------------------
    // 4. HORIZONTAL MOVEMENT, SURFACE FRICTION & SLOPE GRAVITY
    // -------------------------------------------------------------------------
    const surf = SURFACES[wasGround ? p.surfaceType : 'plain'] || SURFACES.plain;
    const airFactor = wasGround ? 1.0 : 0.72;
    const massAccelPenalty = 1 / Math.pow(p.mass, 0.45);
    const accel = surf.accel * airFactor * massAccelPenalty;
    const decel = wasGround ? surf.decel : 140;
    const maxSpeed = surf.maxSpeed * (p.carry ? 0.82 : 1.0);

    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    if (moveDir !== 0) {
      p.face = moveDir;
      // Turning around on high-friction vs low-friction surfaces
      const isReversing = (moveDir > 0 && p.vx < -20) || (moveDir < 0 && p.vx > 20);
      const turnRate = isReversing ? (wasGround ? (p.surfaceType === 'ice' ? accel * 0.45 : accel * 1.65) : accel) : accel;
      p.vx += moveDir * turnRate * dt;

      if (isReversing && wasGround && Math.abs(p.vx) > 95) {
        p.animState = 'skid';
        if (Math.random() < 0.35) {
          events.push({ type: 'surfaceParticle', surface: p.surfaceType, x: p.x + p.w / 2, y: p.y + p.h });
        }
      }
    } else {
      // Apply surface friction deceleration when no direction is held
      const drop = decel * dt;
      if (Math.abs(p.vx) <= drop) {
        p.vx = 0;
      } else {
        p.vx -= Math.sign(p.vx) * drop;
      }
    }

    // Slope tangential gravity (Downhill speeds Bolt up; Uphill slows Bolt down!)
    if (wasGround && p.slopeAngle !== 0) {
      const slopeGravity = 520 * Math.sin(p.slopeAngle); // positive when sloping down to the right
      p.vx += slopeGravity * dt;
      if ((p.slopeAngle > 0 && p.vx > 10) || (p.slopeAngle < 0 && p.vx < -10)) {
        p.lastEnergyTransfer = 'Height (Potential) -> Speed (Kinetic)';
      } else if ((p.slopeAngle > 0 && p.vx < -10) || (p.slopeAngle < 0 && p.vx > 10)) {
        p.lastEnergyTransfer = 'Speed (Kinetic) -> Height (Potential)';
      }
    }

    // Clamp horizontal speed (allow extra top speed when sliding downhill or on ice)
    const effectiveMax = (wasGround && (p.surfaceType === 'ice' || p.slopeAngle !== 0))
      ? maxSpeed * 1.25
      : maxSpeed;
    if (Math.abs(p.vx) > effectiveMax) {
      p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx) - effectiveMax, 520 * dt);
    }

    // Emit surface friction cues (sand dust, ice sparkles)
    if (wasGround && Math.abs(p.vx) > 70 && Math.random() < 0.35) {
      events.push({ type: 'surfaceParticle', surface: p.surfaceType, x: p.x + p.w / 2, y: p.y + p.h });
    }

    // -------------------------------------------------------------------------
    // 5. IMMEDIATE-RESPONSE VARIABLE JUMP & STORED ENERGY CONSUMPTION
    // -------------------------------------------------------------------------
    const canJumpNow = wasGround || p.coyoteTimer > 0;
    if (p.jumpBufferTimer > 0 && canJumpNow) {
      p.jumpBufferTimer = 0;
      p.coyoteTimer = 0;
      p.ground = false;

      // Inherit horizontal momentum if jumping off a moving platform
      if (p.standingPlatform) {
        const platState = getPlatformState(p.standingPlatform, levelTime);
        p.vx += platState.vx * 0.55;
        if (platState.vy < 0) {
          p.vy += platState.vy * 0.35;
        }
      }

      const baseCost = settings.practice ? 0 : CONSTANTS.JUMP_BASE_COST * p.mass;

      // Enforce Core Educational Rule #7: Cannot jump properly when Stored Energy is depleted!
      if (!settings.practice && p.energy < 2) {
        p.vy = -105; // Tiny exhausted hop showing battery is empty
        p.isJumpingUp = false;
        p.exhaustedHopTimer = 1.2;
        p.squashX = 1.18;
        p.squashY = 0.84;
        p.lastEnergyTransfer = 'Battery Depleted! Need Charger or Restart (R)';
        events.push({ type: 'emptyJump', x: p.x + p.w / 2, y: p.y + p.h });
      } else {
        const availRatio = settings.practice ? 1 : Math.min(1, p.energy / baseCost);
        p.energy = Math.max(0, p.energy - baseCost * availRatio);
        const jumpPower = CONSTANTS.JUMP_INITIAL_VY * (0.7 + 0.3 * availRatio) / Math.pow(p.mass, 0.32);
        p.vy = jumpPower;
        p.isJumpingUp = true;
        p.jumpHoldTimer = 0;
        p.squashX = 0.78;
        p.squashY = 1.28;
        p.lastEnergyTransfer = 'Stored Energy -> Motion (Kinetic)';
        events.push({ type: 'jump', x: p.x + p.w / 2, y: p.y + p.h, power: 0.4 });
      }
      p.standingPlatform = null;
    }

    // Sustained upward jump boost while holding the Jump button (converts more Stored Energy -> Height!)
    if (p.isJumpingUp && input.jumpHeld && p.vy < 0 && p.jumpHoldTimer < CONSTANTS.JUMP_MAX_HOLD) {
      const holdDt = Math.min(dt, CONSTANTS.JUMP_MAX_HOLD - p.jumpHoldTimer);
      const holdCost = settings.practice ? 0 : CONSTANTS.JUMP_HOLD_COST_RATE * p.mass * holdDt;

      if (settings.practice || p.energy >= holdCost) {
        p.energy = Math.max(0, p.energy - holdCost);
        p.vy += (CONSTANTS.JUMP_HOLD_ACCEL / Math.pow(p.mass, 0.35)) * holdDt;
        p.jumpHoldTimer += holdDt;
        p.lastEnergyTransfer = 'Holding Jump: Stored -> Extra Height!';
      } else {
        p.isJumpingUp = false;
      }
    }

    // Crisp variable jump cutoff when player releases Jump early
    if (p.isJumpingUp && !input.jumpHeld) {
      if (p.vy < -185) {
        p.vy *= 0.65;
      }
      p.isJumpingUp = false;
    }
    if (p.vy >= 0) {
      p.isJumpingUp = false;
    }

    // -------------------------------------------------------------------------
    // 6. GRAVITY, APEX HANG-TIME, PARACHUTE GLIDER & UPDRAFT FANS
    // -------------------------------------------------------------------------
    p.airBrake = !wasGround && input.down && p.vy > -20;

    let gravity = CONSTANTS.GRAVITY_DOWN;
    if (p.airBrake && p.vy > 0) {
      gravity = CONSTANTS.GRAVITY_GLIDE;
      p.lastEnergyTransfer = 'Air Resistance slows downward motion!';
    } else if (Math.abs(p.vy) < 82 && !wasGround) {
      gravity = CONSTANTS.GRAVITY_APEX;
      p.lastEnergyTransfer = 'Peak Height = Max Potential Energy!';
    } else if (p.vy < 0) {
      gravity = CONSTANTS.GRAVITY_UP;
    } else if (!wasGround && p.vy > 110) {
      p.lastEnergyTransfer = 'Gravity pulls down: Height -> Speed!';
    }

    p.vy += gravity * dt;

    // Updraft Fans push upward against gravity
    let inFan = false;
    for (const f of level.fans) {
      if (p.x + p.w > f.x && p.x < f.x + f.w && p.y + p.h > f.y && p.y < f.y + f.h) {
        inFan = true;
        const fanBoost = p.airBrake ? 1280 : 940;
        p.vy = Math.max(-175, p.vy - fanBoost * dt);
        p.lastEnergyTransfer = 'Fan Updraft -> Upward Lift Energy!';
      }
    }
    p.inFan = inFan;

    // Terminal velocity cap
    const maxFall = p.airBrake ? CONSTANTS.TERMINAL_GLIDE : CONSTANTS.TERMINAL_VEL;
    if (p.vy > maxFall) {
      p.vy = maxFall;
    }

    // -------------------------------------------------------------------------
    // 7. INTEGRATE POSITION & PLATFORM / RAMP / LEDGE COLLISIONS
    // -------------------------------------------------------------------------
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Keep within left wall and top HUD ceiling
    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }
    if (p.y < CONSTANTS.CEILING_Y) {
      p.y = CONSTANTS.CEILING_Y;
      p.vy = Math.max(0, p.vy);
    }

    p.ground = false;
    p.standingPlatform = null;
    p.slopeAngle = 0;

    const footCenterX = p.x + p.w * 0.5;

    for (const q of level.platforms) {
      if (q.boingTime > 0) {
        q.boingTime = Math.max(0, q.boingTime - dt);
      }
      const r = getPlatformState(q, levelTime);
      const overlapX = p.x + p.w - 4 > r.x && p.x + 4 < r.x + r.w;
      const surfaceY = getSurfaceY(r, footCenterX);

      // Sticky slope following when walking downhill so Bolt doesn't step off into mid-air
      const isRamp = q.type === 'rampDown' || q.type === 'rampUp';
      const snapTolerance = (wasGround && isRamp && p.vy >= 0) ? 18 : 11;

      if (overlapX && p.vy >= 0 && oldY + p.h <= surfaceY + snapTolerance && p.y + p.h >= surfaceY - (wasGround && isRamp ? 8 : 0)) {
        const impactVy = p.vy;
        p.y = surfaceY - p.h;

        // Elastic Spring Platform: Enter visible compression phase!
        if (q.type === 'spring') {
          p.activeSpring = q;
          p.springTimer = 0;
          // Higher fall speed or heavier mass compresses the spring deeper
          p.springCompress = Math.min(1, Math.max(0.45, (impactVy / 460) * p.mass));
          p.vy = 0;
          p.ground = true;
          events.push({ type: 'springCompress', x: footCenterX, y: surfaceY });
          break;
        }

        // Rubber Platform: High grip + gentle cushioned micro-bounce on heavy drops
        p.vy = 0;
        p.ground = true;
        p.coyoteTimer = CONSTANTS.COYOTE_TIME;
        p.surfaceType = q.type;
        p.standingPlatform = q;

        if (q.type === 'rampDown') {
          p.slopeAngle = Math.atan2(90, r.w);
        } else if (q.type === 'rampUp') {
          p.slopeAngle = -Math.atan2(90, r.w);
        }

        // Landing feedback (squash & dust)
        if (!wasGround && impactVy > 90) {
          const strength = Math.min(1, impactVy / 480);
          p.squashX = 1 + 0.24 * strength;
          p.squashY = 1 - 0.22 * strength;
          p.landImpact = strength;
          events.push({ type: 'land', x: footCenterX, y: surfaceY, strength, surface: q.type });
        }

        // Charger Pad: Replenish Stored Energy
        if (q.type === 'charger' && p.energy < p.maxEnergy) {
          p.energy = Math.min(p.maxEnergy, p.energy + 44 * dt);
          p.lastEnergyTransfer = 'Charger Pad -> Stored Battery Energy!';
          if (Math.random() < 0.3) {
            events.push({ type: 'chargeSpark', x: footCenterX, y: surfaceY });
          }
        }
        break;
      }

      // Check for 1994 Lion-King style Ledge Grab if Bolt is airborne near a platform's edge
      if (!p.ground && !wasGround && !p.carry && p.vy > -120 && p.vy < 340 && !isRamp && q.type !== 'spring') {
        const handY = p.y + 10;
        // Grabbing Left Edge of platform while facing/moving right
        if (p.face > 0 && (input.right || p.vx > 10)) {
          const distToLeftEdge = Math.abs((p.x + p.w) - r.x);
          if (distToLeftEdge < 14 && handY >= r.y - 10 && handY <= r.y + 22) {
            p.ledgeGrab = { x: r.x, y: r.y, dir: 1, timer: 0, plat: q };
            events.push({ type: 'ledgeGrab', x: r.x, y: r.y });
            break;
          }
        }
        // Grabbing Right Edge of platform while facing/moving left
        if (p.face < 0 && (input.left || p.vx < -10)) {
          const distToRightEdge = Math.abs(p.x - (r.x + r.w));
          if (distToRightEdge < 14 && handY >= r.y - 10 && handY <= r.y + 22) {
            p.ledgeGrab = { x: r.x + r.w, y: r.y, dir: -1, timer: 0, plat: q };
            events.push({ type: 'ledgeGrab', x: r.x + r.w, y: r.y });
            break;
          }
        }
      }
    }

    // Remember coyote time if Bolt just walked off a platform edge without jumping
    if (wasGround && !p.ground && !p.isJumpingUp && !p.activeSpring) {
      p.coyoteTimer = CONSTANTS.COYOTE_TIME;
    }

    // -------------------------------------------------------------------------
    // 8. ANIMATION STATE MACHINE & MOTION TRAIL
    // -------------------------------------------------------------------------
    const speedX = Math.abs(p.vx);
    if (p.ground) {
      if (speedX < 12) {
        p.animState = 'idle';
        p.idleTime += dt;
      } else if (p.animState !== 'skid') {
        p.animState = speedX > 165 ? 'run' : 'walk';
        p.stridePhase += (speedX * 0.048) * dt * 60;
        p.idleTime = 0;
      }
    } else {
      p.idleTime = 0;
      if (p.airBrake) {
        p.animState = 'glide';
      } else if (Math.abs(p.vy) < 80) {
        p.animState = 'apex';
      } else if (p.vy < 0) {
        p.animState = 'jump';
      } else {
        p.animState = 'fall';
      }
    }

    // Smooth torso lean into horizontal velocity & slopes
    const targetTilt = p.ground
      ? p.slopeAngle * 0.75 + (p.vx / 280) * 0.16
      : Math.max(-0.28, Math.min(0.28, (p.vx / 300) * 0.22));
    p.tilt += (targetTilt - p.tilt) * Math.min(1, dt * 12);

    // Record kinetic motion trail points when moving fast
    const totalSpeed = Math.hypot(p.vx, p.vy);
    if (totalSpeed > 150) {
      p.trail.unshift({
        x: p.x + p.w / 2,
        y: p.y + p.h / 2,
        vy: p.vy,
        energyType: p.vy < -60 ? 'kineticUp' : (Math.abs(p.vy) < 80 && !p.ground ? 'potentialPeak' : 'kineticFast'),
        life: 0.24
      });
    }
    for (const t of p.trail) {
      t.life -= dt;
    }
    p.trail = p.trail.filter(t => t.life > 0).slice(0, 9);

    updateEnergyMetrics(p, settings);
    return events;
  }

  /**
   * Compute educational physics quantities:
   *  - Kinetic Energy (Motion) proportional to speed
   *  - Gravitational Potential Energy (Height) proportional to height above floor baseline
   */
  function updateEnergyMetrics(p, settings) {
    if (settings.practice) {
      p.energy = 100;
    }
    const speed = Math.hypot(p.vx, p.vy);
    p.kineticEnergy = Math.min(100, Math.round((speed / 440) * 100 * Math.sqrt(p.mass)));
    const heightAboveFloor = Math.max(0, CONSTANTS.FLOOR_BASELINE_Y - (p.y + p.h));
    p.potentialEnergy = Math.min(100, Math.round((heightAboveFloor / 290) * 100 * p.mass));
  }

  /**
   * Compute full articulated limb coordinates & joint angles for Bolt
   * so that walking, running, jumping, apex-arching, falling, skidding,
   * carrying, gliding, and ledge-grabbing look lively and expressive!
   */
  function computeBoltPose(p, levelTime) {
    const s = p.stridePhase;
    const state = p.animState;
    let bodyBobY = 0;
    let headPitch = 0;
    let torsoLean = p.tilt * p.face;

    // Joint angles in radians (relative to vertical downward = 0, positive = forward in facing direction)
    let fShoulder = 0, fElbow = 0.25;
    let bShoulder = 0, bElbow = 0.25;
    let fHip = 0, fKnee = 0;
    let bHip = 0, bKnee = 0;
    let tailWave = Math.sin(levelTime * 5) * 0.25;

    if (state === 'idle') {
      bodyBobY = Math.sin(levelTime * 3.8) * 1.8;
      headPitch = Math.sin(levelTime * 1.9) * 0.05;
      fShoulder = Math.sin(levelTime * 3.8) * 0.12;
      bShoulder = -Math.sin(levelTime * 3.8) * 0.12;
      fHip = 0.05;
      bHip = -0.05;
    } else if (state === 'walk' || state === 'run') {
      const amp = state === 'run' ? 1.05 : 0.72;
      bodyBobY = -Math.abs(Math.cos(s)) * (state === 'run' ? 4.2 : 2.5);
      headPitch = state === 'run' ? 0.12 : 0.05;

      // Opposite arm & leg swing (classic 16-bit character stride cycle)
      fHip = Math.sin(s) * amp;
      fKnee = Math.max(0, -Math.cos(s) * amp * 0.95);
      bHip = -Math.sin(s) * amp;
      bKnee = Math.max(0, Math.cos(s) * amp * 0.95);

      fShoulder = -Math.sin(s) * amp * 0.95;
      fElbow = 0.45 + Math.max(0, -Math.sin(s)) * 0.5;
      bShoulder = Math.sin(s) * amp * 0.95;
      bElbow = 0.45 + Math.max(0, Math.sin(s)) * 0.5;
      tailWave = Math.sin(s * 2) * 0.45;
    } else if (state === 'skid') {
      torsoLean = -0.28;
      bodyBobY = 2;
      fShoulder = 0.85;
      fElbow = 0.3;
      bShoulder = -0.75;
      bElbow = 0.4;
      fHip = 0.65;
      fKnee = 0.2;
      bHip = -0.35;
      bKnee = 0.65;
    } else if (state === 'jump') {
      // Inspired by 1994 Lion King leap: front arms reaching forward/up, hind legs trailing & stretched!
      torsoLean = 0.22;
      headPitch = -0.18;
      fShoulder = 1.25;
      fElbow = 0.35;
      bShoulder = 0.85;
      bElbow = 0.45;
      fHip = 0.35;
      fKnee = 0.75;
      bHip = -0.58;
      bKnee = 0.22;
      tailWave = -0.5;
    } else if (state === 'apex') {
      // Graceful mid-air arch at the peak of the jump
      torsoLean = 0.08;
      headPitch = 0.05;
      fShoulder = 0.85;
      fElbow = 0.55;
      bShoulder = -0.45;
      bElbow = 0.45;
      fHip = 0.55;
      fKnee = 0.85;
      bHip = -0.42;
      bKnee = 0.65;
    } else if (state === 'fall') {
      // Limbs extending downward to spot the landing
      torsoLean = 0.1;
      headPitch = 0.22;
      fShoulder = 1.45;
      fElbow = 0.2;
      bShoulder = -1.1;
      bElbow = 0.2;
      fHip = 0.28;
      fKnee = 0.18;
      bHip = -0.22;
      bKnee = 0.25;
      tailWave = 0.65;
    } else if (state === 'glide') {
      // Holding up the parachute canopy handles overhead!
      torsoLean = 0.05;
      headPitch = -0.12;
      fShoulder = 2.45;
      fElbow = 0.25;
      bShoulder = 2.25;
      bElbow = 0.25;
      fHip = Math.sin(levelTime * 7) * 0.35;
      fKnee = 0.4;
      bHip = -Math.sin(levelTime * 7) * 0.35;
      bKnee = 0.4;
    } else if (state === 'spring') {
      // Deep coiled crouch on spring pad
      bodyBobY = 6;
      torsoLean = 0.25;
      fShoulder = -0.65;
      fElbow = 0.9;
      bShoulder = -0.8;
      bElbow = 0.9;
      fHip = 0.85;
      fKnee = 1.25;
      bHip = 0.65;
      bKnee = 1.25;
    } else if (state === 'ledge') {
      // Hanging from ledge & pulling up with both arms
      bodyBobY = 2;
      headPitch = -0.25;
      fShoulder = 2.35;
      fElbow = 0.55;
      bShoulder = 2.15;
      bElbow = 0.55;
      fHip = 0.25;
      fKnee = 0.65;
      bHip = -0.15;
      bKnee = 0.45;
    }

    // Override arms if Bolt is carrying the heavy crate overhead/in front
    if (p.carry) {
      fShoulder = 1.85;
      fElbow = 0.55;
      bShoulder = 1.65;
      bElbow = 0.55;
      bodyBobY += 1.5;
    }

    return {
      bodyBobY,
      headPitch,
      torsoLean,
      fShoulder,
      fElbow,
      bShoulder,
      bElbow,
      fHip,
      fKnee,
      bHip,
      bKnee,
      tailWave
    };
  }

  window.Physics = {
    CONSTANTS,
    SURFACES,
    createPlayer,
    getPlatformState,
    getSurfaceY,
    stepPhysics,
    computeBoltPose
  };
})();
