/* Lösning till uppgift 5.1 av Francisco De Leon 2025.
Detta program är en webbapplikation som visar Sveriges Radios kanaler och deras programtablåer via 
Sveriges Radios öppna API som listar kanaler, visar dagens programtablå och kan
spela en kanals livestream inom en HTML5-audio spelare. 
*/

"use strict";

/* Programtablåer och Live spelare - Planering:
- Navigering/Huvudmeny som listar kanaler (titel info)
- Klick visar/utskrift på dagens tablå från nu till midnatt
- Valfritt: välj antal kanaler vänsterlistan med (#numrows)
- Valfritt: dropdown + knapp för spelar live med (#playchannel + #playbutton)
- Valfritt: rendera <audio> i #radioplayer */


/* Hämtar elementen från HTML för att kunna manipulera dem */
const ul = document.getElementById("mainnavlist");    // <ul> där vi visar kanal-listan i vänsterkanten
const info = document.getElementById("info");          // <div> där vi visar programtablån
const numrows = document.getElementById("numrows");    // input-fältet för hur många kanaler som ska visas
const playSelect = document.getElementById("playchannel"); // <select> för radiokanaler (spelaren)
const playBtn = document.getElementById("playbutton");     // knappen "Spela"
const player = document.getElementById("radioplayer");     // <div> längst ner där ljudspelaren skrivs ut

// Kontroll ifall elementen inte skulle hittas
if (!ul || !info) {
    console.error("Obligatoriska element saknas inom HTML"); 
}

// Adress till Sveriges Radio öppna API
const API = "https://api.sr.se/api/v2"; // Grund-URL till Sveriges radio API


// Hjälpfunktioner: små funktioner som hjälper med att hantera tid och text

