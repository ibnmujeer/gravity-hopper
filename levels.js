/**
 * GRAVITY HOPPER — 12 Progressive Physics Levels
 * Coordinates use a 960 x 600 logical viewport (with horizontal scrolling support).
 *
 * Platform types:
 *  - 'plain'    : Standard high-traction terrain ledge
 *  - 'ice'      : Low-friction cryolab surface (Bolt slides with minimal deceleration)
 *  - 'rough'    : High-friction sandy/rocky surface (slows movement & kicks up dust)
 *  - 'rubber'   : High-grip cushioned pad (instant stop + micro-rebound)
 *  - 'spring'   : Compressible coil pad (stores elastic potential energy -> kinetic launch)
 *  - 'charger'  : Solar/kinetic recharge pad (restores Bolt's stored battery energy)
 *  - 'movingH'  : Horizontally oscillating platform (transfers momentum to Bolt)
 *  - 'movingV'  : Vertically oscillating lift platform
 *  - 'rampDown' : Downhill slope (converts gravitational potential energy into speed)
 *  - 'rampUp'   : Uphill slope (trades kinetic energy for height, slowing Bolt down)
 */
window.LEVELS = [
  // LEVEL 1: Basic Jumping & Variable Hold
  {
    name: 'Sunrise Canopy',
    theme: 'dawn',
    label: 'TAP VS. HOLD JUMP',
    idea: 'A stronger jump uses more stored energy.',
    hint: 'Tap JUMP for a tiny hop across small gaps. Press and HOLD JUMP longer to leap up to high ledges!',
    start: [65, 450],
    exit: [860, 390],
    energy: 100,
    platforms: [
      [0, 515, 235, 'plain'],
      [285, 472, 165, 'plain'],
      [500, 412, 165, 'plain'],
      [720, 445, 240, 'plain']
    ],
    notes: [
      [368, 422, 'Stored Energy sits inside Bolt’s battery until you jump and turn it into motion!']
    ],
    lesson: 'You controlled jump height by holding the jump button. A higher jump converts more Stored Energy into upward Motion Energy. What happens if you only tap jump?',
    quiz: {
      q: 'What happens when you hold the Jump button longer?',
      options: ['Bolt uses more stored energy to jump higher', 'Gravity turns off forever', 'Bolt uses zero energy'],
      correct: 0
    }
  },

  // LEVEL 2: Gravity, Height (Potential Energy) & Falling
  {
    name: 'Gravity Cliffs',
    theme: 'savanna',
    label: 'GRAVITY & HEIGHT',
    idea: 'Gravity pulls downward; climbing higher stores Gravitational Potential Energy.',
    hint: 'Climb to the high cliff, then watch the Potential (Height) meter turn into Motion (Speed) as gravity pulls Bolt down!',
    start: [60, 450],
    exit: [865, 345],
    energy: 100,
    platforms: [
      [0, 515, 195, 'plain'],
      [240, 435, 150, 'plain'],
      [435, 345, 155, 'plain'],
      [645, 445, 140, 'plain'],
      [815, 400, 145, 'plain']
    ],
    notes: [
      [512, 292, 'Up high, Bolt has Gravitational Potential Energy! Falling turns that height energy into speed.']
    ],
    lesson: 'Gravity constantly pulled Bolt downward. At the highest ledge, Bolt had lots of Potential (Height) Energy, which turned into fast Motion Energy while falling. Where was Bolt moving fastest?',
    quiz: {
      q: 'When does Bolt have the most Gravitational Potential (Height) Energy?',
      options: ['At the highest point of a climb or jump', 'While standing on the lowest floor', 'Only when standing still'],
      correct: 0
    }
  },

  // LEVEL 3: Springs & Elastic Energy Transfer
  {
    name: 'Coil Canyon',
    theme: 'sunset',
    label: 'SPRINGS & BOUNCE',
    idea: 'A compressed spring stores elastic energy and launches Bolt upward.',
    hint: 'Step or drop onto the pink spring coil! Watch it squeeze down to store energy, and hold JUMP as it launches to bounce even higher.',
    start: [60, 450],
    exit: [850, 275],
    energy: 100,
    platforms: [
      [0, 515, 200, 'plain'],
      [240, 500, 110, 'spring'],
      [395, 385, 155, 'plain'],
      [585, 445, 105, 'spring'],
      [750, 330, 210, 'plain']
    ],
    notes: [
      [472, 335, 'When Bolt squashes a spring, the coil stores Elastic Potential Energy and pushes right back!']
    ],
    lesson: 'The spring squeezed under Bolt’s weight to store Elastic Energy, then snapped back to transfer that energy into a huge upward bounce. Why did dropping faster squeeze the spring more?',
    quiz: {
      q: 'How does a spring help Bolt reach a high ledge?',
      options: ['It stores energy when compressed and transfers it to Bolt', 'It deletes gravity from the room', 'It makes Bolt heavier'],
      correct: 0
    }
  },

  // LEVEL 4: Surface Friction (Ice, Sand, Rubber)
  {
    name: 'Slip & Grip Ridge',
    theme: 'twilight',
    label: 'SURFACE FRICTION',
    idea: 'Friction is a force between surfaces that opposes sliding motion.',
    hint: 'Blue Ice has very low friction so Bolt skates far! Purple Rubber grips tightly to help you stop, while Sandy Rough ground drags you down.',
    start: [55, 450],
    exit: [860, 395],
    energy: 100,
    platforms: [
      [0, 515, 160, 'plain'],
      [160, 515, 165, 'ice'],
      [325, 515, 140, 'rough'],
      [465, 515, 145, 'rubber'],
      [610, 515, 150, 'ice'],
      [760, 450, 200, 'rubber'],
      [355, 405, 125, 'plain']
    ],
    notes: [
      [415, 355, 'Friction pushes against motion! Smooth ice has weak friction; rough sand and rubber have strong friction.']
    ],
    lesson: 'Ice let Bolt glide because of low friction, rough sand slowed Bolt down, and rubber gave instant grip for precise jumping. Which surface made stopping hardest?',
    quiz: {
      q: 'Why does Bolt keep sliding on ice after you stop pressing the arrow key?',
      options: ['Ice has very low friction, so very little force slows Bolt down', 'Ice pushes Bolt forward with a fan', 'Gravity pulls sideways on ice'],
      correct: 0
    }
  },

  // LEVEL 5: Energy Budget & Smart Planning
  {
    name: 'Battery Oasis',
    theme: 'oasis',
    label: 'ENERGY BUDGET',
    idea: 'Energy is limited—small hops conserve stored energy for when you need it.',
    hint: 'Your battery starts only partly charged! Taking small, efficient hops along the lower stepping stones uses much less energy than giant leaps.',
    start: [55, 450],
    exit: [860, 330],
    energy: 72,
    platforms: [
      [0, 515, 185, 'plain'],
      [230, 475, 140, 'plain'],
      [415, 430, 145, 'plain'],
      [605, 385, 145, 'plain'],
      [790, 385, 170, 'plain'],
      // High energy-expensive shortcut route
      [250, 335, 110, 'plain'],
      [465, 265, 115, 'plain']
    ],
    notes: [
      [675, 335, 'Every big jump costs extra Stored Energy. Smart explorers pace their hops so the battery doesn’t run dry!']
    ],
    lesson: 'With limited Stored Energy in Bolt’s battery, smaller hops conserved enough charge to reach the exit portal. Why couldn’t Bolt just do maximum-height jumps the whole way?',
    quiz: {
      q: 'If Bolt has low battery energy, which strategy works best?',
      options: ['Use smaller hops and ramps to save stored energy', 'Hold jump as long as possible every time', 'Jump non-stop in place'],
      correct: 0
    }
  },

  // LEVEL 6: Moving Platforms & Shared Momentum
  {
    name: 'Pendulum Perch',
    theme: 'dawn',
    label: 'MOVING PLATFORMS',
    idea: 'Standing on a moving platform shares its motion (momentum) with Bolt.',
    hint: 'Ride the moving platforms! Jump right as a platform is moving toward your destination to carry its extra speed into your leap.',
    start: [55, 450],
    exit: [860, 305],
    energy: 100,
    platforms: [
      [0, 515, 185, 'plain'],
      [240, 450, 125, 'movingH'],
      [455, 375, 125, 'movingV'],
      [655, 420, 125, 'movingH'],
      [815, 360, 145, 'plain']
    ],
    notes: [
      [515, 295, 'Momentum is motion in action! Jumping while a platform moves forward adds its speed to yours.']
    ],
    lesson: 'The moving platforms carried Bolt along and shared their velocity when Bolt jumped off. How did jumping while the platform moved forward change your jump distance?',
    quiz: {
      q: 'What happens when you jump forward while standing on a forward-moving platform?',
      options: ['Bolt inherits the platform’s speed and jumps farther', 'Bolt stops dead in mid-air', 'Bolt falls straight down'],
      correct: 0
    }
  },

  // LEVEL 7: Slopes, Ramps & Speed Conversion
  {
    name: 'Mesa Rollerway',
    theme: 'sunset',
    label: 'RAMPS & SLOPES',
    idea: 'Rolling downhill turns height energy into speed; climbing uphill slows you down.',
    hint: 'Run down the steep slope to pick up fast Kinetic (Motion) Energy, then leap across the canyon before the uphill ramp slows you!',
    start: [50, 395],
    exit: [855, 345],
    energy: 100,
    platforms: [
      [0, 450, 175, 'plain'],
      [175, 450, 195, 'rampDown'],
      [370, 540, 155, 'plain'],
      [555, 420, 165, 'rampUp'],
      [720, 420, 240, 'plain']
    ],
    notes: [
      [275, 435, 'Gravity pulls you down a slope! That turns Potential (Height) Energy into fast Kinetic (Motion) Energy.']
    ],
    lesson: 'Going downhill converted Potential (Height) Energy into extra speed, helping Bolt clear the canyon gap, while going uphill converted speed back into height. Where was Bolt fastest?',
    quiz: {
      q: 'Why does Bolt speed up when running down a ramp?',
      options: ['Gravity pulls Bolt down the slope, turning height energy into speed', 'The ramp has hidden rockets', 'Friction disappears on all hills'],
      correct: 0
    }
  },

  // LEVEL 8: Updraft Fans & Air Resistance (Parachute Glider)
  {
    name: 'Windward Spire',
    theme: 'sky',
    label: 'AIR RESISTANCE',
    idea: 'Air resistance (drag) and upward wind push against gravity to slow a fall.',
    hint: 'Hold DOWN (or tap GLIDE on touchscreens) while falling to open Bolt’s canopy glider! Catch the rising fan updraft to float across.',
    start: [58, 315],
    exit: [855, 435],
    energy: 100,
    platforms: [
      [0, 375, 160, 'plain'],
      [235, 505, 145, 'plain'],
      [450, 470, 140, 'plain'],
      [645, 515, 135, 'plain'],
      [810, 490, 150, 'plain'],
      [175, 255, 95, 'plain'],
      [390, 295, 100, 'plain']
    ],
    fans: [
      [415, 300, 155, 170]
    ],
    notes: [
      [220, 205, 'Air Resistance (drag) pushes upward against falling objects. A wide parachute catches more air to slow you down!']
    ],
    lesson: 'Opening the glider canopy increased air resistance, and the giant fan created an upward wind force that countered gravity. How did the canopy change Bolt’s landing?',
    quiz: {
      q: 'How does Bolt’s glider parachute slow down a fall?',
      options: ['It catches the air, creating upward air resistance (drag)', 'It turns off Earth’s gravity', 'It makes Bolt heavier'],
      correct: 0
    }
  },

  // LEVEL 9: Weight, Mass & Heavy Loads
  {
    name: 'Counterweight Gorge',
    theme: 'savanna',
    label: 'MASS & WEIGHT',
    idea: 'Heavier objects have more mass and require more energy to lift and accelerate.',
    hint: 'Press X (or tap CRATE) to pick up the heavy Power Crate! It makes Bolt heavier—use the green Charger Pad to refill energy and carry it forward.',
    start: [55, 450],
    exit: [850, 320],
    energy: 100,
    platforms: [
      [0, 515, 195, 'plain'],
      [230, 475, 160, 'charger'],
      [430, 420, 155, 'plain'],
      [625, 375, 150, 'charger'],
      [805, 375, 155, 'plain']
    ],
    crate: [275, 440],
    weightPad: [485, 414, 55],
    notes: [
      [695, 320, 'More Mass means more Weight under gravity! Lifting a heavy crate takes extra Stored Energy for the same jump.']
    ],
    lesson: 'Carrying the heavy crate increased Bolt’s total mass, so moving and jumping required more force and Stored Energy. How did the green Charger Pads help you finish?',
    quiz: {
      q: 'Why does Bolt jump lower and use more energy when carrying the heavy crate?',
      options: ['Greater mass takes more force and energy to lift against gravity', 'The crate makes the floor slippery', 'The crate shrinks Bolt’s legs'],
      correct: 0
    }
  },

  // LEVEL 10: Chain Energy Transfer Puzzle
  {
    name: 'Relay Terraces',
    theme: 'twilight',
    label: 'ENERGY TRANSFER',
    idea: 'Energy transforms continuously: Battery -> Spring -> Motion -> Height!',
    hint: 'Bounce off the spring coil, catch the moving platform at its peak, and ride its momentum to the upper terrace!',
    start: [50, 450],
    exit: [855, 290],
    energy: 100,
    platforms: [
      [0, 515, 155, 'plain'],
      [190, 500, 105, 'spring'],
      [350, 410, 115, 'plain'],
      [515, 375, 125, 'movingH'],
      [705, 340, 110, 'plain'],
      [815, 345, 145, 'plain']
    ],
    notes: [
      [408, 360, 'Energy is never destroyed! It transforms from Stored -> Spring -> Kinetic (Motion) -> Potential (Height).']
    ],
    lesson: 'Energy flowed from the compressed spring into Bolt’s upward motion, turned into height energy at the peak, and combined with the moving platform’s momentum. Did any energy vanish?',
    quiz: {
      q: 'According to physics, can energy ever just disappear into nothing?',
      options: ['No—energy is never destroyed; it only changes form or transfers', 'Yes, energy vanishes whenever Bolt lands', 'Yes, springs eat energy'],
      correct: 0
    }
  },

  // LEVEL 11: Friction, Slopes & Momentum Challenge
  {
    name: 'Cryo Canyon Run',
    theme: 'oasis',
    label: 'MOMENTUM CHALLENGE',
    idea: 'Combine downhill gravity, low-friction ice, and spring launch to cross a wide canyon.',
    hint: 'Sprint down the ramp onto the ice track to keep all your speed, hit the spring at full velocity, and land safely on the high-friction pad!',
    start: [50, 375],
    exit: [860, 345],
    energy: 100,
    platforms: [
      [0, 430, 150, 'plain'],
      [150, 430, 165, 'rampDown'],
      [315, 520, 195, 'ice'],
      [540, 480, 110, 'spring'],
      [705, 400, 255, 'rubber'],
      [370, 385, 95, 'plain']
    ],
    notes: [
      [415, 335, 'High speed + low-friction ice + elastic spring = huge horizontal and vertical momentum!']
    ],
    lesson: 'You combined gravitational acceleration on the ramp, near-zero friction on ice, and elastic spring power to soar across the canyon, then used rubber friction to stop safely!',
    quiz: {
      q: 'Why was the ice platform placed right after the downhill ramp?',
      options: ['Low friction lets Bolt keep the speed gained from the ramp', 'Ice slows Bolt down before the spring', 'Ice makes gravity stronger'],
      correct: 0
    }
  },

  // LEVEL 12: Final Escape — The Sky Lab Finale
  {
    name: 'Horizon Escape',
    theme: 'finale',
    label: 'FINAL LAB ESCAPE',
    idea: 'Master gravity, energy budgets, friction, springs, and airflow to escape the floating lab!',
    hint: 'Recharge on the green pad, bounce up the spring, ride the moving bridge or catch the updraft fan, and collect the 3 golden Energy Notes!',
    start: [48, 450],
    exit: [870, 295],
    energy: 85,
    platforms: [
      [0, 515, 150, 'plain'],
      [175, 480, 115, 'charger'],
      [325, 500, 105, 'spring'],
      [495, 425, 125, 'movingH'],
      [675, 360, 105, 'plain'],
      [815, 350, 145, 'rubber'],
      [245, 350, 105, 'ice'],
      [485, 285, 100, 'plain'],
      [680, 495, 130, 'rampUp']
    ],
    fans: [
      [720, 320, 95, 175]
    ],
    notes: [
      [295, 300, 'Note 1/3: Gravity pulls downward, giving high objects Potential Energy!'],
      [535, 235, 'Note 2/3: Stored Energy turns into Kinetic (Motion) Energy when you jump or roll!'],
      [750, 295, 'Note 3/3: Friction and Air Resistance oppose motion and help you control speed!']
    ],
    lesson: 'Congratulations! You mastered Gravity, Stored Energy, Kinetic Energy, Potential Energy, Springs, Momentum, Friction, and Air Resistance to escape the Sky Lab!',
    quiz: {
      q: 'When Bolt jumps, climbs, glides, and lands, what happens to the energy?',
      options: ['It transfers between Stored, Kinetic (Motion), Potential (Height), and surface heat/sound', 'It stays 100% Stored Energy the whole time', 'Gravity destroys all energy at the exit'],
      correct: 0
    }
  }
];
