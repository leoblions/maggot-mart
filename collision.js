export class Collision {
  constructor (game) {
    this.game = game
  }

  playerCollideTile () {
    // true is collide with solid
    // false means not blocked

    let x1 = this.game.player.collider.x
    let xh = this.game.player.collider.x + this.game.player.collider.w / 2
    let x2 = this.game.player.collider.x + this.game.player.collider.w
    let y1 = this.game.player.collider.y
    let yh = this.game.player.collider.y + this.game.player.collider.h / 2
    let y2 = this.game.player.collider.y + this.game.player.collider.h
    //debugger
    //corners
    let tlc = this.game.tilegrid.isSolidAtWorldCoord(x1, y1)
    let trc = this.game.tilegrid.isSolidAtWorldCoord(x1, y2)
    let blc = this.game.tilegrid.isSolidAtWorldCoord(x2, y1)
    let brc = this.game.tilegrid.isSolidAtWorldCoord(x2, y2)
    //sides
    let st = this.game.tilegrid.isSolidAtWorldCoord(xh, y1)
    let sr = this.game.tilegrid.isSolidAtWorldCoord(x2, yh)
    let sb = this.game.tilegrid.isSolidAtWorldCoord(xh, y2)
    let sl = this.game.tilegrid.isSolidAtWorldCoord(x1, yh)

    let collSide = [false, false, false, false]
    //up down left right

    if ((tlc && st) || (st && trc)) {
      collSide[0] = true
    }
    if ((blc && sb) || (sb && brc)) {
      collSide[1] = true
    }
    if ((tlc && sl) || (sl && blc)) {
      collSide[2] = true
    }
    if ((trc && sr) || (sr && brc)) {
      collSide[3] = true
    }
    //console.log(collSide)
    return collSide
  }
}
