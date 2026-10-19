# GAME DESIGN DOCUMENT
## Bauernkrieg – Aufstand der gemeinen Leute

**Version:** 0.6  
**Datei:** `docs/GAME_DESIGN.md`  
**Bezug:** `docs/IMPLEMENTATION_PLAN.md`  
**Status:** Arbeitsgrundlage für die Entwicklung  
**Genre:** Historisch inspiriertes, missionsbasiertes 2D-Echtzeitstrategiespiel (RTS)  
**Zeitraum:** Deutscher Bauernkrieg, 1524–1526  
**Kampagnenumfang (erstes Ziel):** 3–5 Missionen  
**Leitidee:** Einen kleinen, improvisiert bewaffneten Bauernhaufen zu einer größeren, kampffähigen Streitmacht führen – ohne eine komplexe Wirtschaftssimulation.

> **Vorrangregel:** Dieses Dokument legt fest, *was* das Spiel ist (Inhalte, Regeln, Einheiten). `docs/IMPLEMENTATION_PLAN.md` legt fest, *in welcher Reihenfolge und Arbeitsweise* gebaut wird. Bei einem Widerspruch zwischen beiden Dokumenten wird nicht eigenständig entschieden; der Widerspruch wird als offene Entscheidung markiert und nachgefragt.

---

## 1. Spielvision

Der Spieler führt einen Bauernhaufen während des Deutschen Bauernkriegs. Im Mittelpunkt stehen direkte Truppenführung, Rekrutierung, Versorgung, das Gewinnen oder Verlieren der Unterstützung der Bevölkerung, Beute und taktische Gefechte gegen lokale Machthaber und fürstliche Truppen.

Das Spiel soll sich nicht wie ein klassisches Aufbauspiel mit zahlreichen Produktionsketten spielen. Die Wirtschaft bleibt einfach und überwiegend goldbasiert. Die militärische Entwicklung der Armee ergibt sich aus drei Dingen:

1. **Menschen:** Freiwillige, einfache Bauern, erfahrene Kämpfer (Veteranen) und bezahlte Söldner (Landsknechte).
2. **Ausrüstung:** Improvisierte Werkzeuge, Stangenwaffen, Schwerter, Armbrüste und seltene erbeutete Feuerwaffen.
3. **Unterstützung und Versorgung:** Die Armee kann nur wachsen und bestehen, wenn Menschen bereit sind, sich ihr anzuschließen, und genug Nahrung vorhanden ist.

Die Kampagne erzählt die Entwicklung desselben Bauernhaufens. Verluste bleiben zwischen Missionen bestehen und machen Siege wie Niederlagen bedeutsam.

### Banner des Haufens
Der Haufen zieht unter einer **Regenbogenfahne**, angelehnt an das Banner, das Thomas Müntzer 1525 in Mühlhausen anfertigen ließ (siehe Abschnitt 14). Sie gibt dem Haufen eine erkennbare Identität und erscheint an mehreren Stellen:
- als **Sammelpunkt** auf der Karte (aufgepflanzte Fahne beim Rückzugs- beziehungsweise Sammelbefehl),
- im Hauptmenü beziehungsweise Titelbild,
- auf dem Kampagnenbildschirm zwischen den Missionen,
- gegebenenfalls in der HUD-Leiste.

Die Fahne ist zunächst rein gestalterisch und hat keine eigene Spielmechanik.

### Designprinzipien

- **Eine fortbestehende Armee:** Überlebende und ihre Ausrüstung werden in die nächste Mission übernommen.
- **Wenige, bedeutsame Ressourcen:** Gold und Nahrung bilden den Kern der Wirtschaft.
- **Unterstützung hat Folgen:** Verhalten gegenüber der Bevölkerung beeinflusst Rekrutierung und Versorgung.
- **Ausrüstung ist greifbar:** Waffen werden von Einheiten getragen und können gefunden, gekauft oder erbeutet werden.
- **Einfach zu verstehen, taktisch interessant:** Einheitenrollen, Reichweite, Rüstung, Formation und Moral sollen Entscheidungen erzeugen, ohne übermäßige Mikromanagementpflicht.
- **Historisch inspiriert, nicht als Simulation gedacht:** Waffen, Truppen und Situationen orientieren sich am frühen 16. Jahrhundert, dürfen für klare Spielmechaniken aber vereinfacht werden.

---

## 2. Spielschleife

Die zentrale Spielschleife lautet:

1. **Lage erfassen:** Truppenstärke, Vorräte, Gold, lokale Unterstützung und Missionsziele prüfen.
2. **Rekrutieren:** Freiwillige an unterstützenden Dörfern, Sammelpunkten oder Lagern aufnehmen; gegebenenfalls Landsknechte gegen Gold anwerben.
3. **Versorgung sichern:** Nahrung kaufen, erhalten oder in Dörfern, Klöstern und befestigten Orten erbeuten.
4. **Ausrüstung verbessern:** Waffen und Schutz von besiegten Gegnern oder eroberten Orten übernehmen; passende Ausrüstung an geeignete Kämpfer vergeben.
5. **Marschieren und kämpfen:** Truppen direkt befehligen, Gegner besiegen, Orte einnehmen und auf Gegenangriffe reagieren.
6. **Folgen tragen:** Verluste, Beute und Veränderungen der Unterstützung in die weitere Kampagne übernehmen.

Das Spiel belohnt nicht nur militärischen Erfolg. Eine brutale Vorgehensweise kann kurzfristig Vorräte liefern, aber die spätere Rekrutierung und Versorgung in der Region erschweren.

---

## 3. Kampagne und Wachstum der Armee

