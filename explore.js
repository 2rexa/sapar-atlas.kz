const exploreKinds=["museums","sacred","archaeology","reserves","landscapes","water","viewpoints","parks","architecture","memorials","culture","urban","family","resorts","sport","other"];
const cityTitle = index => ORIGIN_CITIES[index][language];
const cityPosition = index => ORIGIN_CITIES[index].slice(3);
const placeLocality = p => p.locality[language] || p.locality[0] || attractionRegion(p);
const placeDescription = p => PLACE_HIGHLIGHTS[p.id]?.[language] ||
  placeLocality(p)+". "+(PLACE_DESCRIPTIONS[p.kind] || PLACE_DESCRIPTIONS.other)[language];
function placeImage(p,priority=false) {
  const cover=PLACE_COVER_OVERRIDES[p.id] || (p.photo?"https://kazakhstan.travel"+p.photo:"");
  return '<div class="place-image'+(cover?"":" no-image")+'">'+(cover?'<img src="'+esc(cover)+'" alt="" loading="'+(priority?"eager":"lazy")+'" decoding="async">':"")+
    '<span class="image-placeholder">'+icon("pin")+esc(t("photoUnavailable"))+'</span></div>';
}
document.addEventListener("error",e=>{
  if(e.target.matches?.(".place-image img")) e.target.parentElement.classList.add("no-image");
},true);
let originPrefs;
let originGeo=null;
let originPending=false;
let originRequest=0;
let originFeedback="";
const explore = {tab:"places",region:"",kind:"",query:"",sort:"az",near:false,limit:24,readySort:"nearest"};
function initExplore() {
  const stored=readLocal("origin",{});
  originPrefs={
    place:typeof stored.place==="number"&&attractionIndex.get(stored.place)?.pos?stored.place:null,
    city:typeof stored.city==="number"&&ORIGIN_CITIES[stored.city]?stored.city:null,
    mode:stored.mode==="walk"?"walk":"car",
    rate:typeof stored.rate==="number"&&stored.rate>=0&&stored.rate<=2000?stored.rate:50
  };
  if(originPrefs.city!==null||originPrefs.place!==null) explore.sort="nearest";
  const theme=readLocal("theme","");
  applyTheme(theme==="dark"||theme==="light"?theme:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
}
function applyTheme(theme) {
  document.documentElement.dataset.theme=theme;
  const meta=$('meta[name="theme-color"]');
  if(meta) meta.content=theme==="dark"?"#111917":"#f8faf8";
  renderThemeToggle();
}
function renderThemeToggle() {
  const button=$("#theme-toggle");
  const dark=document.documentElement.dataset.theme==="dark";
  const label=t(dark?"dayTheme":"nightTheme");
  button.innerHTML=icon(dark?"sun":"moon");
  button.setAttribute("aria-label",label);
  button.title=label;
  button.setAttribute("aria-pressed",String(dark));
}
function toggleTheme() {
  const theme=document.documentElement.dataset.theme==="dark"?"light":"dark";
  writeLocal("theme",theme);
  applyTheme(theme);
}
function departure() {
  if(originGeo) return originGeo;
  if(originPrefs.place!==null) return attractionIndex.get(originPrefs.place).pos;
  return originPrefs.city===null?null:cityPosition(originPrefs.city);
}
function directDistance(from,to) {
  const rad=n=>n*Math.PI/180;
  const dLat=rad(to[0]-from[0]);
  const dLon=rad(to[1]-from[1]);
  const a=Math.sin(dLat/2)**2+Math.cos(rad(from[0]))*Math.cos(rad(to[0]))*Math.sin(dLon/2)**2;
  return 12742*Math.asin(Math.sqrt(Math.min(1,a)));
}
function durationText(mins) {
  const rounded=Math.round(mins);
  const hours=Math.floor(rounded/60);
  return (hours?hours+" "+t("hours")+(rounded%60?" ":""):"")+(rounded%60||!hours?rounded%60+" "+t("minutes"):"");
}
const kmText = n => new Intl.NumberFormat(codes[language],{maximumFractionDigits:n<10?1:0}).format(n)+" "+t("km");
function routeDeparture(r) {
  const city=ROUTE_START_CITY[r.id];
  return city===undefined?r.points[0].slice(1):cityPosition(city);
}
function routeTrip(r) {
  const travel=roadByTarget("route",r.id);
  if(!travel) return {travel:null,mins:r.hours*60,low:lowerBudget(r),high:upperBudget(r)};
  return {travel,mins:r.hours*60+travel.mins,low:lowerBudget(r)+travel.cost,high:upperBudget(r)+travel.cost};
}
function mapDirections(to) {
  const from=departure();
  if(!from||!to) return "";
  const engine=originPrefs.mode==="walk"?"fossgis_osrm_foot":"fossgis_osrm_car";
  const url=new URL("https://www.openstreetmap.org/directions");
  url.searchParams.set("engine",engine);
  url.searchParams.set("route",from.join(",")+";"+to.join(","));
  return ext(t("directionsFrom"),url.href);
}
function originPanel() {
  const cities=ORIGIN_CITIES.map((_,i)=>[i,cityTitle(i)]).sort((a,b)=>a[1].localeCompare(b[1],codes[language]));
  const choices=[["",t("originNone")],...cities];
  if(originGeo) choices.splice(1,0,["geo",t("originSet")]);
  if(originPrefs.place!==null) choices.splice(1,0,["place",attractionName(attractionIndex.get(originPrefs.place))]);
  const city=originGeo?"geo":originPrefs.place!==null?"place":originPrefs.city??"";
  return '<section class="panel origin-panel"><div class="origin-title">'+icon("pin")+'<h2>'+t("originTitle")+'</h2></div>'+
    '<div class="origin-form"><label class="field">'+t("originPoint")+'<select id="origin-city">'+options(choices,city)+'</select></label>'+
    '<label class="field">'+t("originMode")+'<select id="origin-mode">'+options([["car",t("originCar")],["walk",t("originWalk")]],originPrefs.mode)+'</select></label>'+
    (originPrefs.mode==="car"?'<label class="field">'+t("originRate")+'<input id="origin-rate" type="number" min="0" max="2000" step="1" value="'+originPrefs.rate+'"></label>':"")+'</div>'+
    '<div class="actions">'+action(t(originPending?"originPending":"originSet"),"origin-locate","light","pin",originPending?"disabled":"")+(departure()?action(t("originClear"),"origin-clear","light"):"")+'</div>'+
    roadAttribution()+(originFeedback?'<p role="status" class="muted">'+t(originFeedback)+'</p>':"")+'</section>';
}
function stopOriginRequest() {
  originRequest++;
  originPending=false;
}
function saveOrigin(selector) {
  writeLocal("origin",originPrefs);
  explore.limit=24;
  rerenderControl(selector);
}
function exploreOriginAction(act) {
  if(act==="origin-clear") {
    stopOriginRequest();
    originPrefs.city=null;originPrefs.place=null;originGeo=null;originFeedback="";explore.near=false;
    saveOrigin("#origin-city");
    return;
  }
  if(act!=="origin-locate" || originPending) return;
  const request=++originRequest;
  const fail=()=>{
    if(request!==originRequest) return;
    originPending=false;
    originFeedback="geoError";
    if(view==="routes"||view==="plan") rerenderControl('[data-act="origin-locate"]');
  };
  if(!navigator.geolocation) {fail();return;}
  originPending=true;originFeedback="";
  renderPage();
  navigator.geolocation.getCurrentPosition(({coords})=>{
    if(request!==originRequest) return;
    originPending=false;originGeo=[coords.latitude,coords.longitude];explore.sort="nearest";
    if(viewId==="nearby") explore.near=true;
    if(view==="routes"||view==="plan") saveOrigin('[data-act="origin-locate"]');
  },fail,{timeout:9000,maximumAge:120000});
}
function routeCatalogPage() {
  const imgs=explore.tab==="places";
  const priceSort=t(departure()?"sortRoad":"admission");
  main.innerHTML=heading(t("routes"),t("routeExploreText"))+originPanel()+
    '<div class="filters explore-tabs">'+chip(t("explorePlaces"),"explore-tab","places",imgs)+chip(t("readyRoutes"),"explore-tab","ready",!imgs)+'</div>'+
    (imgs?'<div class="panel explore-filters"><div class="explore-fields">'+regionalSelect(explore.region,"explore-region")+
      '<label class="field">'+t("typeFilter")+'<select id="explore-kind">'+options([["",t("all")],...exploreKinds.map(k=>[k,t(k)])],explore.kind)+'</select></label>'+
      '<label class="field">'+t("exploreSearch")+'<input id="explore-query" type="search" value="'+esc(explore.query)+'"></label>'+
      '<label class="field">'+t("sort")+'<select id="explore-sort">'+options([["az",t("az")],["nearest",t("nearest")],["shortest",t("shortest")],["cheapest",priceSort]],explore.sort)+'</select></label></div>'+
      '<label class="check"><input type="checkbox" id="explore-near" '+(explore.near?"checked":"")+' '+(!departure()?"disabled":"")+'>'+t("nearbyOnly")+'</label></div>':
      '<label class="field ready-sort">'+t("sort")+'<select id="ready-sort">'+options([["nearest",t("nearest")],["shortest",t("shortest")],["cheapest",priceSort]],explore.readySort)+'</select></label>')+
    '<div id="explore-results"></div>';
  renderExploreResults();
}
function renderExploreResults() {
  const target=$("#explore-results");
  const from=departure();
  if(explore.tab==="ready") {
    let routes=DATA.routes.map(r=>({r,estimate:routeTrip(r)}));
    const key=explore.readySort;
    const score=item=>from&&!item.estimate.travel?Infinity:key==="cheapest"?item.estimate.low:key==="shortest"?item.estimate.mins:item.estimate.travel?.km??0;
    routes.sort((a,b)=>score(a)-score(b));
    target.innerHTML=(from?'<p class="credit">'+t("roadCompareHelp")+'</p>':"")+'<div class="grid">'+routes.map(({r})=>routeCard(r,!!from)).join("")+'</div>';
    return;
  }
  const items=attractionsFor(explore.region,explore.query).filter(p=>!explore.kind||p.kind===explore.kind).map(p=>({p,estimate:roadByTarget("place",p.id),direct:from&&p.pos?directDistance(from,p.pos):Infinity}));
  const matches=explore.near&&from?items.filter(x=>x.direct<=30):items;
  const score=x=>{
    const ticket=placeTicket(x.p);
    if(explore.sort==="cheapest") return ticket==null||from&&!x.estimate?Infinity:ticket+(x.estimate?.cost??0);
    if(explore.sort==="nearest") return x.direct;
    if(explore.sort==="shortest") return x.estimate?.mins??Infinity;
    return 0;
  };
  matches.sort((a,b)=>{
    const difference=score(a)-score(b);
    return difference||attractionName(a.p).localeCompare(attractionName(b.p),codes[language]);
  });
  const banner=from?t("roadCompareHelp"):
    !from&&(explore.sort==="nearest"||explore.sort==="shortest")?t("originNeed"):"";
  target.innerHTML='<p class="muted catalog-count" role="status">'+t("countShown")+" "+Math.min(explore.limit,matches.length)+" / "+matches.length+'</p>'+
    (banner?'<p class="credit">'+banner+'</p>':"")+
    (matches.length?'<div class="grid journey-grid">'+matches.slice(0,explore.limit).map(({p})=>exploreCard(p)).join("")+'</div>':'<p class="notice">'+t("noResults")+'</p>')+
    (matches.length>explore.limit?'<div class="spaced">'+action(t("moreAttractions"),"more-explore","primary")+'</div>':"");
}
function exploreCard(p) {
  const url="#attraction/"+p.id;
  const title=esc(attractionName(p));
  const fare=admissionFor(p);
  return '<article class="card journey-card"><a href="'+url+'" aria-label="'+title+'">'+placeImage(p)+'</a><div class="card-body">'+
    '<span class="eyebrow">'+esc(t(p.kind))+' · '+esc(attractionRegion(p))+'</span><h3><a href="'+url+'">'+title+'</a></h3><p>'+esc(placeDescription(p))+'</p>'+
    '<p class="journey-ticket">'+esc(admissionLabel(fare))+(fare?' · '+ext(t("source"),fare.source):"")+'</p>'+
    (fare?.note?'<p class="credit">'+t(fare.note)+'</p>':"")+
    (departure()&&p.pos?roadControls("place",p.id):"")+
    (ATTRACTION_VIDEOS[p.id]?'<a class="journey-video" href="'+url+'?video=1">'+icon("moments")+t("placeVideo")+'</a>':"")+'</div></article>';
}
function attractionTripDetails(p) {
  const fare=admissionFor(p);
  return '<section class="panel spaced"><h2>'+t("tripEstimate")+'</h2>'+
    (p.hours?'<p><strong>'+t("opening")+'</strong><br>'+esc(p.hours)+'</p>':"")+
    '<p>'+esc(admissionLabel(fare))+(fare?' · '+ext(t("source"),fare.source):"")+'</p>'+
    (fare?.note?'<p class="credit">'+t(fare.note)+(fare.car?' · '+ext(t("parkIndex"),PARK_MCI):"")+'</p>':"")+
    roadControls("place",p.id)+(departure()&&p.pos?roadAttribution()+mapDirections(p.pos):"")+'</section>';
}
