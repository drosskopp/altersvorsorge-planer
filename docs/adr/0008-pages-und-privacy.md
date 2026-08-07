# ADR-0008 — GitHub Pages + Privacy by Design

Status: akzeptiert · 2026-08-07

## Kontext
Das Tool soll kostenlos, wartungsfrei und ohne Serverbetrieb nutzbar sein; zugleich verarbeitet es sensible Finanz-Eingaben.

## Entscheidung
Statisches Deployment via GitHub Pages aus der CI. Die Release-Datei macht keinerlei externe Requests (Chart.js wird gevendort, keine Webfonts); make check-privacy erzwingt das; teilbare Links nutzen ausschließlich das URL-Fragment.

## Konsequenzen
Kein Betriebsaufwand; die Aussage 'keine Daten verlassen das Gerät' ist technisch garantiert und CI-geprüft. Restaufwand ist die jährliche Parameterpflege.