Die Kampagne umfasst zunächst drei bis fünf Missionen. Die Armee wächst allmählich, soll aber nicht automatisch nach jeder Mission vollständig aufgefüllt werden.

### Vorläufige Missionsstruktur

#### Mission 1 – Der erste Haufen
- Sehr kleine Gruppe und einfache Ziele.
- Einführung in Auswahl, Bewegung, Angriff, Rückzug und Rekrutierung.
- Gegner: kleine lokale Besatzung oder schlecht geschützte Stellung.
- Erste Beute und erste Gelegenheit, Freiwillige aufzunehmen.

#### Mission 2 – Brot und Unterstützung
- Mehrere Dörfer mit unterschiedlichen Einstellungen zum Aufstand.
- Nahrung kann gekauft, freiwillig bereitgestellt oder gewaltsam beschafft werden.
- Die Konsequenzen von Schutz, Forderungen und Plünderung werden eingeführt.
- Erste Gelegenheit, einen erfahrenen Kämpfer (Veteranen) zu gewinnen.

#### Mission 3 – Das Kloster
- Angriff auf einen befestigten Ort mit Vorräten und möglicherweise wertvoller Ausrüstung.
- Armbrustschützen werden taktisch wichtig.
- Ein Erfolg kann die Armee deutlich verbessern, aber Verluste bleiben dauerhaft.

#### Mission 4 – Die Reiter des Adels
- Die Gegenseite reagiert auf den Aufstand.
- Gepanzerte Fußsoldaten und berittene Ritter stellen neue Herausforderungen.
- Spieße, Formation, Gelände und rechtzeitiger Rückzug werden wichtig.

#### Mission 5 – Die Entscheidung
- Größtes Gefecht der Kampagne.
- Der überlebende Bauernhaufen tritt mit den über mehrere Missionen gesammelten Kämpfern und Ausrüstungsgegenständen an.
- Die Größe und Zusammensetzung der Armee hängt von vorherigen Verlusten, Rekrutierung, Beute und Unterstützung ab.

Die Missionsnamen, Ziele und Gegner sind vorläufig. Die Kampagne soll eine historisch inspirierte Geschichte erzählen, nicht behaupten, einen bestimmten historischen Verlauf exakt abzubilden. In welchen Missionen Landsknechte angeworben werden können, wird pro Mission in den Missionsdaten festgelegt. Ebenso wird dort festgelegt, in welcher Mission man von Thomas Müntzer erfährt (vorläufig Mission 2 oder 3, siehe 7.5).

### Größenordnung
Als grobe Testwerte können die ersten Missionen mit etwa 10–15 Einheiten beginnen und sich im Verlauf auf etwa 50–100 Einheiten steigern. Technisches Ziel ist, dass 100 Einheiten gleichzeitig flüssig spielbar sind (siehe Abschnitt 13). Die tatsächlichen Grenzen hängen von Performance, Übersichtlichkeit und Spielgefühl ab. Diese Zahlen sind keine festen Regeln.

---

## 4. Fortbestehende Armee und Verluste

- Überlebende Einheiten werden zwischen Missionen übernommen.
- Gefallene Einheiten sind dauerhaft verloren.
- Ausrüstung, die eine überlebende Einheit trägt, bleibt grundsätzlich erhalten.
- Neue Freiwillige können den Haufen ergänzen, wenn Unterstützung und Versorgung es zulassen.
- Beute und Ressourcen werden in die nächste Mission übernommen, sofern die Missionsregeln nichts anderes festlegen.
- Versorgungskosten zwischen Missionen reduzieren Vorräte (Marsch, siehe 5.2).
- Es soll möglich sein, sich nach Verlusten zu erholen, aber nicht ohne Aufwand. Ein einzelner schlechter Kampf soll die Kampagne möglichst nicht unwiderruflich ungewinnbar machen.
- Der Kampagnenstand wird zwischen Missionen gespeichert (siehe Abschnitt 13).

Die Einheiten müssen nicht zwingend individuelle Namen oder umfangreiche Charakterbiografien haben. Wichtig ist zunächst, dass ihre Zahl, Rolle und Ausrüstung erhalten bleiben. Eine bewusste Ausnahme sind besondere Persönlichkeiten wie Thomas Müntzer (siehe 7.5).

---

## 5. Ressourcen und Wirtschaft

### 5.1 Gold
Gold ist die zentrale Geldressource. Es wird vor allem verwendet für:
- Kauf von Nahrung und Vorräten.
- Kauf oder Beschaffung bestimmter Ausrüstung.
- Anwerbung von Landsknechten (siehe 7.4).
- Auszahlung des Beuteanteils der Landsknechte (siehe 7.4).

Gewöhnliche freiwillige Bauern und Veteranen werden **nicht mit Gold angeheuert**. Ihre Bereitschaft, sich dem Aufstand anzuschließen, hängt primär von Unterstützung und der Versorgungslage ab.

Gold kann in bestimmten Orten gefunden, als Abgabe erhalten oder erbeutet werden. Die genaue Herkunft und Menge wird pro Mission festgelegt.

### 5.2 Nahrung
Nahrung ist der wichtigste begrenzende Faktor für die Größe und Stabilität des Haufens.
- Nahrung kann gekauft werden.
- Dörfer können Nahrung freiwillig liefern.
- Nahrung kann bei Klöstern, Burgen, Lagern und Dörfern erbeutet werden.
- Nahrung kann im Wald gejagt werden (siehe 5.4).
- Jede Einheit verbraucht im Zeitverlauf Nahrung.
- Bei ausreichenden Vorräten bleibt die Armee stabil.
- Bei knappen Vorräten wird Rekrutierung verlangsamt oder ausgesetzt und die Moral kann sinken.
- Bei anhaltendem Mangel können Kämpfer desertieren und den Haufen verlassen.

