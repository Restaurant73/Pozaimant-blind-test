
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

let state = {
  roomCode: '',
  manche: 1,
  parties: 0,
  timer: { minutes: 30, seconds: 0, running: false },
  buzzList: [],
  players: {},
  final: false,
  finMancheText: '',
  dates: ['Date 1 - à compléter','Date 2 - à compléter','Date 3 - à compléter','Date 4 - à compléter']
};
let lastTick = Date.now();
function tickServer(){
  if(state.timer.running){
    let now = Date.now();
    let diff = Math.floor((now - lastTick)/1000);
    if(diff>0){
      lastTick = now;
      let total = state.timer.minutes*60 + state.timer.seconds - diff;
      if(total<=0){ state.timer.minutes=0; state.timer.seconds=0; state.timer.running=false; }
      else { state.timer.minutes=Math.floor(total/60); state.timer.seconds=total%60; }
    }
  } else { lastTick = Date.now(); }
}
setInterval(tickServer, 500);
// cleanup players not seen for 60s
setInterval(()=>{ let now=Date.now(); for(let k in state.players){ if(now-state.players[k]>60000) delete state.players[k]; } }, 5000);

app.get('/api/state', (req,res)=>{ tickServer(); res.json(state); });
app.post('/api/join', (req,res)=>{ let p=(req.body.pseudo||'Joueur').trim().slice(0,20)||'Joueur'; state.players[p]=Date.now(); res.json(state); });
app.post('/api/buzz', (req,res)=>{ let p=(req.body.pseudo||'Joueur').trim().slice(0,20)||'Joueur'; state.players[p]=Date.now(); if(!state.final && state.buzzList.length<3 && !state.buzzList.includes(p)) state.buzzList.push(p); res.json(state); });
app.post('/api/host', (req,res)=>{
  let b=req.body||{};
  if(b.action==='setRoom' && typeof b.code==='string' && b.code.length===4){ state.roomCode=b.code.toUpperCase(); state.final=false; }
  if(b.action==='timerStart'){ state.timer.running=true; lastTick=Date.now(); }
  if(b.action==='timerPause'){ tickServer(); state.timer.running=false; }
  if(b.action==='timerReset'){ state.timer={minutes:30,seconds:0,running:false}; }
  if(b.action==='timerChange' && typeof b.delta==='number'){ let t=Math.max(10, state.timer.minutes+b.delta); state.timer.minutes=t; state.timer.seconds=0; }
  if(b.action==='nextManche'){ state.manche++; state.parties++; state.buzzList=[]; }
  if(b.action==='resetManches'){ state.manche=1; state.parties=0; state.buzzList=[]; }
  if(b.action==='resetBuzz'){ state.buzzList=[]; }
  if(b.action==='finishManche'){ state.finMancheText='Fin de la '+ (state.manche===1?'première':state.manche+'ème') +' manche'; state.manche++; state.parties++; state.buzzList=[]; }
  if(b.action==='finishGame'){ state.final=true; }
  if(b.action==='newEvening'){ state.manche=1; state.parties=0; state.buzzList=[]; state.final=false; state.finMancheText=''; state.timer={minutes:30,seconds:0,running:false}; }
  if(b.action==='setDates' && Array.isArray(b.dates) && b.dates.length===4){ state.dates=b.dates; }
  res.json(state);
});
app.get('/animatrice.html', (req,res)=>{ res.sendFile(path.join(__dirname,'animatrice.html')); });
const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('PozAimant V2.1 server on '+PORT));
