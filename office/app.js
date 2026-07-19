const $=id=>document.getElementById(id);
const cfg=window.ARHS_CONFIG||{};
const configured=cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes("PASTE_");
const sb=configured?supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(n)||0);
const statuses=["New","Contacted","Estimate Scheduled","Estimate Sent","Approved","Scheduled","Completed","Paid","Review Requested"];
let state={leads:[],jobs:[],estimates:[],invoices:[],pricebook:[]};
let modalType="",editingId=null;

const schemas={
 lead:[["name","Full name","text"],["phone","Phone","tel"],["email","Email","email"],["city","City","text"],["address","Address","text","full"],["service","Service","text"],["status","Status","leadstatus"],["estimated_value","Estimated value","number"],["follow_up_date","Follow-up date","date"],["details","Project details","textarea","full"],["internal_notes","Internal notes","textarea","full"]],
 job:[["customer_name","Customer","text"],["job_date","Date","date"],["job_time","Time","text"],["service","Service","text"],["description","Description","textarea","full"],["status","Status","jobstatus"],["value","Job value","number"]],
 estimate:[["estimate_number","Estimate number","text"],["customer_name","Customer","text"],["service","Service","text"],["description","Description","textarea","full"],["amount","Amount","number"],["status","Status","eststatus"],["estimate_date","Date","date"]],
 invoice:[["invoice_number","Invoice number","text"],["customer_name","Customer","text"],["service","Service","text"],["description","Description","textarea","full"],["amount","Amount","number"],["balance","Balance","number"],["status","Status","invstatus"],["invoice_date","Date","date"],["due_date","Due date","date"]],
 pricebook:[["category","Category","text"],["name","Item name","text"],["description","Description","textarea","full"],["price","Price","number"],["unit","Unit","text"]]
};
const tableMap={lead:"leads",job:"jobs",estimate:"estimates",invoice:"invoices",pricebook:"pricebook"};

function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1800)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

async function boot(){
 const now=new Date();
 $("todayText").textContent=now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
 $("daypart").textContent=now.getHours()<12?"morning":now.getHours()<18?"afternoon":"evening";
 if(!configured){$("loginMessage").textContent="Supabase is not connected. Check config.js.";return}
 const {data:{session}}=await sb.auth.getSession();
 await showSession(session);
 sb.auth.onAuthStateChange((_event,s)=>showSession(s));
}
async function showSession(session){
 $("loginScreen").classList.toggle("hidden",!!session);
 $("appShell").classList.toggle("hidden",!session);
 $("mobileNav").classList.toggle("hidden",!session);
 if(session)await loadAll();
}
$("loginForm").onsubmit=async e=>{
 e.preventDefault();
 $("loginMessage").textContent="Sending...";
 const {error}=await sb.auth.signInWithOtp({email:$("loginEmail").value.trim(),options:{emailRedirectTo:location.origin+location.pathname}});
 $("loginMessage").textContent=error?error.message:"Check your email and tap the secure sign-in link.";
};
$("logoutBtn").onclick=()=>sb.auth.signOut();

function nav(view){
 document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
 $(`view-${view}`).classList.add("active");
 document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
 $("viewTitle").textContent=view[0].toUpperCase()+view.slice(1);
 $("sidebar").classList.remove("open");
}
document.querySelectorAll("[data-view]").forEach(x=>x.onclick=()=>nav(x.dataset.view));
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");

async function loadAll(){
 for(const table of Object.keys(state)){
   const {data,error}=await sb.from(table).select("*").order("created_at",{ascending:false});
   if(error){console.error(table,error);toast(error.message)} else state[table]=data||[];
 }
 render();
}

