import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import "./style.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const starters = [
 {name:"Daily Cleaning Services", city:"Pasco, WA", headline:"A cleaner space starts here.", description:"A welcoming online home for your cleaning business. Add your approved services, service area and contact details.", services:["Residential cleaning","Commercial cleaning","Deep cleaning"], phone:"", email:"", website_status:"draft"},
 {name:"Tru-Shine Cleaning", city:"Pasco, WA", headline:"Bring back the shine.", description:"Show customers the cleaning services you offer and make it easy to request a quote.", services:["Home cleaning","Office cleaning","Move-out cleaning"], phone:"", email:"", website_status:"draft"},
 {name:"Al's Automotive Repair", city:"Pasco, WA", headline:"Dependable care for your vehicle.", description:"Help customers understand your repair services, hours and how to contact your shop.", services:["Vehicle diagnostics","Maintenance","General repairs"], phone:"", email:"", website_status:"draft"},
 {name:"Coria Landscaping & Land Services LLC", city:"Kennewick, WA", headline:"Make your outdoor space work for you.", description:"Showcase your outdoor services, project photos and estimate-request information.", services:["Landscaping","Lawn care","Yard cleanup"], phone:"", email:"", website_status:"draft"},
 {name:"M-Pact Auto Repair", city:"Kennewick, WA", headline:"Auto care with a personal touch.", description:"A clear, helpful website concept for an independent automotive repair business.", services:["Auto repair","Vehicle maintenance","Diagnostics"], phone:"", email:"", website_status:"draft"}
];

