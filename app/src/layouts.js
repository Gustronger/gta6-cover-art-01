// Panel layouts for the cover renderer (cover.js). A layout is a function of the
// cover size that returns the panel rectangles in pixels, in draw order.
//
// The cover is framed: an outer frame, then a panel zone, then a quote strip,
// the title band, a tagline strip and a dense footer. Layouts return rects
// inside the panel zone only — the lettering below it never overlaps a panel,
// so per-panel captions always stay legible.

/** The cover's vertical zones: frame, panel zone, quote, title band, strip, footer. */
export function coverZones(W, H) {
  const frame = Math.max(8, Math.round(Math.min(W, H) * 0.011));
  const quoteH = Math.round(H * 0.042);
  const bandH = Math.round(H * 0.16);
  const stripH = Math.round(H * 0.045);
  const footH = Math.round(H * 0.05);
  const zoneH = H - frame * 2 - quoteH - bandH - stripH - footH;
  const zone = { x: frame, y: frame, w: W - frame * 2, h: zoneH };
  return {
    frame,
    quoteH,
    bandH,
    stripH,
    footH,
    zone,
    quoteY: frame + zoneH,
    bandY: frame + zoneH + quoteH,
    stripY: frame + zoneH + quoteH + bandH,
    footY: frame + zoneH + quoteH + bandH + stripH,
  };
}

function insetRects(rects, gap) {
  return rects.map((r) => ({
    x: r.x + gap,
    y: r.y + gap,
    w: Math.max(1, r.w - gap * 2),
    h: Math.max(1, r.h - gap * 2),
  }));
}

/** Maps unit-space rects (fractions of the panel zone) to pixels, with a gap. */
function zoneRects(W, H, rects) {
  const z = coverZones(W, H);
  const g = Math.max(4, Math.round(Math.min(W, H) * 0.008));
  return insetRects(
    rects.map((r) => ({
      x: z.zone.x + r.x * z.zone.w,
      y: z.zone.y + r.y * z.zone.h,
      w: r.w * z.zone.w,
      h: r.h * z.zone.h,
    })),
    g,
  );
}

export const LAYOUTS = {
  show: {
    id: 'show',
    name: 'Showcase',
    count: 7,
    panels(W, H) {
      // One large anchor panel on the left, six captioned panels in a 2x3 grid.
      return zoneRects(W, H, [
        { x: 0, y: 0, w: 0.42, h: 1 },
        { x: 0.42, y: 0, w: 0.29, h: 1 / 3 },
        { x: 0.71, y: 0, w: 0.29, h: 1 / 3 },
        { x: 0.42, y: 1 / 3, w: 0.29, h: 1 / 3 },
        { x: 0.71, y: 1 / 3, w: 0.29, h: 1 / 3 },
        { x: 0.42, y: 2 / 3, w: 0.29, h: 1 / 3 },
        { x: 0.71, y: 2 / 3, w: 0.29, h: 1 / 3 },
      ]);
    },
  },
  duo: {
    id: 'duo',
    name: 'Hero Duo',
    count: 4,
    panels(W, H) {
      return zoneRects(W, H, [
        { x: 0, y: 0, w: 0.62, h: 0.6 },
        { x: 0.62, y: 0, w: 0.38, h: 0.6 },
        { x: 0, y: 0.6, w: 0.5, h: 0.4 },
        { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
      ]);
    },
  },
  grid: {
    id: 'grid',
    name: 'Four Panel',
    count: 4,
    panels(W, H) {
      return zoneRects(W, H, [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      ]);
    },
  },
  full: {
    id: 'full',
    name: 'Full Bleed',
    count: 1,
    panels(W, H) {
      // No gap: the one panel fills the whole zone.
      const z = coverZones(W, H);
      return [{ x: z.zone.x, y: z.zone.y, w: z.zone.w, h: z.zone.h }];
    },
  },
  strip: {
    id: 'strip',
    name: 'Neon Strip',
    count: 3,
    panels(W, H) {
      // Portrait covers stack the panels; landscape covers line them up.
      if (H >= W) {
        return zoneRects(W, H, [
          { x: 0, y: 0, w: 1, h: 1 / 3 },
          { x: 0, y: 1 / 3, w: 1, h: 1 / 3 },
          { x: 0, y: 2 / 3, w: 1, h: 1 / 3 },
        ]);
      }
      return zoneRects(W, H, [
        { x: 0, y: 0, w: 1 / 3, h: 1 },
        { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
        { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
      ]);
    },
  },
};

export const LAYOUT_ORDER = ['show', 'duo', 'grid', 'full', 'strip'];
