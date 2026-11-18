(() => {
  let rows=[];
  const $=s=>document.querySelector(s);
  function normalize(row){return {username:String(row.username||row.Usuario||"").trim(),password:String(row.password||row.Contraseña||"").trim(),name:String(row.name||row.Nombre||"").trim(),roleTitle:String(row.roleTitle||row.Cargo||"").trim(),phone:String(row.phone||row.Telefono||"").trim(),email:String(row.email||row.Email||"").trim(),active:row.active===false?false:true};}
  function render(){
    const box=$("#preview"); if(!rows.length){box.innerHTML="";$("#import-btn").disabled=true;return;}
    const cols=["username","name","roleTitle","phone","email","password"];box.innerHTML=`<table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(c==="password"?"••••••":r[c]||"")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    $("#import-btn").disabled=rows.some(r=>!r.username||!r.password||!r.name);
  }
  $("#worker-file").addEventListener("change",async e=>{
    const file=e.target.files[0];if(!file)return;$("#import-message").textContent="Leyendo archivo…";
    try{
      if(!window.XLSX)throw new Error("No se cargó el lector Excel. Revisa tu conexión.");
      const data=await file.arrayBuffer();const wb=XLSX.read(data,{type:"array"});const ws=wb.Sheets[wb.SheetNames[0]];
      rows=XLSX.utils.sheet_to_json(ws,{defval:""}).map(normalize);render();$("#import-message").textContent=`${rows.length} registros listos para importar.`;
    }catch(err){rows=[];render();$("#import-message").textContent=err.message;}
  });
  $("#import-btn").addEventListener("click",async()=>{
    const msg=$("#import-message");msg.textContent="Enviando trabajadores a la API…";$("#import-btn").disabled=true;
    try{const r=await SayuriAPI.importWorkers(rows);msg.textContent=`Importación completada. ${r.imported??rows.length} trabajadores procesados.`;rows=[];render();}
    catch(err){msg.textContent=err.message;$("#import-btn").disabled=false;}
  });
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
})();
