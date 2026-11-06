import { startMidi } from './midi.js'
import { startAudio } from '../audio/engine.js'

let isConnected = false
let listeners = []

// 统一的 MIDI 事件入口
const handleMidiEvent = (e) => {
  // 把事件分发给所有订阅者
  listeners.forEach(fn => fn(e))
}

export async function connectDevice() {
  if (isConnected) return true
  
  try {
    // 先请求 MIDI（避免被浏览器手势拦截）
    await startMidi(handleMidiEvent)
    // 再启动音频
    startAudio().catch(console.error)
    
    isConnected = true
    return true
  } catch (err) {
    console.error('MIDI 连接失败', err)
    alert('MIDI 连接失败：' + err.message)
    return false
  }
}

export function getMidiStatus() {
  return isConnected
}

// 子页面用来注册监听
export function onMidiEvent(callback) {
  listeners.push(callback)
}

// 子页面离开时注销监听，防止内存泄漏和误触发
export function offMidiEvent(callback) {
  listeners = listeners.filter(fn => fn !== callback)
}