import { onMidiEvent, offMidiEvent } from '../input/midiManager.js'
import { renderPiano } from '../render/piano.js'
import { playNote, stopNote } from '../audio/engine.js'
import { midiToNoteName, pitchClassToName } from '../core/theory/pitch.js'
import { renderStaff } from '../render/staff.js'
import { generateInversionQuestion } from '../core/generator/chordInversionQuestion.js'
import { CHORDS, chordsOfGroup } from '../core/theory/chords.js'

export function mountChordInvert(container, onBack) {
  // ★ 获取配置
  const defaultConfig = {
    chordIds: ['major', 'minor', 'maj7', 'm7', '7']
  }
  let config = JSON.parse(localStorage.getItem('chord-invert-config')) || defaultConfig

  // 只生成三和弦和七和弦的选项
  const triads = chordsOfGroup('三和弦')
  const sevenths = chordsOfGroup('七和弦')
  
  const makeCheckboxes = (chords) => chords.map(({ id, def }) => `
    <label style="display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; color: var(--text-main);">
      <input type="checkbox" class="chord-cb" value="${id}" ${config.chordIds.includes(id) ? 'checked' : ''}> 
      <span>${def.name}</span>
    </label>
  `).join('')

  // ★ 只替换了这里的 HTML 结构，应用了全局 CSS 类
  container.innerHTML = `
    <div class="top-bar">
      <button id="back-btn" class="btn btn-secondary">← 返回主页</button>
      <button id="settings-btn" class="btn btn-secondary">⚙️ 题库配置</button>
      <button id="next-btn" class="btn btn-primary" style="margin-left: auto;">换一题</button>
    </div>

    <!-- 配置面板 -->
    <div id="settings-panel" class="settings-panel">
      <h3 class="section-title" style="margin-top: 0;">转位题库（仅限三和弦/七和弦）</h3>
      <div style="margin-bottom: 20px;">
        <strong style="display: block; margin-bottom: 12px; color: var(--text-main);">三和弦：</strong>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 600px;">${makeCheckboxes(triads)}</div>
      </div>
      <div style="margin-bottom: 20px;">
        <strong style="display: block; margin-bottom: 12px; color: var(--text-main);">七和弦：</strong>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 600px;">${makeCheckboxes(sevenths)}</div>
      </div>
      <button id="save-settings-btn" class="btn btn-success">保存并应用</button>
    </div>

    <!-- 目标卡片和五线谱 -->
    <div class="flex-center" style="margin: 30px 0 20px 0; gap: 20px; align-items: stretch;">
      <!-- 卡片换行 -->
      <div class="target-board" style="width: 340px; padding: 20px;">
        <div class="label" style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">目标和弦 / 转位</div>
        <div id="target-chord-name" class="value" style="margin-bottom: 8px;">...</div>
        <div id="target-inv-name" style="font-size: 18px; color: var(--text-muted); font-weight: 600;">...</div>
      </div>
      
      <div id="staff-container" class="staff-wrapper" style="padding: 10px 20px;"></div>
    </div>

    <!-- 键盘 -->
    <div class="piano-wrapper">
      <div id="piano-container"></div>
    </div>
    
    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <div class="title">当前按下</div>
        <div id="pressed-notes" class="content">无</div>
      </div>
      <div class="status-item">
        <div class="title">判定结果</div>
        <div id="judge-result" class="content" style="color: var(--text-muted);">等待按键…</div>
      </div>
    </div>
  `

  const btnBack = container.querySelector('#back-btn')
  const btnNext = container.querySelector('#next-btn')
  const btnSettings = container.querySelector('#settings-btn')
  const settingsPanel = container.querySelector('#settings-panel')
  const btnSaveSettings = container.querySelector('#save-settings-btn')
  const targetChordEl = container.querySelector('#target-chord-name')
  const targetInvEl = container.querySelector('#target-inv-name')
  const pressedEl = container.querySelector('#pressed-notes')
  const resultEl = container.querySelector('#judge-result')
  const pianoContainer = container.querySelector('#piano-container')
  const staffContainer = container.querySelector('#staff-container')

  let currentTarget = null
  const pressedMidis = new Set()
  let isCompleted = false

  const handleNoteOn = (midi) => {
    if (isCompleted) return
    pressedMidis.add(midi)
    playNote(midiToNoteName(midi))
    updateUI()
  }

  const handleNoteOff = (midi) => {
    pressedMidis.delete(midi)
    stopNote(midiToNoteName(midi))
    updateUI()
  }

  function loadNewQuestion() {
    currentTarget = generateInversionQuestion(config.chordIds)
    targetChordEl.textContent = currentTarget.chordName
    targetInvEl.textContent = currentTarget.inversionName
    
    renderStaff(staffContainer, currentTarget.staffNoteNames)
    pressedMidis.forEach(m => stopNote(midiToNoteName(m)))
    pressedMidis.clear()
    
    isCompleted = false
    updateUI()
  }

  function updateUI() {
    const pressedArray = Array.from(pressedMidis).sort((a, b) => a - b)
    pressedEl.textContent = pressedArray.length 
      ? pressedArray.map(m => midiToNoteName(m)).join(', ') 
      : '无'

    // ★ 计算多按的音（标橙色）
    const extraMidis = new Set()
    if (!isCompleted && pressedArray.length > 0) {
      const targetPCs = currentTarget.voicedMidis.map(m => m % 12)
      pressedArray.forEach(m => {
        if (!targetPCs.includes(m % 12)) {
          extraMidis.add(m)
        }
      })
    }

    renderPiano(
      pianoContainer, 36, 96, pressedMidis, extraMidis, // ★ 传入 extraMidis
      { onNoteOn: handleNoteOn, onNoteOff: handleNoteOff }, 
      false
    )

    // ★ 下面的颜色赋值换成了 CSS 变量
    if (isCompleted) {
      resultEl.textContent = '✅ 完美！你弹对了转位。'
      resultEl.style.color = 'var(--success)'
      return
    }

    if (pressedArray.length === 0) {
      resultEl.textContent = '等待按键…'
      resultEl.style.color = 'var(--text-muted)'
      return
    }

    const targetPCs = [...new Set(currentTarget.voicedMidis.map(m => m % 12))]
    const pressedPCs = [...new Set(pressedArray.map(m => m % 12))]
    const missing = targetPCs.filter(pc => !pressedPCs.includes(pc))

    if (missing.length > 0) {
      const missingNames = missing.map(pc => pitchClassToName(pc, false)).join(', ')
      resultEl.textContent = `⏳ 缺少：${missingNames}`
      resultEl.style.color = 'var(--text-main)'
      return
    }

    const lowestPressedMidi = pressedArray[0]
    const lowestPressedPc = lowestPressedMidi % 12

    if (lowestPressedPc !== currentTarget.bassMidi % 12) {
      const needBassName = pitchClassToName(currentTarget.bassMidi % 12, false)
      const currentBassName = pitchClassToName(lowestPressedPc, false)
      resultEl.textContent = `❌ 音对了，但最低音不对。需把 ${needBassName} 放最底`
      resultEl.style.color = 'var(--danger)'
      return
    }

    isCompleted = true
    resultEl.textContent = '✅ 完美！转位正确。'
    resultEl.style.color = 'var(--success)'
  }

  // 事件绑定
  btnNext.addEventListener('click', loadNewQuestion)

  btnSettings.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' || settingsPanel.style.display === '' ? 'block' : 'none'
  })

  btnSaveSettings.addEventListener('click', () => {
    const selectedIds = Array.from(container.querySelectorAll('.chord-cb:checked')).map(cb => cb.value)
    if (selectedIds.length === 0) {
      alert('至少需要勾选一个和弦类型！')
      return
    }
    config.chordIds = selectedIds
    localStorage.setItem('chord-invert-config', JSON.stringify(config))
    settingsPanel.style.display = 'none'
    loadNewQuestion()
  })

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