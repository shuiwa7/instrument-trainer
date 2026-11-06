import { onMidiEvent, offMidiEvent } from '../input/midiManager.js'
import { renderPiano } from '../render/piano.js'
import { playNote, stopNote } from '../audio/engine.js'
import { midiToNoteName, pitchClassOf, pitchClassToName } from '../core/theory/pitch.js'
import { generateScaleRecallQuestion } from '../core/generator/scaleRecallQuestion.js'
import { renderStaffSequenceWithPlaceholders } from '../render/staff.js'
import { SCALES, SCALE_GROUPS, scalesOfGroup } from '../core/theory/scales.js'

export function mountScaleRecall(container, onBack) {
  const defaultConfig = {
    scaleIds: ['major', 'naturalMinor', 'dorian', 'mixolydian'],
    roots: [0, 2, 4, 5, 7, 9, 11]
  }
  let config = JSON.parse(localStorage.getItem('scale-recall-config')) || defaultConfig

  // 配置面板 HTML 生成
  const groupsHtml = SCALE_GROUPS.map((group, index) => {
    const items = scalesOfGroup(group)
    const selectedCount = items.filter(({ id }) => config.scaleIds.includes(id)).length
    const btnText = selectedCount > 0 ? `${group} (已选${selectedCount})` : group
    
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
      </label>
    `;
  }).join('')

  // ★ 应用粉色毛玻璃 UI 结构
  container.innerHTML = `
    <div class="top-bar">
      <button id="back-btn" class="btn btn-secondary">← 返回主页</button>
      <button id="next-btn" class="btn btn-primary">换一题</button>
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

    <!-- 目标与五线谱区 -->
    <div style="display: flex; flex-direction: column; align-items: center; margin: 30px 0 20px 0;">
      <div class="target-board" style="width: 380px; margin-bottom: 24px;">
        <div class="label">目标调式（按顺序凭记忆弹奏）</div>
        <div id="target-name" class="value" style="font-size: 42px;">...</div>
      </div>
      
      <div class="staff-wrapper" style="width: 100%;">
        <div id="staff-container"></div>
      </div>
    </div>

    <!-- 进度与反馈区 -->
    <div style="text-align: center; margin: 24px 0;">
      <div style="font-size: 20px; font-weight: 800; color: var(--text-main); margin-bottom: 12px;">
        <span id="progress-msg" style="color: var(--primary); background: var(--primary-light); padding: 4px 16px; border-radius: 12px; display: inline-block;">进度：0 / 0</span>
      </div>
      <div id="feedback-msg" style="font-size: 16px; color: var(--text-muted); font-weight: 600;">请从根音开始，按顺序弹奏上行与下行</div>
    </div>

    <!-- 键盘 -->
    <div class="piano-wrapper">
      <div id="piano-container"></div>
    </div>
  `

  const btnBack = container.querySelector('#back-btn')
  const btnNext = container.querySelector('#next-btn')
  const btnSettings = container.querySelector('#settings-btn')
  const settingsPanel = container.querySelector('#settings-panel')
  const btnSaveSettings = container.querySelector('#save-settings-btn')
  
  const targetNameEl = container.querySelector('#target-name')
  const progressMsgEl = container.querySelector('#progress-msg')
  const feedbackMsgEl = container.querySelector('#feedback-msg')
  const pianoContainer = container.querySelector('#piano-container')
  const staffContainer = container.querySelector('#staff-container')

  let currentQuestion = null
  let currentIndex = 0 // ★ 进度索引
  const pressedMidis = new Set()

  const handleNoteOn = (midi) => {
    pressedMidis.add(midi)
    playNote(midiToNoteName(midi, currentQuestion.useFlats))
    checkNote(midi)
    updateUI()
  }

  const handleNoteOff = (midi) => {
    pressedMidis.delete(midi)
    stopNote(midiToNoteName(midi, currentQuestion.useFlats))
    updateUI() // 松开后不保留绿色，纯粹显示当前按下的键
  }

  function checkNote(midi) {
    if (currentIndex >= currentQuestion.fullSequenceObj.length) return

    const targetMidi = currentQuestion.fullSequenceObj[currentIndex].midi

    if (midi === targetMidi) {
      // 弹对了，前进一格
      currentIndex++
      feedbackMsgEl.textContent = '✅ 正确，请继续'
      feedbackMsgEl.style.color = 'var(--success)'
      
      if (currentIndex >= currentQuestion.fullSequenceObj.length) {
        feedbackMsgEl.textContent = '🎉 完美！你已经完成了整个调式。'
        feedbackMsgEl.style.color = 'var(--success)'
        progressMsgEl.style.background = '#d1fae5'
        progressMsgEl.style.color = '#065f46'
      }
      
      updateStaff() 
    } else {
      // 弹错了
      feedbackMsgEl.textContent = `❌ 按错了，请继续尝试`
      feedbackMsgEl.style.color = 'var(--danger)'
    }
    
    progressMsgEl.textContent = `进度：${currentIndex} / ${currentQuestion.fullSequenceObj.length}`
  }

  function updateStaff() {
    // ★ 传入当前的 currentIndex，前面的显形，后面的留空
    renderStaffSequenceWithPlaceholders(
      staffContainer, 
      currentQuestion.fullSequenceObj, 
      currentQuestion.keySignature, 
      currentIndex
    )
  }

  function loadNewQuestion() {
    currentQuestion = generateScaleRecallQuestion(config)
    targetNameEl.textContent = currentQuestion.displayName
    
    pressedMidis.forEach(m => stopNote(midiToNoteName(m, currentQuestion.useFlats)))
    pressedMidis.clear()
    currentIndex = 0
    
    feedbackMsgEl.textContent = '请从根音开始，按顺序弹奏上行与下行'
    feedbackMsgEl.style.color = 'var(--text-muted)'
    progressMsgEl.textContent = `进度：0 / ${currentQuestion.fullSequenceObj.length}`
    progressMsgEl.style.background = 'var(--primary-light)'
    progressMsgEl.style.color = 'var(--primary)'
    
    updateStaff() 
    updateUI()
  }

  function updateUI() {
    // ★ 键盘高亮不再包含 completedPCs，只有当前真实按下的音
    const highlightSet = new Set(pressedMidis)
    
    const extraMidis = new Set()
    pressedMidis.forEach(m => {
      const pc = pitchClassOf(m)
      if (!currentQuestion.targetPcs.includes(pc)) {
        extraMidis.add(m) // 完全不属于这个音阶的音标橙
      }
    })

    renderPiano(
      pianoContainer, 36, 96, highlightSet, extraMidis,
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
    localStorage.setItem('scale-recall-config', JSON.stringify(config))
    
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