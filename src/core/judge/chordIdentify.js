import { CHORDS } from '../theory/chords.js'
import { pitchClassOf } from '../theory/pitch.js'

/**
 * 识别按下的音高集合构成什么和弦
 * @param {number[]} pressedMidis - 按下的 MIDI 数组
 * @returns {{ chordId: string, rootPc: number, bassPc: number, isInversion: boolean } | null}
 */
export function identifyChord(pressedMidis) {
  if (pressedMidis.length < 3) return null // 至少三个音

  // 1. 提取所有按下的独立音级（去重）
  const pcs = [...new Set(pressedMidis.map(m => pitchClassOf(m)))]
  // 找到最低音（用于判断转位）
  const bassMidi = Math.min(...pressedMidis)
  const bassPc = pitchClassOf(bassMidi)

  // 2. 遍历所有的音级，假设它是根音
  for (const rootPc of pcs) {
    // 遍历和弦库
    for (const [id, def] of Object.entries(CHORDS)) {
      // 计算这个根音下的目标和弦包含的音级
      const targetPcs = def.intervals.map(interval => (rootPc + interval) % 12)
      
      // 检查用户按下的音，是否正好构成了这个和弦（长度相同，且元素全包含）
      // 这能防止用户按了 Cmaj9 (5个音)，被误识别为 Cmaj7 (4个音)
      if (
        targetPcs.length === pcs.length && 
        targetPcs.every(pc => pcs.includes(pc))
      ) {
        return {
          chordId: id,
          rootPc,
          bassPc,
          isInversion: rootPc !== bassPc
        }
      }
    }
  }

  return null
}