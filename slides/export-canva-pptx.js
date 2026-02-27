const PptxGenJS = require('pptxgenjs');

const pptx = new PptxGenJS();
// 20 x 11.25 in = 1920 x 1080 at 96 DPI equivalent
pptx.defineLayout({ name: 'FHD_1920', width: 20, height: 11.25 });
pptx.layout = 'FHD_1920';
pptx.author = 'Hans / Codex';
pptx.subject = 'Plasmonic Hydrogen Power Generator';
pptx.title = 'Plasmonic Hydrogen Power Generator - Canva Edit Deck';
pptx.company = 'Supercloud Energy';
pptx.lang = 'en-US';

const C = {
  bg: 'F2EFE8',
  panel: 'FFFFFF',
  tab: 'E7E2D8',
  tabActive: 'C7D8BE',
  heading: '1E5A2A',
  body: '20252B',
  muted: '3A4048',
  border: 'CFC8BA',
  line: 'D9D2C6',
};

const W = 20;
const H = 11.25;
const M = 0.50;
const HEADER_H = 0.54;
const TAB_H = 0.52;
const TAB_Y = 0.95;
const CONTENT_Y = 1.62;
const CONTENT_H = H - CONTENT_Y - M;

const LEFT_X = M;
const LEFT_W = 11.55;
const RIGHT_X = LEFT_X + LEFT_W + 0.25;
const RIGHT_W = W - RIGHT_X - M;

const tabs = [
  '01 Overview',
  '02 How It Works',
  '03 Advantages I',
  '04 Advantages II',
  '05 Why It Matters',
  '06 Pricing',
  '07 Future Vision',
];

function addChrome(slide, activeTab, slideNum) {
  slide.background = { color: C.bg };

  // Deck label
  slide.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 0.30, w: 6.6, h: HEADER_H,
    radius: 0.08,
    line: { color: C.border, pt: 1 },
    fill: { color: 'F8F6F1' }
  });
  slide.addText('Plasmonic Hydrogen Power Generator', {
    x: M + 0.18, y: 0.46, w: 6.2, h: 0.22,
    fontFace: 'DM Sans', fontSize: 12, bold: true, color: C.heading,
  });

  slide.addText(`Slide ${String(slideNum).padStart(2, '0')} / 07`, {
    x: W - M - 1.8, y: 0.46, w: 1.8, h: 0.22,
    fontFace: 'DM Sans', fontSize: 11, bold: true, color: C.muted, align: 'right',
  });

  // Tabs
  const tabWidths = [2.35, 2.7, 2.5, 2.6, 2.6, 1.95, 2.55];
  let x = M;
  const gap = 0.12;

  tabs.forEach((tab, i) => {
    const isActive = i === activeTab;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: TAB_Y, w: tabWidths[i], h: TAB_H,
      radius: 0.08,
      line: { color: C.border, pt: 1 },
      fill: { color: isActive ? C.tabActive : C.tab },
    });
    slide.addText(tab, {
      x: x + 0.08, y: TAB_Y + 0.14, w: tabWidths[i] - 0.16, h: 0.2,
      fontFace: 'DM Sans', fontSize: 10.5, bold: isActive,
      color: isActive ? C.heading : C.body,
      align: 'center'
    });
    x += tabWidths[i] + gap;
  });

  // Main panels
  slide.addShape(pptx.ShapeType.roundRect, {
    x: LEFT_X, y: CONTENT_Y, w: LEFT_W, h: CONTENT_H,
    radius: 0.08,
    line: { color: C.border, pt: 1 },
    fill: { color: C.panel }
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: RIGHT_X, y: CONTENT_Y, w: RIGHT_W, h: CONTENT_H,
    radius: 0.08,
    line: { color: C.border, pt: 1 },
    fill: { color: C.panel }
  });
}

function addTitle(slide, text, x = LEFT_X + 0.35, y = CONTENT_Y + 0.30, w = LEFT_W - 0.7, h = 0.78, size = 40) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: 'The Seasons', fontSize: size, color: C.heading,
    valign: 'top'
  });
}

function addParagraph(slide, text, x, y, w, h, size = 16.5, bold = false) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: 'DM Sans', fontSize: size, bold, color: C.body,
    valign: 'top',
    breakLine: true,
    fit: 'shrink'
  });
}

function addBullets(slide, items, x, y, w, h, size = 14.8) {
  const runs = [];
  items.forEach((txt) => {
    runs.push({ text: `${txt}\n`, options: { bullet: { indent: size * 0.72 } } });
  });
  slide.addText(runs, {
    x, y, w, h,
    fontFace: 'DM Sans', fontSize: size, color: C.body,
    valign: 'top', paraSpaceAfterPt: 6,
    fit: 'shrink'
  });
}