/* Kunna tolka datumformat från Sveriges Radio som är inom JSON format: exempelvis Date(1697463600000+0200) */
function parseSRDate(s) {
  // Om s är null eller undefined, använd en tom sträng istället så att regexen inte kraschar.
  // Reguljärt uttryck: /\/Date\((\d+)/ 
  // \/Date\( letar efter texten "/Date("
  // (\d+) = matchar en eller flera siffror och sparar dem i en "fångstgrupp" (m[1])
  // exec() = kör regexen på strängen s och returnerar en matchningslista
  // m[0] = hela matchningen (t.ex. "/Date(1697463600000")
  // m[1] = själva siffrorna (t.ex. "1697463600000")
  const m = /\/Date\((\d+)/.exec(s || "");

  // Om regexen hittade siffror (m finns), skapa ett nytt Date-objekt baserat på millisekunderna.
  // Annars försök tolka s som ett vanligt datum (t.ex. "2025-10-27T14:00:00Z").
  return m ? new Date(Number(m[1])) : new Date(s);
}


/* Fixa Format för timmar och minuter i svensk lokal tid. */
function timeHHMM(d) {
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// Fixa Format för i år, månad och datum.
function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Skydd mot skadlig HTML som ersätter tecken som < och & med sina HTML entiteter så att användartext inte tolkas som HTML
function esc(t) {
  return String(t ?? "") /* t ?? "" = Innebär att om t är null eller undefinied använd istället en tom sträng "" 
  Det gör att funktionen inte kraschar om man skulle skicka in null eller glömmer ett värde. 
  ?? = Om värdet är null eller undefinied används värdet till höger istället. */
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;");
}


// API hantering: kommunikation med Sveriges Radios öppna data

// Funktionen fetchChannels hämtar alla kanaler från API:t 
async function fetchChannels() { /* Async gör funktionen asynkront som är ett löfte 
(promise) om att värdet kommer senare efter att exempelvis nätverksförfrågan är färdig. */
  try { // Felhanteringsblock: Kod som kan orsaka fel
// Skickar en GET förfrågan till API:t med fetch 
  const res = await fetch(`${API}/channels?format=json&size=500`); 
  /* Await gör att funktionen väntar med att gå vidare tills fetch har hämtat kanalerna */

// Om förfrågan inte är okej körs error meddelandet "Kunde inte hämta kanaler"
  if (!res.ok) throw new Error("Kunde inte hämta kanaler"); 
// Tolkar svaret som JSON.
  const data = await res.json();
// Returnerar listan med kanaler eller en tom array ifall det skulle saknas. 
  return data.channels || [];
  } catch (err) { // Ifall try inte skulle funka på grund av exempelvis ett nätverksfel
    console.error("Ett fel uppstod vid hämtning av kanaler", err);
    return []; // Returnera en tom lista istället för att riskera att krascha appen. 
  }
}

// Funktionen fetchSchedule hämtar programtablå för en viss kanal och ett visst datum
async function fetchSchedule(channelId, ymd) { 
  try {
// Skickar en GET förfrågan till API:t med fetch för en viss kanal och datum
  const res = await fetch(`${API}/scheduledepisodes?channelid=${channelId}&date=${ymd}&format=json&size=500`);
// Om förfrågan inte är okej körs error meddelandet "Kunde inte hämta tablå"
  if (!res.ok) throw new Error("Kunde inte hämta tablå"); 
// Tolkar svaret som JSON.
  const data = await res.json();
// Returnerar data.schedule eller data.scheduledepisodes eller en tom lista
  return data.schedule || data.scheduledepisodes || [];
  } catch (err) { // Ifall try inte skulle funka på grund av exempelvis nätverksfel
    console.error("Kunde inte hämta tablå", err); 
    return []; // Returnera en tom lista istället för att riskera att krascha appen.
  }
}


// Användargränssnittet (HTML från datan som hämtas)

// Visar alla kanaler i vänstermenyn
function renderMenu(channels) {
    ul.innerHTML = ""; // För att rensa gammal lista 

// Antalet kanaler som ska visas (bestäms av inputfältet)
const max = Math.max(1, Math.min(2000, Number(numrows?.value) || 10)); 
/* Lägger till ? ifall någon tar bort 
#numrows på HTML. Det heter optional chaining och innebär att om numrows finns så hämtas det annars 
returneras undefined utan att kasta ett fel. */
// Number försöker konvertera värdet numrow till ett nummer.
/* Använder || logiskt eller för att returnera det första sanna värdet. Det innebär att om Number(numrows?.value
är falskt som NaN, 0 eller undefined så används 10 istället.) */
// Math.min tar det lägsta värdet mellan 2000 och resultatet. Gör att max aldrig kan vara större än 2000
// Math.max tar det största värdet mellan 1 och resultatet

// Loopar igenom kanalerna och skapa <li> element för varje kanal och lägger till dem i HTML
// Använder slice för att kopiera kanalerna som börjar på indexnummer 0 och slutar upp till max.
// .forEach med hjälp av ch går igenom varje element på den sliceade listan och innehåller därmed varje enskild kanal vid varje iteration. 
channels.slice(0, max).forEach(ch => {
    const li = document.createElement("li"); // Skapar alltså ett nytt <li> element i DOM:en


// Lägger till information (tooltip-text) utav programmet som visas när man håller musen över kanalen. 
// Jag lägger till en tooltip-text genom att lägga till en title attribut till <li> elementet. 
// ch.tagline = Lägger till en tagline, ch.channeltype && Typ channeltype lägger till typ om det finns.
// ch.siteurl = Lägger till länk om den finns 
    li.title = [ch.tagline, ch.channeltype && `Typ: ${ch.channeltype}`, ch.siteurl]
      .filter(Boolean) // .filter(Boolean) = Tar bort tomma värden
      .join(' • ');  // .join(' * ') = Sätter ihop till snygg text

    // Kanalens namn som text
    li.textContent = ch.name;

    /* När man klickar på kanalen visas dess tablå med hjälp av eventelistener som triggar igång en funktion
    när man trycker på en kanal/<li> element */
    li.addEventListener("click", () => showSchedule(ch));

    // Lägg till <li> elementet i listan på HTML
    ul.appendChild(li);
  });
}

// Fyll dropdown-listan/<select> elementet för spelaren med alla kanaler
// Funktionen fillPlayerSelect innehåller parametern channels som innehåller alla kanaler från Sveriges Radio
function fillPlayerSelect(channels) {
  playSelect.innerHTML = ""; // rensa först
  channels.forEach(ch => { // forEach med hjälp av ch loopar igenom varje objekt på channels.
    const opt = document.createElement("option"); // Skapar ett nytt <option> element som ska läggas till i <select>
    opt.value = ch.id; // Sätter värdet (det som ska skickas vidare om du väljer alternativet) till kanalens id
    opt.textContent = ch.name; // Sätter texten som visas i dropdown listan till kanalens namn från channels
    playSelect.appendChild(opt); // Lägger till <option> elementet i <select> elementet. 
  });
}

// Skapar en HTML5-audio-spelare för vald kanal med hjälp av en funktion som har ch som parameter.
/* Använder optional chaining ? för att undvika fel om ch eller liveaudio saknas. Om ch eller ch.liveaudio
är undefined så blir src också undefined istället för att det ska krascha.*/
function renderPlayerForChannel(ch) {
  const src = ch?.liveaudio?.url; // liveaudio.url innehåller MP3-strömmen
  if (!src) {  // Om ingen ljudström hittas byt ut innehållet i player variabeln mot ett kort felmeddelande. 
    player.innerHTML = `<p>Ingen liveström hittades för ${esc(ch?.name || "")}.</p>`;
    return; // Avsluta funktionen direkt.
  }
  // Skriver ut ett <audio>-element direkt i sidan
  player.innerHTML = `
    <audio controls autoplay>
      <source src="${esc(src)}" type="audio/mpeg">
    </audio>
  `;
}


// Visa programtablå för vald kanal

async function showSchedule(channel) { // Använder async för att markera att funktionen är asynkron. 
  // Visa meddelande medan vi laddar, esc() hindrar att data injicerar HTML/JS
  info.innerHTML = `<p>Laddar tablå för <strong>${esc(channel.name)}</strong>...</p>`;

  // Hämta dagens datum och kanalens programlista
  const ymd = todayYMD();
  const list = await fetchSchedule(channel.id, ymd); /* await pausar funktionen tills fetchSchedule har hämtat
  tablån för channel.id den dagen. Under tiden blockeras inte resten av sidan. */

  // Filtrera ut bara de kanaler som ännu inte har slutat
  const now = new Date();  // Skapar ett Date-objekt för aktuell tid, används som referenspunkt. 
  const upcoming = list // Ger upcoming variabeln värdet från list variabeln som innehåller programmen.
    .map(e => ({ // .map() går igenom varje objekt med paramtern (e) i list och skapar en ny array där varje objekt får exakt de fält man vill ha
      title: e.title,
      subtitle: e.subtitle,
      description: e.description,
      start: parseSRDate(e.starttimeutc || e.starttime), // parseSRDate konverterar datumsträngarna från API:t till riktiga Date-objekt
      end: parseSRDate(e.endtimeutc || e.endtime),
    }))
    .filter(e => e.start && e.end && e.end > now) /* e.start && e.end = Ta bara med kanaler som har giltiga 
     datum och e.end > now = Ta bara med kanaler som inte har slutat ännu*/
     // Efter filtreringen ska programmen sorteras i tidsordning från tidigast till senast. 
    .sort((a, b) => a.start - b.start); /* När man subtraherar två Date-objekt får man skillnaden i milisekunder, 
    ett negativt resultat leder till att a börjar före b och hamnar före i listan. */

  // Om det inte finns några program kvar idag körs koden på if satsen
  if (!upcoming.length) {
    info.innerHTML = `<h2>${esc(channel.name)}</h2><p>Inga fler program idag.</p>`;
    return;
  }

  // Programlistan med hjälp av HTML kod
  // info som är en div får text innehållet från variablerna channel.name som visar kanalens namn
  // ymd variabeln är datumet
  /* Använder map() för att loopa igenom varje program i arrayen upcoming.
   e representerar ett enskilt programobjekt.
   För varje kanal skapas och returneras en HTML-textsnutt (<article>) med dess information. */
  info.innerHTML = `
    <h2>${esc(channel.name)} - ${esc(ymd)}</h2>  
    ${upcoming.map(e => ` 
      <article>
        <h3>${esc(e.title)}</h3>
        ${e.subtitle ? `<h4>${esc(e.subtitle)}</h4>` : ''}
        <h5>${timeHHMM(e.start)}–${timeHHMM(e.end)}</h5>
        ${e.description ? `<p>${esc(e.description)}</p>` : ''}
      </article>
    `).join("")} 
  `;
  // Efter .map() får jag en array av textsnuttar och .join("") slår ihop dem till en enda stor sträng så det
  // inte blir massa koma tecken emellan. */

  // Uppdatera dropdown och spelare till den kanal vi tittar på:
  // playSelect är ett <select> element där användaren kan välja kanal.
  // Värdet på playSelect blir kanalens id så att rätt kanal visas som är vald. 
  // String(channel.id) säkerställer att värdet är en sträng eftersom <option value = " "> alltid är text.
  playSelect.value = String(channel.id);
  if (!player.querySelector("audio")) renderPlayerForChannel(channel);
}
// Om player.querySelector("audio") inte hittar ett <audio> element i player anropas istället renderPlayerForChannel(channel).


// Initieringen: Arrow funktion som körs när HTML-dokumentet har laddats klart
document.addEventListener("DOMContentLoaded", async () => {
    try { /* Felhanteringsblock, all kod inuti try körs "vanligt" om det blir ett nätverksfel på fetchChannels()
        hoppar programmet till catch och visar felmeddelande istället för att krascha */

    const channels = await fetchChannels(); // Funktionen fetchChannels() hämtar alla kanaler från API:t längre upp i koden
    // await innebär att man väntar på att hämtningen är klar innan det går vidare
    // En lista med alla kanalobjekt sparas i variabeln channels

    /* Kallar på funktionerna som visar kanalmenyn och fyller i dropdown-listan genom att skicka parametern 
    channels som indata, som innehåller alla kanalerna. */
    renderMenu(channels);
    fillPlayerSelect(channels);

    // När användaren ändrar antal kanaler och uppdaterar menyn
    numrows.addEventListener("change", () => renderMenu(channels));
    // numrows är ett inputfält där användaren anger antalet kanaler som ska visas.
    // När värdet ändras (change) körs arrow funktionen renderMenu(channels) igen. 
    // Vilket leder till att listan uppdateras med rätt antal kanaler. 

    /* När användaren klickar på "Spela" så spelas vald kanal med hjälp av event listener som triggar igång
    en arrow funktionen. playSelect?.value hämtar det valda kanal-id:t från dropdownen med optional chaining
    ifall dropdownen inte hunnit laddas. Number gör om id:t till ett tal. 
    channels.find(c => c.id === id letar upp det kanalobjekt i listan som har rätt id.
    Om det hittas anropas renderPlayerForChannel(ch) för att skapa en <audio> spelare som spelar en kanals musik.*/
    playBtn.addEventListener("click", ()=> {
        const id = Number(playSelect?.value); // Lägger till ? ifall någon trycker spela innan dropdown hunnit fyllas
        const ch = channels.find(c => c.id === id);
        if (ch) renderPlayerForChannel(ch);
    });

    // Visa något direkt när sidan laddas (första kanalens tablå)
    if(channels[0]) showSchedule(channels[0]); // Kollar om det finns minst en kanal. 
    // Om ja visas programschemat för den första kanalen, för att användaren ska kunna se något direkt. 

} catch (err) { // Om något går fel exempelvis nätverksfel (som alternativ till try)
    console.error(err);
    info.innerHTML=`<p class = "error"> Kunde inte hämta data. Försök igen senare.</p>`;
}

}); 
