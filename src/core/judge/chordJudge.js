import { pitchClassOf } from '../theory/pitch.js'

/**
 * 判定按下的音符是否符合目标和弦
 * 
 * @param {number[]} pressedMidis - 当前按下的 MIDI 音高集合（比如 [60, 64, 67]）
 * @param {number} rootMidi - 目标和弦的根音 MIDI（比如 60 对应 C4）
 * @param {{ intervals: number[], coreIntervals: number[] }} chordDef - 和弦定义
 * @param {{ strictVoicing: boolean }} config - 配置项（严格度）
 * @returns {{
 *   correct: boolean, 
 *   missing: number[], 
 *   extra: number[],
 *   status: 'correct' | 'missing' | 'extra' | 'empty'
 * }}
 */
export function judgeChord(pressedMidis, rootMidi, chordDef, config) {
  if (pressedMidis.length === 0) {
    return { correct: false, missing: [], extra: [], status: 'empty' }
  }

  // 1. 算出目标需要的 pitch class 集合
  // 如果是严格模式，必须包含全部音；否则只需包含核心音
  const targetIntervals = config.strictVoicing ? chordDef.intervals : chordDef.coreIntervals
  const targetPCs = targetIntervals.map(i => (rootMidi + i) % 12)
  
  // 2. 算出当前按下的 pitch class 集合（去重）
  const pressedPCs = [...new Set(pressedMidis.map(m => pitchClassOf(m)))]

  // 3. 找出缺少的音（目标里有，但没按的）
  const missingPCs = targetPCs.filter(pc => !pressedPCs.includes(pc))
  
  // 4. 找出多按的音（目标里没有，但按了的）
  // 注意：严格度（strictVoicing）不影响"多按音"的参照标准。
  // 比如目标是 Cmaj7，你按了 C E G B，即使选了宽松，G 也不算是"多按"。
  // 只有按了 D、F 这种完全不在和弦内的音，才算"多按"。
  const allTargetPCs = chordDef.intervals.map(i => (rootMidi + i) % 12)
  const extraPCs = pressedPCs.filter(pc => !allTargetPCs.includes(pc))

  // 5. 判定状态
  // - 如果没有缺音，且没有多按的音 → 完美
  // - 如果没有缺音，但有多按的音 → 核心音够了，但多按了
  // - 如果有缺音 → 还没按对
  let status = 'correct'
  if (missingPCs.length > 0) {
    status = 'missing'
  }
  if (extraPCs.length > 0) {
    status = 'extra'
  }

  return {
    correct: missingPCs.length === 0, // 只要核心音/全部音齐了，就算 correct = true
    missing: missingPCs,
    extra: extraPCs,
    status
  }
}