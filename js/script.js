const DAYS=["Hétfő","Kedd","Szerda","Csütörtök","Péntek"];
const SHORT=["H","K","Sz","Cs","P"];
const mins=t=>{const[h,m]=t.split(":").map(Number);return h*60+m};
/* EV/ONLINE/CODES/ZOLI_EV/ROOMS are semester data, loaded at startup from schedule_data/*.json
   (see loadScheduleData()/init() below) instead of being hardcoded here — see CLAUDE.md. */
let EV=[],ONLINE=[],ZOLI_EV=[],CODES=[];
const NAV_LINKS=[
 {id:"schedule",label:"Órarend"},
 {id:"zoli",label:"Zoli órarend"},
 {id:"kotelezo",label:"Kötelező tárgyak"},
 {id:"online",label:"Rögzített időpont nélkül"},
 {id:"kriterium",label:"Kritérium (0 kredit)"},
 {id:"teremkereso",label:"Teremkereső"},
];
let ROOMS=[];
const PAGE_LABELS=Object.fromEntries(NAV_LINKS.map(x=>[x.id,x.label]));
const SCHEDULE_VIEWS=["schedule","zoli"];
const isScheduleView=v=>SCHEDULE_VIEWS.includes(v);
const datasetFor=v=>v==="zoli"?ZOLI_EV:EV;
const CATS={
 shopping:{label:"Bevásárlólista",icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>'},
 tasks:{label:"Feladatlista",icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>'},
};
const COLOR_CYCLE=["ea","gy","pr","mt"];
const E=document.createElement.bind(document);
/* fetch() unconditionally refuses file:// URLs in every Chromium engine (not a WebView-settings issue) —
   this app is opened both as a normal page and as file:///android_asset/index.html inside the Web2APK
   wrapper, so any local-asset read (course_data/*.json) must go through XHR instead, not fetch(). */
function fetchLocal(url){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open("GET",url,true);
    xhr.onload=()=>{
      if(xhr.status===200||xhr.status===0)resolve(xhr.responseText);
      else reject(new Error("status "+xhr.status));
    };
    xhr.onerror=()=>reject(new Error("network error"));
    xhr.send();
  });
}
async function loadScheduleData(){
  const[ev,zoli,online,codes,rooms]=await Promise.all(
    ["ev","zoli","online","codes","rooms"].map(n=>fetchLocal(`schedule_data/${n}.json`))
  );
  EV=JSON.parse(ev);ZOLI_EV=JSON.parse(zoli);ONLINE=JSON.parse(online);
  CODES=JSON.parse(codes);ROOMS=JSON.parse(rooms);
}
const svgArw='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
const svgLoc='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>';
const svgInfo='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
const svgBack='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
const now=new Date();const nowDay=now.getDay()-1;const nowMin=now.getHours()*60+now.getMinutes();
let curDay=(nowDay<0||nowDay>4)?0:nowDay;
let view="schedule"; // "schedule" | "kotelezo" | "online" | "kriterium" | "checklist"
let panelMode="nav"; // "nav" | "checklist" | "settings"
let activeChecklistId=null;
let checklistFormOpen=false;
let checklistFormCat="shopping";
let roomQuery="";
let openRoomMaps=new Set();
let sheetCourse=null;

/* ---------- persistence ---------- */
const CHECKLIST_KEY="orarend-checklists-v1";
function loadChecklists(){try{return JSON.parse(localStorage.getItem(CHECKLIST_KEY))||[];}catch(e){return[];}}
function saveChecklists(){try{localStorage.setItem(CHECKLIST_KEY,JSON.stringify(checklists));}catch(e){}}
let checklists=loadChecklists();

function getChecklist(id){return checklists.find(l=>l.id===id);}
function createChecklist(category,name){
  const list={id:"cl_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),
    category,name,colorKey:COLOR_CYCLE[checklists.length%COLOR_CYCLE.length],items:[]};
  checklists.push(list);saveChecklists();return list;
}
function deleteChecklist(id){checklists=checklists.filter(l=>l.id!==id);saveChecklists();}
function addItem(listId,name){
  const list=getChecklist(listId);if(!list)return;
  const item={id:"it_"+Date.now()+"_"+Math.random().toString(36).slice(2,5),name};
  if(list.category==="shopping")item.price=0;else item.done=false;
  list.items.push(item);saveChecklists();
}
function removeItem(listId,itemId){
  const list=getChecklist(listId);if(!list)return;
  list.items=list.items.filter(i=>i.id!==itemId);saveChecklists();
}
function updateItemPrice(listId,itemId,price){
  const list=getChecklist(listId);const item=list&&list.items.find(i=>i.id===itemId);
  if(item){item.price=price;saveChecklists();}
}
function toggleItemDone(listId,itemId){
  const list=getChecklist(listId);const item=list&&list.items.find(i=>i.id===itemId);
  if(item){item.done=!item.done;saveChecklists();}
}
function calcSum(list){return list.items.reduce((s,i)=>s+(Number(i.price)||0),0);}

