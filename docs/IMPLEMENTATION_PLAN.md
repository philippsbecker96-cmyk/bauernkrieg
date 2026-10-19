# IMPLEMENTATION PLAN
## Bauernkrieg – Aufstand der gemeinen Leute

**Version:** 0.3  
**Datei:** `docs/IMPLEMENTATION_PLAN.md`  
**Bezug:** `docs/GAME_DESIGN.md`  
**Ziel:** Das Spiel schrittweise zu einer vollständigen, spielbaren 2D-RTS-Kampagne mit 3–5 Missionen entwickeln.

> **Vorrangregel:** `docs/GAME_DESIGN.md` legt fest, *was* das Spiel ist. Dieser Plan legt fest, *in welcher Reihenfolge und Arbeitsweise* gebaut wird. Bei einem Widerspruch wird nicht eigenständig entschieden; der Widerspruch wird als offene Entscheidung markiert und nachgefragt.

---

## 1. Entwicklungsprinzipien

1. **Immer ein spielbarer Stand:** Nach jedem Meilenstein muss das Spiel starten und die bereits umgesetzten Kernfunktionen müssen funktionieren.
2. **Kleine, überprüfbare Änderungen:** Jede Aufgabe soll möglichst einen klaren Umfang haben und separat getestet werden können.
3. **Keine vorschnelle Komplexität:** Zunächst eine Karte und eine Mission; weitere Missionen und Spezialmechaniken erst, wenn die Kernschleife funktioniert.
4. **Datengetriebener Aufbau:** Einheiten, Waffen, Dörfer, Missionen, Startbedingungen und Balancing-Konstanten werden möglichst in Daten definiert, nicht in verstreuten Sonderfällen im Code.
5. **Spielregeln von Darstellung trennen:** Bewegung, Kampf, Ressourcen und Unterstützung sollen unabhängig von Grafikeffekten funktionieren.
6. **Historische Atmosphäre ohne Simulationsballast:** Keine Produktionsketten für Holz, Stein, Erz oder Kohle im ersten Spielumfang.
7. **Regelmäßig versionieren:** Nach jedem abgeschlossenen Meilenstein einen Git-Commit mit verständlicher Nachricht erstellen.
8. **Alles in die Mini-Mission:** Ab Meilenstein 3a wird jedes neue System in die bestehende Mini-Mission eingebaut und dort getestet, nicht isoliert entwickelt.

---

## 2. Zentrale Spielsysteme und feste Designentscheidungen

Die verbindlichen Regeln stehen in `docs/GAME_DESIGN.md`. Dieser Abschnitt fasst die für die Umsetzung wichtigsten Punkte zusammen.

### 2.1 Fortbestehender Bauernhaufen
- Überlebende Einheiten werden zwischen Missionen übernommen.
- Gefallene Einheiten bleiben verloren.
- Ausrüstung bleibt bei überlebenden Einheiten.
- Verstärkungen sind möglich, aber nicht automatisch kostenlos oder unbegrenzt.
- Eine schlechte Schlacht soll spürbare Folgen haben, aber nicht ohne Weiteres eine Kampagne unwiderruflich ungewinnbar machen.

### 2.2 Ressourcen
- **Gold:** Kauf von Nahrung und Ausrüstung, Anwerbung von Landsknechten, Beuteanteil der Landsknechte.
- **Nahrung:** Versorgung der gesamten Armee; kann gekauft, freiwillig erhalten oder erbeutet werden.
- Keine separate Holz-, Stein-, Erz- oder Kohlewirtschaft in der ersten Version.
- Waffen und Rüstungen sind Ausrüstung, keine abstrakte unbegrenzte Lagerressource.
- Zeitmaßstab: 1 Spieltag = 60 Sekunden Echtzeit in der Mission; Nahrungsabzug einmal pro Spieltag; Marsch zwischen Missionen = 3 Spieltage. Alle Werte konfigurierbar.

### 2.3 Bevölkerung und Unterstützung
- Ein globaler Unterstützungswert und lokale Dorfzustände.
- Unterstützende Orte können Freiwillige, Nahrung und gelegentlich Landsknechte anbieten.
- Schutz und respektvoller Umgang können Unterstützung verbessern.
- Erzwungene Abgaben und Plünderungen liefern kurzfristige Ressourcen, senken aber lokale Unterstützung.
- Gewalt gegen Bewohner verursacht besonders starke negative Folgen.
- Bei anhaltender Unterversorgung oder sehr niedriger Moral können Bauern desertieren.

