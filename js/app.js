// ---- Configuration -------------------------------------------------
const CATEGORIES = [
    { id: "preferences", name: "Mes préférences", file: "data/json/Preferences.json", icon: ICONS.heart, accent: "#b3265e" },
    { id: "donner", name: "Donner", file: "data/json/Donner.json", icon: ICONS.gift, accent: "#e0643f" },
    { id: "recevoir", name: "Recevoir", file: "data/json/Recevoir.json", icon: ICONS.box, accent: "#3d7fd1" },
    { id: "sentir", name: "Me sentir", file: "data/json/MeSentir.json", icon: ICONS.feather, accent: "#7b5cc4" },
    { id: "faire-ressentir", name: "Faire ressentir", file: "data/json/FaireRessentir.json", icon: ICONS.bolt, accent: "#1f9d8a" }
    // Pour une image à la place de l'icône : ajoute  image: "img/mon-image.png"  à la catégorie
];
const ANSWERS = [
    { label: "Pas renseigné", hex: "#9a9097", color: "var(--c0)" },
    { label: "Kink absolu", hex: "#b3265e", color: "var(--c1)" },
    { label: "J’aime bien", hex: "#e0643f", color: "var(--c2)" },
    { label: "Ok", hex: "#e5a93a", color: "var(--c3)" },
    { label: "Peut-être", hex: "#5b8fd6", color: "var(--c4)" },
    { label: "Non", hex: "#4b4350", color: "var(--c5)" }
];
const STORAGE_KEY = "questionnaires-reponses-v2";