Die Versorgung wird als „Nahrung reicht für ungefähr X Tage“ angezeigt.

**Zeitmaßstab (Startwerte, konfigurierbar in den Daten):**
- In einer Mission entspricht 1 Spieltag 60 Sekunden Echtzeit.
- Nahrung wird einmal pro Spieltag abgezogen.
- Zwischen zwei Missionen liegt ein Marsch von 3 Spieltagen, dessen Verbrauch pauschal abgezogen wird.
- Diese Werte stehen als Konstanten in den Daten und werden beim Balancing angepasst, ohne Spielcode umzuschreiben.

Der Verbrauch pro Einheit und Spieltag wird beim Balancing festgelegt.

### 5.3 Keine komplexen Produktionsketten
In der ersten Version gibt es keine verpflichtenden Produktionsketten für Holz, Stein, Erz, Kohle oder Waffenherstellung. Der Spieler muss keine Bergwerke, Schmieden oder Handwerkerketten betreiben.

Ausrüstung kommt aus:
- der anfänglichen Ausrüstung der Rekruten,
- freiwilligen oder gekauften Beschaffungsmöglichkeiten,
- erbeuteten Waffen und Rüstungen,
- Waffen, die nach Kämpfen eingesammelt werden können.

### 5.4 Jagd
Wälder sind eine zusätzliche, begrenzte Nahrungsquelle. Jagd kostet kein Gold und verärgert keine Dörfer, kostet aber Zeit, Kampfkraft und birgt Risiko.

- **Jagdgruppe:** Der Spieler schickt ausgewählte Einheiten in ein Waldgebiet. Sie jagen dort eine gewisse Zeit und kehren dann zurück.
- **Nicht verfügbar für Angriffe:** Während der Jagd stehen die Jäger nicht für eigene Angriffe zur Verfügung.
- **Sichtbar und angreifbar:** Jäger bleiben auf der Karte sichtbar und können von Gegnern angegriffen werden. Während sie jagen, verteidigen sie sich schlechter.
- **Waffe zählt:** Am besten jagt man mit Armbrustschützen; mit improvisierten Waffen ist der Ertrag gering.
- **Nahrung erst bei Rückkehr:** Die erlegte Nahrung wird erst gutgeschrieben, wenn die Jäger den Rückweg schaffen und wieder in der Nähe des Haufens sind. Fallen Jäger unterwegs, geht ihr Anteil verloren.
- **Zurückrufen:** Jäger können jederzeit zurückgerufen werden; sie bringen dann weniger oder gar keine Beute mit.
- **Wildbestand:** Jedes Waldgebiet hat einen eigenen Wildbestand, der durch Jagd sinkt und langsam oder gar nicht nachwächst. Ein Wald kann erschöpft werden; Jagd ist keine unbegrenzte Nahrungsquelle.
- **Wilderei:** Die Jagd war ein Vorrecht des Adels (die Zwölf Artikel von 1525 forderten freie Jagd). Jagd im Gebiet eines Herrn kann dessen Aufmerksamkeit erregen (siehe 6.4 und 11).

Wildarten (z. B. Wildschwein, Reh, Hase), ihr Nahrungswert, die Höhe des Wildbestands und ob dieser fest oder zufällig bestimmt wird, stehen in den Daten und werden beim Balancing angepasst.

---

## 6. Unterstützung der Bevölkerung

Die Unterstützung ist eine Kernmechanik und wird auf zwei Ebenen modelliert.

### 6.1 Globale Grundstimmung
Ein globaler Unterstützungswert bildet ab, wie viel Rückhalt der Aufstand in der Region insgesamt hat. Er beeinflusst:
- wie viele Menschen grundsätzlich bereit sind, sich anzuschließen,
- wie häufig Freiwillige verfügbar werden,
- wie leicht sich der Haufen nach Verlusten verstärken kann,
- gegebenenfalls die Bereitschaft anderer Orte, Nahrung oder Hilfe zu geben.

### 6.2 Lokaler Dorfzustand
Jedes Dorf hat einen eigenen Unterstützungswert beziehungsweise eine klar erkennbare Haltung. Diese kann von sehr feindselig bis stark unterstützend reichen.

Mögliche Auswirkungen:
- Unterstützende Dörfer können Freiwillige und Nahrung bereitstellen.
- Neutrale Dörfer können Hilfe anbieten, wenn der Spieler sie schützt oder örtliche Forderungen erfüllt.
- Dörfer, die brutal behandelt oder stark geplündert wurden, können künftig keine Freiwilligen liefern, Nahrung zurückhalten oder feindselig reagieren.
- Lokale Unterstützung kann sich später wieder verbessern, aber nicht unbedingt sofort.

### 6.3 Verhalten des Spielers
Mögliche Handlungen gegenüber einem Dorf:
- **Schützen und unterstützen:** Erhöht tendenziell die lokale Unterstützung.
- **Verhandelte oder begrenzte Abgabe:** Bringt Ressourcen, kann aber je nach Situation Unterstützung kosten.
- **Gewaltsame Beschlagnahmung:** Bringt kurzfristig mehr Vorräte, senkt jedoch die Unterstützung.
- **Plünderung und Gewalt gegen Bewohner:** Kann größere kurzfristige Beute bringen, führt aber zu starken langfristigen Nachteilen.

Die Bevölkerung soll nicht rein dekorativ sein. Die Folgen von Handlungen müssen auf der Karte und in der Rekrutierung spürbar werden. Die genaue Abstufung wird im Balancing festgelegt.

### 6.4 Forderungen und Schreiben an die Obrigkeit
Der Haufen kann seine Anliegen öffentlich machen, angelehnt an historische Forderungsschriften wie die Zwölf Artikel von 1525. Das ist eine einfache, begrenzte Aktion, kein Diplomatiesystem.

