/* Frontier Icons — General UI primitives */
(window.FrontierIcons = window.FrontierIcons || []).push(
  {
    id: 'chevron-down', name: 'Chevron Down', cat: 'ui', tags: ['expand', 'down'],
    risk: 'conventional', note: 'Plain chevron; universal primitive.',
    body: `<path d="M6 9.5 12 15.5 18 9.5"/>`
  },
  {
    id: 'chevron-up', name: 'Chevron Up', cat: 'ui', tags: ['collapse', 'up'],
    risk: 'conventional', note: 'Plain chevron; universal primitive.',
    body: `<path d="M6 14.5 12 8.5 18 14.5"/>`
  },
  {
    id: 'chevron-left', name: 'Chevron Left', cat: 'ui', tags: ['back', 'previous'],
    risk: 'conventional', note: 'Plain chevron; universal primitive.',
    body: `<path d="M14.5 6 8.5 12l6 6"/>`
  },
  {
    id: 'chevron-right', name: 'Chevron Right', cat: 'ui', tags: ['forward', 'next'],
    risk: 'conventional', note: 'Plain chevron; universal primitive.',
    body: `<path d="M9.5 6 15.5 12l-6 6"/>`
  },
  {
    id: 'arrow-left', name: 'Arrow Left', cat: 'ui', tags: ['back'],
    risk: 'conventional', note: 'Plain arrow; universal primitive.',
    body: `<path d="M20 12H4M10 6l-6 6 6 6"/>`
  },
  {
    id: 'arrow-right', name: 'Arrow Right', cat: 'ui', tags: ['forward'],
    risk: 'conventional', note: 'Plain arrow; universal primitive.',
    body: `<path d="M4 12h16M14 6l6 6-6 6"/>`
  },
  {
    id: 'arrow-up', name: 'Arrow Up', cat: 'ui', tags: ['rise'],
    risk: 'conventional', note: 'Plain arrow; universal primitive.',
    body: `<path d="M12 20V4M6 10l6-6 6 6"/>`
  },
  {
    id: 'arrow-down', name: 'Arrow Down', cat: 'ui', tags: ['fall'],
    risk: 'conventional', note: 'Plain arrow; universal primitive.',
    body: `<path d="M12 4v16M6 14l6 6 6-6"/>`
  },
  {
    id: 'check', name: 'Check', cat: 'ui', tags: ['ok', 'done', 'success'],
    risk: 'conventional', note: 'Plain tick; universal primitive.',
    body: `<path d="M4.5 12.5 9.5 18 19.5 6.5"/>`
  },
  {
    id: 'x', name: 'Close', cat: 'ui', tags: ['dismiss', 'cancel'],
    risk: 'conventional', note: 'Plain cross; universal primitive.',
    body: `<path d="M6 6l12 12M18 6 6 18"/>`
  },
  {
    id: 'plus', name: 'Plus', cat: 'ui', tags: ['add', 'new'],
    risk: 'conventional', note: 'Plain plus; universal primitive.',
    body: `<path d="M12 5v14M5 12h14"/>`
  },
  {
    id: 'minus', name: 'Minus', cat: 'ui', tags: ['remove', 'subtract'],
    risk: 'conventional', note: 'Plain minus; universal primitive.',
    body: `<path d="M5 12h14"/>`
  },
  {
    id: 'more-h', name: 'More', cat: 'ui', tags: ['overflow', 'menu', 'ellipsis'],
    risk: 'conventional', note: 'Three accent squares instead of dots — family chamfer at micro scale.',
    body: `<path class="fx-f" d="M4 10.5h3v3H4zM10.5 10.5h3v3h-3zM17 10.5h3v3h-3z"/>`
  },
  {
    id: 'more-v', name: 'More Vertical', cat: 'ui', tags: ['overflow', 'kebab'],
    risk: 'conventional', note: 'Vertical twin of More.',
    body: `<path class="fx-f" d="M10.5 4h3v3h-3zM10.5 10.5h3v3h-3zM10.5 17h3v3h-3z"/>`
  },
  {
    id: 'grip', name: 'Drag Handle', cat: 'ui', tags: ['grab', 'reorder', 'dots'],
    risk: 'conventional', note: 'Six square grips.',
    body: `<path class="fx-f" d="M8.5 5h2.5v2.5H8.5zM13 5h2.5v2.5H13zM8.5 10.75h2.5v2.5H8.5zM13 10.75h2.5v2.5H13zM8.5 16.5h2.5V19H8.5zM13 16.5h2.5V19H13z"/>`
  },
  {
    id: 'settings', name: 'Settings', cat: 'ui', tags: ['preferences', 'sliders', 'options'],
    risk: 'original', note: 'Three slider rails with hex knobs at different offsets — no gear cliché.',
    body: `<path d="M4 7h16M4 12h16M4 17h16"/><path class="fx-a" d="M8 5h2.5l2 2-2 2H8L6 7z"/><path class="fx-a" d="M14 10h2.5l2 2-2 2H14l-2-2z"/><path class="fx-a" d="M10 15h2.5l2 2-2 2H10l-2-2z"/>`
  },
  {
    id: 'bell', name: 'Notifications', cat: 'ui', tags: ['alert', 'ping'],
    risk: 'constrained', note: 'Bell with cut shoulders; clapper is accent.',
    body: `<path d="M9 5h6l2 4v4l2.5 3.5h-15L7 13V9z"/><path class="fx-a" d="M10 19.5a2 2 0 0 0 4 0"/>`
  },
  {
    id: 'star', name: 'Favourite', cat: 'ui', tags: ['favorite', 'pin top'],
    risk: 'conventional', note: 'Five-point star with flattened top ray.',
    body: `<path d="M12 3.5 14.4 9l5.6.5-4.3 3.9 1.3 5.6L12 16l-5 3 1.3-5.6L4 9.5 9.6 9z"/>`
  },
  {
    id: 'filter', name: 'Filter', cat: 'ui', tags: ['funnel', 'narrow'],
    risk: 'constrained', note: 'Funnel with cut rim corners.',
    body: `<path d="M4 4h16l-1 3-5 6v6l-4 2v-8L5 7z"/>`
  },
  {
    id: 'sort', name: 'Sort', cat: 'ui', tags: ['order', 'ascending'],
    risk: 'conventional', note: 'Up/down arrow pair; down arrow is accent.',
    body: `<path d="M8 19V5M5 8l3-3 3 3"/><path class="fx-a" d="M16 5v14M13 16l3 3 3-3"/>`
  },
  {
    id: 'user', name: 'Account', cat: 'ui', tags: ['person', 'profile', 'avatar'],
    risk: 'constrained', note: 'Person with cut-corner head instead of circle head.',
    body: `<path d="M10 4h4l2 2v3l-2 2h-4l-2-2V6z"/><path d="M4.5 20c.8-4.2 3.8-6 7.5-6s6.7 1.8 7.5 6"/>`
  },
  {
    id: 'zap', name: 'Quick Action', cat: 'ui', tags: ['bolt', 'fast', 'macro'],
    risk: 'conventional', note: 'Bolt with cut waist.',
    body: `<path d="M13 2 4.5 13.5H11L9.5 22 19 10.5h-6.5z"/>`
  },
  {
    id: 'flag', name: 'Flag', cat: 'ui', tags: ['mark', 'follow up'],
    risk: 'conventional', note: 'Pennant with cut fly end.',
    body: `<path d="M5 21V4"/><path class="fx-a" d="M5 4h12l-2 3.5 2 3.5H5"/>`
  },
  {
    id: 'shield', name: 'Trust', cat: 'ui', tags: ['security', 'workspace trust'],
    risk: 'constrained', note: 'Shield with cut top corners and accent check.',
    body: `<path d="M6 4h12l2 2v6c0 5-4 8-8 10-4-2-8-5-8-10V6z"/><path class="fx-a" d="M9 11.5l2.2 2.5L15.5 9"/>`
  },
  {
    id: 'cloud', name: 'Cloud Sync', cat: 'ui', tags: ['remote', 'settings sync'],
    risk: 'constrained', note: 'Cloud built from two cut lobes over a flat base.',
    body: `<path d="M7 18h11l2-2v-3l-2-2h-1l-1-4-2-2H9L7 7l-1 4H5l-2 2v3z"/>`
  },
  {
    id: 'circle-oct', name: 'Status Dot', cat: 'ui', tags: ['indicator', 'octagon', 'placeholder'],
    risk: 'original', note: 'The family octagon, empty — a status container.',
    body: `<path d="M8 4h8l4 4v8l-4 4H8l-4-4V8z"/>`
  },
  {
    id: 'dot', name: 'Modified Dot', cat: 'ui', tags: ['unsaved', 'dirty', 'indicator'],
    risk: 'original', note: 'Solid accent hex-node: the "unsaved change" marker.',
    body: `<path class="fx-f" d="M9 8h6l3 4-3 4H9l-3-4z"/>`
  },
  {
    id: 'home', name: 'Home', cat: 'ui', tags: ['start', 'welcome'],
    risk: 'conventional', note: 'House with cut eaves.',
    body: `<path d="M4 11 12 4l8 7"/><path d="M6 10v9l2 2h8l2-2v-9"/><path class="fx-a" d="M10 21v-6h4v6"/>`
  }
);
