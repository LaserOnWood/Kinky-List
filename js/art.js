// Illustrations des cartes (style tarot), dessinées en SVG.
// Chaque carte a deux versions : "rest" (au repos) et "active" (au survol).
// Pour utiliser tes propres illustrations à la place, ajoute à la catégorie dans app.js :
//   image: "img/ma-carte.png", imageHover: "img/ma-carte-survol.png"
const ART = (() => {
    const CX = 100, CY = 140;
    const rng = seed => () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    const f = n => (+n).toFixed(1);
    const spark = (x, y, r, extra = "") => `<path class="art-star" ${extra} d="M${f(x)} ${f(y - r)}Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y + r)}Q${f(x)} ${f(y)} ${f(x - r)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y - r)}Z"/>`;

    // Champ d'étoiles : mêmes positions à chaque fois ; le survol en révèle davantage
    const starItems = (() => {
        const R = rng(7), out = [];
        for (let i = 0; i < 90 && out.length < 30; i++) {
            const x = 8 + R() * 184, y = 8 + R() * 244, big = R() > .62, r = big ? 3 + R() * 3 : 1 + R() * 1.3;
            if (Math.hypot(x - CX, y - CY) < 90) continue;
            out.push(big ? spark(x, y, r) : `<circle class="art-star" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`);
        }
        return out;
    })();

    const rays = (n, r1, r2, off = 0) => Array.from({ length: n }, (_, i) => {
        const a = i / n * 2 * Math.PI + off, c = Math.cos(a), s = Math.sin(a);
        return `<line class="art-ray" x1="${f(CX + r1 * c)}" y1="${f(CY + r1 * s)}" x2="${f(CX + r2 * c)}" y2="${f(CY + r2 * s)}"/>`;
    }).join("");

    const base = a => `<circle class="art-halo" cx="100" cy="140" r="${a ? 80 : 74}" opacity="${a ? .34 : .14}"/>
    <circle class="art-ring" cx="100" cy="140" r="74"/><circle class="art-ring art-dash" cx="100" cy="140" r="82" opacity="${a ? .9 : .45}"/>`;

    // I — Mes préférences : un cœur qui s'éveille
    const HEART = "M100 188C58 156 50 120 72 104C88 93 100 104 100 118C100 104 112 93 128 104C150 120 142 156 100 188Z";
    const heart = a => a
        ? `<path class="art-c" opacity=".35" transform="translate(100 146) scale(1.28) translate(-100 -146)" d="${HEART}"/>
       ${rays(12, 88, 99)}<path class="art-cg" d="${HEART}"/>${spark(84, 124, 6)}${spark(120, 118, 3.5)}`
        : `<path class="art-g" d="${HEART}"/>${spark(84, 124, 4, 'opacity=".6"')}`;

    // II — Donner : un cadeau qui s'ouvre
    const LID = `<rect class="art-cg-soft" x="64" y="142" width="72" height="18" rx="3"/><rect class="art-gf" x="96" y="142" width="8" height="18"/>
    <path class="art-g" d="M100 142C84 118 64 128 78 140C84 146 96 144 100 142Z"/><path class="art-g" d="M100 142C116 118 136 128 122 140C116 146 104 144 100 142Z"/>`;
    const BODY = `<rect class="art-cg-soft" x="70" y="160" width="60" height="44" rx="3"/><rect class="art-gf" x="96" y="160" width="8" height="44"/>`;
    const gift = a => a
        ? `<path class="art-gf" opacity=".22" d="M72 160L128 160L158 62L42 62Z"/>${BODY}<g transform="translate(-6 -22) rotate(-14 64 160)">${LID}</g>
       ${spark(100, 100, 14)}${spark(76, 118, 5)}${spark(126, 112, 6)}${spark(108, 76, 4)}`
        : `${BODY}${LID}${spark(150, 104, 4, 'opacity=".6"')}`;

    // III — Recevoir : la coupe se remplit
    const BOWL = "M66 118H134C134 152 120 170 100 174C80 170 66 152 66 118Z";
    const STEM = `<rect class="art-gf" x="95" y="172" width="10" height="22"/><circle class="art-gf" cx="100" cy="184" r="6.5"/>
    <path class="art-cg-soft" d="M74 208C80 198 92 196 100 196C108 196 120 198 126 208Z"/>`;
    const chalice = a => a
        ? `<clipPath id="cl-chalice"><path d="${BOWL}"/></clipPath>
       <g clip-path="url(#cl-chalice)"><path class="art-c" d="M60 126Q80 116 100 126T140 126V182H60Z"/></g>
       <path class="art-g" d="${BOWL}"/>${STEM}
       <circle class="art-c" cx="60" cy="136" r="3.2"/><circle class="art-c" cx="141" cy="142" r="3"/><circle class="art-c" cx="57" cy="154" r="2.2"/>
       ${spark(100, 90, 13)}${spark(76, 104, 5)}${spark(126, 100, 6)}`
        : `<path class="art-g" d="${BOWL}"/><path class="art-g" opacity=".5" d="M76 128C76 142 84 156 96 164"/>${STEM}${spark(100, 96, 5, 'opacity=".6"')}`;

    // IV — Me sentir : une plume et ses ondes
    const VANE = "M100 76C70 96 62 150 100 200C138 150 130 96 100 76Z";
    const barbs = (() => {
        let s = ""; for (let k = 0; k < 7; k++) {
            const y = 100 + k * 14, w = Math.sin(Math.PI * (k + 1) / 8) * 28 + 3;
            s += `<path class="art-g" opacity=".55" stroke-width="1.4" d="M100 ${y + 10}L${f(100 - w)} ${y - 2}M100 ${y + 10}L${f(100 + w)} ${y - 2}"/>`;
        } return s;
    })();
    const FEATHER = `<path class="art-cg-soft" d="${VANE}"/><path class="art-g" d="M100 76V216"/>${barbs}`;
    const feather = a => a
        ? `<circle class="art-ring" cx="100" cy="140" r="38" opacity=".55"/><circle class="art-ring" cx="100" cy="140" r="52" opacity=".4"/><circle class="art-ring" cx="100" cy="140" r="66" opacity=".25"/>
       <g transform="translate(0 -6) rotate(26 100 140)"><path class="art-c" opacity=".3" transform="translate(100 140) scale(1.14) translate(-100 -140)" d="${VANE}"/>${FEATHER}</g>
       ${spark(142, 92, 7)}${spark(64, 184, 5)}${spark(150, 178, 4)}`
        : `<g transform="rotate(26 100 140)">${FEATHER}</g>${spark(146, 96, 4, 'opacity=".6"')}`;

    // V — Faire ressentir : l'éclair qui jaillit
    const BOLT = "M112 82L74 148H98L86 200L128 130H104Z";
    const bolt = a => a
        ? `<path class="art-c" opacity=".3" transform="translate(100 141) scale(1.3) translate(-100 -141)" d="${BOLT}"/>${rays(16, 88, 99, .2)}
       <path class="art-cg" d="${BOLT}"/>${spark(142, 98, 8)}${spark(60, 172, 7)}${spark(140, 174, 5)}`
        : `<path class="art-cg-soft" d="${BOLT}"/>${spark(148, 104, 4, 'opacity=".6"')}`;

    const wrap = (inner, a) => `<svg viewBox="0 0 200 260" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${base(a)}${starItems.slice(0, a ? 30 : 10).join("")}${inner}</svg>`;
    const scenes = { preferences: heart, donner: gift, recevoir: chalice, sentir: feather, "faire-ressentir": bolt };
    const out = {};
    for (const k in scenes) out[k] = { rest: wrap(scenes[k](false), false), active: wrap(scenes[k](true), true) };
    return out;
})();