- **Forderungen verkünden (Flugschrift):** Erhöht die globale Unterstützung. Die Obrigkeit wird dadurch aufmerksam und reagiert früher oder stärker (siehe Abschnitt 11).
- **Schreiben an einen bestimmten Herrn:** Wirkt auf die Dörfer in dessen Gebiet. Zwei Tonlagen:
  - *gemäßigt:* etwas mehr lokale Unterstützung, gegebenenfalls ein kleines Zugeständnis oder eine kurze Ruhe vor Gegenmaßnahmen;
  - *scharf/herausfordernd:* deutlich mehr lokale Unterstützung, aber der Herr wird sofort feindselig und reagiert militärisch (z. B. Verstärkung oder Gegenangriff).
- **Begrenzung:** Nur selten möglich (z. B. einmal pro Mission oder an ein Missionsereignis gebunden), damit die Aktion kein beliebig wiederholbarer Unterstützungsgewinn wird.
- Die Oberfläche erklärt vor der Entscheidung die zu erwartenden Folgen.
- **Mit Thomas Müntzer im Haufen** kostet das gemäßigte Schreiben spürbar Moral, weil er widerspricht (siehe 7.5).

Welche Missionen diese Aktion anbieten, wird in den Missionsdaten festgelegt.

---

## 7. Rekrutierung, Versorgung und Desertion

### 7.1 Freiwillige statt gewöhnlicher Soldzahlung
Gewöhnliche Bauern kosten bei der Rekrutierung grundsätzlich kein Gold. Sie schließen sich an, wenn:
- die lokale oder globale Unterstützung ausreichend ist,
- am Rekrutierungsort Freiwillige verfügbar sind,
- die Versorgung des Haufens genügend Spielraum lässt.

Ein Dorf mit hoher Unterstützung kann neue Freiwillige anbieten. Ein Dorf mit niedriger Unterstützung kann wenige oder gar keine liefern.

### 7.2 Versorgung begrenzt das Wachstum
Es gibt keinen künstlichen „Kaserne hat 20 Plätze“-Grenzwert als zentrale Regel. Die tragfähige Größe des Haufens hängt vor allem von Nahrung und Unterstützung ab.

- Bei ausreichend Nahrung und hoher Unterstützung kann der Haufen wachsen.
- Bei knappen Vorräten wird die Rekrutierung reduziert oder pausiert.
- Bei Nahrungsmangel sinken Moral und Stabilität.
- Bei anhaltendem Mangel verlassen Bauern den Haufen und kehren möglicherweise in ihre Heimat zurück oder versorgen sich selbst.
- Desertion soll angekündigt und nachvollziehbar sein, nicht zufällig und ohne Warnung erfolgen.

Die Oberfläche soll jederzeit zeigen, wie viele Tage Nahrung ungefähr reichen und ob die Armee gefährdet ist.

### 7.3 Veteranen
Neben gewöhnlichen Freiwilligen können vereinzelt erfahrene Kämpfer auftreten, etwa Männer mit früherer militärischer Erfahrung.
- Sie sind deutlich seltener als einfache Bauern.
- Sie haben höhere Grundwerte, etwa bessere Kampffähigkeit, Disziplin oder Moral.
- Sie können bereits bessere Waffen oder Schutz tragen.
- Sie sollten nicht einfach nur „stärkere Bauern“ sein: Ihr Wert ergibt sich aus Erfahrung **und** Ausrüstung.
- Es kann sinnvoll sein, gute Waffen für einen späteren Veteranen aufzubewahren, der sie effektiver einsetzen kann.
- Solche Kämpfer können in bestimmten Dörfern, Lagern, nach Gefechten oder als Ergebnis von Missionsereignissen verfügbar werden.

Die Verfügbarkeit ist bewusst ungewiss. Der Spieler soll abwägen, ob eine seltene Waffe sofort vergeben oder für einen möglicherweise später auftauchenden Veteranen aufbewahrt wird. Diese Unsicherheit darf aber nicht so groß werden, dass Spieler wichtige Ausrüstung grundsätzlich nicht einsetzen wollen.

Veteranen schließen sich freiwillig an und kosten kein Gold. Bezahlte Söldner sind davon getrennt und werden als Landsknechte geführt (siehe 7.4).

### 7.4 Landsknechte – bezahlte Söldner
Landsknechte sind eine wichtige, aber kostenpflichtige Truppenart. Sie sind besser ausgebildet und meist besser ausgerüstet als freiwillige Bauern, aber nicht unbesiegbar.

**Rekrutierung**
- Verfügbar an bestimmten Dörfern, Tavernen, Lagern oder durch Missionsereignisse; begrenzt und missionsabhängig.
- Kosten Gold bei der Anwerbung.
- Benötigen wie alle Einheiten Nahrung.
- Können bessere Waffen oder Rüstung tragen.

**Beuteanteil**
- Bei erfolgreicher Plünderung oder Einnahme eines Ortes entsteht ein Gold-Beutepool.
- Ein Anteil davon geht an die Landsknechte; je größer ihr Anteil an der Armee, desto höher ihr Gesamtanspruch.
- Der Anspruch ist auf die tatsächlich verfügbare Beute begrenzt; Gold wird nie negativ.
- Der Landsknecht-Anteil betrifft zunächst nur Gold, nicht Nahrung oder Ausrüstung.
- Die Oberfläche zeigt Gesamtbeute, Landsknecht-Anteil und Spieleranteil.
- Grundanteil pro Landsknecht und Formel sind konfigurierbar; konkrete Werte werden im Prototyp festgelegt.