function render(){
 const newLeads=state.leads.filter(x=>x.status==="New");
 const openEst=state.estimates.filter(x=>!["Approved","Declined"].includes(x.status));
 $("mNew").textContent=newLeads.length;$("leadBadge").textContent=newLeads.length;
 $("mEstimates").textContent=openEst.length;
 $("mEstimateValue").textContent=money(openEst.reduce((a,x)=>a+Number(x.amount||0),0))+" potential";
 $("mJobs").textContent=state.jobs.filter(x=>!["Completed","Canceled"].includes(x.status)).length;
 $("mOutstanding").textContent=money(state.invoices.reduce((a,x)=>a+Number(x.balance||0),0));
 $("collectedTotal").textContent=money(state.invoices.filter(x=>x.status==="Paid").reduce((a,x)=>a+Number(x.amount||0),0));

 const today=new Date().toISOString().slice(0,10);
 const todays=state.jobs.filter(x=>x.job_date===today);
 $("todayJobs").innerHTML=todays.length?todays.map(x=>`<article class="item"><div><h3>${esc(x.job_time||"")} ${esc(x.customer_name)}</h3><p>${esc(x.service||"")}</p></div><span class="pill">${esc(x.status)}</span></article>`).join(""):`<div class="empty">No jobs scheduled today.</div>`;

 const attention=state.leads.filter(x=>["New","Estimate Sent"].includes(x.status)).slice(0,4);
 $("attentionList").innerHTML=attention.length?attention.map(x=>`<article class="customer-card"><h3>${esc(x.name)}</h3><p>${esc(x.status)} • ${esc(x.service||"")}</p></article>`).join(""):`<div class="empty">You’re caught up.</div>`;

 $("recentLeads").innerHTML=state.leads.slice(0,5).map(x=>`<article class="item"><div><h3>${esc(x.name)}</h3><p>${esc(x.service||"")}</p></div><span>${esc(x.status)}</span><strong>${money(x.estimated_value)}</strong></article>`).join("")||`<div class="empty">No leads yet.</div>`;

 renderLeads();renderCustomers();renderJobs();renderEstimates();renderInvoices();renderPricebook();
}

function renderLeads(){
 if($("leadFilter").options.length===1)statuses.forEach(s=>$("leadFilter").add(new Option(s,s)));
 const q=$("leadSearch").value.toLowerCase(),f=$("leadFilter").value;
 const rows=state.leads.filter(x=>(!f||x.status===f)&&[x.name,x.phone,x.city,x.service].join(" ").toLowerCase().includes(q));
 $("leadList").innerHTML=rows.map(x=>`<article class="item"><div><h3>${esc(x.name)}</h3><p>${esc(x.phone||"")} • ${esc(x.city||"")} • ${esc(x.service||"")}</p></div><span class="pill">${esc(x.status)}</span><strong>${money(x.estimated_value)}</strong><button class="secondary" data-edit-lead="${x.id}">Open</button></article>`).join("")||`<div class="empty">No matching leads.</div>`;
 document.querySelectorAll("[data-edit-lead]").forEach(x=>x.onclick=()=>openModal("lead",x.dataset.editLead));
}
$("leadSearch").oninput=renderLeads;$("leadFilter").onchange=renderLeads;

function renderCustomers(){
 $("customerGrid").innerHTML=state.leads.map(x=>`<article class="customer-card"><h3>${esc(x.name)}</h3><p>${esc(x.phone||"No phone")}</p><p>${esc(x.city||"")} • ${esc(x.service||"")}</p><button class="secondary" data-edit-customer="${x.id}">Open</button></article>`).join("")||`<div class="empty">No customers yet.</div>`;
 document.querySelectorAll("[data-edit-customer]").forEach(x=>x.onclick=()=>openModal("lead",x.dataset.editCustomer));
}
function renderJobs(){
 $("jobList").innerHTML=state.jobs.map(x=>`<article class="item"><div><h3>${esc(x.customer_name)}</h3><p>${esc(x.service||"")}</p></div><span>${esc(x.job_date||"")} ${esc(x.job_time||"")}</span><span class="pill">${esc(x.status)}</span><button class="secondary" data-edit-job="${x.id}">Open</button></article>`).join("")||`<div class="empty">No jobs yet.</div>`;
 document.querySelectorAll("[data-edit-job]").forEach(x=>x.onclick=()=>openModal("job",x.dataset.editJob));
}
function renderEstimates(){
 $("estimateList").innerHTML=state.estimates.map(x=>`<article class="item"><div><h3>${esc(x.customer_name)}</h3><p>${esc(x.estimate_number||"")} • ${esc(x.service||"")}</p></div><span class="pill">${esc(x.status)}</span><strong>${money(x.amount)}</strong><div><button class="secondary" data-edit-estimate="${x.id}">Open</button> <button class="primary" data-convert="${x.id}">Convert</button></div></article>`).join("")||`<div class="empty">No estimates yet.</div>`;
 document.querySelectorAll("[data-edit-estimate]").forEach(x=>x.onclick=()=>openModal("estimate",x.dataset.editEstimate));
 document.querySelectorAll("[data-convert]").forEach(x=>x.onclick=()=>convertEstimate(x.dataset.convert));
}
function renderInvoices(){
 $("invoiceList").innerHTML=state.invoices.map(x=>`<article class="item"><div><h3>${esc(x.customer_name)}</h3><p>${esc(x.invoice_number||"")} • ${esc(x.service||"")}</p></div><span class="pill">${esc(x.status)}</span><strong>${money(x.balance)}</strong><button class="secondary" data-edit-invoice="${x.id}">Open</button></article>`).join("")||`<div class="empty">No invoices yet.</div>`;
 document.querySelectorAll("[data-edit-invoice]").forEach(x=>x.onclick=()=>openModal("invoice",x.dataset.editInvoice));
}
function renderPricebook(){
 $("priceGrid").innerHTML=state.pricebook.map(x=>`<article class="customer-card"><span class="eyebrow">${esc(x.category||"Service")}</span><h3>${esc(x.name)}</h3><p>${esc(x.description||"")}</p><strong>${money(x.price)} / ${esc(x.unit||"each")}</strong></article>`).join("")||`<div class="empty">No price book items.</div>`;
}

