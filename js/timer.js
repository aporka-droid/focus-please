/* Timestamp-based engine. All timer/statistics changes persist in one record. */
window.FocusTimer = (() => {
  const key='focusplease.state.v1';
  const day = timestamp => {const d=new Date(timestamp);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};
  class Timer {
    constructor(settings, now=()=>Date.now(), storage=FocusSettings) {
      this.settings=settings;this.now=now;this.storage=storage;this.oncomplete=()=>{};
      const saved=storage.read(key);
      this.state={mode:'focus',duration:settings.focus*60000,remaining:settings.focus*60000,running:false,target:null,completed:0,stats:{date:day(now()),sessions:0,minutes:0},finished:false};
      if(saved && ['focus','short','long'].includes(saved.mode) && Number.isFinite(saved.duration) && saved.duration>=60000 && saved.duration<=10800000 && Number.isFinite(saved.remaining) && saved.remaining>=0 && saved.remaining<=saved.duration && typeof saved.running==='boolean' && (!saved.running || Number.isFinite(saved.target)) && Number.isInteger(saved.completed) && saved.completed>=0 && saved.stats && typeof saved.stats.date==='string' && Number.isFinite(saved.stats.sessions) && saved.stats.sessions>=0 && Number.isFinite(saved.stats.minutes) && saved.stats.minutes>=0) this.state=saved;
      this.state.completed=Math.min(this.state.completed,settings.cycle);
      // Recover one expired session only. Never invent completed unattended cycles.
      this.tick(true);this.save();
    }
    save(){this.storage.write(key,this.state);}
    refreshDay(){if(this.state.stats.date!==day(this.now())){this.state.stats={date:day(this.now()),sessions:0,minutes:0};return true;}return false;}
    remaining(){return this.state.running?Math.max(0,this.state.target-this.now()):this.state.remaining;}
    next(){return this.state.mode==='focus'?(this.state.completed+1>=this.settings.cycle?'long':'short'):'focus';}
    select(mode){this.state.mode=mode;this.state.duration=this.settings[mode]*60000;this.state.remaining=this.state.duration;this.state.target=null;this.state.running=false;this.state.finished=false;this.save();}
    start(){if(this.state.running)return;this.state.target=this.now()+this.state.remaining;this.state.running=true;this.state.finished=false;this.save();}
    pause(){this.tick();if(!this.state.running)return;this.state.remaining=this.remaining();this.state.running=false;this.state.target=null;this.save();}
    reset(){this.select(this.state.mode);}
    skip(){if(this.tick())return;const next=this.next();if(this.state.mode==='long'||(this.state.mode!=='focus'&&this.state.completed>=this.settings.cycle))this.state.completed=0;this.select(next);}
    tick(recovering=false){
      const changed=this.refreshDay();
      if(this.state.running && this.remaining()<=0){
        const mode=this.state.mode, ended=this.state.target, duration=this.state.duration;
        if(mode==='focus'){
          this.state.completed++;
          if(day(ended)===day(this.now())){this.state.stats.sessions++;this.state.stats.minutes+=duration/60000;}
        }
        const next=mode==='focus'?(this.state.completed>=this.settings.cycle?'long':'short'):'focus';
        if(mode==='long' || (mode!=='focus' && this.state.completed>=this.settings.cycle))this.state.completed=0;
        this.select(next);this.state.finished=true;
        if(!recovering && (next==='focus'?this.settings.autoFocus:this.settings.autoBreak))this.start();
        this.save();this.oncomplete(mode,recovering);return true;
      }
      if(changed)this.save();return false;
    }
  }
  return Timer;
})();
