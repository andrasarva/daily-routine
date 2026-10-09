// Minta adatok – a Demó módhoz. Ugyanezek kerülnek a Google táblázatba is
// az Apps Script `setup()` függvényével (apps-script/Code.gs).

export const sampleData = {
  gyerekek: [
    { id: 'bandika', nev: 'Bandika', avatar: '👑', tema: 'auto', sorrend: 1, aktiv: 'igen' },
    { id: 'anya', nev: 'Anya', avatar: '🪳', tema: 'dino', sorrend: 2, aktiv: 'igen' },
  ],
  listak: [
    { id: 'reggel', nev: 'Reggel', tipus: 'napszak', kezdes: '04:00', vege: '11:00', napok: 'minden', kinek: '', ikon: '🌞', tema: '', sorrend: 1, aktiv: 'igen' },
    { id: 'delutan', nev: 'Délután', tipus: 'napszak', kezdes: '11:00', vege: '17:30', napok: 'minden', kinek: '', ikon: '🍎', tema: '', sorrend: 2, aktiv: 'igen' },
    { id: 'este', nev: 'Este', tipus: 'napszak', kezdes: '17:30', vege: '04:00', napok: 'minden', kinek: '', ikon: '🌙', tema: '', sorrend: 3, aktiv: 'igen' },
    { id: 'ovi', nev: 'Oviba indulás', tipus: 'alkalmi', kezdes: '', vege: '', napok: 'hétköznap', kinek: '', ikon: '🎒', tema: 'jarmu', sorrend: 10, aktiv: 'igen' },
    { id: 'furdes', nev: 'Fürdés', tipus: 'alkalmi', kezdes: '', vege: '', napok: 'minden', kinek: '', ikon: '🛁', tema: '', sorrend: 11, aktiv: 'igen' },
  ],
  feladatok: [
    { id: 'r1', lista_id: 'reggel', sorrend: 1, cim: 'Pisilés', kep: '', emoji: '🚽', napok: 'minden', kinek: '', felolvasas: 'Először pisiljünk!', hang: '', aktiv: 'igen' },
    { id: 'r2', lista_id: 'reggel', sorrend: 2, cim: 'Kézmosás', kep: '', emoji: '🧼', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'r3', lista_id: 'reggel', sorrend: 3, cim: 'Reggeli', kep: '', emoji: '🥣', napok: 'minden', kinek: '', felolvasas: 'Jó étvágyat a reggelihez!', hang: '', aktiv: 'igen' },
    { id: 'r4', lista_id: 'reggel', sorrend: 4, cim: 'Fogmosás', kep: '', emoji: '🪥', napok: 'minden', kinek: '', felolvasas: 'Most mossunk fogat!', hang: '', aktiv: 'igen' },
    { id: 'r5', lista_id: 'reggel', sorrend: 5, cim: 'Öltözés', kep: '', emoji: '👕', napok: 'minden', kinek: '', felolvasas: 'Öltözzünk fel!', hang: '', aktiv: 'igen' },

    { id: 'd1', lista_id: 'delutan', sorrend: 1, cim: 'Ebéd', kep: '', emoji: '🍽️', napok: 'hétvége', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'd2', lista_id: 'delutan', sorrend: 2, cim: 'Csendes pihenő', kep: '', emoji: '😴', napok: 'hétvége', kinek: 'bandika', felolvasas: 'Egy kis pihenő jön.', hang: '', aktiv: 'igen' },
    { id: 'd3', lista_id: 'delutan', sorrend: 3, cim: 'Uzsonna', kep: '', emoji: '🍎', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'd4', lista_id: 'delutan', sorrend: 4, cim: 'Játékok elpakolása', kep: '', emoji: '🧸', napok: 'minden', kinek: '', felolvasas: 'Pakoljuk el a játékokat!', hang: '', aktiv: 'igen' },

    { id: 'e1', lista_id: 'este', sorrend: 1, cim: 'Vacsora', kep: '', emoji: '🍝', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'e2', lista_id: 'este', sorrend: 2, cim: 'Pizsama', kep: '', emoji: '🩳', napok: 'minden', kinek: '', felolvasas: 'Vegyük fel a pizsamát!', hang: '', aktiv: 'igen' },
    { id: 'e3', lista_id: 'este', sorrend: 3, cim: 'Fogmosás', kep: '', emoji: '🪥', napok: 'minden', kinek: '', felolvasas: 'Esti fogmosás!', hang: '', aktiv: 'igen' },
    { id: 'e4', lista_id: 'este', sorrend: 4, cim: 'Mese', kep: '', emoji: '📖', napok: 'minden', kinek: '', felolvasas: 'Mesét olvasunk!', hang: '', aktiv: 'igen' },
    { id: 'e5', lista_id: 'este', sorrend: 5, cim: 'Puszi, alvás', kep: '', emoji: '😘', napok: 'minden', kinek: '', felolvasas: 'Puszi, és jó éjszakát!', hang: '', aktiv: 'igen' },

    { id: 'o1', lista_id: 'ovi', sorrend: 1, cim: 'Cipő', kep: '', emoji: '👟', napok: 'minden', kinek: '', felolvasas: 'Vegyük fel a cipőt!', hang: '', aktiv: 'igen' },
    { id: 'o2', lista_id: 'ovi', sorrend: 2, cim: 'Kabát', kep: '', emoji: '🧥', napok: 'minden', kinek: '', felolvasas: 'Jöhet a kabát!', hang: '', aktiv: 'igen' },
    { id: 'o3', lista_id: 'ovi', sorrend: 3, cim: 'Táska', kep: '', emoji: '🎒', napok: 'minden', kinek: '', felolvasas: 'Hol a táska?', hang: '', aktiv: 'igen' },
    { id: 'o4', lista_id: 'ovi', sorrend: 4, cim: 'Indulás!', kep: '', emoji: '🚗', napok: 'minden', kinek: '', felolvasas: 'Indulunk az oviba!', hang: '', aktiv: 'igen' },

    { id: 'f1', lista_id: 'furdes', sorrend: 1, cim: 'Vetkőzés', kep: '', emoji: '🧦', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'f2', lista_id: 'furdes', sorrend: 2, cim: 'Be a kádba', kep: '', emoji: '🛁', napok: 'minden', kinek: '', felolvasas: 'Csobbanás a kádba!', hang: '', aktiv: 'igen' },
    { id: 'f3', lista_id: 'furdes', sorrend: 3, cim: 'Hajmosás', kep: '', emoji: '🧴', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
    { id: 'f4', lista_id: 'furdes', sorrend: 4, cim: 'Törölközés', kep: '', emoji: '🧺', napok: 'minden', kinek: '', felolvasas: '', hang: '', aktiv: 'igen' },
  ],
  beallitasok: {
    nap_kezdete: '4',
    hangeffektek: 'igen',
    felolvasas_sebesseg: '0.9',
  },
};
