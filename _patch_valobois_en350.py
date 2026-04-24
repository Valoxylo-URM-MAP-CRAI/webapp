#!/usr/bin/env python3
"""
Patch essences-valobois.js:
  1. Add EN 350 new fields to every entry
  2. Add 3 missing entries from ESSENCES_BOIS
  3. Add `const ESSENCES_BOIS = ESSENCES_VALOBOIS;` alias
"""
import re
import unicodedata

def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', s).lower().strip()

# -------------------------------------------------------------------
# EN 350 data, keyed by norm(nomScientifique)
# Format: hylotrupes, anobium, termites, xylophagesMarins,
#         durabiliteChampignonsLabo, aubierLargeur, remarques
# hylotrupes = "n/a" for all Feuillus (set automatically if not in dict)
# -------------------------------------------------------------------
EN350_DATA = {
    # ── RÉSINEUX ────────────────────────────────────────────────────
    "abies alba / a. grandis": {
        "hylotrupes": "S", "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": "Sujet au bleuissement ; non résistant aux xylophages marins"
    },
    "cedrus atlantica": {
        "hylotrupes": "D", "anobium": "D", "termites": "M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "n/d",
        "remarques": None
    },
    "pseudotsuga menziesii": {
        "hylotrupes": "D", "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "3-5", "aubierLargeur": "s",
        "remarques": "Non résistant aux xylophages marins"
    },
    "picea abies": {
        "hylotrupes": "S", "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "4-5", "aubierLargeur": "x",
        "remarques": "Non résistant aux xylophages marins"
    },
    "picea sitchensis": {
        "hylotrupes": "D", "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "(x)",
        "remarques": "Non résistant aux xylophages marins"
    },
    "tsuga heterophylla": {
        "hylotrupes": "D", "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": None
    },
    "taxus baccata": {
        "hylotrupes": "D", "anobium": "D", "termites": "n/d", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "vs",
        "remarques": None
    },
    "larix decidua / l. kaempferi": {
        "hylotrupes": "D", "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "3-4", "aubierLargeur": "s",
        "remarques": "Non résistant aux xylophages marins"
    },
    "larix sibirica": {
        "hylotrupes": "D", "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "n/d",
        "remarques": None
    },
    "pinus uncinata": {
        "hylotrupes": "D", "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "m",
        "remarques": None
    },
    "pinus halepensis": {
        "hylotrupes": "D", "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "m",
        "remarques": None
    },
    "pinus nigra (laricio / nigra)": {
        "hylotrupes": "D", "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "3", "aubierLargeur": "m-b",
        "remarques": "Non résistant aux xylophages marins"
    },
    "pinus pinaster": {
        "hylotrupes": "D", "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "b",
        "remarques": "Non résistant aux xylophages marins"
    },
    "pinus pinea": {
        "hylotrupes": "D", "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "n/d",
        "remarques": "Non résistant aux xylophages marins"
    },
    "pinus radiata": {
        "hylotrupes": "D", "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "b",
        "remarques": "Non résistant aux xylophages marins"
    },
    "pinus sylvestris": {
        "hylotrupes": "D", "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "2-5", "aubierLargeur": "s-m",
        "remarques": "Durabilité très variable vis-à-vis des basidiomycètes en conditions de laboratoire"
    },
    "pinus strobus": {
        "hylotrupes": "D", "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "b",
        "remarques": "Non résistant aux xylophages marins"
    },
    "thuja plicata": {
        "hylotrupes": "D", "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": "Non résistant aux xylophages marins"
    },
    "sequoia sempervirens": {
        "hylotrupes": "n/d", "anobium": "n/d", "termites": "M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "n/d",
        "remarques": None
    },
    # ── FEUILLUS TEMPÉRÉS ──────────────────────────────────────────
    "alnus glutinosa / a. cordata": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": "Non résistant à Trichoferus holosericeus"
    },
    "betula pubescens / b. pendula": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": None
    },
    "betula alleghaniensis": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": None
    },
    "carpinus betulus": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": None
    },
    "castanea sativa": {
        "anobium": "D", "termites": "M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "1", "aubierLargeur": "s",
        "remarques": "Aubier non résistant à Trichoferus holosericeus ; non résistant aux xylophages marins"
    },
    "prunus avium": {
        "anobium": "S", "termites": "D", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "n/d",
        "remarques": None
    },
    "quercus alba": {
        "anobium": "D", "termites": "M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": "Aubier non résistant à Lyctus"
    },
    "quercus cerris": {
        "anobium": "n/d", "termites": "M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "b",
        "remarques": "Aubier Lyctus n/d ; non résistant à Trichoferus holosericeus"
    },
    "quercus palustris": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "n/d",
        "remarques": None
    },
    "quercus robur / q. petraea": {
        "anobium": "D", "termites": "M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "1-2", "aubierLargeur": "s",
        "remarques": "Aubier non résistant à Lyctus ni à Trichoferus holosericeus"
    },
    "quercus rubra": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "3", "aubierLargeur": "s",
        "remarques": "Aubier non résistant à Lyctus"
    },
    "acer pseudoplatanus / a. platanoides": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": "Non résistant aux xylophages marins"
    },
    "fraxinus excelsior": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "4", "aubierLargeur": "(x)",
        "remarques": "Non résistant aux xylophages marins"
    },
    "fagus sylvatica": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "4-5", "aubierLargeur": "x",
        "remarques": "Non résistant à Trichoferus holosericeus ; l'imprégnabilité (4) concerne le cœur rouge"
    },
    "carya spp.": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": None
    },
    "aesculus hippocastanum": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": None
    },
    "juglans regia": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "juglans nigra": {
        "anobium": "n/d", "termites": "n/d", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "ulmus spp.": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "paulownia tomentosa / p. fortunei": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "n/d",
        "remarques": "Non résistant aux xylophages marins"
    },
    "populus spp.": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "5", "aubierLargeur": "x",
        "remarques": "Non résistant à Trichoferus holosericeus ; sujet au bleuissement"
    },
    "platanus x hispanica": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "n/d",
        "remarques": "Non résistant aux xylophages marins"
    },
    "robinia pseudoacacia": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "1-2", "aubierLargeur": "vs",
        "remarques": "Non résistant aux xylophages marins"
    },
    "tilia spp.": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": None
    },
    # ── FEUILLUS TROPICAUX ─────────────────────────────────────────
    "khaya spp.": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "swietenia macrophylla / s. mahagoni": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "m",
        "remarques": None
    },
    "pericopsis elata": {
        "anobium": "D", "termites": "S-M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "1-2", "aubierLargeur": "vs",
        "remarques": None
    },
    "peltogyne spp.": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "carapa guianensis": {
        "anobium": "S", "termites": "M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "dicorynia guianensis": {
        "anobium": "D", "termites": "M", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": "2", "aubierLargeur": "s",
        "remarques": None
    },
    "chrysophyllum spp. (aningeria spp.)": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": None
    },
    "triplochiton scleroxylon": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "4", "aubierLargeur": "x",
        "remarques": "Non résistant à Lyctus ; sujet au bleuissement"
    },
    "lophira alata": {
        "anobium": "D", "termites": "M-D", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "1-2", "aubierLargeur": "s",
        "remarques": None
    },
    "nauclea diderrichii": {
        "anobium": "n/d", "termites": "D", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": "Non résistant aux termites en laboratoire"
    },
    "ochroma pyramidale": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": None
    },
    "shorea laevis / s. maxwelliana": {
        "anobium": "D", "termites": "D(S)", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": "2", "aubierLargeur": "s",
        "remarques": "Non résistant aux termites en laboratoire"
    },
    "guarea cedrata": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "2", "aubierLargeur": "m",
        "remarques": None
    },
    "guibourtia spp.": {
        "anobium": "D", "termites": "S-M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "2", "aubierLargeur": "s",
        "remarques": None
    },
    "hymenaea courbaril": {
        "anobium": "n/d", "termites": "S-M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s-l",
        "remarques": None
    },
    "dipteryx odorata": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "piptadeniastrum africanum": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "3", "aubierLargeur": "m-b",
        "remarques": None
    },
    "lovoa trichilioides": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s-m",
        "remarques": None
    },
    "afzelia spp.": {
        "anobium": "D", "termites": "D(S)", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": "Non résistant aux termites en laboratoire"
    },
    "eucalyptus marginata": {
        "anobium": "n/d", "termites": "M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "1", "aubierLargeur": "s",
        "remarques": None
    },
    "eucalyptus globulus": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "terminalia superba": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "(x)",
        "remarques": "Non résistant à Lyctus"
    },
    "terminalia ivorensis": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "(x)",
        "remarques": None
    },
    "apuleia leiocarpa": {
        "anobium": "D", "termites": "M", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "m",
        "remarques": None
    },
    "handroanthus spp.": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s-m",
        "remarques": None
    },
    "milicia excelsa / m. regia": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": "1-2", "aubierLargeur": "m",
        "remarques": "Aubier non résistant à Lyctus ; non résistant aux termites en laboratoire"
    },
    "mezilaurus itauba": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "dryobalanops spp.": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "S",
        "durabiliteChampignonsLabo": "1-2", "aubierLargeur": "m",
        "remarques": None
    },
    "koompassia malaccensis": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": "Aubier non résistant à Lyctus"
    },
    "entandrophragma candollei": {
        "anobium": "D", "termites": "M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": "2-3", "aubierLargeur": "s",
        "remarques": None
    },
    "nesogordonia papaverifera": {
        "anobium": "D", "termites": "M-D", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "pterygota macrocarpa": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": "Non résistant à Lyctus ; sujet au bleuissement"
    },
    "tieghemella heckelii / t. africana": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "m",
        "remarques": None
    },
    "mansonia altissima": {
        "anobium": "D", "termites": "M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "intsia spp.": {
        "anobium": "n/d", "termites": "D(S)", "xylophagesMarins": "S",
        "durabiliteChampignonsLabo": "1-2", "aubierLargeur": "m",
        "remarques": "Non résistant aux termites en laboratoire"
    },
    "shorea spp.": {
        "anobium": "n/d", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "m",
        "remarques": None
    },
    "baillonella toxisperma": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "m",
        "remarques": "Non résistant aux termites en laboratoire"
    },
    "distemonanthus benthamianus": {
        "anobium": "D", "termites": "M", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "astronium fraxinifolium / a. lecointei": {
        "anobium": "n/d", "termites": "D", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "m-l",
        "remarques": None
    },
    "autranella congolensis": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "heritiera spp.": {
        "anobium": "D", "termites": "M-D", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "m",
        "remarques": None
    },
    "staudtia kamerunensis": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "S",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "m",
        "remarques": None
    },
    "cylicodiscus gabunensis": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "aucoumea klaineana": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "S",
        "durabiliteChampignonsLabo": "4-5", "aubierLargeur": "s",
        "remarques": None
    },
    "pterocarpus soyauxii / p. tinctorius": {
        "anobium": "D", "termites": "D(S)", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": "1", "aubierLargeur": "m",
        "remarques": "Non résistant aux termites en laboratoire"
    },
    "gonystylus spp.": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": "Non résistant à Lyctus ; très sujet au bleuissement"
    },
    "entandrophragma cylindricum": {
        "anobium": "D", "termites": "M", "xylophagesMarins": "S",
        "durabiliteChampignonsLabo": "3-4", "aubierLargeur": "m",
        "remarques": None
    },
    "entandrophragma utile": {
        "anobium": "D", "termites": "M", "xylophagesMarins": "M",
        "durabiliteChampignonsLabo": "2-3", "aubierLargeur": "m",
        "remarques": None
    },
    "erythrophleum spp.": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "bagassa guianensis": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "tectona grandis": {
        "anobium": "D", "termites": "M", "xylophagesMarins": "M-D",
        "durabiliteChampignonsLabo": "1-3", "aubierLargeur": "s",
        "remarques": None
    },
    "entandrophragma angolense": {
        "anobium": "D", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "b",
        "remarques": None
    },
    "gossweilerodendron balsamiferum": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "m",
        "remarques": None
    },
    "virola spp.": {
        "anobium": "S", "termites": "S", "xylophagesMarins": "n/d",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "x",
        "remarques": "Non résistant à Lyctus"
    },
    "vouacapoua americana": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "D",
        "durabiliteChampignonsLabo": None, "aubierLargeur": "s",
        "remarques": None
    },
    "millettia laurentii / m. stuhlmannii": {
        "anobium": "D", "termites": "D", "xylophagesMarins": "S",
        "durabiliteChampignonsLabo": "2", "aubierLargeur": "s",
        "remarques": "Non résistant aux termites en laboratoire"
    },
}

