import { editorial } from "../data";

export function Cover({ onEnter }: { onEnter: () => void }) {
  const m = editorial.surahMeta;
  return (
    <section className="cover page">
      <div className="cover-bg">
        <img src="/img/cover.webp" alt="" aria-hidden="true" />
      </div>
      <div className="cover-inner wrap">
        <div className="cover-top">
          <span>A Sūrah Magazine</span>
          <span className="mono">Issue 01 · {m.number}</span>
        </div>

        <div className="cover-ar ar">{m.arabic}</div>
        <h1 className="cover-title">{m.name}</h1>
        <p className="cover-sub">{m.subtitle}</p>

        <div className="cover-foot">
          <span className="mono">{m.ayahCount} āyāt</span>
          <span className="mono">Juzʾ {m.juz}</span>
          <span className="mono">{m.place}</span>
          <span className="mono">Revealed {m.revelationOrder}th</span>
          <button className="enter-btn" onClick={onEnter}>
            Enter <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
