// opentype.js 2.x ships no types; this covers the surface the server uses.
// It is CommonJS to Node's ESM loader: only the default export exists at runtime.
declare module "opentype.js" {
  namespace opentype {
    interface Font {
      names: Record<string, Record<string, string> | undefined>;
      tables: Record<string, unknown>;
      glyphs: { length: number; get(i: number): Glyph };
      unitsPerEm: number;
      ascender: number;
      descender: number;
      charToGlyph(ch: string): Glyph;
      toArrayBuffer(): ArrayBuffer;
    }
    interface Glyph {
      name: string;
      unicode?: number;
      advanceWidth: number;
      path: Path;
      getBoundingBox(): { x1: number; y1: number; x2: number; y2: number };
    }
    interface Path {
      commands: { type: string }[];
      moveTo(x: number, y: number): void;
      lineTo(x: number, y: number): void;
      quadraticCurveTo(x1: number, y1: number, x: number, y: number): void;
      close(): void;
    }
  }
  const opentype: {
    parse(buffer: ArrayBuffer): opentype.Font;
    Font: new (options: {
      familyName: string;
      styleName: string;
      unitsPerEm: number;
      ascender: number;
      descender: number;
      designer?: string;
      weightClass?: number;
      version?: string;
      glyphs: opentype.Glyph[];
    }) => opentype.Font;
    Glyph: new (options: { name: string; unicode?: number; advanceWidth: number; path: opentype.Path }) => opentype.Glyph;
    Path: new () => opentype.Path;
  };
  export default opentype;
}
