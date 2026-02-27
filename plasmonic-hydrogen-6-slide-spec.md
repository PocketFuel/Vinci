# Plasmonic Hydrogen Power Generator — 6-Slide Deck Spec (1920x1080)

## Overview
- Canvas: `1920 x 1080` (16:9)
- Font pair:
  - `The Seasons` (headlines)
  - `DM Sans` (body/UI)
- Layout model: tab-based top navigation on every slide, with one active tab per slide (matching the final reference screenshot pattern).
- Content policy: all claims and phrasing come from the source text you provided; no added technical claims.

## Tokens (shadcn-style mapping)
### Primitive
- `Cream/050: #F2EFE8`
- `Cream/100: #E7E2D8`
- `Green/700: #1E5A2A`
- `Green/600: #2F6F38`
- `Green/200: #C7D8BE`
- `Slate/900: #20252B`
- `Slate/700: #3A4048`
- `White: #FFFFFF`

### Semantic
- `bg.canvas: Cream/050`
- `bg.panel: White`
- `bg.tab.default: Cream/100`
- `bg.tab.active: Green/200`
- `text.heading: Green/700`
- `text.body: Slate/900`
- `text.muted: Slate/700`
- `border.default: #CFC8BA`
- `accent.primary: Green/600`

### Component
- `slide.bg = bg.canvas`
- `topnav.tab.bg = bg.tab.default`
- `topnav.tab.active.bg = bg.tab.active`
- `topnav.tab.text = text.body`
- `title.text = text.heading`
- `body.text = text.body`
- `card.bg = bg.panel`
- `card.border = border.default`
- `chip.bg = Green/700`
- `chip.text = White`

## Global Slide Structure (Auto Layout)
- Root frame (`1920x1080`, vertical auto layout)
  - Padding: `40`
  - Gap: `28`
  - Fill: `slide.bg`
- Header row (horizontal auto layout)
  - Left: deck label
  - Right: optional sublabel
- Tab bar (horizontal auto layout)
  - 6 tabs, each `Hug` width, height `56`, radius `24`
  - Gap: `16`
  - Active tab uses `topnav.tab.active.bg`
- Content region (horizontal auto layout, fill container)
  - Left narrative panel (`~56%`)
  - Right supporting panel (`~44%`)

---

## Slide 1 — Title + Overview
### Active Tab
- `01 Overview`

### Left Panel
- Title (The Seasons, 88/92):
  - `Plasmonic Hydrogen`
  - `Power Generator`
- Subtitle (DM Sans 44/52 Semibold):
  - `The Next Leap in Clean Energy`
- Body (DM Sans 34/46):
  - `The OEM and Energy-Spout refined the terminology from “Hydrogen Magnetic” to Plasmonic Hydrogen Power Generator to reflect the plasmonic nanoscience that captures and amplifies light at the nanoscale to generate hydrogen and continuous clean power.`

### Right Panel (card)
- Card title:
  - `Overview`
- Card body:
  - `The system combines plasmonics with hydrogen production and power generation for efficiency, durability, and scalability in renewable conversion.`
  - `At its core, plasmonic nanostructures concentrate light energy and enhance catalytic reactions to split water into hydrogen and oxygen using sunlight or low-grade thermal energy.`
  - `Paired with a high-efficiency fuel cell or direct hydrogen combustion module, it delivers continuous clean electricity without fossil-fuel dependence.`

---

## Slide 2 — How It Works
### Active Tab
- `02 How It Works`

### Left Panel
- Title:
  - `How It Works`
- Body:
  - `By integrating plasmonic nanophotonics with advanced hydrogen generation and fuel-cell systems, the platform converts light and thermal energy directly into electrical power.`
  - `Plasmonic nanoparticles (engineered metallic structures) amplify electromagnetic fields and enhance catalytic water-splitting reactions, enabling direct solar-to-hydrogen conversion with minimal energy loss.`
  - `Traditional photovoltaic + electrolysis systems face energy losses, bandgap limits, and catalyst degradation. Plasmonic-enhanced hydrogen generation is described as achieving higher photon-to-fuel conversion, lower activation energy, and long-term operational stability.`

### Right Panel
- Process card stack (3 cards, vertical):
  - `Capture`: `Light + low-grade thermal energy are concentrated by plasmonic nanostructures.`
  - `Convert`: `Water is split into hydrogen and oxygen through enhanced catalytic reactions.`
  - `Deliver`: `Hydrogen is stored or converted immediately for continuous day/night power.`

---

## Slide 3 — Key Advantages I
### Active Tab
- `03 Advantages I`

### Left Panel
- Title:
  - `Key Advantages`
