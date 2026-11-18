(() => {
  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const state = { year: Number(window.SAYURI_CONFIG.DEFAULT_YEAR), month: new Date().getMonth()===11 ? 11 : 10, workers: [], shifts: [], selectedWorkers: new Set() };
  const $ = s => document.querySelector(s);
  const pad = n => String(n).padStart(2,"0");
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  function initYear() {
    const select=$("#year-select");
    for(let y=state.year-1;y<=state.year+2;y++){ const o=document.createElement("option");o.value=y;o.textContent=y;select.appendChild(o); }
    select.value=state.year;
  }
  function changeMonth(delta) {
    state.month += delta;
    if (state.month < 10) state.month = 11;
    if (state.month > 11) state.month = 10;
    load();
  }
  async function load() {
    $("#calendar").innerHTML='<div class="loading">Cargando planificación…</div>';
    try {
      const [w,s]=await Promise.all([SayuriAPI.workers(), SayuriAPI.shifts(state.year)]);
      state.workers=w.workers||[]; state.shifts=s.shifts||[];
      $("#worker-count").textContent=state.workers.filter(x=>x.active!==false).length;
      renderWorkers(); renderCalendar();
    } catch(err) { $("#calendar").innerHTML=`<div class="empty-state">No se pudo cargar la información: ${err.message}</div>`; }
  }
  function renderWorkers(){
    const box=$("#workers-list"); box.innerHTML="";
    if(!state.workers.length){box.innerHTML='<div class="empty-state">No hay trabajadores disponibles.</div>';return;}
    state.workers.filter(w=>w.active!==false).forEach(w=>{
      const el=document.createElement("article");el.className="worker-chip";
      el.innerHTML=`<div class="avatar">${(w.name||w.username||"?").charAt(0).toUpperCase()}</div><div><strong>${esc(w.name||w.username)}</strong><small>${esc(w.role||"Sin cargo")} · ${esc(w.username||"")}</small></div>`;
      box.appendChild(el);
    });
  }
  function renderCalendar(){
    $("#month-label").textContent=monthNames[state.month];
    const cal=$("#calendar"); cal.innerHTML="";
    const first=new Date(state.year,state.month,1), last=new Date(state.year,state.month+1,0);
    const offset=(first.getDay()+6)%7;
    ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].forEach(d=>{const h=document.createElement("div");h.className="calendar-day-name";h.textContent=d;cal.appendChild(h);});
    for(let i=0;i<offset;i++) cal.appendChild(document.createElement("div"));
    for(let day=1;day<=last.getDate();day++){
      const date=`${state.year}-${pad(state.month+1)}-${pad(day)}`;
      const cell=document.createElement("article");cell.className="calendar-cell";
      const dayShifts=state.shifts.filter(s=>s.date===date);
      cell.innerHTML=`<div class="day-top"><strong>${day}</strong><button class="mini-add" data-date="${date}" title="Crear turno">+</button></div>`;
      if(dayShifts.length){
        dayShifts.forEach(s=>{
          const item=document.createElement("button");item.className=`shift-mini ${s.type}`;item.type="button";
          item.innerHTML=`<span>${s.type==="morning"?"Mañana":s.type==="afternoon"?"Tarde":"Único"}</span><strong>${esc(s.start)}–${esc(s.end)}</strong><small>${esc(s.position||"Sin cargo")} · ${(s.workerIds||[]).length} pers.</small>`;
          item.onclick=()=>openEdit(s);cell.appendChild(item);
        });
      } else cell.insertAdjacentHTML("beforeend",'<span class="empty-day">Sin turnos</span>');
      cal.appendChild(cell);
    }
    cal.querySelectorAll(".mini-add").forEach(b=>b.onclick=()=>openNew(b.dataset.date));
  }
  function renderPicker(selected=[]){
    state.selectedWorkers=new Set(selected);
    const box=$("#worker-picker");box.innerHTML="";
    state.workers.filter(w=>w.active!==false).forEach(w=>{
      const label=document.createElement("label");label.className="picker-item";
      label.innerHTML=`<input type="checkbox" value="${esc(w.id)}" ${state.selectedWorkers.has(w.id)?"checked":""}><span><strong>${esc(w.name||w.username)}</strong><small>${esc(w.role||"")}</small></span>`;
      label.querySelector("input").onchange=e=>{e.target.checked?state.selectedWorkers.add(w.id):state.selectedWorkers.delete(w.id);$("#selected-count").textContent=state.selectedWorkers.size;};
      box.appendChild(label);
    });
    $("#selected-count").textContent=state.selectedWorkers.size;
  }
  function openNew(date=iso(new Date())) {
    $("#shift-title").textContent="Crear turno"; $("#shift-form").dataset.id="";
    $("#shift-date").value=date; $("#shift-type").value="morning"; $("#shift-start").value="09:00"; $("#shift-end").value="13:00"; $("#shift-position").value="";
    $("#shift-message").textContent=""; renderPicker([]); $("#shift-modal").hidden=false;
  }
  function openEdit(s){
    $("#shift-title").textContent="Editar turno"; $("#shift-form").dataset.id=s.id;
    $("#shift-date").value=s.date; $("#shift-type").value=s.type; $("#shift-start").value=s.start; $("#shift-end").value=s.end; $("#shift-position").value=s.position||"";
    $("#shift-message").textContent=""; renderPicker(s.workerIds||[]); $("#shift-modal").hidden=false;
  }
  function close(){ $("#shift-modal").hidden=true; }
  async function save(e){
    e.preventDefault();const msg=$("#shift-message");msg.textContent="Guardando…";
    const data={id:e.target.dataset.id||"",date:$("#shift-date").value,type:$("#shift-type").value,start:$("#shift-start").value,end:$("#shift-end").value,position:$("#shift-position").value.trim(),workerIds:[...state.selectedWorkers]};
    if(data.start>=data.end){msg.textContent="El horario de término debe ser posterior al inicio.";return;}
    if(!data.workerIds.length){msg.textContent="Selecciona al menos un trabajador para formar el equipo.";return;}
    try{
      if(data.id) await SayuriAPI.updateShift(data); else await SayuriAPI.createShift(data);
      msg.textContent="Turno guardado correctamente."; await load(); setTimeout(close,500);
    }catch(err){msg.textContent=err.message;}
  }
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

  document.addEventListener("DOMContentLoaded",()=>{
    initYear(); load();
    $("#prev-month").onclick=()=>changeMonth(-1);
    $("#next-month").onclick=()=>changeMonth(1);
    $("#year-select").onchange=e=>{state.year=Number(e.target.value);load();};
    $("#new-shift").onclick=()=>openNew(); $("#close-modal").onclick=close; $("#cancel-shift").onclick=close; $("#shift-form").onsubmit=save;
    $("#shift-type").onchange=e=>{if(e.target.value==="single"){/* único sigue siendo un solo turno */}};
  });
})();
