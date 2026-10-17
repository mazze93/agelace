// opentype.js 2.x ships no types; this covers the surface the server uses.
declare module "opentype.js" {
  export interface Font {
    names: Record<string, Record<string, string> | undefined>;
    tables: Record<string, unknown>;
  }
  export function parse(buffer: ArrayBuffer): Font;
}