**Zahlungsverzug**
- Kann ein vereinbarter Anteil nicht gezahlt werden, sinkt die Moral der Landsknechte.
- Bei längerem Verzug können sie unzuverlässig werden oder die Armee verlassen – immer mit vorheriger, klarer Warnung.
- **Entstehung des Rückstands (festgelegt am 2026-10-19): Mindestanspruch pro Beuteabrechnung.** Jeder lebende Landsknecht hat bei jeder Beuteabrechnung einen Mindestanspruch in Gold (konfigurierbar). Fällig ist der höhere Wert aus Beuteanteil und Mindestanspruch, dazu ein offener Rückstand aus früheren Abrechnungen. Gezahlt wird zuerst aus der Beute, dann aus der Kasse; was nicht gezahlt werden kann, wird als Rückstand erfasst und klar angezeigt. Gold wird nie negativ. Ohne lebende Landsknechte verfällt ein Rückstand.
- Die Folgen eines Rückstands (Moral, Unzuverlässigkeit, Abzug) werden mit Moral und Desertion umgesetzt (siehe `docs/IMPLEMENTATION_PLAN.md`, Meilenstein 8).

Keine individuellen Verträge, Soldstufen oder verschiedenen Kompanien in der ersten Version.

### 7.5 Besondere Persönlichkeiten: Thomas Müntzer
Thomas Müntzer, der radikale Prediger, der 1525 den thüringischen Haufen bei Frankenhausen anführte, kann sich dem Haufen anschließen. Er ist eine bewusste Abwägung: Er stärkt die Moral, schränkt aber die Möglichkeiten gegenüber der Obrigkeit ein.

- **Begleiter, keine Kampfeinheit:** Müntzer hat keinen Kampfwert und muss nicht als Figur auf der Karte erscheinen. Er wird in der Oberfläche als Teil des Haufens angezeigt (z. B. Porträt oder Symbol).
- **Begegnung (deterministisch):** In einer festgelegten Mission erfährt der Spieler durch eine **Flugschrift Müntzers**, die auf dem Bildschirm angezeigt wird, von ihm. Sie nennt das Dorf oder Kloster, in dem er sich aufhält; der Ort wird auf der Karte markiert.
- **Anschluss:** Der Spieler kann, muss aber nicht, mit eigenen Einheiten dorthin ziehen und Müntzer zum Anschluss bewegen. Ablehnen oder Ignorieren ist erlaubt.
- **Positive Wirkung:** Solange er dabei ist, ist die Moral des Haufens höher. Optional kann er die Wirkung der verkündeten Forderungen (Flugschrift, 6.4) verstärken.
- **Negative Wirkung:** Solange er dabei ist, kostet das gemäßigte Schreiben an einen Herrn spürbar Moral, weil Müntzer widerspricht. Das scharfe Schreiben bleibt ohne diesen Aufschlag. So drängt er den Haufen zu klaren, herausfordernden Standpunkten, die militärische Gegenreaktionen auslösen können.
- **Wegschicken:** Der Spieler kann ihn jederzeit wieder wegschicken; das kostet einmalig Moral im Haufen.
- **Fortbestand:** Er bleibt wie die übrige Armee zwischen Missionen im Haufen und wird im Kampagnenstand gespeichert.
- Die Oberfläche erklärt die Wirkung vor dem Anschluss und vor dem Wegschicken.

Die Stärke von Moralbonus, Moralkosten und Verlust beim Wegschicken steht in den Daten und wird beim Balancing festgelegt. Die Figur ist historisch inspiriert; ihr Weg im Spiel muss nicht dem historischen Verlauf folgen.

---

## 8. Einheiten und Ausrüstung

### 8.1 Grundprinzip: Einheitentyp und Ausrüstung trennen
Eine Einheit hat Grundwerte, Erfahrung und aktuell getragene Ausrüstung. Die Kampffähigkeit ergibt sich aus der Kombination dieser Faktoren.

Beispiel:
- Ein einfacher Bauer mit Dreschflegel ist schwach geschützt und wenig erfahren.
- Ein Veteran mit derselben Waffe ist aufgrund seiner Erfahrung kampfstärker.
- Gibt man ihm zusätzlich ein Schwert und bessere Rüstung, verbessern sich seine Werte weiter.

Einheiten können nur eine begrenzte, plausible Menge an Ausrüstung tragen. Es gibt kein Inventar, in dem ein einzelner Bauer beliebig viele Waffen lagert. Ausrüstung muss getragen, abgelegt, ausgetauscht oder für andere Kämpfer aufgehoben werden.

### 8.2 Vorgesehene Waffenklassen

#### Improvisierte Nahkampfwaffen
Beispiele: Mistgabel, Heugabel, Dreschflegel, Axt, Beil, Sichel und Messer.
- Einfach verfügbar.
- Unterschiedliche Reichweite und Angriffsgeschwindigkeit.
- Meist geringe Schutzwirkung und begrenzte Kampfkraft.
- Für die erste Version können mehrere davon als visuelle Varianten einer allgemeinen improvisierten Waffenklasse umgesetzt werden.

#### Umgeformte Stangenwaffen
Beispiele: Kriegssense und einfache lange Stangenwaffen.
- Größere Reichweite.
- Nützlich, um Gegner auf Abstand zu halten.
- Können gegen Reiter besonders wirksam sein, sofern die Einheit ihre Position hält.
- Kriegssensen sind von normalen Sensen zu unterscheiden: Die Klinge ist längs zum Schaft ausgerichtet.

#### Speere und Piken
- Gut für Formation und gegen anstürmende Reiter.
- In Formation wirkungsvoller als in ungeordnetem Nahkampf.
- Lange Piken erfordern ausreichend Platz und sind nicht in jeder Situation überlegen.

