window.addEventListener("error",e=>{
  const box=document.getElementById("fatalError");
  box.textContent="App error: "+e.message;
  box.classList.remove("hidden");
});

(async function(){
const $=id=>document.getElementById(id);
const cfg=window.ARHS_CONFIG||{};
const configured=!!(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes("PASTE_"));
if(!configured){
  $("loginMessage").textContent="config.js is not connected yet.";
  $("statusText").textContent="Supabase keys missing.";
  return;
}
const sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n)||0);
let data={leads:[],jobs:[],estimates:[],invoices:[]};
let type="lead";

async function showSession(session){
  $("loginScreen").classList.toggle("hidden",!!session);
  $("appShell").classList.toggle("hidden",!session);
  if(session){$("statusText").textContent="Signed in and connected to Supabase.";await load();}
}
const {data:{session}}=await sb.auth.getSession();
await showSession(session);
sb.auth.onAuthStateChange((_e,s)=>showSession(s));

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  $("loginMessage").textContent="Sending...";
  const {error}=await sb.auth.signInWithOtp({
    email:$("loginEmail").value.trim(),
    options:{emailRedirectTo:location.origin+location.pathname}
  });
  $("loginMessage").textContent=error?error.message:"Check your email for the sign-in link.";
});
$("logoutBtn").onclick=()=>sb.auth.signOut();

document.querySelectorAll("[data-view]").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll("[data-view]").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  $(`view-${btn.dataset.view}`).classList.add("active");
});

async function load(){
  for(const table of Object.keys(data)){
    const res=await sb.from(table).select("*").order("created_at",{ascending:false});
    if(res.error) throw res.error;
    data[table]=res.data||[];
  }
  render();
}
function render(){
  $("mNew").textContent=data.leads.filter(x=>x.status==="New").length;
  $("mEstimates").textContent=data.estimates.filter(x=>!["Approved","Declined"].includes(x.status)).length;
  $("mJobs").textContent=data.jobs.length;
  $("mOutstanding").textContent=money(data.invoices.reduce((a,x)=>a+Number(x.balance||0),0));
  $("leadList").innerHTML=data.leads.map(x=>`<div class="row"><b>${x.name}</b><span>${x.status}</span><strong>${money(x.estimated_value)}</strong></div>`).join("");
  $("jobList").innerHTML=data.jobs.map(x=>`<div class="row"><b>${x.customer_name}</b><span>${x.status}</span><strong>${money(x.value)}</strong></div>`).join("");
  $("estimateList").innerHTML=data.estimates.map(x=>`<div class="row"><b>${x.customer_name}</b><span>${x.status}</span><strong>${money(x.amount)}</strong></div>`).join("");
  $("invoiceList").innerHTML=data.invoices.map(x=>`<div class="row"><b>${x.customer_name}</b><span>${x.status}</span><strong>${money(x.balance)}</strong></div>`).join("");
}
function openDialog(kind){
  type=kind;
  $("dialogTitle").textContent="Add "+kind;
  const schemas={
    lead:[["name","Name"],["phone","Phone"],["city","City"],["service","Service"],["estimated_value","Estimated value","number"]],
    job:[["customer_name","Customer"],["job_date","Date","date"],["job_time","Time"],["service","Service"],["value","Value","number"]],
    estimate:[["customer_name","Customer"],["estimate_number","Estimate number"],["service","Service"],["amount","Amount","number"]],
    invoice:[["customer_name","Customer"],["invoice_number","Invoice number"],["service","Service"],["amount","Amount","number"],["balance","Balance","number"]]
  };
  $("fields").innerHTML=schemas[kind].map(([k,l,t])=>`<label>${l}<input id="f-${k}" type="${t||"text"}"></label>`).join("");
  $("dialog").showModal();
}
$("addLeadBtn").onclick=()=>openDialog("lead");
$("addJobBtn").onclick=()=>openDialog("job");
$("addEstimateBtn").onclick=()=>openDialog("estimate");
$("addInvoiceBtn").onclick=()=>openDialog("invoice");
$("cancelBtn").onclick=()=>$("dialog").close();

$("form").onsubmit=async e=>{
  e.preventDefault();
  const fields=[...$("fields").querySelectorAll("input")];
  const payload={};
  fields.forEach(i=>payload[i.id.replace("f-","")]=i.type==="number"?Number(i.value)||0:i.value.trim());
  if(type==="lead")Object.assign(payload,{status:"New",source:"Manual"});
  if(type==="job")Object.assign(payload,{status:"Tentative"});
  if(type==="estimate")Object.assign(payload,{status:"Draft"});
  if(type==="invoice")Object.assign(payload,{status:"Draft"});
  const table={lead:"leads",job:"jobs",estimate:"estimates",invoice:"invoices"}[type];
  const {error}=await sb.from(table).insert(payload);
  if(error){$("formError").textContent=error.message;return;}
  $("dialog").close();
  await load();
};

// Remove old service workers and caches so stale versions stop loading.
if("serviceWorker" in navigator){
  const regs=await navigator.serviceWorker.getRegistrations();
  for(const r of regs) await r.unregister();
}
if("caches" in window){
  const keys=await caches.keys();
  for(const k of keys) await caches.delete(k);
}
})();