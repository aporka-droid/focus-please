(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let settings=FocusSettings.load(),timer=new FocusTimer(settings),ambientPlaying=false,frame;
  const labels={focus:'focus',short:'short break',long:'long break'};
  const dialog=$('settings-dialog'),form=$('settings-form');
  function announce(message){$('status').textContent=message;}
  timer.oncomplete=(mode)=>{announce(mode==='focus'?'Nicely done. Take a little break.':'A fresh moment. Ready when you are.');if(settings.sound)FocusAudio.chime();};
  if(timer.state.finished)announce('Welcome back. Your session is complete.');
  let lastRender='';
  function render(){
    const s=timer.state,remaining=timer.remaining(),seconds=Math.ceil(remaining/1000),time=`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
    $('progress').style.strokeDashoffset=100*(1-remaining/s.duration);
    const renderKey=JSON.stringify([time,s.mode,s.running,s.finished,s.completed,s.stats,settings.cycle,s.duration]);
    if(renderKey===lastRender)return;lastRender=renderKey;
    $('countdown').textContent=time;$('countdown').setAttribute('aria-label',`${Math.floor(seconds/60)} minutes ${seconds%60} seconds remaining`);
    document.body.dataset.theme=s.mode==='focus'?'focus':'break';
    document.querySelector('meta[name="theme-color"]').content=s.mode==='focus'?'#233F59':'#BBD8EC';
    document.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.mode===s.mode));
    $('timer-caption').textContent=s.running?(s.mode==='focus'?'TIME TO FOCUS':'ROOM TO BREATHE'):(remaining<s.duration?'TAKE YOUR TIME':s.mode==='focus'?'TIME TO FOCUS':'ROOM TO BREATHE');
    $('timer-note').textContent=s.mode==='focus'?'One thing at a time.':'A pause is part of the process.';
    $('start-label').textContent=s.running?'Pause':remaining<s.duration?'Resume':`Start ${s.mode==='focus'?'focus':'break'}`;$('play-icon').textContent=s.running?'Ⅱ':'▶';
    const current=Math.min(settings.cycle,s.completed+(s.mode==='focus'?1:0));
    $('cycle').textContent=`Session ${Math.max(1,current)} of ${settings.cycle}`;
    $('dots').innerHTML=Array.from({length:settings.cycle},(_,i)=>`<i class="${i<s.completed?'done':i===s.completed&&s.mode==='focus'?'current':''}"></i>`).join('');
    $('next').textContent=`Up next: ${labels[timer.next()]}`;
    $('stats').textContent=s.stats.sessions?`${s.stats.sessions} focus session${s.stats.sessions===1?'':'s'} completed today · ${s.stats.minutes} minutes well spent`:'A fresh start. Make a little room for focus.';
    document.title=s.running?`${time} — Focus Please`:s.finished?'Session complete — Focus Please':remaining<s.duration?'Paused — Focus Please':'Focus Please — A little time for what matters.';
  }
  // Animation runs only while visible. Timestamp reconciliation handles throttling/sleep.
  let lastPaint=0;
  function loop(timestamp){if(timestamp-lastPaint>=100){timer.tick();render();lastPaint=timestamp;}frame=requestAnimationFrame(loop);}
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);if(!document.hidden){timer.tick();render();frame=requestAnimationFrame(loop);}});
  async function interactAudio(){await FocusAudio.unlock();if(settings.ambient&&!ambientPlaying){ambientPlaying=await FocusAudio.ambient(true);renderAmbient();}}
  function toggle(){interactAudio();timer.tick();if(timer.state.running){timer.pause();announce('Paused. Take your time.');}else{timer.start();announce(`${labels[timer.state.mode]} session started.`);}render();}
  $('start').addEventListener('click',toggle);
  $('reset').addEventListener('click',()=>{timer.reset();announce('A clean slate. Timer reset.');render();});
  $('skip').addEventListener('click',()=>{timer.skip();announce('Moved to the next session. Skipped time is not counted.');render();});
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{if(timer.state.mode!==button.dataset.mode){timer.select(button.dataset.mode);announce(`${labels[timer.state.mode]} ready.`);render();}}));
  $('settings-open').addEventListener('click',()=>{for(const [key,value]of Object.entries(settings)){const input=form.elements.namedItem(key);if(input.type==='checkbox')input.checked=value;else input.value=value;}dialog.showModal();});
  $('settings-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;const next={};for(const key of Object.keys(settings)){const input=form.elements.namedItem(key);next[key]=input.type==='checkbox'?input.checked:Number(input.value);}settings=FocusSettings.validate(next);FocusSettings.save(settings);timer.settings=settings;timer.state.completed=Math.min(timer.state.completed,settings.cycle);timer.save();dialog.close();ambientPlaying=settings.ambient?await FocusAudio.ambient(true):(await FocusAudio.ambient(false),false);renderAmbient();announce(FocusSettings.available?'Your rhythm, saved.':'Preferences applied. Browser storage is unavailable; changes may not survive a reload.');render();});
  function renderAmbient(){$('ambient-toggle').setAttribute('aria-pressed',ambientPlaying);$('ambient-label').textContent=ambientPlaying?'Ambient on':settings.ambient?'Enable ambient':'Ambient off';}
  $('ambient-toggle').addEventListener('click',async()=>{settings.ambient=!ambientPlaying;ambientPlaying=settings.ambient?await FocusAudio.ambient(true):(await FocusAudio.ambient(false),false);FocusSettings.save(settings);renderAmbient();if(settings.ambient&&!ambientPlaying)announce('Audio is unavailable in this browser.');});
  async function focusView(enabled){document.body.classList.toggle('focus-view',enabled);$('fullscreen').setAttribute('aria-pressed',enabled);if(enabled){$('exit-focus').focus();try{if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{/* Layout-only fallback. */}}else{try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}$('fullscreen').focus();}}
  $('fullscreen').addEventListener('click',()=>focusView(true));$('exit-focus').addEventListener('click',()=>focusView(false));
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('focus-view'))focusView(false);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dialog.open){focusView(false);return;}if(dialog.open||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,select,button,a,[contenteditable="true"]'))return;if(event.code==='Space'){event.preventDefault();toggle();}else if(event.key.toLowerCase()==='r'){$('reset').click();}});
  // Adopt other tabs' committed state without writing it back (no storage-event loop).
  window.addEventListener('storage',event=>{if(event.key==='focusplease.state.v1'&&event.newValue){try{const saved=JSON.parse(event.newValue);if(saved&&['focus','short','long'].includes(saved.mode)&&saved.stats&&Number.isFinite(saved.duration)){timer.state=saved;render();}}catch{}}});
  renderAmbient();render();frame=requestAnimationFrame(loop);
})();
