/**
 * 和弦定义：从 chords.json 加载数据，并提供计算函数
 */

const response = await fetch(new URL('./chords.json', import.meta.url))
if (!response.ok) throw new Error('加载 chords.json 失败: ' + response.status)

/**
 * 全部和弦定义，key 为和弦 id
 * @type {Record<string, { name: string, group: string, intervals: number[], coreIntervals: number[] }>}
 */
export const CHORDS = await response.json()

/** 分组顺序，UI 按这个顺序展示 */
export const CHORD_GROUPS = [
  '三和弦',
  '七和弦',
  '六和弦',
  '扩展和弦',
  '变化扩展',
  '双八度扩展',
]

/**
 * 取某一分组的全部和弦
 * @param {string} group
 * @returns {{ id: string, def: any }[]}
 */
export function chordsOfGroup(group) {
  return Object.entries(CHORDS)
    .filter(([, def]) => def.group === group)
    .map(([id, def]) => ({ id, def }))
}

/**
 * 根据根音 MIDI 和和弦定义，算出全部音的 MIDI 序列
 * @param {number} rootMidi
 * @param {{ intervals: number[] }} def
 * @returns {number[]}
 */
export function chordMidiSequence(rootMidi, def) {
  return def.intervals.map((semitones) => rootMidi + semitones)
}

/**
 * 根据根音 MIDI 和和弦定义，算出核心音的 MIDI 序列
 * @param {number} rootMidi
 * @param {{ coreIntervals: number[] }} def
 * @returns {number[]}
 */
export function chordCoreMidiSequence(rootMidi, def) {
  return def.coreIntervals.map((semitones) => rootMidi + semitones)
}