### 2.4 Landsknechte – zentrale Söldnereinheit
Die verbindlichen Regeln stehen in `docs/GAME_DESIGN.md`, Abschnitt 7.4.

Landsknechte sind eine wichtige, aber kostenpflichtige Truppenart. Sie unterscheiden sich von freiwilligen Bauern durch bessere Ausbildung, Kampffähigkeit und meist professionellere Ausrüstung. Von Veteranen unterscheiden sie sich dadurch, dass sie bezahlt werden; Veteranen schließen sich freiwillig an.

**Rekrutierung**
- Landsknechte können an bestimmten Dörfern, in Tavernen, Lagern oder durch Missionsereignisse verfügbar werden.
- Sie kosten Gold bei der Anwerbung.
- Nicht jeder Ort bietet sie an; Verfügbarkeit ist begrenzt und missionsabhängig.
- Sie benötigen wie alle Einheiten Nahrung.
- Sie können bessere Waffen oder Rüstung tragen, sollen aber nicht automatisch unbesiegbar sein.

**Beuteanteil**
- Bei erfolgreicher Plünderung oder beim Einnehmen eines Ortes erhält der Spieler eine Beute in Gold, Nahrung und gegebenenfalls Ausrüstung.
- Ein Anteil des Geldwerts der Beute wird als Beuteanteil an die Landsknechte abgegeben.
- Je größer der Anteil der Landsknechte an der Gesamtarmee ist, desto höher ist der Gesamtanteil, den sie beanspruchen.
- Der Spieler erhält nur den verbleibenden Anteil der monetären Beute.
- Der Landsknecht-Beuteanteil betrifft zunächst nur Gold.
- Der Spieler muss abwägen: Landsknechte machen die Armee schlagkräftiger, verringern aber die Beute, die für Nahrung, Ausrüstung und weitere Kampagnenziele übrig bleibt.

**Einfache erste Berechnungsregel**
- Lege einen konfigurierbaren Grundanteil pro Landsknecht fest.
- Berechne den gesamten Anspruch aus Anzahl oder Anteil der Landsknechte und der Geldbeute.
- Begrenze den Anspruch auf die tatsächlich verfügbare Beute; erzeuge keine negativen Goldbestände.
- Die genaue Formel und die Werte werden im Prototyp getestet und balanciert.
- Vermeide anfangs komplizierte individuelle Verträge, Soldstufen oder verschiedene Landsknecht-Kompanien.

Ein mögliches, nur vorläufiges Balancing-Modell ist:
- Jede erfolgreiche Plünderung oder Einnahme erzeugt einen definierten Gold-Beutepool.
- Ein Basisanteil dieses Pools wird abhängig vom Anteil der Landsknechte an der Armee abgezogen.
- Der UI-Text erklärt, wie viel Beute insgesamt anfällt, welcher Betrag an die Landsknechte geht und wie viel dem Spieler bleibt.

Die Formel soll so gestaltet sein, dass ein größerer Landsknecht-Anteil zuverlässig einen höheren Gesamtanteil an der Beute bedeutet. Konkrete Prozentwerte werden erst nach Tests festgelegt.

**Zahlungsverzug – offene Entscheidung**
Laut Design-Dokument können Landsknechte bei Zahlungsverzug unzufrieden werden oder die Armee verlassen. Da der Beuteanteil auf die verfügbare Beute begrenzt ist, kann aus der Beuteabrechnung allein kein Rückstand entstehen. Woraus ein Zahlungsverzug entsteht, ist noch nicht entschieden (siehe `docs/GAME_DESIGN.md`, Abschnitt 16). Bis zur Entscheidung wird keine Verzugsmechanik implementiert.

### 2.5 Waffen und Ausrüstung
- Jede Einheit trägt ihre eigene Waffe und gegebenenfalls Rüstung.
- Ein Bauer kann nicht beliebig viele Waffen im Inventar stapeln.
- Waffen können gekauft, gefunden oder erbeutet werden.
- Im ersten Spielumfang: improvisierte Nahkampfwaffe, Stangenwaffe/Speer, Schwert und Armbrust.
- Feuerwaffen und Artillerie sind spätere optionale Erweiterungen.
- Veteranen und Landsknechte haben höhere Grundwerte als einfache Bauern; ihre Kampfkraft hängt zusätzlich von Ausrüstung und Rüstung ab.

