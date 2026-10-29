/* Shared storage and validated preferences. No network dependencies. */
window.FocusSettings = (() => {
  const defaults = { focus:25, short:5, long:15, cycle:4, autoBreak:false, autoFocus:false, sound:true, ambient:false };
  const limits = {focus:180,short:60,long:120,cycle:12};
  let available = true;
  function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
  function write(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); available=true; } catch { available=false; } }
  function validate(value={}) {
    const result={...defaults};
    for(const key in limits) if(Number.isInteger(value[key]) && value[key]>=1 && value[key]<=limits[key]) result[key]=value[key];
    for(const key of ['autoBreak','autoFocus','sound','ambient']) if(typeof value[key]==='boolean') result[key]=value[key];
    return result;
  }
  return {read,write,validate,defaults,load:()=>validate(read('focusplease.settings')||{}),save:value=>write('focusplease.settings',validate(value)),get available(){return available;}};
})();