# -------------------------------------------------------------------
# 3 new entries to add (missing from ESSENCES_VALOBOIS)
# -------------------------------------------------------------------
NEW_ENTRIES = [
    # Bangkirai (Nauclea orientalis) — absent de VALOBOIS mais présent dans BOIS
    """{
        nomUsuel: "Bangkirai (Nauclea)",
        nomScientifique: "Nauclea orientalis",
        type: "Feuillu", origine: "Asie du Sud-Est",
        massevolumique: null, massevolumiqueRange: null, sourceDensite: "n/d",
        durabiliteChampignons: "n/d", impregnabiliteBoisParfait: "n/d", impregnabiliteAubier: "n/d",
        hylotrupes: "n/a", anobium: "n/d", termites: "n/d", xylophagesMarins: "n/d",
        durabiliteChampignonsLabo: null, aubierLargeur: "n/d",
        basidiomycetes: "n/d", pourriture: "n/d", contactSol: "n/d",
        remarques: null
    }""",
    # Cerisier / Prunus cerasus — distinct de Prunus avium (Merisier)
    """{
        nomUsuel: "Cerisier (Griotte)",
        nomScientifique: "Prunus cerasus",
        type: "Feuillu", origine: "Europe",
        massevolumique: null, massevolumiqueRange: null, sourceDensite: "n/d",
        durabiliteChampignons: "n/d", impregnabiliteBoisParfait: "n/d", impregnabiliteAubier: "n/d",
        hylotrupes: "n/a", anobium: "n/d", termites: "n/d", xylophagesMarins: "n/d",
        durabiliteChampignonsLabo: null, aubierLargeur: "n/d",
        basidiomycetes: "n/d", pourriture: "n/d", contactSol: "n/d",
        remarques: null
    }""",
    # Pommier cultivé / Malus domestica — distinct de Malus sylvestris
    """{
        nomUsuel: "Pommier cultivé",
        nomScientifique: "Malus domestica",
        type: "Feuillu", origine: "Europe",
        massevolumique: null, massevolumiqueRange: null, sourceDensite: "n/d",
        durabiliteChampignons: "n/d", impregnabiliteBoisParfait: "n/d", impregnabiliteAubier: "n/d",
        hylotrupes: "n/a", anobium: "n/d", termites: "n/d", xylophagesMarins: "n/d",
        durabiliteChampignonsLabo: null, aubierLargeur: "n/d",
        basidiomycetes: "n/d", pourriture: "n/d", contactSol: "n/d",
        remarques: null
    }""",
]

