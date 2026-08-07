# ADR-0011 — Eingaben-Persistenz: localStorage mit Opt-in, keine Cookies

Status: akzeptiert · 2026-08-07

## Kontext
Nutzer sollen beim nächsten Aufruf nicht alle Eingaben neu tippen müssen.
Cookies scheiden aus: Sie werden bei jedem HTTP-Request an den Server
übertragen — auf GitHub Pages landeten Finanz-Eingaben damit in fremden
Server-Logs und das CI-geprüfte Versprechen "keine Daten verlassen das
Gerät" (ADR-0008) wäre gebrochen; zudem ~4-KB-Limit.

## Entscheidung
localStorage, strikt Opt-in: Button "Eingaben für das nächste Mal in diesem
Browser speichern", sichtbarer Löschen-Button, Meldung mit Zeitstempel beim
Wiederherstellen. Payload trägt eine Schema-Version; fremde Versionen werden
abgelehnt statt still falsch geladen. Das Backend wird injiziert, damit
Node-Tests ohne Browser laufen; alle Fehler (Quota, Private Mode, korrupte
Daten) kommen als Ergebnisobjekt zurück, nie als Exception. Ergänzend folgt
Szenario-Export/-Import als JSON-Datei (Backup, Gerätewechsel, mehrere
Szenarien) gemäß Architektur-Dokument.

## Konsequenzen
Keine Requests, kein Consent-Banner-Anlass: Die Speicherung ist eine vom
Nutzer ausdrücklich angeforderte Funktion (Opt-in-Klick). Einschränkungen:
localStorage ist origin-gebunden — unter username.github.io teilen sich alle
Project-Pages desselben Kontos den Origin (Key-Prefix "avp:" mindert
Kollisionen); unter file:// ist das Verhalten browserabhängig, auf Pages
garantiert. Bei künftigen Änderungen am Eingabemodell wird SCHEMA erhöht
und ggf. eine Migration ergänzt.
