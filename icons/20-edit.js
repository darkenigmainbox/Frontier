/* Frontier Icons — Editing operations */
(window.FrontierIcons = window.FrontierIcons || []).push(
  {
    id: 'undo', name: 'Undo', cat: 'edit', tags: ['revert', 'back', 'history'],
    risk: 'constrained', note: 'Undo arrow is universal; the hook here is a 45° corner instead of a full semicircle.',
    body: `<path d="M4 9h10a5 5 0 0 1 5 5v3"/><path class="fx-a" d="M7.5 5.5 4 9l3.5 3.5"/>`
  },
  {
    id: 'redo', name: 'Redo', cat: 'edit', tags: ['forward', 'reapply'],
    risk: 'constrained', note: 'Mirror of Undo.',
    body: `<path d="M20 9H10a5 5 0 0 0-5 5v3"/><path class="fx-a" d="M16.5 5.5 20 9l-3.5 3.5"/>`
  },
  {
    id: 'cut', name: 'Cut', cat: 'edit', tags: ['scissors', 'clip'],
    risk: 'constrained', note: 'Scissors are unavoidable; blades cross at a steeper 60° and handles are cut-corner rings, not circles.',
    body: `<circle cx="6.5" cy="18" r="2.8"/><circle cx="17.5" cy="18" r="2.8"/><path d="M8.6 15.9 18 3M15.4 15.9 6 3"/><path class="fx-a" d="M12 10.5v.01"/>`
  },
  {
    id: 'copy', name: 'Copy', cat: 'edit', tags: ['duplicate', 'clipboard'],
    risk: 'constrained', note: 'Two-page copy is universal; both pages carry the cut corner and the back page is an echo stroke.',
    body: `<path class="fx-a" d="M9 9V4l2-2h8l2 2v11l-2 2h-3"/><path d="M5 9h8l2 2v9l-2 2H5l-2-2V11z"/>`
  },
  {
    id: 'paste', name: 'Paste', cat: 'edit', tags: ['clipboard', 'insert'],
    risk: 'constrained', note: 'Clipboard is universal; board is cut-cornered and the clip is a squared bridge.',
    body: `<path d="M8 4H6l-2 2v14l2 2h12l2-2V6l-2-2h-2"/><path d="M9 2.5h6V6H9z"/><path class="fx-a" d="M8 11h8M8 15h5"/>`
  },
  {
    id: 'select-all', name: 'Select All', cat: 'edit', tags: ['selection', 'frame', 'brackets'],
    risk: 'original', note: 'Selection drawn as four detached corner brackets (a marching-ants abstraction), not a solid rect.',
    body: `<path d="M4 8V6l2-2h2M16 4h2l2 2v2M20 16v2l-2 2h-2M8 20H6l-2-2v-2"/><path class="fx-t" d="M8 8h8v8H8z"/>`
  },
  {
    id: 'find', name: 'Find', cat: 'edit', tags: ['search', 'magnifier', 'locate'],
    risk: 'constrained', note: 'Magnifier is the most universal glyph in UI; differentiation: lens is a cut-corner OCTAGON, handle at 45°.',
    body: `<path d="M8 3h6l3 3v6l-3 3H8l-3-3V6z"/><path class="fx-a" d="M15.5 15.5 21 21"/><path d="M8.5 8h4"/>`
  },
  {
    id: 'find-alt', name: 'Find (text)', cat: 'edit', tags: ['search', 'in document', 'alternate'],
    risk: 'original', note: 'Alternative search with zero magnifier: a page whose lines are interrupted by a highlighted run.',
    body: `<path d="M8 2h10l2 2v16l-2 2H6l-2-2V6z"/><path d="M8.5 8h7"/><path d="M8.5 18h4"/><path class="fx-a" d="M8 11.5h8v3.5H8z"/>`
  },
  {
    id: 'replace', name: 'Find & Replace', cat: 'edit', tags: ['swap', 'substitute'],
    risk: 'original', note: 'Two text runs with a swap arrow between; the incoming run is tinted to show the substitution target.',
    body: `<path d="M4 6h13"/><path d="M7 18h13"/><path class="fx-t" d="M7 16.5h6v3H7z"/><path class="fx-a" d="M19 6v6a3 3 0 0 1-3 3h-5M14 12l-3 3 3 3"/>`
  },
  {
    id: 'find-in-files', name: 'Find in Files', cat: 'edit', tags: ['global search', 'project search'],
    risk: 'original', note: 'Octagon lens sweeping two stacked pages.',
    body: `<path d="M11 2h7l2 2v5"/><path d="M6 6h8l2 2v11l-2 2H6l-2-2V8z"/><path d="M8 10h5"/><path class="fx-a" d="M10.5 13h4l2 2v3l-2 2h-4l-2-2v-3zM16.5 18.5l4 4"/>`
  },
  {
    id: 'line-numbers', name: 'Line Numbers', cat: 'edit', tags: ['gutter', 'numbering', 'ruler'],
    risk: 'original', note: 'Gutter rule with tick digits abstraction: short ticks left of long text lines.',
    body: `<path d="M7 3v18"/><path class="fx-a" d="M4 6h1.5M4 10h1.5M4 14h1.5M4 18h1.5"/><path d="M10 6h10M10 10h10M10 14h7M10 18h10"/>`
  },
  {
    id: 'indent-more', name: 'Increase Indent', cat: 'edit', tags: ['tab in', 'nest'],
    risk: 'conventional', note: 'Indent arrows are standard; the pushed line carries an accent chevron.',
    body: `<path d="M4 5h16M4 19h16"/><path d="M12 9h8M12 15h8"/><path class="fx-a" d="M5 9l3 3-3 3"/>`
  },
  {
    id: 'indent-less', name: 'Decrease Indent', cat: 'edit', tags: ['tab out', 'unnest'],
    risk: 'conventional', note: 'Mirror of Increase Indent.',
    body: `<path d="M4 5h16M4 19h16"/><path d="M12 9h8M12 15h8"/><path class="fx-a" d="M8 9l-3 3 3 3"/>`
  },
  {
    id: 'comment-lines', name: 'Toggle Comment', cat: 'edit', tags: ['comment out', 'slash', 'mute code'],
    risk: 'original', note: 'Two code lines each slashed at 45° by one continuous accent stroke — literal "commented out".',
    body: `<path d="M4 7h10M4 12h10M4 17h7"/><path class="fx-a" d="M15.5 5 8.5 19M19.5 5l-7 14"/>`
  },
  {
    id: 'word-wrap', name: 'Word Wrap', cat: 'edit', tags: ['wrap', 'soft break', 'reflow'],
    risk: 'conventional', note: 'Wrap arrow bending under a line; bend is a cut corner rather than a curve.',
    body: `<path d="M4 6h16v5l-2 2h-6"/><path class="fx-a" d="M15 10l-3 3 3 3"/><path d="M4 18h9"/>`
  },
  {
    id: 'format-doc', name: 'Format Document', cat: 'edit', tags: ['prettify', 'tidy', 'align'],
    risk: 'original', note: 'Ragged lines snapped to a shared accent baseline tick — shows the result, not a wand.',
    body: `<path d="M5 5h9M5 9h13M5 13h6M5 17h11"/><path class="fx-a" d="M19.5 4v16"/>`
  },
  {
    id: 'sort-lines', name: 'Sort Lines', cat: 'edit', tags: ['order', 'az', 'arrange'],
    risk: 'original', note: 'Three lines of decreasing length with a descending accent arrow alongside.',
    body: `<path d="M5 6h12M5 11h9M5 16h6"/><path class="fx-a" d="M20 5v14M17 16l3 3 3-3"/>`
  },
  {
    id: 'delete-line', name: 'Delete Line', cat: 'edit', tags: ['remove row', 'kill line'],
    risk: 'original', note: 'A line struck through with an accent x-slash while its neighbours survive.',
    body: `<path d="M4 6h12M4 18h12"/><path d="M4 12h10"/><path class="fx-a" d="M16 9.5 21 14.5M21 9.5 16 14.5"/>`
  },
  {
    id: 'move-line-up', name: 'Move Line Up', cat: 'edit', tags: ['reorder', 'shift up'],
    risk: 'conventional', note: 'Line + up arrow; the moving line is accent to distinguish actor from context.',
    body: `<path d="M5 6h9M5 13h14M5 18h14"/><path class="fx-a" d="M18 10V3M15 6l3-3 3 3"/>`
  },
  {
    id: 'move-line-down', name: 'Move Line Down', cat: 'edit', tags: ['reorder', 'shift down'],
    risk: 'conventional', note: 'Mirror of Move Line Up.',
    body: `<path d="M5 6h14M5 11h14M5 18h9"/><path class="fx-a" d="M18 14v7M15 18l3 3 3-3"/>`
  },
  {
    id: 'multi-cursor', name: 'Multi Cursor', cat: 'edit', tags: ['multiple carets', 'column edit'],
    risk: 'original', note: 'Three I-beam carets staggered — no other common set shows plural carets.',
    body: `<path d="M5 4v6M3.5 4h3M3.5 10h3"/><path class="fx-a" d="M12 9v6M10.5 9h3M10.5 15h3"/><path d="M19 14v6M17.5 14h3M17.5 20h3"/>`
  },
  {
    id: 'column-select', name: 'Column Selection', cat: 'edit', tags: ['box select', 'block'],
    risk: 'original', note: 'A tinted block with corner nubs — the box-selection rectangle made tangible.',
    body: `<path class="fx-t" d="M6 5h12v14H6z"/><path d="M6 5h12v14H6z"/><path class="fx-a" d="M6 2.5v2.5M18 2.5V5M6 19v2.5M18 19v2.5"/>`
  },
  {
    id: 'fold', name: 'Fold', cat: 'edit', tags: ['collapse', 'region', 'chevron'],
    risk: 'conventional', note: 'Chevron-into-bracket; bracket is cut-cornered.',
    body: `<path d="M6 4H4v16h2M18 4h2v16h-2"/><path class="fx-a" d="M9 9l3 3 3-3"/>`
  },
  {
    id: 'unfold', name: 'Unfold', cat: 'edit', tags: ['expand', 'region'],
    risk: 'conventional', note: 'Mirror of Fold.',
    body: `<path d="M6 4H4v16h2M18 4h2v16h-2"/><path class="fx-a" d="M9 12l3-3 3 3"/>`
  },
  {
    id: 'fold-all', name: 'Fold All', cat: 'edit', tags: ['collapse all', 'regions'],
    risk: 'original', note: 'Double chevron stacked into a bracket pair.',
    body: `<path d="M6 4H4v16h2M18 4h2v16h-2"/><path class="fx-a" d="M9 8l3 3 3-3M9 13l3 3 3-3"/>`
  },
  {
    id: 'unfold-all', name: 'Unfold All', cat: 'edit', tags: ['expand all', 'regions'],
    risk: 'original', note: 'Mirror of Fold All.',
    body: `<path d="M6 4H4v16h2M18 4h2v16h-2"/><path class="fx-a" d="M9 11l3-3 3 3M9 16l3-3 3 3"/>`
  },
  {
    id: 'bookmark', name: 'Bookmark', cat: 'edit', tags: ['marker', 'flag', 'remember'],
    risk: 'constrained', note: 'Ribbon bookmark is universal; tail is cut as a double 45° notch instead of a V.',
    body: `<path d="M9 3h8l2 2v16l-6-4-6 4V5z"/>`
  },
  {
    id: 'snippet', name: 'Snippet', cat: 'edit', tags: ['template', 'block insert'],
    risk: 'original', note: 'A cut-corner page with a bite taken out (dashed gap) where the snippet slots in.',
    body: `<path d="M8 2h10l2 2v16l-2 2H6l-2-2V6z"/><path class="fx-a" d="M13 10h8v7h-8zM15.5 13.5h3"/>`
  },
  {
    id: 'cursor', name: 'Text Cursor', cat: 'edit', tags: ['caret', 'insertion point', 'i-beam'],
    risk: 'conventional', note: 'I-beam; serifs are angled cuts rather than horizontal bars.',
    body: `<path d="M12 5v14"/><path class="fx-a" d="M9 3.5 12 5l3-1.5M9 20.5 12 19l3 1.5"/>`
  },
  {
    id: 'highlight', name: 'Highlight', cat: 'edit', tags: ['marker pen', 'emphasise'],
    risk: 'conventional', note: 'Marker pen at 45°; the ink trail is the tint layer.',
    body: `<path d="M15 4l5 5-9 9H6v-5z"/><path d="M13 6l5 5"/><path class="fx-a" d="M4 20.5h9"/>`
  },
  {
    id: 'edit-pencil', name: 'Rename / Edit', cat: 'edit', tags: ['pencil', 'write', 'modify'],
    risk: 'constrained', note: 'Pencil is universal; ferrule is a cut band and the tip is accent.',
    body: `<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/><path class="fx-a" d="M4 20l1-5 4 4z"/>`
  }
);
