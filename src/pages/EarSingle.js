import { onMidiEvent, offMidiEvent } from '../input/midiManager.js'
import { renderPiano } from '../render/piano.js'
import { playNote, stopNote, playSequence } from '../audio/engine.js'
import { midiToNoteName, pitchClassOf, pitchClassToName } from '../core/theory/pitch.js'
import { generateEarTrainingQuestion } from '../core/generator/earTrainingQuestion.js'
import { renderStaff } from '../render/staff.js'

export function mountEarSingle(container, onBack) {
  const configKey = 'ear-config-single'
  let config = JSON.parse(localStorage.getItem(configKey)) || { roots: [0,2,4,5,7,9,11] }

  // 配置面板 HTML 生成
  const rootCheckboxes = Array.from({ length: 12 }).map((_, pc) => {
    const useFlats = [3, 5, 8, 10].includes(pc)
    return `
      <label style="display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; color: var(--text-main);">
        <input type="checkbox" class="root-cb" value="${pc}" ${config.roots.includes(pc) ? 'checked' : ''} style="accent-color: var(--primary);"> 
        ${pitchClassToName(pc, useFlats)}
      </label>`;
  }).join('')

  // ★ 应用粉色毛玻璃 UI 结构
  container.innerHTML = `
    <div class="top-bar">
      <button id="back-btn" class="btn btn-secondary">← 返回主页</button>
      <button id="next-btn" class="btn btn-primary">换一题</button>
      <h2 style="margin: 0; margin-left: 20px; font-size: 20px; color: var(--primary); font-weight: 800; flex: 1;">单音听辨</h2>
      <button id="settings-btn" class="btn btn-secondary">⚙️ 题库配置</button>
    </div>

    <!-- 配置面板 -->
    <div id="settings-panel" class="settings-panel">
      <h3 class="section-title" style="margin-top: 0;">单音听辨题库配置</h3>
      <div style="margin-bottom: 24px;">
        <strong style="display: block; margin-bottom: 12px; color: var(--text-main);">包含哪些音：</strong>
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px;">${rootCheckboxes}</div>
      </div>
      <button id="save-settings-btn" class="btn btn-success">保存并应用</button>
    </div>

    <!-- 目标与反馈区 -->
    <div class="flex-center" style="margin: 30px 0; gap: 20px; flex-direction: column;">
      <div class="target-board" style="width: 480px; height: 180px; padding: 20px;">
        <div class="label">目标复现</div>
        <div id="feedback-text" class="value" style="font-size: 32px; color: var(--primary);">请播放声音</div>
      </div>

      <div style="display: flex; gap: 16px; margin-top: 10px;">
        <button id="play-btn" class="btn btn-primary" style="font-size: 18px; padding: 12px 40px; border-radius: 30px;">▶ 播放声音</button>
        <button id="reveal-btn" class="btn btn-secondary" style="font-size: 16px; padding: 12px 24px; border-radius: 30px;">👀 看答案</button>
      </div>
    </div>

    <!-- 五线谱与键盘 -->
    <div id="staff-container" class="staff-wrapper" style="margin-bottom: 24px;"></div>
    
    <div class="piano-wrapper">
      <div id="piano-container"></div>
    </div>
  `

  const btnBack = container.querySelector('#back-btn')
  const btnNext = container.querySelector('#next-btn')
  const btnPlay = container.querySelector('#play-btn')
  const btnReveal = container.querySelector('#reveal-btn')
  const btnSettings = container.querySelector('#settings-btn')
  const settingsPanel = container.querySelector('#settings-panel')
  const btnSaveSettings = container.querySelector('#save-settings-btn')
  const feedbackText = container.querySelector('#feedback-text')
  const pianoContainer = container.querySelector('#piano-container')
  const staffContainer = container.querySelector('#staff-container')

  let q = null
  const pressed = new Set()
  let isCompleted = false

  const playCurrentSound = () => { if (q) playSequence(q.noteNames, q.playType) }

  const handleNoteOn = (midi) => {
    if (isCompleted) return
    pressed.add(midi)
    playNote(midiToNoteName(midi))
    checkAnswer()
    updateUI()
  }
  const handleNoteOff = (midi) => {
    pressed.delete(midi)
    stopNote(midiToNoteName(midi))
    updateUI()
  }

  function checkAnswer() {
    const pressedPCs = [...new Set(Array.from(pressed).map(m => pitchClassOf(m)))]
    const targetPCs = [...new Set(q.targetMidis.map(m => pitchClassOf(m)))]
    if (pressedPCs.length !== targetPCs.length) return
    if (targetPCs.every(pc => pressedPCs.includes(pc))) {
      isCompleted = true
      feedbackText.textContent = '✅ 完美听辨！'
      feedbackText.style.color = 'var(--success)'
      renderStaff(staffContainer, q.noteNames)
      setTimeout(loadNewQuestion, 1500)
    }
  }

  function loadNewQuestion() {
    q = generateEarTrainingQuestion('single', config)
    pressed.forEach(m => stopNote(midiToNoteName(m)))
    pressed.clear()
    isCompleted = false
    feedbackText.textContent = '请播放声音'
    feedbackText.style.color = 'var(--primary)'
    staffContainer.innerHTML = ''
    updateUI()
    setTimeout(playCurrentSound, 300)
  }

  function updateUI() {
    renderPiano(pianoContainer, 48, 84, pressed, new Set(), { onNoteOn: handleNoteOn, onNoteOff: handleNoteOff }, false)
  }

  // 事件与配置面板交互
  btnSettings.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' || settingsPanel.style.display === '' ? 'block' : 'none'
  })
  
  btnSaveSettings.addEventListener('click', () => {
    const roots = Array.from(container.querySelectorAll('.root-cb:checked')).map(cb => parseInt(cb.value))
    if (!roots.length) return alert('至少选一个音')
    config.roots = roots
    localStorage.setItem(configKey, JSON.stringify(config))
    settingsPanel.style.display = 'none'
    loadNewQuestion()
  })

  btnPlay.addEventListener('click', playCurrentSound)
  
  btnReveal.addEventListener('click', () => {
    if (isCompleted) return
    feedbackText.textContent = `答案：${q.displayName}`
    feedbackText.style.color = 'var(--warning)'
    renderStaff(staffContainer, q.noteNames)
  })
  
  btnNext.addEventListener('click', loadNewQuestion)

  const midiCallback = (e) => { e.type === 'on' ? handleNoteOn(e.midi) : handleNoteOff(e.midi) }
  onMidiEvent(midiCallback)
  
  btnBack.addEventListener('click', () => { offMidiEvent(midiCallback); onBack() })
  
  loadNewQuestion()
}