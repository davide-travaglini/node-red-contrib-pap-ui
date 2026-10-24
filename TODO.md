# PAP UI — Backlog

> Aggiornato: 2026-10-17

---

## 🔴 Critici (bloccanti per l'usabilità)

Nessun critico noto. Trovato e corretto durante questo giro un bug reale: le route REST
`/api/layout`, `/api/state`, `/api/scenes` erano registrate **dopo** il catch-all SPA
(`basePath + '/*'`), quindi Express le intercettava sempre con `index.html` invece del JSON. Il
dashboard funzionava comunque perché si appoggia al socket per il layout iniziale, ma qualunque
consumer REST (incluso `scenes.js` → `saveScene`/`deleteScene`) era di fatto rotto. Ordine corretto
in [ui-pap-server.js](nodes/ui-pap-server/ui-pap-server.js): route `/api/*` prima, catch-all SPA
dopo. Verificato con smoke test (`node-red` headless + `curl`).

---

## 🟡 Importanti (degradano l'esperienza)

### Nodi Node-RED — mancanti
- [ ] **`ui-pap-area` non appare in `buildLayoutPayload`**
  `registerArea()` salva l'area ma `buildLayoutPayload` include solo `areas` come array — verificare che `areaId` sulle pagine corrisponda agli `id` restituiti.

### Frontend — componenti mancanti
- [ ] **Tile thermostat — mini sparkline nella tile**
  La tile del termostato potrebbe mostrare un grafico ridotto della storia (ultimi N valori) direttamente nella card.

- [ ] **Tile light — preview colore**
  Se la luce ha `hasColor` e uno stato colore, mostrare un cerchietto colorato nella tile (oggi il campo `color` è solo pass-through nel payload, nessuna UI).

- [ ] **`PageView.vue` — loading skeleton**
  Se il layout non è ancora caricato (prima fetch), mostrare placeholder animati invece di "Pagina non trovata".

- [ ] **`PrimaryNav` — stato di caricamento**
  Se `layoutStore.loading === true`, mostrare un indicatore nella sidebar.

- [ ] **`SecondaryNav` — nascondere sottogruppi se il gruppo non è selezionato**
  Attualmente i sottogruppi con >1 item sono sempre visibili. Potrebbe essere più pulito mostrarli solo quando il gruppo padre è selezionato (espansione accordion).

### Scene — UI di gestione
- [ ] **Editor scene nel frontend** — `ui-pap-scene` ora esiste come tile-trigger verso un flow, e la REST API di save/delete scene funziona (bug fix sopra), ma non c'è ancora una UI per creare/modificare scene salvate dal dashboard stesso.

---

## 🟢 Miglioramenti / Nice-to-have

### UX
- [ ] **Dark/light theme toggle** — CSS vars già predisposte, basta aggiungere la classe al body e il toggle nella navbar

- [ ] **`gridAutoRows` configurabile per pagina** — attualmente fisso. Potrebbe essere un campo `cellHeight` sul nodo `ui-pap-page`.

- [ ] **Drag & reorder widget** — non previsto ma sarebbe il passo naturale successivo alla grid.

- [ ] **Tooltip al hover sulla tile** — mostrare info estese (es. ultimo aggiornamento).

- [ ] **Color wheel per `ui-pap-light`** — oggi `hasColor` passa solo un campo `color` testuale nel payload, nessun picker visivo.

### Node-RED editor
- [ ] **Preview live nell'editor Node-RED** — una piccola anteprima del layout nella sidebar del nodo server (opzionale, complessità alta).

- [ ] **Help `.html` da completare per i nodi storici** — `ui-pap-switch`/`sensor`/`gauge` hanno help sommari; i nuovi nodi (button/slider/light/thermostat/scene) hanno già help estesi.

### Build & distribuzione
- [ ] **`package.json` — keywords, description, repository** da completare prima di pubblicare su npm.

- [ ] **Test di integrazione automatico** — oggi lo smoke test (`node-red` headless + `curl` su `/api/layout`) è manuale; andrebbe scriptato in CI.

- [ ] **CI/CD** — nessuna pipeline GitHub Actions per build + npm publish.

- [ ] **`ui-pap-chart`** — time-series line/bar chart, non ancora iniziato.

- [ ] **Icone PWA generate con placeholder** — `pap-logo.svg` è un logo segnaposto (mosaico di
  quadrati colorati). Da sostituire con un logo definitivo prima della pubblicazione (poi
  rilanciare `npm run icons`).

- [ ] **ngrok non testato end-to-end** — `ui-pap-tunnel` non è stato verificato con un account
  ngrok reale in questo ambiente di sviluppo (richiede authtoken). Verificare manualmente prima
  del rilascio.

---

## ✅ Completato

- [x] Gerarchia `server → area → page → group → subgroup → widget`
- [x] Nodi config: `ui-pap-area`, `ui-pap-subgroup`
- [x] `deferInit` con `setImmediate` per risolvere inizializzazione asincrona
- [x] Fix ERR_TOO_MANY_REDIRECTS (serve index.html direttamente)
- [x] `isHome` e `gridColumns` su `ui-pap-page`
- [x] `gridW` e `gridH` su tutti i widget
- [x] Layout SPA: PrimaryNav + SecondaryNav + WidgetBody CSS grid
- [x] Filtro per gruppo e sottogruppo nella SecondaryNav
- [x] Home redirect automatico al mount
- [x] Reset filtri al cambio pagina (watch su `route.params.id`)
- [x] `WidgetTile` con icone tipo-widget, stato ON/OFF, effetto glow
- [x] `buildLayoutPayload` con struttura annidata completa
- [x] Indicatore di connessione in `PrimaryNav` (dot verde/arancio/rosso legato a `connection.js`)
- [x] Fix ordine route: `/api/*` prima del catch-all SPA (bug critico, vedi sopra)
- [x] Persistenza stato widget + scene via Node-RED context (`node.context()`), sopravvive al restart se `contextStorage` è file-backed in `settings.js`
- [x] `ui-pap-button` — tile momentanea, output `true` al click
- [x] `ui-pap-slider` — range slider scrivibile (drag → `{ value }`)
- [x] `ui-pap-light` — on/off + slider brightness inline (`hasColor` pass-through, nessun color wheel)
- [x] `ui-pap-thermostat` — temperatura corrente + stepper setpoint + pill modalità ciclabile
- [x] `ui-pap-scene` — tile trigger scena, output `{ payload:true, topic:<nome scena> }`
- [x] Mobile bottom navigation (`MobileNav.vue`, visibile sotto 768px)
- [x] Smoke test manuale: `node-red` headless + flow con tutti i tipi di widget + verifica `/api/layout`, `/api/state`, `/api/scenes`
- [x] PWA installabile: manifest + service worker (`vite-plugin-pwa`), icone generate da `ui/public/pap-logo.svg`, file servite da `ui-pap-server.js` via `express.static(distPath)` prima del catch-all SPA
- [x] `ui-pap-auth` — nodo di config multi-utente (max 10, bcrypt), referenziabile da `ui-pap-server.auth`
- [x] Sessione/login (`express-session`, cookie) + guardia su route `/api/*`/catch-all + Socket.IO (`io.engine.use` + `io.use`), opt-in e retrocompatibile (nessun `auth` configurato = comportamento pubblico identico a prima)
- [x] `ui-pap-tunnel` — nodo di config per tunnel ngrok (static domain gratuito), con warning se l'editor Node-RED non è protetto da `adminAuth`