---

## 3. Meilensteine

## Meilenstein 0 – Projektgerüst und technische Basis

**Status:** abgeschlossen und geprüft (2026-10-19) – öffentlich unter https://philippsbecker96-cmyk.github.io/bauernkrieg/

**Ziel:** Ein sauberes Projekt, das lokal startet, eine einfache Karte zeigt, getestet werden kann und online erreichbar ist.

Aufgaben:
- Projektstruktur und Entwicklungsbefehle einrichten.
- TypeScript, Phaser und Vite als Build-Werkzeug konfigurieren.
- Vitest einrichten und einen ersten Beispieltest anlegen.
- Ordner `docs/` mit `GAME_DESIGN.md` und `IMPLEMENTATION_PLAN.md` anlegen.
- Startszene, Karte, Kamera und grundlegende Eingabeverarbeitung anlegen.
- Eine kurze README mit Installations-, Start-, Test- und Build-Anleitung schreiben.
- Git initialisieren, falls das Projekt noch nicht versioniert ist.
- Statischen Build einmal auf GitHub Pages, Netlify oder itch.io veröffentlichen und testen.
- Keine Spielwirtschaft und noch keine komplexen Einheitenmechaniken hinzufügen.

Abnahmekriterien:
- Das Spiel startet lokal ohne Konsolenfehler.
- Die Karte wird angezeigt.
- Ein reproduzierbarer Build ist möglich.
- `npm test` läuft erfolgreich.
- Die Karte ist über eine öffentliche URL im Browser erreichbar.
- Eine neue Entwicklerin oder ein neuer Entwickler kann anhand der README das Projekt starten.

## Meilenstein 1 – Einheiten darstellen und befehligen

**Ziel:** Eine kleine Gruppe von Einheiten kann auf einer Karte ausgewählt und bewegt werden.

Aufgaben:
- Einfache Platzhaltergrafiken für Bauern und Gegner.
- Auswahl einer Einheit per Klick und optional Mehrfachauswahl per Auswahlrahmen.
- Bewegungsbefehl per Rechtsklick oder klarer alternativer Eingabe.
- Pathfinding mit A* auf einem Kachelraster (eigene Umsetzung oder EasyStar.js).
- Einfache Abstoßung zwischen Einheiten, damit sie nicht aufeinander stehen.
- Bei Gruppenbefehlen einen Pfad berechnen; die Einheiten folgen versetzt.
- Flow Fields nicht jetzt, nur falls der Performance-Test in Meilenstein 3 es erfordert.
- Kamera bewegen und zoomen.
- Sichtbare Auswahlmarkierung und Zielmarkierung.
- Geländekosten: Wald verlangsamt die Bewegung (Faktor in den Kacheldaten); A* berücksichtigt die Kosten (siehe `docs/GAME_DESIGN.md`, Abschnitt 9).
- Noch keine Ressourcenwirtschaft.

Abnahmekriterien:
- Einheiten lassen sich zuverlässig auswählen.
- Bewegungsbefehle werden ausgeführt.
- Einheiten bleiben nicht ständig aneinander hängen.
- Die Steuerung ist auch mit 10–20 Einheiten noch übersichtlich.

## Meilenstein 2 – Grundkampf

**Ziel:** Zwei Gruppen können sich bekämpfen und Einheiten können sterben.

Aufgaben:
- Lebenspunkte, Angriff, Reichweite, Angriffstakt und Bewegungsgeschwindigkeit.
- Angriffs-, Halte- und Rückzugs- beziehungsweise Sammelbefehl.
- Gegner mit einfacher KI: bewachen, entdecken, angreifen, verfolgen und zurückkehren.
- Tod und Entfernung gefallener Einheiten aus der aktiven Armee.
- Einfache Sieg- und Niederlagebedingungen.
- Erste Unterschiede zwischen Nahkampf und Fernkampf.

