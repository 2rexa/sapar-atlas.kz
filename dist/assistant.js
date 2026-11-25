const ASSISTANT_UI = {
  assistantWait:["Готовлю ответ…","Жауап дайындалуда…","Preparing an answer…"],
  assistantShared:["В режиме GPT вопрос и сведения из атласа отправляются в OpenAI.","GPT режимінде сұрақ пен атлас деректері OpenAI жүйесіне жіберіледі.","In GPT mode, the question and relevant atlas facts are sent to OpenAI."],
  assistant:["Помощник","Көмекші","Assistant"],
  assistantIntro:["Спросите о месте, билете или маршруте по Казахстану.","Қазақстандағы орын, билет немесе бағыт туралы сұраңыз.","Ask about a place, ticket or itinerary in Kazakhstan."],
  assistantCatalog:["Ответы по данным атласа","Атлас деректеріне негізделген жауаптар","Answers from the atlas"],
  assistantLabel:["Ваш вопрос","Сұрағыңыз","Your question"],
  assistantSend:["Отправить","Жіберу","Send"],
  assistantYou:["Вы","Сіз","You"],
  assistantExample1:["Сколько стоит вход в Байтерек?","Бәйтерекке кіру қанша тұрады?","How much is admission to Baiterek?"],
  assistantExample2:["Что посмотреть в Алматы?","Алматыда не көруге болады?","What can I see in Almaty?"],
  assistantExample3:["Как сравнить стоимость поездок?","Сапар құнын қалай салыстырамын?","How do I compare trip costs?"],
  assistantNeedPlace:["Укажите город или название места. Я подберу карточки с опубликованными ценами, временем работы и маршрутами.","Қаланы немесе орын атауын жазыңыз. Жарияланған бағасы, жұмыс уақыты және бағыты бар карточкаларды табамын.","Name a city or place. I can find cards with published prices, hours and itineraries."],
  assistantHow:["Выберите точку старта и транспорт в разделе «Маршруты». Рассчитайте дорогу туда и обратно на нескольких карточках и выберите сортировку по цене. Полная оценка места складывается из дороги и входа.","«Бағыттар» бөлімінде бастапқы нүкте мен көлікті таңдаңыз. Бірнеше карточкада бару және қайту жолын есептеп, баға бойынша сұрыптаңыз. Толық бағаға жол мен кіру кіреді.","Pick a start and transport in Routes. Calculate round trips on several cards, then sort by price. The place estimate combines travel and admission."],
  assistantHowThis:["Откройте карточку, выберите старт в «Маршрутах» и нажмите «Рассчитать дорогу туда и обратно».","Карточканы ашып, «Бағыттарда» бастапқы нүктені таңдаңыз да, бару мен қайту жолын есептеңіз.","Open the card, choose a start in Routes and calculate the round trip."],
  assistantBudgetNo:["В атласе нет подтверждённых вариантов на этот бюджет в выбранном городе.","Атласта бұл қалада осы бюджетке сай расталған нұсқалар жоқ.","The atlas has no confirmed options within that budget in this city."],
  assistantAdmissionOnly:["По опубликованному входному тарифу. Дорога и дополнительные расходы считаются отдельно.","Жарияланған кіру тарифі бойынша. Жол және қосымша шығындар бөлек есептеледі.","Based on published admission. Travel and extras are separate."],
  assistantOptions:["Можно начать с этих мест","Мына орындардан бастауға болады","Start with these places"],
};
const assistantMessages=[];
let assistantPlace=null;
let assistantGPT=false;
let assistantChecked=false;
let assistantPending=false;
const assistantAliases={423:["байтерек","бәйтерек","baiterek","bayterek"],65:["чарын","шарын","charyn","sharyn"],67:["кольсай","көлсай","kolsai"],68:["каинды","қайыңды","kaindy"],371:["ясави","ясауи","yasawi","yassawi"],427:["пирамида","дворец мира","palace of peace"],424:["национальный музей","ұлттық музей","national museum"]};
function atlasWords(text) {
  return text.toLowerCase().replace(/ё/g,"е").match(/[\p{L}\p{N}]+/gu)||[];
}
function nameMatches(name,query) {
  return atlasWords(name).filter(x=>x.length>=4).reduce((score,x)=>{
    const match=query.find(q=>q===x || Math.min(q.length,x.length)>=5 && q.slice(0,5)===x.slice(0,5));
    return score+(match?match===x?4:2:0);
  },0);
}
function atlasReply(question) {
  const words=atlasWords(question);
  const price=/стоим|сколько|билет|вход|цен|бюджет|қанша|баға|билет|құн|cost|price|admission|ticket|budget|cheapest/i.test(question);
  const road=/доро|доех|добра|езд|транспорт|сравни|жол|көлік|салыстыр|drive|travel time|round trip|compare/i.test(question);
  const hours=/откры|работ|сағат|ашыл|hours|opening|open/i.test(question);
  const itineraries=DATA.routes.map(r=>({r,score:Math.max(...[r.name,...ROUTE_NAMES[r.id]].map(name=>nameMatches(name,words)))})).sort((a,b)=>b.score-a.score);
  const itinerary=itineraries[0];
  if(itinerary?.score>=6) {
    const r=itinerary.r;
    const trip=routeTrip(r);
    const label=trip.travel?t("roadBudget"):t("estimate");
    return {text:routeName(r)+"\n"+label+" · "+durationText(trip.mins)+" · "+rangeMoney(trip.low,trip.high)+
      (!trip.travel?"\n"+t("roadPlanPending"):""),places:[],route:r.id};
  }
  const currency=question.match(/(?:до|дейін|under|budget|бюджет)?\s*(\d{1,3}(?:[\s,.]\d{3})+|\d+)(?:\s*)(тыс\.?|мың|k\b|₸|тг\b|тенге|теңге|kzt\b)/iu);
  const budget=currency?Number(currency[1].replace(/[^0-9]/g,""))*(/тыс|мың|^k$/i.test(currency[2])?1000:1):null;
  const city=ORIGIN_CITIES.findIndex(names=>names.slice(0,3).some(name=>nameMatches(name,words)>=2));
  const matched=ATTRACTIONS.map(p=>({p,score:Math.max(...p.titles.map(n=>nameMatches(n,words)),...(assistantAliases[p.id]||[]).map(n=>2*nameMatches(n,words))) }))
    .filter(x=>x.score>=2 && (city<0||city<17||x.p.region===city)).sort((a,b)=>b.score-a.score||Number(Boolean(admissionFor(b.p)))-Number(Boolean(admissionFor(a.p))));
  // Generic nouns alone should not mistake a price question for an unnamed destination.
  const subject=words.filter(w=>!/^(музе|музей|вход|парк|стоит|сколько|билет|цена|стоим|посмот|баға|билет|кіру|қанша|museum|park|admission|ticket|price|cost)/i.test(w));
  const best=matched[0];
  const seen=best && (city<0 && best.score>=6 || subject.some(w=>nameMatches(best.p.titles.join(" ")+" "+(assistantAliases[best.p.id]||[]).join(" "),[w])>=2 && (city<0 || !ORIGIN_CITIES[city].slice(0,3).some(n=>nameMatches(n,[w])) )));
  let p=seen?best.p:null;
  if(!p && city<0 && assistantPlace && (price||hours||road) && !/сравни|салыстыр|compare/i.test(question)) p=attractionIndex.get(assistantPlace);
  if(p) {
    assistantPlace=p.id;
    const fare=admissionFor(p);
    const travel=roadByTarget("place",p.id);
    const lines=[attractionName(p)+" · "+placeLocality(p)];
    if(price||!hours && !road) lines.push(admissionLabel(fare));
    if(p.hours && (hours||!price && !road)) lines.push(t("opening")+" · "+p.hours);
    if(fare?.note && price) lines.push(t(fare.note));
    if(road||price) {
      if(travel) {
        lines.push(t("outbound")+" · "+kmText(travel.out.km)+" · "+durationText(travel.out.mins)+" · "+money(travel.out.cost));
        lines.push(t("inbound")+" · "+kmText(travel.back.km)+" · "+durationText(travel.back.mins)+" · "+money(travel.back.cost));
        lines.push(t("originCost")+" · "+money(travel.cost));
        if(fare) lines.push(t("roadPlaceTotal")+" · "+money(placeTicket(p)+travel.cost));
      } else lines.push(t("assistantHowThis"));
    }
    if(!price && !hours && !road) lines.push(placeDescription(p));
    return {text:lines.join("\n"),places:[p],fare};
  }
  if(city>=0) {
    const regional=ATTRACTIONS.filter(p=>p.region===city||p.locality.some(n=>ORIGIN_CITIES[city].slice(0,3).some(cityName=>nameMatches(cityName,atlasWords(n))>=4)));
    const shortlist=regional.filter(p=>admissionFor(p)&&(budget===null||placeTicket(p)<=budget)).sort((a,b)=>price?placeTicket(a)-placeTicket(b):0);
    if(budget!==null&&!shortlist.length) return {text:t("assistantBudgetNo"),places:[],planner:true};
    const places=(shortlist.length?shortlist:regional).slice(0,4);
    if(places.length) return {text:t("assistantOptions")+" · "+cityTitle(city)+
      (price?"\n"+places.map(p=>attractionName(p)+" · "+admissionLabel(admissionFor(p))).join("\n")+"\n"+t("assistantAdmissionOnly"):""),places};
  }
  if(road||price) return {text:t("assistantHow"),places:[],planner:true};
  return {text:t("assistantNeedPlace"),places:[]};
}
function paintAssistant() {
  if(view!=="assistant") return;
  $("#assistant-mode").textContent=assistantGPT?"GPT‑6.2 Astra":t("assistantCatalog");
  $("#assistant-shared").hidden=!assistantGPT;
  $("#assistant-form button").disabled=assistantPending;
  const log=$("#assistant-log");
  log.innerHTML=assistantMessages.map(m=>'<article class="assistant-message '+(m.question?"question":"answer")+'"><strong>'+
    esc(m.question?t("assistantYou"):m.model||t("assistantCatalog"))+'</strong><p>'+esc(m.text)+'</p>'+
    (m.places?.length?'<div class="actions">'+m.places.map(p=>btn(attractionName(p),"#attraction/"+p.id)).join("")+'</div>':"")+
    (m.fare?'<p class="credit">'+ext(t("source"),m.fare.source)+'</p>':"")+
    (m.route!==undefined?btn(t("openRoute"),"#route/"+m.route):"")+(m.planner?btn(t("routes"),"#routes"):"")+'</article>').join("")+(assistantPending?'<p role="status">'+t("assistantWait")+'</p>':"");
  if(assistantMessages.length) log.scrollTop=log.scrollHeight;
}
function showAssistant() {
  main.innerHTML=heading(t("assistant"),t("assistantIntro"))+
    '<section class="panel assistant-panel"><div class="assistant-top"><strong id="assistant-mode"></strong><small class="credit" id="assistant-shared" hidden>'+t("assistantShared")+'</small></div>'+
    '<div class="actions assistant-examples">'+[1,2,3].map(i=>action(t("assistantExample"+i),"assistant-prompt")).join("")+'</div>'+
    '<div id="assistant-log" class="assistant-log" role="log" aria-live="polite"></div>'+
    '<form id="assistant-form"><label class="field">'+t("assistantLabel")+
    '<input name="question" type="text" maxlength="600" required></label><button class="btn btn-primary">'+t("assistantSend")+'</button></form></section>';
  paintAssistant();
  if(assistantChecked || !["localhost","127.0.0.1"].includes(location.hostname)) return;
  assistantChecked=true;
  fetch("/api/assistant/status",{headers:{Accept:"application/json"},signal:AbortSignal.timeout(3000)})
    .then(response=>response.ok?response.json():null).then(data=>{
      assistantGPT=data?.model==="gpt-6.2-astra";
      paintAssistant();
    }).catch(()=>{});
}
async function askAtlas(value) {
  const question=String(value||"").trim().slice(0,600);
  if(!question || assistantPending) return;
  const fallback=atlasReply(question);
  assistantMessages.push({question:true,text:question});
  const field=$("#assistant-form input");
  if(field) field.value="";
  let reply=fallback;
  if(assistantGPT) {
    assistantPending=true;
    paintAssistant();
    try {
      const facts=[fallback.text,...fallback.places.map(p=>attractionName(p)+". "+placeDescription(p)),
        fallback.fare?.source||""].join("\n");
      const response=await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({question,language:codes[language],atlas:facts}),signal:AbortSignal.timeout(38000)});
      if(!response.ok) throw Error("Assistant unavailable");
      const result=await response.json();
      if(result.model!=="gpt-6.2-astra"||typeof result.text!=="string"||!result.text.trim()) throw Error("Missing answer");
      reply={...fallback,text:result.text,model:"GPT‑6.2 Astra"};
    } catch { /* Keep the atlas answer available during provider outages. */ }
    finally {assistantPending=false;}
  }
  assistantMessages.push(reply);
  if(assistantMessages.length>24) assistantMessages.splice(0,assistantMessages.length-24);
  paintAssistant();
}
