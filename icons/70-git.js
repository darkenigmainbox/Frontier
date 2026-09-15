/* Frontier Icons — Git & version history. Nodes use the family hex-node: M-3-2 h4 l2 2 -2 2 h-4 l-2-2 z (relative) */
(window.FrontierIcons = window.FrontierIcons || []).push(
  {
    id: 'git-branch', name: 'Branch', cat: 'git', tags: ['fork', 'side branch'],
    risk: 'constrained', note: 'Branch graph is universal; nodes are Frontier hex-nodes instead of circles.',
    body: `<path d="M7 9v6"/><path d="M17 9c0 6-10 3-10 6"/><path d="M6 5h2l2 2-2 2H6L4 7z"/><path d="M6 15h2l2 2-2 2H6l-2-2z"/><path class="fx-a" d="M16 5h2l2 2-2 2h-2l-2-2z"/>`
  },
  {
    id: 'git-commit', name: 'Commit', cat: 'git', tags: ['save point', 'revision'],
    risk: 'constrained', note: 'Line-node-line; the node is a hex-node.',
    body: `<path d="M3 12h4M17 12h4"/><path class="fx-a" d="M10 9h4l3 3-3 3h-4l-3-3z"/>`
  },
  {
    id: 'git-merge', name: 'Merge', cat: 'git', tags: ['integrate', 'join branches'],
    risk: 'constrained', note: 'Two rails converging into one hex-node.',
    body: `<path d="M7 9v4c0 3 3 3 5 4"/><path d="M17 9v4c0 3-3 3-5 4"/><path d="M6 5h2l2 2-2 2H6L4 7z"/><path class="fx-a" d="M16 5h2l2 2-2 2h-2l-2-2z"/><path d="M11 17h2l2 2-2 2h-2l-2-2z"/>`
  },
  {
    id: 'git-compare', name: 'Compare', cat: 'git', tags: ['diff branches', 'arrows'],
    risk: 'conventional', note: 'Opposed transfer arrows between hex-nodes.',
    body: `<path class="fx-a" d="M8 7.5h10M15.5 5 18 7.5 15.5 10M16 16.5H6M8.5 14 6 16.5 8.5 19"/><path d="M4 5.5h2l1.5 2L6 9.5H4L2.5 7.5z"/><path d="M18 14.5h2l1.5 2-1.5 2h-2l-1.5-2z"/>`
  },
  {
    id: 'git-sync', name: 'Sync / Pull', cat: 'git', tags: ['fetch', 'update', 'clone'],
    risk: 'original', note: 'Accent arrow dropping a commit node onto a branch rail.',
    body: `<path d="M4 19h16"/><path d="M6 15h2l2 2-2 2H6l-2-2z"/><path class="fx-a" d="M14 4v8M11 9l3 3 3-3"/><path d="M16 15h2l2 2-2 2h-2l-2-2z"/>`
  },
  {
    id: 'version-history', name: 'Version History', cat: 'git', tags: ['timeline', 'rewind', 'revisions'],
    risk: 'original', note: 'Rewind arrow wrapping a rail of three hex-nodes (oldest tinted).',
    body: `<path d="M12 4v16"/><path d="M11 5h2l2 2-2 2h-2l-2-2z"/><path class="fx-a" d="M11 10h2l2 2-2 2h-2l-2-2z"/><path d="M11 15h2l2 2-2 2h-2l-2-2z"/><path class="fx-a" d="M6 8a7 7 0 0 0 0 8M6 8 4.5 9.5M6 8l1.5 1.5"/>`
  },
  {
    id: 'tag', name: 'Tag', cat: 'git', tags: ['release', 'label', 'version'],
    risk: 'conventional', note: 'Tag plate with cut point and accent eyelet.',
    body: `<path d="M4 4h8l8 8-8 8-8-8z"/><circle class="fx-a" cx="8.5" cy="8.5" r="1.6"/>`
  },
  {
    id: 'repo', name: 'Repository', cat: 'git', tags: ['project', 'remote', 'origin'],
    risk: 'original', note: 'Cut-corner folder carrying a branch rail with two hex-nodes.',
    body: `<path d="M3 7l2-2h5l2 2h7l2 2v9l-2 2H5l-2-2z"/><path d="M9 11v5"/><path class="fx-a" d="M8 9.5h2l1.5 1.5L10 12.5H8L6.5 11z"/><path d="M8 15h2l1.5 1.5-1.5 1.5H8l-1.5-1.5z"/>`
  },
  {
    id: 'commit-list', name: 'Commit List', cat: 'git', tags: ['log', 'graph'],
    risk: 'original', note: 'Vertical rail with alternating hex-nodes and message bars.',
    body: `<path d="M6 4v16"/><path class="fx-a" d="M5 5h2l1.5 1.5L7 8H5L3.5 6.5z"/><path d="M11 6.5h9"/><path d="M5 11h2l1.5 1.5L7 14H5l-1.5-1.5z"/><path d="M11 12.5h7"/><path class="fx-a" d="M5 17h2l1.5 1.5L7 20H5l-1.5-1.5z"/><path d="M11 18.5h9"/>`
  },
  {
    id: 'conflict', name: 'Conflict', cat: 'git', tags: ['merge clash', 'resolution'],
    risk: 'original', note: 'Two commit arrows colliding head-on with an accent clash spark.',
    body: `<path d="M4 8h6M8 5.5 10.5 8 8 10.5"/><path d="M20 16h-6M16 13.5 13.5 16l2.5 2.5"/><path class="fx-a" d="M12 5v4M10 7h4M12 15v4M10 17h4"/>`
  },
  {
    id: 'stash', name: 'Stash', cat: 'git', tags: ['shelve', 'set aside'],
    risk: 'original', note: 'Three stacked plates with the top one lifted and tinted — changes set aside.',
    body: `<path class="fx-t" d="M5 4h14v3H5z"/><path d="M5 4h14v3H5z"/><path d="M6 10h12v3H6z"/><path d="M7 16h10v3H7z"/>`
  },
  {
    id: 'diff', name: 'Diff', cat: 'git', tags: ['changes', 'plus minus', 'compare files'],
    risk: 'conventional', note: 'Split pane: accent plus on the new side, ink minus on the old.',
    body: `<path d="M5 3h14l2 2v14l-2 2H5l-2-2V5z"/><path d="M12 3v18"/><path class="fx-a" d="M16.5 8v5M14 10.5h5"/><path d="M7 10.5h4"/>`
  }
);
