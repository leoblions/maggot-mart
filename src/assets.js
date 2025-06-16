import * as Utils from './utils.js'
import * as Imageutils from './imageutils.js'

// GUI
export var fontBig,
  fontSmall,
  menuBtnImg,
  shinyButtons,
  titleImg,
  dialogImg,
  decorImg
// ENTITY
export var bugsA, managerImg
// SPECAL ENTITY
export var elliotImg, claireImg, treyImg, darrylImg

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
      font1 = Utils.cutSpriteSheet(sheet, 72, 1, 50, 50)

      console.log('font images loaded')
      wg.subtractTask()
    }
  }
}

export async function loadAssets (callbackFn) {
  decorImg = await initDecorImages()

  {
    let fontBigsrc = './images/tecBig.png'
    let fontBigpromise = getImageData(fontBigsrc)

    let fontSmallsrc = './images/fontSmall.png'
    let fontSmallSheet = await getImageData(fontSmallsrc)
    fontSmall = await Imageutils.cutSpriteSheetAsync(
      fontSmallSheet,
      72,
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
    elliotImg = await Imageutils.cutSpriteSheetAsync(
      elliotSheet,
      6,
      4,
      100,
      200
    )

    // let treySrc = './images/trey2.png'
    // let treySheet = await getImageData(treySrc)
    // let treyImgA = await Imageutils.cutSpriteSheetAsync(
    //   treySheet,
    //   4,
    //   4,
    //   100,
    //   200
    // )
    // treyImgA = treyImgA.slice(0, 12)
    // let treyImgB = await Imageutils.flipImageArrayHorizontalAsync(
    //   treyImgA.slice(8, 12)
    // )

    treyImg = await characterImagesUDL100x200('./images/trey2.png')
    darrylImg = await characterImagesUDL100x200('./images/darryl2.png')

    // treyImg = treyImgA.concat(treyImgB)

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
      fontBig = await Imageutils.cutSpriteSheetAsync(values[0], 72, 1, 50, 50)

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

async function characterImagesUDL100x200 (imageURL) {
  let spriteSheet = await getImageData(imageURL)
  let spriteArrayA = await Imageutils.cutSpriteSheetAsync(
    spriteSheet,
    4,
    4,
    100,
    200
  )
  let spriteArrayUDL = spriteArrayA.slice(0, 12)
  let spriteArrayR = await Imageutils.flipImageArrayHorizontalAsync(
    spriteArrayUDL.slice(8, 12)
  )

  let returnArray = spriteArrayUDL.concat(spriteArrayR)
  return returnArray
}

async function initDecorImages () {
  const width = 100
  const height = 100
  const rows = 4
  const cols = 4

  // load images

  let sheet1 = new Image()
  let sheet2 = new Image()
  let sheet1src = '/images/decor.png'
  let sheet2src = '/images/decor2.png'
  let sheet1p = new Promise((resolve, reject) => {
    sheet1.src = sheet1src
    sheet1.onload = () => {
      resolve(sheet1)
    }
    sheet1.onerror = () => {
      reject()
    }
  })
  let sheet2p = new Promise((resolve, reject) => {
    sheet2.src = sheet2src
    sheet2.onload = () => {
      resolve(sheet2)
    }
    sheet2.onerror = () => {
      reject()
    }
  })
  let imageArrayOutput = !null
  let imageArr1 = null
  let imageArr2 = null

  // await sheet1p.then(value => {
  //   imageArr1 = Utils.cutSpriteSheet(value, cols, rows, width, height)
  // })

  // await sheet2p.then(value => {
  //   imageArr2 = Utils.cutSpriteSheet(value, cols, rows, width, height)
  // })

  await Promise.all([sheet1p, sheet2p]).then(values => {
    imageArr1 = Utils.cutSpriteSheet(values[0], cols, rows, width, height)
    imageArr2 = Utils.cutSpriteSheet(values[1], cols, rows, width, height)
  })

  imageArrayOutput = imageArr1.concat(imageArr2)
  return imageArrayOutput
}
