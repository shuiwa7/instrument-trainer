import { pitchClassToName } from '../theory/pitch.js'

const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
export const ALL_INTERVALS = [
  { id: 'm2', name: '小二度', semitones: 1 },
  { id: 'M2', name: '大二度', semitones: 2 },
  { id: 'm3', name: '小三度', semitones: 3 },
  { id: 'M3', name: '大三度', semitones: 4 },
  { id: 'P4', name: '纯四度', semitones: 5 },
  { id: 'TT', name: '增四度/减五度', semitones: 6 },
  { id: 'P5', name: '纯五度', semitones: 7 },
  { id: 'm6', name: '小六度', semitones: 8 },
  { id: 'M6', name: '大六度', semitones: 9 },
  { id: 'm7', name: '小七度', semitones: 10 },
  { id: 'M7', name: '大七度', semitones: 11 },
]

export function generateBlindQuestion(config) {
  // 默认配置
  const allowedRoots = config.roots || [0, 2, 4, 5, 7, 9, 11]
  const allowedIntervals = config.intervals || ALL_INTERVALS.map(i => i.id)
  const mode = config.mode || 'mixed' // 'absolute', 'interval', 'mixed'

  // 决定题型
  let isAbsolute = false
  if (mode === 'absolute') isAbsolute = true
  else if (mode === 'interval') isAbsolute = false
  else isAbsolute = Math.random() < 0.5

  // 随机选基准音
  const rootPc = allowedRoots[Math.floor(Math.random() * allowedRoots.length)]
  const baseMidi = 60 + rootPc
  const useFlats = ['Db', 'Eb', 'Ab', 'Bb', 'F'].includes(MAJOR_KEYS[rootPc])
  const baseName = pitchClassToName(rootPc, useFlats) + '4'

  if (isAbsolute) {
    return {
      type: 'absolute',
      targetMidi: baseMidi,
      targetName: baseName,
      useFlats,
      prompt: `请盲按出：${baseName}`,
      subPrompt: '完全不看屏幕上的键盘，凭感觉找到它'
    }
  } else {
    // 筛选可用的音程
    const availableIntervals = ALL_INTERVALS.filter(i => allowedIntervals.includes(i.id))
    // 防爆保底
    const finalIntervals = availableIntervals.length > 0 ? availableIntervals : [ALL_INTERVALS[4]] 
    
    const interval = finalIntervals[Math.floor(Math.random() * finalIntervals.length)]
    const targetMidi = baseMidi + interval.semitones
    const targetPc = targetMidi % 12
    const targetName = pitchClassToName(targetPc, useFlats) + '4' // 为了统一显示，暂不精确计算八度标号

    return {
      type: 'interval',
      baseMidi,
      baseName,
      targetMidi,
      targetName,
      useFlats,
      prompt: `基准音：${baseName}`,
      subPrompt: `请盲按出它上方的【${interval.name}】`,
      intervalName: interval.name
    }
  }
}