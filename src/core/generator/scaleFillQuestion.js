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

export function generateScaleFillQuestion(config) {
  let allowedScaleIds = config.scaleIds || []
  allowedScaleIds = allowedScaleIds.filter(id => SCALES[id])
  if (allowedScaleIds.length === 0) allowedScaleIds = ['major']
  
  let allowedRoots = config.roots || []
  if (allowedRoots.length === 0) allowedRoots = [0, 2, 4, 5, 7, 9, 11]

  const scaleId = allowedScaleIds[Math.floor(Math.random() * allowedScaleIds.length)]
  const scaleDef = SCALES[scaleId]
  
  const rootPc = allowedRoots[Math.floor(Math.random() * allowedRoots.length)]
  const rootName = ROOT_NAMES[rootPc]
  const keySignature = MAJOR_KEYS[rootPc]
  
  const upNotes = parseScaleNotes(rootPc, rootName, 4, scaleDef.notes)
  const highRoot = parseScaleNotes(rootPc, rootName, 5, ["1"])[0]
  const upSequence = [...upNotes, highRoot]
  
  const descNotesArr = scaleDef.descNotes || scaleDef.notes
  const downNotesBase = parseScaleNotes(rootPc, rootName, 4, descNotesArr)
  const downSequence = [...downNotesBase].reverse()
  
  const fullSequenceObj = [...upSequence, ...downSequence]
  
  // ★ 随机挑选一个缺失位置（不要选第一个音，因为那是根音，选了就没法开始了）
  const missingIndex = 1 + Math.floor(Math.random() * (fullSequenceObj.length - 1))
  
  const flatCount = fullSequenceObj.map(o => o.name).filter(n => n.includes('b')).length
  const sharpCount = fullSequenceObj.map(o => o.name).filter(n => n.includes('#')).length
  const useFlats = flatCount >= sharpCount

  return {
    scaleDef,
    useFlats,
    keySignature,
    displayName: `${rootName} ${scaleDef.name}`,
    fullSequenceObj,
    missingIndex, // ★ 告诉 UI 哪里缺了
    missingNoteName: fullSequenceObj[missingIndex].name + fullSequenceObj[missingIndex].octave
  }
}