export function mountHome(container, onNavigate) {
  container.innerHTML = `
    <h1 style="font-size: 32px; font-weight: 800; margin-bottom: 8px;">🎹 乐器练习器</h1>
    <p style="color: var(--text-muted); margin-bottom: 40px;">提升你的 MIDI 输入与视唱练耳能力</p>
    
    <div class="menu-grid">
      <div id="card-keyboard" class="menu-card">
        <h3>🎹 键盘练习</h3>
        <p>和弦、音阶、听辨综合训练</p>
      </div>
      
      <div class="menu-card disabled">
        <h3>🎸 吉他练习</h3>
        <p>即将在 v0.2 推出</p>
      </div>
    </div>
  `

  container.querySelector('#card-keyboard').addEventListener('click', () => {
    onNavigate('keyboard')
  })
}