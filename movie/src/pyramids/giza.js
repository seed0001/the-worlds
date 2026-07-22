// Giza — grounded facts, in one table.
//
// Like Apollo and Chernobyl, this engine recreates a real subject rather than
// generating one from a seed: the building of the Giza pyramid complex under the
// Fourth Dynasty, around 2560 BCE. Every number the narrator speaks is read from
// here, and here is the archaeological record — the Lehner/Hawass Giza work, the
// classical accounts, and the surveyed dimensions of the monuments themselves.
//
// On the workforce: the film shows the epic scale of compelled labour — tens of
// thousands under a god-king — but narrates it truthfully. The evidence on the
// plateau (a workers' town, bakeries and breweries, gang-name graffiti, and
// honoured worker tombs beside the pyramid) points to organised, fed, conscripted
// Egyptian crews, not the chattel slaves of legend.

export const ERA = {
  when: 'around 2560 BCE',
  dynasty: 'the Fourth Dynasty of the Old Kingdom',
  pharaoh: 'Khufu',              // Greek: Cheops
  place: 'the Giza plateau, on the west bank of the Nile',
};

// The three pyramids, largest to smallest. Heights in metres are the ORIGINAL
// (cased) heights; base is the side length. `rel` is a rough size for the model.
export const PYRAMIDS = {
  khufu: {
    name: 'the Great Pyramid',
    owner: 'Khufu',
    heightM: 146.6,              // ~139 m today, its casing long since stripped
    baseM: 230.3,
    slopeDeg: 51.8,
    blocks: 2_300_000,          // ~2.3 million
    avgBlockTonnes: 2.5,        // heaviest granite blocks ~50–80 t
    totalMassMt: 5.9,           // ~5.9 million tonnes
    yearsToBuild: 20,           // the classical and consensus estimate
    tallestUntilCE: 1311,       // tallest structure on Earth until Lincoln Cathedral
    tallestForYears: 3800,
  },
  khafre: {
    name: "Khafre's pyramid",
    owner: 'Khafre',
    heightM: 143.5,             // shorter, but built on higher bedrock, so it looks taller
    baseM: 215.3,
    note: 'still wears a cap of its original casing at the very top',
  },
  menkaure: {
    name: "Menkaure's pyramid",
    owner: 'Menkaure',
    heightM: 65,
    baseM: 102.2,
    note: 'the smallest of the three, its lower courses faced in Aswan granite',
  },
};

export const SPHINX = {
  name: 'the Great Sphinx',
  lengthM: 73,
  heightM: 20,
  note: 'carved in place from a single ridge of the plateau bedrock, most likely in the reign of Khafre',
};

// How the stone was won and moved — the logistics the narrator draws on.
export const BUILD = {
  coreStone: 'limestone, quarried in the plateau itself, a few hundred metres from the rising pyramid',
  casingStone: 'fine white Tura limestone, ferried across the Nile',
  graniteFrom: 'Aswan, nearly a thousand kilometres up the river',
  move: 'dragged on wooden sledges, with water poured on the sand ahead to cut the friction',
  waterEvidence: 'a wall painting in the tomb of Djehutihotep shows scores of men hauling a colossus while one pours water before the sledge',
  tools: 'copper chisels and saws, wooden wedges, and dolerite pounding stones',
  ramps: 'earthen ramps that rose with the pyramid — straight, or wrapped around it; the exact form is still argued',
};

export const WORKFORCE = {
  count: 20_000,                // Lehner's estimate of the standing workforce; ~20–30 thousand
  organisation: 'organised into named gangs and smaller crews, housed in a purpose-built town and paid in rations of bread and beer',
  season: 'swelled each year during the Nile flood, when the fields were underwater and farming stopped',
  myth: 'not the enslaved multitudes of later legend, but Egyptians compelled and fed by the state',
};

// The season that made it possible: the Nile's annual flood, which both freed
// the farmers to work and floated the stone to the site.
export const NILE = {
  flood: 'Akhet, the season of inundation',
  role: 'the rising river carried the quarried blocks by barge almost to the foot of the plateau',
};

export const LEGACY = {
  standingYears: 4500,          // ~4,500 years later, still standing
  today: 'stripped of their smooth casing and worn to their stepped cores, the three still stand on the plateau, at the edge of a modern city',
};
