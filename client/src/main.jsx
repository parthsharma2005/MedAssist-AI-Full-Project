import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import {
  Activity, MessageCircle, Stethoscope, Pill, ShieldPlus,
  FileText, LogOut, Send, Upload, HeartPulse, Menu, X
} from "lucide-react";
import "./styles.css";

const API = "http://localhost:5000/api";

function api() {
  const token = localStorage.getItem("medassist_token");
  return axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [page, setPage] = useState("home");
  const [sidebar, setSidebar] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("medassist_token");
    if (token) api().get("/me").then(r => setUser(r.data.user)).catch(() => {
      localStorage.removeItem("medassist_token");
    });
  }, []);

  if (!user) {
    return <Auth mode={authMode} setMode={setAuthMode} onLogin={setUser} />;
  }

  const logout = () => {
    localStorage.removeItem("medassist_token");
    setUser(null);
  };

  const pages = {
    home: <Home setPage={setPage} user={user} />,
    chat: <Chat />,
    symptoms: <Symptoms />,
    medicine: <Medicine />,
    firstaid: <FirstAid />,
    reports: <Reports />
  };

  return (
    <div className="app">
      <aside className={sidebar ? "sidebar" : "sidebar closed"}>
        <div className="brand"><HeartPulse size={27}/><span>MedAssist AI</span></div>
        <div className="small-label">ASSISTANT</div>
        <Nav icon={<Activity/>} text="Dashboard" active={page==="home"} onClick={()=>setPage("home")} />
        <Nav icon={<MessageCircle/>} text="AI Doctor Chat" active={page==="chat"} onClick={()=>setPage("chat")} />
        <Nav icon={<Stethoscope/>} text="Symptom Checker" active={page==="symptoms"} onClick={()=>setPage("symptoms")} />
        <Nav icon={<Pill/>} text="Medicine Assistant" active={page==="medicine"} onClick={()=>setPage("medicine")} />
        <Nav icon={<ShieldPlus/>} text="First Aid" active={page==="firstaid"} onClick={()=>setPage("firstaid")} />
        <Nav icon={<FileText/>} text="Report Analyzer" active={page==="reports"} onClick={()=>setPage("reports")} />
        <div className="sidebar-bottom">
          <div className="user-mini"><div className="avatar">{user.name[0]}</div><div><b>{user.name}</b><span>{user.email}</span></div></div>
          <button className="logout" onClick={logout}><LogOut size={17}/> Log out</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={()=>setSidebar(!sidebar)}>{sidebar ? <X/> : <Menu/>}</button>
          <div className="status"><span className="dot"/> AI assistant online</div>
          <div className="safe-pill">Medical safety mode</div>
        </header>
        <div className="content">{pages[page]}</div>
      </main>
    </div>
  );
}

function Nav({icon,text,active,onClick}) {
  return <button className={active ? "nav active" : "nav"} onClick={onClick}>{React.cloneElement(icon,{size:18})}<span>{text}</span></button>
}

function Auth({mode,setMode,onLogin}) {
  const [form,setForm]=useState({name:"",email:"",password:""});
  const [error,setError]=useState("");
  const submit=async e=>{
    e.preventDefault(); setError("");
    try {
      const endpoint=mode==="login"?"/auth/login":"/auth/register";
      const r=await axios.post(API+endpoint,form);
      localStorage.setItem("medassist_token",r.data.token);
      onLogin(r.data.user);
    } catch(e){ setError(e.response?.data?.error || "Something went wrong."); }
  };
  return <div className="auth-page">
    <div className="auth-card">
      <div className="brand center"><HeartPulse size={30}/><span>MedAssist AI</span></div>
      <h1>{mode==="login"?"Welcome back":"Create your account"}</h1>
      <p className="muted">Your AI-powered health information companion.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        {mode==="register" && <input placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>}
        <input type="email" placeholder="Email address" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
        <input type="password" placeholder="Password (6+ characters)" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
        <button className="primary full">{mode==="login"?"Sign in":"Create account"}</button>
      </form>
      <button className="link-btn" onClick={()=>setMode(mode==="login"?"register":"login")}>
        {mode==="login"?"Don't have an account? Create one":"Already have an account? Sign in"}
      </button>
      <div className="disclaimer">Not for emergencies or diagnosis. Seek qualified medical care for serious concerns.</div>
    </div>
  </div>
}

function Home({setPage,user}) {
  const cards=[
    ["AI Doctor Chat","Ask a health question and have a conversation.",MessageCircle,"chat"],
    ["Symptom Checker","Explore possible causes and urgency signals.",Stethoscope,"symptoms"],
    ["Medicine Assistant","Learn general information about medicines.",Pill,"medicine"],
    ["First Aid","Get simple first-aid information for common situations.",ShieldPlus,"firstaid"],
    ["Report Analyzer","Explain text-readable medical reports in plain language.",FileText,"reports"]
  ];
  return <div>
    <div className="hero">
      <div><div className="eyebrow">MEDASSIST AI</div><h1>Hello, {user.name.split(" ")[0]} 👋</h1>
      <p>Understand your health information with a cautious AI assistant.</p></div>
      <button className="primary" onClick={()=>setPage("chat")}><MessageCircle size={18}/> Start a chat</button>
    </div>
    <div className="warning"><b>Important:</b> MedAssist AI provides general information and decision support. It cannot diagnose conditions or replace a clinician. For emergencies, contact local emergency services.</div>
    <h2>What can I help with?</h2>
    <div className="feature-grid">{cards.map(([title,desc,Icon,key])=><button className="feature" key={key} onClick={()=>setPage(key)}><div className="feature-icon"><Icon/></div><div><h3>{title}</h3><p>{desc}</p></div><span>→</span></button>)}</div>
  </div>
}

