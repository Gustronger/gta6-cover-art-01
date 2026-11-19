// Panel layouts for the cover renderer (cover.js). A layout is a function of the
// cover size that returns the panel rectangles in pixels, in draw order. The
// title band is drawn over the bottom of the panels by the renderer, so every
// layout reserves its lower fifth for the lettering.

function insetRects(rects, gap) {
  return rects.map((r) => ({
    x: r.x + gap,
    y: r.y + gap,
    w: Math.max(1, r.w - gap * 2),
    h: Math.max(1, r.h - gap * 2),
  }));
}

export const LAYOUTS = {
  duo: {
    id: 'duo',
    name: 'Hero Duo',
    count: 4,
    panels(W, H) {
      const g = Math.max(4, Math.round(Math.min(W, H) * 0.008));
      const topH = H * 0.6;
      return insetRects(
        [
          { x: 0, y: 0, w: W * 0.62, h: topH },
          { x: W * 0.62, y: 0, w: W * 0.38, h: topH },
          { x: 0, y: topH, w: W * 0.5, h: H - topH },
          { x: W * 0.5, y: topH, w: W * 0.5, h: H - topH },
        ],
        g,
      );
    },
  },
  grid: {
    id: 'grid',
    name: 'Four Panel',
    count: 4,
    panels(W, H) {
      const g = Math.max(4, Math.round(Math.min(W, H) * 0.008));
      return insetRects(
        [
          { x: 0, y: 0, w: W / 2, h: H / 2 },
          { x: W / 2, y: 0, w: W / 2, h: H / 2 },
          { x: 0, y: H / 2, w: W / 2, h: H / 2 },
          { x: W / 2, y: H / 2, w: W / 2, h: H / 2 },
        ],
        g,
      );
    },
  },
  full: {
    id: 'full',
    name: 'Full Bleed',
    count: 1,
    panels(W, H) {
      return [{ x: 0, y: 0, w: W, h: H }];
    },
  },
  strip: {
    id: 'strip',
    name: 'Neon Strip',
    count: 3,
    panels(W, H) {
      const g = Math.max(4, Math.round(Math.min(W, H) * 0.008));
      // Portrait covers stack the panels; landscape covers line them up.
      if (H >= W) {
        return insetRects(
          [
            { x: 0, y: 0, w: W, h: H / 3 },
            { x: 0, y: H / 3, w: W, h: H / 3 },
            { x: 0, y: (H / 3) * 2, w: W, h: H / 3 },
          ],
          g,
        );
      }
      return insetRects(
        [
          { x: 0, y: 0, w: W / 3, h: H },
          { x: W / 3, y: 0, w: W / 3, h: H },
          { x: (W / 3) * 2, y: 0, w: W / 3, h: H },
        ],
        g,
      );
    },
  },
};

export const LAYOUT_ORDER = ['duo', 'grid', 'full', 'strip'];
