import * as Utils from './utils.js'
import * as Imageutils from './imageutils.js'

// GUI
export var fontBig, fontSmall, menuBtnImg, shinyButtons, titleImg, dialogImg
// ENTITY
export var bugsA, managerImg
// SPECAL ENTITY
export var elliotImg, claireImg

// WORLD OBJECT
export var markerImg

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
    let fontBigsrc = './images/fontBig.png'
    let fontBigpromise = getImageData(fontBigsrc)

    let fontSmallsrc = './images/fontSmall.png'
    let fontSmallSheet = await getImageData(fontSmallsrc)
    fontSmall = await Imageutils.cutSpriteSheetAsync(
      fontSmallSheet,
      40,
      1,
      10,
      10
    )

    let menuBtnSrc = './images/buttonsD.png'
    let menuBtnPromise = getImageData(menuBtnSrc)

    let shinyBtnSrc = './images/shiny_buttons.png'
    let shinyBtnPromise = getImageData(shinyBtnSrc)

    let dialogSrc = './images/dialogbox1.png'
    let dialogSheet = await getImageData(dialogSrc)

    let bugsASrc = './images/bugsheet0.png'
    let bugsAPromise = Imageutils.mirrorAndAppendimageArrayFromURL(bugsASrc)

    let managerSrc = './images/alfred.png'
    let managerSheet = await getImageData(managerSrc)

    let elliotSrc = './images/elliot2.png'
    let elliotSheet = await getImageData(elliotSrc)

    let markerSrc = './images/marker.png'
    let markerSheet = await getImageData(markerSrc)

    let titleSrc = './images/maggot mart title.png'
    titleImg = await getImageData(titleSrc)

    await Promise.all([
      fontBigpromise,

      menuBtnPromise,
      shinyBtnPromise,
      bugsAPromise
    ]).then(async values => {
      fontBig = await Imageutils.cutSpriteSheetAsync(values[0], 40, 1, 50, 50)

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
    elliotImg = await Imageutils.cutSpriteSheetAsync(
      elliotSheet,
      4,
      4,
      100,
      200
    )

    dialogImg = await Imageutils.cutSpriteSheetAsync(
      dialogSheet,
      2,
      4,
      250,
      150
    )

    markerImg = await Imageutils.cutSpriteSheetAsync(markerSheet, 6, 1, 100, 99)

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
