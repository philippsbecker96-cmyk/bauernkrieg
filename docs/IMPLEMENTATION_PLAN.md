# IMPLEMENTATION PLAN
## Bauernkrieg – Aufstand der gemeinen Leute

**Version:** 0.5  
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
- **Jagd:** Wälder liefern begrenzt Nahrung durch Jagdgruppen; am besten mit Armbrustschützen. Wildbestand, Wildarten und Erträge stehen in den Daten (siehe `docs/GAME_DESIGN.md`, Abschnitt 5.4).

### 2.3 Bevölkerung und Unterstützung
- Ein globaler Unterstützungswert und lokale Dorfzustände.
- Unterstützende Orte können Freiwillige, Nahrung und gelegentlich Landsknechte anbieten.
- Schutz und respektvoller Umgang können Unterstützung verbessern.
- Erzwungene Abgaben und Plünderungen liefern kurzfristige Ressourcen, senken aber lokale Unterstützung.
- Gewalt gegen Bewohner verursacht besonders starke negative Folgen.
- Forderungen verkünden und Schreiben an die Obrigkeit erhöhen die Unterstützung, provozieren aber Reaktionen der Gegenseite (siehe `docs/GAME_DESIGN.md`, Abschnitt 6.4).
- Bei anhaltender Unterversorgung oder sehr niedriger Moral können Bauern desertieren.
- Thomas Müntzer kann sich als Begleiter ohne Kampfwert anschließen: Er hebt die Moral, verteuert aber das gemäßigte Schreiben an die Obrigkeit (siehe `docs/GAME_DESIGN.md`, Abschnitt 7.5).

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
- Lege eine konfigurierbare Gewichtung des Landsknecht-Anteils an der Armee fest (festgelegt am 2026-10-19, siehe Meilenstein 5).
- Berechne den gesamten Anspruch aus Anzahl oder Anteil der Landsknechte und der Geldbeute.
- Begrenze den Anspruch auf die tatsächlich verfügbare Beute; erzeuge keine negativen Goldbestände.
- Die genaue Formel und die Werte werden im Prototyp getestet und balanciert.
- Vermeide anfangs komplizierte individuelle Verträge, Soldstufen oder verschiedene Landsknecht-Kompanien.

Ein mögliches, nur vorläufiges Balancing-Modell ist:
- Jede erfolgreiche Plünderung oder Einnahme erzeugt einen definierten Gold-Beutepool.
- Ein Basisanteil dieses Pools wird abhängig vom Anteil der Landsknechte an der Armee abgezogen.
- Der UI-Text erklärt, wie viel Beute insgesamt anfällt, welcher Betrag an die Landsknechte geht und wie viel dem Spieler bleibt.

Die Formel soll so gestaltet sein, dass ein größerer Landsknecht-Anteil zuverlässig einen höheren Gesamtanteil an der Beute bedeutet. Konkrete Prozentwerte werden erst nach Tests festgelegt.

**Zahlungsverzug (entschieden am 2026-10-19)**
Ein Rückstand entsteht aus einem konfigurierbaren **Mindestanspruch pro Landsknecht und Beuteabrechnung** (siehe `docs/GAME_DESIGN.md`, Abschnitt 7.4). Fällig ist der höhere Wert aus Beuteanteil und Mindestanspruch zuzüglich eines offenen Rückstands; gezahlt wird zuerst aus der Beute, dann aus der Kasse, der Rest wird als Rückstand erfasst und angezeigt. Meilenstein 5 erfasst den Rückstand und warnt; Moral- und Abzugsfolgen kommen in Meilenstein 8.

### 2.5 Waffen und Ausrüstung
- Jede Einheit trägt ihre eigene Waffe und gegebenenfalls Rüstung.
- Ein Bauer kann nicht beliebig viele Waffen im Inventar stapeln.
- Waffen können gekauft, gefunden oder erbeutet werden.
- Im ersten Spielumfang: improvisierte Nahkampfwaffe, Stangenwaffe/Speer, Schwert und Armbrust.
- Feuerwaffen und Artillerie sind spätere optionale Erweiterungen.
- Veteranen und Landsknechte haben höhere Grundwerte als einfache Bauern; ihre Kampfkraft hängt zusätzlich von Ausrüstung und Rüstung ab.

