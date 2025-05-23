const soundNames = [
  'aahf0',
  'aahf1',
  'aahf2',
  'aahf3',
  'chime1',
  'growl',
  'jar',
  'roar0',
  'spray0',
  'spray1',
  'thud0',
  'thud1'
]
const fileExtension = '.ogg'
const soundDirectory = './sound/'
const DEFAULT_VOLUME = 0.5

export class Sound {
  constructor () {
    this.map = {}
    this.sounds = this.initSounds()
    this.volume = DEFAULT_VOLUME
  }

  initSounds () {
    let sounds = []
    this.soundsObject = {}

    for (const name of soundNames) {
      let soundURL = this.getFileURL(name)
      let audioElement = new Audio(soundURL)
      sounds.push(audioElement)

      this.map[name] = audioElement
    }

    return sounds
  }

  getFileURL (soundName) {
    let soundURL = soundDirectory + soundName + fileExtension
    return soundURL
  }

  playSoundByName (soundName) {
    let sound = this.map[soundName]
    sound.play()
  }

  playSound (soundID) {
    this.sounds[soundID].volume = this.volume
    this.sounds[soundID].play()
  }
  loopSound (soundID) {
    this.sounds[soundID].volume = this.volume
    this.sounds[soundID].loop = true
  }
  pauseSound (soundID) {
    this.sounds[soundID].pause()
  }

  restartSound (soundID) {
    this.sounds[soundID].currentTime = 0
    this.sounds[soundID].paused ? this.sounds[soundID].play() : null
  }
}