function rightCard(slide, y, h, title, body) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: RIGHT_X + 0.30, y, w: RIGHT_W - 0.6, h,
    radius: 0.06,
    line: { color: C.line, pt: 1 },
    fill: { color: 'FFFFFF' }
  });
  slide.addText(title, {
    x: RIGHT_X + 0.48, y: y + 0.16, w: RIGHT_W - 1.0, h: 0.25,
    fontFace: 'DM Sans', fontSize: 12, bold: true, color: C.heading,
  });
  slide.addText(body, {
    x: RIGHT_X + 0.48, y: y + 0.44, w: RIGHT_W - 1.0, h: h - 0.56,
    fontFace: 'DM Sans', fontSize: 13.5, color: C.body, fit: 'shrink', valign: 'top'
  });
}

// Slide 1: Overview
{
  const s = pptx.addSlide();
  addChrome(s, 0, 1);
  addTitle(s, 'Plasmonic Hydrogen\nPower Generator', LEFT_X + 0.35, CONTENT_Y + 0.32, LEFT_W - 0.8, 1.30, 46);

  addParagraph(
    s,
    'The Next Leap in Clean Energy',
    LEFT_X + 0.38, CONTENT_Y + 1.70, LEFT_W - 1.0, 0.50, 24, true
  );

  addParagraph(
    s,
    'The OEM and Energy-Spout have refined the terminology from “Hydrogen Magnetic” to Plasmonic Hydrogen Power Generator. This revision reflects the plasmonic nanoscience that captures and amplifies light at the nanoscale to generate hydrogen and continuous clean power.',
    LEFT_X + 0.38, CONTENT_Y + 2.32, LEFT_W - 0.95, 2.60, 16.3
  );

  rightCard(
    s,
    CONTENT_Y + 0.30,
    2.55,
    'Overview',
    'The system combines plasmonics with hydrogen production and power generation to deliver efficiency, durability, and scalability in renewable conversion.'
  );
  rightCard(
    s,
    CONTENT_Y + 3.05,
    2.55,
    'Core Function',
    'Plasmonic nanostructures concentrate light energy and enhance catalytic reactions to split water into hydrogen and oxygen using sunlight or low-grade thermal energy.'
  );
  rightCard(
    s,
    CONTENT_Y + 5.80,
    2.55,
    'Power Output',
    'When paired with a high-efficiency fuel cell or direct hydrogen combustion module, the result is continuous clean electricity with no dependence on fossil fuels.'
  );
}

// Slide 2: How it works
{
  const s = pptx.addSlide();
  addChrome(s, 1, 2);
  addTitle(s, 'How It Works', LEFT_X + 0.35, CONTENT_Y + 0.30, LEFT_W - 1.0, 0.80, 42);

  addParagraph(
    s,
    'By integrating plasmonic nanophotonics with advanced hydrogen generation and fuel-cell systems, the Plasmonic Hydrogen Power Generator converts light and thermal energy directly into electrical power.\n\nPlasmonic nanoparticles, engineered metallic structures that amplify electromagnetic fields, enhance catalytic water-splitting reactions and enable direct solar-to-hydrogen conversion with minimal energy loss.\n\nTraditional photovoltaic and electrolysis systems face energy losses, bandgap limitations, and catalyst degradation. In contrast, plasmonic-enhanced hydrogen generation is described as achieving higher photon-to-fuel conversion rates, lower activation energy, and long-term operational stability.',
    LEFT_X + 0.38, CONTENT_Y + 1.30, LEFT_W - 0.95, 6.55, 15.3
  );

  rightCard(s, CONTENT_Y + 0.35, 2.65, 'Capture', 'Light and low-grade thermal energy are concentrated by plasmonic nanostructures.');
  rightCard(s, CONTENT_Y + 3.20, 2.65, 'Convert', 'Catalytic reactions split water molecules into hydrogen and oxygen.');
  rightCard(s, CONTENT_Y + 6.05, 2.30, 'Deliver', 'Hydrogen can be stored for later use or utilized immediately for continuous day/night power generation.');
}