### 2.6 Banner des Haufens
- Die Regenbogenfahne ist das Banner des eigenen Haufens (siehe `docs/GAME_DESIGN.md`, Abschnitt 1).
- Sie erscheint als Sammelpunkt auf der Karte, im Hauptmenü, auf dem Kampagnenbildschirm und gegebenenfalls im HUD.
- Zunächst rein gestalterisch, ohne eigene Spielmechanik. Die einzelnen Stellen werden in den Meilensteinen 8, 9, 11a und 12 umgesetzt; die Sammelpunkt-Fahne kann als kleine Grafikänderung auch früher eingebaut werden.

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

**Status:** abgeschlossen und geprüft (2026-10-19)

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

**Status:** abgeschlossen und geprüft (2026-10-19)

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

**Status:** abgeschlossen und geprüft (2026-10-19)

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

**Status:** abgeschlossen und geprüft (2026-10-19)

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

Festlegungen (bestätigt am 2026-10-19):
- „Posten einnehmen“: Eigene Einheiten stehen insgesamt 5 Sekunden im Kreis des Postens, ohne dass ein Gegner darin ist. Sind Gegner im Kreis, pausiert der Fortschritt; ist keine eigene Einheit darin, sinkt er wieder. Werte in `src/game/data/missions.ts`.
- Platzhalter-Rekrutierung: Eine eigene Einheit muss im Dorf stehen, dann Dorf anklicken; 6 Bauern schließen sich einmalig an.

Eindrücke zum Spielgefühl:
- Ablauf klar und kurz (etwa 2–3 Minuten); das Dorf ist spürbar nötig, da die 6 Start-Bauern allein verlieren.
- Bauern gegen Wachen wirkt eher wie ein Gedränge als wie Taktik; die Furt als Engstelle spielt kaum eine Rolle, weil die Wachen am Posten warten.
- Hilfe- und Statustexte oben links verdecken einen Teil der Karte; ein einklappbares Panel wäre sinnvoll (spätere Politur).

## Meilenstein 4 – Ressourcen und Versorgung

**Status:** abgeschlossen und geprüft (2026-10-19)

**Ziel:** Gold und Nahrung beeinflussen die Armeegröße und Kampagnenentscheidungen.

Aufgaben:
- Gold- und Nahrungsvorrat in der Spielsimulation.
- Gold und Nahrung in der UI anzeigen.
- Zeitmaßstab umsetzen: 1 Spieltag = 60 Sekunden Echtzeit; Nahrungsabzug einmal pro Spieltag. Beide Werte als Konstanten in den Daten.
- Versorgungstage abschätzen und anzeigen.
- Nahrung kann bei einem Ort gekauft oder als Missionsbelohnung erhalten werden.
- Unterversorgung löst zunächst eine Warnung und Rekrutierungsstopp aus.
- Anhaltender Mangel wird erfasst (Zahl der Hungertage); die Auswirkungen auf Moral beziehungsweise Stabilität und die Desertion folgen in Meilenstein 8.
- Keine komplexen Produktionsgebäude.
- In die Mini-Mission einbauen.

Abnahmekriterien:
- Gold und Nahrung werden korrekt aktualisiert.
- Verbrauch ist nachvollziehbar und in der UI sichtbar.
- Der Spieler kann Nahrung kaufen.
- Die Armee kann bei Nahrungsknappheit nicht unbegrenzt wachsen.
- Der Nahrungsverbrauch ist durch Vitest-Tests abgedeckt.

Festlegungen (bestätigt am 2026-10-19):
- Moral und Stabilität bei anhaltendem Mangel werden erst in Meilenstein 8 umgesetzt (zusammen mit der einfachen Moral der Armee).
- Platzhalter-Rekrutierung der Mini-Mission: Freiwillige schließen sich nicht mehr nur alle auf einmal an. Ein Klick aufs Dorf holt so viele, wie die Nahrung danach noch für die Warnschwelle (Startwert 2 Tage) versorgt; Umschalt+Klick holt genau eine Person. Die übrigen bleiben im Dorf verfügbar.

## Meilenstein 4a – Jagd

**Status:** abgeschlossen und geprüft (2026-10-19)

**Ziel:** Wälder werden zu einer zusätzlichen, begrenzten Nahrungsquelle, die Zeit, Kampfkraft und Risiko kostet (siehe `docs/GAME_DESIGN.md`, Abschnitt 5.4).

