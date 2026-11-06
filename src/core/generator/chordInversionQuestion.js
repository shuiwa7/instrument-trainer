import { CHORDS } from '../theory/chords.js'
import { pitchClassToName } from '../theory/pitch.js'

export function generateInversionQuestion(allowedChordIds) {
  // ★ 过滤出选中的，且必须在三和弦/七和弦里的
  let availableIds = (allowedChordIds || []).filter(id => 
    CHORDS[id] && ['三和弦', '七和弦'].includes(CHORDS[id].group)
  )
  // 如果没选或选空了，给个保底
  if (availableIds.length === 0) availableIds = ['major', 'minor', 'maj7', 'm7', '7']

  const chordId = availableIds[Math.floor(Math.random() * availableIds.length)]
  const chordDef = CHORDS[chordId]
  
  const rootPc = Math.floor(Math.random() * 12)
  const rootMidi = 48 + rootPc
  
  const maxInversion = chordDef.intervals.length - 1
  const inversion = Math.floor(Math.random() * (maxInversion + 1))
  
  const originalMidis = chordDef.intervals.map(i => rootMidi + i)
  const voicedMidis = originalMidis.map((m, i) => i < inversion ? m + 12 : m)
  voicedMidis.sort((a, b) => a - b)
  
  const bassMidi = voicedMidis[0]
  const bassPc = bassMidi % 12
  
  const useFlats = false
  const rootName = pitchClassToName(rootPc, useFlats)
  const bassName = pitchClassToName(bassPc, useFlats)
  
  let chordName = rootName + chordDef.symbol
  if (inversion > 0) {
    chordName += `/${bassName}`
  }
  
  const invNames = ['原位', '第一转位', '第二转位', '第三转位']

  return {
    rootMidi,
    chordDef,
    inversion,
    voicedMidis,
    bassMidi,
    chordName, // ★ 纯和弦名，如 C/E
    inversionName: invNames[inversion], // ★ 转位名，如 第一转位
    staffNoteNames: voicedMidis.map(m => pitchClassToName(m % 12, useFlats) + (Math.floor(m / 12) - 1))
  }
}