function App(){
 const [session,setSession]=useState(null), [profile,setProfile]=useState(null);
 const [businesses,setBusinesses]=useState([]), [selected,setSelected]=useState(null);
 const [invites,setInvites]=useState([]), [page,setPage]=useState("dashboard");
 const [loading,setLoading]=useState(!!supabase), [notice,setNotice]=useState("");
 const [email,setEmail]=useState(""), [password,setPassword]=useState("");
 const [authMode,setAuthMode]=useState("signin"), [form,setForm]=useState({});
 const [inviteEmail,setInviteEmail]=useState(""), [inviteRole,setInviteRole]=useState("owner");
 const [busy,setBusy]=useState(false);

 useEffect(()=>{ if(!supabase){setLoading(false);return;}
   supabase.auth.getSession().then(({data})=>setSession(data.session));
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
   return ()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{ if(session) loadWorkspace(); else {setProfile(null);setBusinesses([]);setLoading(false);} },[session]);
 async function loadWorkspace(){
   setLoading(true);
   const {data:p,error:pe}=await supabase.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
   if(pe) setNotice(pe.message); setProfile(p);
   const {data:members,error:me}=await supabase.from("business_memberships").select("business_id,role,businesses(*)");
   if(me) setNotice(me.message);
   const rows=(members||[]).map(x=>({...x.businesses,role:x.role}));
   setBusinesses(rows); setSelected(rows[0]||null);
   const {data:iv}=await supabase.from("business_invitations").select("id,business_id,email,role,status,created_at");
   setInvites(iv||[]); setLoading(false);
 }
 async function signIn(e){e.preventDefault();setBusy(true);setNotice("");
   const fn=authMode==="signup"?supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin}}):supabase.auth.signInWithPassword({email,password});
   const {error}=await fn;setNotice(error?error.message:(authMode==="signup"?"Check your email to confirm your account.":"Signed in."));setBusy(false);
 }
 async function signOut(){await supabase.auth.signOut();setNotice("Signed out.");}
 async function createBusiness(e){e.preventDefault();if(!supabase)return;setBusy(true);
   const payload={name:form.name,city:form.city||"",headline:form.headline||"",description:form.description||"",services:(form.services||"").split(",").map(x=>x.trim()).filter(Boolean),phone:form.phone||"",email:form.contact_email||"",website_status:"draft"};
   const {data,error}=await supabase.from("businesses").insert(payload).select().single();
   if(!error){const {error:me}=await supabase.from("business_memberships").insert({business_id:data.id,user_id:session.user.id,role:"admin"});if(me)setNotice(me.message);else{setNotice("Business draft created.");await loadWorkspace();setPage("websites");}}
   else setNotice(error.message);setBusy(false);
 }
 async function saveBusiness(e){e.preventDefault();if(!selected)return;setBusy(true);
   const payload={name:form.name,city:form.city,headline:form.headline,description:form.description,services:(form.services||"").split(",").map(x=>x.trim()).filter(Boolean),phone:form.phone,email:form.contact_email,updated_at:new Date().toISOString()};
   const {error}=await supabase.from("businesses").update(payload).eq("id",selected.id);
   setNotice(error?error.message:"Website draft saved.");setBusy(false);await loadWorkspace();
 }
 async function createInvite(e){e.preventDefault();if(!selected)return;setBusy(true);
   const {error}=await supabase.from("business_invitations").insert({business_id:selected.id,email:inviteEmail.toLowerCase(),role:inviteRole,status:"pending",invited_by:session.user.id});
   setNotice(error?error.message:"Invitation record created. Configure an Edge Function/email provider to send a real invitation.");setBusy(false);
   if(!error){setInviteEmail("");const {data}=await supabase.from("business_invitations").select("*");setInvites(data||[]);}
 }
 async function acceptInvite(id){const {error}=await supabase.rpc("accept_business_invitation",{invitation_id:id});setNotice(error?error.message:"Invitation accepted.");await loadWorkspace();}
 function edit(b){setSelected(b);setForm({name:b.name,city:b.city,headline:b.headline,description:b.description,services:(b.services||[]).join(", "),phone:b.phone,contact_email:b.email});setPage("editor");}
 function startNew(){setForm({name:"",city:"",headline:"",description:"",services:"",phone:"",contact_email:""});setPage("new");}
 const isAdmin=selected?.role==="admin";
 if(!supabase) return <SetupScreen/>;
 if(loading) return <div className="center">Loading your secure workspace…</div>;
 if(!session) return <main className="auth"><div className="auth-card"><div className="eyebrow">KINGDOM CAPTURES</div><h1>Website Studio</h1><p className="muted">Sign in to manage business websites and owner access.</p><form onSubmit={signIn}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary" disabled={busy}>{busy?"Please wait…":authMode==="signup"?"Create account":"Sign in"}</button></form><button className="text-button" onClick={()=>setAuthMode(authMode==="signup"?"signin":"signup")}>{authMode==="signup"?"Already have an account? Sign in":"Need an account? Create one"}</button>{notice&&<p className="notice">{notice}</p>}</div></main>;
 return <div className="shell"><aside className="sidebar"><div className="logo">KINGDOM CAPTURES<span>WEBSITE STUDIO</span></div><nav>{[["dashboard","Overview"],["websites","Websites"],["new","New website"],["owners","Owners & transfers"]].map(([k,v])=><button className={page===k?"active":""} onClick={()=>setPage(k)} key={k}>{v}</button>)}</nav><div className="side-bottom"><small>{session.user.email}</small><button onClick={signOut}>Sign out</button></div></aside>
 <main className="content"><header><div><div className="eyebrow">CLIENT WEBSITE MANAGEMENT</div><h1>{({dashboard:"Website command center",websites:"Business websites",new:"Create a website draft",editor:"Edit website",owners:"Owners & transfers"})[page]}</h1></div><span className="tag">Connected workspace</span></header>
 {notice&&<div className="notice">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
 {page==="dashboard"&&<><div className="stats"><div><b>{businesses.length}</b><span>Websites you can access</span></div><div><b>{invites.filter(x=>x.status==="pending").length}</b><span>Pending invitations</span></div><div><b>{businesses.filter(x=>x.website_status==="published").length}</b><span>Published websites</span></div></div><section className="panel"><div className="panel-head"><h2>Your websites</h2><button className="primary" onClick={startNew}>+ New website</button></div><BusinessList items={businesses} edit={edit}/></section><section className="panel"><h2>Important launch checklist</h2><p className="muted">Confirm each business has authorized the project, approve its content and photos, agree on domain/hosting ownership, then publish. Prospect records are not permission to represent a business.</p></section></>}
 {page==="websites"&&<section className="panel"><div className="panel-head"><h2>Websites</h2><button className="primary" onClick={startNew}>+ New website</button></div><BusinessList items={businesses} edit={edit}/></section>}
 {page==="new"&&<section className="panel narrow"><h2>Start a website draft</h2><form onSubmit={createBusiness}><Fields form={form} setForm={setForm}/><button className="primary" disabled={busy}>Create draft</button></form></section>}
 {page==="editor"&&selected&&<section className="editor-grid"><div className="panel"><h2>Website content</h2><form onSubmit={saveBusiness}><Fields form={form} setForm={setForm}/><button className="primary" disabled={busy}>Save changes</button></form></div><SitePreview business={{...selected,...form,services:(form.services||"").split(",").map(x=>x.trim())}}/></section>}
 {page==="owners"&&<section className="panel"><h2>Owner invitations</h2>{selected?<><p className="muted">Selected website: <b>{selected.name}</b> · Your role: {selected.role}</p>{isAdmin?<form className="invite-form" onSubmit={createInvite}><label>Owner email<input type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/></label><label>Access role<select value={inviteRole} onChange={e=>setInviteRole(e.target.value)}><option value="owner">Owner editor</option><option value="admin">Administrator</option></select></label><button className="primary">Create invitation</button></form>:<p className="notice">Only a business administrator can invite additional users.</p>}</>:<p className="muted">You do not have access to a business yet. Ask the administrator for an invitation.</p>}<h3>Invitation records</h3>{invites.length?<div className="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{invites.map(i=><tr key={i.id}><td>{i.email}</td><td>{i.role}</td><td>{i.status}</td><td>{i.status==="pending"?<button className="small" onClick={()=>acceptInvite(i.id)}>Accept (signed-in email only)</button>:"—"}</td></tr>)}</tbody></table></div>:<p className="muted">No invitations yet.</p>}</section>}
 <footer>Kingdom Captures · Prototype deployment package · Never store passwords outside Supabase Auth.</footer></main></div>
}
function Fields({form,setForm}){const upd=(k,v)=>setForm(f=>({...f,[k]:v}));return <>{[["name","Business name"],["city","City / service area"],["headline","Homepage headline"],["phone","Public phone"],["contact_email","Public contact email"],["services","Services (comma-separated)"]].map(([k,l])=><label key={k}>{l}<input required={k==="name"} value={form[k]||""} onChange={e=>upd(k,e.target.value)}/></label>)}<label>Website description<textarea rows="4" value={form.description||""} onChange={e=>upd("description",e.target.value)}/></label></>}
function BusinessList({items,edit}){return items.length?<div className="business-list">{items.map(b=><article key={b.id}><div><h3>{b.name}</h3><p>{b.city||"Location to confirm"} · <span className="tag">{b.website_status||"draft"}</span></p><p className="muted">{b.headline||"Headline not set"}</p></div><button className="secondary" onClick={()=>edit(b)}>Edit</button></article>)}</div>:<p className="muted">No websites yet. Create your first draft.</p>}
function SitePreview({business:b}){return <div className="site-preview"><div className="site-hero"><span>LOCAL BUSINESS</span><h2>{b.headline||b.name}</h2><p>{b.description}</p><button>Contact us</button></div><div className="site-content"><h2>{b.name}</h2><p>{b.city}</p><h3>Services</h3><div className="chips">{(b.services||[]).filter(Boolean).map(s=><span key={s}>{s}</span>)}</div><hr/><b>Get in touch</b><p>{b.phone} · {b.contact_email}</p><small>Preview only — not published</small></div></div>}
function SetupScreen(){return <main className="setup"><div className="auth-card"><div className="eyebrow">KINGDOM CAPTURES</div><h1>Website Studio setup</h1><p>This application is prepared for Supabase authentication and database access. Add your project credentials to activate secure accounts.</p><ol><li>Create a free Supabase project.</li><li>Run the SQL in <code>supabase/schema.sql</code>.</li><li>Copy <code>.env.example</code> to <code>.env</code> and add the project URL and anon key.</li><li>Run <code>npm install</code>, then <code>npm run dev</code>.</li></ol><p className="notice">No live backend is connected in this downloaded package. Never put a Supabase service-role key in browser code.</p></div></main>}
createRoot(document.getElementById("root")).render(<App/>);