Aufgaben:
- **Waldgebiete:** Zusammenhängende Waldkacheln bilden je ein Waldgebiet mit eigenem Wildbestand. Missionsdaten können Waldgebiete zusätzlich gezielt festlegen oder ihre Werte überschreiben.
- **Jagdbefehl:** Ausgewählte Einheiten in ein Waldgebiet schicken. Sie laufen hin, jagen eine bestimmte Zeit und kehren danach selbstständig zum Haufen zurück.
- **Während der Jagd:** Jäger bleiben sichtbar und angreifbar, verteidigen sich schlechter (Malus in den Daten) und nehmen keine Angriffsbefehle an, bis sie zurückgerufen werden oder zurück sind.
- **Ertrag nach Waffe:** Armbrustschützen jagen deutlich erfolgreicher; Einheiten mit improvisierten Waffen bringen wenig. Die Werte stehen je Waffenklasse in den Daten.
- **Beute tragen:** Erlegte Nahrung tragen die Jäger mit. Sie wird erst gutgeschrieben, wenn sie in der Nähe des Haufens sind (Radius um eine eigene, nicht jagende Einheit; Wert in den Daten). Fällt ein Jäger, geht sein Anteil verloren.
- **Zurückrufen:** Jederzeit möglich; die Jäger bringen dann nur das bis dahin Erlegte mit, also weniger oder gar nichts.
- **Wildbestand:** Jede erlegte Beute senkt den Bestand des Waldgebiets; erschöpfte Wälder liefern nichts mehr. Das Nachwachsen ist konfigurierbar (auch 0).
- **Nahrungsverbrauch:** Jäger verbrauchen weiter Nahrung wie alle Einheiten.
- **UI:** Grober Wildbestand eines Waldgebiets (z. B. reich / mäßig / erschöpft), Status der Jagdgruppe (unterwegs, jagt, kehrt zurück, getragene Nahrung) und Meldung bei Gutschrift oder Verlust.
- **Wilderei vorbereiten:** Jede Jagd wird als Ereignis erfasst (wo, wie viel). Die Folge – Aufmerksamkeit des jeweiligen Herrn – wird in Meilenstein 6 umgesetzt, da es Herren und ihre Gebiete erst dort gibt.
- In die Mini-Mission einbauen.

**Konfigurierbarkeit (fortlaufend anpassbar, ohne Spielcode umzuschreiben):**
Alle Jagdwerte stehen zentral in den Daten (z. B. `src/game/data/hunting.ts`):
- **Wildarten:** z. B. Wildschwein, Reh, Hase – je Nahrungswert, Häufigkeit (Gewicht) und gegebenenfalls Schwierigkeit. Neue Wildarten werden nur in den Daten ergänzt.
- **Bestandsregel:** wählbar, wie der Wildbestand eines Waldgebiets bestimmt wird – fester Wert, proportional zur Größe (Tiere pro Waldkachel) oder mit Zufallsstreuung. Zufall läuft über einen Seed, damit Missionen und Tests reproduzierbar bleiben.
- **Nachwachsen:** Rate pro Spieltag (0 = wächst nicht nach).
- **Jagd:** Jagddauer, Erfolgschance beziehungsweise Ertrag je Waffenklasse, maximale Traglast je Jäger, Verteidigungsmalus, Rückkehrradius.
- **Pro Mission:** Missionsdaten können Bestandsregel und Werte einzelner Waldgebiete überschreiben.

Abnahmekriterien:
- Eine Jagdgruppe kann losgeschickt und zurückgerufen werden und kehrt selbstständig zurück.
- Nahrung wird erst bei Rückkehr in die Nähe des Haufens gutgeschrieben; gefallene Jäger bringen nichts.
- Armbrustschützen bringen spürbar mehr Nahrung als Bauern mit improvisierten Waffen.
- Der Wildbestand sinkt, ein Wald kann erschöpft werden; Jagd ist keine unbegrenzte Nahrungsquelle.
- Jäger sind auf der Karte angreifbar und stehen währenddessen nicht für Angriffe zur Verfügung.
- Wildarten, Nahrungswerte, Bestandsregel (fest, größenabhängig, zufällig) und Nachwachsen lassen sich in den Daten ändern, ohne den Spielcode umzuschreiben.
- Ertrag, Wildbestand, Nachwachsen, Rückruf und Gutschrift sind durch Vitest-Tests abgedeckt.

