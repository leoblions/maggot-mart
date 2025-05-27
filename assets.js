import * as Utils from './utils.js'
import * as Imageutils from './imageutils.js'

// GUI
export var font1, menuBtnImg, shinyButtons
// ENTITY
export var bugsA, managerImg

//ensure assets are loaded before other classes try using them

export function loadAssetsWG (callbackFn) {
  {
    //debugger
    let sheet = new Image()
    let wg = new Utils.WaitGroup(callbackFn)
    sheet.src = './images/font50horOL.png'
    wg.addTask()
    sheet.onload = () => {
      font1 = Utils.cutSpriteSheet(sheet, 40, 1, 50, 50)

      console.log('font images loaded')
      wg.subtractTask()
    }
  }
}

export async function loadAssets (callbackFn) {
  {
    let font1src = './images/font50horOL.png'
    let font1promise = getImageData(font1src)

    let menuBtnSrc = './images/buttonsD.png'
    let menuBtnPromise = getImageData(menuBtnSrc)

    let shinyBtnSrc = './images/shiny_buttons.png'
    let shinyBtnPromise = getImageData(shinyBtnSrc)

    let bugsASrc = './images/bugsheet0.png'
    let bugsAPromise = Imageutils.mirrorAndAppendimageArrayFromURL(bugsASrc)

    let managerSrc = './images/shiny_buttons.png'
    let managerSheet = await getImageData(managerSrc)

    await Promise.all([
      font1promise,
      menuBtnPromise,
      shinyBtnPromise,
      bugsAPromise
    ]).then(async values => {
      font1 = await Imageutils.cutSpriteSheetAsync(values[0], 40, 1, 50, 50)
      menuBtnImg = await Imageutils.cutSpriteSheetAsync(
        values[1],
        1,
        4,
        300,
        50
      )
      shinyButtons = await Imageutils.cutSpriteSheetAsync(
        values[2],
        3,
        10,
        50,
        50
      )
      bugsA = await bugsAPromise
    })

    managerImg = await Imageutils.cutSpriteSheetAsync(
      managerSheet,
      4,
      4,
      100,
      200
    )
    callbackFn()
  }
}

async function getImageData (imageURL) {
  return new Promise((resolve, reject) => {
    let sheet = new Image()
    sheet.onload = () => resolve(sheet)
    sheet.onerror = reject

    sheet.src = imageURL
  })
}
