(function () {
    const PAIRS = [
        ['liste-type-batiment', typeof DATALIST_TYPE_BATIMENT !== 'undefined' ? DATALIST_TYPE_BATIMENT : null],
        ['liste-phase-intervention', typeof DATALIST_PHASE_INTERVENTION !== 'undefined' ? DATALIST_PHASE_INTERVENTION : null],
        ['liste-conditionnement', typeof DATALIST_CONDITIONNEMENT !== 'undefined' ? DATALIST_CONDITIONNEMENT : null],
        ['liste-protection', typeof DATALIST_PROTECTION !== 'undefined' ? DATALIST_PROTECTION : null],
        ['liste-situations', typeof DATALIST_SITUATIONS_LOT !== 'undefined' ? DATALIST_SITUATIONS_LOT : null]
    ];

    function fillDatalist(id, values) {
        if (!Array.isArray(values) || values.length === 0) return;
        const el = document.getElementById(id);
        if (!el || el.children.length > 0) return;
        values.forEach((v) => {
            const o = document.createElement('option');
            o.value = v;
            el.appendChild(o);
        });
    }

    function run() {
        PAIRS.forEach(([id, values]) => fillDatalist(id, values));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