Festlegungen (bestätigt am 2026-10-19):
- Die Startgruppe der Mini-Mission erhält einen Armbrustschützen, damit der Waffenunterschied bei der Jagd erlebbar ist; die Startnahrung steigt von 18 auf 21 (weiterhin 3 Tage Vorrat).
- Jäger kehren zur nächsten eigenen, nicht jagenden Einheit zurück; jagt der ganze Haufen, zum Sammelpunkt.
- Benannte Wälder der Mini-Mission: Krähenholz (nahe am Start) und Herrenwald (wildreich, Gebiet des Junkers vom Mühlbach, Ansatzpunkt für die Wilderei in Meilenstein 6). Steuerung: J (jagen), Z (zurückrufen). Werte in `src/game/data/hunting.ts`.

Eindrücke zum Spielgefühl:
- Die Wachen bemerken Jäger im Herrenwald nicht (knapp außerhalb ihrer Sichtweite); das Risiko der Jagd ist in der Mini-Mission daher gering. Die Folgen der Wilderei kommen mit Meilenstein 6.

## Meilenstein 5 – Rekrutierung und Landsknecht-Ökonomie

**Status:** abgeschlossen und geprüft (2026-10-19)

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
- Zahlungsverzug (Abschnitt 2.4): Mindestanspruch pro Landsknecht in der Beuteabrechnung; nicht zahlbarer Rest wird als Rückstand erfasst und gewarnt. Keine Moral- oder Abzugsfolgen vor Meilenstein 8.

Abnahmekriterien:
- Bauern können über Unterstützung rekrutiert werden, ohne dass Gold pro Kopf bezahlt wird.
- Landsknechte erfordern Gold.
- Mehr Landsknechte erhöhen zuverlässig ihren gesamten Beuteanteil.
- Der Spieler kann erkennen, ob zusätzliche Landsknechte die Kampfkraft rechtfertigen.
- Beuteabrechnungen sind reproduzierbar, nachvollziehbar und durch Vitest-Tests abgedeckt.

Festlegungen (bestätigt am 2026-10-19):
- Zahlungsverzug: Mindestanspruch pro Landsknecht und Beuteabrechnung (Startwert 5 Gold); nicht zahlbarer Rest wird als Rückstand erfasst und gewarnt. Folgen (Moral, Abzug) in Meilenstein 8.
- Beuteanteil nach Anteil an der Armee: Landsknechte beanspruchen `Gewichtung × Landsknechte / Armeegröße` der Gold-Beute (Startwert 1,5), höchstens die ganze Beute. Mehr Landsknechte erhöhen den Anteil, mehr Freiwillige verdünnen ihn. Ein fester Anteil pro Kopf wurde verworfen, weil er bei großen Armeen die ganze Beute verschlingt.
- Unterstützung bis Meilenstein 6: fester Wert je Dorf in den Missionsdaten; Freiwillige = Unterstützung × Höchstzahl, unter 30 % keine. Ab Meilenstein 6 wird der Wert veränderlich.
- Veteranen: kein eigener Einheitentyp in Meilenstein 5 (erst ab Mission 2 benötigt); Freiwilligen-Angebote kosten nie Gold (Test).
- Mini-Mission: Hohenweiler (Unterstützung 60 %, höchstens 10 → 6 Freiwillige); neues Wirtshaus „Zum Krug“ mit 3 Landsknechten zu je 15 Gold; der Posten bringt 60 Gold und 20 Nahrung Beute (ersetzt die bisherige Siegbelohnung). Werte in `src/game/data/balance.ts` und `src/game/data/missions.ts`.

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
- Forderungen und Schreiben an die Obrigkeit (Design-Dokument 6.4): Forderungen verkünden (global) und Schreiben an einen Herrn (lokal, gemäßigt oder scharf), selten verfügbar. Die Reaktion der Gegenseite bleibt zunächst einfach (z. B. die Wachen des Postens werden verstärkt oder greifen an); vollständige Gegnereskalation folgt in Meilenstein 10.
- Wilderei: Jagd im Gebiet eines Herrn (Ereignisse aus Meilenstein 4a) erregt dessen Aufmerksamkeit; einfache, angekündigte Reaktion wie bei den Schreiben.
- Vorbereitung für Thomas Müntzer (Meilenstein 8a): Kosten und Verfügbarkeit der Schreiben-Optionen so umsetzen, dass sie über Bedingungen in den Daten verändert werden können (z. B. „Müntzer im Haufen → gemäßigtes Schreiben kostet Moral“), statt sie fest im Code zu verdrahten.
- Werte zunächst mit einfachen, konfigurierbaren Regeln balancieren.
- In die Mini-Mission einbauen (mindestens ein zweites Dorf hinzufügen).