#### Schwerter, Dolche und Bauernwehr
- Eher bei erfahrenen Kämpfern oder als Beute zu erwarten als als Standardwaffe jedes Bauern.
- Gute Nahkampfeigenschaften, aber keine universelle Überlegenheit gegenüber Stangenwaffen.
- Die Bauernwehr ist als langes, einschneidiges Allzweckmesser eine mögliche historische Waffenvariante.

#### Armbrüste
- Eine reguläre Fernkampfoption und in der Spielwelt plausibel verfügbar, unter anderem wegen ihrer Nutzung für die Jagd.
- Verursachen Schaden aus der Entfernung und sind taktisch wertvoll bei Angriffen auf befestigte Orte.
- Nachladen dauert; Schützen sind im direkten Nahkampf verwundbar.
- Armbrüste und Bolzen können gefunden, gekauft oder erbeutet werden.

#### Frühe Feuerwaffen
Beispiele: Handbüchsen, Hakenbüchsen und Arkebusen.
- Selten und nicht das Rückgrat der Bauernarmee.
- Können in bestimmten Burgen, Klöstern, Zeughäusern oder Lagern erbeutet werden.
- Hohe Wirkung in passenden Situationen, aber lange Nachladezeit und Bedarf an Pulver beziehungsweise Munition.
- Für die erste spielbare Version optional; später als seltene Spezialausrüstung einführen.

#### Artillerie
- Sehr seltene, missionsgebundene Möglichkeit, etwa nach der Einnahme eines Zeughauses.
- Benötigt Bedienung, Munition/Pulver und Zeit zum Bewegen beziehungsweise Ausrichten.
- Nicht für die erste Version erforderlich.

### 8.3 Rüstung und Schutz
Rüstung ist eine Ausrüstungseigenschaft und muss nicht für jede Rüstungsart eine eigene Einheit definieren.
- **Keine oder geringe Rüstung:** häufig bei einfachen Bauern; geringe Schadensreduktion, gute Beweglichkeit.
- **Leichter Schutz:** beispielsweise verstärktes Wams oder einzelne Schutzteile.
- **Schwerer Schutz:** etwa Helm und Brustpanzer; höherer Schutz, gegebenenfalls geringere Beweglichkeit oder höhere Ausrüstungskosten.

Bessere Rüstung ist eher selten, kann bei erfahrenen Kämpfern vorkommen oder erbeutet werden. Nicht jeder Kämpfer muss einen sichtbaren Rüstungswert oder eine separate Rüstungsklasse besitzen; die ersten Werte können in wenige Schutzstufen zusammengefasst werden.

### 8.4 Einheiten für den ersten Spielumfang
Um die erste Version überschaubar zu halten, werden folgende Kampftypen umgesetzt:
1. **Einfacher Bauer:** improvisierte Nahkampfwaffe, niedrige Grundwerte.
2. **Speerträger:** Reichweite; Bonus gegen Reiter, sobald Reiter eingeführt sind.
3. **Schwertkämpfer:** stärkerer Nahkampf, eher selten beziehungsweise über Ausrüstung und Erfahrung verfügbar.
4. **Armbrustschütze:** Fernkampf mit Nachladezeit.
5. **Gepanzerter Fußsoldat des Gegners:** bessere Grundwerte und Schutz.
6. **Landsknecht:** bezahlter, ausgebildeter Söldner mit besseren Grundwerten und meist besserer Ausrüstung (siehe 7.4).
7. **Berittener Ritter des Gegners:** beweglich und gefährlich beim Angriff, aber konterbar durch Speere und geeignete Formation.

Die Typen 1–6 werden bis zur ersten vollständigen Mission umgesetzt. Der berittene Ritter folgt danach, da er erst ab Mission 4 benötigt wird (siehe Entwicklungsreihenfolge in Abschnitt 13).

Veteranen werden als seltene freiwillige Kämpfer mit besseren Grundwerten modelliert, nicht als eigene Einheit mit Produktionslogik. Feuerwaffen und Artillerie folgen erst später.

---

## 9. Kampf und direkte Truppenführung

Der Spieler kontrolliert zunächst einen zusammenhängenden Bauernhaufen. Er kann Einheiten oder Gruppen auswählen und Befehle erteilen:
- Bewegen.
- Angreifen.
- Position halten.
- Rückzug beziehungsweise Sammeln.
- Gegebenenfalls Formation bilden.

Wichtige taktische Faktoren:
- Reichweite und Waffentyp.
- Rüstung und Erfahrung.
- Formation und Gelände.
- Moral und Versorgung.
- Anstürme und Verwundbarkeit von Fernkämpfern.
- Speere als Gegenmittel gegen Reiter.
- Engstellen, Tore und Befestigungen bei Angriffen auf befestigte Orte.

**Gelände (festgelegt am 2026-10-19):**
- **Wald** verlangsamt die Bewegung (Startwert: 70 % der normalen Geschwindigkeit, konfigurierbar in den Kacheldaten). Gruppen umgehen Wald, wenn der Umweg schneller ist.
- **Deckung im Wald:** Einheiten im Wald sollen schwerer von Fernkämpfern zu treffen sein. Umsetzung erst mit dem Fernkampf der Armbrustschützen (siehe `docs/IMPLEMENTATION_PLAN.md`, Meilenstein 3); konkreter Wert wird dort balanciert.
- **Jagd im Wald:** Wälder liefern durch Jagd Nahrung (siehe 5.4).

Es muss kein komplexes Formationssystem zum Start geben. Zunächst reichen verständliche Befehle und wenige klare Waffeninteraktionen. Mehrere unabhängig befehligte Armeegruppen sind keine Voraussetzung für die erste Version; eine zweite Gruppe oder parallele Angriffswege können später ergänzt werden.

