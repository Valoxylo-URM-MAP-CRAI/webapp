/**
 * build-glb.js — Génération de fichiers .glb (glTF 2.0 binaire) en JavaScript pur.
 *
 * Aucune dépendance externe. Compatible ES2020 (pas de modules ESM, pas d'import).
 * Expose window.buildGLB = function buildGLB(piece, metadata) → Uint8Array
 *
 * DONNÉES D'ENTRÉE (piece) :
 *   { longueur, largeur, epaisseur, diametre, mesuresMultiples: { active, longueur, sections[] } }
 *
 * DONNÉES D'ENTRÉE (metadata) :
 *   { lotNom, essence, typePiece, longueur_mm, volumePiece_m3, orientation }
 *
 * AXLE CONVENTION : Z = longueur (mm→m), X = largeur, Y = épaisseur.
 *
 * PROFILS :
 *   rect pur  → N_RECT = 4 coins CCW (buildRectProfile), pas de rééchantillonnage
 *   circ pur  → N_CIRC = 16 points (buildCircProfile), angles θ_i = π/2 + 2πi/N (CCW)
 *   rect↔circ → N = N_CIRC ; section rect traitée via rectProfilePolar(L, H, N)
 *              : projection polaire depuis le centre aux mêmes angles θ_i que circProfile
 *              : mapping 1:1 angulaire exact → zéro croisement d'arête
 *
 * SENS CCW (anti-horaire mathématique, vu de +Z) :
 *   circProfile     : angle croissant depuis +π/2 → haut → gauche → bas → droite
 *   rectProfilePolar: mêmes θ_i, intersection du rayon avec le périmètre du rect
 *   buildRectProfile: coins 135°→25°→315°→45° (angles polaires croissants = CCW)
 */

