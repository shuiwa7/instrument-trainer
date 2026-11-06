import { onMidiEvent, offMidiEvent } from '../input/midiManager.js'
import { renderPiano } from '../render/piano.js'
import { playNote, stopNote } from '../audio/engine.js'
import { midiToNoteName, pitchClassToName } from '../core/theory/pitch.js'
import { generateScaleSequentialQuestion } from '../core/generator/scaleSequentialQuestion.js'
import { renderStaffSequence } from '../render/staff.js'
import { SCALES, SCALE_GROUPS, scalesOfGroup } from '../core/theory/scales.js'

export function mountScaleSequential(container, onBack) {
  const defaultConfig = {
    scaleIds: ['major', 'naturalMinor', 'dorian', 'mixolydian', 'majorPentatonic'],
    roots: [0, 2, 4, 5, 7, 9, 11]
  }
  let config = JSON.parse(localStorage.getItem('scale-sequential-config')) || defaultConfig

  const groupsHtml = SCALE_GROUPS.map((group, index) => {
    const items = scalesOfGroup(group)
    const selectedCount = items.filter(({ id }) => config.scaleIds.includes(id)).length
    const btnText = selectedCount > 0 ? `${group} (已选${selectedCount})` : group
    
    // 复选框文字颜色适配深色
    const checkboxes = items.map(({ id, def }) => `
      <label style="display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; color: var(--text-main);">
        <input type="checkbox" class="scale-cb" value="${id}" ${config.scaleIds.includes(id) ? 'checked' : ''} style="accent-color: var(--primary);"> 
        <span>${def.name}</span>
      </label>
    `).join('')
    
    return `
      <div class="dropdown-wrapper">
        <button class="dropdown-btn" data-index="${index}">${btnText} ▾</button>
        <div class="dropdown-menu" id="dropdown-${index}">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">${checkboxes}</div>
        </div>
      </div>
    `
  }).join('')

  const rootCheckboxes = Array.from({ length: 12 }).map((_, pc) => {
    const useFlats = [3, 5, 8, 10].includes(pc)
    const name = pitchClassToName(pc, useFlats)
    return `
      <label style="display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; color: var(--text-main);">
        <input type="checkbox" class="root-cb" value="${pc}" ${config.roots.includes(pc) ? 'checked' : ''} style="accent-color: var(--primary);"> ${name}
      </label>`;
  }).join('')

  // ★ 全面替换为毛玻璃 UI 结构
  container.innerHTML = `
    <div class="top-bar">
      <button id="back-btn" class="btn btn-secondary">← 返回主页</button>
      <button id="next-btn" class="btn btn-primary">换一题</button>
      
      <!-- 移调循环开关（毛玻璃胶囊） -->
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--glass-bg); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); padding: 8px 16px; border-radius: 12px; border: 1px solid var(--glass-border); font-size: 14px; font-weight: 600; color: var(--primary); box-shadow: var(--shadow-sm); margin-left: 10px; transition: var(--transition);">
        <input type="checkbox" id="transpose-toggle" style="accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer;"> 🔄 循环移调
      </label>

      <button id="settings-btn" class="btn btn-secondary" style="margin-left: auto;">⚙️ 题库配置</button>
    </div>

    <!-- 配置面板 -->
    <div id="settings-panel" class="settings-panel">
      <h3 class="section-title" style="margin-top: 0;">音阶题库配置</h3>
      <div style="margin-bottom: 24px;">
        <strong style="display: block; margin-bottom: 12px; color: var(--text-main);">包含哪些音阶类型：</strong>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">${groupsHtml}</div>
      </div>
      <div style="margin-bottom: 20px;">
        <strong style="display: block; margin-bottom: 12px; color: var(--text-main);">包含哪些主音：</strong>
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; max-width: 500px;">${rootCheckboxes}</div>
      </div>
      <button id="save-settings-btn" class="btn btn-success">保存并应用</button>
    </div>

    <!-- 目标卡片与五线谱 -->
    <div style="display: flex; flex-direction: column; align-items: center; margin: 30px 0 20px 0;">
      <div class="target-board" style="width: 340px; margin-bottom: 24px;">
        <div class="label">目标音阶</div>
        <div id="target-name" class="value" style="font-size: 48px;">...</div>
      </div>
      
      <div class="staff-wrapper" style="width: 100%;">
        <div id="staff-container"></div>
      </div>
    </div>

    <!-- 提示与进度 -->
    <div style="text-align: center; margin: 24px 0;">
      <div style="font-size: 24px; font-weight: 800; color: var(--text-main); margin-bottom: 12px;">
        当前请弹：<span id="current-note" style="color: var(--primary); background: var(--primary-light); padding: 4px 16px; border-radius: 12px; display: inline-block;">...</span>
      </div>
      <div id="progress-msg" style="font-size: 16px; color: var(--text-muted); font-weight: 600;">进度：0 / 0</div>
    </div>

    <!-- 键盘 -->
    <div class="piano-wrapper">
      <div id="piano-container"></div>
    </div>
  `

  const btnBack = container.querySelector('#back-btn')
  const btnNext = container.querySelector('#next-btn')
  const btnSettings = container.querySelector('#settings-btn')
  const transposeToggle = container.querySelector('#transpose-toggle')
  const settingsPanel = container.querySelector('#settings-panel')
  const btnSaveSettings = container.querySelector('#save-settings-btn')
  
  const targetNameEl = container.querySelector('#target-name')
  const currentNoteEl = container.querySelector('#current-note')
  const progressMsgEl = container.querySelector('#progress-msg')
  const pianoContainer = container.querySelector('#piano-container')
  const staffContainer = container.querySelector('#staff-container')

  let currentQuestion = null
  let currentIndex = 0
  const pressedMidis = new Set()

  const handleNoteOn = (midi) => {
    pressedMidis.add(midi)
    playNote(midiToNoteName(midi, currentQuestion.useFlats))
    checkCurrentNote()
    updateUI()
  }

  const handleNoteOff = (midi) => {
    pressedMidis.delete(midi)
    stopNote(midiToNoteName(midi, currentQuestion.useFlats))
    updateUI() 
  }

  function checkCurrentNote() {
    if (currentIndex >= currentQuestion.sequence.length) return
    const targetMidi = currentQuestion.sequence[currentIndex]
    
    if (pressedMidis.has(targetMidi)) {
      currentIndex++
      if (currentIndex >= currentQuestion.sequence.length) {
        currentNoteEl.textContent = '🎉 完美！'
        currentNoteEl.style.color = 'var(--success)'
        currentNoteEl.style.background = '#d1fae5'
        
        if (transposeToggle.checked) {
          setTimeout(() => {
            const nextRootPc = (currentQuestion.rootPc + 1) % 12
            loadNewQuestion({ forceRootPc: nextRootPc, forceScaleId: currentQuestion.scaleId })
          }, 1000)
        }
      } else {
        updatePrompt()
      }
    }
  }

  function updatePrompt() {
    if (currentIndex >= currentQuestion.sequence.length) return
    const targetMidi = currentQuestion.sequence[currentIndex]
    currentNoteEl.textContent = midiToNoteName(targetMidi, currentQuestion.useFlats)
    currentNoteEl.style.color = 'var(--primary)'
    currentNoteEl.style.background = 'var(--primary-light)'
    progressMsgEl.textContent = `进度：${currentIndex} / ${currentQuestion.sequence.length}`
  }

  function loadNewQuestion(options = {}) {
    const finalConfig = { ...config, ...options }
    currentQuestion = generateScaleSequentialQuestion(finalConfig)
    
    targetNameEl.textContent = currentQuestion.displayName
    renderStaffSequence(staffContainer, currentQuestion.staffNoteNames, currentQuestion.keySignature)
    
    pressedMidis.forEach(m => stopNote(midiToNoteName(m, currentQuestion.useFlats)))
    pressedMidis.clear()
    currentIndex = 0
    
    updatePrompt()
    updateUI()
  }

  function updateUI() {
    const highlightSet = new Set(pressedMidis)
    renderPiano(
      pianoContainer, 36, 96, highlightSet, new Set(),
      { onNoteOn: handleNoteOn, onNoteOff: handleNoteOff }, 
      currentQuestion.useFlats
    )
  }

  // --- 配置面板交互 ---
  btnSettings.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' || settingsPanel.style.display === '' ? 'block' : 'none'
  })

  const dropdownBtns = container.querySelectorAll('.dropdown-btn')
  const dropdownMenus = container.querySelectorAll('.dropdown-menu')

  dropdownBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const menu = btn.nextElementSibling
      dropdownMenus.forEach(m => { if (m !== menu) m.style.display = 'none' })
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none'
    })
  })

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-wrapper')) {
      dropdownMenus.forEach(m => m.style.display = 'none')
    }
  })

  container.querySelectorAll('.scale-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      SCALE_GROUPS.forEach((group, index) => {
        const groupIds = scalesOfGroup(group).map(c => c.id)
        const checkedCount = Array.from(container.querySelectorAll('.scale-cb:checked'))
          .filter(input => groupIds.includes(input.value)).length
        const btn = container.querySelector(`.dropdown-btn[data-index="${index}"]`)
        if (btn) {
          btn.innerHTML = `${checkedCount > 0 ? `${group} (已选${checkedCount})` : group} ▾`
        }
      })
    })
  })

  btnSaveSettings.addEventListener('click', () => {
    const selectedScaleIds = Array.from(container.querySelectorAll('.scale-cb:checked')).map(cb => cb.value)
    const selectedRoots = Array.from(container.querySelectorAll('.root-cb:checked')).map(cb => parseInt(cb.value))

    if (selectedScaleIds.length === 0 || selectedRoots.length === 0) {
      alert('至少需要勾选一个音阶类型和一个主音！')
      return
    }

    config = { scaleIds: selectedScaleIds, roots: selectedRoots }
    localStorage.setItem('scale-sequential-config', JSON.stringify(config))
    
    settingsPanel.style.display = 'none'
    loadNewQuestion()
  })

  btnNext.addEventListener('click', () => loadNewQuestion())

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