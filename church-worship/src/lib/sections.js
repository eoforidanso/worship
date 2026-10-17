/** Which part of the Mass a plan item belongs to — for headings, the checklist and the progress bar. */

import { ORDER, SECTIONS } from "../data/orderOfMass";

export function sectionOf(item) {
  const id = item.lectionary?.slot ?? item.lectionary?.part;
  if (!id || id === "title") return null;
  const part = ORDER.find((p) => p.id === id);
  return part ? SECTIONS[part.section] : SECTIONS[1]; // readings and psalms
}

export { SECTIONS };
