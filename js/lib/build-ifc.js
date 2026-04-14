/**
 * build-ifc.js — Export IFC4 STEP pour VALOBOIS
 *
 * Dépend de window.buildMesh et window.resolveSections exposés par build-glb.js.
 * Expose window.buildIFC(lot, psetConfig, ifcMode, meta) → string (contenu .ifc complet)
 *
 * Coordonnées géométriques : mètres (cohérent avec buildMesh qui renvoie des mètres).
 * IDs STEP séquentiels via un compteur { val: number } passé par référence.
 * GUIDs IFC4 : 22 caractères base64-IFC (alphabet 0-9A-Za-z_$).
 */
(function () {
    'use strict';

    // Alphabet base64-IFC : 64 caractères spécifiques selon la norme IFC
    var IFC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

    /**
     * generateGUID — GUID IFC conforme : 22 caractères base64-IFC
     * Utilise crypto.getRandomValues pour 16 octets aléatoires.
     */
    function generateGUID() {
        var bytes = new Uint8Array(16);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(bytes);
        } else {
            for (var i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
        }
        // 16 octets = 128 bits → 22 chars base64-IFC (6 bits par char, 22×6 = 132 > 128)
        var n = 0n;
        for (var j = 0; j < 16; j++) n = (n << 8n) | BigInt(bytes[j]);
        var chars = [];
        for (var k = 0; k < 22; k++) {
            chars.push(IFC_CHARS[Number(n & 63n)]);
            n >>= 6n;
        }
        return chars.reverse().join('');
    }

    /**
     * orientationToStatus — Mappe orientation VALOBOIS → Pset_MemberCommon.Status (IFC4)
     * @param {string} orientationLabel - Libellé d'orientation (ex: "Réemploi", "Réutilisation", "Incinération")
     * @returns {string|null} - 'Existing', 'Demolish', 'Other', ou null
     */
    function orientationToStatus(orientationLabel) {
        if (!orientationLabel) return null;
        var o = orientationLabel.toLowerCase();
        if (o.includes('remploi') || o.includes('rutilisation') || o.includes('réutilisation')) return 'Existing';
        if (o.includes('incin') || o.includes('démolition')) return 'Demolish';
        if (o.includes('recycl')) return 'Other';
        return null;
    }

    /**
     * buildOwnerHistoryLines — Génère les entités IFC OwnerHistory à partir des meta données étude
     *
     * Mapping IFC:
     * - OwningUser: diagnostiqueur (personne + organisation)
     * - OwningApplication: logiciel VALOBOIS (fixe)
     */
    function buildOwnerHistoryLines(idCounter, meta) {
        var lines = [];
        var metaObj = meta || {};

        var contactRaw = (metaObj.diagnostiqueurContact || '').trim();
        var tokens = contactRaw ? contactRaw.split(/\s+/) : [];
        var familyNameRaw = tokens.length ? tokens[tokens.length - 1] : 'VALOBOIS';
        var givenNameRaw = tokens.length > 1 ? tokens.slice(0, -1).join(' ') : '$';

        var orgNameRaw = (metaObj.diagnostiqueurNom || '').trim() || 'VALOBOIS';
        var orgDescription = 'Application VALOBOIS';
        var appVersion = '1.0';

        var creationDate = Math.floor(Date.now() / 1000);
        if (metaObj.date) {
            var d = new Date(metaObj.date);
            if (!Number.isNaN(d.getTime())) creationDate = Math.floor(d.getTime() / 1000);
        }

        var familyName = familyNameRaw.replace(/'/g, "''");
        var givenName = givenNameRaw === '$' ? '$' : ("'" + givenNameRaw.replace(/'/g, "''") + "'");
        var orgName = orgNameRaw.replace(/'/g, "''");

        var personId = idCounter.val++;
        lines.push('#' + personId + "= IFCPERSON($,'" + familyName + "'," + givenName + ',$,$,$,$,$);');

        var userOrgId = idCounter.val++;
        lines.push('#' + userOrgId + "= IFCORGANIZATION($,'" + orgName + "','" + orgDescription + "',$,$);");

        var personOrgId = idCounter.val++;
        lines.push('#' + personOrgId + '= IFCPERSONANDORGANIZATION(#' + personId + ',#' + userOrgId + ',$);');

        var appOrgId = idCounter.val++;
        lines.push('#' + appOrgId + "= IFCORGANIZATION($,'VALOBOIS','Application VALOBOIS',$,$);");

        var appId = idCounter.val++;
        lines.push('#' + appId + "= IFCAPPLICATION(#" + appOrgId + ",'" + appVersion + "','VALOBOIS','VALOBOIS');");

        var ownerHistId = idCounter.val++;
        lines.push('#' + ownerHistId + '= IFCOWNERHISTORY(#' + personOrgId + ',#' + appId + ',$,.ADDED.,$,$,$,' + creationDate + ');');

        return {
            lines: lines,
            ownerHistId: ownerHistId,
        };
    }

    /**
     * buildPsetLines — Génère les lignes STEP pour un IfcPropertySet
     *
     * @param {number}        entityId   - ID STEP de l'entité parente (IfcMember)
     * @param {string}        psetName   - Nom du Pset IFC (ex. "Pset_Valobois_Identification")
     * @param {object}        properties - { libellé: valeur } — null/undefined omis
    * @param {{ val:number }} idCounter  - Compteur d'IDs STEP passé par référence
    * @param {number}         ownerHistId - ID STEP de IfcOwnerHistory
     * @returns {{ lines: string[], relId: number|null }}
     */
    function buildPsetLines(entityId, psetName, properties, idCounter, ownerHistId) {
        var lines = [];
        var propIds = [];

        Object.keys(properties).forEach(function (key) {
            var val = properties[key];
            if (val === null || val === undefined) return;

            var stVal;
            if (typeof val === 'boolean') {
                stVal = 'IFCBOOLEAN(.' + (val ? 'T' : 'F') + '.)';
            } else if (typeof val === 'number') {
                if (Number.isInteger(val)) {
                    stVal = 'IFCINTEGER(' + val + ')';
                } else {
                    stVal = 'IFCREAL(' + val + ')';
                }
            } else {
                // Échapper les apostrophes STEP (doublement)
                var safed = String(val).replace(/'/g, "''");
                stVal = "IFCLABEL('" + safed + "')";
            }
            var propId = idCounter.val++;
            var safeKey = key.replace(/'/g, "''");
            lines.push('#' + propId + "= IFCPROPERTYSINGLEVALUE('" + safeKey + "',$," + stVal + ',$);');
            propIds.push('#' + propId);
        });

        if (propIds.length === 0) return { lines: [], relId: null };

        var psetId = idCounter.val++;
        var psetGuid = generateGUID();
        lines.push('#' + psetId + "= IFCPROPERTYSET('" + psetGuid + "',#" + ownerHistId + ",'" + psetName + "',$,(" + propIds.join(',') + '));');

        var relId = idCounter.val++;
        var relGuid = generateGUID();
        lines.push('#' + relId + "= IFCRELDEFINESBYPROPERTIES('" + relGuid + "',#" + ownerHistId + ",$,$,(#" + entityId + '),#' + psetId + ');');

        return { lines: lines, relId: relId };
    }

    /**
     * buildFallbackBrep — IfcFacetedBrep minimal (boîte) si buildMesh échoue
     */
    function buildFallbackBrep(idCounter, piece) {
        var lines = [];
        var L = (parseFloat(piece.longueur) || 1000) / 1000;
        var W = (parseFloat(piece.largeur) || 100) / 1000;
        var H = (parseFloat(piece.epaisseur) || 100) / 1000;

        var ptCoords = [
            [0, 0, 0], [L, 0, 0], [L, W, 0], [0, W, 0],
            [0, 0, H], [L, 0, H], [L, W, H], [0, W, H],
        ];
        var pIds = ptCoords.map(function (p) {
            var id = idCounter.val++;
            lines.push('#' + id + '= IFCCARTESIANPOINT((' + p[0].toFixed(6) + ',' + p[1].toFixed(6) + ',' + p[2].toFixed(6) + '));');
            return id;
        });

        // 6 faces quadrangulaires (IfcPolyLoop accepte > 3 sommets)
        var faceDefs = [
            [0, 3, 2, 1], // bas (−Z) — normal vers −Z
            [4, 5, 6, 7], // haut (+Z)
            [0, 1, 5, 4], // avant (−Y)
            [1, 2, 6, 5], // droite (+X)
            [2, 3, 7, 6], // arrière (+Y)
            [3, 0, 4, 7], // gauche (−X)
        ];
        var faceIds = [];
        faceDefs.forEach(function (f) {
            var loopId = idCounter.val++;
            lines.push('#' + loopId + '= IFCPOLYLOOP((#' + pIds[f[0]] + ',#' + pIds[f[1]] + ',#' + pIds[f[2]] + ',#' + pIds[f[3]] + '));');
            var boundId = idCounter.val++;
            lines.push('#' + boundId + '= IFCFACEOUTERBOUND(#' + loopId + ',.T.);');
            var faceId = idCounter.val++;
            lines.push('#' + faceId + '= IFCFACE((#' + boundId + '));');
            faceIds.push('#' + faceId);
        });

        var shellId = idCounter.val++;
        lines.push('#' + shellId + '= IFCCLOSEDSHELL((' + faceIds.join(',') + '));');
        var solidId = idCounter.val++;
        lines.push('#' + solidId + '= IFCFACETEDBREP(#' + shellId + ');');

        return { lines: lines, solidId: solidId };
    }

    /**
     * buildIFCMember — Géométrie + Psets d'une pièce VALOBOIS
     *
     * @param {object}        piece             - Données de la pièce
     * @param {object}        lot               - Lot parent (pour les Psets)
     * @param {object}        psetConfig        - Configuration des Psets
     * @param {{ val:number }} idCounter         - Compteur d'IDs STEP
     * @param {number}        placementOffsetY  - Décalage en mm sur l'axe Y (entre pièces du lot)
     * @param {number}        globalPlacementId - ID STEP du placement parent (BuildingStorey)
     * @param {number}        geomCtxId         - ID STEP du contexte géométrique (#13)
     * @param {number}        ownerHistId       - ID STEP de l'OwnerHistory (#3)
     * @returns {{ lines: string[], memberEntityId: number, memberGlobalId: string }}
     */
    function buildIFCMember(piece, lot, meta, psetConfig, idCounter, placementOffsetY, globalPlacementId, geomCtxId, ownerHistId) {
        var lines = [];
        var longueur_mm = parseFloat(piece.longueur) || 1000;
        var offsetY_m = placementOffsetY / 1000;
        var memberGlobalId = generateGUID();
        var nomPiece = ((piece.typePiece || 'Pièce') + (piece.essence ? ' — ' + piece.essence : '')).replace(/'/g, "''");

        // ── Placement local du membre : origine décalée sur Y pour l'espacement ──
        var memberOriginId = idCounter.val++;
        lines.push('#' + memberOriginId + '= IFCCARTESIANPOINT((0.,' + offsetY_m.toFixed(6) + ',0.));');
        var memberAxisId = idCounter.val++;
        lines.push('#' + memberAxisId + '= IFCAXIS2PLACEMENT3D(#' + memberOriginId + ',$,$);');
        var memberPlacId = idCounter.val++;
        lines.push('#' + memberPlacId + '= IFCLOCALPLACEMENT(#' + globalPlacementId + ',#' + memberAxisId + ');');

        // ── Détecter si la section est constante ──
        var sections = (typeof window.resolveSections === 'function') ? window.resolveSections(piece) : null;
        var isConstant = true;
        if (sections && sections.length >= 2) {
            var sec0 = sections[0];
            isConstant = sections.every(function (s) {
                return s.typeSection === sec0.typeSection &&
                    Math.abs((s.largeur   || 0) - (sec0.largeur   || 0)) < 0.01 &&
                    Math.abs((s.epaisseur || 0) - (sec0.epaisseur || 0)) < 0.01 &&
                    Math.abs((s.diametre  || 0) - (sec0.diametre  || 0)) < 0.01;
            });
        }

        var solidId;

        if (isConstant) {
            // ── Section constante : IfcExtrudedAreaSolid ──
            var sec = (sections && sections.length > 0) ? sections[0] : {
                typeSection: 'rect',
                largeur: parseFloat(piece.largeur) || 100,
                epaisseur: parseFloat(piece.epaisseur) || 100,
                diametre: parseFloat(piece.diametre) || 0,
            };
            var longueur_m = longueur_mm / 1000;

            // Placement 2D du profil (centré à l'origine)
            var pos2dId = idCounter.val++;
            lines.push('#' + pos2dId + '= IFCCARTESIANPOINT((0.,0.));');
            var axis2dId = idCounter.val++;
            lines.push('#' + axis2dId + '= IFCAXIS2PLACEMENT2D(#' + pos2dId + ',$);');

            // Définition du profil
            var profileId = idCounter.val++;
            if (sec.typeSection === 'circ') {
                var R_m = (sec.diametre > 0 ? sec.diametre : 100) / 2000;
                lines.push('#' + profileId + '= IFCCIRCLEPROFILEDEF(.AREA.,$,#' + axis2dId + ',' + R_m.toFixed(6) + ');');
            } else {
                var L_m = (sec.largeur > 0 ? sec.largeur : 100) / 1000;
                var H_m = (sec.epaisseur > 0 ? sec.epaisseur : 100) / 1000;
                lines.push('#' + profileId + '= IFCRECTANGLEPROFILEDEF(.AREA.,$,#' + axis2dId + ',' + (L_m / 2).toFixed(6) + ',' + (H_m / 2).toFixed(6) + ');');
            }

            // Placement du solide : axe local Z = monde X (pièce horizontale)
            var dirAxisId = idCounter.val++;
            lines.push('#' + dirAxisId + '= IFCDIRECTION((1.,0.,0.));');
            var dirRefId = idCounter.val++;
            lines.push('#' + dirRefId + '= IFCDIRECTION((0.,1.,0.));');
            var ptOriginId = idCounter.val++;
            lines.push('#' + ptOriginId + '= IFCCARTESIANPOINT((0.,0.,0.));');
            var axisPlacId = idCounter.val++;
            lines.push('#' + axisPlacId + '= IFCAXIS2PLACEMENT3D(#' + ptOriginId + ',#' + dirAxisId + ',#' + dirRefId + ');');
            var dirExtrudeId = idCounter.val++;
            lines.push('#' + dirExtrudeId + '= IFCDIRECTION((0.,0.,1.));');

            solidId = idCounter.val++;
            lines.push('#' + solidId + '= IFCEXTRUDEDAREASOLID(#' + profileId + ',#' + axisPlacId + ',#' + dirExtrudeId + ',' + longueur_m.toFixed(6) + ');');

        } else {
            // ── Section variable : IfcFacetedBrep via buildMesh() ──
            var meshData = (typeof window.buildMesh === 'function') ? window.buildMesh(sections, longueur_mm, 16) : null;

            if (!meshData || !meshData.positions || !meshData.indices) {
                // Fallback : boîte si buildMesh indisponible
                var fallback = buildFallbackBrep(idCounter, piece);
                lines = lines.concat(fallback.lines);
                solidId = fallback.solidId;
            } else {
                var positions = meshData.positions;
                var indices   = meshData.indices;
                var vertCount = positions.length / 3;

                // Écrire les points (coords déjà en mètres depuis buildMesh)
                var vertStartId = idCounter.val;
                for (var vi = 0; vi < vertCount; vi++) {
                    var px = positions[vi * 3    ];
                    var py = positions[vi * 3 + 1];
                    var pz = positions[vi * 3 + 2];
                    lines.push('#' + idCounter.val++ + '= IFCCARTESIANPOINT((' + pz.toFixed(6) + ',' + px.toFixed(6) + ',' + py.toFixed(6) + '));');
                }

                // Écrire les faces (triangles)
                var triCount = indices.length / 3;
                var faceIds = [];
                for (var ti = 0; ti < triCount; ti++) {
                    var i0 = indices[ti * 3    ];
                    var i1 = indices[ti * 3 + 1];
                    var i2 = indices[ti * 3 + 2];
                    var loopId = idCounter.val++;
                    lines.push('#' + loopId + '= IFCPOLYLOOP((#' + (vertStartId + i0) + ',#' + (vertStartId + i1) + ',#' + (vertStartId + i2) + '));');
                    var boundId = idCounter.val++;
                    lines.push('#' + boundId + '= IFCFACEOUTERBOUND(#' + loopId + ',.T.);');
                    var faceId = idCounter.val++;
                    lines.push('#' + faceId + '= IFCFACE((#' + boundId + '));');
                    faceIds.push('#' + faceId);
                }

                var shellId = idCounter.val++;
                lines.push('#' + shellId + '= IFCCLOSEDSHELL((' + faceIds.join(',') + '));');
                solidId = idCounter.val++;
                lines.push('#' + solidId + '= IFCFACETEDBREP(#' + shellId + ');');
            }
        }

        // ── Représentation géométrique ──
        var repType = isConstant ? 'SweptSolid' : 'Brep';
        var shapeRepId = idCounter.val++;
        lines.push('#' + shapeRepId + "= IFCSHAPEREPRESENTATION(#" + geomCtxId + ",'Body','" + repType + "',(#" + solidId + '));');

        var prodDefShapeId = idCounter.val++;
        lines.push('#' + prodDefShapeId + '= IFCPRODUCTDEFINITIONSHAPE($,$,(#' + shapeRepId + '));');

        // ── IfcMember ──
        var memberEntityId = idCounter.val++;
        lines.push('#' + memberEntityId + "= IFCMEMBER('" + memberGlobalId + "',#" + ownerHistId + ",'" + nomPiece + "','IfcMember',$,#" + memberPlacId + ',#' + prodDefShapeId + ',$,.BEAM.);');

        // ── IfcMaterial + IfcRelAssociatesMaterial (si essence renseignée) ──
        var essenceName = piece.essenceNomCommun || piece.essence || null;
        if (essenceName) {
            var safeEssence = (essenceName + '').replace(/'/g, "''");
            var materialId = idCounter.val++;
            lines.push('#' + materialId + "= IFCMATERIAL('" + safeEssence + "');");
            var relMatId = idCounter.val++;
            lines.push('#' + relMatId + "= IFCRELASSOCIATESMATERIAL('" + generateGUID() + "',#" + ownerHistId + ",$,$,(#" + memberEntityId + "),#" + materialId + ');');
        }

        // ── Psets ──
        if (psetConfig) {
            Object.keys(psetConfig).forEach(function (psetKey) {
                var psetDef = psetConfig[psetKey];
                if (!psetDef || !psetDef.enabled) return;

                var props = {};
                Object.keys(psetDef.properties).forEach(function (propKey) {
                    var propDef = psetDef.properties[propKey];
                    if (!propDef || !propDef.enabled) return;
                    try {
                        var val = propDef.getValue(piece, lot, meta);
                        if (val !== null && val !== undefined && val !== '') {
                            props[propDef.label] = val;
                        }
                    } catch (e) { /* ignorer les erreurs getValue */ }
                });

                if (Object.keys(props).length === 0) return;
                var psetResult = buildPsetLines(memberEntityId, psetDef.psetName, props, idCounter, ownerHistId);
                lines = lines.concat(psetResult.lines);
            });
        }

        return { lines: lines, memberEntityId: memberEntityId, memberGlobalId: memberGlobalId };
    }

    /**
     * buildIFC — Construit le fichier IFC4 complet d'un lot
     *
     * @param {object} lot        - Lot VALOBOIS (avec lot.pieces[])
     * @param {object} psetConfig - Configuration des Psets (DEFAULT_PSET_CONFIG ou copie)
     * @param {string} ifcMode    - Mode d'export : 'library' (défaut) ou 'project'
     * @returns {string} Contenu du fichier .ifc (format STEP ISO-10303-21)
     */
    function buildIFC(lot, psetConfig, ifcMode, meta) {
        if (!ifcMode) ifcMode = 'library'; // défaut = library
        return ifcMode === 'library'
            ? buildIFCLibrary(lot, psetConfig, meta)
            : buildIFCProject(lot, psetConfig, meta);
    }

    /**
     * buildIFCLibrary — Mode 'library' : IfcProjectLibrary avec hiérarchie minimale
     * Les IfcMember sont contenus directement via IfcRelDeclares.
     */
    function buildIFCLibrary(lot, psetConfig, meta) {
        var idCounter = { val: 1 };
        var dataLines = [];
        var today = new Date().toISOString().slice(0, 19);
        var lotName = ((lot.nomLot || lot.nom || 'VALOBOIS') + '').replace(/'/g, "''");

        // ── OwnerHistory enrichi à partir des meta ──
        var ownerInfo = buildOwnerHistoryLines(idCounter, meta);
        dataLines = dataLines.concat(ownerInfo.lines);
        var ownerHistId = ownerInfo.ownerHistId;

        // ── Entités fixes (contexte IFC minimaliste) ──
        var dimExpId = idCounter.val++;
        dataLines.push('#' + dimExpId + '= IFCDIMENSIONALEXPONENTS(0,0,0,0,0,0,0);');

        var lengthUnitId = idCounter.val++;
        dataLines.push('#' + lengthUnitId + '= IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);');
        var areaUnitId = idCounter.val++;
        dataLines.push('#' + areaUnitId + '= IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);');
        var volumeUnitId = idCounter.val++;
        dataLines.push('#' + volumeUnitId + '= IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);');

        var unitAssignId = idCounter.val++;
        dataLines.push('#' + unitAssignId + '= IFCUNITASSIGNMENT((#' + lengthUnitId + ',#' + areaUnitId + ',#' + volumeUnitId + '));');

        var contextOriginId = idCounter.val++;
        dataLines.push('#' + contextOriginId + '= IFCCARTESIANPOINT((0.,0.,0.));');
        var contextAxisZId = idCounter.val++;
        dataLines.push('#' + contextAxisZId + '= IFCDIRECTION((0.,0.,1.));');
        var contextRefXId = idCounter.val++;
        dataLines.push('#' + contextRefXId + '= IFCDIRECTION((1.,0.,0.));');
        var contextAxisId = idCounter.val++;
        dataLines.push('#' + contextAxisId + '= IFCAXIS2PLACEMENT3D(#' + contextOriginId + ',#' + contextAxisZId + ',#' + contextRefXId + ');');

        var geomCtxId = idCounter.val++;
        dataLines.push('#' + geomCtxId + "= IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#" + contextAxisId + ',$);');

        var projectGuid = generateGUID();
        var projectLibraryId = idCounter.val++;
        dataLines.push('#' + projectLibraryId + "= IFCPROJECTLIBRARY('" + projectGuid + "',#" + ownerHistId + ",'" + lotName + "',$,$,$,$,(#" + geomCtxId + '),#' + unitAssignId + ');');

        // ── Placement global pour toutes les pièces ──
        var globalPtId = idCounter.val++;
        dataLines.push('#' + globalPtId + '= IFCCARTESIANPOINT((0.,0.,0.));');
        var globalAxisId = idCounter.val++;
        dataLines.push('#' + globalAxisId + '= IFCAXIS2PLACEMENT3D(#' + globalPtId + ',$,$);');
        var globalPlacementId = idCounter.val++;
        dataLines.push('#' + globalPlacementId + '= IFCLOCALPLACEMENT($,#' + globalAxisId + ');');

        // ── Générer les IfcMember pour toutes les pièces ──
        var memberIds = [];
        var pieces    = Array.isArray(lot.pieces) ? lot.pieces : [];

        var instances = [];
        pieces.forEach(function (piece) {
            if (!piece || typeof piece !== 'object') return;
            var qty = Math.max(1, Math.floor(parseFloat(piece.quantite) || 1));
            var secDimMm = 0;
            if (typeof window.resolveSections === 'function') {
                var secs = window.resolveSections(piece);
                secs.forEach(function (s) {
                    var dim = s.typeSection === 'circ'
                        ? (parseFloat(s.diametre) || 0)
                        : (parseFloat(s.largeur)  || 0);
                    if (dim > secDimMm) secDimMm = dim;
                });
            }
            if (!secDimMm) secDimMm = parseFloat(piece.largeur) || parseFloat(piece.diametre) || 100;
            var halfW = secDimMm / 2;
            for (var q = 0; q < qty; q++) {
                instances.push({ piece: piece, halfW: halfW });
            }
        });

        var centers = [];
        if (instances.length > 0) {
            var cx = instances[0].halfW;
            for (var ii = 0; ii < instances.length; ii++) {
                centers.push(cx);
                if (ii + 1 < instances.length) {
                    cx += 2 * instances[ii].halfW + instances[ii + 1].halfW;
                }
            }
        }

        instances.forEach(function (inst, ii) {
            var result = buildIFCMember(
                inst.piece, lot, meta, psetConfig, idCounter,
                centers[ii], globalPlacementId, geomCtxId, ownerHistId
            );
            dataLines = dataLines.concat(result.lines);
            memberIds.push('#' + result.memberEntityId);
        });

        // ── Relation IfcProjectLibrary → IfcMember (Declares) ──
        if (memberIds.length > 0) {
            var relDeclId = idCounter.val++;
            dataLines.push('#' + relDeclId + "= IFCRELDECLARES('" + generateGUID() + "',#" + ownerHistId + ",$,$,#" + projectLibraryId + ",(" + memberIds.join(',') + '));');
        }

        // ── Assemblage du fichier STEP ──
        var safeLotName = (lot.nomLot || lot.nom || 'lot').replace(/\s+/g, '_').replace(/'/g, '');
        var header = [
            'ISO-10303-21;',
            'HEADER;',
            "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
            "FILE_NAME('valobois_" + safeLotName + "_lib.ifc','" + today + "',('VALOBOIS'),(''),",
            "  'VALOBOIS Export IFC4 Library','IfcOpenShell','');",
            "FILE_SCHEMA(('IFC4'));",
            'ENDSEC;',
            'DATA;',
        ].join('\n');

        return header + '\n' + dataLines.join('\n') + '\nENDSEC;\nEND-ISO-10303-21;\n';
    }

    /**
     * buildIFCProject — Mode 'project' : hiérarchie IFC4 complète
     * IfcProject → IfcSite → IfcBuilding → IfcBuildingStorey → IfcMember
     */
    function buildIFCProject(lot, psetConfig, meta) {
        var idCounter = { val: 1 };
        var dataLines = [];
        var today = new Date().toISOString().slice(0, 19);
        var lotName = ((lot.nomLot || lot.nom || 'Lot') + '').replace(/'/g, "''");

        // ── OwnerHistory enrichi à partir des meta ──
        var ownerInfo = buildOwnerHistoryLines(idCounter, meta);
        dataLines = dataLines.concat(ownerInfo.lines);
        var ownerHistId = ownerInfo.ownerHistId;

        // ── Entités fixes de contexte IFC ──
        var dimExpId = idCounter.val++;
        dataLines.push('#' + dimExpId + '= IFCDIMENSIONALEXPONENTS(0,0,0,0,0,0,0);');

        var lengthUnitId = idCounter.val++;
        dataLines.push('#' + lengthUnitId + '= IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);');
        var areaUnitId = idCounter.val++;
        dataLines.push('#' + areaUnitId + '= IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);');
        var volumeUnitId = idCounter.val++;
        dataLines.push('#' + volumeUnitId + '= IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);');

        var unitAssignId = idCounter.val++;
        dataLines.push('#' + unitAssignId + '= IFCUNITASSIGNMENT((#' + lengthUnitId + ',#' + areaUnitId + ',#' + volumeUnitId + '));');

        var contextOriginId = idCounter.val++;
        dataLines.push('#' + contextOriginId + '= IFCCARTESIANPOINT((0.,0.,0.));');
        var contextAxisId = idCounter.val++;
        dataLines.push('#' + contextAxisId + '= IFCAXIS2PLACEMENT3D(#' + contextOriginId + ',$,$);');
        var geomCtxId = idCounter.val++;
        dataLines.push('#' + geomCtxId + "= IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#" + contextAxisId + ',$);');

        var projectGuid = generateGUID();
        var projectId = idCounter.val++;
        dataLines.push('#' + projectId + "= IFCPROJECT('" + projectGuid + "',#" + ownerHistId + ",'VALOBOIS Diagnostic',$,$,$,$,(#" + geomCtxId + '),#' + unitAssignId + ');');

        // ── IfcSite ──
        var sitePtId = idCounter.val++;
        dataLines.push('#' + sitePtId + '= IFCCARTESIANPOINT((0.,0.,0.));');
        var siteAxisId = idCounter.val++;
        dataLines.push('#' + siteAxisId + '= IFCAXIS2PLACEMENT3D(#' + sitePtId + ',$,$);');
        var sitePlacId = idCounter.val++;
        dataLines.push('#' + sitePlacId + '= IFCLOCALPLACEMENT($,#' + siteAxisId + ');');
        var siteId   = idCounter.val++;
        var siteGuid = generateGUID();
        dataLines.push('#' + siteId + "= IFCSITE('" + siteGuid + "',#" + ownerHistId + ",'Site',$,$,#" + sitePlacId + ',$,$,.ELEMENT.,$,$,$,$,$);');

        // ── IfcBuilding ──
        var buildPtId = idCounter.val++;
        dataLines.push('#' + buildPtId + '= IFCCARTESIANPOINT((0.,0.,0.));');
        var buildAxisId = idCounter.val++;
        dataLines.push('#' + buildAxisId + '= IFCAXIS2PLACEMENT3D(#' + buildPtId + ',$,$);');
        var buildPlacId = idCounter.val++;
        dataLines.push('#' + buildPlacId + '= IFCLOCALPLACEMENT(#' + sitePlacId + ',#' + buildAxisId + ');');
        var buildingId   = idCounter.val++;
        var buildingGuid = generateGUID();
        dataLines.push('#' + buildingId + "= IFCBUILDING('" + buildingGuid + "',#" + ownerHistId + ",'Bâtiment',$,$,#" + buildPlacId + ',$,$,.ELEMENT.,$,$,$);');

        // ── IfcBuildingStorey (un par lot) ──
        var storeyPtId = idCounter.val++;
        dataLines.push('#' + storeyPtId + '= IFCCARTESIANPOINT((0.,0.,0.));');
        var storeyAxisId = idCounter.val++;
        dataLines.push('#' + storeyAxisId + '= IFCAXIS2PLACEMENT3D(#' + storeyPtId + ',$,$);');
        var storeyPlacId = idCounter.val++;
        dataLines.push('#' + storeyPlacId + '= IFCLOCALPLACEMENT(#' + buildPlacId + ',#' + storeyAxisId + ');');
        var storeyId   = idCounter.val++;
        var storeyGuid = generateGUID();
        dataLines.push('#' + storeyId + "= IFCBUILDINGSTOREY('" + storeyGuid + "',#" + ownerHistId + ",'" + lotName + "',$,$,#" + storeyPlacId + ',$,$,.ELEMENT.,0.);');

        // ── Relations hiérarchiques spatiales ──
        var relSiteId = idCounter.val++;
        dataLines.push('#' + relSiteId + "= IFCRELAGGREGATES('" + generateGUID() + "',#" + ownerHistId + ",$,$,#" + projectId + ",(#" + siteId + '));');

        var relBuildId = idCounter.val++;
        dataLines.push('#' + relBuildId + "= IFCRELAGGREGATES('" + generateGUID() + "',#" + ownerHistId + ",$,$,#" + siteId + ",(#" + buildingId + '));');

        var relStoreyId = idCounter.val++;
        dataLines.push('#' + relStoreyId + "= IFCRELAGGREGATES('" + generateGUID() + "',#" + ownerHistId + ",$,$,#" + buildingId + ",(#" + storeyId + '));');

        // ── Placement global pour toutes les pièces du lot ──
        var globalPtId = idCounter.val++;
        dataLines.push('#' + globalPtId + '= IFCCARTESIANPOINT((0.,0.,0.));');
        var globalAxisId = idCounter.val++;
        dataLines.push('#' + globalAxisId + '= IFCAXIS2PLACEMENT3D(#' + globalPtId + ',$,$);');
        var globalPlacementId = idCounter.val++;
        dataLines.push('#' + globalPlacementId + '= IFCLOCALPLACEMENT(#' + storeyPlacId + ',#' + globalAxisId + ');');

        // ── Générer les IfcMember pour toutes les pièces ──
        var memberIds = [];
        var pieces    = Array.isArray(lot.pieces) ? lot.pieces : [];

        // Aplatir les instances (quantité × pièce) avec leur demi-largeur réelle
        // On utilise resolveSections pour prendre le MAX sur toutes les sections
        var instances = [];
        pieces.forEach(function (piece) {
            if (!piece || typeof piece !== 'object') return;
            var qty = Math.max(1, Math.floor(parseFloat(piece.quantite) || 1));
            var secDimMm = 0;
            if (typeof window.resolveSections === 'function') {
                var secs = window.resolveSections(piece);
                secs.forEach(function (s) {
                    var dim = s.typeSection === 'circ'
                        ? (parseFloat(s.diametre) || 0)
                        : (parseFloat(s.largeur)  || 0);
                    if (dim > secDimMm) secDimMm = dim;
                });
            }
            if (!secDimMm) secDimMm = parseFloat(piece.largeur) || parseFloat(piece.diametre) || 100;
            var halfW = secDimMm / 2;
            for (var q = 0; q < qty; q++) {
                instances.push({ piece: piece, halfW: halfW });
            }
        });

        // Calcul des centres sur l'axe Y
        var centers = [];
        if (instances.length > 0) {
            var cx = instances[0].halfW;
            for (var ii = 0; ii < instances.length; ii++) {
                centers.push(cx);
                if (ii + 1 < instances.length) {
                    cx += 2 * instances[ii].halfW + instances[ii + 1].halfW;
                }
            }
        }

        instances.forEach(function (inst, ii) {
            var result = buildIFCMember(
                inst.piece, lot, meta, psetConfig, idCounter,
                centers[ii], globalPlacementId, geomCtxId, ownerHistId
            );
            dataLines = dataLines.concat(result.lines);
            memberIds.push('#' + result.memberEntityId);
        });

        // ── Relation IfcBuildingStorey → IfcMember (ContainedInSpatialStructure) ──
        if (memberIds.length > 0) {
            var relContainedId = idCounter.val++;
            dataLines.push('#' + relContainedId + "= IFCRELCONTAINEDINSPATIALSTRUCTURE('" + generateGUID() + "',#" + ownerHistId + ",$,$,(" + memberIds.join(',') + '),#' + storeyId + ');');
        }

        // ── Assemblage du fichier STEP ──
        var safeLotName = (lot.nomLot || lot.nom || 'lot').replace(/\s+/g, '_').replace(/'/g, '');
        var header = [
            'ISO-10303-21;',
            'HEADER;',
            "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
            "FILE_NAME('valobois_" + safeLotName + ".ifc','" + today + "',('VALOBOIS'),(''),",
            "  'VALOBOIS Export IFC4','IfcOpenShell','');",
            "FILE_SCHEMA(('IFC4'));",
            'ENDSEC;',
            'DATA;',
        ].join('\n');

        return header + '\n' + dataLines.join('\n') + '\nENDSEC;\nEND-ISO-10303-21;\n';
    }

    // ── Exposition globale ──
    window.buildIFC = buildIFC;

})();