(function () {
    'use strict';

    // ─── Constantes ─────────────────────────────────────────────────────────────
    const N_RECT = 4;   // points par profil rectangulaire (4 coins CCW)
    const N_CIRC = 16;  // points par profil circulaire

    // ─── Bloc 1 : Résolution des sections ───────────────────────────────────────

    /**
     * Résout et normalise les sections à partir du modèle pièce.
     * Retourne un tableau trié de { positionRatio, typeSection, largeur, epaisseur, diametre }.
     * Garantit au moins 2 sections (min ratio 0, max ratio 1).
     */
    function resolveSections(piece) {
        const mm = piece.mesuresMultiples;
        const longueur = parseFloat(piece.longueur) || 0;

        // Cas mesuresMultiples actives avec sections définies
        if (mm && mm.active === true && Array.isArray(mm.sections) && mm.sections.length > 0) {
            let sections = mm.sections
                .filter(s => s != null && typeof s.positionRatio === 'number')
                .map(s => ({
                    positionRatio: s.positionRatio,
                    typeSection:   (s.typeSection === 'circ') ? 'circ' : 'rect',
                    largeur:       parseFloat(s.largeur)   || 0,
                    epaisseur:     parseFloat(s.epaisseur) || 0,
                    diametre:      parseFloat(s.diametre)  || 0,
                }))
                .sort((a, b) => a.positionRatio - b.positionRatio);

            // S'assurer qu'il y a au moins 2 sections
            if (sections.length === 1) {
                sections.push({ ...sections[0], positionRatio: sections[0].positionRatio === 0 ? 1 : 0 });
                sections.sort((a, b) => a.positionRatio - b.positionRatio);
            }

            return sections;
        }

        // Cas simple : prisme à section constante
        const rawLargeur   = parseFloat(piece.largeur)   || 0;
        const rawEpaisseur = parseFloat(piece.epaisseur) || 0;
        const rawDiametre  = parseFloat(piece.diametre)  || 0;
        const typeSection  = (rawDiametre > 0 && rawLargeur === 0) ? 'circ' : 'rect';

        const section = { positionRatio: 0, typeSection, largeur: rawLargeur, epaisseur: rawEpaisseur, diametre: rawDiametre };
        return [section, { ...section, positionRatio: 1 }];
    }

    // ─── Bloc 2 : Générateurs de profil ─────────────────────────────────────────

    /**
     * Profil rectangulaire pur : 4 coins {x, y} en MÈTRES, ordre CCW vu de +Z.
     *
     * Coins dans l'ordre anti-horaire (angles polaires croissants) :
     *   [0] (-L/2, +H/2)  haut-gauche  (135°)
     *   [1] (-L/2, -H/2)  bas-gauche   (225°)
     *   [2] (+L/2, -H/2)  bas-droite   (315°)
     *   [3] (+L/2, +H/2)  haut-droite  ( 45° = 405°)
     *
     * Utilisé uniquement pour les lofts rect→rect (N=4) et les caps rect.
     * Pour les transitions mixtes rect→circ, utiliser rectProfilePolar.
     */
    function buildRectProfile(largeur_mm, epaisseur_mm) {
        const w = largeur_mm   / 2000; // demi-largeur en mètres
        const h = epaisseur_mm / 2000; // demi-épaisseur en mètres
        return [
            { x: -w, y:  h }, // 0 haut-gauche  (135°)
            { x: -w, y: -h }, // 1 bas-gauche   (225°)
            { x:  w, y: -h }, // 2 bas-droite   (315°)
            { x:  w, y:  h }, // 3 haut-droite  ( 45°)
        ];
    }

    /**
     * Profil circulaire : N_CIRC points {x, y} en MÈTRES (ordre CCW vu de +Z).
     *
     * Angle de départ canonique : +π/2 → pts[0] = (0, +R) sommet «12h».
     * La progression CCW (anti-horaire) part vers la gauche (−X) :
     *   k=0  → angle π/2   → ( 0, +R)  haut   «12h»
     *   k=4  → angle π     → (−R,  0)  gauche «9h»
     *   k=8  → angle 3π/2  → ( 0, −R)  bas    «6h»
     *   k=12 → angle 2π/0  → (+R,  0)  droite «3h»
     *
     * Cohérent avec buildRectProfile : index 0 = sommet, k↑ → sens CCW.
     */
    function buildCircProfile(diametre_mm, N) {
        const r = diametre_mm / 2000; // rayon en mètres
        const pts = [];
        for (let k = 0; k < N; k++) {
            const angle = Math.PI / 2 + (2 * Math.PI * k) / N;
            pts.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
        }
        return pts;
    }

    /**
     * Profil rectangulaire par projection polaire : N points {x, y} en MÈTRES.
     *
     * Pour chaque index i, l'angle polaire est :
     *   θ_i = π/2 + (2π * i) / N
     * identique aux angles de buildCircProfile(D) — garantit un mapping 1:1 exact.
     *
     * Point_i = intersection du rayon θ_i avec le périmètre du rectangle L×H :
     *   r(θ) = min( a / |cosθ|,  b / |sinθ| )   avec a=L/2, b=H/2
     *   cas |cosθ| ≈ 0 : r = b  (rayon vertical, frappe le bord horizontal)
     *   cas |sinθ| ≈ 0 : r = a  (rayon horizontal, frappe le bord vertical)
     *
     * Le sens de parcours est CCW (angles croissants) : identique à circProfile.
     * Utilisé uniquement pour les lofts mixtes rect↔circ (N = N_CIRC = 16).
     */
    function rectProfilePolar(largeur_mm, epaisseur_mm, N) {
        const a = largeur_mm   / 2000; // demi-largeur en mètres
        const b = epaisseur_mm / 2000; // demi-épaisseur en mètres
        const pts = [];
        for (let i = 0; i < N; i++) {
            const theta = Math.PI / 2 + (2 * Math.PI * i) / N;
            const cosT  = Math.cos(theta);
            const sinT  = Math.sin(theta);
            let r;
            if (Math.abs(cosT) < 1e-9) {
                r = b; // rayon vertical pur : sin = ±1
            } else if (Math.abs(sinT) < 1e-9) {
                r = a; // rayon horizontal pur : cos = ±1
            } else {
                r = Math.min(a / Math.abs(cosT), b / Math.abs(sinT));
            }
            pts.push({ x: r * cosT, y: r * sinT });
        }
        return pts;
    }

    /**
     * Profil rectangulaire polaire avec snapping des 4 coins exacts.
     * Identique à rectProfilePolar mais les 4 indices les plus proches des angles
     * de coin sont forcés aux coordonnées exactes du rectangle → les coins ne sont
     * plus écrêtés sur les faces latérales du loft mixte rect↔circ.
     */
    function rectProfilePolarSnapped(largeur_mm, epaisseur_mm, N) {
        const a = largeur_mm   / 2000;
        const b = epaisseur_mm / 2000;
        const pts = rectProfilePolar(largeur_mm, epaisseur_mm, N).slice();
        const base = Math.PI / 2;
        // Angles polaires et coordonnées exactes des 4 coins (ordre CCW)
        const cornerDefs = [
            { angle: Math.atan2( b, -a), pt: { x: -a, y:  b } }, // haut-gauche (~135°)
            { angle: Math.atan2(-b, -a), pt: { x: -a, y: -b } }, // bas-gauche  (~225°)
            { angle: Math.atan2(-b,  a), pt: { x:  a, y: -b } }, // bas-droite  (~315°)
            { angle: Math.atan2( b,  a), pt: { x:  a, y:  b } }, // haut-droite (~45°)
        ];
        const snapped = new Set();
        for (const { angle, pt } of cornerDefs) {
            let ca = angle;
            while (ca < base)                ca += 2 * Math.PI;
            while (ca >= base + 2 * Math.PI) ca -= 2 * Math.PI;
            const k = Math.round((ca - base) / (2 * Math.PI / N)) % N;
            if (!snapped.has(k)) { pts[k] = pt; snapped.add(k); }
        }
        return pts;
    }

    // rectProfilePolar place les points aux angles θ_i = π/2 + 2πi/N,
    // identiques au cercle. Pour tout rectangle non carré, ces angles ne
    // coïncident jamais exactement avec les 4 coins → les coins sont écrêtés
    // → aire du polygone < L×E → volume GLB < computeVolumeEnrichi (~4-5 %).
    // rectProfileUniform place N/4 points par côté en partant des coins :
    // les 4 coins sont aux index 0, N/4, N/2, 3N/4 → aire = L×E exactement.
    // La triangulation par sommets opposés (i ↔ i+N/2) remplace le fan depuis
    // le centroïde : N/2 quads = N triangles, pas de vertex central, couverture
    // intégrale du rectangle.
    function rectProfileUniform(largeur_mm, epaisseur_mm, N) {
        const a = largeur_mm   / 2000; // demi-largeur en mètres
        const b = epaisseur_mm / 2000; // demi-épaisseur en mètres
        const s = N / 4; // points par côté (N doit être divisible par 4)
        const pts = [];
        // Côté supérieur : (-a, b) → (a, b), coin haut-gauche inclus — index 0
        for (let i = 0; i < s; i++) { const t = i / s; pts.push({ x: -a + t * 2 * a, y:  b }); }
        // Côté droit    : (a, b) → (a, -b), coin haut-droite inclus — index s
        for (let i = 0; i < s; i++) { const t = i / s; pts.push({ x:  a, y:  b - t * 2 * b }); }
        // Côté inférieur : (a, -b) → (-a, -b), coin bas-droite inclus — index 2s
        for (let i = 0; i < s; i++) { const t = i / s; pts.push({ x:  a - t * 2 * a, y: -b }); }
        // Côté gauche   : (-a, -b) → (-a, b), coin bas-gauche inclus — index 3s
        for (let i = 0; i < s; i++) { const t = i / s; pts.push({ x: -a, y: -b + t * 2 * b }); }
        return pts; // N points, coins aux index 0, s, 2s, 3s
    }

    /**
     * Profil rectangulaire uniforme CCW, en phase avec buildCircProfile.
     *
     * buildCircProfile : CCW, k=0 = (0, +R) «12h», k↑ → vers la gauche (-X).
     * rectProfileUniform : CW (parcourt le haut de gauche → droite) → sens opposé → twist.
     *
     * Cette fonction construit le profil en sens strictement CCW (angles polaires
     * croissants : gauche→bas→droite→haut), puis décale de 7N/8 pour que index 0
     * tombe sur (0, +b), en phase exacte avec circ k=0 = (0, +R) → zéro twist.
     *   index  0 : ( 0,  +b)  top-mid        ← en phase avec circ k=0
     *   index  2 : (-a,  +b)  top-left  coin
     *   index  6 : (-a,  -b)  bot-left  coin
     *   index 10 : (+a,  -b)  bot-right coin
     *   index 14 : (+a,  +b)  top-right coin
     */
    function rectProfileUniformPhased(largeur_mm, epaisseur_mm, N) {
        const a = largeur_mm   / 2000;
        const b = epaisseur_mm / 2000;
        const s = N / 4; // points par côté (N divisible par 4)
        const pts = [];
        // Ordre CCW — angles polaires croissants, identique à buildCircProfile :
        // Côté gauche   : (-a, +b) → (-a, -b)  — 135° → 225°
        for (let i = 0; i < s; i++) { const t = i / s; pts.push({ x: -a, y:  b - t * 2 * b }); }
        // Côté inférieur : (-a, -b) → (+a, -b) — 225° → 315°
        for (let i = 0; i < s; i++) { const t = i / s; pts.push({ x: -a + t * 2 * a, y: -b }); }
        // Côté droit    : (+a, -b) → (+a, +b)  — 315° → 405°
        for (let i = 0; i < s; i++) { const t = i / s; pts.push({ x:  a, y: -b + t * 2 * b }); }
        // Côté supérieur : (+a, +b) → (-a, +b) — 45° → 135°
        for (let i = 0; i < s; i++) { const t = i / s; pts.push({ x:  a - t * 2 * a, y:  b }); }
        // Décalage 7N/8 : (0, +b) passe à l'index 0, en phase avec circ k=0 = (0, +R)
        const shift = (7 * N) / 8; // = 14 pour N=16
        return [...pts.slice(shift), ...pts.slice(0, shift)];
    }

    // ─── Bloc 3 : Construction du maillage (loft + caps) ────────────────────────────────────────────

    /**
     * Construit le maillage 3D complet par loft entre sections successives.
     * Retourne { positions: Float32Array, indices: Uint16Array|Uint32Array }.
     *
     * @param {Array} sections - Sections triées par positionRatio croissant
     * @param {number} longueur_mm - Longueur totale de la pièce en mm
     */
    function buildMesh(sections, longueur_mm, nCirc) {
        nCirc = (nCirc && nCirc % 8 === 0 && nCirc >= 8) ? nCirc : N_CIRC;
        const posArr = []; // stockage temporaire des triplets XYZ
        const idxArr = []; // stockage temporaire des indices de triangles

        // Génère les profils 3D (rings) pour chaque section.
        // pts = profil « naturel » (4 coins CCW pour rect, nCirc points pour circ) — utilisé par les caps.
        // sec est conservé pour recalculer le profil polaire dans les lofts mixtes.
        const rings = sections.map(sec => {
            const z   = (sec.positionRatio * longueur_mm) / 1000; // mm → mètres
            const L   = sec.largeur   > 0 ? sec.largeur   : 1;
            const H   = sec.epaisseur > 0 ? sec.epaisseur : 1;
            const D   = sec.diametre  > 0 ? sec.diametre  : 1;
            const pts = sec.typeSection === 'circ'
                ? buildCircProfile(D, nCirc)
                : buildRectProfile(L, H);
            return { z, sec, pts };
        });

        /**
         * Ajoute un sommet dans posArr et retourne son index.
         */
        function addVertex(x, y, z) {
            posArr.push(x, y, z);
            return (posArr.length / 3) - 1;
        }

        /**
         * Ajoute une face triangulaire (winding CCW vu de l'extérieur / +Z).
         */
        function addTriangle(a, b, c) {
            idxArr.push(a, b, c);
        }

        // ── Faces latérales entre chaque paire de rings adjacents ──────────────
        for (let s = 0; s < rings.length - 1; s++) {
            const rA = rings[s];
            const rB = rings[s + 1];

            // Détecter si la transition est mixte (rect↔circ)
            const isMixed = (rA.sec.typeSection !== rB.sec.typeSection);

            // Obtenir le profil adapté au contexte du segment :
            //   circ          → ring.pts (buildCircProfile, N_CIRC pts)        — toujours
            //   rect pur      → ring.pts (buildRectProfile, N_RECT=4 coins)    — rect→rect uniquement
            //   rect mixte    → rectProfilePolar(L, H, N_CIRC)                 — rect↔circ uniquement
            //
            // rectProfilePolar est utilisé UNIQUEMENT dans le cas mixte (rect adjacent à circ).
            // Jamais dans rect→rect (évite les coins coupés et préserve le volume exact).
            function getProfileForSegment(ring) {
                if (ring.sec.typeSection === 'circ') {
                    return ring.pts; // buildCircProfile, N_CIRC pts, angles θ_i
                }
                if (isMixed) {
                    // rect adjacent à circ → uniforme en phase avec buildCircProfile
                    // index 0 = (0, +b) = même phase que (0, +R) → zéro twist, arêtes droites
                    // espacement uniforme N/4 pts/côté → arêtes longitudinales équidistantes
                    const L = ring.sec.largeur   > 0 ? ring.sec.largeur   : 1;
                    const H = ring.sec.epaisseur > 0 ? ring.sec.epaisseur : 1;
                    return rectProfileUniformPhased(L, H, nCirc);
                }
                // rect adjacent à rect → 4 coins purs (volume exact, pas de coins coupés)
                return ring.pts; // buildRectProfile, N_RECT=4 pts
            }

            const ptsA = getProfileForSegment(rA);
            const ptsB = getProfileForSegment(rB);
            const N    = ptsA.length; // 4 pour rect→rect, 16 pour circ ou mixte

            // Ajouter les sommets des deux anneaux dans posArr
            const baseA = posArr.length / 3;
            for (let j = 0; j < N; j++) addVertex(ptsA[j].x, ptsA[j].y, rA.z);
            const baseB = posArr.length / 3;
            for (let j = 0; j < N; j++) addVertex(ptsB[j].x, ptsB[j].y, rB.z);

            // Quads triangulés — mapping polaire direct (spec §4)
            // Quad i : [sA[i], sA[i+1], sB[i+1], sB[i]]
            // T1=[sA[i], sA[i+1], sB[i+1]]  T2=[sA[i], sB[i+1], sB[i]]
            // → normales extérieures (règle de la main droite, profils CCW)
            for (let j = 0; j < N; j++) {
                const next = (j + 1) % N;
                const a0 = baseA + j;
                const a1 = baseA + next;
                const b0 = baseB + j;
                const b1 = baseB + next;
                addTriangle(a0, a1, b1);
                addTriangle(a0, b1, b0);
            }
        }

        // ── Helper cap : profil uniforme depuis les dimensions de la section ──────
        // circ  → buildCircProfile  (nCirc pts, contour exact)
        // rect pur (aucune section circ dans la pièce) → buildRectProfile (4 coins, 2 triangles)
        // rect mixte (pièce contient au moins une section circ) → rectProfileUniform (nCirc pts)
        const hasCircSection = sections.some(s => s.typeSection === 'circ');
        function getCapProfile(ring) {
            if (ring.sec.typeSection === 'circ') {
                const D = ring.sec.diametre > 0 ? ring.sec.diametre : 1;
                return buildCircProfile(D, nCirc);
            }
            const L = ring.sec.largeur   > 0 ? ring.sec.largeur   : 1;
            const H = ring.sec.epaisseur > 0 ? ring.sec.epaisseur : 1;
            // Subdivision N-faces uniquement si la pièce contient des sections circ
            // (nécessaire pour la cohérence visuelle de la transition) ;
            // sinon 4 coins purs suffisent (volume exact, rendu propre).
            //
            // rectProfileUniform produit un profil CW (sens horaire en XY).
            // Le fan de cap attend CCW (même convention que buildRectProfile et buildCircProfile).
            // .reverse() corrige le sens UNIQUEMENT pour les caps mixtes rect+circ ;
            // les faces latérales (getProfileForSegment) et les caps purs sont inchangés.
            return hasCircSection
                ? rectProfileUniform(L, H, nCirc).reverse()
                : buildRectProfile(L, H);
        }

        // ── Cap de départ (extrémité z_0, face vue de -Z) ──────────────────────
        // Fan depuis un vertex central (centroïde), winding [centre, j+1, j] → normales vers -Z.
        {
            const rStart    = rings[0];
            const ptsStart  = getCapProfile(rStart);
            const N         = ptsStart.length;
            const centreIdx = addVertex(0, 0, rStart.z);
            const ringBase  = posArr.length / 3;
            for (let j = 0; j < N; j++) addVertex(ptsStart[j].x, ptsStart[j].y, rStart.z);
            for (let j = 0; j < N; j++) {
                const next = (j + 1) % N;
                addTriangle(centreIdx, ringBase + next, ringBase + j);
            }
        }

        // ── Cap de fin (extrémité z_last, face vue de +Z) ──────────────────────
        // Fan depuis un vertex central (centroïde), winding [centre, j, j+1] → normales vers +Z.
        {
            const rEnd      = rings[rings.length - 1];
            const ptsEnd    = getCapProfile(rEnd);
            const N         = ptsEnd.length;
            const centreIdx = addVertex(0, 0, rEnd.z);
            const ringBase  = posArr.length / 3;
            for (let j = 0; j < N; j++) addVertex(ptsEnd[j].x, ptsEnd[j].y, rEnd.z);
            for (let j = 0; j < N; j++) {
                const next = (j + 1) % N;
                addTriangle(centreIdx, ringBase + j, ringBase + next);
            }
        }

        // ── Conversion en tableaux typés ────────────────────────────────────────
        const positions = new Float32Array(posArr);
        const vertexCount = posArr.length / 3;
        const indices = vertexCount <= 65535
            ? new Uint16Array(idxArr)
            : new Uint32Array(idxArr);

        return { positions, indices };
    }

    // ─── Bloc 4 : Calcul min/max pour accessor POSITION ─────────────────────────

    function computeBounds(positions) {
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < positions.length; i += 3) {
            for (let k = 0; k < 3; k++) {
                if (positions[i + k] < min[k]) min[k] = positions[i + k];
                if (positions[i + k] > max[k]) max[k] = positions[i + k];
            }
        }
        // Sécurité si positions vide
        for (let k = 0; k < 3; k++) {
            if (!isFinite(min[k])) { min[k] = 0; max[k] = 0; }
        }
        return { min, max };
    }

    // ─── Bloc 5 : Assemblage GLB (glTF 2.0 binaire) ─────────────────────────────

    /**
     * Assemble un Uint8Array au format GLB 2.0 (Binary glTF).
     *
     * Layout :
     *   [Header 12B][JSON chunk][BIN chunk]
     *
     * Header : magic(4) + version(4) + totalLength(4)
     * Chunk  : chunkLength(4) + chunkType(4) + chunkData (padded to 4B)
     *   JSON chunk type : 0x4E4F534A ("JSON")
     *   BIN  chunk type : 0x004E4942 ("BIN\0")
     */
    function assembleGLB(positions, indices, metadata) {
        const vertexCount = positions.length / 3;
        const indexCount  = indices.length;
        const useUint16   = (vertexCount <= 65535);
        const indexComponentType = useUint16 ? 5123 : 5125; // UNSIGNED_SHORT vs UNSIGNED_INT
        const indexBytePerElement = useUint16 ? 2 : 4;

        // ── Données binaires BIN ────────────────────────────────────────────────
        const posByteLength = positions.byteLength;   // Float32 * 3 * vertexCount
        const idxByteLength = indices.byteLength;     // Uint16/32 * indexCount

        // Alignement 4 octets pour les bufferViews
        const posAlignedLen = posByteLength; // Float32 est naturellement aligné 4B
        const idxPad        = (4 - (idxByteLength % 4)) % 4;
        const idxAlignedLen = idxByteLength + idxPad;

        const binLength = posAlignedLen + idxAlignedLen;
        const binBuffer = new ArrayBuffer(binLength);
        const binView   = new DataView(binBuffer);

        // Copier positions (Float32)
        const posView = new Float32Array(binBuffer, 0, positions.length);
        posView.set(positions);

        // Copier indices (Uint16 ou Uint32) avec padding zéro
        if (useUint16) {
            const idxView = new Uint16Array(binBuffer, posAlignedLen, indices.length);
            idxView.set(indices);
        } else {
            const idxView = new Uint32Array(binBuffer, posAlignedLen, indices.length);
            idxView.set(indices);
        }

        // ── Bounds pour accessor POSITION ───────────────────────────────────────
        const { min, max } = computeBounds(positions);

        // ── Extras metadata pour le nœud ────────────────────────────────────────
        const extras = {
            lotNom:         metadata.lotNom         || '',
            essence:        metadata.essence         || '',
            typePiece:      metadata.typePiece       || '',
            longueur_mm:    metadata.longueur_mm     || 0,
            volumePiece_m3: metadata.volumePiece_m3  || 0,
            orientation:    metadata.orientation     || '',
        };

        // ── JSON glTF ────────────────────────────────────────────────────────────
        const gltf = {
            asset: { version: '2.0', generator: 'Valobois buildGLB v1.0' },
            scene: 0,
            scenes: [{ nodes: [0] }],
            nodes: [{
                mesh: 0,
                name: extras.lotNom ? `piece_${extras.lotNom}` : 'piece',
                extras,
            }],
            meshes: [{
                name: 'piece_mesh',
                primitives: [{
                    attributes: { POSITION: 0 },
                    indices: 1,
                    mode: 4, // TRIANGLES
                }],
            }],
            accessors: [
                {
                    // [0] POSITION
                    bufferView:    0,
                    byteOffset:    0,
                    componentType: 5126, // FLOAT
                    count:         vertexCount,
                    type:          'VEC3',
                    min,
                    max,
                },
                {
                    // [1] INDICES
                    bufferView:    1,
                    byteOffset:    0,
                    componentType: indexComponentType,
                    count:         indexCount,
                    type:          'SCALAR',
                },
            ],
            bufferViews: [
                {
                    // [0] positions buffer view
                    buffer:     0,
                    byteOffset: 0,
                    byteLength: posByteLength,
                    target:     34962, // ARRAY_BUFFER
                },
                {
                    // [1] indices buffer view
                    buffer:     0,
                    byteOffset: posAlignedLen,
                    byteLength: idxByteLength,
                    target:     34963, // ELEMENT_ARRAY_BUFFER
                },
            ],
            buffers: [{
                byteLength: binLength,
            }],
        };

        // ── Encodage JSON avec padding 0x20 (espace) à multiple de 4 ────────────
        const jsonStr  = JSON.stringify(gltf);
        const jsonData = new TextEncoder().encode(jsonStr);
        const jsonPad  = (4 - (jsonData.byteLength % 4)) % 4;
        const jsonChunkDataLen = jsonData.byteLength + jsonPad;

        // ── Calcul de la taille totale GLB ──────────────────────────────────────
        const HEADER_SIZE    = 12;
        const CHUNK_HDR_SIZE = 8; // chunkLength(4) + chunkType(4)
        const binChunkDataLen = binLength; // déjà aligné

        const totalLength = HEADER_SIZE
            + CHUNK_HDR_SIZE + jsonChunkDataLen
            + CHUNK_HDR_SIZE + binChunkDataLen;

        // ── Construction du buffer GLB ───────────────────────────────────────────
        const glbBuffer = new ArrayBuffer(totalLength);
        const dv = new DataView(glbBuffer);
        const u8 = new Uint8Array(glbBuffer);
        let offset = 0;

        // Header
        dv.setUint32(offset,  0x46546C67, true); offset += 4; // magic "glTF"
        dv.setUint32(offset,  2,           true); offset += 4; // version
        dv.setUint32(offset,  totalLength, true); offset += 4; // totalLength

        // JSON chunk header
        dv.setUint32(offset, jsonChunkDataLen, true); offset += 4; // chunkLength
        dv.setUint32(offset, 0x4E4F534A,       true); offset += 4; // chunkType "JSON"
        // JSON chunk data
        u8.set(jsonData, offset);
        // padding avec des espaces (0x20)
        for (let p = 0; p < jsonPad; p++) u8[offset + jsonData.byteLength + p] = 0x20;
        offset += jsonChunkDataLen;

        // BIN chunk header
        dv.setUint32(offset, binChunkDataLen, true); offset += 4; // chunkLength
        dv.setUint32(offset, 0x004E4942,     true); offset += 4; // chunkType "BIN\0"
        // BIN chunk data
        u8.set(new Uint8Array(binBuffer), offset);
        offset += binChunkDataLen;

        return new Uint8Array(glbBuffer);
    }

    // ─── Fonction principale exportée ────────────────────────────────────────────

    /**
     * Construit un fichier .glb (glTF 2.0 binaire) pour une pièce de bois.
     *
     * @param {Object} piece    - Données de la pièce (longueur, largeur, epaisseur, diametre, mesuresMultiples)
     * @param {Object} metadata - Métadonnées Valobois (lotNom, essence, typePiece, longueur_mm, volumePiece_m3, orientation)
     * @returns {Uint8Array}    - Contenu GLB, prêt pour Blob('model/gltf-binary')
     */
    function buildGLB(piece, metadata, options) {
        if (!piece || typeof piece !== 'object') {
            throw new Error('buildGLB : argument "piece" invalide');
        }

        // Précision polygonale : multiple de 8 entre 8 et 128, défaut N_CIRC=16
        const nCirc = (options && options.nCirc && options.nCirc % 8 === 0 && options.nCirc >= 8)
            ? options.nCirc
            : N_CIRC;

        // Résoudre les sections
        const sections = resolveSections(piece);

        // Longueur effective : depuis mesuresMultiples si active, sinon depuis piece.longueur
        const mm = piece.mesuresMultiples;
        const longueur_mm = (mm && mm.active && mm.longueur > 0)
            ? parseFloat(mm.longueur)
            : (parseFloat(piece.longueur) || 1000);

        // Construire le maillage 3D
        const { positions, indices } = buildMesh(sections, longueur_mm, nCirc);

        // Assembler et retourner le GLB
        return assembleGLB(positions, indices, metadata || {});
    }

    // ─── Assemblage GLB multi-mesh (un lot → un fichier) ─────────────────────────

    /**
     * Assemble un GLB glTF 2.0 contenant plusieurs meshes (un par pièce).
     * Chaque mesh est un nœud indépendant dans la scène, positionné à l'origine.
     *
     * @param {Array<{positions:Float32Array, indices:Uint16Array|Uint32Array, metadata:Object}>} meshDatas
     * @returns {Uint8Array}
     */
    function assembleMultiGLB(meshDatas) {
        if (!meshDatas || !meshDatas.length) {
            throw new Error('assembleMultiGLB : aucun mesh fourni');
        }

        // ── Layout BIN : [pos0][idx0+pad][pos1][idx1+pad]… ──────────────────────
        const segments = [];
        let totalBinLength = 0;

        for (const { positions, indices } of meshDatas) {
            const posLen = positions.byteLength;
            const idxLen = indices.byteLength;
            const idxPad = (4 - (idxLen % 4)) % 4;
            const posOffset = totalBinLength;
            totalBinLength += posLen;
            const idxOffset = totalBinLength;
            totalBinLength += idxLen + idxPad;
            segments.push({
                posOffset, posLen,
                idxOffset, idxLen,
                vertexCount:      positions.length / 3,
                indexCount:       indices.length,
                idxComponentType: (indices instanceof Uint16Array) ? 5123 : 5125,
            });
        }

        const binBuffer = new ArrayBuffer(totalBinLength);
        const u8bin = new Uint8Array(binBuffer);
        for (let i = 0; i < meshDatas.length; i++) {
            const { positions, indices } = meshDatas[i];
            const seg = segments[i];
            u8bin.set(new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength), seg.posOffset);
            u8bin.set(new Uint8Array(indices.buffer,   indices.byteOffset,   indices.byteLength),   seg.idxOffset);
        }

        // ── glTF JSON ────────────────────────────────────────────────────────────
        const bufferViews    = [];
        const accessors      = [];
        const meshes         = [];
        const nodes          = [];
        // Un nœud racine par pièce, portant à la fois le mesh, la translation et les extras.
        // Structure plate : scene.nodes = [0, 1, 2, …] → SketchUp crée un composant/groupe par nœud.
        const sceneRootNodes = [];

        // ── Pré-calcul des bounding-boxes pour les translations ─────────────────
        // bounds[i] = { min, max } en mètres, calculé une seule fois
        const bounds = meshDatas.map(({ positions }) => computeBounds(positions));

        // ── Disposition linéaire sur X, centrée en Z ────────────────────────────
        // Pièce 0 : centroïde X = 0, centroïde Z = 0 (translation Z = −longueur/2)
        // Pièce i : X cumulatif, pas = 1,5 × largeur de la pièce i−1
        //   largeur_i = bounds[i].max[0] − bounds[i].min[0]  (étendue X, = largeur rect ou diamètre circ)
        //   centre_z_i = (bounds[i].min[2] + bounds[i].max[2]) / 2
        const translations = [];
        let currentX = 0;
        for (let i = 0; i < meshDatas.length; i++) {
            const b       = bounds[i];
            const centreZ = (b.min[2] + b.max[2]) / 2;
            translations.push([currentX, 0, -centreZ]);
            // Pas pour la pièce suivante : 1,5 × largeur de la pièce courante
            const widthCurrent = b.max[0] - b.min[0];
            currentX += 1.5 * widthCurrent;
        }

        for (let i = 0; i < meshDatas.length; i++) {
            const { metadata } = meshDatas[i];
            const seg = segments[i];
            const { min, max } = bounds[i];

            const posViewIdx = bufferViews.length;
            bufferViews.push({ buffer: 0, byteOffset: seg.posOffset, byteLength: seg.posLen, target: 34962 });
            const idxViewIdx = bufferViews.length;
            bufferViews.push({ buffer: 0, byteOffset: seg.idxOffset, byteLength: seg.idxLen, target: 34963 });

            const posAccIdx = accessors.length;
            accessors.push({
                bufferView: posViewIdx, byteOffset: 0,
                componentType: 5126, count: seg.vertexCount, type: 'VEC3', min, max,
            });
            const idxAccIdx = accessors.length;
            accessors.push({
                bufferView: idxViewIdx, byteOffset: 0,
                componentType: seg.idxComponentType, count: seg.indexCount, type: 'SCALAR',
            });

            const extras = {
                lotNom:         (metadata && metadata.lotNom)         || '',
                essence:        (metadata && metadata.essence)        || '',
                typePiece:      (metadata && metadata.typePiece)      || '',
                longueur_mm:    (metadata && metadata.longueur_mm)    || 0,
                volumePiece_m3: (metadata && metadata.volumePiece_m3) || 0,
                orientation:    (metadata && metadata.orientation)    || '',
            };
            meshes.push({
                name: 'piece_' + (i + 1),
                primitives: [{ attributes: { POSITION: posAccIdx }, indices: idxAccIdx, mode: 4 }],
            });

            // Nœud racine unique : porte le mesh, la translation et les métadonnées (extras).
            // Structure plate — un nœud par pièce dans scene.nodes.
            const nodeIdx = nodes.length;
            nodes.push({
                mesh:        i,
                name:        'piece_' + (i + 1),
                translation: translations[i],
                extras,
            });

            sceneRootNodes.push(nodeIdx);
        }

        const gltf = {
            asset:   { version: '2.0', generator: 'Valobois buildMultiGLB v1.0' },
            scene:   0,
            scenes:  [{ nodes: sceneRootNodes }],
            nodes, meshes, accessors, bufferViews,
            buffers: [{ byteLength: totalBinLength }],
        };

        const jsonStr  = JSON.stringify(gltf);
        const jsonData = new TextEncoder().encode(jsonStr);
        const jsonPad  = (4 - (jsonData.byteLength % 4)) % 4;
        const jsonChunkDataLen = jsonData.byteLength + jsonPad;
        const totalLength = 12 + 8 + jsonChunkDataLen + 8 + totalBinLength;

        const glbBuffer = new ArrayBuffer(totalLength);
        const dv = new DataView(glbBuffer);
        const u8 = new Uint8Array(glbBuffer);
        let offset = 0;

        dv.setUint32(offset, 0x46546C67, true); offset += 4; // 'glTF'
        dv.setUint32(offset, 2,           true); offset += 4; // version
        dv.setUint32(offset, totalLength, true); offset += 4;

        dv.setUint32(offset, jsonChunkDataLen, true); offset += 4;
        dv.setUint32(offset, 0x4E4F534A,       true); offset += 4; // 'JSON'
        u8.set(jsonData, offset);
        for (let p = 0; p < jsonPad; p++) u8[offset + jsonData.byteLength + p] = 0x20;
        offset += jsonChunkDataLen;

        dv.setUint32(offset, totalBinLength, true); offset += 4;
        dv.setUint32(offset, 0x004E4942,    true); offset += 4; // 'BIN\0'
        u8.set(new Uint8Array(binBuffer), offset);

        return new Uint8Array(glbBuffer);
    }

    /**
     * Construit un .glb contenant toutes les pièces d'un lot (multi-mesh).
     *
     * @param {Array<{piece:Object, metadata:Object}>} piecesData
     * @param {Object} options - { nCirc }
     * @returns {Uint8Array}
     */
    function buildMultiGLB(piecesData, options) {
        if (!Array.isArray(piecesData) || !piecesData.length) {
            throw new Error('buildMultiGLB : tableau piecesData vide ou invalide');
        }
        const nCirc = (options && options.nCirc && options.nCirc % 8 === 0 && options.nCirc >= 8)
            ? options.nCirc
            : N_CIRC;

        const meshDatas = piecesData.map(({ piece, metadata }) => {
            if (!piece || typeof piece !== 'object') throw new Error('buildMultiGLB : pièce invalide');
            const sections    = resolveSections(piece);
            const mm          = piece.mesuresMultiples;
            const longueur_mm = (mm && mm.active && mm.longueur > 0)
                ? parseFloat(mm.longueur)
                : (parseFloat(piece.longueur) || 1000);
            const { positions, indices } = buildMesh(sections, longueur_mm, nCirc);
            return { positions, indices, metadata: metadata || {} };
        });

        return assembleMultiGLB(meshDatas);
    }

    // ── buildMeshData : expose la géométrie brute d'une pièce (pour build-dae.js) ──
    function buildMeshData(piece, nCirc) {
        if (!piece || typeof piece !== 'object') throw new Error('buildMeshData : argument "piece" invalide');
        const sections    = resolveSections(piece);
        const mm          = piece.mesuresMultiples;
        const longueur_mm = (mm && mm.active && mm.longueur > 0)
            ? parseFloat(mm.longueur)
            : (parseFloat(piece.longueur) || 1000);
        const n = (nCirc && nCirc % 8 === 0 && nCirc >= 8) ? nCirc : N_CIRC;
        return buildMesh(sections, longueur_mm, n);
    }

    // Exposition globale
    window.buildGLB              = buildGLB;
    window.buildMultiGLB         = buildMultiGLB;
    window.buildMeshData         = buildMeshData;
    window.computePositionBounds = computeBounds;
    window.resolveSections       = resolveSections;
    window.buildMesh             = buildMesh;

})();