// Slide 3: Advantages I
{
  const s = pptx.addSlide();
  addChrome(s, 2, 3);
  addTitle(s, 'Key Advantages', LEFT_X + 0.35, CONTENT_Y + 0.30, LEFT_W - 1.0, 0.80, 42);
  addParagraph(s, 'Core performance and deployment benefits', LEFT_X + 0.40, CONTENT_Y + 1.20, LEFT_W - 1.0, 0.35, 17.5, true);

  addBullets(s, [
    'Unmatched Energy Efficiency — Plasmonic materials convert light into chemical energy with higher efficiency than conventional photovoltaic or thermal systems.',
    'Continuous, On-Demand Power — Hydrogen storage allows uninterrupted operation, overcoming intermittency.',
    'True Zero-Emission Operation — The only by-product is pure water vapor.',
    'Extended Catalyst Longevity — Plasmonic nanostructures resist oxidation and thermal degradation.',
    'Compact, Modular Architecture — Adaptable from residential-scale to industrial or grid-level systems.',
  ], LEFT_X + 0.42, CONTENT_Y + 1.75, LEFT_W - 0.98, 6.80, 14.8);

  rightCard(s, CONTENT_Y + 0.40, 3.90, 'Scalability + Durability', 'Scalability and Modularity: deployed from compact community units to megawatt-class installations.\n\nEnhanced Durability and Low Maintenance: stable catalysts reduce replacement costs versus conventional systems.');
  rightCard(s, CONTENT_Y + 4.55, 3.90, 'Operations', 'Hydrogen produced through this process can be stored for later use or utilized immediately, supporting continuous, zero-emission power generation day or night, regardless of weather conditions.');
}

// Slide 4: Advantages II
{
  const s = pptx.addSlide();
  addChrome(s, 3, 4);
  addTitle(s, 'System-Level Value', LEFT_X + 0.35, CONTENT_Y + 0.30, LEFT_W - 1.0, 0.80, 42);

  addBullets(s, [
    'Energy Independence and Security — By generating hydrogen fuel locally from water and sunlight, nations and communities can reduce dependence on imported fossil fuels.',
    'Future-Proof Integration — Compatible with existing hydrogen infrastructure, electric grids, and renewable platforms.',
    'Carbon-Free Cycle — From hydrogen production through power output, every stage is described as operating with zero greenhouse-gas emissions.',
  ], LEFT_X + 0.42, CONTENT_Y + 1.45, LEFT_W - 0.98, 4.60, 15.2);

  // Matrix right
  const boxW = (RIGHT_W - 0.9) / 2;
  const boxH = 2.60;
  const topY = CONTENT_Y + 0.35;
  const leftX = RIGHT_X + 0.30;
  const rightX = leftX + boxW + 0.30;

  const matrix = [
    [leftX, topY, 'Independence', 'Local hydrogen generation from water and sunlight'],
    [rightX, topY, 'Integration', 'Compatible with hydrogen infrastructure and electric grids'],
    [leftX, topY + boxH + 0.30, 'Security', 'Reduced fossil-fuel dependence with local production'],
    [rightX, topY + boxH + 0.30, 'Carbon-Free Cycle', 'Zero greenhouse-gas emissions claim across the cycle'],
  ];

  matrix.forEach(([x, y, t, b]) => {
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: boxW, h: boxH,
      radius: 0.06,
      line: { color: C.line, pt: 1 },
      fill: { color: 'FFFFFF' }
    });
    s.addText(t, {
      x: x + 0.16, y: y + 0.14, w: boxW - 0.32, h: 0.24,
      fontFace: 'DM Sans', fontSize: 12.2, bold: true, color: C.heading,
    });
    s.addText(b, {
      x: x + 0.16, y: y + 0.44, w: boxW - 0.32, h: boxH - 0.56,
      fontFace: 'DM Sans', fontSize: 13.2, color: C.body, fit: 'shrink'
    });
  });
}

// Slide 5: Why it matters
{
  const s = pptx.addSlide();
  addChrome(s, 4, 5);
  addTitle(s, 'Why It’s a Game-Changer', LEFT_X + 0.35, CONTENT_Y + 0.30, LEFT_W - 1.0, 0.80, 42);

  addParagraph(
    s,
    'Imagine a power system that draws energy from sunlight, stores it as clean hydrogen fuel, and delivers reliable electricity anytime without pollution or carbon emissions.\n\nUnlike conventional renewables that depend on weather, this innovation stores clean energy for use anytime, ensuring 24/7 availability.\n\nIt provides a flexible foundation for homes, industries, and national grids and is positioned to support energy independence.',
    LEFT_X + 0.38, CONTENT_Y + 1.35, LEFT_W - 0.95, 4.20, 15.9
  );

  rightCard(s, CONTENT_Y + 0.35, 1.45, 'Zero Emissions', 'Only water vapor is released.');
  rightCard(s, CONTENT_Y + 1.95, 1.45, '24/7 Power', 'Sunlight stored as hydrogen for round-the-clock operation.');
  rightCard(s, CONTENT_Y + 3.55, 1.45, 'Efficient and Reliable', 'Presented as converting more energy from light than traditional solar systems.');
  rightCard(s, CONTENT_Y + 5.15, 1.45, 'Built to Last', 'Durable components minimize maintenance and downtime.');
  rightCard(s, CONTENT_Y + 6.75, 1.45, 'Energy Independence', 'Enables local clean-power production for communities and nations.');
}

