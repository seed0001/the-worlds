// The Giza complex, laid out once so the time-lapse and the legacy scene agree.
//
// The three pyramids step away along the plateau's diagonal — Khufu largest,
// then Khafre on slightly higher ground (so it reads as tall as Khufu), then the
// much smaller Menkaure. The Sphinx crouches to the east, toward the river. Model
// units keep Khufu ~52 tall; the height/base ratios hold the real ~51.8° slope.

export const GIZA = {
  khufu:    { base: 82, height: 52, courses: 44, pos: [0, 0, 0] },
  khafre:   { base: 74, height: 49, courses: 40, pos: [-118, 6, -66] },
  menkaure: { base: 38, height: 24, courses: 26, pos: [-210, 0, -116] },
  sphinx:   { pos: [92, 0, 74], rotY: -0.15, scale: 1.15 },
};
