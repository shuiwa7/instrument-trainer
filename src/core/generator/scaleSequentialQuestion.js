import { SCALES, ROOT_NAMES } from '../theory/scales.js'

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_OFFSETS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const MAJOR_OFFSETS = [0, 2, 4, 5, 7, 9, 11]
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

function parseScaleNotes(rootPc, rootName, octave, notesArr) {
  const rootLetter = rootName[0]
  const rootLetterIndex = LETTERS.indexOf(rootLetter)
  return notesArr.map(str => {
    let acc = 0
    let degreeStr = str
    if (str.startsWith('b')) { acc = -1; degreeStr = str.slice(1) }
    else if (str.startsWith('#')) { acc = 1; degreeStr = str.slice(1) }
    const degree = parseInt(degreeStr)
    const offset = MAJOR_OFFSETS[degree - 1] + acc
    const rootMidi = 60 + rootPc + (octave - 4) * 12
    const midi = rootMidi + offset
    const targetLetterIndex = (rootLetterIndex + degree - 1) % 7
    const targetLetter = LETTERS[targetLetterIndex]
    let octaveShift = Math.floor((rootLetterIndex + degree - 1) / 7)
    const targetOctave = octave + octaveShift
    const naturalPc = LETTER_OFFSETS[targetLetter]
    const actualPc = midi % 12
    let diff = actualPc - naturalPc
    if (diff > 6) diff -= 12
    if (diff < -6) diff += 12
    let nameStr = targetLetter
    if (diff === 1) nameStr += '#'
    if (diff === -1) nameStr += 'b'
    if (diff === 2) nameStr += '##'
    if (diff === -2) nameStr += 'bb'
    return { name: nameStr, octave: targetOctave, midi }
  })
}

export function generateScaleSequentialQuestion(config) {
  let allowedScaleIds = config.scaleIds || []
  allowedScaleIds = allowedScaleIds.filter(id => SCALES[id])
  if (allowedScaleIds.length === 0) allowedScaleIds = ['major']
  
  // ★ 如果传了强制根音，就用强制根音；否则在允许范围内随机
  let rootPc = config.forceRootPc !== undefined ? config.forceRootPc : null
  if (rootPc === null) {
    let allowedRoots = config.roots || []
    if (allowedRoots.length === 0) allowedRoots = [0, 2, 4, 5, 7, 9, 11]
    rootPc = allowedRoots[Math.floor(Math.random() * allowedRoots.length)]
  }

  // ★ 如果传了强制音阶 ID，就用；否则随机
  let scaleId = config.forceScaleId
  if (!scaleId || !SCALES[scaleId]) {
    scaleId = allowedScaleIds[Math.floor(Math.random() * allowedScaleIds.length)]
  }
  const scaleDef = SCALES[scaleId]
  
  const rootName = ROOT_NAMES[rootPc]
  const keySignature = MAJOR_KEYS[rootPc]
  
  const upNotes = parseScaleNotes(rootPc, rootName, 4, scaleDef.notes)
  const highRoot = parseScaleNotes(rootPc, rootName, 5, ["1"])[0]
  const upSequence = [...upNotes, highRoot]
  
  const descNotesArr = scaleDef.descNotes || scaleDef.notes
  const downNotesBase = parseScaleNotes(rootPc, rootName, 4, descNotesArr)
  const downSequence = [...downNotesBase].reverse()
  
  const sequenceObj = [...upSequence, ...downSequence]
  
  const sequence = sequenceObj.map(o => o.midi)
  const staffNoteNames = sequenceObj.map(o => o.name + o.octave)

  const flatCount = staffNoteNames.filter(n => n.includes('b')).length
  const sharpCount = staffNoteNames.filter(n => n.includes('#')).length
  const useFlats = flatCount >= sharpCount

  return {
    scaleDef,
    useFlats,
    keySignature,
    rootPc,
    scaleId,
    displayName: `${rootName} ${scaleDef.name}`,
    sequence,
    staffNoteNames
  }
}