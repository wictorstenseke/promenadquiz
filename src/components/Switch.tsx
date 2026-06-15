interface Props {
  on: boolean;
  onChange: (on: boolean) => void;
  title: string;
  hint: string;
}

export function Toggle({ on, onChange, title, hint }: Props) {
  return (
    <div className="toggle">
      <div className="t-label">
        <strong>{title}</strong>
        <span>{hint}</span>
      </div>
      <button
        type="button"
        className="switch"
        data-on={on}
        aria-pressed={on}
        aria-label={title}
        onClick={() => onChange(!on)}
      />
    </div>
  );
}