/* ─────────────────────────────────────────────────────────────────────────────
 * TESTS MINIMAUX (commentés — exécutables en console navigateur)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Coller les blocs ci-dessous dans la console DevTools pour vérifier.

// ── Utilitaire de vérification ───────────────────────────────────────────────
function assertMagic(uint8, label) {
    const magic = [0x67, 0x6C, 0x54, 0x46]; // "glTF"
    const ok = magic.every((b, i) => uint8[i] === b);
    console.log(`[${ok ? 'OK' : 'FAIL'}] ${label} — magic bytes: 0x${Array.from(uint8.slice(0,4)).map(b=>b.toString(16).padStart(2,'0')).join(' ')}`);
    console.log(`  taille: ${uint8.byteLength} octets`);
    return ok;
}

// ── Cas 1 : pièce rect simple sans mesuresMultiples ──────────────────────────
const piece1 = { longueur: 3000, largeur: 70, epaisseur: 30, diametre: null };
const meta1  = { lotNom: 'test_lot1', essence: 'Chêne', typePiece: 'Poutre', longueur_mm: 3000 };
const glb1   = buildGLB(piece1, meta1);
assertMagic(glb1, 'Cas 1 — rect simple sans mesuresMultiples');

// ── Cas 2 : pièce conique rect (3 sections, largeur décroissante) ─────────────
const piece2 = {
    longueur: 3000, largeur: 80, epaisseur: 35, diametre: null,
    mesuresMultiples: {
        active: true,
        longueur: 3000,
        sections: [
            { position: 'extremite1', positionRatio: 0.0, typeSection: 'rect', largeur: 80, epaisseur: 35, diametre: null },
            { position: 'milieu',     positionRatio: 0.5, typeSection: 'rect', largeur: 75, epaisseur: 32, diametre: null },
            { position: 'extremite2', positionRatio: 1.0, typeSection: 'rect', largeur: 70, epaisseur: 30, diametre: null },
        ]
    }
};
const meta2  = { lotNom: 'test_lot2', essence: 'Sapin', typePiece: 'Chevron', longueur_mm: 3000 };
const glb2   = buildGLB(piece2, meta2);
assertMagic(glb2, 'Cas 2 — conique rect 3 sections');

// ── Cas 3 : pièce mixte (extremite1 rect, extremite2 circ) ───────────────────
const piece3 = {
    longueur: 2400, largeur: 80, epaisseur: 80, diametre: null,
    mesuresMultiples: {
        active: true,
        longueur: 2400,
        sections: [
            { position: 'extremite1', positionRatio: 0.0, typeSection: 'rect', largeur: 80, epaisseur: 80, diametre: null },
            { position: 'extremite2', positionRatio: 1.0, typeSection: 'circ', largeur: null, epaisseur: null, diametre: 75 },
        ]
    }
};
const meta3  = { lotNom: 'test_lot3', essence: 'Douglas', typePiece: 'Rondin', longueur_mm: 2400 };
const glb3   = buildGLB(piece3, meta3);
assertMagic(glb3, 'Cas 3 — mixte (rect→circ)');

 * ─────────────────────────────────────────────────────────────────────────── */
