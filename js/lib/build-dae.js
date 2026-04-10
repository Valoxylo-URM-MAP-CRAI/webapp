/**
 * build-dae.js — Génération de fichiers .dae (Collada 1.4.1) en JavaScript pur.
 *
 * Aucune dépendance externe. Requiert que js/lib/build-glb.js soit chargé avant
 * (expose window.buildMeshData et window.computePositionBounds).
 *
 * Expose window.buildMultiDAE(piecesData, options) → string (XML Collada)
 *
 * Structure dans SketchUp : chaque <node> de <library_visual_scenes> est un nœud
 * racine indépendant → groupe individuel distinct à l'import.
 *
 * AXLE CONVENTION : identique à build-glb.js : Z = longueur, X = largeur, Y = épaisseur.
 * UP_AXIS Y_UP déclaré dans l'asset Collada.
 */
(function () {
    'use strict';

    /**
     * Construit un fichier .dae Collada contenant plusieurs pièces.
     * Chaque pièce est un <node> racine indépendant dans <visual_scene> :
     * à l'import dans SketchUp, chaque nœud devient un groupe distinct sélectionnable.
     *
     * @param {Array<{piece:Object, metadata:Object}>} piecesData
     * @param {Object} [options] - { nCirc }
     * @returns {string} XML Collada 1.4.1
     */
    function buildMultiDAE(piecesData, options) {
        if (!Array.isArray(piecesData) || !piecesData.length) {
            throw new Error('buildMultiDAE : tableau piecesData vide ou invalide');
        }
        if (typeof window.buildMeshData !== 'function' || typeof window.computePositionBounds !== 'function') {
            throw new Error('buildMultiDAE : fonctions build-glb.js non disponibles (charger build-glb.js avant build-dae.js)');
        }

        const nCirc = (options && options.nCirc && options.nCirc % 8 === 0 && options.nCirc >= 8)
            ? options.nCirc
            : 16;

        // ── Construction des meshes ──────────────────────────────────────────────
        const meshDatas = piecesData.map(({ piece, metadata }) => {
            if (!piece || typeof piece !== 'object') throw new Error('buildMultiDAE : pièce invalide');
            const { positions, indices } = window.buildMeshData(piece, nCirc);
            return { positions, indices, metadata: metadata || {} };
        });

        // ── Calcul des offsets de positionnement ────────────────────────────────
        // Les profils sont centrés à X=0 (−hw → +hw) et Z démarre à 0.
        // La translation est INTÉGRÉE directement dans les coordonnées (baked) :
        //   - Guarantee l'unicité géométrique même pour des pièces dimensionnellement
        //     identiques → SketchUp ne peut pas fusionner les définitions → les noms
        //     fournis dans `name` sont préservés (pas de "Composant1").
        //   - Aucun <translate> ni <matrix> dans la scène → élimine définitivement
        //     la régression "pas de sous-groupes" causée par l'interprétation SketchUp.
        //
        // Espacement : pièce 0 ancrée à X=0 (bord gauche), pas look-ahead :
        //   centre_0 = halfWidth_0
        //   centre_{i+1} = centre_i + 2*hw_i + hw_{i+1}   (gap = hw_i > 0 toujours)
        const bounds = meshDatas.map(({ positions }) => window.computePositionBounds(positions));
        const halfWidths = bounds.map(b => (b.max[0] - b.min[0]) / 2);
        const offsets = []; // [tx, ty, tz] à ajouter à chaque sommet
        let currentX = halfWidths[0]; // bord gauche pièce 0 ancré à X=0
        for (let i = 0; i < meshDatas.length; i++) {
            const b       = bounds[i];
            // -b.min[1] ramène le bord inférieur à Y=0 → toutes les pièces posées sur
            // le même plan de sol (SketchUp Z=0 après rotation Y_UP→Z_UP à l'import).
            // -centreY valait 0 pour les profils symétriques (rect, circ) : no-op.
            const centreZ = (b.min[2] + b.max[2]) / 2;
            offsets.push([currentX, -b.min[1], -centreZ]);
            if (i + 1 < meshDatas.length) {
                currentX += 2 * halfWidths[i] + halfWidths[i + 1];
            }
        }

        // ── Génération XML ───────────────────────────────────────────────────────
        // SketchUp ignore le `name` des nœuds de <library_nodes> → toujours "Composant#N".
        // Il utilise le `name` d'un nœud de <visual_scene> contenant directement
        // <instance_geometry> comme nom de définition du composant.
        // → Pas de <library_nodes> : <instance_geometry> directement dans visual_scene.
        // Les positions étant déjà baked, aucun transform n'est nécessaire dans la scène.

        // Normalise en identifiant XML ASCII valide (sans accents, sans espaces)
        function toSafeId(str) {
            const s = (str || '')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '');
            return (/^\d/.test(s) ? 'p_' + s : s) || 'piece';
        }

        const geoElements  = [];
        const libNodeElems = [];
        const sceneNodes   = [];

        for (let i = 0; i < meshDatas.length; i++) {
            const { positions, indices, metadata } = meshDatas[i];
            const vertCount = positions.length / 3;
            const triCount  = indices.length / 3;
            const [tx, ty, tz] = offsets[i];

            // Nom unique dérivé des métadonnées
            const essBase     = toSafeId(metadata.essence   || '');
            const typBase     = toSafeId(metadata.typePiece || '');
            const label       = [essBase, typBase].filter(Boolean).join('_') || 'piece';
            const uniqueLabel = label + '_' + (i + 1);

            const geoId  = 'geo_'  + uniqueLabel;
            // Option A : id = uniqueLabel sans préfixe → hypothèse que SketchUp lit l'id
            // comme nom de définition du composant plutôt que l'attribut name.
            const compId = uniqueLabel;
            const instId = 'inst_' + uniqueLabel;

            // Positions avec offset INTÉGRÉ (baked) — chaque géométrie est unique
            const posArrParts = [];
            for (let j = 0; j < positions.length; j += 3) {
                posArrParts.push((positions[j]     + tx).toFixed(6));
                posArrParts.push((positions[j + 1] + ty).toFixed(6));
                posArrParts.push((positions[j + 2] + tz).toFixed(6));
            }
            const posArr = posArrParts.join(' ');
            const idxArr = Array.from(indices).join(' ');

            geoElements.push(
                `    <geometry id="${geoId}" name="${uniqueLabel}">\n` +
                `      <mesh>\n` +
                `        <source id="${geoId}_pos">\n` +
                `          <float_array id="${geoId}_pos_arr" count="${positions.length}">${posArr}</float_array>\n` +
                `          <technique_common>\n` +
                `            <accessor source="#${geoId}_pos_arr" count="${vertCount}" stride="3">\n` +
                `              <param name="X" type="float"/>\n` +
                `              <param name="Y" type="float"/>\n` +
                `              <param name="Z" type="float"/>\n` +
                `            </accessor>\n` +
                `          </technique_common>\n` +
                `        </source>\n` +
                `        <vertices id="${geoId}_verts">\n` +
                `          <input semantic="POSITION" source="#${geoId}_pos"/>\n` +
                `        </vertices>\n` +
                `        <triangles count="${triCount}">\n` +
                `          <input semantic="VERTEX" source="#${geoId}_verts" offset="0"/>\n` +
                `          <p>${idxArr}</p>\n` +
                `        </triangles>\n` +
                `      </mesh>\n` +
                `    </geometry>`
            );

            // Définition du composant dans library_nodes.
            // id = uniqueLabel sans préfixe → SketchUp devrait l'utiliser comme nom de définition.
            libNodeElems.push(
                `    <node id="${compId}" name="${uniqueLabel}" type="NODE">\n` +
                `      <instance_geometry url="#${geoId}"/>\n` +
                `    </node>`
            );

            // Instanciation sans transform (positions déjà baked)
            sceneNodes.push(
                `    <node id="${instId}" name="${uniqueLabel}" type="NODE">\n` +
                `      <instance_node url="#${compId}"/>\n` +
                `    </node>`
            );
        }

        const now = new Date().toISOString();

        const xml = (
            `<?xml version="1.0" encoding="utf-8"?>\n` +
            `<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">\n` +
            `  <asset>\n` +
            `    <created>${now}</created>\n` +
            `    <modified>${now}</modified>\n` +
            `    <unit name="meter" meter="1"/>\n` +
            `    <up_axis>Y_UP</up_axis>\n` +
            `  </asset>\n` +
            `  <library_geometries>\n` +
            geoElements.join('\n') + '\n' +
            `  </library_geometries>\n` +
            `  <library_nodes>\n` +
            libNodeElems.join('\n') + '\n' +
            `  </library_nodes>\n` +
            `  <library_visual_scenes>\n` +
            `    <visual_scene id="Scene" name="Scene">\n` +
            sceneNodes.join('\n') + '\n' +
            `    </visual_scene>\n` +
            `  </library_visual_scenes>\n` +
            `  <scene>\n` +
            `    <instance_visual_scene url="#Scene"/>\n` +
            `  </scene>\n` +
            `</COLLADA>`
        );
        return new Blob([xml], { type: 'model/vnd.collada+xml' });
    }

    window.buildMultiDAE = buildMultiDAE;

})();
