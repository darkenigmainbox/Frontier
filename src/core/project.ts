// ─── Project store: state, undo/redo history, (de)serialization ──────────────

import { emptyProject, PROJECT_VERSION, type Project } from './types.ts';

export type StoreListener = (project: Project, label: string) => void;

export class ProjectStore {
  project: Project;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private listeners: StoreListener[] = [];
  private static MAX_UNDO = 60;

  constructor(project?: Project) {
    this.project = project ?? emptyProject();
  }

  subscribe(fn: StoreListener): void {
    this.listeners.push(fn);
  }

  private emit(label: string): void {
    for (const fn of this.listeners) fn(this.project, label);
  }

  /** Snapshot current state onto the undo stack (call before mutating). */
  private snapshot(): void {
    this.undoStack.push(JSON.stringify(this.project));
    if (this.undoStack.length > ProjectStore.MAX_UNDO) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  /** Run a mutation with a single undo step. */
  transact(label: string, fn: (p: Project) => void): void {
    this.snapshot();
    fn(this.project);
    this.emit(label);
  }

  /** Mutate without an undo step (camera-like settings, continuous drags). */
  touch(label: string): void {
    this.emit(label);
  }

  /** Take a snapshot manually (start of a continuous drag). */
  beginDrag(): void {
    this.snapshot();
  }

  undo(): boolean {
    if (!this.undoStack.length) return false;
    this.redoStack.push(JSON.stringify(this.project));
    this.project = JSON.parse(this.undoStack.pop()!);
    this.emit('undo');
    return true;
  }

  redo(): boolean {
    if (!this.redoStack.length) return false;
    this.undoStack.push(JSON.stringify(this.project));
    this.project = JSON.parse(this.redoStack.pop()!);
    this.emit('redo');
    return true;
  }

  serialize(): string {
    return JSON.stringify(this.project);
  }

  load(json: string): void {
    const data = JSON.parse(json) as Project;
    if (!data || typeof data !== 'object' || !Array.isArray(data.strokes)) {
      throw new Error('Invalid Frontier project file');
    }
    data.version = PROJECT_VERSION;
    this.project = data;
    this.undoStack = [];
    this.redoStack = [];
    this.emit('load');
  }

  download(): void {
    const blob = new Blob([this.serialize()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${this.project.name.replace(/\s+/g, '_').toLowerCase()}.frontier.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
