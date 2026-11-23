// ---- Configuration -------------------------------------------------
const CATEGORIES = [
    { id: "preferences", name: "Mes préférences", file: "data/json/Preferences.json" },
    { id: "donner", name: "Donner", file: "data/json/Donner.json" },
    { id: "recevoir", name: "Recevoir", file: "data/json/Recevoir.json" },
    { id: "sentir", name: "Me sentir", file: "data/json/MeSentir.json" },
    { id: "faire-ressentir", name: "Faire ressentir", file: "data/json/FaireRessentir.json" }
];
const ANSWERS = [
    { label: "Pas renseigné", color: "var(--c0)" },
    { label: "Kink absolu", color: "var(--c1)" },
    { label: "J’aime bien", color: "var(--c2)" },
    { label: "Ok", color: "var(--c3)" },
    { label: "Peut-être", color: "var(--c4)" },
    { label: "Non", color: "var(--c5)" }
];
const STORAGE_KEY = "questionnaires-reponses-v1.1";

// ---- État ----------------------------------------------------------
const app = document.getElementById("app");
const questions = {};   // id -> tableau de textes (ou null si échec de chargement)
let answers = {};       // id -> tableau d'index de réponses
try { answers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { answers = {}; }
const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(answers)); } catch (e) { } };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Formats acceptés :
//  { "titre": "...", "sections": [ { "titre", "description", "questions": [...] }, ... ] }
//  { "titre", "description", "questions": [...] }   ou simplement   [ "q1", "q2" ]
const toText = x => typeof x === "string" ? x : (x.question || x.text || x.label || x.titre || x.q || JSON.stringify(x));
function normalize(json) {
    let raw = [];
    if (json && Array.isArray(json.sections)) raw = json.sections;
    else if (Array.isArray(json)) raw = [{ questions: json }];
    else if (json && Array.isArray(json.questions)) raw = [{ titre: "", description: json.description || "", questions: json.questions }];
    const sections = raw.map(s => ({ titre: s.titre || "", description: s.description || "", questions: (s.questions || []).map(toText) }));
    const items = [];
    sections.forEach((s, si) => s.questions.forEach(q => items.push({ q, s: si })));
    return { sections, items };
}

async function loadAll() {
    await Promise.all(CATEGORIES.map(async c => {
        try {
            const r = await fetch(c.file);
            if (!r.ok) throw new Error(r.status);
            questions[c.id] = normalize(await r.json());
        } catch (e) { questions[c.id] = null; }
    }));
}

// ---- Vues ----------------------------------------------------------
function home() {
    const failed = CATEGORIES.some(c => questions[c.id] === null);
    const notice = failed ? `<div class="notice">Impossible de charger certains fichiers JSON.
    ${location.protocol === "file:" ? "Le site doit être lancé via un serveur (par exemple <code>python -m http.server</code> dans ce dossier) ou hébergé en ligne : un navigateur bloque la lecture des fichiers JSON en ouvrant directement index.html." : "Vérifie que le dossier <code>data/</code> est bien présent à côté de index.html."}</div>` : "";
    app.innerHTML = `<h1>Mes questionnaires</h1><p class="sub">Choisis une carte et réponds, une question à la fois.</p>${notice}
  <div class="grid">${CATEGORIES.map(c => {
        const qs = questions[c.id] && questions[c.id].items;
        if (!questions[c.id]) return `<div class="card home-card disabled"><div><h2>${esc(c.name)}</h2><small>Fichier introuvable</small></div></div>`;
        const done = (answers[c.id] || []).filter(v => v !== undefined && v !== null).length;
        const badge = done >= qs.length && qs.length ? "Terminé ✓" : done ? `${done}/${qs.length}` : "Commencer →";
        return `<div class="card home-card" data-id="${c.id}"><div><h2>${esc(c.name)}</h2><small>${qs.length} questions</small></div><span class="badge">${badge}</span></div>`;
    }).join("")}</div>`;
    app.querySelectorAll(".home-card[data-id]").forEach(el => el.onclick = () => {
        const id = el.dataset.id, n = (answers[id] || []).length;
        quiz(id, n >= questions[id].items.length ? 0 : n);
    });
}

