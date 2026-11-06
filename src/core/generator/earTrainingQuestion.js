import { CHORDS } from '../theory/chords.js'
import { SCALES } from '../theory/scales.js'
import { pitchClassToName } from '../theory/pitch.js'

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_OFFSETS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const MAJOR_OFFSETS = [0, 2, 4, 5, 7, 9, 11]

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
    return { name: nameStr, octave: targetOctave, midi }
  })
}

export const ALL_INTERVALS = [
  { id: 'm2', name: '小二度', semitones: 1 }, { id: 'M2', name: '大二度', semitones: 2 },
  { id: 'm3', name: '小三度', semitones: 3 }, { id: 'M3', name: '大三度', semitones: 4 },
  { id: 'P4', name: '纯四度', semitones: 5 }, { id: 'TT', name: '增四/减五度', semitones: 6 },
  { id: 'P5', name: '纯五度', semitones: 7 }, { id: 'm6', name: '小六度', semitones: 8 },
  { id: 'M6', name: '大六度', semitones: 9 }, { id: 'm7', name: '小七度', semitones: 10 },
  { id: 'M7', name: '大七度', semitones: 11 }
]

export function generateEarTrainingQuestion(mode, config) {
  const allowedRoots = config.roots && config.roots.length > 0 ? config.roots : [0, 2, 4, 5, 7, 9, 11]
  const rootPc = allowedRoots[Math.floor(Math.random() * allowedRoots.length)]
  const rootMidi = 60 + rootPc
  const useFlats = [1, 3, 5, 6, 8, 10].includes(rootPc)
  const rootName = pitchClassToName(rootPc, useFlats)

  if (mode === 'single') {
    return {
      type: 'single',
      noteNames: [rootName + '4'],
      targetMidis: [rootMidi],
      displayName: '单音',
      playType: 'together'
    }
  }

  if (mode === 'interval') {
    const allowedIntvs = config.intervals && config.intervals.length > 0 ? config.intervals : ['M3', 'P5']
    const intvId = allowedIntvs[Math.floor(Math.random() * allowedIntvs.length)]
    const intv = ALL_INTERVALS.find(i => i.id === intvId) || ALL_INTERVALS[3]
    
    const targetMidi = rootMidi + intv.semitones
    return {
      type: 'interval',
      noteNames: [rootName + '4', pitchClassToName(targetMidi % 12, useFlats) + '4'],
      targetMidis: [rootMidi, targetMidi],
      displayName: intv.name,
      playType: 'sequence'
    }
  }

  if (mode === 'chord') {
    const allowedChords = config.chordIds && config.chordIds.length > 0 ? config.chordIds : ['major', 'maj7']
    const chordId = allowedChords[Math.floor(Math.random() * allowedChords.length)]
    const chordDef = CHORDS[chordId] || CHORDS.major
    const chordMidis = chordDef.intervals.map(i => rootMidi + i)
    return {
      type: 'chord',
      noteNames: chordMidis.map(m => pitchClassToName(m % 12, useFlats) + '4'),
      targetMidis: chordMidis,
      displayName: rootName + chordDef.symbol,
      playType: 'together'
    }
  }

  if (mode === 'scale') {
    const allowedScales = config.scaleIds && config.scaleIds.length > 0 ? config.scaleIds : ['major']
    const scaleId = allowedScales[Math.floor(Math.random() * allowedScales.length)]
    const scaleDef = SCALES[scaleId] || SCALES.major
    const upNotes = parseScaleNotes(rootPc, rootName, 4, scaleDef.notes)
    const highRoot = parseScaleNotes(rootPc, rootName, 5, ["1"])[0]
    
    return {
      type: 'scale',
      noteNames: [...upNotes.map(n => n.name + n.octave), highRoot.name + highRoot.octave],
      targetMidis: [...upNotes.map(n => n.midi), highRoot.midi],
      displayName: `${rootName} ${scaleDef.name}`,
      playType: 'sequence'
    }
  }
}