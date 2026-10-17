import { useFontFamilies } from "./fonts";

/** Credits required by the licences of what ships inside agelace. Do not remove. */
export function Colophon() {
  const families = useFontFamilies();
  const builtin = families.filter((f) => f.source === "builtin");
  return (
    <article className="leaf colophon">
      <h1>Colophon</h1>
      <p>
        Sigils and ornaments are from <a href="https://game-icons.net">game-icons.net</a>, drawn by Lorc, Delapouite and
        contributors, and used under the{" "}
        <a href="https://creativecommons.org/licenses/by/3.0/">Creative Commons Attribution 3.0</a> licence.
      </p>
      <p>The typefaces in the house library are released under the SIL Open Font License 1.1:</p>
      <ul className="colophon-fonts">
        {builtin.map((f) => (
          <li key={f.family} style={{ fontFamily: `"${f.family}", var(--font-body)` }}>
            {f.family}
          </li>
        ))}
      </ul>
      <p className="muted">
        Fonts you add live in your world’s <code>fonts</code> folder and remain under their own licences.
      </p>
    </article>
  );
}
