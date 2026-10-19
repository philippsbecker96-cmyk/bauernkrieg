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
| Neustart | N |
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
    data/             Datengetriebene Definitionen (Karten, Einheitentypen, Waffen, Rüstungen, Bewegungs-, Kampf- und Steuerungskonstanten, Test- und Belastungsszenario)
    map/              Kacheltypen und Kartengenerator (ohne Phaser)
    camera/           Kamera-Mathematik (ohne Phaser)
    entities/         Einheitenzustand und Erzeugung der Startgruppen (ohne Phaser)
    systems/          Pathfinding (A*), Gruppenbewegung, Abstoßung, Auswahl, Kampf und Gegner-KI (ohne Phaser)
  tests/              Vitest-Tests
```

Spiellogik und Daten bleiben unabhängig von Phaser, damit sie mit Vitest testbar sind.
