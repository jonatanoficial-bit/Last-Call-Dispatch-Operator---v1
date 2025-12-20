import { CITY_NOVA_AURORA, PHASE2_CALLS } from './contentFallback.js';

export async function loadCity(cityId){
  try{
    const res = await fetch(`data/cities/${cityId}.json`, { cache:'no-store' });
    if (!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  }catch(e){
    console.warn('[content] fetch city failed, fallback:', e);
    if (cityId !== 'nova_aurora') throw e;
    return CITY_NOVA_AURORA;
  }
}

export async function loadCalls(){
  try{
    const res = await fetch('data/calls/phase2_calls.json', { cache:'no-store' });
    if (!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  }catch(e){
    console.warn('[content] fetch calls failed, fallback:', e);
    return PHASE2_CALLS;
  }
}
