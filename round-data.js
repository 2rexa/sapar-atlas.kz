const PARK_TARIFF = "https://insecure.zan.kz/rus/docs/V2400035202/compare";
const PARK_MCI = "https://www.gov.kz/org/aqmola-zhaksy-belovodskoe/press/article/details/222426?lang=ru";
const YASAWI_TARIFF = "https://www.gov.kz/org/turkestan-kalasy/documents/details/1029070?lang=kk";
const ADMISSION = {
  248:[400,"https://kazakhstan.travel/ru/attractions/248"],
  257:[500,"https://kazakhstan.travel/ru/attractions/257","karagandaFare"],
  400:[0,"https://kazakhstan.travel/ru/attractions/400","kokTobeFare"],
  401:[900,"https://www.botsad.kz/ru/news/view/izmenenie_tarifov_na_uslugi_s_9_oktyabrya_2024_goda"],
  405:[1000,"https://ticketon.kz/en/museums/event/tckt2-muzey-almaty"],
  406:[3000,"https://www.almaty.art/en/visit-and-tickets"],
  407:[1000,"https://ticketon.kz/museums/event/tckt2-muzey-narodnykh-muzykalnykh-instrumentov-imeni-ykhlasa"],
  409:[1000,"https://ticketon.kz/museums/event/tckt2-muzey-kunaeva"],
  413:[2000,"https://kazakhstan.travel/ru/attractions/413","kasteyevFare"],
  416:[1427,"https://kazakhstan.travel/ru/attractions/416"],
  423:[2500,"https://kazakhstan.travel/ru/attractions/423"],
  424:[1000,"https://kazakhstan.travel/ru/attractions/424"],
  427:[2000,"https://a-vm.kz/en/objects/peace/"],
  457:[800,"https://shymkent-zoo.kz/kupit-bilet/"],
  505:[2500,"https://kazakhstan.travel/ru/attractions/423"],
  769:[800,"https://kazakhstan.travel/ru/attractions/769"],
  499:[1200,"https://www.astanamuseums.kz/webroot/js/kcfinder/upload/files/%D0%9C%D1%83%D0%B7%D0%B5%D0%B8%CC%86%20%D0%90%D1%82%D0%B0%D0%BC%D0%B5%D0%BA%D0%B5%D0%BD%20EN.pdf"],
  811:[1200,"https://kazakhstan.travel/ru/attractions/811"],
  371:[1000,YASAWI_TARIFF,"yasawiFare"],
  501:[1000,YASAWI_TARIFF,"yasawiFare"]
};
// Ministry tariff in monthly calculation indices: one person and one passenger car per 24 hours.
const PARK_ADMISSION = {
  13:[.2,.4],22:[.2,.7],29:[.2,.7],65:[.2,.7],66:[.2,.7],67:[.2,.7],68:[.2,.7],
  78:[.15,.3],120:[.2,.3],158:[.2,.4],159:[.2,.7],160:[.2,.7],200:[.2,.9],
  234:[.2,.5],235:[.2,.5],236:[.2,.5],241:[.2,.5],242:[.2,.5],244:[.2,.5],
  274:[.2,.7],335:[.15,.4],363:[.2,.7],364:[.2,.7],365:[.15,.4],488:[.2,.7],
  503:[.15,.4],510:[.15,.4],523:[.2,.5],712:[.2,.6],893:[.2,.7],1026:[.2,.7]
};
const ROUND_UI = {
  roadButton:["Рассчитать дорогу туда и обратно","Бару және қайту жолын есептеу","Calculate round trip"],
  roadPending:["Строим маршрут по дорогам…","Жол бағыты есептелуде…","Calculating the road route…"],
  roadError:["Маршрут не получен. Попробуйте снова или проверьте точки на карте.","Бағыт табылмады. Қайталап көріңіз немесе картадағы нүктелерді тексеріңіз.","No route returned. Try again or check the points on the map."],
  outbound:["Туда","Бару","Outbound"],inbound:["Обратно","Қайту","Return"],
  roadRound:["Дорога туда и обратно","Бару және қайту жолы","Round-trip travel"],
  roadBudget:["Бюджет всей поездки","Толық сапар бюджеті","Full trip budget"],
  roadBudgetUnknown:["Для полной суммы нужна цена входа","Толық сома үшін кіру бағасы қажет","Admission price is needed for the full total"],
  roadPlanPending:["Для оценки всей поездки рассчитайте дорогу","Толық сапарды бағалау үшін жолды есептеңіз","Calculate travel to evaluate the whole trip"],
  roadPlaceTotal:["Дорога + вход (1 взрослый)","Жол + кіру (1 ересек)","Travel + admission (1 adult)"],
  roadSnap:["Точка далеко от доступной дороги или тропы. Маршрут может не доводить до входа.","Нүкте жолдан не соқпақтан алыс. Бағыт кіреберіске жетпеуі мүмкін.","A point is far from a mapped road or trail. The route may stop short of the entrance."],
  roadHelp:["По кнопке координаты отправляются в OSRM. Время без пробок. Расходы на авто = километры × ваш тариф. Парковка и платные дороги считаются отдельно.","Батырманы басқанда координаттар OSRM-ге жіберіледі. Уақыт кептеліссіз есептеледі. Көлік құны = км × тарифіңіз. Тұрақ пен ақылы жолдар бөлек есептеледі.","The button sends coordinates to OSRM. Times exclude traffic. Driving cost = distance × your rate. Parking and tolls are separate."],
  roadCompareHelp:["Сравните несколько карточек. Сортировка по цене учитывает дорогу и вход там, где известны обе суммы. Ближайшие до расчёта определяются по прямой.","Бірнеше карточканы салыстырыңыз. Баға сұрыптауында белгілі жол және кіру құны қосылады. Есептеуге дейін жақындық түзу сызықпен өлшенеді.","Calculate several cards to compare. Price sorting uses travel plus admission when both are known. Nearby uses straight-line distance before routing."],
  parkFare:["Опубликованный базовый тариф (МРП 2026). Могут потребоваться разрешения, услуги гида или дополнительные сборы.","Жарияланған базалық тариф (2026 АЕК). Рұқсат, гид қызметі не қосымша алымдар қажет болуы мүмкін.","Published base rate (2026 MCI). Permits, guide services or extra fees may apply."],
  parkCar:["Сбор за легковое авто","Жеңіл көлік алымы","Passenger car fee"],
  parkIndex:["МРП 2026","2026 АЕК","2026 MCI"],
  karagandaFare:["Для иностранных посетителей — 1 000 ₸.","Шетелдік келушілер үшін — 1 000 ₸.","International visitors: 1,000 ₸."],
  kasteyevFare:["Для иностранных посетителей — 5 000 ₸.","Шетелдік келушілер үшін — 5 000 ₸.","International visitors: 5,000 ₸."],
  kokTobeFare:["Пеший вход бесплатный. Канатная дорога туда и обратно — отдельно, 10 000 ₸. Возможна плата за парковку.","Жаяу кіру тегін. Аспалы жолмен барып-қайту бөлек төленеді — 10 000 ₸. Тұрақ ақылы болуы мүмкін.","Walking access is free. An optional round-trip cable car costs 10,000 ₸. Parking charges may apply."],
  yasawiFare:["Для взрослого гражданина Казахстана. Посетители из стран СНГ — 2 000 ₸, из других стран — 5 000 ₸.","Қазақстанның ересек азаматына арналған тариф. ТМД азаматтарына — 2 000 ₸, басқа елдерге — 5 000 ₸.","Rate for an adult Kazakhstani citizen. CIS visitors: 2,000 ₸. Other countries: 5,000 ₸."],
  fixMap:["Исправить карту","Картаны түзету","Fix the map"],
  sortRoad:["По полному бюджету","Толық бюджет бойынша","By full budget"]
};