Abnahmekriterien:
- Ein Kampf zwischen zwei kleinen Gruppen kann vollständig ausgespielt werden.
- Einheiten greifen passende Ziele an.
- Ein Rückzugsbefehl löst Einheiten aus dem Kampf und führt sie zu einem Sammelpunkt.
- Lebenspunkte und Tod werden korrekt behandelt.
- Der Spieler kann einen Kampf gewinnen oder verlieren.

## Meilenstein 3 – Einheitenrollen, Waffen und Rüstung

**Ziel:** Ausrüstung und Grundwerte erzeugen erkennbare taktische Unterschiede.

Aufgaben:
- Datenmodell für Einheitentypen, Waffen und Rüstung einführen.
- Einfacher Bauer mit improvisierter Waffe.
- Speerträger mit Reichweite; der Bonus gegen Reiter folgt in Meilenstein 10, da Reiter erst dann eingeführt werden.
- Schwertkämpfer mit Nahkampfstärken.
- Armbrustschütze mit Projektil oder einfacher Fernkampfdarstellung und Nachladezeit.
- Gepanzerter gegnerischer Fußsoldat.
- Deckung im Wald: Einheiten im Wald sind schwerer von Fernkämpfern zu treffen (Wert in den Daten, durch Vitest-Tests abgedeckt).
- Landsknecht als ausgebildeter, kampfstarker Söldner (Kosten und Ökonomie folgen in Meilenstein 5).
- Werte und Ausrüstung von Einheitentypen trennen.
- Vorläufige Platzhaltergrafiken dürfen verwendet werden.

Abnahmekriterien:
- Einheiten verhalten sich entsprechend ihrer Waffenrolle unterschiedlich.
- Rüstung verringert Schaden auf nachvollziehbare Weise.
- Landsknechte sind spürbar kampfstärker als einfache Bauern, aber nicht unbesiegbar.
- Waffenwerte lassen sich in Daten anpassen, ohne den Kampfcode umzuschreiben.
- Die Schadensberechnung ist durch Vitest-Tests abgedeckt.
- Performance-Test: 100 Einheiten bewegen und kämpfen gleichzeitig flüssig.

## Meilenstein 3a – Mini-Mission (durchgehend spielbarer Prototyp)

**Ziel:** Früh prüfen, ob das Grundspiel Spaß macht. Alle folgenden Meilensteine bauen ihr System in diese Mission ein.

Inhalt:
- Eine kleine Karte.
- Eine Startgruppe einfacher Bauern.
- Ein Dorf mit einfacher Platzhalter-Rekrutierung (z. B. Dorf anklicken, eine feste Zahl Bauern schließt sich an). Diese Platzhalter-Regel wird in Meilenstein 5 durch die echte Rekrutierung ersetzt.
- Ein gegnerischer Posten mit einigen Wachen.
- Siegbedingung: Posten einnehmen. Niederlage: alle eigenen Einheiten gefallen.
- Noch keine Wirtschaft, Unterstützung oder Kampagne.

Abnahmekriterien:
- Die Mini-Mission ist von Start bis Sieg oder Niederlage spielbar.
- Sie ist über die öffentliche URL erreichbar.
- Offene Eindrücke zum Spielgefühl werden kurz notiert.

## Meilenstein 4 – Ressourcen und Versorgung

**Ziel:** Gold und Nahrung beeinflussen die Armeegröße und Kampagnenentscheidungen.

Aufgaben:
- Gold- und Nahrungsvorrat in der Spielsimulation.
- Gold und Nahrung in der UI anzeigen.
- Zeitmaßstab umsetzen: 1 Spieltag = 60 Sekunden Echtzeit; Nahrungsabzug einmal pro Spieltag. Beide Werte als Konstanten in den Daten.
- Versorgungstage abschätzen und anzeigen.
- Nahrung kann bei einem Ort gekauft oder als Missionsbelohnung erhalten werden.
- Unterversorgung löst zunächst eine Warnung und Rekrutierungsstopp aus.
- Bei anhaltendem Mangel sinken Moral beziehungsweise Stabilität; Desertion folgt in Meilenstein 8.
- Keine komplexen Produktionsgebäude.
- In die Mini-Mission einbauen.

Abnahmekriterien:
- Gold und Nahrung werden korrekt aktualisiert.
- Verbrauch ist nachvollziehbar und in der UI sichtbar.
- Der Spieler kann Nahrung kaufen.
- Die Armee kann bei Nahrungsknappheit nicht unbegrenzt wachsen.
- Der Nahrungsverbrauch ist durch Vitest-Tests abgedeckt.

