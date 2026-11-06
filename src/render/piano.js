import { midiToNoteName } from '../core/theory/pitch.js'

export function renderPiano(container, startMidi, endMidi, pressedMidis, extraMidis = new Set(), callbacks = {}, useFlats = false) {
  // ★ 改为基于整个网页的宽度计算，不受下方文字长短影响
  const containerWidth = document.body.clientWidth - 42 
  const isWhite = (midi) => [0, 2, 4, 5, 7, 9, 11].includes(midi % 12)

  // ★ 只有宽度真正改变了（比如窗口拉伸）才销毁重建 DOM
  if (!container.querySelector('svg') || container.dataset.width !== String(containerWidth)) {
    container.innerHTML = ''
    container.dataset.width = String(containerWidth)

    const svgNS = "http://www.w3.org/2000/svg"
    const svg = document.createElementNS(svgNS, "svg")
    
    let whiteCount = 0
    for (let i = startMidi; i <= endMidi; i++) if (isWhite(i)) whiteCount++

    const WHITE_W = containerWidth / whiteCount
    const WHITE_H = 160
    const BLACK_W = WHITE_W * 0.6
    const BLACK_H = WHITE_H * 0.6

    svg.setAttribute('width', '100%')
    svg.setAttribute('height', WHITE_H)
    svg.style.backgroundColor = '#eee'
    svg.style.display = 'block'
    svg.style.border = '1px solid #ccc'
    svg.style.borderRadius = '4px'
    svg.style.userSelect = 'none' // 防止鼠标拖动选择文本

    let currentWhiteIndex = 0
    const whiteKeyMap = new Map()

    // 画白键
    for (let midi = startMidi; midi <= endMidi; midi++) {
      if (!isWhite(midi)) continue
      const x = currentWhiteIndex * WHITE_W
      
      const rect = document.createElementNS(svgNS, "rect")
      rect.setAttribute('x', x)
      rect.setAttribute('y', 0)
      rect.setAttribute('width', WHITE_W)
      rect.setAttribute('height', WHITE_H)
      rect.setAttribute('stroke', '#333')
      rect.dataset.midi = midi
      rect.style.cursor = 'pointer'
      svg.appendChild(rect)
      
      const text = document.createElementNS(svgNS, "text")
      text.setAttribute('x', x + WHITE_W / 2)
      text.setAttribute('y', WHITE_H - 10)
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('font-size', Math.max(10, WHITE_W * 0.25))
      text.setAttribute('font-family', 'sans-serif')
      text.dataset.midi = midi
      text.style.pointerEvents = 'none'
      svg.appendChild(text)

      whiteKeyMap.set(midi, x)
      currentWhiteIndex++
    }

    // 画黑键
    for (let midi = startMidi; midi <= endMidi; midi++) {
      if (isWhite(midi)) continue
      const prevWhite = midi - 1
      if (!whiteKeyMap.has(prevWhite)) continue
      
      const x = whiteKeyMap.get(prevWhite) + WHITE_W - (BLACK_W / 2)
      
      const rect = document.createElementNS(svgNS, "rect")
      rect.setAttribute('x', x)
      rect.setAttribute('y', 0)
      rect.setAttribute('width', BLACK_W)
      rect.setAttribute('height', BLACK_H)
      rect.setAttribute('stroke', '#333')
      rect.setAttribute('rx', '2')
      rect.dataset.midi = midi
      rect.style.cursor = 'pointer'
      svg.appendChild(rect)
    }

    container.appendChild(svg)

    // 绑定事件（只绑定一次）
    svg.addEventListener('pointerdown', (e) => {
      const rect = e.target.closest('rect')
      if (!rect) return
      e.preventDefault() // 阻止浏览器默认的拖拽动作
      
      const midi = Number(rect.dataset.midi)
      if (callbacks.onNoteOn) callbacks.onNoteOn(midi)
      
      const handleUp = () => {
        if (callbacks.onNoteOff) callbacks.onNoteOff(midi)
        window.removeEventListener('pointerup', handleUp)
        window.removeEventListener('pointercancel', handleUp)
      }
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointercancel', handleUp)
    })
  }

  // ★ 增量更新颜色和文字（每次按键走这里，绝不销毁 DOM）
  const rects = container.querySelectorAll('rect')
  rects.forEach(rect => {
    const midi = Number(rect.dataset.midi)
    const isPressed = pressedMidis.has(midi)
    const isExtra = extraMidis.has(midi)
    const white = isWhite(midi)
    
    let fill = white ? 'white' : 'black'
    if (isExtra) fill = white ? '#FF9800' : '#E65100'
    else if (isPressed) fill = white ? '#4CAF50' : '#2E7D32'
    
    rect.setAttribute('fill', fill)
  })

  const texts = container.querySelectorAll('text')
  texts.forEach(text => {
    const midi = Number(text.dataset.midi)
    const isPressed = pressedMidis.has(midi)
    const isExtra = extraMidis.has(midi)
    
    text.setAttribute('fill', (isPressed || isExtra) ? 'white' : '#555')
    text.textContent = midiToNoteName(midi, useFlats)
  })
}