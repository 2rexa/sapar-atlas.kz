"use strict";
const $ = (selector) => document.querySelector(selector);
const main = $("#main");
const navKeys = ["home","routes","map","plan","hotels","moments","weather","saved","reviews","assistant"];
const glyphs = {
home:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
routes:'<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H16a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h7.5"/>',
map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
plan:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 5h6"/>',
moments:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3V9Z"/>',
weather:'<path d="M12 2v2m-7 1 1 1M2 12h2m16-7-1 1m3 6h-2M7 14a5 5 0 1 1 9-4"/><path d="M7 20h12a3 3 0 1 0-2.7-4.3A4.7 4.7 0 0 0 7.5 16H7a2 2 0 0 0 0 4Z"/>',
saved:'<path d="M6 4h12v17l-6-4-6 4V4Z"/>',
reviews:'<path d="M20 15a2 2 0 0 1-2 2H9l-5 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10Z"/><path d="M8 8h8m-8 4h5"/>',
hotels:'<path d="M3 4v16m18-7v7M3 16h18v-3a2 2 0 0 0-2-2h-8v5m-8-6h3a2 2 0 0 1 2 2v4"/>',
compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
moon:'<path d="M20.8 13A8.8 8.8 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>',
menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
pin:'<path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
cafe:'<path d="M4 8h13v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm13 1h2a2 2 0 0 1 0 4h-2M3 21h17M8 3v2m4-2v2"/>',
toilet:'<circle cx="12" cy="5" r="2"/><path d="M9 21v-5m6 5v-5M7 15l3-6h4l3 6H7Z"/>',
hotel:'<path d="M3 5v15m18-7v7M3 16h18v-3a2 2 0 0 0-2-2h-8v5m-5-5h2v2H6z"/>',
budget:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 9h6m-6 2h6m-3 0v5"/>'
};
const icon = (name) => '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+(glyphs[name] || glyphs.pin)+'</svg>';
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem("sapar-v2-"+key)) ?? fallback; } catch { return fallback; }
}
function writeLocal(key, value) {
  try { localStorage.setItem("sapar-v2-"+key, JSON.stringify(value)); } catch { /* session state still works */ }
}
const codes = ["ru","kk","en"];
let language = codes.indexOf(readLocal("language","ru"));
if (language < 0) language = 0;
const t = (key) => (ASSISTANT_UI[key] || ROUND_UI[key] || EXPLORE_UI[key] || TRAVEL_UI[key] || UI[key])[language];
const tr = (ru,kk,en) => [ru,kk,en][language];
const localized = (ru, values) => language ? values[language-1] : ru;
const dateNow = () => new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Qyzylorda",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const saved = readLocal("saved",{route:[],place:[]});
let notes = readLocal("notes",[]);
let plan = readLocal("plan",{date:dateNow(),hours:3,budget:15000,dest:""});
if(plan.date < dateNow()) plan.date = dateNow();
let weather = {date:dateNow(),dest:0,status:""};
let geo = null;
let geoError = false;
let mapMode = "country", region = "", category = "all", radius = 2, mapBudget = false, selectedPoint = "", mapRoute = 0;
let view = "", viewId = "";
const typeKeys = {"город":"city","природа":"nature","история":"history"};
const seasonKeys = {"Все сезоны":"year","Весна":"spring","Лето":"summer","Осень":"autumn","Зима":"winter"};
const seasonList = (r) => r.season.split(", ").map(value=>seasonKeys[value]);
const name = (p) => localized(p.name, DEST_NAMES[p.id]);
const routeName = (r) => localized(r.name, ROUTE_NAMES[r.id]);
const summary = (r) => localized(r.summary, ROUTE_TEXT[r.id]);
const season = (r) => seasonList(r).map(t).join(" · ");
const destText = (p) => localized(p.description, DEST_TEXT[p.id]);
function regionName(value) {
  return value.split(" / ").map(part => {
    const index = DATA.regions.indexOf(part.replace(/ область$/, ""));
    if(index < 0) return part;
    if(index >= 17) return localized(DATA.regions[index],REGION_NAMES[index]) +(index===18 ? tr(" (город)"," (қала)"," (city)") : "");
    return tr(DATA.regions[index]+" область", REGION_NAMES[index][0]+" облысы",REGION_NAMES[index][1]+" Region");
  }).join(" / ");
}
const money = (value) => typeof value === "number" ? new Intl.NumberFormat(codes[language]).format(value)+" ₸" : t("budgetUnknown");
const asset = (url) => url.replace(/^\//,"");
const photo = (p) => asset(p.cover || p.image);
const btn = (label, href, style="light", symbol="") => '<a class="btn btn-'+style+'" href="'+esc(href)+'">'+(symbol?icon(symbol):"")+esc(label)+'</a>';
const action = (label, act, style="light", symbol="", data="") => '<button type="button" class="btn btn-'+style+'" data-act="'+act+'" '+data+'>'+(symbol?icon(symbol):"")+esc(label)+'</button>';
const chip = (label, act, value, active) => '<button type="button" class="chip" data-act="'+act+'" data-value="'+esc(value)+'" aria-pressed="'+active+'">'+esc(label)+'</button>';
const options = (items, current) => items.map(([id,label])=>'<option value="'+esc(id)+'" '+(String(id)===String(current)?"selected":"")+'>'+esc(label)+'</option>').join("");
const heading = (title,sub="") => '<div class="section-head"><h1 tabindex="-1">'+esc(title)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':"")+'</div>';
const destOptions = () => DATA.catalog.map(p=>[p.id,name(p)]);
const routeOptions = () => DATA.routes.map(r=>[r.id,routeName(r)]);
const ext = (label,link) => '<a class="text-link" href="'+esc(link)+'" target="_blank" rel="noopener">'+esc(label)+'</a>';
const osm = (pos) => 'https://www.openstreetmap.org/?mlat='+pos[0]+'&mlon='+pos[1]+'#map=17/'+pos.join("/");
const announce = (value) => { $("#announcement").textContent=value; };
function routeFacts(r) {
  const facts = [["clock", r.hours+" "+t("hours")],["budget",routeBudget(r)],["pin",r.points.length+" "+t("stopsUnit")]];
  return '<div class="facts">'+facts.map(([i,s])=>'<span>'+icon(i)+esc(s)+'</span>').join("")+'</div>';
}
function routeCard(r,compare=false) {
  const p = DATA.catalog[r.ids[0]];
  return '<article class="card"><a href="#route/'+r.id+'" aria-label="'+esc(routeName(r))+'"><img src="'+photo(p)+'" alt="" loading="lazy"></a><div class="card-body"><span class="eyebrow">'+esc(season(r))+'</span><h3><a href="#route/'+r.id+'">'+esc(routeName(r))+'</a></h3>'+routeFacts(r)+(compare?roadControls("route",r.id):"")+btn(t("openRoute"),"#route/"+r.id)+'</div></article>';
}
function destCard(p) {
  return '<article class="card"><a href="#place/'+p.id+'" aria-label="'+esc(name(p))+'"><img src="'+photo(p)+'" alt="" loading="lazy"></a><div class="card-body"><span class="eyebrow">'+esc(regionName(p.region))+'</span><h3><a href="#place/'+p.id+'">'+esc(name(p))+'</a></h3><p>'+esc(destText(p))+'</p></div></article>';
}
function start() {
  const featured = DATA.routes[0];
  main.innerHTML = '<section class="hero"><img class="hero-image" src="'+photo(DATA.catalog[12])+'" alt="" fetchpriority="high"><div class="hero-copy"><span class="eyebrow">'+t("heroKicker")+'</span><h1 tabindex="-1">'+t("heroTitle")+'<br><span>'+t("heroLine")+'</span></h1><p>'+t("heroText")+'</p><div class="actions">'+btn(t("planTrip"),"#plan","peach","plan")+btn(t("openMap"),"#map","glass","map")+'</div></div><a class="hero-caption" href="#place/12">'+icon("pin")+t("heroCaption")+'</a></section>'+
  '<div class="home-grid"><article class="panel photo-panel"><div class="photo-copy"><span class="eyebrow">'+t("feature")+'</span><h2>'+esc(routeName(featured))+'</h2><p>'+t("featuredText")+'</p>'+routeFacts(featured)+'<div class="actions">'+btn(t("openRoute"),"#route/0","primary","routes")+'</div></div><img src="'+photo(DATA.catalog[0])+'" alt=""></article>'+
  '<article class="panel mini-map"><h2>'+t("country")+'</h2><p class="muted">'+t("mapHint")+'</p><svg viewBox="0 0 700 410" aria-hidden="true"><path class="map-mini-fill" d="'+DATA.geometry.outline+'"/><circle cx="420" cy="150" r="8" fill="#ad6845"/></svg>'+btn(t("openMap"),"#map","light","map")+'</article></div>'+
  '<div class="section-row"><h2>'+t("routes")+'</h2>'+btn(t("showAll"),"#routes")+'</div><div class="grid">'+[1,3,4].map(i=>routeCard(DATA.routes[i])).join("")+'</div>';
}
const astana = [
{address:["Бульвар Нуржол, 14","Нұржол бульвары, 14","14 Nurzhol Boulevard"],hours:"10:00–21:00",cost:2500,mins:50,source:"https://kazakhstan.travel/ru/attractions/423", description:["Поднимитесь на смотровую площадку. В смете взрослый билет.","Шолу алаңына көтеріліңіз. Шығынға ересек билет кірген.","Visit the observation deck. The estimate includes one adult ticket."]},
{address:["Достык, 9 · ТРЦ «Керуен»","Достық, 9 · «Керуен» СОО","9 Dostyk Street · Keruen mall"],hours:"10:00–22:00",cost:2000,mins:35,source:"https://banqet.kz/vendors/coffeeday-trc-keruen-astana",description:["Пауза на кофе. Цена и часы работы ориентировочные.","Кофе ішуге аялдаңыз. Бағасы мен жұмыс уақыты шамамен көрсетілген.","Stop for coffee. Price and opening hours are approximate."]},
{address:["Проспект Туран, 37","Тұран даңғылы, 37","37 Turan Avenue"],hours:"10:00–22:00",cost:0,mins:45,source:"https://visitastana.kz/about-city/what-to-see/trts-khan-shatyr/",description:["Завершите прогулку осмотром архитектуры. Аттракционы оплачиваются отдельно.","Серуенді ғимарат сәулетін тамашалаумен аяқтаңыз. Аттракциондарға бөлек төленеді.","Finish by taking in the architecture. Attractions inside are priced separately."]},
{name:["Туалет в Хан Шатыре","Хан Шатырдағы дәретхана","Toilet at Khan Shatyr"],address:["Проспект Туран, 37 · внутри ТРЦ","Тұран даңғылы, 37 · СОО ішінде","37 Turan Avenue · inside the mall"],source:"https://yandex.kz/maps/ru/org/khan_shatyr/1242866159/inside/",description:["Условия доступа, этаж и часы уточняйте в ТРЦ. Метка указывает на здание.","Қабатын, жұмыс уақытын және кіру шарттарын сауда орталығынан нақтылаңыз. Белгі ғимаратты көрсетеді.","Ask the mall about the floor, hours and access. The marker points to the building."]}
];
function routePoints(r) {
  return r.points.map(([raw,lat,lon],i)=>{
    const a = r.id===0 ? astana[i] : null;
    const attractionId=({0:[423,null,449],1:[null,null,527,527],2:[371],4:[65],6:[null,null,326]})[r.id]?.[i];
    return {id:"s"+i,name:localized(raw,STOP_NAMES[r.id][i]),pos:[lat,lon],type:a&&i===1?"cafe":"sight",n:i+1,cost:a?.cost,address:a?.address[language],hours:a?.hours,mins:a?.mins,description:a?.description[language],source:a?.source,attractionId};
  });
}
function pointDetails(p) {
  return '<h3>'+esc(p.name)+'</h3>'+(p.description?'<p>'+esc(p.description)+'</p>':"")+'<dl class="details">'+[[t("address"),p.address||t("unknown")],[t("opening"),p.hours||t("unknown")],[t("budget"),money(p.cost)]].map(([key,val])=>'<dt>'+esc(key)+'</dt><dd>'+esc(val)+'</dd>').join("")+'</dl><div class="actions">'+ext(t("openDirections"),osm(p.pos))+(p.source?ext(t("source"),p.source):"")+(p.attractionId?btn(t("placeVideo"),"#attraction/"+p.attractionId+"?video=1","light","moments"):"")+'</div>';
}
function saveControl(kind,id) {
  const on = saved[kind].includes(id);
  return action(t(kind==="route"?(on?"savedRoute":"save"):(on?"savedPlace":"savePlace")),"save",on?"primary":"light","saved",'data-kind="'+kind+'" data-id="'+id+'" aria-pressed="'+on+'"');
}
function showRoute(r) {
  const p=DATA.catalog[r.ids[0]], points=routePoints(r);
  const selected=points.find(s=>s.id===selectedPoint) || points[0];
  main.innerHTML='<section class="detail-top"><div><span class="eyebrow">'+esc(regionName(p.region))+'</span><h1 tabindex="-1">'+esc(routeName(r))+'</h1><p>'+esc(summary(r))+'</p>'+routeFacts(r)+'<div class="actions">'+saveControl("route",r.id)+btn(t("checkFit"),"#plan/"+p.id,"primary","plan")+'</div></div><img src="'+photo(p)+'" alt=""></section>'+
   '<div class="split"><div class="stack"><section class="panel"><h2>'+t("routeStops")+'</h2><ol class="stops">'+points.map(s=>'<li class="stop"><span class="number">'+s.n+'</span><button type="button" data-act="point" data-value="'+s.id+'" aria-pressed="'+(s.id===selected.id)+'"><strong>'+esc(s.name)+'</strong>'+(s.mins?'<small>'+s.mins+' '+t("minutes")+' · '+money(s.cost)+'</small>':"")+'</button></li>').join("")+'</ol></section><section id="point-detail" class="panel">'+pointDetails(selected)+'</section></div>'+
   '<div class="stack"><section class="panel"><h2>'+t("mapRoute")+'</h2>'+drawMap(points,points,selected.id)+'<p class="credit">'+t("schematic")+'</p>'+btn(t(r.id===0?"showRoutePlaces":"openMap"),"#map/"+r.id,"primary","map")+'</section>'+budgetDetails(r)+'<section class="panel"><h2>'+t("tripEstimate")+'</h2>'+roadControls("route",r.id)+(departure()?roadAttribution()+mapDirections(routeDeparture(r)):"")+ '</section></div></div>';
}
function showPlace(p) {
  const linked=DATA.routes.filter(r=>r.ids.includes(p.id));
  const localMoment=p.id===1?DATA.moments[0]:null;
  const footage=ATTRACTION_VIDEOS[DESTINATION_FOOTAGE[p.id]];
  main.innerHTML='<section class="detail-top"><div><span class="eyebrow">'+esc(regionName(p.region))+'</span><h1 tabindex="-1">'+esc(name(p))+'</h1><p>'+esc(destText(p))+'</p><div class="actions">'+saveControl("place",p.id)+btn(t("weather"),"#weather/"+p.id)+ext(t("openDirections"),osm(p.pos))+'</div></div><img src="'+photo(p)+'" alt=""></section>'+
    (localMoment&&!footage?'':videoMarkup(name(p),regionName(p.region),footage))+(localMoment?'<section class="panel spaced"><h2>'+esc(localized(localMoment.title,VIDEO_NAMES[0]))+'</h2><video class="video native-clip" controls playsinline preload="none" poster="'+asset(localMoment.poster)+'"><source type="video/webm" src="'+asset(localMoment.file)+'"></video></section>':'')+(linked.length?'<h2>'+t("linkedRoutes")+'</h2><div class="grid">'+linked.map(routeCard).join("")+'</div>':"")+'<p class="credit spaced">'+t("photo")+' · '+ext(p.credit+" · "+p.license,p.photo)+'</p>';
}
function countryMap() {
  const selected = DATA.catalog.filter(p=>!region||p.region.split(" / ").includes(region));
  const selectedIndex=DATA.regions.indexOf(region);
  const records=selectedIndex<0?[]:attractionsFor(region);
  const paths = DATA.geometry.regions.map(([raw,d])=>{
    const key=raw.replace(/ область$/,"");
    return '<path data-region="'+esc(key)+'" class="'+(region===key?"active":"")+'" tabindex="0" role="button" aria-label="'+esc(regionName(key))+'" aria-pressed="'+(key===region)+'" d="'+d+'"><title>'+esc(regionName(key))+'</title></path>';
  }).join("");
  return '<div class="map-layout"><section class="panel"><h2>'+t("country")+'</h2><svg class="country-svg" viewBox="0 0 700 410" role="group" aria-label="'+t("country")+'">'+paths+'</svg><div class="credit">'+ext(t("travelMap"),"https://www.openstreetmap.org/copyright")+' · '+ext("toponym-kz","https://github.com/ashimov/toponym-kz")+'</div></section><section class="panel"><label class="field">'+t("regionPrompt")+'<select id="region-select">'+options([["",t("allRegions")],...DATA.regions.map(key=>[key,regionName(key)])],region)+'</select></label>'+(selectedIndex>=0?'<p class="catalog-count"><strong>'+records.length+'</strong> · '+t("attractions")+'</p><div class="map-list">'+records.map(p=>'<a class="list-item" href="#attraction/'+p.id+'">'+icon("pin")+esc(attractionName(p))+'</a>').join("")+'</div><div class="actions">'+btn(t("regionHotel"),"#hotels/"+selectedIndex,"light","hotel")+'</div>':'<h3>'+t("destinations")+'</h3><div class="map-list">'+selected.map(p=>'<a class="list-item" href="#place/'+p.id+'">'+icon("pin")+esc(name(p))+'</a>').join("")+'</div>')+'</section></div>';
}
function flat(pos,lat) { return [pos[1]*111.32*Math.cos(lat*Math.PI/180),pos[0]*111.32]; }
function distance(pos, anchors) {
  const a=flat(pos,pos[0]), shape=anchors.map(p=>flat(p,pos[0]));
  if(shape.length===1) return Math.hypot(a[0]-shape[0][0],a[1]-shape[0][1]);
  return Math.min(...shape.slice(1).map((to,i)=>{
    const from=shape[i], dx=to[0]-from[0], dy=to[1]-from[1];
    const length=dx*dx+dy*dy;
    const fraction=length ? Math.min(1,Math.max(0,((a[0]-from[0])*dx+(a[1]-from[1])*dy)/length)) : 0;
    return Math.hypot(a[0]-from[0]-fraction*dx,a[1]-from[1]-fraction*dy);
  }));
}
function drawMap(anchors,points,active) {
  const all=[...anchors,...points];
  const base=all[0].pos;
  const coordinates=all.map(p=>flat(p.pos,base[0]));
  const xs=coordinates.map(p=>p[0]), ys=coordinates.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(565/Math.max(0.1,maxX-minX),248/Math.max(0.1,maxY-minY));
  const xy=(p)=>{
    const [x,y]=flat(p.pos,base[0]);
    return [340+(x-(minX+maxX)/2)*scale,148-(y-(minY+maxY)/2)*scale];
  };
  const line=anchors.length>1?'<polyline points="'+anchors.map(p=>xy(p).join(",")).join(" ")+'" fill="none" stroke="#b36340" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="9 5"/>':"";
  const marker=(p)=>{
    const [x,y]=xy(p);
    const shift=p.id==="mall-wc"?22:0;
    const symbol=p.n || ({cafe:"C",toilet:"WC",hotel:"H",sight:"•",geo:"+"}[p.type]||"•");
    return '<g class="map-point '+(p.id===active?"active":"")+'" data-act="point" data-value="'+esc(p.id)+'" data-type="'+p.type+'" tabindex="0" role="button" aria-label="'+esc(p.name)+'" transform="translate('+x+' '+(y+shift)+')"><title>'+esc(p.name)+'</title><circle r="'+(symbol==="WC"?14:12)+'"/><text text-anchor="middle" y="4">'+symbol+'</text></g>';
  };
  return '<svg class="map-canvas" role="group" aria-label="'+t("mapRoute")+'" viewBox="0 0 680 296"><defs><pattern id="map-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#c6d7c9" stroke-width="1"/></pattern></defs><rect width="680" height="296" fill="url(#map-grid)"/><path d="M635 45l10-24 10 24-10-6Z" fill="#335f4c"/>'+line+points.map(marker).join("")+'</svg>';
}
function routeMap() {
  const r=DATA.routes[mapRoute];
  const stops=routePoints(r);
  const anchor=geo?[{id:"geo",name:t("nearYou"),type:"geo",pos:geo}]:stops;
  const toilet = {...astana[3],name:astana[3].name[language],description:astana[3].description[language],address:astana[3].address[language],pos:stops.at(-1).pos,type:"toilet",id:"mall-wc"};
  const available = [...stops,...(r.id===0?[toilet]:[]),...DATA.infrastructure.map((p,i)=>({...p,id:"i"+i,type:p.category==="restaurant"?"cafe":p.category}))];
  const points = available.map(p=>({...p,distance:distance(p.pos,anchor.map(x=>x.pos))}))
    .filter(p=>p.distance<=radius && (category==="all"||p.type===category) && (!mapBudget||p.cost==null||p.cost<=plan.budget))
    .sort((a,b)=>Number(Boolean(b.n))-Number(Boolean(a.n))||a.distance-b.distance).slice(0,32);
  const current=points.find(p=>p.id===selectedPoint) || points[0];
  const drawn = geo?[...anchor,...points]:points;
  return '<div class="map-layout"><section class="panel"><h2>'+t(geo?"nearYou":"mapRoute")+'</h2>'+drawMap(anchor,drawn,current?.id)+'<p class="credit">'+t("schematic")+'</p><div class="actions map-actions">'+ext(t("openDirections"),osm(anchor[0].pos))+ext(t("travelMap"),"https://www.openstreetmap.org/copyright")+'</div>'+(current?'<div id="point-detail" class="spaced">'+pointDetails(current)+'</div>':"")+'</section>'+
    '<section class="panel"><h3>'+t("onRoute")+'</h3><div class="filter-stack"><label class="field">'+t("destination")+'<select id="map-route">'+options(routeOptions(),mapRoute)+'</select></label><label class="field">'+t("radius")+'<select id="map-radius">'+options([.5,1,2,5,10,25].map(n=>[n,n+" "+t("km")]),radius)+'</select></label><label class="check"><input type="checkbox" id="map-budget" '+(mapBudget?"checked":"")+'>'+t("withinBudget")+' · '+money(plan.budget)+'</label></div><div class="chips">'+["all","sight","cafe","toilet","hotel"].map(c=>chip(t(c),"category",c,c===category)).join("")+'</div><div class="map-list">'+(points.length?points.map(p=>'<button type="button" class="list-item" data-act="point" data-value="'+p.id+'" aria-pressed="'+(current?.id===p.id)+'">'+icon(p.type)+esc(p.name)+'<small>'+p.distance.toFixed(2)+' '+t("km")+'</small></button>').join(""):'<p>'+t("noResults")+'</p>')+'</div><div class="actions">'+action(t("nearMe"),"locate","light","pin")+(geo?action(t("reset"),"geo-reset"):"")+'</div>'+(geoError?'<p role="status">'+t("geoError")+'</p>':"")+'</section></div>';
}
function showMap() {
  main.innerHTML=heading(t("map"),t("mapHint"))+'<div class="filters">'+chip(t("country"),"map-mode","country",mapMode==="country")+chip(t("along"),"map-mode","route",mapMode==="route")+btn(t("placesLocal"),"#routes/nearby","light","pin")+'</div>'+(mapMode==="country"?countryMap():routeMap())+
    attractionDirectory("map")+'<div class="section-row"><h2>'+t("destinations")+'</h2></div><div class="filters"><input id="dest-search" type="search" placeholder="'+t("search")+'" aria-label="'+t("search")+'"></div><div class="grid" id="dest-grid"></div>';
  updateDestList("");
  renderAttractionCards("map");
}
function updateDestList(query) {
  const needle=query.trim().toLocaleLowerCase();
  const places = DATA.catalog.filter(p=>(!region||mapMode==="route"||p.region.split(" / ").includes(region)) && [p.name,...DEST_NAMES[p.id],regionName(p.region)].some(s=>s.toLocaleLowerCase().includes(needle)));
  $("#dest-grid").innerHTML=places.length?places.map(destCard).join(""):'<p>'+t("noResults")+'</p>';
}
const planSeason = (date) => ["winter","winter","spring","spring","spring","summer","summer","summer","autumn","autumn","autumn","winter"][Number(date.slice(5,7))-1];
function reasons(r,trip=routeTrip(r)) {
  const shifts=[];
  if(trip.mins>plan.hours*60) shifts.push(t("moreTime")+" · "+durationText(trip.mins-plan.hours*60));
  if(trip.low>plan.budget) shifts.push(t("moreMoney")+" · "+money(trip.low-plan.budget));
  if(!seasonList(r).some(s=>s==="year"||s===planSeason(plan.date))) shifts.push(t("wrongSeason"));
  return shifts;
}
const input = (label,id,type,value,attributes="")=>'<label class="field">'+esc(label)+'<input name="'+id+'" type="'+type+'" value="'+esc(value)+'" '+attributes+' required></label>';
const select = (label,id,items,current)=>'<label class="field">'+esc(label)+'<select name="'+id+'">'+options(items,current)+'</select></label>';
function showPlan() {
  main.innerHTML=heading(t("plan"),t("planIntro"))+originPanel()+'<div class="split"><form class="panel" id="plan-form"><h2>'+t("conditions")+'</h2>'+
    select(t("destination"),"dest",[["",t("any")],...destOptions()],plan.dest)+input(t("date"),"date","date",plan.date,'min="'+dateNow()+'"')+
    input(t("duration"),"hours","number",plan.hours,'min="0.5" max="999" step="0.5"')+input(t("budget"),"budget","number",plan.budget,'min="0" max="9999999" step="1"')+
    '<div class="actions"><button class="btn btn-primary">'+t("apply")+'</button>'+btn(t("placesLocal"),"#routes/nearby","light","pin")+'</div></form><section class="stack" id="plan-results"></section></div>';
  renderPlanResults();
}
function capturePlanDraft() {
  const form=$("#plan-form");
  if(!form) return;
  const values=new FormData(form);
  const hours=form.elements.hours;
  const budget=form.elements.budget;
  plan={dest:values.get("dest"),date:form.elements.date.validity.valid?values.get("date"):plan.date,
    hours:hours.validity.valid?+values.get("hours"):plan.hours,
    budget:budget.validity.valid?+values.get("budget"):plan.budget};
}
function renderPlanResults() {
  const routes = DATA.routes.filter(r=>plan.dest===""||r.ids.includes(+plan.dest)).map(r=>{
    const trip=routeTrip(r);
    return {r,trip,issues:reasons(r,trip)};
  }).sort((a,b)=>a.issues.length-b.issues.length||Number(Boolean(b.trip.travel))-Number(Boolean(a.trip.travel))||a.trip.low-b.trip.low);
  $("#plan-results").innerHTML=(departure()?'<p class="credit">'+t("roadCompareHelp")+'</p>':"")+(routes.length?routes.map(({r,trip,issues})=>{
    const partial=plan.budget>=trip.low&&plan.budget<trip.high;
    const pending=!trip.travel;
    return '<article class="panel"><h3 class="result-title">'+esc(routeName(r))+'</h3>'+routeFacts(r)+roadControls("route",r.id)+
      '<div class="notice '+(issues.length||partial||pending?"caution":"good")+'"><strong>'+t(issues.length?"notFit":pending?"roadPlanPending":partial?"budgetThreshold":"fit")+'</strong>'+
      (issues.length?'<ul>'+issues.map(v=>'<li>'+esc(v)+'</li>').join("")+'</ul>':partial?'<p>'+t("budgetBuffer")+' · '+money(trip.high-plan.budget)+'</p>':"")+
      '</div><div class="actions">'+btn(t("openRoute"),"#route/"+r.id)+saveControl("route",r.id)+'</div></article>';
  }).join(""):'<div class="notice">'+t("noResults")+'</div>');
}
function showMoments() {
  main.innerHTML=heading(t("moments"),t("attractionVideoIntro"))+attractionDirectory("moments");
  renderAttractionCards("moments");
}
function showWeather() {
  let result = "";
  if(weather.status==="loading") result='<div class="notice" role="status">'+t("loading")+'</div>';
  if(weather.status==="failure") result='<div class="notice caution" role="status">'+t("weatherMissing")+'</div>';
  if(weather.status==="ready") {
    const {min,max,precip,wind,code}=weather.data;
    const measure=(n,u)=>n==null?t("unknown"):Math.round(n)+u;
    result='<section class="panel"><h2>'+esc(name(DATA.catalog[weather.dest]))+'</h2><p class="muted">'+esc(weather.date)+'</p><div class="forecast-temp">'+measure(min,"°")+' / '+measure(max,"°C")+'</div><dl class="details"><dt>'+t("rain")+'</dt><dd>'+measure(precip,"%")+'</dd><dt>'+t("wind")+'</dt><dd>'+measure(wind," "+tr("км/ч","км/сағ","km/h"))+'</dd></dl>'+((wind>=60||code>=95||[66,67].includes(code))?'<p class="notice caution">'+t("warning")+'</p>':"")+'<p class="credit">'+ext("Open-Meteo","https://open-meteo.com/")+'</p></section>';
  }
  main.innerHTML=heading(t("weather"),t("weatherText"))+'<div class="split"><form class="panel" id="weather-form">'+select(t("destination"),"dest",destOptions(),weather.dest)+input(t("date"),"date","date",weather.date,'min="'+dateNow()+'"')+'<button class="btn btn-primary">'+t("forecast")+'</button></form><div>'+result+'</div></div>';
}
async function requestWeather(values) {
  const current = {date:values.get("date"),dest:+values.get("dest"),status:"loading"};
  weather=current;
  showWeather();
  const [latitude,longitude]=DATA.catalog[current.dest].pos;
  const params=new URLSearchParams({latitude,longitude,timezone:"Asia/Almaty",forecast_days:16,daily:"temperature_2m_min,temperature_2m_max,precipitation_probability_max,wind_gusts_10m_max,weather_code"});
  try {
    const response=await fetch("https://api.open-meteo.com/v1/forecast?"+params,{signal:AbortSignal.timeout(10000)});
    if(!response.ok) throw Error("Forecast request failed");
    const {daily}=await response.json(), i=daily.time.indexOf(current.date);
    if(i<0) throw Error("Date unavailable");
    current.data={min:daily.temperature_2m_min[i],max:daily.temperature_2m_max[i],precip:daily.precipitation_probability_max[i],wind:daily.wind_gusts_10m_max[i],code:daily.weather_code[i]};
    current.status="ready";
  } catch {current.status="failure";}
  if(view==="weather"&&weather===current) showWeather();
}
function showSaved() {
  const routes=saved.route.map(id=>DATA.routes[id]).filter(Boolean);
  const places=saved.place.map(id=>DATA.catalog[id]).filter(Boolean);
  main.innerHTML=heading(t("saved"),t("localSaved"))+(routes.length||places.length?
    (routes.length?'<h2>'+t("routes")+'</h2><div class="grid">'+routes.map(routeCard).join("")+'</div>':"")+
    (places.length?'<h2 class="spaced">'+t("destinations")+'</h2><div class="grid">'+places.map(destCard).join("")+'</div>':""):
    '<div class="notice">'+t("empty")+'</div>'+btn(t("showAll"),"#routes","primary"));
}
let reviewRoute = 0;
function showReviews() {
  const routeNotes=notes.filter(n=>n.route===reviewRoute);
  main.innerHTML=heading(t("reviews"),t("reviewIntro"))+'<div class="split"><form class="panel" id="review-form">'+select(t("routes"),"route",routeOptions(),reviewRoute)+select(t("noteType"),"kind",[["review",t("review")],["question",t("question")]],"review")+'<label class="field">'+t("write")+'<textarea name="body" rows="4" maxlength="500" required></textarea></label><button class="btn btn-primary">'+t("add")+'</button></form><section class="panel"><h2>'+esc(routeName(DATA.routes[reviewRoute]))+'</h2><div class="items">'+(routeNotes.length?routeNotes.map(n=>'<article><strong>'+t(n.kind)+'</strong><p>'+esc(n.body)+'</p>'+(n.kind==="question"?'<div class="items">'+n.answers.map(a=>'<article><strong>'+t("answer")+'</strong><p>'+esc(a)+'</p></article>').join("")+'</div><form class="answer-form" data-id="'+esc(n.id)+'"><label class="field">'+t("answer")+'<input name="body" maxlength="300" required></label><button class="btn btn-light">'+t("add")+'</button></form>':"")+'</article>').join(""):'<p>'+t("empty")+'</p>')+'</div></section></div>';
}
function showCredits() {
  main.innerHTML=heading(t("credits"),t("creditsIntro"))+'<section class="panel"><h2>'+t("destinations")+'</h2><ul class="credits-list">'+DATA.catalog.map(p=>'<li><strong>'+esc(name(p))+'</strong> · '+ext(p.credit+" · "+p.license,p.photo)+'</li>').join("")+'</ul><h2>'+t("moments")+'</h2><ul class="credits-list">'+DATA.moments.map((m,i)=>'<li><strong>'+esc(localized(m.title,VIDEO_NAMES[i]))+'</strong> · '+ext(m.author,m.source)+' · '+ext(m.license,m.licenseUrl)+'</li>').join("")+'</ul><h2>'+t("map")+'</h2><p>'+ext(t("travelMap"),"https://www.openstreetmap.org/copyright")+' · '+ext("toponym-kz","https://github.com/ashimov/toponym-kz")+'</p></section>';
}
function renderShell() {
  document.documentElement.lang=codes[language];
  document.title="Sapar Atlas · "+t(view==="route"?"routes":(view==="place"||view==="attraction")?"map":view);
  const active=view==="route"?"routes":(view==="place"||view==="attraction")?"map":view;
  $("#nav").setAttribute("aria-label",t("sections"));
  $("#nav").innerHTML=navKeys.map(key=>'<a class="nav-link" href="#'+key+'" '+(key===active?'aria-current="page"':"")+'>'+icon(key==="assistant"?"reviews":key)+esc(t(key))+'</a>').join("");
  $("#brand-icon").innerHTML=icon("compass");
  $("#side-foot-icon").innerHTML=icon("pin");
  $("#side-caption").textContent=t("sections");
  $("#side-foot").textContent=t("foot");
  $("#breadcrumb").innerHTML='<span>Sapar Atlas /</span> '+esc(t(active));
  $("#languages").setAttribute("aria-label",t("language"));
  $("#languages").innerHTML=[["RU","Русский"],["ҚАЗ","Қазақша"],["EN","English"]].map(([value,label],i)=>'<button type="button" data-act="lang" data-value="'+i+'" aria-label="'+label+'" aria-pressed="'+(language===i)+'">'+value+'</button>').join("");
  $("#menu-toggle").innerHTML=icon("menu");
  $("#menu-toggle").setAttribute("aria-label",t("menu"));
  $("#top-saved").innerHTML=icon("saved");
  $("#top-saved").setAttribute("aria-label",t("saved"));
  $("#credits-link").textContent=t("credits");
  renderThemeToggle();
}
function renderPage() {
  const handlers={home:start,routes:routeCatalogPage,map:showMap,plan:showPlan,hotels:showHotels,moments:showMoments,weather:showWeather,saved:showSaved,reviews:showReviews,credits:showCredits,assistant:showAssistant};
  if(view==="route") showRoute(DATA.routes[+viewId]||DATA.routes[0]);
  else if(view==="place") showPlace(DATA.catalog[+viewId]||DATA.catalog[0]);
  else if(view==="attraction") {
    const point=attractionIndex.get(Number(viewId.split("?")[0]));
    if(point) showAttraction(point);
    else main.innerHTML=heading(t("attractions"),t("noResults"));
  }
  else handlers[view]();
}
function closeMenu() {
  $("#sidebar").classList.remove("open");
  $("#menu-toggle").setAttribute("aria-expanded","false");
}
function navigate(focus=false) {
  const [page="home",id=""]=location.hash.slice(1).split("/");
  view=[...navKeys,"route","place","attraction","credits"].includes(page)?page:"home";
  viewId=id;
  selectedPoint="";
  if(view==="map") {
    mapMode=id!=="" && DATA.routes[+id]?"route":"country";
    if(mapMode==="route") mapRoute=+id;
    geo=null;
    category="all";
    geoError=false;
  }
  if(view==="routes" && id==="nearby") { Object.assign(explore,{tab:"places",region:"",kind:"",query:"",sort:"nearest",near:!!departure(),limit:24}); }
  if(view==="hotels" && id!=="" && DATA.regions[+id]) hotels={...hotels,region:DATA.regions[+id]};
  if(view==="plan" && id!=="" && DATA.catalog[+id]) plan={...plan,dest:+id};
  if(view==="weather" && id!=="" && DATA.catalog[+id]) weather={date:plan.date,dest:+id,status:""};
  closeMenu();
  renderShell();
  renderPage();
  window.scrollTo(0,0);
  if(focus) $("h1")?.focus({preventScroll:true});
  if(view==="attraction" && viewId.endsWith("?video=1")) $("#place-video")?.scrollIntoView({block:"start"});
}
function rerenderControl(selector) {renderPage(); $(selector)?.focus({preventScroll:true});}
function selectRegion(value,focusSvg=false) {
  region=value;
  attractionCardsState.map={query:"",limit:30};
  rerenderControl(focusSvg?'[data-region="'+CSS.escape(value)+'"]':"#region-select");
}
document.addEventListener("click",e=>{
  const regionPath=e.target.closest("[data-region]");
  if(regionPath) {selectRegion(regionPath.dataset.region,true);return;}
  const menu=e.target.closest("#menu-toggle");
  if(menu) {
    const on=$("#sidebar").classList.toggle("open");
    menu.setAttribute("aria-expanded",String(on));
    if(on) $("#nav a")?.focus();
    return;
  }
  if($("#sidebar").classList.contains("open")&&!e.target.closest("#sidebar")) closeMenu();
  const node=e.target.closest("[data-act]");
  if(!node) {
    const link=e.target.closest("#nav a");
    if(link && link.hash===location.hash) {closeMenu();$("h1")?.focus();}
    return;
  }
  const {act,value,id,kind}=node.dataset;
  if(act==="lang"){
    language=+value;
    writeLocal("language",codes[language]);
    renderShell();renderPage();
    $('[data-act="lang"][data-value="'+value+'"]').focus({preventScroll:true});
  }
  if(act==="road") roadRequest(kind,+id);
  if(act==="assistant-prompt") askAtlas(node.textContent.trim());
  if(act==="play-footage") openFootage(node);
  if(act==="more-attractions") {
    attractionCardsState[value].limit+=30;
    renderAttractionCards(value);
    const cards=$("#"+value+"-attraction-results");
    cards.querySelector('.attraction-card:nth-child('+(attractionCardsState[value].limit-29)+') h3 a')?.focus();
  }
  if(act==="theme") toggleTheme();
  if(act==="use-place-start") {
    stopOriginRequest();
    originPrefs.place=Number(value);originPrefs.city=null;originGeo=null;
    writeLocal("origin",originPrefs);
    location.hash="routes/nearby";
  }
  if(act==="origin-clear"||act==="origin-locate") {capturePlanDraft();exploreOriginAction(act);}
  if(act==="explore-tab"){explore.tab=value;rerenderControl('[data-act="explore-tab"][data-value="'+value+'"]');}
  if(act==="more-explore"){
    const index=explore.limit+1;
    explore.limit+=24;
    renderExploreResults();
    $("#explore-results .journey-card:nth-child("+index+") h3 a")?.focus();
  }
  if(act==="map-mode"){mapMode=value;selectedPoint="";rerenderControl('[data-act="map-mode"][data-value="'+value+'"]');}
  if(act==="category"){category=value;selectedPoint="";rerenderControl('[data-act="category"][data-value="'+value+'"]');}
  if(act==="point"){selectedPoint=value;rerenderControl((node.classList.contains("map-point")?".map-point":".panel button")+'[data-act="point"][data-value="'+CSS.escape(value)+'"]');}
  if(act==="save") {
    const target=+id;
    saved[kind]=saved[kind].includes(target)?saved[kind].filter(i=>i!==target):[...saved[kind],target];
    writeLocal("saved",saved);
    rerenderControl('[data-act="save"][data-id="'+id+'"]');
    if(saved[kind].includes(target)) announce(t(kind==="route"?"savedRoute":"savedPlace"));
  }
  if(act==="geo-reset"){geo=null;geoError=false;rerenderControl('[data-act="locate"]');}
  if(act==="locate"){
    const fail=()=>{if(view!=="map"||mapMode!=="route") return; geoError=true;rerenderControl('[data-act="locate"]');};
    if(!navigator.geolocation) return fail();
    node.disabled=true;
    navigator.geolocation.getCurrentPosition(({coords})=>{
      if(view!=="map"||mapMode!=="route") return;
      geo=[coords.latitude,coords.longitude];geoError=false;selectedPoint="";rerenderControl('[data-act="locate"]');
    },fail,{timeout:8000});
  }
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&$("#sidebar").classList.contains("open")) {closeMenu();$("#menu-toggle").focus();}
  if((e.key==="Enter"||e.key===" ")&&e.target.matches("[data-region],.map-point")) {
    e.preventDefault();
    e.target.dispatchEvent(new MouseEvent("click",{bubbles:true}));
  }
});
document.addEventListener("input",e=>{
  if(e.target.id==="dest-search") updateDestList(e.target.value);
  if(e.target.id==="explore-query") {explore.query=e.target.value;explore.limit=24;renderExploreResults();}
  if(e.target.id==="origin-rate" && e.target.value!=="" && e.target.validity.valid) {
    originPrefs.rate=Number(e.target.value);
    writeLocal("origin",originPrefs);
    if(view==="routes") renderExploreResults();
    if(view==="plan") {capturePlanDraft();renderPlanResults();}
  }
  if(e.target.id==="hotel-nights" && e.target.validity.valid) {
    hotels.nights=Number(e.target.value);
    refreshHotelPrices();
  }
  if(e.target.id==="hotel-date" && e.target.validity.valid) {
    hotels.date=e.target.value;
    refreshHotelPrices();
  }
  const kind=e.target.id.match(/^(map|moments)-attraction-query$/)?.[1];
  if(kind) {
    attractionCardsState[kind].query=e.target.value;
    attractionCardsState[kind].limit=30;
    renderAttractionCards(kind);
  }
});
document.addEventListener("change",e=>{
  const field=e.target;
  if(field.id==="origin-city"||field.id==="origin-mode") {
    capturePlanDraft();
    if(field.id==="origin-city") {
      if(field.value==="geo"||field.value==="place") return;
      stopOriginRequest();
      originGeo=null;
      originPrefs.place=null;
      originPrefs.city=field.value===""?null:Number(field.value);
      if(originPrefs.city===null) explore.near=false;
      else {
        if(viewId==="nearby") explore.near=true;
        if(explore.sort==="az") explore.sort="nearest";
      }
    } else originPrefs.mode=field.value;
    originFeedback="";
    saveOrigin("#"+field.id);
  }
  const filter={"explore-region":"region","explore-kind":"kind","explore-sort":"sort","explore-near":"near","ready-sort":"readySort"}[field.id];
  if(filter) {
    explore[filter]=filter==="near"?field.checked:field.value;
    explore.limit=24;
    renderExploreResults();
  }
  if(field.id==="video-region") {attractionCardsState.moments={region:field.value,query:"",limit:30};rerenderControl("#video-region");}
  if(field.id==="hotel-region") {hotels.region=field.value;rerenderControl("#hotel-region");}
  if(field.id==="region-select") selectRegion(field.value);
  if(field.id==="map-route") {mapRoute=+field.value;selectedPoint="";geo=null;rerenderControl("#map-route");}
  if(field.id==="map-radius") {radius=+field.value;rerenderControl("#map-radius");}
  if(field.id==="map-budget") {mapBudget=field.checked;rerenderControl("#map-budget");}
  if(field.name==="route"&&field.form?.id==="review-form"){reviewRoute=+field.value;rerenderControl('#review-form select[name="route"]');}
});
document.addEventListener("submit",e=>{
  const form=e.target;
  const values=new FormData(form);
  e.preventDefault();
  if(form.id==="assistant-form") {askAtlas(values.get("question"));return;}
  if(form.id==="plan-form") {
    plan={date:values.get("date"),dest:values.get("dest"),hours:+values.get("hours"),budget:+values.get("budget")};
    writeLocal("plan",plan);
    showPlan();
    announce($(".notice strong")?.textContent || t("noResults"));
  }
  if(form.id==="weather-form") requestWeather(values);
  if(form.id==="review-form"||form.classList.contains("answer-form")){
    const body=values.get("body").trim();
    if(!body) return;
    if(form.id==="review-form") notes=[{id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),route:+values.get("route"),kind:values.get("kind"),body,answers:[]},...notes];
    else notes.find(n=>n.id===form.dataset.id)?.answers.push(body);
    writeLocal("notes",notes);
    showReviews();
  }
});
window.addEventListener("hashchange",()=>navigate(true));
initExplore();
navigate();
