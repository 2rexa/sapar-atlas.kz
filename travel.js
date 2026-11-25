const attractionIndex = new Map(ATTRACTIONS.map(p=>[p.id,p]));
const catalogLocale = () => ["ru","kz","en"][language];
const attractionName = p => p.titles[language] || p.titles[0];
const attractionRegion = p => regionName(DATA.regions[p.region]);
const attractionUrl = p => "https://kazakhstan.travel/"+catalogLocale()+"/attractions/"+p.id;
const regionPortal = index => "https://kazakhstan.travel/"+catalogLocale()+"/regions/"+REGION_PORTALS[index];
const lowerBudget = r => ROUTE_PRICES[r.id].lines.reduce((sum,line)=>sum+line[1],0);
const upperBudget = r => ROUTE_PRICES[r.id].lines.reduce((sum,line)=>sum+line[2],0);
const rangeMoney = (low,high) => low===high ? money(low) : money(low).replace(/ ₸$/,"")+"–"+money(high);
const routeBudget = r => rangeMoney(lowerBudget(r),upperBudget(r));
const budgetDetails = r => '<section class="panel"><h2>'+routeBudget(r)+'</h2><p class="muted">'+t("estimate")+'</p><dl class="details budget-table">'+ROUTE_PRICES[r.id].lines.map(([key,low,high])=>'<dt>'+t(key)+'</dt><dd>'+rangeMoney(low,high)+'</dd>').join("")+'</dl><p class="credit">'+t("rangeNote")+' '+t("budgetOngoing")+'</p><p class="credit"><strong>'+t("sourcesRates")+'</strong> '+ROUTE_PRICES[r.id].sources.map(([name,url])=>ext(name,url)).join(" · ")+'</p><p><strong>'+t("season")+'</strong><br>'+esc(season(r))+'</p>'+btn(t("regionHotel"),"#hotels/"+DATA.regions.indexOf(DATA.catalog[r.ids[0]].region.split(" / ")[0]),"light","hotel")+'</section>';
const attractionCardsState = {map:{query:"",limit:30},moments:{query:"",limit:30,region:""}};
function attractionsFor(regionFilter, query="") {
  const needle=query.toLocaleLowerCase().replace(/ё/g,"е").trim();
  return ATTRACTIONS.filter(p=>(regionFilter==="" || DATA.regions[p.region]===regionFilter) &&
    (!needle || [...p.titles,...p.locality,attractionRegion(p)].some(value=>value.toLocaleLowerCase().replace(/ё/g,"е").includes(needle))));
}
function attractionCard(p, video=false) {
  const title=esc(attractionName(p));
  const attrs=ATTRACTION_VIDEOS[p.id];
  return '<article class="card attraction-card"><div class="card-body"><span class="eyebrow">'+esc(attractionRegion(p))+' · '+t(p.type)+'</span><h3><a href="#attraction/'+p.id+'">'+title+'</a></h3>'+
    (video&&attrs?'<p class="clip-title">'+esc(attrs.title)+'</p>':"")+
    (attrs?'<div class="actions">'+btn(t("placeVideo"),"#attraction/"+p.id+"?video=1","light","moments")+'</div>':"")+'</div></article>';
}
function regionalSelect(current,id, label=t("regionPrompt")) {
  return '<label class="field">'+label+'<select id="'+id+'">'+options([["",t("allRegions")],...DATA.regions.map(key=>[key,regionName(key)])],current)+'</select></label>';
}
function renderAttractionCards(kind) {
  const node=$("#"+kind+"-attraction-results");
  if(!node) return;
  const state=attractionCardsState[kind];
  const filter=kind==="map"?(mapMode==="country"?region:""):state.region;
  const matches=attractionsFor(filter,state.query);
  const records=kind==="moments"?matches.filter(p=>ATTRACTION_VIDEOS[p.id]):matches;
  node.innerHTML='<p class="muted catalog-count" role="status">'+t("countShown")+" "+Math.min(state.limit,records.length)+" / "+records.length+'</p>'+
    (records.length?'<div class="grid">'+records.slice(0,state.limit).map(p=>kind==="moments"?attractionCard(p,true):exploreCard(p)).join("")+'</div>':'<p>'+t("noResults")+'</p>')+
    (records.length>state.limit?'<div class="spaced">'+action(t("moreAttractions"),"more-attractions","primary","",'data-value="'+kind+'"')+'</div>':"");
}
function attractionDirectory(kind) {
  const state=attractionCardsState[kind];
  const filter=kind==="map"&&mapMode==="country"?DATA.regions.indexOf(region):-1;
  return '<section class="spaced"><div class="section-row"><h2>'+t(kind==="map"&&filter>=0?"attractions":"allAttractions")+'</h2>'+ext(t("directorySource"),filter>=0?regionPortal(filter):"https://kazakhstan.travel/"+catalogLocale()+"/regions")+'</div>'+
    '<div class="directory-controls">'+(kind==="moments"?regionalSelect(state.region,"video-region"):"")+
    '<label class="field">'+t("findAttraction")+'<input type="search" id="'+kind+'-attraction-query" value="'+esc(state.query)+'"></label></div>'+(kind==="map"&&departure()?roadAttribution():"")+'<div id="'+kind+'-attraction-results"></div></section>';
}
function searchFootage(title,regionText) {
  return "https://www.youtube.com/results?search_query="+encodeURIComponent(title+" "+regionText+" Kazakhstan");
}
function videoEmbed(url) {
  if (!url) return "";
  const source = new URL(url);
  const video = source.searchParams.get("v");
  if (source.hostname==="www.youtube.com" && /^[A-Za-z0-9_-]{11}$/.test(video)) return "https://www.youtube-nocookie.com/embed/"+video;
  const rutube = source.pathname.match(/^\/video\/([a-f0-9]{32})\/?$/)?.[1];
  return source.hostname==="rutube.ru" && rutube ? "https://rutube.ru/play/embed/"+rutube : "";
}
function openFootage(button) {
  const frame = document.createElement("iframe");
  frame.className = "place-footage";
  frame.src = button.dataset.video;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.title = t("placeVideo");
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen = true;
  button.closest(".video-panel").querySelector(".footage-frame").replaceChildren(frame);
  frame.focus();
}
function videoMarkup(title,regionText,footage) {
  const embed=videoEmbed(footage?.url);
  if(!footage) return '<section class="panel video-panel" id="place-video"><h2>'+t("placeVideo")+'</h2><p class="muted">'+t("noFootage")+'</p>'+ext(t("videoSearch"),searchFootage(title,regionText))+'</section>';
  return '<section class="panel video-panel" id="place-video"><h2>'+t("placeVideo")+'</h2><h3 class="footage-title">'+esc(footage.title)+'</h3>'+(footage.author?'<p class="credit">'+esc(footage.author)+'</p>':"")+'<div class="actions">'+
    (embed?action(t("verifiedVideo"),"play-footage","primary","moments",'data-video="'+esc(embed)+'"'):"")+
    ext(t("originalFootage"),footage.url)+'</div><div class="footage-frame"></div></section>';
}
function showAttraction(p) {
  const title=attractionName(p), regional=attractionRegion(p);
  const credit=PLACE_PHOTO_CREDITS[p.id] || (p.photo&&!PLACE_COVER_OVERRIDES[p.id]?[t("officialPhoto"),attractionUrl(p)]:null);
  main.innerHTML='<section class="detail-top attraction-top"><div><span class="eyebrow">'+esc(regional)+' · '+t(p.kind)+'</span>'+
    '<h1 tabindex="-1">'+esc(title)+'</h1><p>'+esc(placeDescription(p))+'</p>'+
    '<div class="actions attraction-actions">'+ext(t("source")+" · Kazakhstan.travel",attractionUrl(p))+(p.pos?ext(t("openDirections"),osm(p.pos)):"")+btn(t("regionHotel"),"#hotels/"+p.region,"light","hotel")+(p.pos?action(t("usePlaceStart"),"use-place-start","primary","pin",'data-value="'+p.id+'"'):"")+'</div></div>'+
    '<figure>'+placeImage(p,true)+(credit?'<figcaption class="credit">'+ext(...credit)+'</figcaption>':"")+'</figure></section>'+
    attractionTripDetails(p)+videoMarkup(title,regional,ATTRACTION_VIDEOS[p.id]);
}
let hotels = {region:"",date:"",nights:1};
function hotelSearchUrl(regionText, date, nights) {
  const params=new URLSearchParams({ss:regionText+" Kazakhstan",selected_currency:"KZT"});
  if(date) {
    const end=new Date(date+"T00:00:00Z");
    end.setUTCDate(end.getUTCDate()+nights);
    params.set("checkin",date);
    params.set("checkout",end.toISOString().slice(0,10));
  }
  return "https://www.booking.com/searchresults.html?"+params;
}
function refreshHotelPrices() {
  const regionIndex=DATA.regions.indexOf(hotels.region);
  const rates=HOTEL_RATES.filter(row=>regionIndex<0||row[0]===regionIndex).sort((a,b)=>a[5]-b[5]);
  const regionText=regionIndex<0?"Kazakhstan":REGION_NAMES[regionIndex][1]+(regionIndex>=17?"":" Region");
  $("#hotel-booking").href=hotelSearchUrl(regionText,hotels.date||dateNow(),hotels.nights);
  $("#hotel-results").innerHTML=(rates.length?'<div class="grid">'+rates.map(([i,title,ru,kk,en,rate,unit,url,high])=>'<article class="card"><div class="card-body"><span class="eyebrow">'+esc(tr(ru,kk,en))+' · '+esc(regionName(DATA.regions[i]))+'</span><h3>'+esc(title)+'</h3><p><strong>'+(high?rangeMoney(rate,high):t("from")+" "+money(rate))+'</strong> '+t(unit==="room"?"perRoom":"perPerson")+'</p>'+(hotels.nights>1?'<p>'+t("nightTotal")+' · '+(high?rangeMoney(rate*hotels.nights,high*hotels.nights):t("from")+" "+money(rate*hotels.nights))+'</p>':"")+ext(t("priceSource"),url)+'</div></article>').join("")+'</div>':'<p class="notice">'+t("hotelEmpty")+'</p>');
}
function showHotels() {
  main.innerHTML=heading(t("hotelTitle"),t("hotelNote"))+
    '<section class="panel"><div class="hotel-filters">'+regionalSelect(hotels.region,"hotel-region")+input(t("checkin"),"hotel-date","date",hotels.date||dateNow(),'id="hotel-date" min="'+dateNow()+'"')+
    input(t("nights"),"hotel-nights","number",hotels.nights,'id="hotel-nights" min="1" max="30"')+'</div><div class="actions"><a id="hotel-booking" class="text-link" target="_blank" rel="noopener">'+t("bookDates")+'</a></div></section>'+
    '<p class="credit">'+t("hotelAsOf")+'</p><div id="hotel-results"></div>';
  refreshHotelPrices();
}
