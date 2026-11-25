const roadCache = new Map();
let roadQueue = Promise.resolve();
let lastRoadStart = 0;

function roadWaypoints(kind,id) {
  const from=departure();
  if(!from) return null;
  if(kind==="place") {
    const to=attractionIndex.get(id)?.pos;
    return to?[from,to,from]:null;
  }
  const route=DATA.routes[id];
  if(!route) return null;
  const start=routeDeparture(route);
  const end=ROUTE_START_CITY[id]===undefined?route.points.at(-1).slice(1):start;
  return [from,start,end,from];
}
function roadQuery(kind,id) {
  const points=roadWaypoints(kind,id);
  if(!points) return null;
  const profile=originPrefs.mode==="walk"?"foot":"car";
  const coordinates=points.map(([lat,lon])=>lon.toFixed(5)+","+lat.toFixed(5)).join(";");
  return {key:profile+":"+coordinates,points,profile,coordinates};
}
function roadByTarget(kind,id) {
  const query=roadQuery(kind,id);
  const data=query && roadCache.get(query.key)?.data;
  if(!data) return null;
  const rate=query.profile==="foot"?0:originPrefs.rate;
  const bill=km=>Math.round(km*rate);
  const out={...data.out,cost:bill(data.out.km)};
  const back={...data.back,cost:bill(data.back.km)};
  return {...data,out,back,cost:out.cost+back.cost};
}
async function fetchRoad(query) {
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,lastRoadStart+1100-Date.now())));
  lastRoadStart=Date.now();
  const url="https://routing.openstreetmap.de/routed-"+query.profile+"/route/v1/driving/"+query.coordinates+
    "?overview=false&steps=false&continue_straight=false";
  const response=await fetch(url,{signal:AbortSignal.timeout(14000)});
  if(!response.ok) throw new Error("Routing unavailable");
  const payload=await response.json();
  const legs=payload.routes?.[0]?.legs;
  if(payload.code!=="Ok" || legs?.length!==query.points.length-1) throw new Error("Route not found");
  const convert=leg=>({km:leg.distance/1000,mins:Math.ceil(leg.duration/60)});
  const out=convert(legs[0]);
  const back=convert(legs.at(-1));
  if(![out.km,out.mins,back.km,back.mins].every(n=>Number.isFinite(n)&&n>=0)) throw new Error("Invalid route");
  return {out,back,km:out.km+back.km,mins:out.mins+back.mins,
    offRoad:payload.waypoints?.some(p=>p.distance>400)??false};
}
function roadRefresh(kind,id,board=false) {
  const active=document.activeElement;
  const focus=active?.matches('[data-act="road"]')?active.dataset:null;
  if(board && view==="routes") renderExploreResults();
  else if(board && view==="plan") renderPlanResults();
  else document.querySelectorAll('[data-road="'+kind+'-'+id+'"]').forEach(node=>{
    node.innerHTML=roadContents(kind,id);
  });
  if(focus) {
    const replacement=document.querySelector('[data-road="'+focus.kind+'-'+focus.id+'"]');
    (replacement?.querySelector("button")||replacement)?.focus({preventScroll:true});
  }
}
function roadRequest(kind,id) {
  const query=roadQuery(kind,id);
  if(!query) return;
  const existing=roadCache.get(query.key);
  if(existing?.pending || existing?.data) return;
  const entry={pending:true,data:null,error:false};
  roadCache.set(query.key,entry);
  roadRefresh(kind,id);
  roadQueue=roadQueue.then(async()=>{
    try {entry.data=await fetchRoad(query);}
    catch {entry.error=true;}
    finally {
      entry.pending=false;
      if(roadCache.size>150) for(const [key,value] of roadCache) {
        if(!value.pending && key!==query.key) {roadCache.delete(key);break;}
      }
      if(roadQuery(kind,id)?.key===query.key) roadRefresh(kind,id,Boolean(entry.data));
    }
  });
}
function admissionFor(p) {
  const park=PARK_ADMISSION[p.id];
  if(park) return {price:Math.round(park[0]*4325),car:Math.round(park[1]*4325),source:PARK_TARIFF,note:"parkFare"};
  const row=ADMISSION[p.id];
  if(row) return {price:row[0],car:0,source:row[1],note:row[2]};
  return null;
}
function placeTicket(p) {
  const fare=admissionFor(p);
  if(!fare) return null;
  return fare.price+(originPrefs.mode==="car"?fare.car:0);
}
function admissionLabel(fare) {
  if(!fare) return t("admissionUnknown");
  return t("admission")+" · "+money(fare.price)+
    (fare.car && originPrefs.mode==="car"?" + "+money(fare.car)+" ("+t("parkCar")+")":"");
}
function roadAttribution() {
  return '<p class="credit road-credit">'+t("roadHelp")+' '+ext("OSRM / FOSSGIS","https://routing.openstreetmap.de/about.html")+
    ' · '+ext("© OpenStreetMap","https://www.openstreetmap.org/copyright")+' · '+ext(t("fixMap"),"https://www.openstreetmap.org/fixthemap")+'</p>';
}
function roadContents(kind,id) {
  const query=roadQuery(kind,id);
  if(!query) return departure()?'<p class="credit">'+t("originNoPoint")+'</p>':btn(t("originTitle"),"#routes");
  const entry=roadCache.get(query.key);
  const road=roadByTarget(kind,id);
  if(!road) return (entry?.error?'<p class="credit">'+t("roadError")+'</p>':"")+
    action(t(entry?.pending?"roadPending":"roadButton"),"road","light","","data-id="+id+' data-kind="'+kind+'" '+(entry?.pending?'aria-disabled="true"':""));
  const route=kind==="route"?DATA.routes[id]:null;
  const place=kind==="place"?attractionIndex.get(id):null;
  const fare=place?placeTicket(place):null;
  const moneyLine=route?rangeMoney(lowerBudget(route)+road.cost,upperBudget(route)+road.cost):fare!=null?money(fare+road.cost):"";
  const timeLine=leg=>kmText(leg.km)+" · "+durationText(leg.mins);
  return '<dl class="road-legs"><dt>'+t("outbound")+'</dt><dd>'+esc(timeLine(road.out)+" · "+money(road.out.cost))+'</dd><dt>'+t("inbound")+
    '</dt><dd>'+esc(timeLine(road.back)+" · "+money(road.back.cost))+'</dd><dt>'+t("roadRound")+'</dt><dd>'+esc(timeLine(road))+
    '</dd><dt>'+t("originCost")+'</dt><dd>'+money(road.cost)+'</dd></dl>'+
    (moneyLine?'<div class="road-total"><span>'+t(route?"roadBudget":"roadPlaceTotal")+'</span><strong>'+
      (route?esc(durationText(route.hours*60+road.mins))+' · ':"")+esc(moneyLine)+'</strong></div>':'<p class="credit">'+t("roadBudgetUnknown")+'</p>')+
    (road.offRoad?'<p class="notice road-snap">'+t("roadSnap")+'</p>':"");
}
function roadControls(kind,id) {
  return '<div class="road-result" data-road="'+kind+'-'+id+'" aria-live="polite" tabindex="-1">'+roadContents(kind,id)+'</div>';
}
