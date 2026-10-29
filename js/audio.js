window.FocusAudio = (() => {
  let context,ambientSource,ambientGain;
  async function unlock(){try {context ||= new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')await context.resume();return context.state==='running';}catch{return false;}}
  function chime(){if(!context || context.state!=='running')return;[523.25,659.25,783.99].forEach((frequency,i)=>{const osc=context.createOscillator(),gain=context.createGain(),t=context.currentTime+i*.16;osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.09,t+.025);gain.gain.exponentialRampToValueAtTime(.001,t+1.2);osc.connect(gain).connect(context.destination);osc.start(t);osc.stop(t+1.3);});}
  async function ambient(enabled){
    if(!enabled){if(ambientSource){ambientSource.stop();ambientSource.disconnect();ambientSource=null;ambientGain.disconnect();}return true;}
    if(!await unlock())return false;if(ambientSource)return true;
    const buffer=context.createBuffer(1,context.sampleRate*4,context.sampleRate),data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*3.5;}
    ambientSource=context.createBufferSource();ambientSource.buffer=buffer;ambientSource.loop=true;ambientGain=context.createGain();ambientGain.gain.value=.12;ambientSource.connect(ambientGain).connect(context.destination);ambientSource.start();return true;
  }
  return {unlock,chime,ambient};
})();