Abnahmekriterien:
- Zwei Dörfer können unterschiedlich auf den Spieler reagieren.
- Plünderung bringt einen kurzfristigen Vorteil und einen spürbaren langfristigen Nachteil.
- Schutz oder Unterstützung kann die lokale Haltung verbessern.
- Ein Schreiben an die Obrigkeit erhöht die Unterstützung und löst eine erkennbare Gegenreaktion aus; es ist nicht beliebig wiederholbar.
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
- Unzufriedenheit oder Abzug von Landsknechten bei Zahlungsrückstand (Rückstand aus dem Mindestanspruch, Abschnitt 2.4), immer mit vorheriger Warnung.
- Keine plötzliche Desertion ohne vorherige verständliche Warnung.
- Übergabe der überlebenden Einheiten, Ausrüstung, Ressourcen und relevanten Unterstützungszustände an die nächste Mission.
- Gefallene Einheiten bleiben verloren.
- Marsch zwischen Missionen: pauschaler Nahrungsverbrauch für 3 Spieltage (konfigurierbar).
- Speichersystem: Kampagnenstand als JSON mit Versionsnummer im localStorage, nur zwischen Missionen.
- Spielstand beim Neuladen der Seite wiederherstellen.
- Kampagnenbildschirm zwischen den Missionen mit der Regenbogenfahne des Haufens (Abschnitt 2.6).

Abnahmekriterien:
- Versorgungskrise hat spürbare, vorhersehbare Folgen.
- Landsknechte sind militärisch wertvoll, aber wirtschaftlich nicht kostenlos.
- Der Spieler kann nach einer Mission die fortbestehende Armee prüfen.
- Kampagnenübergang erhält die relevanten Daten korrekt.
- Nach Schließen und erneutem Öffnen des Browsers kann die Kampagne fortgesetzt werden.
- Speichern und Laden des Kampagnenstands sind durch Vitest-Tests abgedeckt.

## Meilenstein 8a – Thomas Müntzer als Begleiter

**Ziel:** Eine besondere Persönlichkeit schafft eine bewusste Abwägung zwischen Moral und Handlungsspielraum gegenüber der Obrigkeit (siehe `docs/GAME_DESIGN.md`, Abschnitt 7.5). Setzt Moral (Meilenstein 8) und die Schreiben an die Obrigkeit (Meilenstein 6) voraus.

Aufgaben:
- **Begleiter-Modell:** Persönlichkeiten als eigenes, schlankes Datenmodell (keine Kampfeinheit, kein Kampfwert, keine Figur auf der Karte nötig). Wirkungen werden in den Daten beschrieben, damit später weitere Persönlichkeiten ohne neuen Spielcode ergänzt werden können.
- **Flugschrift-Ereignis:** Ein in den Missionsdaten festgelegter Auslöser zeigt eine Flugschrift Müntzers auf dem Bildschirm an. Sie nennt das Dorf oder Kloster, in dem er sich aufhält; der Ort wird auf der Karte markiert.
- **Anschluss:** Erreicht eine eigene Einheit den Ort, kann der Spieler Müntzer zum Anschluss bewegen. Vorher erklärt die UI die Wirkung. Ablehnen oder Ignorieren ist möglich.
- **Moralbonus:** Solange Müntzer im Haufen ist, steigt die Moral (Wert in den Daten). Optionale Verstärkung der verkündeten Forderungen (Wert in den Daten, auch 0).
- **Widerspruch:** Solange Müntzer im Haufen ist, kostet das gemäßigte Schreiben zusätzlich Moral. Die UI zeigt den Aufschlag vor der Entscheidung („Müntzer widerspricht“). Das scharfe Schreiben bleibt ohne Aufschlag.
- **Wegschicken:** Jederzeit möglich, mit einmaligem Moralverlust; die UI warnt vorher.
- **UI:** Müntzer erscheint als Porträt oder Symbol im HUD mit kurzer Erklärung seiner Wirkung.
- **Kampagne und Speichern:** Begleiter werden in den Kampagnenstand übernommen und mit gespeichert (Erweiterung des Speicherformats aus Meilenstein 8, Versionsnummer beachten).
- In die Mini-Mission einbauen (Flugschrift erscheint, Müntzer hält sich in einem der Dörfer auf).

