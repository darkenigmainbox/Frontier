/* Frontier Icons — Text, typing & insert */
(window.FrontierIcons = window.FrontierIcons || []).push(
  {
    id: 'bold', name: 'Bold', cat: 'text', tags: ['weight', 'strong', 'b'],
    risk: 'original', note: 'B rebuilt as two stacked cut-corner bowls on a shared spine — no round counters.',
    body: `<path d="M8 4v16"/><path d="M8 4h6l2.5 2.5v3L14 12H8M8 12h7l2.5 2.5v3L15 20H8"/>`
  },
  {
    id: 'italic', name: 'Italic', cat: 'text', tags: ['slant', 'emphasis', 'i'],
    risk: 'conventional', note: 'Slanted I with serifs; the slant angle matches the family 45°.',
    body: `<path d="M10 4h8M6 20h8M14 4l-4 16"/>`
  },
  {
    id: 'underline', name: 'Underline', cat: 'text', tags: ['underline', 'u'],
    risk: 'conventional', note: 'U + rule; the U base is a cut corner instead of an arc.',
    body: `<path d="M7 4v9l2 2h6l2-2V4"/><path class="fx-a" d="M5 20h14"/>`
  },
  {
    id: 'strikethrough', name: 'Strikethrough', cat: 'text', tags: ['strike', 'deleted text'],
    risk: 'original', note: 'Two text rows pierced by one continuous accent rule.',
    body: `<path d="M7 7h10M7 17h10"/><path class="fx-a" d="M4 12h16"/>`
  },
  {
    id: 'heading', name: 'Heading', cat: 'text', tags: ['title', 'h1', 'header'],
    risk: 'original', note: 'H with an accent rank digit drawn as a single flag stroke.',
    body: `<path d="M5 4v16M13 4v16M5 12h8"/><path class="fx-a" d="M17.5 8.5 20 7v13"/>`
  },
  {
    id: 'list-bullet', name: 'Bullet List', cat: 'text', tags: ['unordered', 'points', 'ul'],
    risk: 'conventional', note: 'Bullets are accent squares (cut corners) rather than dots.',
    body: `<path class="fx-a" d="M4.5 4.5h3v3h-3zM4.5 10.5h3v3h-3zM4.5 16.5h3v3h-3z"/><path d="M11 6h9M11 12h9M11 18h9"/>`
  },
  {
    id: 'list-number', name: 'Numbered List', cat: 'text', tags: ['ordered', 'ol', 'steps'],
    risk: 'original', note: 'Micro-numerals 1-2-3 drawn with hairline accent strokes beside ink rows.',
    body: `<path stroke-width="1.5" class="fx-a" d="M5 4.5 6.5 3.5V8M4.5 10.5H7V12l-2.5 2H7M4.5 16.5H7l-1.5 1.7L7 20H4.5"/><path d="M11 6h9M11 12h9M11 18h9"/>`
  },
  {
    id: 'checklist', name: 'Task List', cat: 'text', tags: ['todo', 'checkbox', 'tasks'],
    risk: 'conventional', note: 'Cut-corner checkboxes; the done tick is accent, the open box is ink.',
    body: `<path d="M4.5 3.5h4l1 1v4l-1 1h-4l-1-1v-4z"/><path stroke-width="1.6" class="fx-a" d="M5.4 6l1.3 1.3 2.7-2.9"/><path d="M4.5 14h4l1 1v4l-1 1h-4l-1-1v-4z"/><path d="M12 6.5h8M12 17h8"/>`
  },
  {
    id: 'quote-block', name: 'Quote', cat: 'text', tags: ['blockquote', 'cite'],
    risk: 'original', note: 'Accent gutter bar + two tapered quote commas.',
    body: `<path class="fx-a" d="M4.5 5v14"/><path d="M12 7c-2 0-3.2 1.5-3.2 3.2S10 13.4 11.8 13.4c0 1.6-.8 2.7-2 3.3"/><path d="M19 7c-2 0-3.2 1.5-3.2 3.2s1.2 3.2 3 3.2c0 1.6-.8 2.7-2 3.3"/>`
  },
  {
    id: 'link', name: 'Link', cat: 'text', tags: ['hyperlink', 'url', 'chain'],
    risk: 'constrained', note: 'Chain link is universal; the connecting strand is the accent layer.',
    body: `<path d="M10.2 13.8a4.5 4.5 0 0 0 6.7.4l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5"/><path d="M13.8 10.2a4.5 4.5 0 0 0-6.7-.4l-2.6 2.6a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5"/><path class="fx-a" d="M9 15l6-6"/>`
  },
  {
    id: 'image', name: 'Insert Image', cat: 'text', tags: ['picture', 'media'],
    risk: 'conventional', note: 'Frame + ridge + sun; frame is the cut-corner octagon.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path class="fx-a" d="M6 16.5 10 12l2.7 3.2 2-2.4 3.3 3.7"/><circle class="fx-f" cx="15.5" cy="8.5" r="1.5"/>`
  },
  {
    id: 'table', name: 'Insert Table', cat: 'text', tags: ['grid', 'rows', 'columns'],
    risk: 'conventional', note: 'Grid in the octagon frame; header row is tinted.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path d="M3.5 9h17M3.5 15h17M10 3.5v17M15 3.5v17"/><path class="fx-t" d="M5 5h14v4H5z"/>`
  },
  {
    id: 'divider', name: 'Divider', cat: 'text', tags: ['horizontal rule', 'separator', 'hr'],
    risk: 'original', note: 'Two ink rows separated by a dashed accent rule — the divider is the star.',
    body: `<path d="M4 6h16M4 18h16"/><path stroke-dasharray="4 3" class="fx-a" d="M4 12h16"/>`
  },
  {
    id: 'emoji', name: 'Emoji', cat: 'text', tags: ['smiley', 'reaction', 'insert'],
    risk: 'original', note: 'The smiley lives in a cut-corner octagon face — instantly Frontier.',
    body: `<path d="M8 3h8l3 3v8l-3 3H8l-3-3V6z"/><circle class="fx-f" cx="9.5" cy="9.5" r="1.2"/><circle class="fx-f" cx="14.5" cy="9.5" r="1.2"/><path class="fx-a" d="M9 13.5c1 1.3 2 2 3 2s2-.7 3-2"/>`
  },
  {
    id: 'type', name: 'Type', cat: 'text', tags: ['typography', 'font', 't'],
    risk: 'conventional', note: 'T with cut serif ends.',
    body: `<path d="M5 7V4h14v3"/><path d="M12 4v16"/><path d="M9 20h6"/>`
  },
  {
    id: 'case-toggle', name: 'Change Case', cat: 'text', tags: ['uppercase', 'lowercase', 'Aa'],
    risk: 'conventional', note: 'Big A + small a; the lowercase a is the accent layer.',
    body: `<path d="M3.5 18 8 5l4.5 13M5.2 13.5h5.6"/><path class="fx-a" d="M20.5 18v-6.5M20.5 14.5a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 0 1 6.4 0z"/>`
  },
  {
    id: 'spellcheck', name: 'Spellcheck', cat: 'text', tags: ['grammar', 'lint text', 'abc'],
    risk: 'original', note: 'Word bars with an accent verification tick under the last word.',
    body: `<path d="M4 7h5M11 7h4M4 12h9"/><path class="fx-a" d="M12.5 16.5 15 19l5.5-6"/>`
  },
  {
    id: 'whitespace', name: 'Show Whitespace', cat: 'text', tags: ['pilcrow', 'invisible characters', 'paragraph'],
    risk: 'conventional', note: 'Pilcrow; the bowl is accent so toggled state is tintable.',
    body: `<path d="M13 4v16M17 4v16"/><path class="fx-a" d="M13 4h-3a4 4 0 0 0 0 8h3"/>`
  },
  {
    id: 'text-size', name: 'Text Size', cat: 'text', tags: ['font size', 'scale', 'aA'],
    risk: 'original', note: 'Small a and large A share a baseline; the delta is the accent arrow between.',
    body: `<path d="M3 10 5.5 3.5 8 10M4 7.8h3"/><path d="M13 20 17 9l4 11M14.5 16h5"/><path class="fx-a" d="M10.5 8v8M8.5 10l2-2 2 2"/>`
  },
  {
    id: 'align-left', name: 'Align Left', cat: 'text', tags: ['justify left', 'rag right'],
    risk: 'conventional', note: 'Ragged rows against an accent left rule.',
    body: `<path class="fx-a" d="M4 4v16"/><path d="M8 6h12M8 10h9M8 14h12M8 18h7"/>`
  },
  {
    id: 'align-center', name: 'Align Center', cat: 'text', tags: ['centre', 'middle'],
    risk: 'conventional', note: 'Centred rows with an accent axis.',
    body: `<path class="fx-a" d="M12 3v18"/><path d="M5 6.5h14M7 10.5h10M5 14.5h14M8 18.5h8"/>`
  },
  {
    id: 'align-right', name: 'Align Right', cat: 'text', tags: ['justify right', 'rag left'],
    risk: 'conventional', note: 'Mirror of Align Left.',
    body: `<path class="fx-a" d="M20 4v16"/><path d="M4 6h12M7 10h9M4 14h12M9 18h7"/>`
  },
  {
    id: 'keyboard', name: 'Shortcuts', cat: 'text', tags: ['keys', 'bindings', 'kbd'],
    risk: 'original', note: 'Key bed in the octagon frame with an accent spacebar.',
    body: `<path d="M5 5h14l2 2v10l-2 2H5l-2-2V7z"/><path class="fx-f" d="M7 8.5h2v2H7zM11 8.5h2v2h-2zM15 8.5h2v2h-2z"/><path class="fx-a" d="M8 15h8"/>`
  }
);
