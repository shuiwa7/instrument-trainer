// ★ 调号字典与工具函数（仅音阶渲染时使用）
const SHARPS_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
const FLATS_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F']
const KEY_SIGS = {
  'C': { sharps: 0, flats: 0 },
  'G': { sharps: 1, flats: 0 }, 'D': { sharps: 2, flats: 0 }, 'A': { sharps: 3, flats: 0 }, 'E': { sharps: 4, flats: 0 }, 'B': { sharps: 5, flats: 0 }, 'F#': { sharps: 6, flats: 0 },
  'F': { sharps: 0, flats: 1 }, 'Bb': { sharps: 0, flats: 2 }, 'Eb': { sharps: 0, flats: 3 }, 'Ab': { sharps: 0, flats: 4 }, 'Db': { sharps: 0, flats: 5 }, 'Gb': { sharps: 0, flats: 6 }
}

export function getKeySigMap(sig) {
  const normSig = String(sig).replace('♭', 'b').replace('♯', '#')
  const info = KEY_SIGS[normSig] || { sharps: 0, flats: 0 }
  const map = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 }
  for (let i = 0; i < info.sharps; i++) map[SHARPS_ORDER[i]] = 1
  for (let i = 0; i < info.flats; i++) map[FLATS_ORDER[i]] = -1
  return map
}

export function getAccidentalType(letter, acc, keyMap) {
  const defaultState = keyMap[letter.toUpperCase()]
  let currentState = 0
  if (acc === '#' || acc === '♯') currentState = 1
  if (acc === 'b' || acc === '♭') currentState = -1

  if (currentState === defaultState) return null // 与调号一致，不画临时记号
  if (currentState === 1) return '#' // 需要升号
  if (currentState === -1) return 'b' // 需要降号
  if (currentState === 0) return 'n' // 调号有升降，但当前是自然音，需要还原号
  return null
}

/**
 * 渲染和弦（单节）
 * ★ 恢复原有逻辑：不画调号，音符自带什么就直接画什么临时记号
 */
