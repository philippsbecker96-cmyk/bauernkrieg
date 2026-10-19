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
| Kamera bewegen | W A S D oder Pfeiltasten |
| Kamera ziehen | mittlere Maustaste gedrückt halten |
| Zoomen | Mausrad (zoomt zum Mauszeiger) |

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
    data/             Datengetriebene Definitionen (Karten, Einheitentypen mit Kampfwerten, Bewegungs-, Kampf- und Steuerungskonstanten, Testszenario)
    map/              Kacheltypen und Kartengenerator (ohne Phaser)
    camera/           Kamera-Mathematik (ohne Phaser)
    entities/         Einheitenzustand und Erzeugung der Startgruppen (ohne Phaser)
    systems/          Pathfinding (A*), Gruppenbewegung, Abstoßung, Auswahl, Kampf und Gegner-KI (ohne Phaser)
  tests/              Vitest-Tests
```

Spiellogik und Daten bleiben unabhängig von Phaser, damit sie mit Vitest testbar sind.
