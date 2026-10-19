# Bauernkrieg – Aufstand der gemeinen Leute

Historisch inspiriertes, missionsbasiertes 2D-Echtzeitstrategiespiel zum Deutschen Bauernkrieg (1524–1526).
Browserspiel mit TypeScript, [Phaser](https://phaser.io/) und [Vite](https://vite.dev/).

- Spielkonzept: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)
- Implementierungsplan und Meilensteine: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)

## Voraussetzungen

- [Node.js](https://nodejs.org/) 20.19 oder neuer (empfohlen: 24) inklusive npm
- Ein aktueller Browser mit WebGL (Chrome, Firefox, Safari, Edge)

## Installation

```bash
npm install
```

## Starten (Entwicklung)

```bash
npm run dev
```

Danach die angezeigte Adresse öffnen (standardmäßig http://localhost:5173/). Änderungen am Code werden automatisch neu geladen.

**Mini-Mission „Der erste Haufen“** (startet automatisch)

Eine kleine Gruppe Bauern mit einem Armbrustschützen steht am Westrand des Weges. Südwestlich liegt das Dorf Hohenweiler, östlich des Bachs ein Wachposten.

1. Bauern auswählen und in den blauen Kreis um das Dorf schicken, dann das Dorf anklicken: Von den 6 Freiwilligen des Dorfes
   schließen sich so viele an, wie die Nahrung danach noch 2 Tage versorgt; Umschalt+Klick holt genau einen.
   Die übrigen bleiben im Dorf und können nach einem Nahrungskauf (**F**) nachkommen
   (Platzhalter-Rekrutierung, wird in Meilenstein 5 ersetzt).
2. Über die Furt zum Posten ziehen und die Wachen angreifen.
3. **Sieg:** eigene Einheiten stehen 5 Sekunden lang im Kreis des Postens, ohne dass Gegner darin sind (Fortschrittsring, Anzeige oben links).
   Verlassen alle eigenen Einheiten den Kreis, sinkt der Fortschritt wieder; stehen Gegner darin, pausiert er.
4. **Niederlage:** alle eigenen Einheiten sind gefallen.

Die Missionsdaten (Karte, Startgruppe, Dorf, Posten, Einnahmezeit, Startvorräte, Nahrungsangebot des Dorfes, Belohnung,
Namen und Wildbestand einzelner Wälder) stehen in `src/game/data/missions.ts`.

**Gold und Nahrung** (Anzeige oben rechts)

- 1 Spieltag = 60 Sekunden Echtzeit. Am Ende jedes Tages isst jede lebende eigene Einheit 1 Nahrung (einmaliger Abzug).
- Angezeigt werden Tag, Zeit bis zum nächsten Abzug, Gold, Nahrung, Tagesverbrauch und „Nahrung reicht für ca. X Tage“.
- Reicht die Nahrung für weniger als 2 Tage, färbt sich die Anzeige orange (Warnung). Fehlt am Tagesende Nahrung,
  hungert der Haufen: Nahrung bleibt bei 0, die Anzeige wird rot.
- Rekrutierungsstopp: Freiwillige schließen sich nur an, soweit die Nahrung danach noch mindestens 2 Tage reicht, und gar nicht, solange der Haufen hungert.
- Nahrung kaufen: eigene Leute ins Dorf schicken, **F** drücken (10 Nahrung für 10 Gold, insgesamt 30 vorrätig).
- Sieg bringt eine Belohnung (+25 Gold, +20 Nahrung).
- Zeitmaßstab, Verbrauch und Warnschwelle stehen in `src/game/data/balance.ts`.

**Jagd** (zusätzliche, begrenzte Nahrungsquelle)

- Zusammenhängende Waldkacheln (ab 4 Kacheln) bilden ein Waldstück mit eigenem Wildbestand.
  Name und grober Bestand (reich an Wild / mäßig Wild / erschöpft) stehen auf der Karte und beim Überfahren mit der Maus.
- Jagen: eigene Leute auswählen, Mauszeiger auf ein Waldstück, **J**. Die Jäger laufen hin, jagen 30 Sekunden
  und kehren dann selbst zum Haufen zurück (zur nächsten eigenen Einheit, die nicht jagt; gibt es keine, zum Sammelpunkt).
- Alle 5 Sekunden versucht jeder Jäger einen Fang; die Chance hängt von seiner Waffe ab
  (Armbrust 60 %, improvisierte Waffe 10 %). Wildschwein 12, Reh 8, Hase 2 Nahrung. Höchstens 16 Nahrung pro Jäger.
- Die Beute wird erst gutgeschrieben, wenn ein Jäger wieder nah beim Haufen ist. Fällt er vorher, ist sein Anteil verloren.
- **Z** ruft die ausgewählten Jäger zurück (ohne Auswahl: alle); sie bringen nur das bis dahin Erlegte mit.
- Jäger (ockerfarbener Ring, gefüllt nach Traglast) nehmen keine anderen Befehle an, bis sie zurück sind.
  Unterwegs ignorieren sie Gegner, beim Jagen wehren sie sich nur auf der Stelle und erleiden 50 % mehr Schaden.
- Jeder Fang senkt den Wildbestand; ein erschöpfter Wald liefert nichts mehr. Das Wild wächst langsam nach (0,5 Tiere pro Tag).
- Der wildreiche Herrenwald neben dem Posten gehört einem Herrn; Wilderei hat ab Meilenstein 6 Folgen.
- Alle Werte (Wildarten, Bestandsregel fest / pro Waldkachel / mit Zufallsstreuung, Nachwachsen, Jagddauer,
  Fangchance je Waffenklasse, Traglast, Verteidigungsmalus, Rückkehrradius) stehen in `src/game/data/hunting.ts`.

**Steuerung**

| Aktion | Eingabe |
| --- | --- |
| Einheit auswählen | Linksklick auf eigene Einheit (Klick ins Leere hebt die Auswahl auf) |
| Mehrere auswählen | Auswahlrahmen mit gedrückter linker Maustaste ziehen |
| Auswahl erweitern | Umschalttaste + Klick (umschalten) oder + Rahmen (hinzufügen) |
| Auswahl aufheben | Esc |
| Bewegen | Rechtsklick auf das Ziel (Klick ins Wasser → nächstes Ufer); marschierende Einheiten ignorieren Gegner |
| Angreifen | Rechtsklick auf eine gegnerische Einheit |
| Position halten | H (Einheiten bleiben stehen und kämpfen nur in eigener Reichweite) |
| Rückzug | R (ausgewählte Einheiten lösen sich aus dem Kampf und laufen zum Sammelpunkt, blaue Fahne) |
| Sammelpunkt setzen | P (an die Position des Mauszeigers) |
| Rekrutieren (Mini-Mission) | eigene Einheit in den blauen Kreis ums Dorf schicken, dann Linksklick auf das Dorf (Umschalt+Klick: nur einer) |
| Nahrung kaufen (Mini-Mission) | eigene Einheit im blauen Kreis ums Dorf, dann F |
| Jagen (Mini-Mission) | Einheiten auswählen, Mauszeiger auf ein Waldstück, J |
| Jäger zurückrufen | Z (ausgewählte Jäger; ohne Auswahl alle) |
| Neustart | N |
| Testgefecht ein/aus | T (freies Gefecht aller Einheitentypen aus Meilenstein 1–3) |
| Belastungstest mit 100 Einheiten ein/aus | B (beide Armeen greifen sofort an; FPS oben links) |
| Werte einer Einheit anzeigen | Mauszeiger über die Einheit (oder genau eine Einheit auswählen) |
| Kamera bewegen | W A S D oder Pfeiltasten |
| Kamera ziehen | mittlere Maustaste gedrückt halten |
| Zoomen | Mausrad (zoomt zum Mauszeiger) |

## Einheiten, Waffen und Rüstung

Einheitentypen (`src/game/data/units.ts`) haben Grundwerte (Lebenspunkte, Tempo, Training, Parade) und eine Standardausrüstung.
Waffen (`weapons.ts`) und Rüstungen (`armor.ts`) sind eigene Daten; jede Einheit trägt ihre eigene Kopie der Ausrüstung.

Schaden pro Treffer = Waffenschaden × Training × (1 − Rüstungsschutz × (1 − Panzerbrechung)) × (1 − Parade, nur Nahkampf), mindestens 1.
Fernschüsse auf Einheiten im Wald verfehlen mit der Wahrscheinlichkeit `rangedCover` der Kachel (`src/game/map/tiles.ts`).

Platzhaltergrafik: Umriss = Rüstung (dunkel: keine, braun: leicht, stahlgrau: schwer); Symbol = Waffe
(Bogen: Armbrust, langer Schaft: Spieß, Schaft mit Klinge: Hellebarde, Kreuz: Schwert, ohne: improvisierte Waffe).

## Tests

```bash
npm test          # einmal ausführen
npm run test:watch  # bei Änderungen erneut ausführen
```

Getestet wird mit [Vitest](https://vitest.dev/). Tests liegen in `src/tests/` und decken reine Spiellogik ab (ohne Phaser).
Grafik und Steuerung werden manuell im Browser geprüft.

## Build

```bash
npm run build     # Typprüfung + statischer Build nach dist/
npm run preview   # Build lokal ansehen (http://localhost:4173/)
```

Der Build verwendet relative Pfade (`base: './'`) und kann deshalb unverändert auf GitHub Pages, Netlify oder itch.io hochgeladen werden.

## Veröffentlichung (GitHub Pages)

Bei jedem Push auf den Branch `main` baut der Workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
das Spiel, führt die Tests aus und veröffentlicht `dist/` auf GitHub Pages.

Einmalig im GitHub-Repository einstellen: **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.

## Projektstruktur

```text
docs/                 Design-Dokument und Implementierungsplan
src/
  main.ts             Einstiegspunkt, Phaser-Konfiguration
  scenes/             Phaser-Szenen (Boot, Mission, UI)
  game/
    data/             Datengetriebene Definitionen (Karten, Missionen, Einheitentypen, Waffen, Rüstungen, Bewegungs-, Kampf- und Steuerungskonstanten, Versorgung/Balancing, Jagd, Test- und Belastungsszenario)
    map/              Kacheltypen und Kartengenerator (ohne Phaser)
    camera/           Kamera-Mathematik (ohne Phaser)
    entities/         Einheitenzustand und Erzeugung der Startgruppen (ohne Phaser)
    systems/          Pathfinding (A*), Gruppenbewegung, Abstoßung, Auswahl, Kampf, Gegner-KI, Missionsregeln, Versorgung und Jagd (ohne Phaser)
  tests/              Vitest-Tests
```

Spiellogik und Daten bleiben unabhängig von Phaser, damit sie mit Vitest testbar sind.
