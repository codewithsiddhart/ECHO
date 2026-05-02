// ============================================================
// facts.js — Useless Facts API + offline fallback
// ============================================================

const FACT_API = "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en";

const FALLBACK = [
    "A group of flamingos is called a flamboyance.",
    "Honey never spoils — 3000-year-old honey was found edible in Egyptian tombs.",
    "Octopuses have three hearts and blue blood.",
    "The shortest war in history lasted 38 minutes.",
    "A day on Venus is longer than a year on Venus.",
    "Bananas are berries. Strawberries are not.",
    "Crows can recognise and remember human faces.",
    "The Eiffel Tower grows 15cm taller in summer due to thermal expansion.",
    "Sharks are older than trees.",
    "There are more possible chess games than atoms in the observable universe.",
    "A snail can sleep for 3 years.",
    "Cleopatra lived closer to the Moon landing than to the pyramids.",
    "Wombat poop is cube-shaped.",
    "Butterflies taste with their feet.",
    "The average human body contains enough iron to make a 3-inch nail.",
];

let isFetching = false;

export async function fetchFact() {
    if (isFetching) return pick(FALLBACK);
    isFetching = true;
    try {
        const res  = await fetch(FACT_API);
        if (!res.ok) throw new Error();
        const data = await res.json();
        return data.text?.trim() || pick(FALLBACK);
    } catch { return pick(FALLBACK); }
    finally  { isFetching = false; }
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }