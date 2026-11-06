/**
 * 音高工具
 */

const SHARP_NAMES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']
const FLAT_NAMES  = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B']

/**
 * MIDI 转音名（默认升号）
 */
export function midiToNoteName(midi, useFlats = false) {
  const pc = ((midi % 12) + 12) % 12
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES
  return names[pc] + (Math.floor(midi / 12) - 1)
}

/**
 * Pitch class 转音名
 */
export function pitchClassToName(pc, useFlats = false) {
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES
  return names[((pc % 12) + 12) % 12]
}

/**
 * 音名转 MIDI（兼容 # 和 ♯，b 和 ♭）
 */
export function noteNameToMidi(name) {
  const normalized = name.replace('♯', '#').replace('♭', 'b')
  const match = /^([A-G][#b]?)(-?\d+)$/.exec(normalized)
  if (!match) throw new Error('无法解析音名: ' + name)
  
  const noteStr = match[1].replace('#', '♯').replace('b', '♭')
  let index = SHARP_NAMES.indexOf(noteStr)
  if (index === -1) index = FLAT_NAMES.indexOf(noteStr) // 如果没找到，去降号表找
  
  return (Number(match[2]) + 1) * 12 + index
}

export function pitchClassOf(midi) {
  return ((midi % 12) + 12) % 12
}