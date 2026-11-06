import { onMidiEvent, offMidiEvent } from '../input/midiManager.js'
import { renderPiano } from '../render/piano.js'
import { playNote, stopNote } from '../audio/engine.js'
import { midiToNoteName, pitchClassToName } from '../core/theory/pitch.js'
import { identifyChord } from '../core/judge/chordIdentify.js'
import { CHORDS } from '../core/theory/chords.js'
import { renderStaff } from '../render/staff.js'

export function mountChordIdentify(container, onBack) {
  // ★ 仅替换了 HTML 结构，应用了全局 CSS 类
  container.innerHTML = `
    <div class="top-bar">
      <button id="back-btn" class="btn btn-secondary">← 返回主页</button>
    </div>

    <div class="flex-center" style="margin: 30px 0; gap: 20px; align-items: stretch;">
      <div class="target-board" style="width: 320px;">
        <div class="label">当前和弦识别</div>
        <div id="target-name" class="value" style="color: var(--text-muted);">-</div>
      </div>
      
      <div id="staff-container" class="staff-wrapper" style="padding: 10px 20px; width: 320px;"></div>
    </div>

    <div style="text-align: center; margin-bottom: 24px; color: var(--text-muted); font-size: 14px; font-weight: 500;">
      随意按下 3 个或以上的音，系统会自动识别
    </div>

    <div class="piano-wrapper">
      <div id="piano-container"></div>
    </div>
    
    <div class="status-bar">
      <div class="status-item">
        <div class="title">当前按下</div>
        <div id="pressed-notes" class="content">无</div>
      </div>
      <div class="status-item">
        <div class="title">状态</div>
        <div id="status-msg" class="content" style="color: var(--text-muted);">等待按键…</div>
      </div>
    </div>
  `

  const btnBack = container.querySelector('#back-btn')
  const targetNameEl = container.querySelector('#target-name')
  const pressedEl = container.querySelector('#pressed-notes')
  const statusEl = container.querySelector('#status-msg')
  const pianoContainer = container.querySelector('#piano-container')
  const staffContainer = container.querySelector('#staff-container')

  const pressedMidis = new Set()

  const handleNoteOn = (midi) => {
    pressedMidis.add(midi)
    playNote(midiToNoteName(midi))
    updateUI()
  }

  const handleNoteOff = (midi) => {
    pressedMidis.delete(midi)
    stopNote(midiToNoteName(midi))
    updateUI()
  }

  function updateUI() {
    const pressedArray = Array.from(pressedMidis).sort((a, b) => a - b)
    pressedEl.textContent = pressedArray.length 
      ? pressedArray.map(m => midiToNoteName(m)).join(', ') 
      : '无'

    renderPiano(
      pianoContainer, 36, 96, pressedMidis, new Set(),
      { onNoteOn: handleNoteOn, onNoteOff: handleNoteOff }, 
      false 
    )

    // ★ 将硬编码的颜色替换为全局 CSS 变量
    if (pressedArray.length === 0) {
      targetNameEl.textContent = '-'
      targetNameEl.style.color = 'var(--text-muted)'
      statusEl.textContent = '等待按键…'
      statusEl.style.color = 'var(--text-muted)'
      renderStaff(staffContainer, [])
      return
    }

    const staffNoteNames = pressedArray.map(m => midiToNoteName(m))
    renderStaff(staffContainer, staffNoteNames)

    const result = identifyChord(pressedArray)

    if (!result) {
      targetNameEl.textContent = '...'
      targetNameEl.style.color = 'var(--text-muted)'
      statusEl.textContent = `收集音符中 (${pressedArray.length}个)`
      statusEl.style.color = 'var(--warning)'
      return
    }

    const rootName = pitchClassToName(result.rootPc)
    const chordSymbol = CHORDS[result.chordId].symbol
    let chordName = rootName + chordSymbol
    
    if (result.isInversion) {
      const bassName = pitchClassToName(result.bassPc)
      chordName += `/${bassName}`
    }

    targetNameEl.textContent = chordName
    targetNameEl.style.color = 'var(--primary)' // 识别出来用粉色大字显示
    statusEl.textContent = '✅ 识别成功'
    statusEl.style.color = 'var(--success)'
  }

  // 接入全局 MIDI
  const midiCallback = (e) => {
    if (e.type === 'on') handleNoteOn(e.midi)
    else handleNoteOff(e.midi)
  }
  onMidiEvent(midiCallback)

  // 离开页面清理
  btnBack.addEventListener('click', () => {
    offMidiEvent(midiCallback)
    onBack()
  })

  updateUI()
}