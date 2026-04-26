# Project Memory

## Core
Clay-inspired design. Warm cream bg #faf9f7 (NEVER pure white or cool gray), clay-black ink #000, warm silver muted #9f9b93, oat borders #dad4c8 (NEVER neutral gray).
Named swatch palette for sections: Matcha (#078a52/#02492a), Slushie (#3bd3fd), Lemon (#fbbd41), Ube (#43089f), Pomegranate (#fc7981), Blueberry (#01418d). Max 2 swatches per section.
Roobert (Inter fallback) everywhere with OpenType ss01,ss03,ss10,ss11,ss12 on headings; ss03,ss10,ss11,ss12 on body. Space Mono for code/labels.
Three weights only: 600 headings, 500 UI, 400 body. Hero 80px/-3.2px tracking; section 44px/-1.32px; card 32px/-0.64px.
Uppercase labels: 12px/600 with 1.08px positive tracking — wayfinding system.
Multi-layer "pressed into clay" shadow on cards/buttons: 0px 1px 1px + inset -1px + -0.5px. NEVER blur-based shadows.
Hover signature: rotateZ(-4deg) + translateY(-4px) + hard offset shadow (-7px 7px solid black). Applied to buttons via .clay-hover or built into Button variants.
Generous radius: 12px buttons, 24px cards, 40px sections, full pill for CTAs. NEVER <12px on feature cards.
Mix solid + dashed oat borders for craft-like variety (.border-dashed-oat utility).
