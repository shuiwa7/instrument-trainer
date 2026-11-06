import { onMidiEvent, offMidiEvent } from '../input/midiManager.js'
import { judgeChord } from '../core/judge/chordJudge.js'
import { renderPiano } from '../render/piano.js'
import { playNote, stopNote } from '../audio/engine.js'
import { generateRandomChord } from '../core/generator/chordQuestion.js'
import { CHORD_GROUPS, chordsOfGroup } from '../core/theory/chords.js'
import { midiToNoteName, pitchClassToName } from '../core/theory/pitch.js'
import { renderStaff } from '../render/staff.js'

export function mountChordConstruct(container, onBack) {
  const defaultConfig = {
    chordIds: ['major', 'minor', 'maj7', 'm7', '7', 'm7b5'], 
    roots: [0, 2, 4, 5, 7, 9, 11]
  }
  let config = JSON.parse(localStorage.getItem('chord-practice-config-v2')) || defaultConfig

  const dropdownsHtml = CHORD_GROUPS.map((group, index) => {
    const chordsInGroup = chordsOfGroup(group)
    const selectedCount = chordsInGroup.filter(({ id }) => config.chordIds.includes(id)).length
    const btnText = selectedCount > 0 ? `${group} (已选${selectedCount})` : group

    const checkboxes = chordsInGroup.map(({ id, def }) => `
      <label style="display: flex; align-items: center; gap: 4px; font-size: 14px; cursor: pointer; color: var(--text-main);">
        <input type="checkbox" class="chord-cb" value="${id}" ${config.chordIds.includes(id) ? 'checked' : ''}> 
        <span>${def.name}</span>
      </label>
    `).join('')
    
    return `
      <div class="dropdown-wrapper">
        <button class="dropdown-btn" data-index="${index}">${btnText} ▾</button>
        <div class="dropdown-menu" id="dropdown-${index}">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            ${checkboxes}
          </div>
        </div>
      </div>
    `
  }).join('')

  const rootCheckboxes = Array.from({ length: 12 }).map((_, pc) => {
    const name = pitchClassToName(pc);
    return `
      <label style="display: flex; align-items: center; gap: 4px; font-size: 14px; cursor: pointer; color: var(--text-main);">
        <input type="checkbox" class="root-cb" value="${pc}" ${config.roots.includes(pc) ? 'checked' : ''}> ${name}
      </label>
    `;
  }).join('')

  // 1. 注入 HTML 结构 (应用全新 CSS 类)
  container.innerHTML = `
    <div class="top-bar">
      <button id="back-btn" class="btn btn-secondary">← 返回主页</button>
      <button id="next-btn" class="btn btn-primary">换一题</button>
      <button id="settings-btn" class="btn btn-secondary" style="margin-left: auto;">⚙️ 题库配置</button>
    </div>

    <!-- 目标卡片和五线谱 -->
    <div class="flex-center" style="gap: 20px; margin: 30px 0; align-items: stretch;">
      <div class="target-board" style="width: 320px;">
        <div class="label">目标和弦</div>
        <div id="target-name" class="value">...</div>
      </div>
      
      <div id="staff-container" class="staff-wrapper" style="padding: 10px 20px;"></div>
    </div>

    <!-- 题库配置面板 -->
    <div id="settings-panel" class="settings-panel">
      <h3 class="section-title" style="margin-top: 0;">题库配置</h3>
      
      <div style="margin-bottom: 24px;">
        <strong style="display: block; margin-bottom: 12px; color: var(--text-main);">包含哪些和弦类型：</strong>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          ${dropdownsHtml}
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <strong style="display: block; margin-bottom: 12px; color: var(--text-main);">包含哪些根音：</strong>
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; max-width: 500px;">
          ${rootCheckboxes}
        </div>
      </div>
      
      <button id="save-settings-btn" class="btn btn-success" style="margin-top: 10px;">保存并应用</button>
    </div>

    <!-- 判定规则面板 -->
    <div class="status-bar" style="margin-bottom: 20px; padding: 12px 20px; justify-content: flex-start; gap: 40px;">
      <div>
        <strong style="color: var(--text-main); font-size: 14px;">严格度：</strong>
        <label style="color: var(--text-main);"><input type="radio" name="voicing" value="loose" checked> 宽松（核心音）</label>
        <label style="margin-left: 10px; color: var(--text-main);"><input type="radio" name="voicing" value="strict"> 严格（全音）</label>
      </div>
      <div>
        <strong style="color: var(--text-main); font-size: 14px;">多按音：</strong>
        <label style="color: var(--text-main);"><input type="radio" name="extra" value="tolerant" checked> 宽容</label>
        <label style="margin-left: 10px; color: var(--text-main);"><input type="radio" name="extra" value="strict"> 严格</label>
      </div>
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

  // 2. 获取 DOM 元素
  const btnBack = container.querySelector('#back-btn')
  const btnNext = container.querySelector('#next-btn')
  const btnSettings = container.querySelector('#settings-btn')
  const settingsPanel = container.querySelector('#settings-panel')
  const btnSaveSettings = container.querySelector('#save-settings-btn')
  const targetNameEl = container.querySelector('#target-name')
  const pressedEl = container.querySelector('#pressed-notes')
  const resultEl = container.querySelector('#judge-result')
  const pianoContainer = container.querySelector('#piano-container')

  // 3. 状态与逻辑
  let currentTarget = null
  const pressedMidis = new Set()
  let isFailed = false
  let isCompleted = false

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

  function loadNewQuestion() {
    currentTarget = generateRandomChord(config)
    targetNameEl.textContent = currentTarget.chordName
    
    const chordMidis = currentTarget.chordDef.intervals.map(i => currentTarget.rootMidi + i)
    const staffNoteNames = chordMidis.map(m => midiToNoteName(m, currentTarget.useFlats))
    renderStaff(container.querySelector('#staff-container'), staffNoteNames)
    pressedMidis.forEach(m => stopNote(midiToNoteName(m)))
    pressedMidis.clear()
    
    isFailed = false
    isCompleted = false
    updateUI()
  }

  function updateUI() {
    const pressedArray = Array.from(pressedMidis).sort((a, b) => a - b)
    pressedEl.textContent = pressedArray.length 
      ? pressedArray.map(m => midiToNoteName(m)).join(', ') 
      : '无'

    const voicingMode = container.querySelector('input[name="voicing"]:checked').value
    const extraMode = container.querySelector('input[name="extra"]:checked').value
    
    const extraMidis = new Set()
    let judge = null

    if (!isCompleted && !(extraMode === 'strict' && isFailed)) {
      judge = judgeChord(
        pressedArray, 
        currentTarget.rootMidi, 
        currentTarget.chordDef, 
        { strictVoicing: voicingMode === 'strict' }
      )
      
      pressedArray.forEach(midi => {
        if (judge.extra.includes(midi % 12)) {
          extraMidis.add(midi)
        }
      })
    }

    renderPiano(
      pianoContainer, 36, 96, pressedMidis, extraMidis,
      { onNoteOn: handleNoteOn, onNoteOff: handleNoteOff }, 
      currentTarget.useFlats
    )

    if (isCompleted) {
      resultEl.textContent = '✅ 完美！点上方按钮换一题。'
      resultEl.style.color = 'var(--success)'
      return
    }
    
    if (extraMode === 'strict' && isFailed) {
      if (pressedArray.length === 0) {
        isFailed = false
        resultEl.textContent = '已全部松开，请重新弹奏。'
        resultEl.style.color = 'var(--text-main)'
      } else {
        resultEl.textContent = '❌ 失败！按了多余的音。请松开所有琴键重试。'
        resultEl.style.color = 'var(--danger)'
      }
      return
    }

    if (pressedArray.length === 0) {
      resultEl.textContent = '等待按键…'
      resultEl.style.color = 'var(--text-muted)'
    } 
    else if (extraMode === 'strict' && judge.extra.length > 0) {
      isFailed = true
      resultEl.textContent = '❌ 失败！按了多余的音。'
      resultEl.style.color = 'var(--danger)'
    } 
    else {
      if (judge.missing.length === 0 && judge.extra.length === 0) {
        isCompleted = true 
        resultEl.textContent = '✅ 完美！你弹对了。'
        resultEl.style.color = 'var(--success)'
        return
      }

      let msg = ''
      let statusColor = 'var(--text-main)'

      if (judge.missing.length > 0) {
        const missingNames = judge.missing.map(pc => pitchClassToName(pc, currentTarget.useFlats)).join(', ')
        msg += `⏳ 缺少：${missingNames} `
      }

      if (judge.extra.length > 0) {
        const extraNames = judge.extra.map(pc => pitchClassToName(pc, currentTarget.useFlats)).join(', ')
        msg += `⚠️ 多按了：${extraNames}`
        statusColor = 'var(--warning)' 
      }

      resultEl.textContent = msg
      resultEl.style.color = statusColor
    }
  }

  // 4. 事件绑定
  btnNext.addEventListener('click', loadNewQuestion)

  btnSettings.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none'
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

  container.querySelectorAll('.chord-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      CHORD_GROUPS.forEach((group, index) => {
        const groupIds = chordsOfGroup(group).map(c => c.id)
        const checkedCount = Array.from(container.querySelectorAll('.chord-cb:checked'))
          .filter(input => groupIds.includes(input.value)).length
        
        const btn = container.querySelector(`.dropdown-btn[data-index="${index}"]`)
        if (btn) {
          const btnText = checkedCount > 0 ? `${group} (已选${checkedCount})` : group
          btn.innerHTML = `${btnText} ▾`
        }
      })
    })
  })

  btnSaveSettings.addEventListener('click', () => {
    const selectedChordIds = Array.from(container.querySelectorAll('.chord-cb:checked')).map(cb => cb.value)
    const selectedRoots = Array.from(container.querySelectorAll('.root-cb:checked')).map(cb => parseInt(cb.value))

    if (selectedChordIds.length === 0 || selectedRoots.length === 0) {
      alert('至少需要勾选一个和弦类型和一个根音！')
      return
    }

    config = { chordIds: selectedChordIds, roots: selectedRoots }
    localStorage.setItem('chord-practice-config-v2', JSON.stringify(config))
    
    settingsPanel.style.display = 'none'
    loadNewQuestion()
  })

  container.querySelectorAll('input[name="voicing"], input[name="extra"]').forEach(radio => {
    radio.addEventListener('change', updateUI)
  })

  window.addEventListener('resize', updateUI)

  const midiCallback = (e) => {
    if (e.type === 'on') handleNoteOn(e.midi)
    else handleNoteOff(e.midi)
  }
  onMidiEvent(midiCallback)

  btnBack.addEventListener('click', () => {
    offMidiEvent(midiCallback)
    window.removeEventListener('resize', updateUI)
    document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none')
    onBack()
  })

  loadNewQuestion()
}