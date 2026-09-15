/* Frontier Icons — View & navigation */
(window.FrontierIcons = window.FrontierIcons || []).push(
  {
    id: 'zoom-in', name: 'Zoom In', cat: 'view', tags: ['magnify', 'enlarge'],
    risk: 'constrained', note: 'Magnifier again, but octagon lens + accent plus/handle keeps it in-family.',
    body: `<path d="M8 3h6l3 3v6l-3 3H8l-3-3V6z"/><path class="fx-a" d="M15.5 15.5 21 21M9 9.5h4M11 7.5v4"/>`
  },
  {
    id: 'zoom-out', name: 'Zoom Out', cat: 'view', tags: ['magnify', 'shrink'],
    risk: 'constrained', note: 'Mirror semantics of Zoom In.',
    body: `<path d="M8 3h6l3 3v6l-3 3H8l-3-3V6z"/><path class="fx-a" d="M15.5 15.5 21 21M9 9.5h4"/>`
  },
  {
    id: 'zoom-fit', name: 'Zoom to Fit', cat: 'view', tags: ['fit view', 'frame', 'reset zoom'],
    risk: 'original', note: 'Four cut corner hooks closing around an accent content block — "fit" without a lens.',
    body: `<path d="M4 9V6l2-2h3M15 4h3l2 2v3M20 15v3l-2 2h-3M9 20H6l-2-2v-3"/><path class="fx-a" d="M9 9h6v6H9z"/>`
  },
  {
    id: 'fullscreen', name: 'Fullscreen', cat: 'view', tags: ['maximize', 'expand'],
    risk: 'conventional', note: 'Outward arrows; arrowheads are accent.',
    body: `<path class="fx-a" d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/><path d="M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6"/>`
  },
  {
    id: 'preview', name: 'Preview', cat: 'view', tags: ['eye', 'show', 'visible'],
    risk: 'original', note: 'Eye whose iris is a cut-corner octagon — the family mark inside a universal shell.',
    body: `<path d="M2.5 12S6.5 5.5 12 5.5 21.5 12 21.5 12 17.5 18.5 12 18.5 2.5 12 2.5 12z"/><path class="fx-a" d="M10 9.5h4l1.5 1.5v2L14 14.5h-4L8.5 13v-2z"/>`
  },
  {
    id: 'preview-off', name: 'Hide Preview', cat: 'view', tags: ['eye off', 'hidden'],
    risk: 'conventional', note: 'Eye with accent slash.',
    body: `<path d="M2.5 12S6.5 5.5 12 5.5 21.5 12 21.5 12 17.5 18.5 12 18.5 2.5 12 2.5 12z"/><path class="fx-a" d="M4 4l16 16"/>`
  },
  {
    id: 'theme', name: 'Theme', cat: 'view', tags: ['contrast', 'dark mode', 'appearance'],
    risk: 'original', note: 'Half-tinted octagon = contrast dial; no sun/moon cliché.',
    body: `<path d="M8 3h8l3 3v8l-3 3H8l-3-3V6z"/><path class="fx-t" d="M12 3h4l3 3v8l-3 3h-4z"/><path d="M12 3v14"/>`
  },
  {
    id: 'sun', name: 'Light Mode', cat: 'view', tags: ['brightness', 'day'],
    risk: 'conventional', note: 'Octagon core instead of a circle core; rays are accent.',
    body: `<path d="M10 8h4l2 2v4l-2 2h-4l-2-2v-4z"/><path class="fx-a" d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7"/>`
  },
  {
    id: 'moon', name: 'Dark Mode', cat: 'view', tags: ['night', 'dim'],
    risk: 'conventional', note: 'Crescent; inner edge is a cut chord rather than a pure arc.',
    body: `<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>`
  },
  {
    id: 'go-to-line', name: 'Go to Line', cat: 'view', tags: ['jump', 'line number'],
    risk: 'original', note: 'Code rows with an accent pointer bracketing the destination row.',
    body: `<path d="M4 6h11M4 12h9M4 18h11"/><path class="fx-a" d="M19 8.5 21.5 12 19 15.5M17 12h-2"/>`
  },
  {
    id: 'breadcrumb', name: 'Breadcrumb', cat: 'view', tags: ['path', 'trail', 'navigation'],
    risk: 'original', note: 'Path segments joined by a single accent chevron hinge.',
    body: `<path d="M3 12h4.5"/><path class="fx-a" d="M10 8.5 13.5 12 10 15.5"/><path d="M16 12h5"/><path class="fx-f" d="M3.5 10.5h2v3h-2z"/>`
  },
  {
    id: 'outline', name: 'Symbol Outline', cat: 'view', tags: ['structure', 'tree', 'symbols'],
    risk: 'original', note: 'Indented symbol bars; the active symbol is an accent square bullet.',
    body: `<path d="M7 5h13M10 10h10M10 15h7M13 20h7"/><path class="fx-f" d="M4 4h3v3H4z"/><path class="fx-a" d="M7 10h.01M7 15h.01"/>`
  },
  {
    id: 'minimap', name: 'Minimap', cat: 'view', tags: ['overview', 'ruler', 'scroll map'],
    risk: 'original', note: 'Narrow page of hairlines with an accent viewport frame sliding over it.',
    body: `<path d="M9 3h6l2 2v14l-2 2H9l-2-2V5z"/><path stroke-width="1.4" d="M10 7h4M10 10h4M10 13h3M10 16h4"/><path class="fx-a" d="M5.5 9h13v6h-13z"/>`
  },
  {
    id: 'go-to-definition', name: 'Go to Definition', cat: 'view', tags: ['jump to source', 'navigate'],
    risk: 'original', note: 'An accent arrow diving into a bracket pair — destination is code.',
    body: `<path d="M8 4H5v16h3M16 4h3v16h-3"/><path class="fx-a" d="M19.5 4.5 12 12M12 12l-2.5-1M12 12l1-2.5"/>`
  },
  {
    id: 'find-references', name: 'Find References', cat: 'view', tags: ['usages', 'outgoing'],
    risk: 'original', note: 'Inverse of Go to Definition: arrow leaves the brackets toward three use-sites.',
    body: `<path d="M8 4H5v16h3M16 4h3v16h-3"/><path class="fx-a" d="M12 12 19.5 4.5M18 4.5h1.5V6"/><path class="fx-f" d="M10.5 10.5h3v3h-3z"/>`
  },
  {
    id: 'history', name: 'History', cat: 'view', tags: ['clock', 'recent', 'time'],
    risk: 'original', note: 'Clock face as a cut-corner octagon with accent hands.',
    body: `<path d="M8 3h8l3 3v8l-3 3H8l-3-3V6z"/><path class="fx-a" d="M12 7.5V12l3.5 2"/>`
  },
  {
    id: 'refresh', name: 'Refresh', cat: 'view', tags: ['reload', 'sync', 'retry'],
    risk: 'constrained', note: 'Circular arrow is universal; the head is accent and the arc stops short with square ends.',
    body: `<path d="M20 12a8 8 0 1 1-2.5-5.8"/><path class="fx-a" d="M20 3.5V7h-3.5"/>`
  },
  {
    id: 'download', name: 'Download', cat: 'view', tags: ['export file', 'save as'],
    risk: 'conventional', note: 'Cut-corner tray + accent down arrow.',
    body: `<path d="M4 15v4l2 2h12l2-2v-4"/><path class="fx-a" d="M12 3v11M8 10l4 4 4-4"/>`
  },
  {
    id: 'upload', name: 'Upload', cat: 'view', tags: ['import file', 'publish'],
    risk: 'conventional', note: 'Mirror of Download.',
    body: `<path d="M4 15v4l2 2h12l2-2v-4"/><path class="fx-a" d="M12 14V3M8 7l4-4 4 4"/>`
  },
  {
    id: 'external-link', name: 'Open Externally', cat: 'view', tags: ['new window', 'outbound'],
    risk: 'conventional', note: 'Cut-corner box with accent escape arrow.',
    body: `<path d="M10 5H6l-2 2v11l2 2h11l2-2v-4"/><path class="fx-a" d="M14 4h6v6M20 4l-9 9"/>`
  },
  {
    id: 'focus', name: 'Focus Editor', cat: 'view', tags: ['zen', 'center', 'isolate'],
    risk: 'original', note: 'Centre line stays bright while outer lines dim to ticks — focus by subtraction.',
    body: `<path class="fx-a" d="M4 12h16"/><path d="M7 7h10M7 17h10" opacity=".45"/><path d="M4 7h.01M4 17h.01M20 7h.01M20 17h.01"/>`
  }
);
