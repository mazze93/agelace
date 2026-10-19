// node:path (POSIX) for the in-browser demo: the functions the server's
// stores import, with Node's results for the inputs they pass.

export const sep = "/";

export function normalize(p: string): string {
  const abs = p.startsWith("/");
  const out: string[] = [];
  for (const part of p.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (out.length && out.at(-1) !== "..") out.pop();
      else if (!abs) out.push("..");
    } else out.push(part);
  }
  const s = out.join("/");
  return abs ? "/" + s : s || ".";
}

export const join = (...parts: string[]): string => normalize(parts.filter(Boolean).join("/"));

export function basename(p: string, ext?: string): string {
  const base = p.replace(/\/+$/, "").split("/").pop() ?? "";
  return ext && base.endsWith(ext) && base !== ext ? base.slice(0, -ext.length) : base;
}

export function extname(p: string): string {
  const base = basename(p);
  const i = base.lastIndexOf(".");
  return i <= 0 ? "" : base.slice(i);
}

export function dirname(p: string): string {
  const s = p.replace(/\/+$/, "");
  const i = s.lastIndexOf("/");
  return i < 0 ? "." : i === 0 ? "/" : s.slice(0, i);
}

export function relative(from: string, to: string): string {
  const a = normalize(from).split("/").filter(Boolean);
  const b = normalize(to).split("/").filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return [...Array(a.length - i).fill(".."), ...b.slice(i)].join("/");
}

export default { sep, normalize, join, basename, extname, dirname, relative };