## Meilenstein 5 – Rekrutierung und Landsknecht-Ökonomie

**Ziel:** Freiwillige Bauern und kostenpflichtige Landsknechte können an Orten gewonnen werden.

Aufgaben:
- Dörfer und Sammelpunkte als interaktive Orte.
- Dorfangebote: Zahl möglicher Freiwilliger, Nahrungsvorrat, Unterstützung und optionale Landsknecht-Verfügbarkeit.
- Die Platzhalter-Rekrutierung der Mini-Mission durch die echte Rekrutierung ersetzen.
- Bauern kosten bei der Rekrutierung kein Gold; Verfügbarkeit hängt von Unterstützung und Versorgung ab.
- Landsknechte kosten Gold und sind selten sowie ortsabhängig verfügbar.
- Rekrutierte Einheiten werden in die aktive Armee übernommen.
- Beuteanteil der Landsknechte als konfigurierbare Regel implementieren.
- Beuteabrechnung zunächst bei der Einnahme eines gegnerischen Ortes (z. B. des Postens der Mini-Mission); die Plünderung von Dörfern folgt in Meilenstein 6 und nutzt dieselbe Abrechnung.
- Der UI-Text zeigt Gesamtbeute, Landsknecht-Anteil und verbleibenden Spieleranteil.
- Gold wird durch die Beuteabrechnung nie negativ.
- Keine Mechanik für Zahlungsverzug, solange die offene Entscheidung (Abschnitt 2.4) nicht getroffen ist.

Abnahmekriterien:
- Bauern können über Unterstützung rekrutiert werden, ohne dass Gold pro Kopf bezahlt wird.
- Landsknechte erfordern Gold.
- Mehr Landsknechte erhöhen zuverlässig ihren gesamten Beuteanteil.
- Der Spieler kann erkennen, ob zusätzliche Landsknechte die Kampfkraft rechtfertigen.
- Beuteabrechnungen sind reproduzierbar, nachvollziehbar und durch Vitest-Tests abgedeckt.

## Meilenstein 6 – Globale und lokale Unterstützung

**Ziel:** Handlungen des Spielers beeinflussen die Bevölkerung langfristig.

Aufgaben:
- Globalen Unterstützungswert implementieren.
- Lokalen Unterstützungswert je Dorf implementieren.
- Dorfaktionen: schützen/unterstützen, begrenzte Abgabe verlangen, gewaltsam beschlagnahmen, plündern.
- Plünderung nutzt die Beuteabrechnung aus Meilenstein 5 (inklusive Landsknecht-Anteil).
- Unterschiedliche Auswirkungen auf Nahrung, Gold und Unterstützung.
- Frühere Gewalt bleibt beim jeweiligen Dorf gespeichert.
- Unterstützung beeinflusst Anzahl verfügbarer Freiwilliger.
- Feindselige Dörfer verweigern Hilfe oder bieten deutlich weniger Freiwillige an.
- Unterstützungseffekte in der UI erklären.
- Werte zunächst mit einfachen, konfigurierbaren Regeln balancieren.
- In die Mini-Mission einbauen (mindestens ein zweites Dorf hinzufügen).

Abnahmekriterien:
- Zwei Dörfer können unterschiedlich auf den Spieler reagieren.
- Plünderung bringt einen kurzfristigen Vorteil und einen spürbaren langfristigen Nachteil.
- Schutz oder Unterstützung kann die lokale Haltung verbessern.
- Der Spieler kann die Folgen einer Handlung verstehen.
- Unterstützungsänderungen sind durch Vitest-Tests abgedeckt.

## Meilenstein 7 – Beute und Ausrüstungswechsel

**Ziel:** Ausrüstung wird durch Erfolge erworben und gezielt vergeben.

Aufgaben:
- Orte definieren Beute in Gold, Nahrung und optionalen Waffen/Rüstungen.
- Nach einem Kampf können ausgewählte Waffen von Gefallenen eingesammelt werden.
- Einheiten können passende Ausrüstung wechseln.
- Eine Einheit trägt nur eine begrenzte und plausible Ausrüstung.
- Seltene Waffen sind als Ausrüstungsgegenstände verfügbar, nicht als beliebig stapelbare Ressourcen.
- Einfache Verwaltung: Ausrüstung einer Einheit oder Gruppe auswählen und austauschen.
- Veteranen/Landsknechte können Ausrüstung effektiver nutzen, sofern dies durch ihre Werte abgebildet wird.

