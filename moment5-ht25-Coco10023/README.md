# Labbgrund till Moment 5 i kursen DT084G, Introduktion till programmering i JavaScript

**Hej, jag heter Francisco Mauricio De Leon Gonzalez! 👋 Jag studerar webbutveckling och lär mig Javascript. Mitt student id är: frde2500**  

## Syfte
Projektet är en webbapplikation som visar Sveriges Radios kanaler och deras programtablåer via SR:s öppna API.  
Syftet är att öva på att konsumera öppna data med JavaScript, hantera JSON och skapa en dynamisk webbplats med modulär struktur.


## Funktioner
### Obligatoriskt
- Lista med SR-kanaler i vänstermeny (hämtas via API).  
- Visar information via `title` vid hover.  
- Klick på kanal visar dagens tablå (från nu till midnatt).  

### Valfritt
- Välj antal kanaler i menyn (`#numrows`).  
- Dropdown och knapp för att spela upp live-radio (`#playchannel`, `#playbutton`).  
- Audio-spelare som spelar vald kanal (`#radioplayer`).  


## Teknik
- **JavaScript (ES6+)**, **Fetch API**, **JSON**
- **HTML5**, **CSS3**
- **Sveriges Radio öppna API:** https://sverigesradio.se/oppetapi  
- Versionshantering med **GitHub Classroom**


## Flöde
1. Hämtar kanaler från API och renderar meny.  
2. Klick på kanal → hämtar tablå för dagen.  
3. Dropdown + knapp spelar live-ström.  






