/* Frontier Icons — Diagnostics, debug & run control */
(window.FrontierIcons = window.FrontierIcons || []).push(
  {
    id: 'error', name: 'Error', cat: 'diag', tags: ['problem', 'failure', 'x'],
    risk: 'original', note: 'Cut-corner octagon badge with accent x — no circle-slash cliché.',
    body: `<path d="M8 3h8l3 3v8l-3 3H8l-3-3V6z"/><path class="fx-a" d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>`
  },
  {
    id: 'warning', name: 'Warning', cat: 'diag', tags: ['caution', 'alert', 'triangle'],
    risk: 'constrained', note: 'Warning triangle is universal; ours has cut base corners and an accent exclamation.',
    body: `<path d="M10.5 4h3L21 18.5 19.5 21h-15L3 18.5z"/><path class="fx-a" d="M12 9v4.5M12 17h.01"/>`
  },
  {
    id: 'info', name: 'Info', cat: 'diag', tags: ['note', 'detail'],
    risk: 'original', note: 'Octagon badge with accent i.',
    body: `<path d="M8 3h8l3 3v8l-3 3H8l-3-3V6z"/><path class="fx-a" d="M12 11v4.5M12 7.5h.01"/>`
  },
  {
    id: 'hint', name: 'Hint', cat: 'diag', tags: ['lightbulb', 'suggestion', 'idea'],
    risk: 'constrained', note: 'Bulb with a cut-corner glass and accent filament rays.',
    body: `<path d="M9.5 17a6.5 6.5 0 1 1 5 0v2.5h-5z"/><path d="M10.5 22h3"/><circle class="fx-f" cx="12" cy="10" r="1.4"/><path class="fx-a" d="M12 11.5V15"/>`
  },
  {
    id: 'breakpoint', name: 'Breakpoint', cat: 'diag', tags: ['debug marker', 'gutter', 'pause here'],
    risk: 'original', note: 'Gutter rule with a solid accent marker tag — exactly how breakpoints live in editors.',
    body: `<path d="M6 3.5v17"/><path class="fx-f" d="M11 9h6l2.5 3-2.5 3h-6l-2.5-3z"/>`
  },
  {
    id: 'debug-start', name: 'Debug', cat: 'diag', tags: ['start debugging', 'play', 'bug'],
    risk: 'original', note: 'Chamfered play wedge plus a bug antenna pair — run + inspect in one glyph.',
    body: `<path class="fx-a" d="M6 5l9 5v4l-9 5z"/><path d="M18.5 7.5 21 5M18.5 16.5 21 19"/>`
  },
  {
    id: 'debug-pause', name: 'Pause', cat: 'diag', tags: ['halt', 'suspend'],
    risk: 'conventional', note: 'Twin accent bars with cut ends.',
    body: `<path class="fx-a" d="M8.5 5h2v14h-2zM13.5 5h2v14h-2z"/>`
  },
  {
    id: 'debug-stop', name: 'Stop', cat: 'diag', tags: ['terminate', 'end run'],
    risk: 'conventional', note: 'Accent cut-corner block.',
    body: `<path class="fx-a" d="M7 5h10l2 2v10l-2 2H7l-2-2V7z"/>`
  },
  {
    id: 'step-over', name: 'Step Over', cat: 'diag', tags: ['next', 'skip call'],
    risk: 'conventional', note: 'Arc over a node with accent landing arrow.',
    body: `<path d="M5 17a7 7 0 0 1 14 0"/><path class="fx-a" d="M19 17h-9M13 14.5 10.5 17l2.5 2.5"/><circle class="fx-f" cx="5" cy="17" r="1.8"/>`
  },
  {
    id: 'step-into', name: 'Step Into', cat: 'diag', tags: ['dive', 'enter call'],
    risk: 'conventional', note: 'Accent arrow descending into a cut bracket floor.',
    body: `<path class="fx-a" d="M12 3v10M9 10l3 3 3-3"/><path d="M5 16v3l2 2h10l2-2v-3"/>`
  },
  {
    id: 'step-out', name: 'Step Out', cat: 'diag', tags: ['return', 'exit call'],
    risk: 'conventional', note: 'Mirror of Step Into.',
    body: `<path class="fx-a" d="M12 17V7M9 10l3-3 3 3"/><path d="M5 16v3l2 2h10l2-2v-3"/>`
  },
  {
    id: 'console', name: 'Console', cat: 'diag', tags: ['output', 'logs', 'terminal'],
    risk: 'original', note: 'Frame with prompt chevron and three log rows of decreasing weight.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path class="fx-a" d="M7 7.5l2.5 2.5L7 12.5"/><path d="M12 10h6M7 16h11"/>`
  },
  {
    id: 'stack-trace', name: 'Stack Trace', cat: 'diag', tags: ['frames', 'call stack'],
    risk: 'original', note: 'Stacked frames offset like falling cards; top frame is the accent active frame.',
    body: `<path class="fx-a" d="M6 4h12v4H6z"/><path d="M7.5 11h12v4h-12z"/><path d="M9 18h12v4H9z"/>`
  },
  {
    id: 'profile', name: 'Profile', cat: 'diag', tags: ['flame graph', 'performance', 'hot path'],
    risk: 'conventional', note: 'Flame silhouette with cut base; inner flame is accent.',
    body: `<path d="M12 3c3.5 4 6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 11 7.5 8.5 9.5 6.5c0 2 .8 3.2 2 4 .2-3 .2-5.5.5-7.5z"/><path class="fx-a" d="M12 13c1.4 1.6 2 2.6 2 4a2 2 0 0 1-4 0c0-1 .6-2.2 2-4z"/>`
  },
  {
    id: 'watch', name: 'Watch', cat: 'diag', tags: ['inspect', 'monitor', 'expression'],
    risk: 'original', note: 'Octagon eye-lid over an accent variable x — "watched value".',
    body: `<path d="M8 4h8l3 3v7l-3 3H8l-3-3V7z"/><path class="fx-a" d="M7.5 11h2l1.5-3 2 6 1.5-3h2"/>`
  },
  {
    id: 'problems', name: 'Problems', cat: 'diag', tags: ['diagnostics list', 'issues'],
    risk: 'original', note: 'List rows each prefixed by a severity glyph: accent x, then wedge, then dot.',
    body: `<path class="fx-a" d="M4.5 5 7 7.5M7 5 4.5 7.5"/><path d="M10 6.2h10"/><path class="fx-a" d="M4.5 11h3l1 1.2-1 1.3h-3L3.5 12.2z"/><path d="M10 12.2h10"/><circle class="fx-f" cx="6" cy="18.2" r="1.6"/><path d="M10 18.2h7"/>`
  },
  {
    id: 'coverage', name: 'Coverage', cat: 'diag', tags: ['tests hit', 'percentage'],
    risk: 'original', note: 'A bar gauge: tinted filled portion against an ink outline track.',
    body: `<path d="M5 8h14l2 2v4l-2 2H5l-2-2v-4z"/><path class="fx-t" d="M5 10h9v4H5z"/><path class="fx-a" d="M14 8v8"/>`
  }
);
