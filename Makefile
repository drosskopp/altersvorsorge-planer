# Altersvorsorge-Planer v7 — Build & Test
# Ziele:  make test | make release | make check-privacy | make clean
.PHONY: test release check-privacy clean

test:
	node tests/run.mjs

release:
	bash scripts/build.sh
	$(MAKE) check-privacy

# Privacy-Gate (ADR-0008): Die Release-Datei darf KEINE automatischen externen
# Requests auslösen. Verboten: src=/url(/@import/fetch(/XMLHttpRequest mit http(s).
# Erlaubt: reine href-Links (lösen ohne Klick nichts aus) und URLs in Kommentaren.
check-privacy:
	@if grep -nE '(src="https?://|url\(https?://|@import[^;]*https?://|fetch\(["'"'"']https?://|XMLHttpRequest)' dist/*.html; then \
		echo "PRIVACY-VERSTOSS: externe Ressource in dist/ gefunden"; exit 1; \
	else echo "check-privacy: OK — keine externen Ressourcen-Requests"; fi

clean:
	rm -rf dist
