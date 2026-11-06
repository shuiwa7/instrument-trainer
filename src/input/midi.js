import { midiToNoteName } from '../core/theory/pitch.js'

/**
 * 统一的演奏事件
 * @typedef {Object} PlayEvent
 * @property {'on'|'off'} type
 * @property {string} note        - 音名，如 "C4"
 * @property {number} midi        - MIDI 音高，如 60
 * @property {number} velocity    - 力度 0-127（note-off 时为 0）
 * @property {number} timestamp   - performance.now()
 * @property {'midi'} source
 */

// 去重：同一音高 + 同一事件类型，20ms 内只处理一次
// 解决 SMK25 与 MIDIIN2 镜像重复上报的问题
const seen = new Map()
function isDuplicate(type, note) {
  const key = type + '-' + note
  const now = performance.now()
  const last = seen.get(key)
  if (last !== undefined && now - last < 20) return true
  seen.set(key, now)
  return false
}

/**
 * 启动 MIDI 监听
 * @param {(e: PlayEvent) => void} onPlayEvent
 * @returns {Promise<void>}
 */
export async function startMidi(onPlayEvent) {
  if (!navigator.requestMIDIAccess) {
    throw new Error('当前浏览器不支持 Web MIDI，请用 Chrome 或 Edge')
  }

  console.log('[MIDI] 1. 准备请求 MIDI 权限...')
  let access
  try {
    access = await navigator.requestMIDIAccess()
    console.log('[MIDI] 2. 权限获取成功！')
  } catch (err) {
    console.error('[MIDI] 权限获取失败:', err)
    throw err
  }

  const inputs = access.inputs
  console.log('[MIDI] 3. 当前检测到的设备数量:', inputs.size)

  for (const input of inputs.values()) {
    console.log('[MIDI] 4. 正在绑定设备监听:', input.name)
    
    // 用 addEventListener 代替 onmidimessage，避免被覆盖
    input.addEventListener('midimessage', (msg) => {
      const [status, data1, data2] = msg.data
      const command = status & 0xf0
      const ts = performance.now()

      if (command === 0x90 && data2 > 0) {
        if (isDuplicate('on', data1)) return
        onPlayEvent({
          type: 'on', note: midiToNoteName(data1), midi: data1,
          velocity: data2, timestamp: ts, source: 'midi',
        })
      }
      else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
        if (isDuplicate('off', data1)) return
        onPlayEvent({
          type: 'off', note: midiToNoteName(data1), midi: data1,
          velocity: 0, timestamp: ts, source: 'midi',
        })
      }
    })
  }

  access.onstatechange = (e) => {
    console.log('[MIDI] 设备状态改变:', e.port.name, e.port.state)
  }
  
  console.log('[MIDI] 5. startMidi 函数执行结束')
}