async function convertEstimate(id){
 const e=state.estimates.find(x=>x.id===id);if(!e)return;
 const {error}=await sb.from("invoices").insert({
   estimate_id:e.id,customer_id:e.customer_id,customer_name:e.customer_name,service:e.service,
   description:e.description,amount:e.amount,balance:e.amount,status:"Draft",
   invoice_number:"INV-"+Date.now(),invoice_date:new Date().toISOString().slice(0,10)
 });
 if(error){toast(error.message);return}
 await sb.from("estimates").update({status:"Approved",approved_at:new Date().toISOString()}).eq("id",id);
 toast("Estimate converted to invoice");await loadAll();
}

function openModal(type,id=null){
 modalType=type;editingId=id;
 const table=tableMap[type],item=state[table].find(x=>x.id===id)||{};
 $("modalTitle").textContent=(id?"Edit ":"New ")+(type==="pricebook"?"price book item":type);
 $("modalEyebrow").textContent=table;$("formError").textContent="";
 $("formFields").innerHTML=schemas[type].map(([key,label,kind,full])=>{
   let control;
   if(kind==="textarea")control=`<textarea id="f-${key}">${esc(item[key]||"")}</textarea>`;
   else if(kind.endsWith("status")){
     const opts=kind==="leadstatus"?statuses:kind==="jobstatus"?["Tentative","Confirmed","Completed","Canceled"]:kind==="eststatus"?["Draft","Sent","Approved","Declined"]:["Draft","Sent","Due","Paid"];
     control=`<select id="f-${key}">${opts.map(o=>`<option ${item[key]===o?"selected":""}>${o}</option>`).join("")}</select>`;
   } else control=`<input id="f-${key}" type="${kind}" value="${esc(item[key]??"")}">`;
   return `<label class="${full||""}">${label}${control}</label>`;
 }).join("");
 $("entityDialog").showModal();
}
$("closeDialog").onclick=$("cancelDialog").onclick=()=>$("entityDialog").close();

$("entityForm").onsubmit=async e=>{
 e.preventDefault();$("formError").textContent="";
 const table=tableMap[modalType],payload={};
 schemas[modalType].forEach(([key])=>payload[key]=$(`f-${key}`).value);
 ["estimated_value","value","amount","balance","price"].forEach(k=>{if(k in payload)payload[k]=Number(payload[k])||0});
 const query=editingId?sb.from(table).update(payload).eq("id",editingId):sb.from(table).insert(payload);
 const {error}=await query;
 if(error){$("formError").textContent=error.message;return}
 $("entityDialog").close();toast("Saved");await loadAll();
};

$("quickAddBtn").onclick=$("heroLeadBtn").onclick=$("addLeadBtn").onclick=()=>openModal("lead");
$("addJobBtn").onclick=()=>openModal("job");
$("addEstimateBtn").onclick=()=>openModal("estimate");
$("addInvoiceBtn").onclick=()=>openModal("invoice");
$("addPriceBtn").onclick=()=>openModal("pricebook");

boot();
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");