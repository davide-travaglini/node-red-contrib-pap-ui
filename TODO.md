# PAP UI — Backlog

> Aggiornato: 2026-03-20

---

## 🔴 Critici (bloccanti per l'usabilità)

### Nodi Node-RED
- [ ] **`ui-pap-page` — campo `area` mancante in `.js`**
  Il campo `area` (TypedInput → config node) è nel `.html` ma va verificato che venga effettivamente passato a `registerPage()` come `pageNode.config.area`.

- [ ] **Nessuna persistenza dello stato widget**
  Quando l'utente fa un'azione (toggle switch/light), il messaggio viene inviato via socket ma nessun nodo Node-RED lo propaga all'output per aggiornare il device reale. Serve un output sul nodo widget (o un nodo `ui-pap-action` separato) che emetta il payload verso il device.

- [ ] **Socket `pap:action` non gestito lato server**
  `devicesStore.sendAction()` emette `pap:action` ma il server node non ha un handler `socket.on('pap:action', ...)` che trasformi l'evento in un messaggio Node-RED in uscita.

### Frontend
- [ ] **`LightControl.vue` — callback `close` non verificato**
  Il popup chiama `@close` ma va verificato che `LightControl` emetta effettivamente `close` in tutti i percorsi (pulsante X, fuori click, ecc.).

- [ ] **Stato iniziale widget assente**
  Al caricamento della pagina, `devicesStore.states` è vuoto finché non arriva un messaggio da Node-RED. Le tile mostrano `—` anche se il device ha uno stato. Serve un meccanismo di snapshot iniziale (`pap:state` emesso dal server al connect).

---

## 🟡 Importanti (degradano l'esperienza)

### Nodi Node-RED — mancanti
- [ ] **`ui-pap-area` non appare in `buildLayoutPayload`**
  `registerArea()` salva l'area ma `buildLayoutPayload` include solo `areas` come array — verificare che `areaId` sulle pagine corrisponda agli `id` restituiti.

- [ ] **Nodo `ui-pap-scene` / `ui-pap-script`**
  Lo store `scenes.js` esiste ma nessun nodo lato Node-RED registra scene. La funzionalità è completamente vuota.

- [ ] **`ui-pap-group` — campo `order` mancante nel `.html`**
  Verificare che tutti i config node (group, subgroup) abbiano il campo `order` configurabile dall'editor.

### Frontend — componenti mancanti
- [ ] **Indicatore di connessione** (`connection.js` store esiste ma non è visualizzato da nessuna parte)

- [ ] **Tile thermostat — mini sparkline nella tile**
  La tile 2×2 del termostato potrebbe mostrare un grafico ridotto della storia (ultimi N valori) direttamente nella card, senza aprire il popup.

- [ ] **Tile light — preview colore**
  Se la luce ha `hasColor` e uno stato colore, mostrare un cerchietto colorato nella tile.

- [ ] **`PageView.vue` — loading skeleton**
  Se il layout non è ancora caricato (prima fetch), mostrare placeholder animati invece di "Pagina non trovata".

- [ ] **`PrimaryNav` — stato di caricamento**
  Se `layoutStore.loading === true`, mostrare un indicatore nella sidebar.

- [ ] **`PrimaryNav` — icone pagina**
  Il campo `page.icon` è inviato nel payload ma PrimaryNav usa `fa fa-{icon}`. Verificare che le icone Font Awesome siano disponibili in Node-RED (lo sono, ma serve prefix corretto).

- [ ] **Popup — animazione apertura/chiusura**
  Il `WidgetPopup` appare/scompare senza transizione. Aggiungere `<Transition>` Vue.

- [ ] **`SecondaryNav` — nascondere sottogruppi se il gruppo non è selezionato**
  Attualmente i sottogruppi con >1 item sono sempre visibili. Potrebbe essere più pulito mostrarli solo quando il gruppo padre è selezionato (espansione accordion).

---

## 🟢 Miglioramenti / Nice-to-have

### UX
- [ ] **Dark/light theme toggle** — CSS vars già predisposte, basta aggiungere la classe al body e il toggle nella navbar

- [ ] **Responsive / mobile** — layout attuale è fisso. Su schermi stretti le sidebar collassano. Aggiungere breakpoint: sotto 768px → sidebar hamburger menu, body full-width.

- [ ] **`gridAutoRows` configurabile per pagina** — attualmente fisso a 130px. Potrebbe essere un campo `cellHeight` sul nodo `ui-pap-page`.

- [ ] **Drag & reorder widget** — non previsto ma sarebbe il passo naturale successivo alla grid.

- [ ] **Tooltip al hover sulla tile** — mostrare info estese (es. ultimo aggiornamento).

### Node-RED editor
- [ ] **Preview live nell'editor Node-RED** — una piccola anteprima del layout nella sidebar del nodo server (opzionale, complessità alta).

- [ ] **Validazione `schedules` JSON nel nodo thermostat** — attualmente è un campo testo libero, errori silenti.

- [ ] **Help `.html` da completare** — i file `data-help-name` di tutti i nodi sono sommari. Documentare i formati di payload attesi.

### Build & distribuzione
- [ ] **`package.json` — keywords, description, repository** da completare prima di pubblicare su npm.

- [ ] **Test di integrazione** — nessun test automatico. Almeno uno smoke test che verifichi che il server risponda a `GET /pap/api/layout`.

- [ ] **CI/CD** — nessuna pipeline GitHub Actions per build + npm publish.

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
- [x] Popup espandibile per thermostat e light (con color/dimming)
- [x] `WidgetTile` con icone tipo-widget, stato ON/OFF, effetto glow
- [x] `buildLayoutPayload` con struttura annidata completa
