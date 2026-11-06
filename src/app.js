import { mountHome } from './pages/Home.js'
import { mountKeyboardMenu } from './pages/KeyboardMenu.js'
import { mountChordConstruct } from './pages/ChordConstruct.js'
import { mountChordIdentify } from './pages/ChordIdentify.js'
import { mountChordProgression } from './pages/ChordProgression.js'
import { mountChordInvert } from './pages/ChordInvert.js'
import { mountScaleSequential } from './pages/ScaleSequential.js'
import { mountScaleRecall } from './pages/ScaleRecall.js'
import { mountScaleRandom } from './pages/ScaleRandom.js'
import { mountScaleFill } from './pages/ScaleFill.js'
import { mountScaleBlind } from './pages/ScaleBlind.js'
import { mountEarSingle } from './pages/EarSingle.js'
import { mountEarInterval } from './pages/EarInterval.js'
import { mountEarChord } from './pages/EarChord.js'
import { mountEarScale } from './pages/EarScale.js'

const appContainer = document.getElementById('app')

function renderHome() {
  mountHome(appContainer, (route) => {
    if (route === 'keyboard') renderKeyboardMenu()
  })
}

function renderKeyboardMenu() {
  mountKeyboardMenu(appContainer, (route) => {
    if (route === 'home') renderHome()
    if (route === 'chord-construct') renderChordConstruct()
    if (route === 'chord-identify') renderChordIdentify()
    if (route === 'chord-progression') renderChordProgression()
    if (route === 'chord-invert') renderChordInvert()

    if (route === 'scale-sequential') return renderScaleSequential()
    if (route === 'scale-recall') return renderScaleRecall()
    if (route === 'scale-random') return renderScaleRandom()
    if (route === 'scale-fill') return renderScaleFill()
    if (route === 'scale-blind') return renderScaleBlind()

    if (route === 'ear-single') return renderEarSingle()
    if (route === 'ear-interval') return renderEarInterval()
    if (route === 'ear-chord') return renderEarChord()
    if (route === 'ear-scale') return renderEarScale()
  })
}

function renderChordConstruct() { mountChordConstruct(appContainer, () => renderKeyboardMenu()) }
function renderChordIdentify() { mountChordIdentify(appContainer, () => renderKeyboardMenu()) }
function renderChordProgression() { mountChordProgression(appContainer, () => renderKeyboardMenu()) }
function renderChordInvert() { mountChordInvert(appContainer, () => renderKeyboardMenu()) }

function renderScaleSequential() { mountScaleSequential(appContainer, () => renderKeyboardMenu()) }
function renderScaleRecall() { mountScaleRecall(appContainer, () => renderKeyboardMenu()) }
function renderScaleRandom() { mountScaleRandom(appContainer, () => renderKeyboardMenu()) }
function renderScaleFill() { mountScaleFill(appContainer, () => renderKeyboardMenu()) }
function renderScaleBlind() { mountScaleBlind(appContainer, () => renderKeyboardMenu()) }

function renderEarSingle() { mountEarSingle(appContainer, () => renderKeyboardMenu()) }
function renderEarInterval() { mountEarInterval(appContainer, () => renderKeyboardMenu()) }
function renderEarChord() { mountEarChord(appContainer, () => renderKeyboardMenu()) }
function renderEarScale() { mountEarScale(appContainer, () => renderKeyboardMenu()) }

// 启动
renderHome()