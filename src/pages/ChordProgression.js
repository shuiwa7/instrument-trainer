import { onMidiEvent, offMidiEvent } from '../input/midiManager.js'
import { renderPiano } from '../render/piano.js'
import { playNote, stopNote } from '../audio/engine.js'
import { midiToNoteName } from '../core/theory/pitch.js'
import { judgeChord } from '../core/judge/chordJudge.js'
import { generateProgressionQuestion, PROGRESSIONS, STANDARD_KEYS } from '../core/generator/progressionQuestion.js'
import { getKeySigMap, getAccidentalType } from '../render/staff.js'

export function mountChordProgression(container, onBack) {
  const optionsHtml = PROGRESSIONS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')
  
  // ★ 直接使用标准字典生成下拉菜单，彻底告别 C# / Db 混淆
  const keyOptionsHtml = STANDARD_KEYS.map(k => 
    `<option value="${k.pc}">${k.name} 调</option>`
  ).join('')

  // ★ 改为全局 CSS 类名，下拉框包裹层用毛玻璃效果
  container.innerHTML = `
    <div class="top-bar">
      <button id="back-btn" class="btn btn-secondary">← 返回主页</button>
      
      <div style="display: flex; align-items: center; gap: 8px; background: var(--glass-bg); backdrop-filter: var(--glass-blur); padding: 4px 12px; border-radius: 10px; border: 1px solid var(--glass-border); box-shadow: var(--shadow-sm);">
        <label for="prog-select" style="font-size: 14px; color: var(--text-muted); font-weight: 600;">进行：</label>
        <select id="prog-select" style="padding: 6px 0; border: none; font-size: 14px; font-weight: 600; color: var(--primary); outline: none; background: transparent; cursor: pointer;">
          ${optionsHtml}
        </select>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; background: var(--glass-bg); backdrop-filter: var(--glass-blur); padding: 4px 12px; border-radius: 10px; border: 1px solid var(--glass-border); box-shadow: var(--shadow-sm);">
        <label for="key-select" style="font-size: 14px; color: var(--text-muted); font-weight: 600;">调式：</label>
        <select id="key-select" style="padding: 6px 0; border: none; font-size: 14px; font-weight: 600; color: var(--primary); outline: none; background: transparent; cursor: pointer;">
          ${keyOptionsHtml}
        </select>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <div id="prog-name" style="font-size: 18px; font-weight: 700; color: var(--primary); margin-bottom: 20px; letter-spacing: 1px;">
        当前：...
      </div>
      
      <!-- 和弦卡片序列 (使用毛玻璃底板) -->
      <div class="card" style="padding: 40px 20px 20px 20px; overflow-x: auto; border-radius: var(--radius-lg);">
        <div id="sequence-container" style="display: flex; align-items: stretch; width: 100%;">
        </div>
      </div>
    </div>

    <!-- 五线谱预览区域 -->
    <div style="margin-bottom: 24px; text-align: center;">
      <div class="staff-wrapper" style="display: flex; justify-content: flex-start; overflow-x: auto;">
        <div id="staff-row" style="margin: 0 auto;"></div>
      </div>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <pre id="status-msg" style="font-size: 20px; font-weight: 700; color: var(--text-main); font-family: inherit;">请弹奏高亮的和弦</pre>
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
    </div>
  `

  const btnBack = container.querySelector('#back-btn')
  const progSelect = container.querySelector('#prog-select')
  const keySelect = container.querySelector('#key-select')
  const progNameEl = container.querySelector('#prog-name')
  const sequenceContainer = container.querySelector('#sequence-container')
  const pressedEl = container.querySelector('#pressed-notes')
  const statusEl = container.querySelector('#status-msg')
  const pianoContainer = container.querySelector('#piano-container')
  const staffRow = container.querySelector('#staff-row')

  let currentQuestion = null
  let currentIndex = 0
  let isCompleted = false
  let waitForRelease = false 
  
  const pressedMidis = new Set()

  const handleNoteOn = (midi) => {
    if (isCompleted || waitForRelease) return
    pressedMidis.add(midi)
    playNote(midiToNoteName(midi))
    checkCurrentChord()
    updateUI() 
  }

  const handleNoteOff = (midi) => {
    pressedMidis.delete(midi)
    stopNote(midiToNoteName(midi))
    updateUI()

    if (waitForRelease && pressedMidis.size === 0) {
      waitForRelease = false
      currentIndex++
      if (currentIndex >= currentQuestion.chords.length) {
        isCompleted = true
        statusEl.textContent = '🎉 整个进行已完成！'
        statusEl.style.color = 'var(--success)'
        renderSequence()
      } else {
        statusEl.textContent = `请弹奏高亮的和弦`
        statusEl.style.color = 'var(--text-main)'
        renderSequence()
      }
    }
  }

  function checkCurrentChord() {
    const target = currentQuestion.chords[currentIndex]
    const pressedArray = Array.from(pressedMidis).sort((a, b) => a - b)
    if (pressedArray.length === 0) return

    const judge = judgeChord(pressedArray, target.rootMidi, target.chordDef, { strictVoicing: false })

    if (judge.status === 'correct') {
      waitForRelease = true
      statusEl.textContent = '✅ 正确，请松开琴键'
      statusEl.style.color = 'var(--success)'
      renderSequence()
    }
  }

  function loadNewQuestion() {
    const progId = progSelect.value
    const keyPc = parseInt(keySelect.value)
    
    currentQuestion = generateProgressionQuestion(progId, keyPc)
    pressedMidis.clear()
    currentIndex = 0
    isCompleted = false
    waitForRelease = false
    
    progNameEl.textContent = `${currentQuestion.keyName} 调 | 进行：${currentQuestion.romanProgression}`
    
    statusEl.textContent = '请弹奏高亮的和弦'
    statusEl.style.color = 'var(--text-main)'
    
    renderSequence()
    renderContinuousStaff()
    updateUI()
  }

  function renderSequence() {
    let html = ''
    currentQuestion.measures.forEach((measure, mIndex) => {
      // 小节容器（使用柔和的粉色边线）
      html += `
        <div style="
          display: flex; flex: 1 0 300px; min-width: 300px; 
          border-right: 2px solid var(--primary-light); box-sizing: border-box; 
          position: relative; padding-bottom: 10px;
        ">
          <div style="position: absolute; top: -25px; left: 5px; font-size: 13px; color: var(--text-muted); font-weight: 700;">小节 ${measure.num}</div>
      `

      measure.chords.forEach((c, cIndex) => {
        const globalIndex = currentQuestion.chords.indexOf(c)
        
        // ★ 全面替换为粉色主题的动态颜色
        let bgColor = 'rgba(255, 255, 255, 0.5)'
        let color = 'var(--text-main)'
        let border = '1px solid var(--glass-border)'
        let scale = 1
        let shadow = 'none'

        if (globalIndex < currentIndex || isCompleted) {
          // 已完成：柔和的薄荷绿
          bgColor = '#d1fae5'; color = '#065f46'; border = '1px solid #34d399'
        } else if (globalIndex === currentIndex) {
          // 当前高亮：粉色底、白字、粉色阴影
          bgColor = 'var(--primary)'; color = '#fff'; border = '1px solid var(--primary)'
          scale = 1.05; shadow = '0 8px 20px rgba(236, 72, 153, 0.4)'
        }

        html += `
          <div style="
            flex: ${c.beats}; background: ${bgColor}; color: ${color}; border: ${border}; 
            border-radius: 12px; margin: 10px 6px; display: flex; justify-content: center; align-items: center; 
            font-size: 22px; font-weight: 800; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            transform: scale(${scale}); box-shadow: ${shadow}; z-index: ${globalIndex === currentIndex ? 10 : 1};
            box-sizing: border-box;
          ">
            ${c.displayName}
          </div>
        `
      })
      html += `</div>`
    })
    html += `<div style="border-right: 2px solid var(--primary-light); min-width: 2px;"></div>`
    sequenceContainer.innerHTML = html
  }

  // 五线谱渲染逻辑保持不变
  function renderContinuousStaff() {
    staffRow.innerHTML = ''
    if (!window.Vex && !window.VexFlow) return
    
    const VF = window.VexFlow || window.Vex
    const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VF
    
    let totalNotes = currentQuestion.chords.length
    const width = Math.max(400, totalNotes * 120 + 100) 
    
    const renderer = new Renderer(staffRow, Renderer.Backends.SVG)
    renderer.resize(width, 180)
    const context = renderer.getContext()

    let currentX = 10
    const staveWidth = (width - 20) / currentQuestion.measures.length
    
    const keySignature = currentQuestion.keyName
    const keyMap = getKeySigMap(keySignature)

    currentQuestion.measures.forEach((measure, mIndex) => {
      const stave = new Stave(currentX, 30, staveWidth)
      
      if (mIndex === 0) {
        stave.addClef('treble')
        stave.addKeySignature(keySignature) 
      }
      
      stave.setContext(context).draw()
      currentX += staveWidth

      const staveNotes = measure.chords.map(c => {
        const parsedNotes = c.staffNoteNames.map(name => {
          const match = /^([A-G])(#|♯|b|♭)?(-?\d+)$/.exec(name)
          if (!match) return null
          const letter = match[1].toLowerCase()
          const acc = match[2]
          const octave = parseInt(match[3])
          const noteMap = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
          let midi = (octave + 1) * 12 + noteMap[letter]
          if (acc === '#' || acc === '♯') midi += 1
          if (acc === 'b' || acc === '♭') midi -= 1
          return { letter, acc, octave, midi }
        }).filter(Boolean)

        if (parsedNotes.length === 0) return new StaveNote({ keys: ['c/4'], duration: c.duration })

        let minMidi = Math.min(...parsedNotes.map(n => n.midi))
        let maxMidi = Math.max(...parsedNotes.map(n => n.midi))
        
        let bestShift = 0
        let minLines = Infinity
        const topLine = 77
        const bottomLine = 64
        
        for (let s = -3; s <= 3; s++) {
          const sMin = minMidi + s * 12
          const sMax = maxMidi + s * 12
          let lines = 0
          if (sMax > topLine) lines += sMax - topLine
          if (sMin < bottomLine) lines += bottomLine - sMin
          if (lines < minLines) {
            minLines = lines
            bestShift = s
          }
        }
        
        const octaveShift = bestShift

        parsedNotes.sort((a, b) => a.midi - b.midi)

        const keys = []
        const accidentals = []

        parsedNotes.forEach((n) => {
          let key = n.letter
          if (n.acc === '#' || n.acc === '♯') key += '#'
          else if (n.acc === 'b' || n.acc === '♭') key += 'b'
          
          const fullKey = `${key}/${n.octave + octaveShift}`
          if (!keys.includes(fullKey)) {
            keys.push(fullKey)
            
            const accType = getAccidentalType(n.letter, n.acc, keyMap)
            if (accType) {
              accidentals.push({ index: keys.length - 1, type: accType })
            }
          }
        })
        
        const staveNote = new StaveNote({ keys, duration: c.duration })
        
        accidentals.forEach(a => {
          staveNote.addModifier(new Accidental(a.type), a.index)
        })

        return staveNote
      })

      const voice = new Voice({ num_beats: 4, beat_value: 4 })
      voice.setStrict(false) 
      voice.addTickables(staveNotes)

      new Formatter().joinVoices([voice]).format([voice], staveWidth - 50)
      voice.draw(context, stave)
    })
  }

  function updateUI() {
    const pressedArray = Array.from(pressedMidis).sort((a, b) => a - b)
    pressedEl.textContent = pressedArray.length ? pressedArray.map(m => midiToNoteName(m)).join(', ') : '无'

    renderPiano(
      pianoContainer, 36, 96, pressedMidis, new Set(),
      { onNoteOn: handleNoteOn, onNoteOff: handleNoteOff }, 
      currentQuestion.useFlats
    )
  }

  progSelect.addEventListener('change', loadNewQuestion)
  keySelect.addEventListener('change', loadNewQuestion)

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