Abnahmekriterien:
- Beute wird nur einmal gutgeschrieben.
- Waffen können einer passenden Einheit zugewiesen werden.
- Ausrüstung bleibt bei überlebenden Einheiten erhalten.
- Der Spieler kann entscheiden, ob er Ausrüstung sofort vergibt oder für einen späteren Veteranen aufhebt.

## Meilenstein 8 – Desertion, Moral, Kampagnenübergang und Speichern

**Ziel:** Versorgung und Unterstützung wirken sich auf die fortbestehende Armee aus; der Kampagnenstand bleibt erhalten.

Aufgaben:
- Einfache Moral/Stabilität für die Armee.
- Warnung vor drohender Desertion.
- Bei anhaltender Nahrungsknappheit verlassen Bauern die Armee.
- Unzufriedenheit oder Abzug von Landsknechten bei Zahlungsverzug nur, falls die offene Entscheidung (Abschnitt 2.4) bis dahin getroffen ist.
- Keine plötzliche Desertion ohne vorherige verständliche Warnung.
- Übergabe der überlebenden Einheiten, Ausrüstung, Ressourcen und relevanten Unterstützungszustände an die nächste Mission.
- Gefallene Einheiten bleiben verloren.
- Marsch zwischen Missionen: pauschaler Nahrungsverbrauch für 3 Spieltage (konfigurierbar).
- Speichersystem: Kampagnenstand als JSON mit Versionsnummer im localStorage, nur zwischen Missionen.
- Spielstand beim Neuladen der Seite wiederherstellen.

Abnahmekriterien:
- Versorgungskrise hat spürbare, vorhersehbare Folgen.
- Landsknechte sind militärisch wertvoll, aber wirtschaftlich nicht kostenlos.
- Der Spieler kann nach einer Mission die fortbestehende Armee prüfen.
- Kampagnenübergang erhält die relevanten Daten korrekt.
- Nach Schließen und erneutem Öffnen des Browsers kann die Kampagne fortgesetzt werden.
- Speichern und Laden des Kampagnenstands sind durch Vitest-Tests abgedeckt.

## Meilenstein 9 – Erste vollständige Mission

**Ziel:** Die Mini-Mission aus Meilenstein 3a wird zur ersten vollständigen Mission (Mission 1 laut Design-Dokument) ausgebaut.

Inhalt:
- Eine Startarmee mit einfachen Bauern und mindestens einer möglichen Rekrutierungsgelegenheit.
- Ein Dorf mit lokalem Unterstützungswert.
- Nahrung und Gold.
- Mindestens ein feindlicher Ort mit Gegnern und Beute.
- Möglichkeit, Freiwillige zu gewinnen und optional Landsknechte anzuwerben, falls die Missionsbalance dies zulässt.
- Ein klares Hauptziel.
- Sieg- und Niederlagebedingungen.
- Nach Missionsende wird der Armee- und Ressourcenstand gespeichert und an die Kampagnenebene übergeben.

Abnahmekriterien:
- Die Mission ist ohne Entwicklerkonsole spielbar.
- Die Mission ist über die öffentliche URL im Browser spielbar.
- Alle zentralen Systeme greifen ineinander.
- Ein Spieler kann durch unterschiedliche Entscheidungen zu unterschiedlichen Armee- und Ressourcenständen kommen.
- Es gibt keine blockierenden Bugs im normalen Missionsablauf.

## Meilenstein 10 – Gegnereskalation, Reiter und Befestigungen

**Ziel:** Die späteren Missionen stellen neue taktische Herausforderungen.

Aufgaben:
- Berittene Ritter als schnelle und gefährliche Gegner.
- Bonus der Speerträger gegen Reiter aktivieren.
- Speere und einfache Formation als Konter.
- Befestigte Orte mit Tor, Engstelle oder Verteidigungsposten.
- Armbrustschützen erhalten bei Belagerungen einen klaren Nutzen.
- Gegnerische Verstärkung oder Gegenangriff durch nachvollziehbare Missionsauslöser.
- Einfache Missionsskripte für Patrouillen, Verteidigung und Gegenangriffe.

