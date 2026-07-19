const cfg=window.ARHS_CONFIG||{};
const configured=cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes("PASTE_");
const sb=configured?supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n)||0);
const $=id=>document.getElementById(id);
let state={leads:[],jobs:[],estimates:[],invoices:[]};

document.querySelectorAll("[data-tab]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll("[data-tab]").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    ["dashboard","leads","jobs","estimates","invoices"].forEach(id=>{
      $(id).classList.toggle("hidden",id!==btn.dataset.tab);
    });
  });
});

async function showSession(session){
  $("loginScreen").classList.toggle("hidden",!!session);
  $("app").classList.toggle("hidden",!session);
  if(session) await load();
}

async function boot(){
  if(!configured){
    $("loginMessage").textContent="Supabase is not connected. Check config.js.";
    return;
  }
  const {data:{session}}=await sb.auth.getSession();
  await showSession(session);
  sb.auth.onAuthStateChange((_event,newSession)=>showSession(newSession));
}

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!sb)return;
  $("loginMessage").textContent="Sending...";
  const {error}=await sb.auth.signInWithOtp({
    email:$("loginEmail").value.trim(),
    options:{emailRedirectTo:location.origin+location.pathname}
  });
  $("loginMessage").textContent=error?error.message:"Check your email and tap the secure sign-in link.";
});

$("logoutBtn").addEventListener("click",()=>sb.auth.signOut());

async function load(){
  for(const table of Object.keys(state)){
    const {data,error}=await sb.from(table).select("*").order("created_at",{ascending:false});
    if(error){console.error(table,error);continue}
    state[table]=data||[];
  }
  render();
}

function render(){
  $("newLeads").textContent=state.leads.filter(x=>x.status==="New").length;
  $("openEstimates").textContent=state.estimates.filter(x=>!["Approved","Declined"].includes(x.status)).length;
  $("outstanding").textContent=money(state.invoices.reduce((a,x)=>a+Number(x.balance||0),0));
  $("reviews").textContent=state.invoices.filter(x=>x.status==="Paid"&&!x.review_requested).length;

  $("leadList").innerHTML=state.leads.length?state.leads.map(x=>`
    <article class="row">
      <div><b>${escapeHtml(x.name)}</b><div class="muted">${escapeHtml(x.service||"General Handyman")}</div></div>
      <div>${escapeHtml(x.status||"New")}</div>
      <strong>${money(x.estimated_value)}</strong>
    </article>`).join(""):`<div class="card muted">No leads yet. Tap Add Lead.</div>`;

  $("jobList").innerHTML=state.jobs.length?state.jobs.map(x=>`<article class="row"><div><b>${escapeHtml(x.customer_name)}</b><div>${escapeHtml(x.service||"")}</div></div><div>${x.job_date||""}</div><div>${escapeHtml(x.status||"")}</div></article>`).join(""):`<div class="card muted">No jobs yet.</div>`;
  $("estimateList").innerHTML=state.estimates.length?state.estimates.map(x=>`<article class="row"><div><b>${escapeHtml(x.customer_name)}</b></div><div>${escapeHtml(x.status||"")}</div><strong>${money(x.amount)}</strong></article>`).join(""):`<div class="card muted">No estimates yet.</div>`;
  $("invoiceList").innerHTML=state.invoices.length?state.invoices.map(x=>`<article class="row"><div><b>${escapeHtml(x.customer_name)}</b></div><div>${escapeHtml(x.status||"")}</div><strong>${money(x.balance)}</strong></article>`).join(""):`<div class="card muted">No invoices yet.</div>`;
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function openLead(){
  $("leadError").textContent="";
  $("leadForm").reset();
  $("leadDialog").showModal();
}
$("addLead").addEventListener("click",openLead);
$("closeLead").addEventListener("click",()=>$("leadDialog").close());
$("cancelLead").addEventListener("click",()=>$("leadDialog").close());

$("leadForm").addEventListener("submit",async e=>{
  e.preventDefault();
  $("leadError").textContent="";
  const payload={
    name:$("leadName").value.trim(),
    phone:$("leadPhone").value.trim()||null,
    email:$("leadEmail").value.trim()||null,
    city:$("leadCity").value.trim()||null,
    service:$("leadService").value.trim()||"General Handyman",
    details:$("leadDetails").value.trim()||null,
    status:"New",
    estimated_value:Number($("leadValue").value)||0,
    source:"Manual"
  };
  const {error}=await sb.from("leads").insert(payload);
  if(error){$("leadError").textContent=error.message;return}
  $("leadDialog").close();
  await load();
});

boot();