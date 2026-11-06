import { onMidiEvent, offMidiEvent } from '../input/midiManager.js'
import { playNote, stopNote } from '../audio/engine.js'
import { midiToNoteName, pitchClassToName } from '../core/theory/pitch.js'
import { generateBlindQuestion, ALL_INTERVALS } from '../core/generator/scaleBlindQuestion.js'

export function mountScaleBlind(container, onBack) {
  // 加载配置
  const defaultConfig = {
    roots: [0, 2, 4, 5, 7, 9, 11], // 默认白键
    intervals: ['M2', 'M3', 'P4', 'P5', 'M6', 'M7'], // 默认常用音程
    mode: 'mixed' // 'absolute', 'interval', 'mixed'
  }
  let config = JSON.parse(localStorage.getItem('scale-blind-config')) || defaultConfig

  const rootCheckboxes = Array.from({ length: 12 }).map((_, pc) => {
    const useFlats = [3, 5, 8, 10].includes(pc)
    const name = pitchClassToName(pc, useFlats)
    return `
      <label style="display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; color: var(--text-main);">
        <input type="checkbox" class="root-cb" value="${pc}" ${config.roots.includes(pc) ? 'checked' : ''} style="accent-color: var(--primary);"> ${name}
      </label>`;
  }).join('')

  const intervalCheckboxes = ALL_INTERVALS.map(i => `
    <label style="display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; color: var(--text-main);">
      <input type="checkbox" class="interval-cb" value="${i.id}" ${config.intervals.includes(i.id) ? 'checked' : ''} style="accent-color: var(--primary);"> ${i.name}
    </label>
  `).join('')

  // ★ 应用粉色毛玻璃 UI 结构
  container.innerHTML = `
    <div class="top-bar">
      <button id="back-btn" class="btn btn-secondary">← 返回主页</button>
      <button id="next-btn" class="btn btn-primary">换一题</button>
      <button id="settings-btn" class="btn btn-secondary" style="margin-left: auto;">⚙️ 题库配置</button>
    </div>

    <!-- 配置面板 -->
    <div id="settings-panel" class="settings-panel" style="max-height: 500px; overflow-y: auto;">
      <h3 class="section-title" style="margin-top: 0;">盲弹题库配置</h3>
      
      <div style="margin-bottom: 24px;">
        <strong style="display: block; margin-bottom: 12px; color: var(--text-main);">出题模式：</strong>
        <label style="color: var(--text-main); margin-right: 15px;"><input type="radio" name="mode" value="mixed" ${config.mode === 'mixed' ? 'checked' : ''}> 混合（绝对音高 + 音程）</label>
        <label style="color: var(--text-main); margin-right: 15px;"><input type="radio" name="mode" value="absolute" ${config.mode === 'absolute' ? 'checked' : ''}> 仅绝对音高</label>
        <label style="color: var(--text-main);"><input type="radio" name="mode" value="interval" ${config.mode === 'interval' ? 'checked' : ''}> 仅音程</label>
      </div>

      <div style="margin-bottom: 24px;">
        <strong style="display: block; margin-bottom: 12px; color: var(--text-main);">基准音包含：</strong>
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px;">${rootCheckboxes}</div>
      </div>

      <div style="margin-bottom: 24px;">
        <strong style="display: block; margin-bottom: 12px; color: var(--text-main);">音程类型（仅对音程题生效）：</strong>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">${intervalCheckboxes}</div>
      </div>

      <button id="save-settings-btn" class="btn btn-success">保存并应用</button>
    </div>

    <!-- 目标卡片与反馈 -->
    <div style="display: flex; flex-direction: column; align-items: center; margin: 30px 0;">
      
      <!-- 题目卡片 -->
      <div class="target-board" style="width: 480px; padding: 30px 20px; margin-bottom: 30px;">
        <div id="prompt-text" style="font-size: 32px; font-weight: 700; color: var(--primary); line-height: 1.4; text-align: center;">...</div>
        <div id="sub-prompt-text" style="font-size: 16px; color: var(--text-muted); margin-top: 10px; font-weight: 500;">...</div>
      </div>

      <!-- 状态反馈 -->
      <div id="feedback-area" style="height: 70px; text-align: center; margin-bottom: 20px;">
        <div id="feedback-msg" style="font-size: 24px; font-weight: 800; color: var(--text-main);">等待按键…</div>
        <div id="score-msg" style="font-size: 15px; color: var(--text-muted); margin-top: 5px; font-weight: 600;">已弹对：0 次</div>
      </div>

      <!-- 隐藏键盘占位符 (使用粉色渐变阴影模拟盲区) -->
      <div style="width: 100%; height: 160px; background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border: 2px dashed var(--primary-light); border-radius: var(--radius-lg); display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--primary); font-size: 18px; font-weight: 700; letter-spacing: 2px; box-shadow: inset 0 4px 12px rgba(236,72,153,0.05);">
        <div style="font-size: 32px; margin-bottom: 10px;">🙈</div>
        虚拟键盘已隐藏，请盲弹你的 MIDI 键盘
      </div>

    </div>
  `

  const btnBack = container.querySelector('#back-btn')
  const btnNext = container.querySelector('#next-btn')
  const btnSettings = container.querySelector('#settings-btn')
  const settingsPanel = container.querySelector('#settings-panel')
  const btnSaveSettings = container.querySelector('#save-settings-btn')
  
  const promptEl = container.querySelector('#prompt-text')
  const subPromptEl = container.querySelector('#sub-prompt-text')
  const feedbackEl = container.querySelector('#feedback-msg')
  const scoreEl = container.querySelector('#score-msg')

  let currentQuestion = null
  let score = 0
  const pressedMidis = new Set()

  const handleNoteOn = (midi) => {
    pressedMidis.add(midi)
    playNote(midiToNoteName(midi, currentQuestion.useFlats))
    checkNote(midi)
  }

  const handleNoteOff = (midi) => {
    pressedMidis.delete(midi)
    stopNote(midiToNoteName(midi, currentQuestion.useFlats))
  }

  function checkNote(midi) {
    if (midi === currentQuestion.targetMidi) {
      score++
      scoreEl.textContent = `已弹对：${score} 次`
      // 使用 CSS 变量
      feedbackEl.textContent = `✅ 正确！${midiToNoteName(midi, currentQuestion.useFlats)}`
      feedbackEl.style.color = 'var(--success)'
      
      setTimeout(() => {
        loadNewQuestion()
      }, 600)
    } else {
      feedbackEl.textContent = `❌ 按错了，你按的是 ${midiToNoteName(midi, currentQuestion.useFlats)}`
      feedbackEl.style.color = 'var(--danger)'
    }
  }

  function playBaseTone() {
    if (currentQuestion.type === 'interval') {
      playNote(midiToNoteName(currentQuestion.baseMidi, currentQuestion.useFlats))
      setTimeout(() => {
        stopNote(midiToNoteName(currentQuestion.baseMidi, currentQuestion.useFlats))
      }, 1000)
    }
  }

  function loadNewQuestion() {
    currentQuestion = generateBlindQuestion(config)
    promptEl.textContent = currentQuestion.prompt
    subPromptEl.textContent = currentQuestion.subPrompt
    
    feedbackEl.textContent = '等待按键…'
    feedbackEl.style.color = 'var(--text-main)'

    if (currentQuestion.type === 'interval') {
      playBaseTone()
    }
  }

  // 配置面板交互
  btnSettings.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' || settingsPanel.style.display === '' ? 'block' : 'none'
  })

  btnSaveSettings.addEventListener('click', () => {
    const selectedRoots = Array.from(container.querySelectorAll('.root-cb:checked')).map(cb => parseInt(cb.value))
    const selectedIntervals = Array.from(container.querySelectorAll('.interval-cb:checked')).map(cb => cb.value)
    const selectedMode = container.querySelector('input[name="mode"]:checked').value

    if (selectedRoots.length === 0) {
      alert('至少需要勾选一个基准音！')
      return
    }
    
    if (selectedMode !== 'absolute' && selectedIntervals.length === 0) {
      alert('音程模式至少需要勾选一个音程类型！')
      return
    }

    config = { roots: selectedRoots, intervals: selectedIntervals, mode: selectedMode }
    localStorage.setItem('scale-blind-config', JSON.stringify(config))
    
    settingsPanel.style.display = 'none'
    loadNewQuestion()
  })

  btnNext.addEventListener('click', loadNewQuestion)

  const midiCallback = (e) => {
    if (e.type === 'on') handleNoteOn(e.midi)
    else handleNoteOff(e.midi)
  }
  onMidiEvent(midiCallback)

  btnBack.addEventListener('click', () => {
    offMidiEvent(midiCallback)
    onBack()
  })

  loadNewQuestion()
}