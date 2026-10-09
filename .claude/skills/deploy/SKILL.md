---
name: deploy
description: Napi Rutin telepítése a helyi IIS alá (C:\inetpub\wwwroot\DailyRoutine) – lefordítja az appot, a célmappában mindent töröl, majd bemásolja a dist tartalmát. Akkor használd, ha a felhasználó deployt, telepítést, kirakást vagy "másold ki az IIS-be" jellegű dolgot kér.
---

# Deploy IIS alá

A teljes folyamatot a `deploy.ps1` szkript végzi, ne lépésenként csináld kézzel:

```powershell
powershell -ExecutionPolicy Bypass -File .claude\skills\deploy\deploy.ps1
```

Más célmappa vagy cím esetén: `-Target 'D:\valami\mappa' -Url 'http://localhost/valami/'`.

## Mit csinál

1. `npm run build`. Ha ez elbukik, leáll, és a célmappához nem nyúl.
2. A célmappa **teljes tartalmát törli**: a dist előző fájljait és mindent, amit oda kézzel tettek.
3. A `dist\*` tartalmát bemásolja.
4. Összeveti a fájllistát és a fájlméreteket a dist-tel.
5. HTTP-n lekéri a `/`, a `/manifest.webmanifest` és a `/sw.js` címeket. Ha valami nem elérhető, csak figyelmeztet.

Biztonsági korlát: nem töröl a meghajtó gyökeréhez túl közeli mappát (pl. `C:\inetpub`), és olyat sem, ami a repóval átfed.

## Utána

- Jelentsd az eredményt: a fájlok számát és a HTTP-válaszokat. Ha a szkript hibával állt le, idézd a hibaüzenetet.
- A `web.config` a `public/` mappából jön, így a buildben mindig benne van. Erre azért van szükség, mert az IIS alapból 404-et ad a `.webmanifest` fájlra.
- A deploy nem commitol és nem pushol. Ha vannak commitolatlan változások, említsd meg, hogy a kirakott verzió olyat is tartalmaz, ami még nincs a gitben.
