const response = await fetch(new URL('./scales.json', import.meta.url))
if (!response.ok) throw new Error('加载 scales.json 失败: ' + response.status)

const data = await response.json()

export const ROOT_NAMES = data.rootNames
export const SCALES = data.scales

export const SCALE_GROUPS = [
  '大小调体系',
  '中古调式',
  '五声音阶',
  '日本调式',
  '布鲁斯',
  '对称音阶',
]

export function scalesOfGroup(group) {
  return Object.entries(SCALES)
    .filter(([, def]) => def.group === group)
    .map(([id, def]) => ({ id, def }))
}

/**
 * 根据根音 MIDI 和音阶定义，算出一个八度内的 MIDI 序列
 */
export function scaleMidiSequence(rootMidi, def) {
  return def.intervals.map((semitones) => rootMidi + semitones)
}