// Slide 6: Pricing (from provided screenshot text)
{
  const s = pptx.addSlide();
  addChrome(s, 5, 6);
  addTitle(s, 'Pricing', LEFT_X + 0.35, CONTENT_Y + 0.30, LEFT_W - 1.0, 0.80, 42);

  s.addShape(pptx.ShapeType.roundRect, {
    x: LEFT_X + 0.35, y: CONTENT_Y + 1.20, w: LEFT_W - 0.70, h: 2.05,
    radius: 0.06,
    line: { color: C.line, pt: 1 }, fill: { color: 'FFFFFF' }
  });
  addParagraph(
    s,
    'Energy Storage System (w/ Inverter)\n• $10 million per MWh system cost. Generates 24 MW per day\n• Up to 2 MWh per 20ft GPOD (ESS)\n• Up to 4 MWh per 40ft GPOD (ESS)',
    LEFT_X + 0.52, CONTENT_Y + 1.40, LEFT_W - 1.02, 1.72, 14.1, false
  );

  s.addShape(pptx.ShapeType.roundRect, {
    x: LEFT_X + 0.35, y: CONTENT_Y + 3.45, w: LEFT_W - 0.70, h: 2.15,
    radius: 0.06,
    line: { color: C.line, pt: 1 }, fill: { color: 'FFFFFF' }
  });
  addParagraph(
    s,
    'Battery Back-Up Energy Storage System (BESS)\nBattery back-up system (no inverter), HVAC, and fire suppression system. Full internet access dashboard.\n• $850,000 per MW\n• Up to 2.5 MW per 20ft GPOD\n• Up to 5 MW per 40ft GPOD',
    LEFT_X + 0.52, CONTENT_Y + 3.62, LEFT_W - 1.02, 1.86, 13.6, false
  );

  s.addShape(pptx.ShapeType.roundRect, {
    x: LEFT_X + 0.35, y: CONTENT_Y + 5.78, w: LEFT_W - 0.70, h: 2.18,
    radius: 0.06,
    line: { color: C.line, pt: 1 }, fill: { color: 'FFFFFF' }
  });
  addParagraph(
    s,
    'Battery Back-up Energy Storage System (ESS)\nIncludes an inverter, stabilizers, HVAC, and a fire suppression system. Full internet system access dashboard.\n• $1,000,000 per MW\n• Up to 2 MW per 20ft GPOD\n• Up to 4 MW per 40ft GPOD',
    LEFT_X + 0.52, CONTENT_Y + 5.95, LEFT_W - 1.02, 1.90, 13.5, false
  );

  rightCard(
    s,
    CONTENT_Y + 0.35,
    3.15,
    'Capital Cost (CAPEX)',
    '$11,000,000 for a 1MWh contiguous power generation and 1MW of battery storage.'
  );

  rightCard(
    s,
    CONTENT_Y + 3.75,
    2.25,
    'Operating Cost (OPEX) annually',
    '$1,036,800.00 PX1'
  );

  rightCard(
    s,
    CONTENT_Y + 6.25,
    2.00,
    'Pricing Note',
    'Pricing values above are taken from the provided screenshot content.'
  );
}

// Slide 7: Future vision
{
  const s = pptx.addSlide();
  addChrome(s, 6, 7);
  addTitle(s, 'A Vision for the Future', LEFT_X + 0.35, CONTENT_Y + 0.30, LEFT_W - 1.0, 0.80, 42);

  addParagraph(
    s,
    'The Plasmonic Hydrogen Power Generator is presented as a transformative platform that unites advanced nanotechnology with sustainable engineering.\n\nBy unlocking the full potential of hydrogen through plasmonic innovation, it offers a clean, efficient, and renewable pathway toward global energy independence.\n\nThis next-generation platform is described as merging scientific precision with commercial scalability, creating a foundation for decentralized, emission-free power systems across transportation, industry, and grid applications.',
    LEFT_X + 0.38, CONTENT_Y + 1.35, LEFT_W - 0.95, 4.45, 15.6
  );

  rightCard(s, CONTENT_Y + 0.40, 2.30, 'Platform Direction', 'Advanced nanotechnology + sustainable engineering.');
  rightCard(s, CONTENT_Y + 2.95, 2.30, 'Deployment Range', 'From compact modular units to national energy infrastructures.');
  rightCard(s, CONTENT_Y + 5.50, 2.85, 'Outcome', 'Positioned to reshape the clean-energy landscape and accelerate the transition toward a zero-carbon world.');
}

pptx.writeFile({ fileName: '/Users/Hans/gpods/slides/plasmonic-hydrogen-7-slides-canva-1920x1080.pptx' })
  .then(() => {
    console.log('Created /Users/Hans/gpods/slides/plasmonic-hydrogen-7-slides-canva-1920x1080.pptx');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