function Chat() {
  const [messages,setMessages]=useState([{role:"assistant",text:"Hi! I’m MedAssist AI. Tell me what health question you have. I’ll provide general information and flag situations that may need urgent medical attention."}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const send=async()=>{
    if(!input.trim()||loading)return;
    const text=input; setInput(""); setMessages(m=>[...m,{role:"user",text}]); setLoading(true);
    try { const context=messages.slice(-8).map(m=>`${m.role}: ${m.text}`).join("\n"); const r=await api().post("/chat",{message:text,context}); setMessages(m=>[...m,{role:"assistant",text:r.data.reply}]); }
    catch(e){setMessages(m=>[...m,{role:"assistant",text:e.response?.data?.error||"Unable to reach the server."}]);}
    finally{setLoading(false);}
  };
  return <Tool title="AI Doctor Chat" subtitle="General medical information with safety-focused escalation.">
    <div className="chat-box">{messages.map((m,i)=><div key={i} className={"msg "+m.role}><div className="bubble">{m.text}</div></div>)}{loading&&<div className="msg assistant"><div className="bubble">Thinking carefully…</div></div>}</div>
    <div className="chat-input"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Describe your health question…"/><button className="primary icon-send" onClick={send}><Send size={18}/></button></div>
  </Tool>
}

function Symptoms(){
  const [form,setForm]=useState({symptoms:"",age:"",duration:"",severity:""});
  const [result,setResult]=useState(""); const [loading,setLoading]=useState(false);
  const run=async()=>{setLoading(true);try{const r=await api().post("/symptom-check",form);setResult(r.data.result)}catch(e){setResult(e.response?.data?.error||"Failed.")}finally{setLoading(false)}};
  return <Tool title="Symptom Checker" subtitle="A structured way to understand symptoms—not a diagnosis.">
    <div className="form-grid">
      <textarea className="wide" placeholder="What symptoms are you experiencing?" value={form.symptoms} onChange={e=>setForm({...form,symptoms:e.target.value})}/>
      <input placeholder="Age" value={form.age} onChange={e=>setForm({...form,age:e.target.value})}/>
      <input placeholder="How long?" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}/>
      <select value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})}><option value="">Severity</option><option>Mild</option><option>Moderate</option><option>Severe</option></select>
    </div>
    <button className="primary" onClick={run}>{loading?"Checking…":"Check symptoms"}</button>
    {result&&<Result text={result}/>}
  </Tool>
}

function Medicine(){
  const [medicine,setMedicine]=useState("");const [question,setQuestion]=useState("");const [result,setResult]=useState("");const [loading,setLoading]=useState(false);
  const run=async()=>{setLoading(true);try{const r=await api().post("/medicine",{medicine,question});setResult(r.data.result)}catch(e){setResult(e.response?.data?.error||"Failed.")}finally{setLoading(false)}};
  return <Tool title="Medicine Assistant" subtitle="Learn general medicine information. Never change a prescription based only on this tool.">
    <div className="form-grid"><input placeholder="Medicine name" value={medicine} onChange={e=>setMedicine(e.target.value)}/><input placeholder="What do you want to know?" value={question} onChange={e=>setQuestion(e.target.value)}/></div>
    <button className="primary" onClick={run}>{loading?"Looking up…":"Explain medicine"}</button>{result&&<Result text={result}/>}
  </Tool>
}

function FirstAid(){
  const [situation,setSituation]=useState("");const [result,setResult]=useState("");const [loading,setLoading]=useState(false);
  const run=async()=>{setLoading(true);try{const r=await api().post("/first-aid",{situation});setResult(r.data.result)}catch(e){setResult(e.response?.data?.error||"Failed.")}finally{setLoading(false)}};
  return <Tool title="First Aid" subtitle="General first-aid information. Emergencies require professional help.">
    <textarea placeholder="Example: minor burn, nosebleed, small cut…" value={situation} onChange={e=>setSituation(e.target.value)}/>
    <button className="primary" onClick={run}>{loading?"Preparing…":"Get first-aid steps"}</button>{result&&<Result text={result}/>}
  </Tool>
}

function Reports(){
  const [file,setFile]=useState(null);const [result,setResult]=useState("");const [loading,setLoading]=useState(false);
  const run=async()=>{if(!file)return;setLoading(true);const fd=new FormData();fd.append("report",file);try{const r=await api().post("/report",fd);setResult(r.data.result)}catch(e){setResult(e.response?.data?.error||"Failed.")}finally{setLoading(false)}};
  return <Tool title="Medical Report Analyzer" subtitle="Upload a text-readable report and get a plain-language explanation.">
    <label className="upload"><Upload size={25}/><span>{file?file.name:"Choose a TXT/CSV/text-readable report"}</span><input type="file" accept=".txt,.csv,.log" onChange={e=>setFile(e.target.files?.[0])}/></label>
    <button className="primary" disabled={!file} onClick={run}>{loading?"Analyzing…":"Analyze report"}</button>{result&&<Result text={result}/>}
  </Tool>
}

function Result({text}){return <div className="result"><h3>AI explanation</h3>{text.split("\n").map((x,i)=><p key={i}>{x||" "}</p>)}</div>}

function Tool({title,subtitle,children}){return <div><div className="page-head"><div><div className="eyebrow">MEDICAL TOOL</div><h1>{title}</h1><p>{subtitle}</p></div></div><div className="tool-card">{children}</div></div>}

createRoot(document.getElementById("root")).render(<App />);