Abnahmekriterien:
- Berittene Gegner unterscheiden sich klar von Fußsoldaten.
- Speerträger können bei richtiger Positionierung einen Vorteil gegen Reiter erhalten.
- Mindestens ein befestigtes Missionsziel erfordert taktisches Vorgehen.

## Meilenstein 11 – Kampagne mit 3–5 Missionen

**Ziel:** Die vollständige erste Kampagne ist spielbar.

Aufgaben:
- Drei bis fünf Missionen erstellen.
- Schwierigkeit und Armeegröße schrittweise steigern.
- Kampagnenübergänge und fortbestehende Armee testen.
- Missionsspezifische Vorräte, Gegner, Orte und Ziele konfigurieren.
- Seltene Veteranen, Landsknechte und Ausrüstungsfunde an passenden Stellen anbieten.
- Sicherstellen, dass Verluste bedeutsam sind, aber die Kampagne nicht leicht in eine Sackgasse führen.
- Einfachen Kampagnenabschluss und Niederlagenzustände umsetzen.

Abnahmekriterien:
- Die Kampagne kann vom Start bis zum Ende gespielt werden.
- Armee, Ausrüstung und Ressourcen werden korrekt übernommen.
- Frühere Entscheidungen wirken sich auf spätere Missionen aus.
- Jede Mission hat ein klares Ziel und unterscheidet sich spielerisch von den anderen.

## Meilenstein 12 – Politur und optionale Inhalte

Erst nach einer funktionierenden Kampagne:
- bessere Grafiken und Animationen,
- Soundeffekte und Musik,
- zusätzliche Waffenvarianten wie Dreschflegel, Kriegssense, Bauernwehr oder Dolch,
- seltene Handbüchsen/Arkebusen,
- optionale Artillerie in einer späteren Mission,
- zusätzliche Veteranenvarianten,
- weitere Formationen oder Gruppenbefehle,
- zusätzliche historische Ereignisse.

Diese Inhalte dürfen die Fertigstellung der Kernkampagne nicht blockieren.

---

## 4. Vorschlag für die Projektstruktur

Die genaue Struktur ist an das gewählte Engine-Gerüst anzupassen. Eine mögliche Orientierung:

```text
docs/
  GAME_DESIGN.md
  IMPLEMENTATION_PLAN.md
src/
  main.ts
  scenes/
    BootScene.ts
    MainMenuScene.ts
    MissionScene.ts
  game/
    entities/
      Unit.ts
      UnitFactory.ts
      Village.ts
    systems/
      MovementSystem.ts
      CombatSystem.ts
      RecruitmentSystem.ts
      SupplySystem.ts
      SupportSystem.ts
      LootSystem.ts
      CampaignSystem.ts
      SaveSystem.ts
    data/
      units.ts
      weapons.ts
      armor.ts
      missions.ts
      villages.ts
      balance.ts
    ui/
      HUD.ts
      UnitPanel.ts
      VillagePanel.ts
      CampaignSummary.ts
  tests/
```

Die tatsächlichen Dateinamen können sich ändern. Wichtig ist die Trennung von Einheiten, Simulation, Daten und UI. Balancing-Konstanten (Zeitmaßstab, Marschtage, Verbrauch, Beuteanteile) gehören in `data/balance.ts` oder eine vergleichbare zentrale Datei.

---

## 5. Anforderungen an den Coding-Agent

Bei jeder Implementierungsaufgabe soll der Coding-Agent:

1. Zuerst die vorhandene Projektstruktur und relevante Dateien prüfen.
2. Bestehende funktionierende Systeme erhalten, statt sie ohne Not neu zu schreiben.
3. Nur die Dateien ändern, die für den aktuellen Schritt erforderlich sind.
4. Änderungen in kleinen, nachvollziehbaren Abschnitten umsetzen.
5. Build und Tests ausführen.
6. Bei Fehlern diese beheben, bevor der Schritt als abgeschlossen gilt.
7. Kurz dokumentieren:
   - was geändert wurde,
   - welche Dateien betroffen sind,
   - wie es getestet wurde,
   - welche Einschränkungen oder offenen Punkte bestehen.