function quiz(id, i) {
    const cat = CATEGORIES.find(c => c.id === id), data = questions[id], items = data.items;
    if (i >= items.length) return result(id);
    answers[id] = answers[id] || [];
    const sec = data.sections[items[i].s];
    app.innerHTML = `<div class="top"><button class="link" id="quit">← Accueil</button><strong>${esc(cat.name)}</strong><span class="badge">${i + 1} / ${items.length}</span></div>
  <div class="bar"><i style="width:${i / items.length * 100}%"></i></div>
  ${sec.titre ? `<div class="section"><b>${esc(sec.titre)}</b>${sec.description ? `<br><small>${esc(sec.description)}</small>` : ""}</div>` : ""}
  <div class="card"><div class="q in" id="q">${esc(items[i].q)}</div>
  <div class="answers">${ANSWERS.map((a, k) => `<button class="ans" style="--col:${a.color}" data-k="${k}">${a.label}</button>`).join("")}</div></div>
  <div class="actions">${i > 0 ? '<button class="link" id="prev">← Question précédente</button>' : ""}</div>`;
    requestAnimationFrame(() => document.getElementById("q").classList.remove("in"));
    document.getElementById("quit").onclick = home;
    const prev = document.getElementById("prev"); if (prev) prev.onclick = () => quiz(id, i - 1);
    app.querySelectorAll(".ans").forEach(b => b.onclick = () => {
        answers[id][i] = +b.dataset.k; save();
        document.getElementById("q").classList.add("out");
        setTimeout(() => quiz(id, i + 1), 200);
    });
}

function chart(a, idxs) {
    const total = idxs.length;
    return ANSWERS.map((x, k) => {
        const n = idxs.filter(i => (a[i] === undefined ? 0 : a[i]) === k).length;
        const p = total ? Math.round(n / total * 100) : 0;
        return `<div class="row" style="--col:${x.color}"><span class="lab">${x.label}</span><span class="track"><i style="width:${p}%"></i></span><span class="pct">${p}% (${n})</span></div>`;
    }).join("");
}

function result(id) {
    const cat = CATEGORIES.find(c => c.id === id), data = questions[id], a = answers[id] || [];
    const all = data.items.map((_, i) => i);
    const multi = data.sections.length > 1;
    const blocks = data.sections.map((sec, si) => {
        const idxs = all.filter(i => data.items[i].s === si);
        return `<div class="card" style="margin-top:12px">
      ${sec.titre ? `<h2 style="margin:0 0 10px;font-size:1.1rem">${esc(sec.titre)}</h2>` : ""}
      ${multi ? chart(a, idxs) : ""}
      <div style="margin-top:10px">${idxs.map(i => {
            const x = ANSWERS[a[i]] || ANSWERS[0];
            return `<div class="item"><span>${esc(data.items[i].q)}</span><span class="chip" style="--col:${x.color}">${x.label}</span></div>`;
        }).join("")}</div></div>`;
    }).join("");
    app.innerHTML = `<div class="top"><button class="link" id="quit">← Accueil</button><strong>${esc(cat.name)}</strong><span></span></div>
  <h1>Ton compte rendu</h1>
  <div class="card"><h2 style="margin-top:0;font-size:1.05rem">${multi ? "Répartition globale" : "Répartition des réponses"}</h2>${chart(a, all)}</div>
  ${blocks}
  <div class="actions"><button class="btn primary" id="redo">Recommencer</button><button class="btn" id="home2">Autres questionnaires</button></div>`;
    document.getElementById("quit").onclick = home;
    document.getElementById("home2").onclick = home;
    document.getElementById("redo").onclick = () => { answers[id] = []; save(); quiz(id, 0); };
}

// ---- Démarrage -----------------------------------------------------
loadAll().then(home);