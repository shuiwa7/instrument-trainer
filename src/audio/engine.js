const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'triangle' }
}).toDestination()

synth.volume.value = -6

export async function startAudio() {
  if (Tone.context.state !== 'running') {
    await Tone.start()
    console.log('Audio engine started')
  }
}

// ★ 辅助函数：把界面显示的特殊符号转回 Tone.js 认识的符号
function toToneNote(noteName) {
  return noteName.replace('♯', '#').replace('♭', 'b')
}

export function playNote(noteName) {
  const toneNote = toToneNote(noteName)
  
  if (Tone.context.state !== 'running') {
    Tone.start().then(() => {
      synth.triggerAttack(toneNote)
    }).catch(e => console.log('等待用户交互启动音频', e))
  } else {
    synth.triggerAttack(toneNote)
  }
}

export function stopNote(noteName) {
  const toneNote = toToneNote(noteName)
  synth.triggerRelease(toneNote)
}

export function playSequence(noteNames, type = 'together') {
  if (Tone.context.state !== 'running') return
  
  if (type === 'together') {
    synth.triggerAttackRelease(noteNames.map(toToneNote), '2n')
  } else {
    const now = Tone.now()
    noteNames.forEach((note, index) => {
      synth.triggerAttackRelease(toToneNote(note), '8n', now + index * 0.6)
    })
  }
}