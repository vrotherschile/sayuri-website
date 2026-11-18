(() => {
  let schedule=[]; let activeShift=null;
  const $=s=>document.querySelector(s);
  const pad=n=>String(n).padStart(2,"0");
  const toMinutes=t=>{const [h,m]=t.split(":").map(Number);return h*60+m;};
  const nowMinutes=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
  function formatDate(s){const [y,m,d]=s.split("-");return new Date(Number(y),Number(m)-1,Number(d)).toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"});}
  function tick(){const d=new Date();$("#clock").textContent=d.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit",second:"2-digit"}); updateAttendanceWindow();}
  function withinWindow(shift){
    const today=new Date(); const date=`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
    if(shift.date!==date)return false;
    const diff=nowMinutes()-toMinutes(shift.start);
    return diff>=-window.SAYURI_CONFIG.ATTENDANCE_WINDOW_MINUTES && diff<=window.SAYURI_CONFIG.ATTENDANCE_WINDOW_MINUTES;
  }
  async function updateAttendanceWindow(){
    activeShift=schedule.find(s=>withinWindow(s)&&!s.attendanceSigned);
    const btn=$("#sign-btn"),help=$("#attendance-help");
    if(!activeShift){btn.disabled=true;help.textContent="No hay un turno dentro de la ventana de firma en este momento.";return;}
    btn.disabled=false;help.textContent=`${activeShift.label||"Turno"} · ${activeShift.start}–${activeShift.end} · ${activeShift.position||"Cargo por definir"}`;
    try{const r=await SayuriAPI.attendanceStatus(activeShift.id); if(r.attendance?.signedAt){activeShift.attendanceSigned=true;btn.disabled=true;$("#sign-status").textContent=`Firmado a las ${new Date(r.attendance.signedAt).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}`;}}
    catch(err){$("#sign-status").textContent="No se pudo comprobar el estado de asistencia.";}
  }
  function render(){
    $("#schedule-count").textContent=schedule.length;const box=$("#worker-schedule");box.innerHTML="";
    if(!schedule.length){box.innerHTML='<div class="empty-state">No tienes turnos asignados.</div>';return;}
    schedule.sort((a,b)=>`${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)).forEach(s=>{
      const card=document.createElement("article");card.className="schedule-item";
      card.innerHTML=`<div class="schedule-date"><strong>${formatDate(s.date)}</strong><small>${s.type==="morning"?"Mañana":s.type==="afternoon"?"Tarde":"Turno único"}</small></div><div><h3>${esc(s.position||"Cargo no definido")}</h3><p>${esc(s.start)}–${esc(s.end)} · ${esc(s.location||"Lugar por confirmar")}</p></div><span class="schedule-status ${s.attendanceSigned?"signed":""}">${s.attendanceSigned?"Asistencia firmada":"Programado"}</span>`;
      box.appendChild(card);
    });
    const u=SayuriApp.session?.user||{};$("#profile-data").innerHTML=`<div><dt>Nombre</dt><dd>${esc(u.name||"—")}</dd></div><div><dt>Usuario</dt><dd>${esc(u.username||"—")}</dd></div><div><dt>Cargo base</dt><dd>${esc(u.roleTitle||u.role||"—")}</dd></div><div><dt>ID trabajador</dt><dd>${esc(u.id||"—")}</dd></div>`;
  }
  async function load(){
    try{const r=await SayuriAPI.workerSchedule();schedule=r.schedule||[];render();updateAttendanceWindow();}
    catch(err){$("#worker-schedule").innerHTML=`<div class="empty-state">${esc(err.message)}</div>`;}
  }
  $("#sign-btn").addEventListener("click",async()=>{
    if(!activeShift)return;const btn=$("#sign-btn"),status=$("#sign-status");btn.disabled=true;status.textContent="Registrando asistencia…";
    try{const r=await SayuriAPI.signAttendance(activeShift.id);activeShift.attendanceSigned=true;status.textContent=`Asistencia registrada a las ${new Date(r.signedAt||Date.now()).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}`;render();}
    catch(err){status.textContent=err.message;btn.disabled=false;}
  });
  document.addEventListener("DOMContentLoaded",()=>{load();tick();setInterval(tick,1000);});
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
})();
