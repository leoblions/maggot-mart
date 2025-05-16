import * as Utils from './utils.js'
import { Tilegrid } from './tilegrid.js'
import { Trigger } from './trigger.js'
import { Decor } from './decor.js'
import { Entity } from './entity.js'
// enum for which kind of asset data is being edited
export const EditMode = Object.freeze({
  Tile: 0,
  Decor: 1,
  Widget: 2,
  Entity: 3,
  Zone: 4
})

export class Editor {
  static mode = 0
  static delete = false
  static asset = 0
  static editString = ''
  static editStringElement

  static changeMode () {
    /**
     * tile 0
     * decor 1
     * widget 2
     * entity 3
     * trigger 4
     */
    if (Editor.mode < 4) {
      Editor.mode++
    } else {
      Editor.mode = 0
    }
  }

  constructor (game) {
    this.game = game
    this.enabled = true
    Editor.editStringElement = document.getElementById('editorDataPara')

    this.addButtonListeners()
    Editor.setEditString()
  }

  static setEditString () {
    Editor.editString = `Editor data: Mode:${Editor.mode} AssetID:${Editor.asset}`
    Editor.editStringElement.innerText = Editor.editString
  }

  addButtonListeners () {
    const assetplus = document.getElementById('assetplus')
    assetplus.addEventListener('click', () => {
      Editor.asset += 1
      Editor.setEditString()
    })
    const assetminus = document.getElementById('assetminus')
    assetminus.addEventListener('click', () => {
      Editor.asset -= 1
      Editor.setEditString()
    })
    const assetkind = document.getElementById('assetkind')
    assetkind.addEventListener('click', () => {
      Editor.changeMode()
      Editor.setEditString()
    })
    const deletemode = document.getElementById('deletemode')
    deletemode.addEventListener('click', () => {
      Editor.delete = !Editor.delete
      Editor.setEditString()
      const deletemode = document.getElementById('deletemode')
      deletemode.innerText = Editor.delete ? 'Delete ON' : 'Delete OFF'
    })
    const spawner = document.getElementById('spawner')
    spawner.addEventListener('click', () => {
      Entity.spawner = !Entity.spawner
      //Editor.setEditString()
      const spawner = document.getElementById('spawner')
      spawner.innerText = Entity.spawner ? 'Spawner ON' : 'Spawner OFF'
    })
    const savecookie = document.getElementById('savecookie')
    savecookie.addEventListener('click', function () {
      console.log('save cookie')
      let grid = Tilegrid.grid
      let gridAsString = Utils.gridToString(grid)
      Utils.saveStringToCookie('tilegrid', gridAsString)
    })

    const loadcookie = document.getElementById('loadcookie')
    loadcookie.addEventListener('click', function () {
      console.log('load cookie')
      let tilegridString = Utils.getCookieValueFromCookieName('tilegrid')
      console.log('tilegrid string ' + tilegridString)
      let grid = Utils.stringToGrid(tilegridString)
      console.log(grid)
      if (grid != undefined && grid != null && grid.length != 0) {
        Tilegrid.grid = grid
      }
    })

    const toclipboard = document.getElementById('toclipboard')
    toclipboard.addEventListener('click', function () {
      console.log('toclipboard')
      let grid
      switch (Editor.mode) {
        case 0:
          grid = Tilegrid.grid
          break
        case 1:
          grid = Decor.grid
          break
        case 2:
          grid = Widget.grid
          break
        case 3:
          gird = Entity.grid
          break
        case 4:
          grid = Trigger.grid
          break
        default:
          grid = null
      }

      let gridAsString = Utils.gridToString(grid)
      //Utils.saveStringToCookie('toclipboard', gridAsString)
      navigator.clipboard.writeText(gridAsString)
    })
  }

  handleClick (event, panelLoc) {
    //console.log(event)
    let gridLoc = this.panelXYtoGridXY(panelLoc.clickX, panelLoc.clickY)

    switch (Editor.mode) {
      case 0:
        if (!Editor.delete) {
          this.game.tilegrid.editTile(
            gridLoc.gridX,
            gridLoc.gridY,
            Editor.asset
          )
        } else {
          this.game.tilegrid.delTile(gridLoc.gridX, gridLoc.gridY)
        }
        break
      case 1:
        if (!Editor.delete) {
          this.game.decor.editTile(gridLoc.gridX, gridLoc.gridY, Editor.asset)
        } else {
          this.game.decor.delTile(gridLoc.gridX, gridLoc.gridY)
        }

        break
      case 2:
        this.game.widget.editTile(gridLoc.gridX, gridLoc.gridY, Editor.asset)
        break
      case 3:
        this.game.entity.editTile(gridLoc.gridX, gridLoc.gridY, Editor.asset)
        break
      case 4:
        if (!Editor.delete) {
          this.game.trigger.addUnitToGridDefault(
            gridLoc.gridX,
            gridLoc.gridY,
            Editor.asset
          )
        }

        break
    }
  }

  panelXYtoGridXY (panelX, panelY) {
    let gridX = Math.floor((panelX + this.game.cameraX) / this.game.tileSize)
    let gridY = Math.floor((panelY + this.game.cameraY) / this.game.tileSize)
    let loc = {
      gridX: gridX,
      gridY: gridY
    }
    return loc
  }

  draw () {
    //
  }

  update () {
    //
  }
}
