/* Frontier Icons — Code & syntax */
(window.FrontierIcons = window.FrontierIcons || []).push(
  {
    id: 'code', name: 'Code', cat: 'code', tags: ['angle brackets', 'source', 'markup'],
    risk: 'constrained', note: 'Angle brackets are universal; the slash between them is a steep accent diagonal, not the usual gentle one.',
    body: `<path d="M8.5 7 4 12l4.5 5M15.5 7 20 12l-4.5 5"/><path class="fx-a" d="M13.5 5l-3 14"/>`
  },
  {
    id: 'braces', name: 'Braces', cat: 'code', tags: ['curly brackets', 'object', 'block'],
    risk: 'conventional', note: 'Brace glyph is standard; drawn as one continuous S-curve per side with pointed waist.',
    body: `<path d="M10 3c-2.5 0-2 2.5-2 4.5S7 11 5.5 12C7 13 8 13.5 8 15.5S7.5 21 10 21"/><path d="M14 3c2.5 0 2 2.5 2 4.5s1 3.5 2.5 4.5c-1.5 1-2.5 1.5-2.5 3.5S16.5 21 14 21"/>`
  },
  {
    id: 'brackets', name: 'Brackets', cat: 'code', tags: ['square brackets', 'array', 'index'],
    risk: 'original', note: 'Square brackets with 45° cut outer corners — the family chamfer applied to punctuation.',
    body: `<path d="M8 4H6L5 5v14l1 1h2M16 4h2l1 1v14l-1 1h-2"/>`
  },
  {
    id: 'parens', name: 'Parentheses', cat: 'code', tags: ['round brackets', 'call', 'arguments'],
    risk: 'conventional', note: 'Parenthesis arcs; kept pure since the curve IS the glyph.',
    body: `<path d="M9 4a12.5 12.5 0 0 0 0 16M15 4a12.5 12.5 0 0 1 0 16"/>`
  },
  {
    id: 'terminal', name: 'Terminal', cat: 'code', tags: ['console', 'shell', 'prompt', 'cli'],
    risk: 'constrained', note: 'Prompt-in-frame is universal; frame is the cut-corner octagon and the prompt is accent.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path class="fx-a" d="M7 9l3 3-3 3M13 15h5"/>`
  },
  {
    id: 'function', name: 'Function', cat: 'code', tags: ['method', 'f', 'routine'],
    risk: 'original', note: 'Italic ƒ built from one descending stem with a top hook; crossbar is the accent layer.',
    body: `<path d="M15 4c-3.5 0-4 2.5-4 5v6c0 3-.5 5-4 5"/><path class="fx-a" d="M8 10h7"/>`
  },
  {
    id: 'variable', name: 'Variable', cat: 'code', tags: ['identifier', 'value', 'x'],
    risk: 'original', note: 'An x with an assignment dash — reads as "x =" without letterforms.',
    body: `<path class="fx-a" d="M6 9l4 4-4 4M10 9l-4 4 4 4"/><path d="M14 13h6"/>`
  },
  {
    id: 'class', name: 'Class', cat: 'code', tags: ['type', 'object', 'uml'],
    risk: 'original', note: 'UML class box: cut-corner frame, header rule, accent type name.',
    body: `<path d="M5 4h14l2 2v12l-2 2H5l-2-2V6z"/><path d="M3 9h18"/><path class="fx-a" d="M7 6.5h5"/><path d="M7 13h6M7 16.5h4"/>`
  },
  {
    id: 'interface', name: 'Interface', cat: 'code', tags: ['contract', 'protocol', 'abstract'],
    risk: 'original', note: 'A dashed contract frame around a solid accent core — "shape without body".',
    body: `<path stroke-dasharray="4 3" d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path class="fx-a" d="M10 8h4l2 2v4l-2 2h-4l-2-2v-4z"/>`
  },
  {
    id: 'database', name: 'Database', cat: 'code', tags: ['storage', 'sql', 'cylinder'],
    risk: 'constrained', note: 'Cylinder is universal; the middle ring is accent so "data level" is tintable.',
    body: `<path d="M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path class="fx-a" d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>`
  },
  {
    id: 'api', name: 'API', cat: 'code', tags: ['request', 'response', 'exchange', 'endpoint'],
    risk: 'original', note: 'Two-way exchange arrows inside brackets — request/response instead of a cloud.',
    body: `<path d="M7 4H4v16h3M17 4h3v16h-3"/><path class="fx-a" d="M8.5 9.5h7M13 7l2.5 2.5L13 12M15.5 15.5h-7M11 13l-2.5 2.5L11 18"/>`
  },
  {
    id: 'regex', name: 'Regex', cat: 'code', tags: ['pattern', 'wildcard', 'match'],
    risk: 'original', note: 'Literal ".*" — a six-ray asterisk over two accent dots. No other set ships this.',
    body: `<path d="M10 4v7M7 5.5l6 4M13 5.5l-6 4"/><circle class="fx-f" cx="15.5" cy="16" r="1.6"/><circle class="fx-f" cx="20" cy="16" r="1.6"/><path d="M4 20h16"/>`
  },
  {
    id: 'constant', name: 'Constant', cat: 'code', tags: ['hash', 'number', 'immutable'],
    risk: 'original', note: 'A hash whose horizontals are accent and verticals lean — reads as # and as "fixed value".',
    body: `<path d="M10 4 8 20M16 4l-2 16"/><path class="fx-a" d="M5 9h15M4 15h15"/>`
  },
  {
    id: 'string', name: 'String', cat: 'code', tags: ['quotes', 'text literal'],
    risk: 'original', note: 'Open-quote pair drawn as two tapered commas, oversized so they read at 16px.',
    body: `<path d="M9.5 6C6.5 6 5 8.2 5 10.6S6.7 15 9 15c0 2.2-1 3.6-2.7 4.4"/><path d="M18.5 6c-3 0-4.5 2.2-4.5 4.6S15.7 15 18 15c0 2.2-1 3.6-2.7 4.4"/>`
  },
  {
    id: 'module', name: 'Module', cat: 'code', tags: ['package', 'cube', 'import'],
    risk: 'constrained', note: 'Isometric cube is standard for packages; top face is tinted.',
    body: `<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/><path class="fx-t" d="M12 4l8 4-8 4-8-4z"/>`
  },
  {
    id: 'command-palette', name: 'Command Palette', cat: 'code', tags: ['quick open', 'commands', 'input'],
    risk: 'original', note: 'Frame with prompt chevron, a typed token and a suggestion line — a palette in miniature.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path class="fx-a" d="M7 8l2.5 2.5L7 13"/><path d="M12 10.5h6"/><path d="M7 16.5h10"/>`
  },
  {
    id: 'extension', name: 'Extension', cat: 'code', tags: ['plugin', 'add-on', 'plug'],
    risk: 'constrained', note: 'Plug glyph; body is a cut-corner bowl and the cord is accent.',
    body: `<path d="M9 3v5M15 3v5"/><path d="M6 8h12v4a6 6 0 0 1-6 6 6 6 0 0 1-6-6z"/><path class="fx-a" d="M12 18v3"/>`
  },
  {
    id: 'run', name: 'Run', cat: 'code', tags: ['play', 'start', 'execute'],
    risk: 'constrained', note: 'Play triangle with a cut leading edge; accent so "go" can be green in-app.',
    body: `<path class="fx-a" d="M8 5l10 5.5v3L8 19z"/>`
  },
  {
    id: 'build', name: 'Build', cat: 'code', tags: ['compile', 'hammer', 'make'],
    risk: 'conventional', note: 'Hammer head is a cut-corner block on an accent handle.',
    body: `<path d="M4.5 8.5 8.5 4.5 14 10l-4 4z"/><path d="M8.5 4.5 11 2l5.5 5.5L14 10"/><path class="fx-a" d="M12 12l8 8"/>`
  },
  {
    id: 'test', name: 'Test', cat: 'code', tags: ['flask', 'spec', 'check'],
    risk: 'conventional', note: 'Flask with cut shoulders; liquid line is accent.',
    body: `<path d="M10 3h4M11 3v6l-6 9 1.5 3h11L19 18l-6-9V3"/><path class="fx-a" d="M7.5 15h9"/>`
  }
);