8. Keine Mechanik als fertig bezeichnen, wenn sie nur visuell angedeutet ist.
9. Unklare Designfragen und Widersprüche zwischen den Dokumenten als offene Entscheidung markieren und nachfragen, statt stillschweigend ein großes neues System einzuführen.
10. Nach einem abgeschlossenen Meilenstein einen Git-Commit vorschlagen oder erstellen, wenn dies im Arbeitsablauf freigegeben ist.

### Vorlage für einen Arbeitsauftrag

> Lies zuerst `docs/GAME_DESIGN.md` und `docs/IMPLEMENTATION_PLAN.md`. Prüfe danach den bestehenden Code. Implementiere ausschließlich den nächsten noch nicht abgeschlossenen Arbeitsschritt. Erhalte funktionierende Systeme und vermeide unnötige Refactorings. Führe Build und Tests aus, behebe Fehler und fasse geänderte Dateien, Tests und offene Punkte zusammen. Widersprüche zwischen den Dokumenten markierst du als offene Entscheidung und fragst nach. Aktualisiere den Status dieses Plans, wenn der Schritt tatsächlich abgeschlossen und geprüft ist.

---

## 6. Risiken und Gegenmaßnahmen

### Zu viele Systeme auf einmal
**Risiko:** Rekrutierung, Versorgung, Unterstützung, Ausrüstung und Kampagne werden gleichzeitig begonnen und sind schwer zu debuggen.  
**Gegenmaßnahme:** Meilensteine in der festgelegten Reihenfolge umsetzen, jedes System in die Mini-Mission einbauen und nach jedem Schritt testen.

### Spielspaß wird zu spät geprüft
**Risiko:** Alle Systeme werden gebaut, bevor klar ist, ob Steuerung und Kampf Spaß machen.  
**Gegenmaßnahme:** Mini-Mission in Meilenstein 3a; dort das Spielgefühl prüfen, bevor die Wirtschaft aufgebaut wird.

### Landsknecht-Ökonomie wird zu kompliziert
**Risiko:** Mehrere Soldarten, Verträge und komplizierte Beuteformeln verdrängen den taktischen Kern.  
**Gegenmaßnahme:** Zunächst eine klare Anwerbegebühr und einen transparenten, konfigurierbaren Beuteanteil verwenden.

### Zu viele Waffenvarianten
**Risiko:** Balance- und Grafikaufwand wachsen, bevor der Kampf Spaß macht.  
**Gegenmaßnahme:** Zunächst wenige funktionale Waffenklassen; Varianten erst später.

### Kampagne wird durch Verluste ungewinnbar
**Risiko:** Eine frühe Niederlage führt zu einer aussichtslosen späteren Mission.  
**Gegenmaßnahme:** Rekrutierung und Erholung ermöglichen, aber Ressourcen- und Unterstützungsbedingungen beibehalten.

### Zu große Armeen
**Risiko:** Pathfinding, Kampfberechnung und UI werden unübersichtlich oder ruckeln.  
**Gegenmaßnahme:** Mit kleinen Gruppen starten, Gruppen-Pathfinding nutzen und in Meilenstein 3 einen Performance-Test mit 100 Einheiten durchführen.

### Spielstände gehen nach Updates kaputt
**Risiko:** Änderungen am Datenmodell machen gespeicherte Kampagnen unlesbar.  
**Gegenmaßnahme:** Spielstände mit Versionsnummer speichern; bei inkompatibler Version klar informieren statt abzustürzen.

---

## 7. Definition of Done für jeden Meilenstein

Ein Meilenstein gilt nur dann als abgeschlossen, wenn:
- die Funktion implementiert und im Spiel nutzbar ist,
- Build und relevante Tests erfolgreich sind,
- keine bekannten kritischen Fehler im normalen Ablauf bestehen,
- UI und Spielregeln miteinander übereinstimmen,
- der aktuelle Stand über die öffentliche URL erreichbar ist,
- der Planstatus aktualisiert wurde,
- der nächste Schritt klar benannt ist.

---

## 8. Offene Entscheidungen

- **Zahlungsverzug der Landsknechte:** siehe Abschnitt 2.4 und `docs/GAME_DESIGN.md`, Abschnitt 16.

**Leitregel:** Ein kleiner, getesteter und spielbarer Fortschritt ist wertvoller als viele nur teilweise implementierte Mechaniken.
