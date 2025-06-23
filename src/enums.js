// use this to import in other modules:
// import Enums from './enums.js'

export const Enums = Object.freeze({
  // prevent modification at runtime
  TT_TEST: true,
  // items
  PK_FOOD: 0,
  PK_BOX: 1,
  PK_SPRAY: 2,
  PK_TRAP: 3,
  PK_KEY: 4,
  PK_TORCH: 5,
  PK_PROPANE: 6,
  PK_BAG: 7,
  PK_MEDKIT: 8,
  // levels
  LK_FRONT: 0,
  LK_STORAGE: 1,
  LK_DOCK: 2,
  LK_BASEMENT: 3,
  // actors, entities, NPCs, enemies
  EK_MAGGOT: 1,
  EK_MANAGER: 8,
  EK_ALFRED: 8,
  EK_ELLIOT: 9,
  EK_TREY: 10,
  EK_DARRYL: 11,
  EK_CLARA: 12,
  EK_ALBERT: 13,
  EK_TARGET: 20,
  TL_BOX: 0,
  TL_DUMPSTER: 1,
  TL_TRASHCAN: 2,
  TL_BAGS_BASEMENT: 3
})

export default Enums

function testCase (myenum) {
  switch (myenum) {
    case Enums.EK_DARRYL:
      return true
      break
  }
}