---

## 10. Orte und Missionsziele

Vorgesehene Orte:
- **Dörfer:** Rekrutierung, Unterstützung, Nahrung und mögliche Konflikte.
- **Tavernen oder Sammelpunkte:** mögliche Orte, an denen Freiwillige, Veteranen oder Landsknechte auftauchen.
- **Klöster:** Vorräte, Geld, befestigte Anlagen und mögliche Waffenbeute.
- **Burgen und Adelssitze:** militärische Ziele, Garnisonen, wertvolle Beute und seltene Ausrüstung.
- **Lager und Zeughäuser:** Waffen, Munition und Versorgung.
- **Feldstellungen oder Außenposten:** frühe, einfachere Kampfziele.

Nicht jeder Ort muss ein Gebäude sein, das der Spieler dauerhaft verwaltet. Viele Orte dienen als Missionsobjekte mit einem klaren taktischen und wirtschaftlichen Nutzen.

---

## 11. Gegner und Eskalation

Die Gegenseite kann umfassen:
- lokale Wachen und einfache Fußsoldaten,
- besser ausgerüstete Fußsoldaten,
- Armbrust- oder Büchsenschützen,
- gepanzerte Kämpfer,
- berittene Ritter.

Gegnerverhalten für die erste Version:
- bewachen einen Ort,
- patrouillieren auf einer einfachen Route,
- reagieren, wenn der Spieler in Reichweite kommt,
- rufen bei bestimmten Missionsbedingungen Verstärkung,
- starten gegebenenfalls einen Gegenangriff.

Die Eskalation soll mit dem Fortschritt der Kampagne zunehmen. Eine große oder erfolgreiche Rebellion kann stärkere Reaktionen der Fürsten auslösen. Auch öffentliche Forderungen und herausfordernde Schreiben (siehe 6.4) sowie Wilderei im Gebiet eines Herrn (siehe 5.4) können Reaktionen auslösen. Gegner sollen nicht ständig ohne nachvollziehbaren Grund angreifen.

---

## 12. Benutzeroberfläche

Die Oberfläche soll die wichtigsten Entscheidungen auf einen Blick ermöglichen:
- Goldbestand.
- Nahrungsvorrat und geschätzte verbleibende Versorgungstage.
- Gesamtzahl der Kämpfer und grobe Zusammensetzung.
- Globale Unterstützung.
- Lokale Haltung des ausgewählten Dorfes.
- Rekrutierungsmöglichkeiten, verfügbare Freiwillige und gegebenenfalls anwerbbare Landsknechte.
- Ausrüstung ausgewählter Einheiten.
- Missionsziele und aktueller Status.
- Bei Beuteabrechnungen: Gesamtbeute, Landsknecht-Anteil und Spieleranteil.
- Begleitende Persönlichkeiten (z. B. Thomas Müntzer) und ihre Wirkung.

Der Sammelpunkt wird als Regenbogenfahne des Haufens dargestellt (siehe Abschnitt 1, Banner des Haufens).

Warnungen bei drohender Desertion oder Versorgungskrise müssen früh genug angezeigt werden, damit der Spieler reagieren kann.

---

## 13. Technische Leitlinien

### Architektur
- Browserbasiertes 2D-Spiel; TypeScript und Phaser als 2D-Game-Engine.
- Datengetriebene Definitionen für Einheiten, Waffen, Rüstung, Orte und Missionen.
- Simulation, Spielregeln, Darstellung und Benutzeroberfläche sauber voneinander trennen.
- Missionen möglichst über Daten konfigurieren, nicht durch Kopieren großer Mengen von Spielcode.
- Das Projekt in kleinen, testbaren Schritten entwickeln und Änderungen regelmäßig versionieren.

### Technische Festlegungen
- **Build und Hosting:** Vite erzeugt eine statische Seite, die auf GitHub Pages, Netlify oder itch.io im Browser spielbar ist.
- **Tests:** Vitest für reine Spiellogik (Beuteaufteilung, Nahrungsverbrauch, Unterstützung, Schadensberechnung). Grafik und Steuerung werden manuell im Spiel getestet.
- **Speichern:** In der ersten Version nur zwischen Missionen. Der Kampagnenstand (Armee, Ausrüstung, Ressourcen, Dorfzustände) wird als JSON mit Versionsnummer im localStorage gespeichert. Kein Speichern mitten in einer Mission.
- **Pathfinding:** A* auf einem Kachelraster (eigene Umsetzung oder Bibliothek wie EasyStar.js) plus einfache Abstoßung zwischen Einheiten. Bei Gruppenbefehlen wird ein Pfad berechnet, dem die Einheiten versetzt folgen. Flow Fields nur, falls 100 Einheiten nicht flüssig laufen.
- **Zielgröße:** 100 Einheiten gleichzeitig sollen flüssig spielbar sein.
- **Konfigurierbare Konstanten:** Zeitmaßstab, Marschtage, Verbrauchswerte, Beuteanteile und vergleichbare Balancing-Werte stehen in den Daten, nicht verstreut im Code.

### Datenmodell
Einheiten sollten unter anderem besitzen:
- Einheitentyp beziehungsweise Rolle.
- Grundwerte (Lebenspunkte, Angriff, Verteidigung, Geschwindigkeit, Moral oder Erfahrung).
- aktuelle Waffe und Rüstung.
- Status (lebend, verwundet, desertiert oder gefallen, soweit diese Zustände implementiert werden).
- Zugehörigkeit und Position.