- Intro line:
  - `Core performance and deployment benefits`

### Right Panel (2-column bullet cards)
- Card A:
  - `Unmatched Energy Efficiency`
  - `Continuous, On-Demand Power`
  - `True Zero-Emission Operation`
  - `Extended Catalyst Longevity`
- Card B:
  - `Compact, Modular Architecture`
  - `Scalability and Modularity`
  - `Enhanced Durability and Low Maintenance`

### Notes row (small text)
- `Hydrogen storage enables uninterrupted operation and use independent of weather conditions.`

---

## Slide 4 — Key Advantages II
### Active Tab
- `04 Advantages II`

### Left Panel
- Title:
  - `System-Level Value`
- Body:
  - `Energy Independence and Security: generate hydrogen locally from water and sunlight to reduce dependence on imported fossil fuels.`
  - `Future-Proof Integration: compatible with existing hydrogen infrastructure, electric grids, and renewable platforms.`
  - `Carbon-Free Cycle: from hydrogen production through power output, the process is described as zero greenhouse-gas emissions.`

### Right Panel
- Feature matrix card:
  - Row 1: `Independence` | `Local hydrogen generation`
  - Row 2: `Integration` | `Works with grid + hydrogen infrastructure`
  - Row 3: `Decarbonization` | `Carbon-free cycle claim`

---

## Slide 5 — Why It’s a Game-Changer
### Active Tab
- `05 Why It Matters`

### Left Panel
- Title:
  - `Why It’s a Game-Changer`
- Body:
  - `A system that draws energy from sunlight, stores it as hydrogen fuel, and delivers electricity anytime without pollution or carbon emissions.`
  - `Unlike weather-dependent renewables, stored hydrogen enables 24/7 availability.`
  - `Designed as a flexible foundation for homes, industries, and national grids.`

### Right Panel (highlight bullets)
- `Zero Emissions: only water vapor is released.`
- `24/7 Power: sunlight stored as hydrogen for round-the-clock operation.`
- `Efficient and Reliable: converts more energy from light than traditional solar systems (per source text).`
- `Built to Last: durable components reduce maintenance and downtime.`
- `Energy Independence: local clean-power production for communities and nations.`

---

## Slide 6 — Vision for the Future
### Active Tab
- `06 Future Vision`

### Left Panel
- Title:
  - `A Vision for the Future`
- Body:
  - `The platform is presented as a transformative union of advanced nanotechnology and sustainable engineering.`
  - `It positions plasmonic hydrogen as a clean, efficient, renewable pathway toward global energy independence.`
  - `From compact modular units to national infrastructure, it is framed as a foundation for decentralized, emission-free power across transportation, industry, and grid applications.`

### Right Panel
- Closing statement card:
  - `Scientific precision + commercial scalability`
  - `Decentralized deployment`
  - `Zero-carbon transition acceleration`

---

## Components (Figma)
- `TopNav/Tab`
  - Variants: `Default`, `Active`
  - Props: `Label`
- `Card/Content`
  - Variants: `Default`, `Emphasis`, `DataRow`
- `Bullet/ListItem`
  - Variants: `Dot`, `Check`, `Dash`
- `Slide/Header`
  - Props: `Deck Name`, `Section Name`

## Version A/B/C (same 6-slide structure)
### A — Faithful
- Keep copy dense and technical, mirroring source phrasing and section names.
- Use minimal styling: cream canvas, green tabs, bordered white cards.
- Limited visual emphasis beyond hierarchy and spacing cleanup.

### B — Slightly Opinionated
- Keep all source claims, but tighten sentence breaks for readability.
- Add simple data-emphasis chips (`On-Demand`, `Zero-Emission`, `24/7`) and clearer card groupings.
- Increase whitespace and improve contrast hierarchy for faster scan.

### C — Bolder 2026
- Keep source claims intact; present as editorial dashboard with stronger asymmetry.
- Add subtle radial depth layers behind right panel and large numeric typographic anchors (`24/7`, `Zero-Emission`, `Modular`).
- Introduce interaction hints for presentation mode (tab progression animation, card stagger reveal).

## Fonts & Downloads
- `The Seasons`
  - Weights: Regular, Medium (for headlines and section titles)
  - Source: manual license/download required (install locally for Figma desktop)
- `DM Sans`
  - Weights: 400, 500, 600, 700 (body, tabs, bullets, metadata)
  - Source: Google Fonts

## Accessibility Checks
- Minimum body text: `>= 30 px` on 1080p slides for boardroom readability.
- Contrast target: `WCAG AA` equivalent for text vs card/background.
- Touch/click targets (if interactive PDF): tab heights `>= 48 px`.