export function renderStaff(container, noteNames) {
  container.innerHTML = ''
  if (!window.Vex && !window.VexFlow) return

  const VF = window.VexFlow || window.Vex
  const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VF
  
  const renderer = new Renderer(container, Renderer.Backends.SVG)
  renderer.resize(280, 160)
  const context = renderer.getContext()
  
  const stave = new Stave(20, 30, 250)
  stave.addClef('treble')
  stave.setContext(context).draw()
  
  if (!noteNames || noteNames.length === 0) return

  const parsedNotes = noteNames.map(name => {
    const match = /^([A-G])(#|♯|b|♭)?(-?\d+)$/.exec(name)
    if (!match) return null
    const noteLetter = match[1].toLowerCase()
    const acc = match[2]
    const octave = parseInt(match[3])
    
    const noteMap = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
    let midi = (octave + 1) * 12 + noteMap[noteLetter]
    if (acc === '#' || acc === '♯') midi += 1
    if (acc === 'b' || acc === '♭') midi -= 1
    
    return { letter: noteLetter, acc, octave, midi }
  }).filter(Boolean)

  if (parsedNotes.length === 0) return

  let minMidi = Math.min(...parsedNotes.map(n => n.midi))
  let maxMidi = Math.max(...parsedNotes.map(n => n.midi))
  
  let bestShift = 0
  let minLines = Infinity
  const topLine = 77, bottomLine = 64
  for (let s = -3; s <= 3; s++) {
    const sMin = minMidi + s * 12, sMax = maxMidi + s * 12
    let lines = 0
    if (sMax > topLine) lines += sMax - topLine
    if (sMin < bottomLine) lines += bottomLine - sMin
    if (lines < minLines) { minLines = lines; bestShift = s }
  }
  const octaveShift = bestShift

  parsedNotes.sort((a, b) => a.midi - b.midi)

  const keys = []
  const accidentals = []
  
  parsedNotes.forEach((n) => {
    let key = n.letter
    let accType = null
    if (n.acc === '#' || n.acc === '♯') { key += '#'; accType = '#' }
    else if (n.acc === 'b' || n.acc === '♭') { key += 'b'; accType = 'b' }
    
    const fullKey = `${key}/${n.octave + octaveShift}`
    
    if (!keys.includes(fullKey)) {
      keys.push(fullKey)
      if (accType) {
        accidentals.push({ index: keys.length - 1, type: accType })
      }
    }
  })

  try {
    const staveNote = new StaveNote({ keys, duration: 'w' })
    
    accidentals.forEach(a => {
      staveNote.addModifier(new Accidental(a.type), a.index)
    })

    const voice = new Voice({ num_beats: 4, beat_value: 4 })
    voice.addTickables([staveNote])
    
    new Formatter().joinVoices([voice]).format([voice], 180)
    voice.draw(context, stave)
  } catch (err) {
    console.error('五线谱渲染失败', err)
  }
}

/**
 * 渲染音阶（序列）
 * ★ 无小节线，宽度绝对安全自适应
 */
export function renderStaffSequence(container, noteNames, keySignature = 'C') {
  container.innerHTML = ''
  if (!window.Vex && !window.VexFlow) return
  if (!noteNames || noteNames.length === 0) return

  const VF = window.VexFlow || window.Vex
  const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VF
  
  // ★ 绝对安全的动态宽度：开头留 120px 给谱号，每个音符分配 60px 空间
  const dynamicWidth = 140 + noteNames.length * 65
  const staveWidth = dynamicWidth - 20

  const renderer = new Renderer(container, Renderer.Backends.SVG)
  renderer.resize(dynamicWidth, 160)
  const context = renderer.getContext()
  
  const stave = new Stave(10, 30, staveWidth)
  stave.addClef('treble')
  if (keySignature) stave.addKeySignature(keySignature)
  
  stave.setContext(context).draw()

  const parsedNotes = noteNames.map(name => {
    const match = /^([A-G])(#|♯|b|♭)?(-?\d+)$/.exec(name)
    if (!match) return null
    const letter = match[1].toLowerCase()
    const acc = match[2]
    const octave = parseInt(match[3])
    const noteMap = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
    let midi = (octave + 1) * 12 + noteMap[letter]
    if (acc === '#' || acc === '♯') midi += 1
    if (acc === 'b' || acc === '♭') midi -= 1
    return { letter, acc, octave, midi }
  }).filter(Boolean)

  let minMidi = Math.min(...parsedNotes.map(n => n.midi))
  let maxMidi = Math.max(...parsedNotes.map(n => n.midi))
  
  let bestShift = 0
  let minLines = Infinity
  const topLine = 77, bottomLine = 64
  for (let s = -3; s <= 3; s++) {
    const sMin = minMidi + s * 12, sMax = maxMidi + s * 12
    let lines = 0
    if (sMax > topLine) lines += sMax - topLine
    if (sMin < bottomLine) lines += bottomLine - sMin
    if (lines < minLines) { minLines = lines; bestShift = s }
  }
  const octaveShift = bestShift

  const keyMap = getKeySigMap(keySignature)

  const staveNotes = parsedNotes.map(n => {
    let key = n.letter
    if (n.acc === '#' || n.acc === '♯') key += '#'
    else if (n.acc === 'b' || n.acc === '♭') key += 'b'
    
    const fullKey = `${key}/${n.octave + octaveShift}`
    const note = new StaveNote({ keys: [fullKey], duration: 'q' })
    
    const accType = getAccidentalType(n.letter, n.acc, keyMap)
    if (accType) {
      note.addModifier(new Accidental(accType), 0)
    }
    return note
  })

  try {
    const voice = new Voice({ num_beats: staveNotes.length, beat_value: 4 })
    voice.setStrict(false)
    voice.addTickables(staveNotes)

    const formatter = new Formatter()
    formatter.joinVoices([voice])
    
    // ★ 关键修复：使用 formatToStave，强制让音符在五线谱内部均匀排版
    formatter.formatToStave([voice], stave)
    
    voice.draw(context, stave)
  } catch (err) {
    console.error('音阶五线谱渲染失败', err)
  }
}

/**
 * 渲染占位音阶序列（用于“调式回忆”和“补缺音”）
 * @param {HTMLElement} container 
 * @param {Array} sequenceObj 
 * @param {string} keySignature 
 * @param {number} revealedCount - 已经弹对的音符数量（前面的音符显形）
 * @param {number} missingIndex - 永远保持空白的音符索引（补缺音模式用，默认 -1 表示没有）
 */
export function renderStaffSequenceWithPlaceholders(container, sequenceObj, keySignature = 'C', revealedCount = 0, missingIndex = -1) {
  container.innerHTML = ''
  if (!window.Vex && !window.VexFlow) return
  if (!sequenceObj || sequenceObj.length === 0) return

  const VF = window.VexFlow || window.Vex
  const { Renderer, Stave, StaveNote, GhostNote, Voice, Formatter, Accidental } = VF
  
  const dynamicWidth = 140 + sequenceObj.length * 65
  const staveWidth = dynamicWidth - 20

  const renderer = new Renderer(container, Renderer.Backends.SVG)
  renderer.resize(dynamicWidth, 160)
  const context = renderer.getContext()
  
  const stave = new Stave(10, 30, staveWidth)
  stave.addClef('treble')
  if (keySignature) stave.addKeySignature(keySignature)
  
  stave.setContext(context).draw()

  let minMidi = Math.min(...sequenceObj.map(n => n.midi))
  let maxMidi = Math.max(...sequenceObj.map(n => n.midi))
  
  let bestShift = 0
  let minLines = Infinity
  const topLine = 77, bottomLine = 64
  for (let s = -3; s <= 3; s++) {
    const sMin = minMidi + s * 12, sMax = maxMidi + s * 12
    let lines = 0
    if (sMax > topLine) lines += sMax - topLine
    if (sMin < bottomLine) lines += bottomLine - sMin
    if (lines < minLines) { minLines = lines; bestShift = s }
  }
  const octaveShift = bestShift

  const keyMap = getKeySigMap(keySignature)

  const staveNotes = sequenceObj.map((n, index) => {
    // ★ 核心判断：如果还没弹到，或者这里是“补缺音”的挖空位置，画幽灵音符占位
    if (index >= revealedCount || index === missingIndex) {
      return new GhostNote({ duration: 'q' })
    }

    // 已经弹对的，画真实音符
    let key = n.name[0].toLowerCase()
    if (n.name.includes('#')) key += '#'
    else if (n.name.includes('b')) key += 'b'
    
    const fullKey = `${key}/${n.octave + octaveShift}`
    const note = new StaveNote({ keys: [fullKey], duration: 'q' })
    
    let acc = null
    if (n.name.includes('#')) acc = '#'
    else if (n.name.includes('b')) acc = 'b'
    
    const accType = getAccidentalType(n.name[0], acc, keyMap)
    if (accType) {
      note.addModifier(new Accidental(accType), 0)
    }
    return note
  })

  try {
    const voice = new Voice({ num_beats: staveNotes.length, beat_value: 4 })
    voice.setStrict(false)
    voice.addTickables(staveNotes)

    const formatter = new Formatter()
    formatter.joinVoices([voice]).format([voice], staveWidth - 40)
    voice.draw(context, stave)
  } catch (err) {
    console.error('占位谱表渲染失败', err)
  }
}