Waffen sollten unter anderem definieren:
- Waffenklasse.
- Reichweite.
- Schaden.
- Angriffsgeschwindigkeit beziehungsweise Nachladezeit.
- mögliche Boni oder Nachteile gegen bestimmte Gegner.
- ob Munition oder Pulver benötigt wird.

Dörfer sollten unter anderem besitzen:
- lokalen Unterstützungswert.
- verfügbares Nahrungsangebot.
- mögliche Freiwillige, gegebenenfalls Veteranen und gegebenenfalls anwerbbare Landsknechte.
- Reaktion auf frühere Handlungen des Spielers.

Missionen sollten Startarmee, Vorräte, Orte, Gegner, Ereignisse, Ziele und Sieg-/Niederlagebedingungen definieren.

### Entwicklungsreihenfolge
Die verbindliche Reihenfolge und die Details stehen in `docs/IMPLEMENTATION_PLAN.md`. Grob:
1. Projektgerüst, Karte, Tests, Build und Hosting.
2. Auswahl, Bewegung, Pathfinding.
3. Grundkampf.
4. Einheitenrollen, Waffen, Rüstung, Landsknechte als Einheit.
5. Mini-Mission als durchgehend spielbarer Prototyp.
6. Gold, Nahrung und Verbrauch.
6a. Jagd im Wald als zusätzliche Nahrungsquelle.
7. Rekrutierung und Landsknecht-Ökonomie.
8. Globale und lokale Unterstützung.
9. Beute und Ausrüstungswechsel.
10. Desertion, Moral, Kampagnenübergang und Speichern.
10a. Thomas Müntzer als Begleiter.
11. Erste vollständige Mission.
12. Berittene Ritter, Befestigungen, Gegnereskalation.
13. Kampagne mit 3–5 Missionen.
14. Politur, seltene Feuerwaffen, Artillerie und weitere optionale Inhalte.

### Qualitätsziel
Vor dem Ausbau auf fünf Missionen soll eine einzelne Mission vollständig spielbar sein: Einheiten bewegen, kämpfen, rekrutieren, Nahrung beschaffen, einen Ort einnehmen und Sieg oder Niederlage auslösen. Erst wenn diese Schleife stabil funktioniert, wird der Umfang erweitert.

---

## 14. Historische Einordnung und Grenzen

Das Spiel ist historisch inspiriert, aber keine exakte Simulation. Die Ausrüstung der Aufständischen variierte nach Region, Zeitpunkt und verfügbaren Ressourcen. Improvisierte landwirtschaftliche Waffen standen neben regulären Waffen; erfahrene Kämpfer und erbeutete Ausrüstung konnten den Charakter eines Haufens verändern.

Daher gilt:
- Nicht jeder Bauer ist mit einer Mistgabel bewaffnet.
- Schwerter, Armbrüste, Stangenwaffen und Schutzkleidung sind möglich, aber nicht bei allen gleich verbreitet.
- Veteranen und Landsknechte sind seltene, wertvolle Verstärkungen.
- Feuerwaffen und Artillerie sind optionale, seltene Beutestücke und keine zentrale Voraussetzung des Spiels.
- Historische Plausibilität soll Spielentscheidungen stützen, nicht zu unnötiger Komplexität führen.

**Zur Regenbogenfahne:** Historisch gehört sie vor allem zu Müntzers thüringischem Haufen, der unter ihr bei Frankenhausen am 15. Mai 1525 geschlagen wurde; der Überlieferung nach trug sie die Inschrift „Verbum domini maneat in aeternum“. Das weiter verbreitete Zeichen der Bauernbewegung war der Bundschuh. Das Spiel nutzt die Regenbogenfahne bewusst als Banner des eigenen Haufens.

Eigene Grafiken, Namen, Karten, Musik und Texte verwenden. Keine geschützten Spielressourcen oder fremden Spielcodes ungeprüft übernehmen.

---

## 15. Noch offene Balancing-Fragen

Diese Punkte werden nicht vorab überkompliziert, sondern anhand eines spielbaren Prototyps entschieden:
- Wie viel Nahrung verbraucht eine Einheit pro Spieltag?
- Wie lang soll ein Spieltag in Echtzeit sein (Startwert 60 Sekunden)?
- Wie viele Marschtage liegen zwischen Missionen (Startwert 3)?
- Wie stark sinkt die Unterstützung durch verschiedene Handlungen?
- Wie viel Unterstützung bringen Forderungen und Schreiben, und wie stark reagiert die Obrigkeit darauf?
- Wie viel Wild hat ein Wald, wie schnell wächst es nach, und wie viel Nahrung bringen Jagd und einzelne Wildarten?
- Wie stark hebt Thomas Müntzer die Moral, wie viel kostet mit ihm das gemäßigte Schreiben, und wie viel Moral kostet es, ihn wegzuschicken?
- Wie viele Freiwillige kann ein Dorf bereitstellen?
- Wie selten sind Veteranen und wie stark sind sie?
- Wie hoch sind Anwerbegebühr, Grundanteil und Mindestanspruch pro Landsknecht an der Beute?
- Wie genau werden Waffen aus Beute aufgeteilt?
- Wie stark reduzieren Rüstungen Schaden?
- Wie wirksam sind Speere gegen berittene Gegner?
- Wie viele Einheiten kann die Engine auf der Zielhardware flüssig darstellen?
- Wie viel Fortschritt und welche Ressourcen werden zwischen den Missionen übernommen?

## 16. Offene Designentscheidungen

- Derzeit keine. (Zahlungsverzug der Landsknechte entschieden am 2026-10-19: Mindestanspruch pro Beuteabrechnung, siehe 7.4.)

**Grundsatz:** Erst eine einfache, funktionierende Spielschleife; danach schrittweise Tiefe ergänzen.