// ---- État ----------------------------------------------------------
const app = document.getElementById("app");
const questions = {};   // id -> tableau de textes (ou null si échec de chargement)
let answers = {};       // id -> tableau d'index de réponses
try { answers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { answers = {}; }
const PSEUDO_KEY = "questionnaires-pseudo";
let pseudo = "";
try { pseudo = localStorage.getItem(PSEUDO_KEY) || ""; } catch (e) { }
const setPseudo = v => { pseudo = v.trim().slice(0, 30); try { localStorage.setItem(PSEUDO_KEY, pseudo); } catch (e) { } };
const slug = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const pseudoField = () => `<div class="pseudo-field">
  <label for="pseudo" class="form-label fw-semibold mb-1">Ton prénom ou pseudo <span class="small fw-normal text-body-secondary">(optionnel, utilisé dans l’export)</span></label>
  <input id="pseudo" class="form-control" type="text" maxlength="30" autocomplete="nickname" placeholder="Ex. Léa" value="${esc(pseudo)}"></div>`;
const bindPseudo = () => { const i = document.getElementById("pseudo"); if (i) i.oninput = () => setPseudo(i.value); };
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
let lastView = "";
function setView(kind) {
    app.classList.toggle("narrow", kind !== "home");
    if (kind !== lastView) { window.scrollTo(0, 0); lastView = kind; }
}

function catCard(c) {
    const data = questions[c.id], n = data ? data.items.length : 0;
    const done = data ? (answers[c.id] || []).filter(v => v !== undefined && v !== null).length : 0;
    const pct = n ? Math.round(done / n * 100) : 0;
    const status = !data ? "Fichier introuvable" : (n && done >= n) ? "Terminé ✓" : done ? `${done}/${n} · Continuer →` : "Commencer →";
    const media = c.image ? `<img class="cat-img" src="${esc(c.image)}" alt="">` : c.icon;
    return `<div class="col"><button type="button" class="card cat-card h-100 w-100" style="--cat:${c.accent}" data-id="${c.id}"${data ? "" : " disabled"}>
    <span class="card-body d-flex flex-row flex-lg-column align-items-center gap-3 text-start text-lg-center w-100">
      <span class="cat-icon-wrap">${media}</span>
      <span class="d-block flex-grow-1 w-100">
        <span class="d-block cat-name">${esc(c.name)}</span>
        <span class="d-block small text-body-secondary">${data ? n + " questions" : "—"}</span>
        <span class="progress cat-progress mt-2" role="progressbar" aria-label="Progression" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span class="progress-bar" style="width:${pct}%"></span></span>
        <span class="d-block small fw-semibold mt-2 cat-status">${status}</span>
      </span>
    </span></button></div>`;
}

function home() {
    setView("home");
    const failed = CATEGORIES.some(c => !questions[c.id]);
    const notice = failed ? `<div class="alert alert-warning" role="alert">Impossible de charger certains fichiers JSON.
    ${location.protocol === "file:" ? "Le site doit être lancé via un serveur (par exemple <code>python -m http.server</code> dans ce dossier) ou hébergé en ligne : un navigateur bloque la lecture des fichiers JSON en ouvrant directement index.html." : "Vérifie que le dossier <code>data/</code> est bien présent à côté de index.html."}</div>` : "";
    app.innerHTML = `<div class="text-center mb-4">
    <h1 class="display-6 fw-bold mb-1">Mes questionnaires</h1>
    <p class="text-body-secondary mb-0">Choisis une carte et réponds, une question à la fois.</p></div>
  ${notice}
  <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-5 g-3 justify-content-center mb-4">${CATEGORIES.map(catCard).join("")}</div>
  <div class="mx-auto" style="max-width:420px">${pseudoField()}</div>`;
    bindPseudo();
    app.querySelectorAll(".cat-card[data-id]:not(:disabled)").forEach(el => el.onclick = () => {
        const id = el.dataset.id, n = (answers[id] || []).length;
        quiz(id, n >= questions[id].items.length ? 0 : n);
    });
}

function quiz(id, i) {
    const cat = CATEGORIES.find(c => c.id === id), data = questions[id], items = data.items;
    if (i >= items.length) return result(id);
    setView("quiz");
    answers[id] = answers[id] || [];
    const sec = data.sections[items[i].s], pct = Math.round(i / items.length * 100);
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2">
    <button type="button" class="btn btn-link btn-sm text-body-secondary px-0" id="quit">← Accueil</button>
    <strong class="text-center">${esc(cat.name)}</strong>
    <span class="small fw-semibold accent-text">${i + 1} / ${items.length}</span></div>
  <div class="progress mb-3" style="height:6px" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${pct}%"></div></div>
  ${sec.titre ? `<div class="section mb-3"><b>${esc(sec.titre)}</b>${sec.description ? `<div class="small text-body-secondary">${esc(sec.description)}</div>` : ""}</div>` : ""}
  <div class="card shadow-sm"><div class="card-body p-3 p-md-4">
    <div class="q in" id="q">${esc(items[i].q)}</div>
    <div class="row row-cols-2 row-cols-md-3 g-2 mt-2">${ANSWERS.map((a, k) => `<div class="col"><button type="button" class="btn ans w-100" style="--col:${a.color}" data-k="${k}">${a.label}</button></div>`).join("")}</div>
  </div></div>
  <div class="mt-3">${i > 0 ? '<button type="button" class="btn btn-link btn-sm text-body-secondary px-0" id="prev">← Question précédente</button>' : ""}</div>`;
    requestAnimationFrame(() => document.getElementById("q").classList.remove("in"));
    document.getElementById("quit").onclick = home;
    const prev = document.getElementById("prev"); if (prev) prev.onclick = () => quiz(id, i - 1);
    app.querySelectorAll(".ans").forEach(b => b.onclick = () => {
        answers[id][i] = +b.dataset.k; save();
        document.getElementById("q").classList.add("out");
        setTimeout(() => quiz(id, i + 1), 200);
    });
}

// ---- Export --------------------------------------------------------
function buildExport(id) {
    const cat = CATEGORIES.find(c => c.id === id), data = questions[id], a = answers[id] || [];
    const rows = data.items.map((it, i) => ({
        section: data.sections[it.s].titre || "",
        question: it.q,
        reponse: (ANSWERS[a[i]] || ANSWERS[0]).label
    }));
    const repartition = {};
    ANSWERS.forEach(x => {
        const n = rows.filter(r => r.reponse === x.label).length;
        repartition[x.label] = { nombre: n, pourcentage: rows.length ? Math.round(n / rows.length * 100) : 0 };
    });
    return { pseudo, questionnaire: cat.name, date: new Date().toISOString().slice(0, 10), repartition, resultats: rows };
}
function download(filename, mime, content) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- Rendu du rapport sur canvas (pour l'image et le PDF) -----------
const REPORT = { W: 1000, H: 1414, M: 48, FONT: 'system-ui,-apple-system,"Segoe UI",Arial,sans-serif' };

function layoutReport(exp, paged) {
    const { W, H, M, FONT } = REPORT;
    const groups = [];
    exp.resultats.forEach(r => {
        let g = groups.find(x => x.titre === r.section);
        if (!g) { g = { titre: r.section, rows: [] }; groups.push(g); }
        g.rows.push(r);
    });
    const multi = groups.length > 1;
    const [yy, mm, dd] = exp.date.split("-");

    function run(pageH) {
        const pages = []; let cv, c, y;
        const newPage = () => {
            cv = document.createElement("canvas"); cv.width = W; cv.height = pageH;
            c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, W, pageH);
            c.textBaseline = "middle"; pages.push(cv); y = M;
        };
        const need = h => { if (paged && y + h > pageH - M) newPage(); };
        const txt = (t, x, ty, size, weight, color, align) => {
            c.font = `${weight} ${size}px ${FONT}`; c.fillStyle = color; c.textAlign = align || "left"; c.fillText(t, x, ty);
        };
        const fit = (t, maxW, size, weight) => {
            c.font = `${weight} ${size}px ${FONT}`;
            if (c.measureText(t).width <= maxW) return t;
            while (t.length > 1 && c.measureText(t + "…").width > maxW) t = t.slice(0, -1);
            return t + "…";
        };
        const rrect = (x, ry, w, h, r, color) => {
            c.fillStyle = color; c.beginPath();
            c.moveTo(x + r, ry); c.lineTo(x + w - r, ry); c.arcTo(x + w, ry, x + w, ry + r, r);
            c.lineTo(x + w, ry + h - r); c.arcTo(x + w, ry + h, x + w - r, ry + h, r);
            c.lineTo(x + r, ry + h); c.arcTo(x, ry + h, x, ry + h - r, r);
            c.lineTo(x, ry + r); c.arcTo(x, ry, x + r, ry, r); c.closePath(); c.fill();
        };
        const chart = rows => {
            ANSWERS.forEach(x => {
                const n = rows.filter(r => r.reponse === x.label).length, p = rows.length ? Math.round(n / rows.length * 100) : 0;
                txt(x.label, M, y + 14, 18, "400", "#231a1f");
                rrect(M + 190, y + 4, 540, 20, 10, "#eee4e8");
                if (p > 0) rrect(M + 190, y + 4, Math.max(20, 540 * p / 100), 20, 10, x.hex);
                txt(`${p}% (${n})`, W - M, y + 14, 17, "400", "#7a6a72", "right");
                y += 30;
            });
        };

        newPage();
        txt(fit(exp.pseudo ? `Les résultats de ${exp.pseudo}` : "Mes résultats", W - 2 * M, 36, "700"), M, y + 18, 36, "700", "#231a1f"); y += 44;
        txt(`${exp.questionnaire} — ${dd}/${mm}/${yy}`, M, y + 10, 20, "400", "#7a6a72"); y += 46;
        txt(multi ? "Répartition globale" : "Répartition des réponses", M, y + 12, 24, "700", "#b3265e"); y += 40;
        chart(exp.resultats); y += 22;

        groups.forEach(g => {
            need(50 + (multi ? 190 : 0) + 72);
            if (g.titre) { txt(g.titre, M, y + 14, 24, "700", "#b3265e"); y += 44; }
            if (multi) { chart(g.rows); y += 10; }
            g.rows.forEach(r => {
                need(38);
                const x = ANSWERS.find(a => a.label === r.reponse) || ANSWERS[0];
                c.font = `700 16px ${FONT}`;
                const cw = c.measureText(x.label).width + 28;
                txt(fit(r.question, W - 2 * M - cw - 20, 20, "400"), M, y + 18, 20, "400", "#231a1f");
                rrect(W - M - cw, y + 5, cw, 26, 13, x.hex);
                txt(x.label, W - M - cw / 2, y + 19, 16, "700", "#fff", "center");
                c.fillStyle = "#eee4e8"; c.fillRect(M, y + 36, W - 2 * M, 1);
                y += 38;
            });
            y += 22;
        });
        return { pages, end: y + M };
    }
    if (paged) return run(H).pages;
    return run(Math.ceil(run(2000).end)).pages; // 1re passe : mesure, 2e passe : dessin
}

// PDF minimal : une image JPEG par page A4, sans bibliothèque externe
function makePDF(pages) {
    const enc = new TextEncoder(), chunks = [], offsets = []; let off = 0;
    const push = b => { const u = typeof b === "string" ? enc.encode(b) : b; chunks.push(u); off += u.length; };
    const obj = (n, fn) => { offsets[n] = off; push(`${n} 0 obj\n`); fn(); push("\nendobj\n"); };
    const N = pages.length, total = 2 + 3 * N;
    push("%PDF-1.4\n");
    obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
    obj(2, () => push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + 3 * i} 0 R`).join(" ")}] /Count ${N} >>`));
    pages.forEach((pg, i) => {
        const pid = 3 + 3 * i, cid = pid + 1, iid = pid + 2;
        const bin = atob(pg.toDataURL("image/jpeg", 0.92).split(",")[1]);
        const data = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) data[k] = bin.charCodeAt(k);
        const content = "q 595.28 0 0 841.89 0 0 cm /Im0 Do Q";
        obj(pid, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${iid} 0 R >> >> /Contents ${cid} 0 R >>`));
        obj(cid, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
        obj(iid, () => { push(`<< /Type /XObject /Subtype /Image /Width ${pg.width} /Height ${pg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${data.length} >>\nstream\n`); push(data); push("\nendstream"); });
    });
    const xref = off;
    push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`);
    for (let n = 1; n <= total; n++) push(String(offsets[n]).padStart(10, "0") + " 00000 n \n");
    push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(chunks, { type: "application/pdf" });
}

function chart(a, idxs) {
    const total = idxs.length;
    return ANSWERS.map((x, k) => {
        const n = idxs.filter(i => (a[i] === undefined ? 0 : a[i]) === k).length;
        const p = total ? Math.round(n / total * 100) : 0;
        return `<div class="bar-row" style="--col:${x.color}"><span class="lab">${x.label}</span><span class="track"><i style="width:${p}%"></i></span><span class="pct">${p}% (${n})</span></div>`;
    }).join("");
}

function result(id) {
    setView("result");
    const cat = CATEGORIES.find(c => c.id === id), data = questions[id], a = answers[id] || [];
    const all = data.items.map((_, i) => i);
    const multi = data.sections.length > 1;
    const blocks = data.sections.map((sec, si) => {
        const idxs = all.filter(i => data.items[i].s === si);
        return `<div class="card shadow-sm mb-3"><div class="card-body">
      ${sec.titre ? `<h2 class="h6 fw-bold accent-text mb-3">${esc(sec.titre)}</h2>` : ""}
      ${multi ? chart(a, idxs) : ""}
      <div class="${multi ? "mt-2" : ""}">${idxs.map(i => {
            const x = ANSWERS[a[i]] || ANSWERS[0];
            return `<div class="item"><span>${esc(data.items[i].q)}</span><span class="chip" style="--col:${x.color}">${x.label}</span></div>`;
        }).join("")}</div></div></div>`;
    }).join("");
    app.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2">
    <button type="button" class="btn btn-link btn-sm text-body-secondary px-0" id="quit">← Accueil</button>
    <strong>${esc(cat.name)}</strong><span></span></div>
  <h1 class="h3 fw-bold mb-3">Ton compte rendu</h1>
  <div class="card shadow-sm mb-3"><div class="card-body"><h2 class="h6 fw-bold accent-text mb-3">${multi ? "Répartition globale" : "Répartition des réponses"}</h2>${chart(a, all)}</div></div>
  ${blocks}
  <div class="card shadow-sm export"><div class="card-body">
    <h2 class="h6 fw-bold mb-1">Exporter mes résultats</h2>
    <p class="small text-body-secondary mb-3">Tes réponses restent sur ton appareil : rien n’est envoyé en ligne.</p>
    ${pseudoField()}
    <div class="d-grid d-sm-flex gap-2 mt-3"><button type="button" class="btn btn-primary" id="exp-pdf">PDF</button><button type="button" class="btn btn-outline-secondary" id="exp-img">Image (PNG)</button><button type="button" class="btn btn-outline-secondary" id="exp-json">JSON</button></div>
  </div></div>
  <div class="d-grid d-sm-flex gap-2 mt-4"><button type="button" class="btn btn-primary" id="redo">Recommencer</button><button type="button" class="btn btn-outline-secondary" id="home2">Autres questionnaires</button></div>`;
    document.getElementById("quit").onclick = home;
    document.getElementById("home2").onclick = home;
    bindPseudo();
    const fname = ext => `resultats${pseudo && slug(pseudo) ? "-" + slug(pseudo) : ""}-${id}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.getElementById("exp-json").onclick = () => download(fname("json"), "application/json", JSON.stringify(buildExport(id), null, 2));
    const busy = (btn, fn) => {
        const t = btn.textContent; btn.disabled = true; btn.textContent = "Création…";
        setTimeout(() => { try { fn(); } finally { btn.disabled = false; btn.textContent = t; } }, 30);
    };
    document.getElementById("exp-pdf").onclick = e => busy(e.target, () => download(fname("pdf"), "application/pdf", makePDF(layoutReport(buildExport(id), true))));
    document.getElementById("exp-img").onclick = e => busy(e.target, () => layoutReport(buildExport(id), false)[0].toBlob(b => download(fname("png"), "image/png", b), "image/png"));
    document.getElementById("redo").onclick = () => { answers[id] = []; save(); quiz(id, 0); };
}

// ---- Démarrage -----------------------------------------------------
loadAll().then(home);
