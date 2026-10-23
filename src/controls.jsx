import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
export function Button({ children, icon: Icon, ...props }) {
  return (
    <button {...props}>
      {Icon && <Icon size={16} />} {children}
    </button>
  );
}
export function Select({ label, value, onChange, options }) {
  const groups = [...new Set(options.map((o) => o.group))];
  const option = (o) => (
    <option
      key={o.value ?? o}
      value={o.value ?? o}
      style={o.family ? { fontFamily: o.family } : undefined}
    >
      {o.label ?? o}
    </option>
  );
  return (
    <label className="field">
      <span>{label}</span>
      <div className="select-wrap">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {groups.map((group) =>
            group ? (
              <optgroup key={group} label={group}>
                {options.filter((o) => o.group === group).map(option)}
              </optgroup>
            ) : (
              options.filter((o) => !o.group).map(option)
            ),
          )}
        </select>
        <ChevronDown size={13} />
      </div>
    </label>
  );
}
export function Range({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
}) {
  return (
    <label className="range-field">
      <span>
        {label}
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}
export function Toggle({ label, value, onChange, caption }) {
  return (
    <label className="toggle-row">
      <span>
        {label}
        {caption && <small>{caption}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" />
    </label>
  );
}
export function Color({ label, value, onChange }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="color-field">
        <input
          aria-label={label}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          aria-label={`${label} hex value`}
          value={draft}
          maxLength={7}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/^#[\da-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
          }}
          onBlur={() => setDraft(value)}
        />
        <span>HEX</span>
      </div>
    </label>
  );
}
export function Segment({ label, value, onChange, options }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="segment">
        {options.map((o) => (
          <button
            key={o.value}
            aria-label={`${label}: ${o.label}`}
            aria-pressed={value === o.value}
            className={value === o.value ? "selected" : ""}
            onClick={() => onChange(o.value)}
          >
            {o.icon ? <o.icon size={15} /> : o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
export function Section({ icon: Icon, title, children, extra }) {
  return (
    <section className="settings-section">
      <h2>
        <Icon size={16} />
        {title}
        {extra}
      </h2>
      {children}
    </section>
  );
}