/* ---------- theme ---------- */
function getTheme(){return document.documentElement.getAttribute("data-theme")||"light";}
function applyTheme(mode){
  document.documentElement.setAttribute("data-theme",mode);
  const mc=document.querySelector('meta[name="theme-color"]');
  if(mc)mc.setAttribute("content",mode==="dark"?"#14161d":"#ffffff");
  try{localStorage.setItem("orarend-theme",mode);}catch(e){}
}

/* ---------- navigation ---------- */
function goto(newView,dayIndex){
  view=newView;
  if(typeof dayIndex==="number")curDay=dayIndex;
  rail();
  renderHead();
  renderMain();
}
function openChecklist(id){
  view="checklist";activeChecklistId=id;
  rail();renderHead();renderMain();
}

/* ---------- course action sheet ---------- */
/* Maps every EV/ZOLI_EV/ONLINE course-name string to its course_data/<slug>.json file. */
const COURSE_DOC_ALIASES={
  "Egyetemi informatikai alapok":"egyetemi-informatikai-alapok",
  "IT-biztonság az SZTE-n":"it-biztonsag-az-szte-n",
  "Karrierépítés alapozó kurzus":"karrierepites-alapozo-kurzus",
  "Matematika 1. ea.":"matematika-informatikusoknak-1-ea",
  "Matematika praktikum":"matematika-praktikum",
  "MI az egyetemi tanulmányokban":"mesterseges-intelligencia-az-egyetemi-tanulmanyokban",
  "Programozás alapjai ea.":"programozas-alapjai-eloadas",
  "Programozás alapjai gy.":"programozas-alapjai-gy",
  "Programozás alapjai praktikum":"programozas-alapjai-praktikum",
  "Személyes és szociális készségek":"szemelyes-es-szocialis-keszsegek",
  "Webfejlesztés alapjai (ea)":"webfejlesztes-alapjai-coursera",
  "Webfejlesztés alapjai gy.":"webfejlesztes-alapjai-coursera",
};
function applySheetAccent(type){
  const t=type||"ea";
  const sheet=document.getElementById("courseSheet");
  sheet.style.setProperty("--sheet-bg",`var(--${t}-bg)`);
  sheet.style.setProperty("--sheet-tx",`var(--${t}-tx)`);
  sheet.style.setProperty("--sheet-ac",`var(--${t}-ac)`);
}
function openCourseSheet(course){
  sheetCourse=course;
  applySheetAccent(course.type);
  const body=document.getElementById("sheetBody");body.innerHTML="";
  const title=E("div");title.className="sheet-title";title.textContent=course.name;
  const sub=E("div");sub.className="sheet-sub";
  sub.textContent=course.online?course.meta:`${course.s}–${course.en} · ${course.room}`;
  body.appendChild(title);body.appendChild(sub);

  if(!course.online){
    const roomBtn=E("button");roomBtn.type="button";roomBtn.className="sheet-action";
    roomBtn.innerHTML=svgLoc+"<span>Terem keresése</span>";
    roomBtn.onclick=()=>{
      closeCourseSheet();
      roomQuery=course.room;
      goto("teremkereso");
    };
    body.appendChild(roomBtn);
  }

  const infoBtn=E("button");infoBtn.type="button";infoBtn.className="sheet-action";
  infoBtn.innerHTML=svgInfo+"<span>Tantárgy infó</span>";
  infoBtn.onclick=()=>showCourseInfo(course);
  body.appendChild(infoBtn);

  document.getElementById("courseSheet").classList.add("show");
  document.getElementById("courseSheet").setAttribute("aria-hidden","false");
  document.getElementById("sheetScrim").classList.add("show");
}
const GRADE_COLOR_RULES=[
  [/nem felelt meg|elégtelen/i,"#e5484d"],
  [/elégséges/i,"#f0a336"],
  [/közepes/i,"#e0b400"],
  [/\bjó(?=\s|\(|$)/i,"#8fbf5a"],
  [/jeles|megfelelt/i,"#2fa86a"],
];
function gradeColor(text){
  for(const[re,color] of GRADE_COLOR_RULES){if(re.test(text))return color;}
  return null;
}
function docSection(label,items,gradeColored){
  if(!items||items.length===0)return null;
  const sec=E("div");sec.className="doc-section";
  const h=E("h4");h.textContent=label;sec.appendChild(h);
  const ul=E("ul");ul.className="doc-list";
  items.forEach(t=>{
    const li=E("li");li.textContent=t;
    if(gradeColored){
      const c=gradeColor(t);
      if(c){
        li.style.borderLeft=`3px solid ${c}`;
        li.style.background=c+"14";
        li.classList.add("doc-graded");
        if(t.length<50){li.style.color=c;li.style.fontWeight="700";}
      }
    }
    ul.appendChild(li);
  });
  sec.appendChild(ul);
  return sec;
}
async function showCourseInfo(course){
  const body=document.getElementById("sheetBody");body.innerHTML="";

  const backBtn=E("button");backBtn.type="button";backBtn.className="sheet-action sheet-back";
  backBtn.innerHTML=svgBack+"<span>Vissza</span>";
  backBtn.onclick=()=>openCourseSheet(course);
  body.appendChild(backBtn);

  const title=E("div");title.className="sheet-title";title.textContent="Tantárgy infó";
  const sub=E("div");sub.className="sheet-sub";sub.textContent=course.name;
  body.appendChild(title);body.appendChild(sub);

  const content=E("div");content.className="sheet-doc";
  const loading=E("div");loading.className="doc-summary";loading.textContent="Betöltés…";
  content.appendChild(loading);
  body.appendChild(content);

  const slug=COURSE_DOC_ALIASES[course.name];
  if(!slug){
    content.innerHTML="";
    const empty=E("div");empty.className="sheet-doc-empty";empty.textContent="Ehhez a tárgyhoz még nincs feltöltve infó.";
    content.appendChild(empty);
    return;
  }
  try{
    const text=await fetchLocal(`course_data/${slug}.json`);
    const doc=JSON.parse(text);
    content.innerHTML="";
    if(doc.code||doc.instructor){
      const meta=E("div");meta.className="doc-meta";
      meta.textContent=[doc.code,doc.instructor].filter(Boolean).join(" · ");
      content.appendChild(meta);
    }
    if(doc.summary){
      const sum=E("div");sum.className="doc-summary";sum.textContent=doc.summary;
      content.appendChild(sum);
    }
    const topics=docSection("Tematika",doc.topics);if(topics)content.appendChild(topics);
    const grading=docSection("Értékelés",doc.grading,true);if(grading)content.appendChild(grading);
    const rules=docSection("Egyéb szabályok",doc.rules);if(rules)content.appendChild(rules);
    if(doc.links&&doc.links.length){
      const sec=E("div");sec.className="doc-section doc-links";
      const h=E("h4");h.textContent="Linkek";sec.appendChild(h);
      const ul=E("ul");ul.className="doc-list";
      doc.links.forEach(l=>{
        const li=E("li");
        if(/^https?:\/\//.test(l)){const a=E("a");a.href=l;a.target="_blank";a.rel="noopener noreferrer";a.textContent=l;li.appendChild(a);}
        else li.textContent=l;
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      content.appendChild(sec);
    }
    if(doc.updated){
      const upd=E("div");upd.className="doc-updated";upd.textContent="Utolsó módosítás: "+doc.updated;
      content.appendChild(upd);
    }
  }catch(e){
    content.innerHTML="";
    const empty=E("div");empty.className="sheet-doc-empty";empty.textContent="Ehhez a tárgyhoz még nincs feltöltve infó.";
    content.appendChild(empty);
  }
}
function closeCourseSheet(){
  document.getElementById("courseSheet").classList.remove("show");
  document.getElementById("courseSheet").setAttribute("aria-hidden","true");
  document.getElementById("sheetScrim").classList.remove("show");
  sheetCourse=null;
}
document.getElementById("sheetScrim").onclick=closeCourseSheet;

function rail(){
  const r=document.getElementById("rail");r.innerHTML="";
  if(!isScheduleView(view)){
    const wrap=E("div");wrap.className="rail-label-wrap";
    const label=E("div");label.className="rail-label";
    label.textContent=view==="checklist"?((getChecklist(activeChecklistId)||{}).name||"Lista"):PAGE_LABELS[view];
    wrap.appendChild(label);r.appendChild(wrap);
    return;
  }
  const dataset=datasetFor(view);
  DAYS.forEach((d,i)=>{
    const n=dataset.filter(e=>e[0]===i).length;
    const b=E("button");b.className="dbtn"+(i===curDay?" on":"")+(n===0?" free":"");
    b.innerHTML=SHORT[i]+(n?`<span class="cnt">${n}</span>`:"");
    b.onclick=()=>goto(view,i);
    r.appendChild(b);
  });
}

function renderHead(){
  const t=document.getElementById("pageTitle");
  const d=document.getElementById("dateBox");
  if(isScheduleView(view)){
    t.innerHTML=`${PAGE_LABELS[view]}<span class="day" id="dayName">${DAYS[curDay]}</span>`;
    d.hidden=false;
  }else if(view==="checklist"){
    const list=getChecklist(activeChecklistId);
    t.textContent=list?list.name:"Lista";
    d.hidden=true;
  }else{
    t.textContent=PAGE_LABELS[view];
    d.hidden=true;
  }
}

function renderMain(){
  document.getElementById("schedviews").hidden=!isScheduleView(view);
  document.getElementById("codepage").hidden=isScheduleView(view);
  if(isScheduleView(view)){day();week();}
  else if(view==="checklist"){renderChecklistItemsView();}
  else if(view==="teremkereso"){renderRoomSearch();}
  else{renderCodepage();}
}

function day(){
  const items=datasetFor(view).filter(e=>e[0]===curDay);
  document.getElementById("dCount").textContent=items.length||"0";
  const wrap=document.getElementById("list");wrap.innerHTML="";
  if(items.length===0){
    const f=E("div");f.className="freeday";f.innerHTML='<div class="big">Szabadnap</div><div class="s">Nincs egyetlen órád sem. Élvezd.</div>';
    wrap.appendChild(f);return;
  }
  const list=E("div");list.className="list";
  items.forEach(e=>{
    const[,s,en,name,room,who,type,pref]=e;
    const isNow=curDay===nowDay&&nowMin>=mins(s)&&nowMin<mins(en);
    const it=E("div");it.className="item";
    it.innerHTML=
      `<div class="tcol"><div class="s">${s}</div><div class="e">${en}</div></div>`+
      `<div class="card ${type}${isNow?' now':''}">`+
        `<span class="arw">${svgArw}</span>`+
        `<div class="cn">${name}${pref?' <span class="pin">★</span>':''}</div>`+
        `<div class="foot">${svgLoc}<span>${room}${who?' · '+who:''}</span></div>`+
      `</div>`;
    it.onclick=()=>openCourseSheet({name,room,who,s,en,type});
    list.appendChild(it);
  });
  wrap.appendChild(list);
}

function renderCodepage(){
  const el=document.getElementById("codepage");el.innerHTML="";
  const wrap=E("div");wrap.className="codepage";
  if(view==="online"){
    const oc=E("div");oc.className="drchips";
    ONLINE.forEach(([n,m],i)=>{
      const x=E("div");x.className="drchip";x.innerHTML=`<b>${n}</b><span>${m}</span>`;
      x.onclick=()=>openCourseSheet({name:n,meta:m,online:true,type:COLOR_CYCLE[i%4]});
      oc.appendChild(x);
    });
    wrap.appendChild(oc);
  }else{
    const[,rows]=CODES[view==="kotelezo"?0:1];
    rows.forEach(([k,n])=>{
      const r=E("button");r.className="crow";
      r.innerHTML=`<span class="ck">${k}</span><span class="cnm">${n}</span><span class="cic">⧉</span>`;
      r.onclick=()=>navigator.clipboard.writeText(k).then(()=>{
        r.classList.add("copied");r.querySelector(".cic").textContent="✓";
        setTimeout(()=>{r.classList.remove("copied");r.querySelector(".cic").textContent="⧉"},1200);
      });
      wrap.appendChild(r);
    });
    const foot=E("div");foot.style.marginTop="16px";
    const btn=E("button");btn.className="copyall";btn.textContent=`Mind a ${rows.length} kód másolása`;
    btn.onclick=()=>{
      const all=rows.map(r=>r[0]).join("\n");
      navigator.clipboard.writeText(all).then(()=>{
        const o=btn.textContent;btn.textContent=`✓ ${rows.length} kód másolva`;
        setTimeout(()=>btn.textContent=o,1500);
      });
    };
    foot.appendChild(btn);wrap.appendChild(foot);
  }
  el.appendChild(wrap);
}

function matchesRoom(r,q){
  q=q.toLowerCase();
  return r.code.toLowerCase().includes(q)||r.name.toLowerCase().includes(q)||
    r.dept.toLowerCase().includes(q)||r.address.toLowerCase().includes(q)||
    (r.aliases||[]).some(a=>a.toLowerCase().includes(q));
}
function renderRoomSearch(){
  const el=document.getElementById("codepage");el.innerHTML="";
  const wrap=E("div");wrap.className="codepage";

  const input=E("input");input.type="text";input.className="roomsearch-input";
  input.placeholder="Keresés (terem kód, név, épület...)";
  input.value=roomQuery;input.autocomplete="off";
  input.oninput=()=>{roomQuery=input.value;renderRoomResults();};
  wrap.appendChild(input);

  const hint=E("div");hint.className="roomsearch-hint";
  hint.textContent="Az egyetem "+ROOMS.length+" terme kereshető itt.";
  wrap.appendChild(hint);

  const list=E("div");list.className="room-list";list.id="roomResultsList";
  wrap.appendChild(list);

  el.appendChild(wrap);
  renderRoomResults();
}
const ROOM_RESULTS_LIMIT=50;
function renderRoomResults(){
  const list=document.getElementById("roomResultsList");if(!list)return;
  list.innerHTML="";
  const q=roomQuery.trim();
  if(!q){
    const empty=E("div");empty.className="roomsearch-empty";empty.textContent="Kezdj el gépelni a kereséshez.";
    list.appendChild(empty);return;
  }
  const matches=ROOMS.filter(r=>matchesRoom(r,q));
  if(matches.length===0){
    const empty=E("div");empty.className="roomsearch-empty";empty.textContent="Nincs találat.";
    list.appendChild(empty);return;
  }
  const results=matches.slice(0,ROOM_RESULTS_LIMIT);
  results.forEach((r,i)=>{
    const colorKey=COLOR_CYCLE[r.id%COLOR_CYCLE.length];
    const isOpen=openRoomMaps.has(r.id);
    const card=E("div");card.className="card room-card "+colorKey;
    card.style.animationDelay=Math.min(i*30,300)+"ms";
    card.innerHTML=
      `<div class="rc-code">${r.code}</div>`+
      `<div class="rc-name">${r.name}</div>`+
      `<div class="rc-meta">${svgLoc}<span>${r.dept} · ${r.address}</span></div>`+
      `<button type="button" class="rc-mapbtn">${isOpen?"Térkép elrejtése":"Térkép mutatása"}</button>`;
    card.querySelector(".rc-mapbtn").onclick=()=>{
      if(isOpen)openRoomMaps.delete(r.id);else openRoomMaps.add(r.id);
      renderRoomResults();
    };
    if(isOpen){
      const mapWrap=E("div");mapWrap.className="room-map";
      const iframe=E("iframe");iframe.loading="lazy";
      iframe.src="https://www.google.com/maps?q="+encodeURIComponent(r.address)+"&output=embed";
      mapWrap.appendChild(iframe);
      card.appendChild(mapWrap);
    }
    list.appendChild(card);
  });
  if(matches.length>ROOM_RESULTS_LIMIT){
    const more=E("div");more.className="roomsearch-hint";more.style.marginTop="10px";
    more.textContent=`+${matches.length-ROOM_RESULTS_LIMIT} további találat — pontosítsd a keresést.`;
    list.appendChild(more);
  }
}

function renderChecklistItemsView(){
  const el=document.getElementById("codepage");el.innerHTML="";
  const list=getChecklist(activeChecklistId);
  if(!list){el.textContent="";return;}
  const wrap=E("div");wrap.className="codepage";

  const addRow=E("div");addRow.className="additem";
  const input=E("input");input.type="text";input.className="additem-input";
  input.placeholder=list.category==="shopping"?"Új tétel neve":"Új feladat neve";
  const addBtn=E("button");addBtn.className="additem-btn";addBtn.textContent="Hozzáadás";
  const doAdd=()=>{
    const val=input.value.trim();if(!val)return;
    addItem(list.id,val);input.value="";renderChecklistItemsView();
  };
  addBtn.onclick=doAdd;
  input.onkeydown=e=>{if(e.key==="Enter")doAdd();};
  addRow.appendChild(input);addRow.appendChild(addBtn);
  wrap.appendChild(addRow);

  if(list.items.length===0){
    const empty=E("div");empty.className="checklist-empty";empty.textContent="Még nincs tétel ezen a listán.";
    wrap.appendChild(empty);
  }else if(list.category==="shopping"){
    list.items.forEach(item=>{
      const row=E("div");row.className="shoprow";
      const nm=E("span");nm.className="shopname";nm.textContent=item.name;
      const priceWrap=E("div");priceWrap.className="priceWrap";
      const priceInput=E("input");priceInput.type="number";priceInput.className="priceInput";
      priceInput.value=item.price;priceInput.min="0";
      priceInput.oninput=()=>{
        updateItemPrice(list.id,item.id,Number(priceInput.value)||0);
        sumEl.textContent=calcSum(list).toLocaleString("hu-HU")+" Ft";
      };
      const ftLabel=E("span");ftLabel.className="ftlabel";ftLabel.textContent="Ft";
      const delBtn=E("button");delBtn.className="itemdel";delBtn.innerHTML="✕";delBtn.type="button";
      delBtn.onclick=()=>{removeItem(list.id,item.id);renderChecklistItemsView();};
      priceWrap.appendChild(priceInput);priceWrap.appendChild(ftLabel);
      row.appendChild(nm);row.appendChild(priceWrap);row.appendChild(delBtn);
      wrap.appendChild(row);
    });
    const sumRow=E("div");sumRow.className="sumrow";
    sumRow.innerHTML="<span>Összesen</span>";
    const sumEl=E("span");sumEl.id="checklistSum";sumEl.textContent=calcSum(list).toLocaleString("hu-HU")+" Ft";
    sumRow.appendChild(sumEl);
    wrap.appendChild(sumRow);
  }else{
    list.items.forEach(item=>{
      const row=E("label");row.className="taskrow";
      row.style.setProperty("--task-ac",`var(--${list.colorKey}-ac)`);
      const cb=E("input");cb.type="checkbox";cb.checked=item.done;
      cb.onchange=()=>{toggleItemDone(list.id,item.id);};
      const box=E("span");box.className="taskbox";
      const txt=E("span");txt.className="tasktxt";txt.textContent=item.name;
      const delBtn=E("button");delBtn.className="itemdel";delBtn.innerHTML="✕";delBtn.type="button";
      delBtn.onclick=(e)=>{e.preventDefault();e.stopPropagation();removeItem(list.id,item.id);renderChecklistItemsView();};
      row.appendChild(cb);row.appendChild(box);row.appendChild(txt);row.appendChild(delBtn);
      wrap.appendChild(row);
    });
  }
  el.appendChild(wrap);
}

/* ---------- panels ---------- */
function renderNav(){
  const wrap=document.getElementById("navbody");wrap.innerHTML="";
  NAV_LINKS.forEach(item=>{
    const b=E("button");b.className="navlink"+(view===item.id?" active":"");
    b.textContent=item.label;
    b.onclick=()=>{goto(item.id);closeDrawer();};
    wrap.appendChild(b);
  });
}

function renderChecklistPanel(){
  const wrap=document.getElementById("navbody");wrap.innerHTML="";

  if(!checklistFormOpen){
    const newBtn=E("button");newBtn.className="cl-newbtn";newBtn.textContent="+ Új lista";
    newBtn.onclick=()=>{checklistFormOpen=true;renderChecklistPanel();};
    wrap.appendChild(newBtn);
  }else{
    const form=E("div");form.className="cl-form";
    const pick=E("div");pick.className="cl-catpick";
    Object.entries(CATS).forEach(([key,cat])=>{
      const b=E("button");b.type="button";b.className="cl-cat"+(checklistFormCat===key?" active":"");
      b.textContent=cat.label;
      b.onclick=()=>{checklistFormCat=key;renderChecklistPanel();};
      pick.appendChild(b);
    });
    form.appendChild(pick);
    const nameInput=E("input");nameInput.className="cl-name-input";nameInput.type="text";nameInput.placeholder="Lista neve";
    form.appendChild(nameInput);
    const confirmBtn=E("button");confirmBtn.type="button";confirmBtn.className="cl-confirm";confirmBtn.textContent="Létrehozás";
    confirmBtn.onclick=()=>{
      const val=nameInput.value.trim();if(!val)return;
      createChecklist(checklistFormCat,val);
      checklistFormOpen=false;
      renderChecklistPanel();
    };
    nameInput.onkeydown=e=>{if(e.key==="Enter")confirmBtn.click();};
    form.appendChild(confirmBtn);
    wrap.appendChild(form);
    setTimeout(()=>nameInput.focus(),50);
  }

  checklists.forEach(list=>{
    const row=E("button");row.className="cl-row"+(view==="checklist"&&activeChecklistId===list.id?" active":"");
    const icon=E("span");icon.className="cl-icon";
    icon.style.background=`var(--${list.colorKey}-bg)`;icon.style.color=`var(--${list.colorKey}-tx)`;
    icon.innerHTML=CATS[list.category].icon;
    const name=E("span");name.className="cl-name";name.textContent=list.name;
    const del=E("button");del.className="cl-del";del.innerHTML="✕";del.type="button";
    del.onclick=(e)=>{
      e.stopPropagation();
      if(confirm(`Biztosan törlöd: "${list.name}"?`)){
        deleteChecklist(list.id);
        if(activeChecklistId===list.id)goto("schedule");
        renderChecklistPanel();
      }
    };
    row.appendChild(icon);row.appendChild(name);row.appendChild(del);
    row.onclick=()=>{openChecklist(list.id);closeDrawer();};
    wrap.appendChild(row);
  });
}

function renderSettingsPanel(){
  const wrap=document.getElementById("navbody");wrap.innerHTML="";

  const themeSection=E("div");themeSection.className="set-section";
  const themeLabel=E("div");themeLabel.className="set-label";themeLabel.textContent="Megjelenés";
  const themeRow=E("div");themeRow.className="set-row";
  themeRow.innerHTML="<span>Sötét mód</span>";
  const sw=E("label");sw.className="switch";
  const cb=E("input");cb.type="checkbox";cb.checked=getTheme()==="dark";
  cb.onchange=()=>applyTheme(cb.checked?"dark":"light");
  const track=E("span");track.className="track";
  sw.appendChild(cb);sw.appendChild(track);
  themeRow.appendChild(sw);
  themeSection.appendChild(themeLabel);themeSection.appendChild(themeRow);
  wrap.appendChild(themeSection);

  const exSection=E("div");exSection.className="set-section";
  const exLabel=E("div");exLabel.className="set-label";exLabel.textContent="Órarend exportálása";
  const exRow=E("div");exRow.className="exportbtns";
  const errBox=E("div");errBox.className="export-err";errBox.id="exportErr";errBox.hidden=true;
  const jpgBtn=E("button");jpgBtn.className="exportbtn";jpgBtn.textContent="JPG";
  jpgBtn.onclick=()=>runExport("jpg",jpgBtn,errBox);
  const pdfBtn=E("button");pdfBtn.className="exportbtn";pdfBtn.textContent="PDF";
  pdfBtn.onclick=()=>runExport("pdf",pdfBtn,errBox);
  exRow.appendChild(jpgBtn);exRow.appendChild(pdfBtn);
  exSection.appendChild(exLabel);exSection.appendChild(exRow);exSection.appendChild(errBox);
  wrap.appendChild(exSection);
}

function renderPanel(){
  if(panelMode==="checklist")renderChecklistPanel();
  else if(panelMode==="settings")renderSettingsPanel();
  else renderNav();
}

function syncTriggerStates(){
  const open=document.getElementById("drawer").classList.contains("show");
  document.getElementById("burger").classList.toggle("active",open&&panelMode==="nav");
  document.getElementById("checklistBtn").classList.toggle("active",open&&panelMode==="checklist");
  document.getElementById("gearBtn").classList.toggle("active",open&&panelMode==="settings");
}
function openDrawer(mode){
  panelMode=mode||"nav";
  renderPanel();
  document.getElementById("drawer").classList.add("show");
  document.getElementById("scrim").classList.add("show");
  document.getElementById("drawer").setAttribute("aria-hidden","false");
  syncTriggerStates();
}
function closeDrawer(){
  document.getElementById("drawer").classList.remove("show");
  document.getElementById("scrim").classList.remove("show");
  document.getElementById("drawer").setAttribute("aria-hidden","true");
  checklistFormOpen=false;
  syncTriggerStates();
}
function toggleDrawer(mode){
  const isOpen=document.getElementById("drawer").classList.contains("show");
  if(isOpen&&panelMode===mode)closeDrawer();
  else openDrawer(mode);
}
document.getElementById("burger").onclick=()=>toggleDrawer("nav");
document.getElementById("checklistBtn").onclick=()=>toggleDrawer("checklist");
document.getElementById("gearBtn").onclick=()=>toggleDrawer("settings");
document.getElementById("scrim").onclick=closeDrawer;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeDrawer();closeCourseSheet();}});

function buildWeekGrid(dataset){
  dataset=dataset||EV;
  const grid=E("div");grid.className="weekgrid";
  DAYS.forEach((d,i)=>{
    const items=dataset.filter(e=>e[0]===i);
    const col=E("div");col.className="wcol"+(i===nowDay?" today":"")+(items.length===0?" freecol":"");
    col.innerHTML=`<div class="wh"><span class="wn">${d}</span><span class="wc">${items.length?items.length+" óra":"szabad"}</span></div>`;
    const cards=E("div");cards.className="wcards";
    if(items.length===0){cards.innerHTML='<div class="wempty">Szabadnap</div>';}
    else items.forEach(e=>{
      const[,s,en,name,room,who,type,pref]=e;
      const isNow=i===nowDay&&nowMin>=mins(s)&&nowMin<mins(en);
      const c=E("div");c.className="wcard "+type+(isNow?" now":"");
      c.innerHTML=`<div class="wt">${s}–${en}</div><div class="wnm">${name}${pref?' ★':''}</div>`+
        `<div class="wr">${svgLoc}<span>${room}</span></div>`;
      cards.appendChild(c);
    });
    col.appendChild(cards);grid.appendChild(col);
  });
  return grid;
}
function week(){
  const w=document.getElementById("week");w.innerHTML="";
  w.appendChild(buildWeekGrid(datasetFor(view)));
}

/* ---------- export ---------- */
const EXPORT_LIGHT_VARS={
  "--bg":"#ffffff","--ink":"#1d2233","--ink-2":"#5a6178","--faint":"#9aa0b4","--hair":"#eef0f4",
  "--ea-bg":"#e8f3f4","--ea-tx":"#1f6b74","--ea-ac":"#2fa8b5",
  "--gy-bg":"#fdeee6","--gy-tx":"#a2542c","--gy-ac":"#e8834b",
  "--pr-bg":"#eeeafb","--pr-tx":"#5a3fa8","--pr-ac":"#8b6de0",
  "--mt-bg":"#e8f1ea","--mt-tx":"#356148","--mt-ac":"#5fa87c",
};
async function exportSchedule(format){
  if(typeof html2canvas!=="function"||!window.jspdf){
    throw new Error("A képexportáláshoz szükséges könyvtár nem töltődött be. Ellenőrizd az internetkapcsolatot, vagy hogy egy hirdetésblokkoló nem tiltja-e a cdnjs.cloudflare.com-ot.");
  }
  const wrap=E("div");wrap.className="export-capture";
  wrap.style.width="1360px";wrap.style.padding="32px";wrap.style.background="#ffffff";
  wrap.style.fontFamily="var(--sans)";
  Object.entries(EXPORT_LIGHT_VARS).forEach(([k,v])=>wrap.style.setProperty(k,v));
  const title=E("div");
  title.style.cssText="font-size:26px;font-weight:800;color:#1d2233;margin-bottom:18px;letter-spacing:-.02em;font-family:'Plus Jakarta Sans',sans-serif";
  title.textContent="Órarend";
  wrap.appendChild(title);
  wrap.appendChild(buildWeekGrid());
  document.body.appendChild(wrap);
  await new Promise(r=>setTimeout(r,50));
  const canvas=await html2canvas(wrap,{backgroundColor:"#ffffff",scale:2});
  document.body.removeChild(wrap);

  if(format==="jpg"){
    const a=E("a");
    a.href=canvas.toDataURL("image/jpeg",0.95);
    a.download="orarend.jpg";
    a.click();
  }else{
    const imgData=canvas.toDataURL("image/jpeg",0.95);
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF({orientation:canvas.width>canvas.height?"landscape":"portrait",unit:"px",format:[canvas.width,canvas.height]});
    pdf.addImage(imgData,"JPEG",0,0,canvas.width,canvas.height);
    pdf.save("orarend.pdf");
  }
}
async function runExport(format,btn,errBox){
  const orig=btn.textContent;
  btn.disabled=true;btn.textContent="...";
  if(errBox){errBox.hidden=true;errBox.textContent="";}
  try{await exportSchedule(format);}
  catch(err){
    console.error(err);
    if(errBox){errBox.textContent=err&&err.message?err.message:"Az exportálás sikertelen.";errBox.hidden=false;}
  }
  finally{btn.disabled=false;btn.textContent=orig;}
}

async function init(){
  try{
    await loadScheduleData();
    rail();
    renderHead();
    renderMain();
  }catch(e){
    console.error(e);
    document.getElementById("list").innerHTML=
      '<div class="freeday"><div class="big">Hiba az adatok betöltésekor</div>'+
      '<div class="s">Ellenőrizd a schedule_data/ mappa JSON fájljait.</div></div>';
  }
}
init();
