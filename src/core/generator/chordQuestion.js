import { CHORDS } from '../theory/chords.js'
import { pitchClassToName } from '../theory/pitch.js'

export function generateRandomChord(config) {
  let availableChords = []
  if (config.chordIds && config.chordIds.length > 0) {
    availableChords = config.chordIds.map(id => CHORDS[id]).filter(Boolean)
  }
  if (availableChords.length === 0) availableChords = [CHORDS.maj7]

  let allowedRoots = config.roots || []
  if (allowedRoots.length === 0) allowedRoots = [0]

  const rootPc = allowedRoots[Math.floor(Math.random() * allowedRoots.length)]
  const chordDef = availableChords[Math.floor(Math.random() * availableChords.length)]
  const rootMidi = rootPc + 48 

  const isBlackKey = [1, 3, 6, 8, 10].includes(rootPc)
  const useFlats = isBlackKey ? Math.random() < 0.5 : false

  const rootName = pitchClassToName(rootPc, useFlats)
  
  return {
    rootMidi,
    chordDef,
    useFlats, 
    chordName: rootName + chordDef.symbol 
  }
}