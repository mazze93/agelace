import type { CSSProperties } from "react";
import { iconUrl } from "./api";

export interface SigilProps {
  name: string;
  size?: string;
  className?: string;
  title?: string;
}

/** A game-icons glyph painted in the current text colour via CSS mask. */
export function Sigil({ name, size = "1em", className, title }: SigilProps) {
  const style = { "--sigil": `url("${iconUrl(name)}")`, width: size, height: size } as CSSProperties;
  return (
    <span
      className={`sigil${className ? ` ${className}` : ""}`}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
