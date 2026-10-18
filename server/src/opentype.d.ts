// opentype.js 2.x ships no types; this covers the surface the server uses.
// It is CommonJS to Node's ESM loader: only the default export exists at runtime.
declare module "opentype.js" {
  export interface Font {
    names: Record<string, Record<string, string> | undefined>;
    tables: Record<string, unknown>;
  }
  const opentype: { parse(buffer: ArrayBuffer): Font };
  export default opentype;
}