# -------------------------------------------------------------------
# Transformation logic
# -------------------------------------------------------------------
INPUT_FILE = 'js/data/essences-valobois.js'

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Detect if already patched
if 'hylotrupes:' in content:
    print("File appears already patched. Skipping re-patch.")
    # Still add alias if missing
    if 'const ESSENCES_BOIS = ESSENCES_VALOBOIS' not in content:
        idx = content.index('const normalizeEssenceLookupKey')
        alias = '// Alias for backward-compatibility with ESSENCES_BOIS consumers\nconst ESSENCES_BOIS = ESSENCES_VALOBOIS;\n\n'
        content = content[:idx] + alias + content[idx:]
        with open(INPUT_FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Alias added.")
    exit(0)

def js_str(val):
    if val is None:
        return 'null'
    return f'"{val}"'

def build_new_fields(nomSci, nomUsuel, typ, durabiliteChampignons):
    key = norm(nomSci)
    d = EN350_DATA.get(key, {})

    is_res = 'sineux' in (typ or '').lower()

    h = d.get('hylotrupes', 'n/d' if is_res else 'n/a')
    a = d.get('anobium', 'n/d')
    t = d.get('termites', 'n/d')
    xm = d.get('xylophagesMarins', 'n/d')
    dcl = d.get('durabiliteChampignonsLabo', None)
    al = d.get('aubierLargeur', 'n/d')
    rem = d.get('remarques', None)

    basi = durabiliteChampignons if durabiliteChampignons else 'n/d'

    lines = [
        f'        hylotrupes: "{h}", anobium: "{a}",',
        f'        termites: "{t}", xylophagesMarins: "{xm}",',
        f'        durabiliteChampignonsLabo: {js_str(dcl)}, aubierLargeur: "{al}",',
        f'        basidiomycetes: "{basi}", pourriture: "n/d", contactSol: "n/d",',
        f'        remarques: {js_str(rem)}',
    ]
    return '\n' + '\n'.join(lines)

# Pattern: find each object entry in the array
# Each entry ends with: impregnabiliteAubier: "..."  followed by optional whitespace then }
ENTRY_PATTERN = re.compile(
    r'(\{[^{}]*?nomUsuel:[^{}]*?impregnabiliteAubier:\s*"[^"]*")(\s*\n\s*\})',
    re.DOTALL
)

def replace_entry(m):
    entry_head = m.group(1)
    entry_tail = m.group(2)

    sci_m = re.search(r'nomScientifique:\s*"([^"]+)"', entry_head)
    nom_sci = sci_m.group(1) if sci_m else ''

    usuel_m = re.search(r'nomUsuel:\s*"([^"]+)"', entry_head)
    nom_usuel = usuel_m.group(1) if usuel_m else ''

    type_m = re.search(r'type:\s*"([^"]+)"', entry_head)
    typ = type_m.group(1) if type_m else ''

    basi_m = re.search(r'durabiliteChampignons:\s*"([^"]+)"', entry_head)
    basi_val = basi_m.group(1) if basi_m else ''

    new_fields = build_new_fields(nom_sci, nom_usuel, typ, basi_val)
    return entry_head + ',' + new_fields + entry_tail

new_content = ENTRY_PATTERN.sub(replace_entry, content)

# Verify at least one entry was patched
if 'hylotrupes:' not in new_content:
    print("ERROR: no entries were patched! Check the regex pattern.")
    exit(1)

# Count how many entries were patched
n_patched = new_content.count('hylotrupes:')
print(f"Patched {n_patched} entries.")

# Add the 3 missing entries before the closing ]; of ESSENCES_VALOBOIS
# Find the last }  in the array followed by ]; 
last_entry_end = new_content.rfind('\n];')
if last_entry_end == -1:
    print("ERROR: Could not find end of ESSENCES_VALOBOIS array")
    exit(1)

new_entries_str = ',\n' + ',\n'.join(NEW_ENTRIES)
new_content = new_content[:last_entry_end] + new_entries_str + '\n' + new_content[last_entry_end:]

print(f"Added {len(NEW_ENTRIES)} new entries.")

# Add alias before normalizeEssenceLookupKey
alias = '\n// Alias for backward-compatibility with ESSENCES_BOIS consumers\nconst ESSENCES_BOIS = ESSENCES_VALOBOIS;\n\n'
idx = new_content.index('const normalizeEssenceLookupKey')
new_content = new_content[:idx] + alias + new_content[idx:]

print("Added ESSENCES_BOIS alias.")

with open(INPUT_FILE, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Done. File written to {INPUT_FILE}")
