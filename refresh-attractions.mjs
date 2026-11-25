import {writeFile,readFile} from "node:fs/promises";
const origin = "https://kazakhstan.travel";
const sourcePath=process.argv[2];
let raw;
if(sourcePath) raw=JSON.parse(await readFile(sourcePath,"utf8"));
else{
 const response = await fetch(origin + "/api/routes/places?locale=ru", {signal:AbortSignal.timeout(30000)});
 if (!response.ok) throw new Error("Kazakhstan.travel returned " + response.status);
 raw = await response.json();
}
const regionCodes = ["abay","akmola","aktobe","almaty-reg","atyrau","vko","zhambyl","zhetysu","wko","karaganda","kostanay","kyzylorda","mangystau","pavlodar","sko","turkestan","ulytau","astana","almaty-city","shymkent"];
const clean = value => typeof value === "string" ? value.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim() : "";
function classify(category,title){
 const name=title.toLowerCase();
 if(/водопад|оз[её]р[ао]|водохран|река(?:\s|$)|впадина морская|родник|пляж|дельта|источник|бухта|залив|каспийское море/.test(name) || /озеро|родник|пляж/.test(category)) return "water";
 if(/смотровая|экотропа|ботаническая тропа|терренкур|пешеходная тропа/.test(name) || category==="смотровая площадка") return "viewpoints";
 if(/петроглиф|городище|курган|археолог|геоглиф|древнее поселение/.test(name+" "+category)) return "archaeology";
 if(/мечет|собор|храм|монастыр|церков|медресе|мавзолей|некрополь/.test(name+" "+category) || /религиоз|мазар/.test(category)) return "sacred";
 if(/музе|галерея|визит-центр|выставочн/.test(name+" "+category)) return "museums";
 if(/национальный.*парк|заповед|природный парк|заказник|резерват/.test(name+" "+category)) return "reserves";
 if(/ущелье|каньон|скала|горы|горный массив|пещера|бархан|плато|урочище|ледник|пик(?:\s|$)/.test(name+" "+category)) return "landscapes";
 if(/зоопарк|аквариум|океанариум|цирк|аквапарк|парк развлечений/.test(name+" "+category)) return "family";
 if(/санатор|горнолыжный|курорт|зона отдыха|база отдыха|resort|глэмпинг|гостев|отель|гостиниц/.test(name+" "+category)) return "resorts";
 if(/ботанический сад|дендропарк|городской парк|роща|парк культуры|эко.?парк/.test(name+" "+category) || category==="парк") return "parks";
 if(/мемориал|памятник|монумент|стела|вечный огонь/.test(name+" "+category)) return "memorials";
 if(/театр|филармони|концерт|культурный центр|этнограф|дворец культуры/.test(name+" "+category)) return "culture";
 if(/мост|бульвар|улица|площадь|базар|рынок|набережная|аллея|трц/.test(name+" "+category)) return "urban";
 if(/башня|дворец|здание|арка|архитектур/.test(name+" "+category)) return "architecture";
 if(/спортив|футбол|каток|стадион|спорткомплекс/.test(name+" "+category)) return "sport";
 return "other";
}
const records = [];
const seen = new Set();
for (const p of raw) {
  const region = regionCodes.indexOf(p.regionCode);
  const titles = ["ru","kz","en"].map(locale=>clean(p.nameI18n?.[locale]));
  if (!Number.isSafeInteger(p.id) || region<0 || seen.has(p.id) || !(titles[0] || clean(p.name))) continue;
  seen.add(p.id);
  titles[0] ||= clean(p.name);
  const category=clean(p.category).toLowerCase();
  const type = /природ|озеро|заповед|каньон|скала|пещер|гора|горы|рощ|родник|пляж|национальный|курорт/i.test(category)
    ? "nature" : /музе|памятни|историч|археолог|мавзолей|мазар|мемориал|религиоз|мечеть|собор/i.test(category) ? "history" : "sight";
  const pos = typeof p.lat==="number" && typeof p.lon==="number" && p.lat>=39 && p.lat<=56 && p.lon>=45 && p.lon<=88 ? [p.lat,p.lon] : null;
  const locality = ["ru","kz","en"].map(l => clean(p.settlementI18n?.[l]) || clean(p.districtI18n?.[l]));
  locality[0] ||= clean(p.settlement) || clean(p.district);
  const photo = /^\/(?:media|uploads)\/[\w./%()-]+\.(?:jpe?g|png|webp|avif)$/i.test(p.photo) ? p.photo : undefined;
  const hint=clean(p.locationHint);
  const hours=clean(p.workingHours) || (p.openTime&&p.closeTime?p.openTime+"–"+p.closeTime:hint.match(/\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/)?.[0]);
  const adultPrice=hint.match(/взрослый билет\s*[-–—:]?\s*(\d[\d ]{0,6})\s*(?:₸|тенге|тг)/i)?.[1];
  const admission=adultPrice?Number(adultPrice.replace(/\s/g,"")):undefined;
  records.push({id:p.id,region,titles,type,kind:classify(category,titles[0]),pos,locality,photo,hours:hours?.slice(0,105),admission});
}
if (records.length<900 || new Set(records.map(p=>p.region)).size!==20) throw new Error("Source catalog looks incomplete");
const js = "const ATTRACTIONS = [\n" + records.map(p=>"  "+JSON.stringify(p)).join(",\n") + "\n];\n";
await writeFile(new URL("./dist/attractions.js",import.meta.url),js);
console.log("Imported "+records.length+" records in 20 regions, "+records.filter(p=>p.photo).length+" with a photo URL");
