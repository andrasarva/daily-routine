# 🦖🚒 Napi Rutin

Játékos, képes napi rutin app kisgyerekeknek. Androidos tableten fut, Chrome-ból telepített appként (PWA). A listákat egy Google Táblázatban szerkesztheted PC-ről.

- Nagy képkártyák, felolvasás, „Kész!” gomb, járműves vagy dínós haladásjelző pálya, konfetti
- Több gyerek, mindegyik a saját avatarjával; listánként jár egy matrica, és van heti matricatábla
- Napszakos listák (Reggel, Délután, Este) és alkalmi listák (pl. Oviba indulás, Fürdés)
- Offline is működik: amit a gyerek közben elvégez, az később szinkronizálódik
- Szülői mód: a 🔒 ikont 3 másodpercig kell nyomva tartani

A részletes terv: [docs/implementation_plan.md](docs/implementation_plan.md).

## Kipróbálás

Az első indításkor válaszd a **Demó módot**. Ilyenkor beépített mintaadatokkal fut, Google-fiók nélkül, és minden csak az adott eszközön tárolódik. Gyorsabb, ha a cím végére `?demo`-t írsz.

## Beállítás Google Táblázattal

Egyszer kell megcsinálni, kb. 10 perc.

### 1. Táblázat és script

1. Hozz létre egy üres táblázatot a [sheets.new](https://sheets.new) címen, és nevezd el, pl. „Napi Rutin”.
2. Nyisd meg a **Bővítmények → Apps Script** menüt.
3. A `Code.gs` tartalmát töröld ki, és másold be helyette az [apps-script/Code.gs](apps-script/Code.gs) teljes tartalmát. Ments (💾).
4. A felső sorban válaszd ki a **`setup`** függvényt, és nyomd meg a **Futtatás** gombot.
   - Az első futtatáskor a Google engedélyt kér: **Engedélyek áttekintése** → válaszd ki a fiókodat → **Speciális** → **Ugrás a(z) … projektre (nem biztonságos)** → **Engedélyezés**. A figyelmeztetés azért jelenik meg, mert ez a saját scripted, nem a Google ellenőrizte.
   - A **Végrehajtási naplóban** megjelenik a **családi kód** (pl. `dino-k7m2xq`). Ezt jegyezd fel.
5. A táblázatban létrejött az 5 lap a mintaadatokkal.

A családi kódot később a táblázat **🦖 Napi Rutin → Családi kód megjelenítése** menüjében is megnézheted. A menü a táblázat újratöltése után jelenik meg.

### 2. Közzététel Web Appként

1. Az Apps Script szerkesztőben: **Telepítés → Új telepítés**, a fogaskeréknél válaszd a **Webes alkalmazás** típust.
2. Beállítások:
   - **Végrehajtás mint:** *Én*
   - **Hozzáférés:** *Bárki*
3. **Telepítés**, majd másold ki a **Webes alkalmazás URL-jét**. Ez `https://script.google.com/macros/s/…/exec` formájú.

A „Bárki” beállítás azért kell, hogy a tablet bejelentkezés nélkül elérje. Az adatokat a családi kód védi, ezért az URL-t és a kódot ne oszd meg mással. Ha mégis kikerülne, a **🦖 Napi Rutin → Új családi kód** menüvel cserélheted.

### 3. Tablet

1. Nyisd meg az appot Chrome-ban (`https://andrasarva.github.io/daily-routine/`, lásd lent), és válaszd a **Google táblázat** lehetőséget.
2. Add meg a Web App URL-jét és a családi kódot, majd nyomd meg a **Kapcsolódás** gombot.
3. Chrome menü (⋮) → **Hozzáadás a kezdőképernyőhöz / Alkalmazás telepítése**. Így teljes képernyőn fut.

### Ha módosul a `Code.gs`

Az Apps Scriptben: **Telepítés → Telepítések kezelése** → ✏️ → **Verzió: Új verzió** → **Telepítés**. Így az URL nem változik. Ha *új* telepítést hozol létre, új URL-t kapsz, és azt a tableten is újra meg kell adni.

## Az app kirakása

### GitHub Pages (ajánlott)

Minden `main` ágra küldött push után a [GitHub Actions](.github/workflows/deploy.yml) lefuttatja a teszteket, lefordítja és kirakja az appot ide: `https://andrasarva.github.io/daily-routine/`. HTTPS-en fut, ezért a tableten telepíthető, és offline is működik.

Egyszeri beállítás: a repóban **Settings → Pages → Build and deployment → Source: GitHub Actions**. Ingyenes GitHub-fióknál a Pages csak publikus repóval működik. A repóban nincs titkos adat: az Apps Script URL-je és a családi kód csak a tableten tárolódik.

A telepítés állapota a repó **Actions** fülén látszik, kézzel is indítható onnan (**Run workflow**).

### Helyi IIS

`C:\inetpub\wwwroot\DailyRoutine` alá a Claude Code `/deploy` skillje rakja ki ([.claude/skills/deploy](.claude/skills/deploy/SKILL.md)). Sima `http://`-n, más gépről (pl. a tabletről) megnyitva a Chrome nem engedi a telepítést és az offline módot.

## A táblázat felépítése

A szöveges mezőkben a kis- és nagybetű, valamint az ékezet nem számít. Az `aktiv` oszlop üresen „igen”-t jelent.

**Gyerekek:** `id`, `nev`, `avatar` (emoji vagy kép link), `tema` (`auto` / `jarmu` / `dino`), `sorrend`, `aktiv`

**Listak:** `id`, `nev`, `tipus` (`napszak` / `alkalmi`), `kezdes`, `vege` (pl. `06:00`; csak napszaknál), `napok`, `kinek`, `ikon`, `tema` (üres = a gyereké), `sorrend`, `aktiv`

**Feladatok:** `id`, `lista_id`, `sorrend`, `cim`, `kep`, `emoji`, `napok`, `kinek`, `felolvasas`, `hang`, `aktiv`

- `napok`: `minden`, `hétköznap`, `hétvége`, vagy felsorolás, pl. `H,Sze,P` (H, K, Sze, Cs, P, Szo, V)
- `kinek`: gyerek id-k vagy nevek vesszővel elválasztva; üresen mindenkinek szól
- `kep`: Google Drive link (a fájlt meg kell osztani: *Bárki, aki rendelkezik a linkkel*), bármilyen kép URL, vagy üresen marad, és akkor az `emoji` jelenik meg
- `felolvasas`: ezt mondja a gépi hang (ha üres, a `cim`-et); `hang`: saját hangfájl linkje (Drive is lehet), ez felülírja a gépi hangot

**Elvegzett:** ezt az app írja (`datum`, `gyerek_id`, `lista_id`, `feladat_id`, `idopont`). Ha innen törölsz egy sort, azzal visszavonod a feladatot.

**Beallitasok:** `kulcs` / `ertek` párok:
- `nap_kezdete`: hány órakor kezdődik az új nap (alapból `4`, vagyis hajnali 4-ig még az előző naphoz tartozik minden)
- `hangeffektek`: `igen` / `nem`
- `felolvasas_sebesseg`: pl. `0.9`

A táblázat módosításai a tableten akkor jelennek meg, amikor az app újra előtérbe kerül, és a legutóbbi frissítés óta eltelt legalább 5 perc, vagy amikor szülői módban a **🔄 Frissítés** gombot nyomod.

## Fejlesztés

```bash
npm install
npm run dev        # fejlesztői szerver (a hálózaton is elérhető, pl. tabletről)
npm run build      # éles build a dist/ mappába
npm test           # az Apps Script backend tesztjei, mockolt táblázattal
npm run mock:gas   # helyi „Apps Script” szerver: http://localhost:8787/exec
```

Felépítés: `src/logic.js` (tiszta üzleti logika), `src/store.js` (adatréteg, offline sor, Apps Script kliens), `src/views/` (képernyők), `apps-script/Code.gs` (backend).
