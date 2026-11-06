import { connectDevice, getMidiStatus } from '../input/midiManager.js'

export function mountKeyboardMenu(container, onNavigate) {
  const isConnected = getMidiStatus()
  
  container.innerHTML = `
    <div class="top-bar">
      <button id="back-btn" class="btn btn-secondary">← 返回主页</button>
      <button id="connect-btn" class="btn ${isConnected ? 'btn-success' : 'btn-primary'}" ${isConnected ? 'disabled' : ''}>
        ${isConnected ? '✅ MIDI 已连接' : '🔌 连接 MIDI 设备'}
      </button>
    </div>
    
    <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">🎹 键盘练习</h1>
    
    <h2 style="font-size: 18px; color: var(--text-muted); border-bottom: 2px solid var(--border-color); padding-bottom: 8px; margin-bottom: 20px;">和弦练习</h2>
    <div class="menu-grid">
      <div id="card-construct" class="menu-card">
        <h3>和弦构造</h3>
        <p>给和弦名，按对为止</p>
      </div>
      <div id="card-invert" class="menu-card">
        <h3>和弦转位</h3>
        <p>指定转位，考查最低音</p>
      </div>
      <div id="card-identify" class="menu-card">
        <h3>和弦识别</h3>
        <p>随便按，系统报名字</p>
      </div>
      <div id="card-progression" class="menu-card">
        <h3>和弦进行</h3>
        <p>跟随谱面弹奏连接</p>
      </div>
    </div>

    <h2 style="font-size: 18px; color: var(--text-muted); border-bottom: 2px solid var(--border-color); padding-bottom: 8px; margin-top: 40px; margin-bottom: 20px;">音阶练习</h2>
    <div class="menu-grid">
      <div id="card-scale-sequential" class="menu-card">
        <h3>顺序跟弹</h3>
        <p>按音阶顺序弹，同步高亮</p>
      </div>
      <div id="card-scale-recall" class="menu-card">
        <h3>调式全音展示</h3>
        <p>只给调式名，凭记忆弹全音</p>
      </div>
      <div id="card-scale-random" class="menu-card">
        <h3>随机抽音</h3>
        <p>音阶内随机亮音，用户弹出</p>
      </div>
      <div id="card-scale-fill" class="menu-card">
        <h3>补缺音</h3>
        <p>给出缺一个音的音阶，要求补全</p>
      </div>
      <div id="card-scale-blind" class="menu-card">
        <h3>盲弹定位</h3>
        <p>报音名盲按；盲按三度/五度</p>
      </div>
    </div>

    <h2 style="font-size: 18px; color: var(--text-muted); border-bottom: 2px solid var(--border-color); padding-bottom: 8px; margin-top: 40px; margin-bottom: 20px;">听辨与听力</h2>
    <div class="menu-grid">
      <div id="card-ear-single" class="menu-card">
        <h3>单音听辨</h3>
        <p>听单音并在键盘复现</p>
      </div>
      <div id="card-ear-interval" class="menu-card">
        <h3>音程听辨</h3>
        <p>听两个音并复现</p>
      </div>
      <div id="card-ear-chord" class="menu-card">
        <h3>和弦听辨</h3>
        <p>听和弦并复现</p>
      </div>
      <div id="card-ear-scale" class="menu-card">
        <h3>音阶听辨</h3>
        <p>听完整音阶并顺序复现</p>
      </div>
    </div>
  `

  const btnConnect = container.querySelector('#connect-btn')
  
  btnConnect.addEventListener('click', async () => {
    btnConnect.textContent = '连接中...'
    const success = await connectDevice()
    if (success) {
      btnConnect.textContent = '✅ MIDI 已连接'
      btnConnect.className = 'btn btn-success'
      btnConnect.disabled = true
    } else {
      btnConnect.textContent = '🔌 连接 MIDI 设备'
      btnConnect.className = 'btn btn-primary'
    }
  })

  container.querySelector('#back-btn').addEventListener('click', () => onNavigate('home'))
  
  container.querySelector('#card-construct').addEventListener('click', () => onNavigate('chord-construct'))
  container.querySelector('#card-invert').addEventListener('click', () => onNavigate('chord-invert'))
  container.querySelector('#card-identify').addEventListener('click', () => onNavigate('chord-identify'))
  container.querySelector('#card-progression').addEventListener('click', () => onNavigate('chord-progression'))
  
  container.querySelector('#card-scale-sequential').addEventListener('click', () => onNavigate('scale-sequential'))
  container.querySelector('#card-scale-recall').addEventListener('click', () => onNavigate('scale-recall'))
  container.querySelector('#card-scale-random').addEventListener('click', () => onNavigate('scale-random'))
  container.querySelector('#card-scale-fill').addEventListener('click', () => onNavigate('scale-fill'))
  container.querySelector('#card-scale-blind').addEventListener('click', () => onNavigate('scale-blind'))
  
  container.querySelector('#card-ear-single').addEventListener('click', () => onNavigate('ear-single'))
  container.querySelector('#card-ear-interval').addEventListener('click', () => onNavigate('ear-interval'))
  container.querySelector('#card-ear-chord').addEventListener('click', () => onNavigate('ear-chord'))
  container.querySelector('#card-ear-scale').addEventListener('click', () => onNavigate('ear-scale'))
}