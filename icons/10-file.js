/* Frontier Icons — File & Workspace
 * Geometry keys (24x24, stroke 2):
 *  DOC   = M8 2h10l2 2v16l-2 2H6l-2-2V6z   (16x20 page, cut corner TOP-LEFT 4u, others 2u)
 *  OCT2  = M5 3h14l2 2v14l-2 2H5l-2-2V5z   (18x18 panel, 2u cut corners)
 *  FOLDER= M3 7l2-2h5l2 2h7l2 2v9l-2 2H5l-2-2z
 * Accent layer: class="fx-a" (accent stroke) / class="fx-f" (accent fill) / class="fx-t" (accent tint fill)
 */
(window.FrontierIcons = window.FrontierIcons || []).push(
  {
    id: 'file', name: 'File', cat: 'file', tags: ['document', 'page', 'plain'],
    risk: 'original', note: 'Cut corner sits top-LEFT with no fold line — the inverse of the usual folded-page glyph.',
    body: `<path d="M8 2h10l2 2v16l-2 2H6l-2-2V6z"/><path class="fx-a" d="M8.5 11h7M8.5 15h7M8.5 18.5h4"/>`
  },
  {
    id: 'file-new', name: 'New File', cat: 'file', tags: ['create', 'add', 'document', 'plus'],
    risk: 'original', note: 'Page + centred accent plus; page silhouette is the Frontier cut-corner document.',
    body: `<path d="M8 2h10l2 2v16l-2 2H6l-2-2V6z"/><path class="fx-a" d="M12 9v6M9 12h6"/>`
  },
  {
    id: 'file-code', name: 'Code File', cat: 'file', tags: ['source', 'script', 'angle brackets'],
    risk: 'original', note: 'Angle brackets rendered as two open 90° hooks inside the cut-corner page.',
    body: `<path d="M8 2h10l2 2v16l-2 2H6l-2-2V6z"/><path class="fx-a" d="M10.5 10.5 8 13.5l2.5 3M13.5 10.5 16 13.5l-2.5 3"/>`
  },
  {
    id: 'file-json', name: 'Data File', cat: 'file', tags: ['json', 'config', 'braces', 'object'],
    risk: 'conventional', note: 'Braces-in-page is a common concept; the brace here is a single-stroke S-curve, tighter than typical curly-brace icons.',
    body: `<path d="M8 2h10l2 2v16l-2 2H6l-2-2V6z"/><path class="fx-a" d="M10.5 9.5c-1.5 0-1.5 1.4-1.5 2.4s-.4 1.7-1.3 2.1c.9.4 1.3 1.1 1.3 2.1s0 2.4 1.5 2.4M13.5 9.5c1.5 0 1.5 1.4 1.5 2.4s.4 1.7 1.3 2.1c-.9.4-1.3 1.1-1.3 2.1s0 2.4-1.5 2.4"/>`
  },
  {
    id: 'file-image', name: 'Image File', cat: 'file', tags: ['picture', 'media', 'photo'],
    risk: 'conventional', note: 'Mountain-in-frame is universal; differentiated by the cut-corner page and an offset accent sun dot.',
    body: `<path d="M8 2h10l2 2v16l-2 2H6l-2-2V6z"/><path class="fx-a" d="M6.5 17.5 10 13l2.6 3.2 2-2.4 2.9 3.7"/><circle class="fx-f" cx="14.8" cy="9.6" r="1.5"/>`
  },
  {
    id: 'file-md', name: 'Markdown File', cat: 'file', tags: ['markdown', 'docs', 'text'],
    risk: 'original', note: 'Monogram M + down-arrow (the Markdown mark) rebuilt as a chamfered M, not the usual rounded one.',
    body: `<path d="M8 2h10l2 2v16l-2 2H6l-2-2V6z"/><path class="fx-a" d="M7.5 17v-5.5l2.5 3 2.5-3V17M16.5 11v6M14.5 15l2 2 2-2"/>`
  },
  {
    id: 'folder', name: 'Folder', cat: 'file', tags: ['directory', 'project'],
    risk: 'constrained', note: 'Folder silhouette is unavoidable; the tab joint is a 45° ramp and body corners are cut, not rounded.',
    body: `<path d="M3 7l2-2h5l2 2h7l2 2v9l-2 2H5l-2-2z"/>`
  },
  {
    id: 'folder-open', name: 'Open Folder', cat: 'file', tags: ['directory', 'expand', 'browse'],
    risk: 'original', note: 'Open state drawn as a slanted front flap overlapping an open-backed shell — no lid swing.',
    body: `<path d="M3 20V6l2-2h4l2 2h7l2 2v4"/><path d="M3 20h14l3-8H6z"/>`
  },
  {
    id: 'folder-new', name: 'New Folder', cat: 'file', tags: ['create', 'directory', 'add'],
    risk: 'conventional', note: 'Folder + plus; plus is the accent layer so it can carry the brand colour.',
    body: `<path d="M3 7l2-2h5l2 2h7l2 2v9l-2 2H5l-2-2z"/><path class="fx-a" d="M12 10v6M9 13h6"/>`
  },
  {
    id: 'file-save', name: 'Save', cat: 'file', tags: ['write', 'disk', 'persist', 'download'],
    risk: 'original', note: 'Deliberately NOT a floppy disk: a page with an accent arrow driving into a baseline slot.',
    body: `<path d="M8 2h10l2 2v16l-2 2H6l-2-2V6z"/><path class="fx-a" d="M12 7.5v6M9 10.5l3 3 3-3"/><path d="M8.5 17.5h7"/>`
  },
  {
    id: 'file-save-all', name: 'Save All', cat: 'file', tags: ['write', 'multiple', 'persist'],
    risk: 'original', note: 'Stacked pages share one accent arrow — reads as "many files, one write".',
    body: `<path d="M11 2h7l2 2v9"/><path d="M6 6h8l2 2v12l-2 2H6l-2-2V8z"/><path class="fx-a" d="M10 10.5v5M8 13.5l2 2 2-2"/>`
  },
  {
    id: 'file-close', name: 'Close File', cat: 'file', tags: ['dismiss', 'document', 'x'],
    risk: 'conventional', note: 'Page + x; the x is accent-coloured so destructive/dismiss intent is tintable.',
    body: `<path d="M8 2h10l2 2v16l-2 2H6l-2-2V6z"/><path class="fx-a" d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>`
  },
  {
    id: 'file-duplicate', name: 'Duplicate File', cat: 'file', tags: ['copy file', 'clone', 'repeat'],
    risk: 'original', note: 'Two cut-corner pages offset on the diagonal with the back page reduced to an echo stroke.',
    body: `<path class="fx-a" d="M10 2h8l2 2v16"/><path d="M6 6h8l2 2v12l-2 2H6l-2-2V8z"/>`
  },
  {
    id: 'trash', name: 'Delete', cat: 'file', tags: ['remove', 'bin', 'discard'],
    risk: 'constrained', note: 'Bin glyph is universal; body is a tapered cut-corner can with accent ribs.',
    body: `<path d="M4.5 7h15M9.5 7V4h5v3"/><path d="M6.5 7 8 21h8l1.5-14"/><path class="fx-a" d="M10.2 11v6M13.8 11v6"/>`
  },
  {
    id: 'file-tree', name: 'File Tree', cat: 'file', tags: ['explorer', 'structure', 'hierarchy'],
    risk: 'original', note: 'Hierarchy drawn as chamfered "tag" nodes on a spine, not indented lines.',
    body: `<path d="M6 3.5v17"/><path d="M6 6.2h3"/><path d="M9 4h6l2 2.2-2 2.3H9L7 6.2z"/><path d="M6 14h4"/><path class="fx-a" d="M10 14h9"/><path d="M6 20h4"/><path d="M10 20h6"/>`
  },
  {
    id: 'panel-left', name: 'Left Panel', cat: 'workspace', tags: ['sidebar', 'layout', 'left'],
    risk: 'conventional', note: 'Pane layout icons are inherently generic; the frame is a cut-corner octagon and the active pane is a tint fill.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path d="M9.5 3.5v17"/><path class="fx-t" d="M5 5h4.5v14H5z"/>`
  },
  {
    id: 'panel-right', name: 'Right Panel', cat: 'workspace', tags: ['sidebar', 'layout', 'right'],
    risk: 'conventional', note: 'Mirror of Left Panel; tint marks the active pane.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path d="M14.5 3.5v17"/><path class="fx-t" d="M14.5 5H19v14h-4.5z"/>`
  },
  {
    id: 'panel-bottom', name: 'Bottom Panel', cat: 'workspace', tags: ['terminal drawer', 'layout', 'output'],
    risk: 'conventional', note: 'Same octagon frame family; horizontal divider with tinted lower pane.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path d="M3.5 14.5h17"/><path class="fx-t" d="M5 14.5h14V19H5z"/>`
  },
  {
    id: 'panel-close', name: 'Hide Panel', cat: 'workspace', tags: ['close sidebar', 'dismiss layout'],
    risk: 'original', note: 'Frame with an accent x sitting on the divider — "the pane goes away".',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path d="M9.5 3.5v17"/><path class="fx-a" d="M13 9.5l4 4M17 9.5l-4 4"/>`
  },
  {
    id: 'split-right', name: 'Split Right', cat: 'workspace', tags: ['editor group', 'columns', 'side by side'],
    risk: 'conventional', note: 'Divider + chevron; the chevron is accent so the "push" direction is tintable.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path d="M12 3v18"/><path class="fx-a" d="M14.5 9.5 17 12l-2.5 2.5"/>`
  },
  {
    id: 'split-down', name: 'Split Down', cat: 'workspace', tags: ['editor group', 'rows', 'horizontal split'],
    risk: 'conventional', note: 'Vertical twin of Split Right.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path d="M3 12h18"/><path class="fx-a" d="M9.5 14.5 12 17l2.5-2.5"/>`
  },
  {
    id: 'workspace', name: 'Workspace', cat: 'workspace', tags: ['three pane', 'ide', 'layout'],
    risk: 'original', note: 'Three-pane IDE silhouette with a tinted centre editor — reads as a workbench, not a window.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path d="M8.5 3.5v17M15.5 3.5v17"/><path class="fx-t" d="M8.5 5h7v14h-7z"/>`
  },
  {
    id: 'tab', name: 'Tab', cat: 'workspace', tags: ['editor tab', 'document switcher'],
    risk: 'original', note: 'Tab drawn as a trapezoid with a 45° left ramp sitting on a rail — no rounded-top tab.',
    body: `<path d="M2 19v-4h3l2.5-5h6L16 15h6v4"/><path d="M2 19h20"/><path class="fx-a" d="M9.5 13h4"/>`
  },
  {
    id: 'tab-close', name: 'Close Tab', cat: 'workspace', tags: ['dismiss tab', 'x'],
    risk: 'conventional', note: 'Tab + accent x.',
    body: `<path d="M2 19v-4h3l2.5-5h6L16 15h6v4"/><path d="M2 19h20"/><path class="fx-a" d="M10 11l3 3M13 11l-3 3"/>`
  },
  {
    id: 'tabs', name: 'All Tabs', cat: 'workspace', tags: ['tab overflow', 'chevron list', 'switcher'],
    risk: 'original', note: 'Two nested tab ramps suggest a stack without drawing stacked rectangles.',
    body: `<path d="M2 19v-4h3l2.5-5h6L16 15h1l2-3h3v7"/><path d="M2 19h20"/>`
  },
  {
    id: 'pin', name: 'Pin', cat: 'workspace', tags: ['keep open', 'sticky', 'fix'],
    risk: 'constrained', note: 'Pushpin is universal; head is a cut-corner block and the needle is the accent layer.',
    body: `<path d="M9 3h6v4l2.5 3v2h-11v-2L9 7z"/><path class="fx-a" d="M12 12v8"/>`
  },
  {
    id: 'sidebar-collapse', name: 'Collapse Sidebar', cat: 'workspace', tags: ['fold pane', 'hide left'],
    risk: 'original', note: 'Divider with an accent arrow folding INTO the edge — direction is explicit.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path d="M9 3v18"/><path class="fx-a" d="M18 12h-5M15.5 9.5 13 12l2.5 2.5"/>`
  },
  {
    id: 'window', name: 'Window', cat: 'workspace', tags: ['app frame', 'chrome', 'titlebar'],
    risk: 'conventional', note: 'Title-bar window is generic; traffic dots are accent fills and the frame is cut-cornered.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path d="M3.5 8h17"/><circle class="fx-f" cx="6.5" cy="5.7" r="1"/><circle class="fx-f" cx="9.7" cy="5.7" r="1"/>`
  },
  {
    id: 'archive', name: 'Archive', cat: 'file', tags: ['box', 'store', 'pack'],
    risk: 'conventional', note: 'Lidded box; lid is a wide cut-corner band rather than a rounded rect.',
    body: `<path d="M3 4h18l1 3v2H2V7z"/><path d="M4 10v8l2 2h12l2-2v-8"/><path class="fx-a" d="M10 14h4"/>`
  },
  {
    id: 'lock', name: 'Locked', cat: 'file', tags: ['readonly', 'secure', 'private'],
    risk: 'constrained', note: 'Padlock is universal; shackle is squared with cut shoulders to match the family.',
    body: `<path d="M6 11h12l2 2v6l-2 2H6l-2-2v-6z"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/><circle class="fx-f" cx="12" cy="16" r="1.6"/>`
  },
  {
    id: 'unlock', name: 'Unlocked', cat: 'file', tags: ['editable', 'open', 'public'],
    risk: 'constrained', note: 'Open-shackle padlock; same family body.',
    body: `<path d="M6 11h12l2 2v6l-2 2H6l-2-2v-6z"/><path d="M8.5 11V8a3.5 3.5 0 0 1 6.8-1.2"/><circle class="fx-f" cx="12" cy="16" r="1.6"/>`
  }
);
