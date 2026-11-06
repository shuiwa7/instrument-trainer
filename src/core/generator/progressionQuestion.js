import { CHORDS } from '../theory/chords.js'
import { pitchClassToName } from '../theory/pitch.js'

const response = await fetch(new URL('../theory/progressions.json', import.meta.url))
export const PROGRESSIONS = await response.json()

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

// ★ 标准的 12 个调名（按五度圈顺序和标准拼写）
const STANDARD_KEYS = [
  { pc: 0, name: 'C' },
  { pc: 7, name: 'G' },
  { pc: 2, name: 'D' },
  { pc: 9, name: 'A' },
  { pc: 4, name: 'E' },
  { pc: 11, name: 'B' },
  { pc: 6, name: 'F#' },
  { pc: 1, name: 'Db' },
  { pc: 8, name: 'Ab' },
  { pc: 3, name: 'Eb' },
  { pc: 10, name: 'Bb' },
  { pc: 5, name: 'F' }
]

export { STANDARD_KEYS }

function parseDegree(degreeStr) {
  let str = String(degreeStr).trim()
  let accidental = ''
  
  if (str.startsWith('b')) {
    accidental = 'b'
    str = str.slice(1)
  } else if (str.startsWith('#')) {
    accidental = '#'
    str = str.slice(1)
  }
  
  const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7 }
  let degreeNum = romanMap[str.toUpperCase()] || parseInt(str)
  
  if (isNaN(degreeNum) || degreeNum < 1 || degreeNum > 7) degreeNum = 1
  
  return { accidental, degreeNum }
}

export function generateProgressionQuestion(targetId = null, targetKeyPc = null) {
  let prog = targetId 
    ? PROGRESSIONS.find(p => p.id === targetId) 
    : PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)]
  if (!prog) prog = PROGRESSIONS[0]

  // 默认用 C 调，或者指定调
  const keyPc = targetKeyPc !== null ? targetKeyPc : 0
  
  // ★ 从标准字典里拿调名，这样系统就不会生成 C# 这种非法调号了
  const keyObj = STANDARD_KEYS.find(k => k.pc === keyPc) || STANDARD_KEYS[0]
  const keyName = keyObj.name
  
  // 如果是降号调，内部拼写音符时也用降号
  const useFlats = keyName.includes('b') || keyName === 'F'

  let currentGlobalBeat = 0
  let totalBeats = 0
  let romanNameList = []

  const measures = prog.progress.segment.map(seg => {
    const measureChords = seg.chord.map(c => {
      const { accidental, degreeNum } = parseDegree(c.degree)
      
      let semitones = MAJOR_SCALE[degreeNum - 1]
      if (accidental === 'b') semitones -= 1
      if (accidental === '#') semitones += 1
      
      const exactRootPc = (keyPc + semitones + 12) % 12
      
      const chordId = c.type || 'major'
      const chordDef = CHORDS[chordId] || CHORDS.major
      
      const rootMidi = 48 + exactRootPc 
      const startBeat = currentGlobalBeat
      const endBeat = currentGlobalBeat + c.beats
      
      currentGlobalBeat = endBeat
      totalBeats += c.beats

      let duration = 'q'
      if (c.beats === 4) duration = 'w'
      else if (c.beats === 2) duration = 'h'
      else if (c.beats === 1) duration = 'q'
      else if (c.beats === 0.5) duration = '8'
      else if (c.beats === 3) duration = 'hd'
      else if (c.beats === 1.5) duration = 'qd'

      let chordUseFlats = useFlats
      if (accidental === 'b') chordUseFlats = true
      if (accidental === '#') chordUseFlats = false

      const chordMidis = chordDef.intervals.map(i => rootMidi + i)
      
      const staffNoteNames = chordMidis.map(m => {
        return pitchClassToName(m % 12, chordUseFlats) + (Math.floor(m / 12) - 1)
      })

      const roman = accidental + ROMAN_NUMERALS[degreeNum - 1] + chordDef.symbol
      romanNameList.push(roman)

      return {
        rootMidi,
        chordDef,
        displayName: pitchClassToName(exactRootPc, chordUseFlats) + chordDef.symbol,
        romanName: roman,
        startBeat,
        endBeat,
        beats: c.beats,
        duration,
        status: 'pending',
        staffNoteNames
      }
    })

    return { num: seg.num, chords: measureChords }
  })

  const flatChords = measures.flatMap(m => m.chords)

  return {
    id: prog.id,
    keyName,
    keyPc,
    progName: prog.name,
    romanProgression: romanNameList.join(' - '),
    bpm: prog.bpm,
    measures,
    chords: flatChords,
    totalBeats,
    useFlats
  }
}