Abnahmekriterien:
- Die Flugschrift erscheint zuverlässig beim festgelegten Auslöser und nennt einen erreichbaren Ort.
- Müntzer kann sich anschließen und wieder weggeschickt werden; beides hat die angekündigte Moralwirkung.
- Mit Müntzer kostet das gemäßigte Schreiben sichtbar mehr; ohne ihn nicht.
- Müntzer bleibt nach dem Kampagnenübergang und nach dem Neuladen im Haufen.
- Moralbonus, Schreiben-Aufschlag und Verlust beim Wegschicken lassen sich in den Daten ändern, ohne den Spielcode umzuschreiben.
- Die Wirkungen auf Moral und Schreiben sind durch Vitest-Tests abgedeckt.

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
- Der Sammelpunkt wird als Regenbogenfahne dargestellt, sofern nicht schon früher umgesetzt; Hauptmenü beziehungsweise Titelbild mit der Fahne (Abschnitt 2.6).

Abnahmekriterien:
- Die Mission ist ohne Entwicklerkonsole spielbar.
- Die Mission ist über die öffentliche URL im Browser spielbar.
- Alle zentralen Systeme greifen ineinander.
- Ein Spieler kann durch unterschiedliche Entscheidungen zu unterschiedlichen Armee- und Ressourcenständen kommen.
- Es gibt keine blockierenden Bugs im normalen Missionsablauf.

## Meilenstein 9a – Grafik-Stilprobe: Isometrie oder Draufsicht

**Ziel:** Bevor in Meilenstein 10 Befestigungen, Tore und Engstellen entstehen, wird entschieden, ob das Spiel in der Draufsicht bleibt oder auf eine isometrische 2.5D-Darstellung (ähnlich Stronghold Crusader) umgestellt wird. Die eigentliche grafische Umsetzung folgt in Meilenstein 11a.

Aufgaben:
- Eine eigene Testszene, getrennt von der Mini-Mission und der ersten Mission; das Hauptspiel bleibt unverändert.
- Ein kleiner Kartenausschnitt in Isometrie: Rautenkacheln für Wiese, Wald und Weg, ein Dorfhaus und ein Stück Mauer mit Tor, jeweils mit sichtbarer Höhe.
- Die Spielregeln (Bewegung, Kampf, Pfadsuche) rechnen weiter auf dem geraden Kachelraster. Nur die Darstellung wird in Bildschirmkoordinaten umgerechnet; Mausklicks, Auswahlrechteck und Hover-Marker werden zurückgerechnet.
- Zeichenreihenfolge nach Bildschirmtiefe: Einheiten hinter Gebäuden werden verdeckt, bleiben aber als Umriss oder halbtransparent sichtbar und anklickbar.
- Platzhalterfiguren in 8 Richtungen, gerendert aus einem einfachen 3D-Testmodell (z. B. Blender), um die Render-Pipeline zu erproben.
- Leistungstest mit 100 Einheiten in der isometrischen Darstellung.
- Aufwandsschätzung für die vollständige Umsetzung in Meilenstein 11a (Anzahl Einheitentypen, Richtungen, Animationen, Gebäude).

Abnahmekriterien:
- Die Stilprobe ist über die öffentliche URL erreichbar (z. B. über einen eigenen Menüpunkt oder URL-Parameter), ohne das Hauptspiel zu verändern.
- Klicks und Auswahlrechteck treffen in der Isometrie die richtigen Kacheln und Einheiten.
- Einheiten werden von Gebäuden korrekt verdeckt und bleiben auswählbar.
- 100 Einheiten laufen flüssig.
- Die Umrechnung zwischen Raster- und Bildschirmkoordinaten ist durch Vitest-Tests abgedeckt.
- Die Entscheidung (Isometrie oder Draufsicht) ist mit Datum in diesem Plan (Abschnitt 8) und in `docs/GAME_DESIGN.md` (Abschnitt 16) festgehalten.

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
- Thomas Müntzers Flugschrift in einer passenden Kampagnenmission platzieren (vorläufig Mission 2 oder 3).
- Sicherstellen, dass Verluste bedeutsam sind, aber die Kampagne nicht leicht in eine Sackgasse führen.
- Einfachen Kampagnenabschluss und Niederlagenzustände umsetzen.

