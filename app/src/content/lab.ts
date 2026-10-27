export type Sketch = {
  slug: string;
  titre: string;
  description: string;
};

// Les 30 sketches du /lab d'origine, dans l'ordre de la page d'index.
export const sketches: Sketch[] = [
  { slug: 'companion', titre: 'Companion', description: 'A second cursor that waits.' },
  { slug: 'contact-sheet', titre: 'Contact sheet', description: 'Thirty frames, one grid.' },
  { slug: 'dial-is-a-day', titre: 'Dial is a day', description: 'A day you can turn.' },
  { slug: 'focus-pull', titre: 'Focus pull', description: 'Depth you can drag.' },
  { slug: 'footprints', titre: 'Footprints', description: 'What the field remembers.' },
  { slug: 'growing-type', titre: 'Growing type', description: 'Letters that take root.' },
  { slug: 'horizon-menu', titre: 'Horizon menu', description: 'Navigation that belongs to the picture.' },
  { slug: 'idle', titre: 'Idle', description: 'What the page does when you leave.' },
  { slug: 'impression', titre: 'Impression', description: 'Pressure, plate, paper.' },
  { slug: 'leaning-field', titre: 'Leaning field', description: 'Wind as a shared state.' },
  { slug: 'letters-in-the-grass', titre: 'Letters in the grass', description: 'The writing and the field, arguing.' },
  { slug: 'local-sky', titre: 'Local sky', description: 'A sky that knows where you are.' },
  { slug: 'loupe', titre: 'Loupe', description: 'Close looking as an instrument.' },
  { slug: 'marginalia', titre: 'Marginalia', description: 'Notes in the gutter.' },
  { slug: 'misregistration', titre: 'Misregistration', description: 'When the plates slip.' },
  { slug: 'mow', titre: 'Mow', description: 'A field you cut.' },
  { slug: 'page-turn', titre: 'Page turn', description: 'The page as a physical event.' },
  { slug: 'planted', titre: 'Planted', description: 'Type that has been planted.' },
  { slug: 'plates', titre: 'Plates', description: 'Registration and the press.' },
  { slug: 'reflow', titre: 'Reflow', description: 'The grid, admitted.' },
  { slug: 'registration', titre: 'Registration', description: 'Marks that hold the colour.' },
  { slug: 'ribbon', titre: 'Ribbon', description: 'A line that travels.' },
  { slug: 'seasons', titre: 'Seasons', description: 'The sun, the sky, the year.' },
  { slug: 'stamp', titre: 'Stamp', description: 'A mark you leave.' },
  { slug: 'tab-index', titre: 'Tab index', description: 'Order you can feel.' },
  { slug: 'the-grid', titre: 'The grid', description: 'Structure, exposed.' },
  { slug: 'type-in-the-field', titre: 'Type in the field', description: 'Letters as a physical event.' },
  { slug: 'walk-in', titre: 'Walk in', description: 'Arriving somewhere.' },
  { slug: 'weather', titre: 'Weather', description: 'The year, as a colour.' },
  { slug: 'wet-ink', titre: 'Wet ink', description: 'Ink that has not dried.' },
];
