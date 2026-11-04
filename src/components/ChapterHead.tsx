export function ChapterHead({
  number,
  label,
  title,
  quote,
  kicker,
  folio,
}: {
  number: string;
  label: string;
  title: string;
  quote?: string;
  kicker?: string;
  folio?: string;
}) {
  return (
    <header className="chapter-head">
      <div className="running-head">
        <span>Ar-Raʿd</span>
        <span className="rh-mid">Sūrah 13 · Makkah</span>
        <span className="mono">{folio ?? number}</span>
      </div>
      <div className="chapter-num" aria-hidden="true">
        <span>{number}</span>
      </div>
      <div className="chapter-meta">
        {kicker && <span>{kicker}</span>}
        <span>{label}</span>
      </div>
      <h2 className="chapter-title">{title}</h2>
      {quote && <p className="chapter-quote">{quote}</p>}
    </header>
  );
}