Abnahmekriterien:
- Die Kampagne kann vom Start bis zum Ende gespielt werden.
- Armee, Ausrüstung und Ressourcen werden korrekt übernommen.
- Frühere Entscheidungen wirken sich auf spätere Missionen aus.
- Jede Mission hat ein klares Ziel und unterscheidet sich spielerisch von den anderen.

## Meilenstein 11a – Grafische Umsetzung

**Ziel:** Das Spiel erhält seinen endgültigen Grafikstil gemäß der Entscheidung aus Meilenstein 9a. Setzt die spielbare Kampagne (Meilenstein 11) voraus und liegt vor der Politur (Meilenstein 12), damit deren neue Inhalte gleich im endgültigen Stil entstehen.

Aufgaben:
- Die Darstellung aller Missionen auf den gewählten Stil umstellen; bei Isometrie Umrechnung, Eingabe und Zeichenreihenfolge aus der Stilprobe übernehmen. Die Spielregeln bleiben unverändert.
- Kacheln für alle Geländetypen mit Varianten und Übergängen.
- Gebäude: Dörfer, Klöster, Burgen und Adelssitze sowie die Befestigungen, Tore und Engstellen aus Meilenstein 10.
- Einheitengrafiken für alle bestehenden Einheitentypen und Gegner mit den Animationen Gehen, Angriff und Sterben; Waffen und Rüstung sind an der Figur erkennbar. Bei Isometrie 8 Richtungen (5 gerendert, 3 gespiegelt).
- Eine wiederholbare Render-Pipeline (z. B. Blender-Skript → Spritesheet oder Texturatlas), dokumentiert, damit neue Einheiten und Ausrüstung ohne Handarbeit ergänzt werden können.
- Ausgearbeitete Regenbogenfahne für Sammelpunkt, Hauptmenü und Kampagnenbildschirm (Abschnitt 2.6).
- Lesbarkeit: Auswahlmarkierung, Freund-Feind-Unterscheidung und verdeckte Einheiten bleiben klar erkennbar.
- Nur eigene Grafiken oder solche mit geprüfter Lizenz (siehe `docs/GAME_DESIGN.md`, Abschnitt 14).

Abnahmekriterien:
- Alle Missionen der Kampagne sind im neuen Stil spielbar; im normalen Ablauf erscheinen keine Platzhaltergrafiken mehr.
- Einheitentypen und Waffen sind auf der normalen Zoomstufe unterscheidbar.
- 100 Einheiten laufen weiterhin flüssig.
- Bestehende Tests laufen unverändert; Spielstände bleiben ladbar, weil die Darstellung das Speicherformat nicht verändert.
- Eine neue Einheit lässt sich anhand der Dokumentation über die Render-Pipeline ergänzen.

## Meilenstein 12 – Politur und optionale Inhalte

Erst nach einer funktionierenden Kampagne:
- weitere Animationen und grafischer Feinschliff über Meilenstein 11a hinaus (z. B. die Regenbogenfahne im HUD),
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

### Grafikaufwand der Isometrie wird unterschätzt
**Risiko:** 8 Richtungen, mehrere Animationen und viele Einheitentypen ergeben Hunderte Einzelbilder und binden die Entwicklung über Wochen.  
**Gegenmaßnahme:** Stilprobe mit Aufwandsschätzung in Meilenstein 9a; Figuren aus 3D-Modellen automatisch rendern statt von Hand zeichnen; Spielregeln strikt von der Darstellung getrennt halten.

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

- **Darstellung: Isometrie (2.5D) oder Draufsicht?** Wird anhand der Stilprobe in Meilenstein 9a entschieden.
- (Zahlungsverzug der Landsknechte entschieden am 2026-10-19, siehe Abschnitt 2.4.)

**Leitregel:** Ein kleiner, getesteter und spielbarer Fortschritt ist wertvoller als viele nur teilweise implementierte Mechaniken.
