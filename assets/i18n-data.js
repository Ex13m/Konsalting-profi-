/* Konsalting Profi — jazykové varianty dat, která vykresluje skript.
   Statické texty stránky řeší assets/i18n.js; tady jsou kalendář,
   diagnostika, asistentka, pás a drobné hlášky. */
window.KP = {
  lang: "cs",
  L: function (o) { return (o && (o[this.lang] || o.cs)) || ""; },

  locale: { cs: "cs-CZ", en: "en-GB", ru: "ru-RU", uk: "uk-UA", de: "de-DE", pl: "pl-PL" },

  months: {
    cs: ["leden","únor","březen","duben","květen","červen","červenec","srpen","září","říjen","listopad","prosinec"],
    en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    ru: ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"],
    uk: ["січень","лютий","березень","квітень","травень","червень","липень","серпень","вересень","жовтень","листопад","грудень"],
    de: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
    pl: ["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"]
  },
  monthsShort: {
    cs: ["led","úno","bře","dub","kvě","čvn","čvc","srp","zář","říj","lis","pro"],
    en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    ru: ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"],
    uk: ["січ","лют","бер","кві","тра","чер","лип","сер","вер","жов","лис","гру"],
    de: ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"],
    pl: ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"]
  },
  days: {
    cs: ["ne","po","út","st","čt","pá","so"],
    en: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    ru: ["вс","пн","вт","ср","чт","пт","сб"],
    uk: ["нд","пн","вт","ср","чт","пт","сб"],
    de: ["So","Mo","Di","Mi","Do","Fr","Sa"],
    pl: ["nd","pn","wt","śr","cz","pt","sb"]
  },

  ui: {
    onRequest:  { cs:"na dotaz", en:"on request", ru:"по запросу", uk:"на запит", de:"auf Anfrage", pl:"na życzenie" },
    byPhone:    { cs:"telefonicky", en:"by phone", ru:"по телефону", uk:"телефоном", de:"telefonisch", pl:"telefonicznie" },
    closedDay:  { cs:"nepřijímáme", en:"no visits", ru:"без приёма", uk:"без прийому", de:"kein Empfang", pl:"bez przyjęć" },
    taken:      { cs:"obsazeno", en:"taken", ru:"занято", uk:"зайнято", de:"belegt", pl:"zajęte" },
    freeOnly:   { cs:"Volné jsou jen dopolední hodiny 10–11 a 11–12, zbytek dne patří běžné agendě.",
      en:"Only the morning hours 10–11 and 11–12 are open; the rest of the day belongs to regular work.",
      ru:"Свободны только утренние часы 10–11 и 11–12, остальной день занят текущей работой.",
      uk:"Вільні лише ранкові години 10–11 і 11–12, решта дня зайнята поточною роботою.",
      de:"Frei sind nur die Vormittagsstunden 10–11 und 11–12; der Rest des Tages gehört der laufenden Arbeit.",
      pl:"Wolne są tylko godziny poranne 10–11 i 11–12, reszta dnia należy do bieżącej pracy." },
    dayPhone:   { cs:"Běžný provozní den, 10:00–18:00 s pauzou 13:00–14:00. Termín na něj domluvíme po telefonu.",
      en:"A regular office day, 10:00–18:00 with a break from 13:00 to 14:00. A time on this day we arrange by phone.",
      ru:"Обычный рабочий день, 10:00–18:00 с перерывом 13:00–14:00. Время на этот день согласуем по телефону.",
      uk:"Звичайний робочий день, 10:00–18:00 з перервою 13:00–14:00. Час на цей день узгодимо телефоном.",
      de:"Ein normaler Bürotag, 10:00–18:00 mit Pause von 13:00 bis 14:00. Einen Termin an diesem Tag vereinbaren wir telefonisch.",
      pl:"Zwykły dzień pracy, 10:00–18:00 z przerwą 13:00–14:00. Termin na ten dzień ustalimy telefonicznie." },
    dayClosed:  { cs:"V pátek nepřijímáme. Vyberte prosím jiný den, nebo nám zavolejte.",
      en:"We see no clients on Friday. Please choose another day, or give us a call.",
      ru:"В пятницу приёма нет. Выберите, пожалуйста, другой день или позвоните нам.",
      uk:"У п'ятницю прийому немає. Оберіть, будь ласка, інший день або зателефонуйте нам.",
      de:"Freitags empfangen wir nicht. Bitte wählen Sie einen anderen Tag oder rufen Sie uns an.",
      pl:"W piątek nie przyjmujemy. Proszę wybrać inny dzień albo do nas zadzwonić." },
    needTime:   { cs:"Na tenhle den se přes web neobjednává. Vyberte pondělí nebo středu, hodinu 10–11 nebo 11–12 — nebo zavolejte na +420 773 966 787.",
      en:"This day cannot be booked online. Choose Monday or Wednesday, the 10–11 or 11–12 slot — or call +420 773 966 787.",
      ru:"На этот день онлайн-запись не работает. Выберите понедельник или среду, час 10–11 или 11–12 — или позвоните на +420 773 966 787.",
      uk:"На цей день онлайн-запис не працює. Оберіть понеділок або середу, годину 10–11 чи 11–12 — або зателефонуйте на +420 773 966 787.",
      de:"Dieser Tag lässt sich online nicht buchen. Wählen Sie Montag oder Mittwoch, die Stunde 10–11 oder 11–12 — oder rufen Sie +420 773 966 787 an.",
      pl:"Tego dnia nie da się zarezerwować przez internet. Proszę wybrać poniedziałek lub środę, godzinę 10–11 albo 11–12 — albo zadzwonić na +420 773 966 787." },
    byArrangement:{ cs:"po domluvě", en:"to be agreed", ru:"по договорённости", uk:"за домовленістю", de:"nach Absprache", pl:"do uzgodnienia" },
    pickDayFirst:{ cs:"Nejprve vyberte den.", en:"Choose a day first.", ru:"Сначала выберите день.", uk:"Спершу оберіть день.", de:"Bitte zuerst einen Tag wählen.", pl:"Najpierw wybierz dzień." },
    dayOnRequest:{ cs:"Tento den je vyhrazený objednaným klientům. Vyplňte kontakt a ozveme se s návrhem času.",
      en:"This day is reserved for booked clients. Leave your contact details and we will suggest a time.",
      ru:"Этот день — для записанных клиентов. Оставьте контакты, и мы предложим время.",
      uk:"Цей день — для записаних клієнтів. Залиште контакти, і ми запропонуємо час.",
      de:"Dieser Tag ist angemeldeten Mandanten vorbehalten. Hinterlassen Sie Ihre Kontaktdaten, wir schlagen eine Zeit vor.",
      pl:"Ten dzień jest dla umówionych klientów. Zostaw kontakt, a zaproponujemy godzinę." },
    needDay:    { cs:"Vyberte prosím den schůzky.", en:"Please choose a day for the meeting.", ru:"Выберите, пожалуйста, день встречи.", uk:"Оберіть, будь ласка, день зустрічі.", de:"Bitte wählen Sie einen Tag für das Gespräch.", pl:"Wybierz proszę dzień spotkania." },
    needConsent:{ cs:"Bez souhlasu se zpracováním údajů se vám nemáme jak ozvat — zaškrtněte prosím políčko.",
      en:"Without consent to process your data we cannot get back to you — please tick the box.",
      ru:"Без согласия на обработку данных мы не сможем связаться — отметьте, пожалуйста, галочку.",
      uk:"Без згоди на обробку даних ми не зможемо зв'язатися — позначте, будь ласка, галочку.",
      de:"Ohne Einwilligung in die Datenverarbeitung können wir uns nicht melden — bitte das Kästchen ankreuzen.",
      pl:"Bez zgody na przetwarzanie danych nie możemy się odezwać — zaznacz proszę pole." },
    needContact:{ cs:"Doplňte prosím jméno a telefon.", en:"Please add your name and phone number.", ru:"Добавьте, пожалуйста, имя и телефон.", uk:"Додайте, будь ласка, ім'я та телефон.", de:"Bitte ergänzen Sie Name und Telefonnummer.", pl:"Uzupełnij proszę imię i telefon." },
    timeAgreed: { cs:"čas doladíme telefonicky", en:"we will agree the time by phone", ru:"время согласуем по телефону", uk:"час узгодимо телефоном", de:"die Uhrzeit stimmen wir telefonisch ab", pl:"godzinę ustalimy telefonicznie" },
    atTime:     { cs:"v", en:"at", ru:"в", uk:"о", de:"um", pl:"o" },
    willCall:   { cs:"Ozveme se na", en:"We will call you on", ru:"Позвоним на номер", uk:"Зателефонуємо на номер", de:"Wir rufen Sie an unter", pl:"Zadzwonimy na numer" },
    andConfirm: { cs:"a rezervaci potvrdíme.", en:"and confirm the booking.", ru:"и подтвердим запись.", uk:"і підтвердимо запис.", de:"und bestätigen den Termin.", pl:"i potwierdzimy rezerwację." },
    firstMeeting:{ cs:"Nezávazné úvodní setkání", en:"A no-obligation first meeting", ru:"Первая встреча без обязательств", uk:"Перша зустріч без зобов'язань", de:"Unverbindliches Erstgespräch", pl:"Niezobowiązujące pierwsze spotkanie" },
    formErr:    { cs:"Doplňte prosím jméno a telefonní číslo — bez nich se nemáme jak ozvat.",
      en:"Please add your name and phone number — without them we cannot get back to you.",
      ru:"Добавьте имя и телефон — иначе мы не сможем перезвонить.",
      uk:"Додайте ім'я та телефон — інакше ми не зможемо передзвонити.",
      de:"Bitte Name und Telefonnummer ergänzen — sonst können wir uns nicht melden.",
      pl:"Podaj imię i telefon — bez nich nie mamy jak się odezwać." },
    thanks:     { cs:"Děkujeme", en:"Thank you", ru:"Спасибо", uk:"Дякуємо", de:"Danke", pl:"Dziękujemy" },
    weWillCallAt:{ cs:"Ozveme se na", en:"We will call you on", ru:"Позвоним на", uk:"Зателефонуємо на", de:"Wir melden uns unter", pl:"Odezwiemy się na" },
    inHours:    { cs:"v nejbližší provozní době.", en:"during the next office hours.", ru:"в ближайшее рабочее время.", uk:"найближчого робочого часу.", de:"in den nächsten Öffnungszeiten.", pl:"w najbliższych godzinach pracy." },
    calNote:    { cs:"Opakující se termíny pro rok", en:"Recurring deadlines for", ru:"Регулярные сроки на", uk:"Регулярні терміни на", de:"Wiederkehrende Fristen für", pl:"Powtarzalne terminy na" },
    calNote2:   { cs:"Aktuální měsíc je zvýrazněn — u klientů tyto termíny hlídáme automaticky.",
      en:"The current month is highlighted — for our clients we track these dates automatically.",
      ru:"Текущий месяц выделен — клиентам мы отслеживаем эти сроки автоматически.",
      uk:"Поточний місяць виділено — клієнтам ми відстежуємо ці терміни автоматично.",
      de:"Der laufende Monat ist hervorgehoben — für Mandanten überwachen wir diese Termine automatisch.",
      pl:"Bieżący miesiąc jest wyróżniony — klientom pilnujemy tych terminów automatycznie." },
    quizQ:      { cs:"Otázka", en:"Question", ru:"Вопрос", uk:"Питання", de:"Frage", pl:"Pytanie" },
    quizOf:     { cs:"ze", en:"of", ru:"из", uk:"з", de:"von", pl:"z" },
    quizBack:   { cs:"Zpět na předchozí otázku", en:"Back to the previous question", ru:"Назад к предыдущему вопросу", uk:"Назад до попереднього питання", de:"Zurück zur vorherigen Frage", pl:"Wróć do poprzedniego pytania" },
    quizBook:   { cs:"Domluvit nezávaznou konzultaci", en:"Arrange a no-obligation consultation", ru:"Договориться о консультации", uk:"Домовитися про консультацію", de:"Unverbindliche Beratung vereinbaren", pl:"Umów niezobowiązującą konsultację" },
    quizAgain:  { cs:"Projít znovu", en:"Start over", ru:"Пройти заново", uk:"Пройти знову", de:"Nochmal starten", pl:"Zacznij od nowa" },
    quizSummary:{ cs:"Diagnostika", en:"Diagnostic", ru:"Диагностика", uk:"Діагностика", de:"Diagnose", pl:"Diagnostyka" },
    quizRec:    { cs:"Doporučení", en:"Recommendation", ru:"Рекомендация", uk:"Рекомендація", de:"Empfehlung", pl:"Rekomendacja" },
    origName:   { cs:"", en:"Czech filing", ru:"чешское название", uk:"чеська назва", de:"tschechische Bezeichnung", pl:"czeska nazwa" }
  },

};

/* pomocník: překlad českého řetězce přes slovník z assets/i18n.js */
window.KP.t=function(cs){
  if(this.lang==="cs")return cs;
  var d=window.KP_DICTS&&window.KP_DICTS[this.lang];
  return (d&&d[cs])||cs;
};
window.KP.rerender=[];
window.KP.refresh=function(){this.rerender.forEach(function(f){try{f()}catch(e){}})};
