#!/usr/bin/env python3
"""
Génère une table de correspondance : cantons ante-2015 → cantons post-2015
à partir du Code Officiel Géographique (COG) INSEE.

Principe :
  Chaque commune porte à la fois son code de canton pré-réforme (COG 2014)
  et post-réforme (COG 2024). En joignant les deux fichiers sur le code commune,
  on reconstruit la correspondance ancien_canton → nouveau_canton.

Sources :
  COG 2024 (post-réforme) : https://www.insee.fr/fr/information/6800675
  COG 2014 (pré-réforme)  : https://www.insee.fr/fr/information/1407739
  Alternative data.gouv   : https://www.data.gouv.fr/fr/datasets/code-officiel-geographique-cog/

Dépendances :
  pip install pandas requests

Usage :
  python generate-canton-correspondance.py [--output canton_correspondance.csv]
  python generate-canton-correspondance.py --cog2014 /chemin/communes2014.csv

Notes :
  - La réforme de mars 2015 a généralement fusionné 2 anciens cantons en 1 nouveau.
  - Les anciens cantons éclatés sur plusieurs nouveaux sont signalés en fin d'exécution.
  - Les codes canton pré-2015 sont pairs, post-2015 sont impairs (convention INSEE).
"""

import argparse
import io
import sys
import zipfile
from pathlib import Path

import requests
import pandas as pd

# ── URLs INSEE ────────────────────────────────────────────────────────────────
# Ajuster l'année dans les URLs si une version plus récente est disponible.
# COG 2023 (post-réforme, millésime le plus récent disponible sur cette page)
URL_COG2024_COMMUNES = "https://www.insee.fr/fr/statistiques/fichier/6800675/v_commune_2023.csv"
URL_COG2024_CANTONS  = "https://www.insee.fr/fr/statistiques/fichier/6800675/v_canton_2023.csv"
URL_COG2024_ZIP      = "https://www.insee.fr/fr/statistiques/fichier/6800675/cog_ensemble_2023_csv.zip"

# COG 2015 — premier millésime post-réforme cantonale (mars 2015).
# L'URL est celle de la page « autres millésimes » INSEE.
# Fallback : COG 2014 (dernier pré-réforme) depuis data.gouv.fr
# COG 2011 communes (référence de la FD P 20-651, format TXT tab-séparé)
URL_COG2014_ZIP = "https://www.insee.fr/fr/statistiques/fichier/2560625/comsimp2011-txt.zip"
# COG 2011 cantons (format TXT tab-séparé)
URL_COG2015_CANTONS_ZIP = "https://www.insee.fr/fr/statistiques/fichier/2560625/canton2011-txt.zip"

HEADERS = {"User-Agent": "cog-canton-mapper/1.0 (recherche/non-commercial)"}


# ── Utilitaires I/O ───────────────────────────────────────────────────────────

def download(url: str, label: str = "") -> bytes:
    """Télécharge une URL et retourne les octets bruts."""
    print(f"  ↓ {label or url}")
    r = requests.get(url, headers=HEADERS, timeout=120)
    r.raise_for_status()
    return r.content


def smart_read_csv(raw: bytes, enc: str = "utf-8-sig") -> pd.DataFrame:
    """Lit un CSV/TSV en détectant automatiquement le séparateur (tab, , ou ;)."""
    text = raw.decode(enc, errors="replace")
    sample = text[:1000]
    if "\t" in sample:
        sep = "\t"
    elif sample.count(";") > sample.count(","):
        sep = ";"
    else:
        sep = ","
    return pd.read_csv(io.StringIO(text), sep=sep, dtype=str, low_memory=False)


def read_zip_csv(raw: bytes, hint: str = "commune", enc: str = "cp1252") -> pd.DataFrame:
    """Extrait et lit le premier CSV ou TXT (dont le nom contient 'hint') d'un fichier ZIP."""
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        all_files = [n for n in zf.namelist() if n.lower().endswith((".csv", ".txt"))]
        target = next(
            (n for n in all_files if hint.lower() in n.lower()),
            all_files[0] if all_files else None,
        )
        if target is None:
            raise FileNotFoundError(
                f"Aucun CSV/TXT trouvé dans le ZIP. Contenus : {zf.namelist()}"
            )
        print(f"    Extrait : {target}")
        return smart_read_csv(zf.read(target), enc=enc)


def normalize_cols(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = df.columns.str.strip().str.upper()
    return df


def full_canton_code(dep: str, can: str) -> str:
    """Concatène DEP et CAN en code canton 4 ou 5 caractères.
    Exemples : dep='01', can='01' → '0101' ; dep='2A', can='03' → '2A03'
    """
    d = str(dep).strip().upper()
    c = str(can).strip().zfill(2)
    # Pour la Corse (2A, 2B) on ne padde pas le département
    if not d.isdigit():
        return d + c
    return d.zfill(2) + c


# ── Chargement COG 2024 ───────────────────────────────────────────────────────

def load_communes_2024(url: str) -> pd.DataFrame:
    """
    Retourne un DataFrame [COM, DEP, canton_24] depuis le COG 2024.
    Colonnes attendues dans v_commune_2024.csv :
      TYPECOM, COM, DEP, CAN, LIBELLE, ...
    """
    df = normalize_cols(smart_read_csv(download(url, "communes COG 2024")))
    print(f"    Colonnes : {list(df.columns)}")

    if "TYPECOM" in df.columns:
        df = df[df["TYPECOM"] == "COM"].copy()

    req = {"COM", "DEP", "CAN"}
    missing = req - set(df.columns)
    if missing:
        raise ValueError(
            f"Colonnes manquantes dans le fichier communes 2024 : {missing}\n"
            f"Colonnes trouvées : {list(df.columns)}"
        )

    df = df[df["COM"].notna() & df["CAN"].notna() & (df["CAN"] != "")].copy()
    # Exclure DOM-TOM et pseudo-cantons (CAN = '00' = communes-ville non cantonées)
    df = df[~df["DEP"].str[:2].isin(["97", "98", "99"])].copy()
    df = df[df["CAN"] != "00"].copy()
    df["canton_24"] = df.apply(lambda r: full_canton_code(r["DEP"], r["CAN"]), axis=1)
    print(f"    {len(df)} communes post-2015 avec canton assigné")
    return df[["COM", "DEP", "canton_24"]].copy()


def load_canton_names(url: str, label: str = "cantons") -> dict:
    """
    Retourne {code_canton_complet: nom_lisible} depuis un fichier COG cantons.
    Colonnes attendues : DEP, CAN (ou CANTON), LIBELLE (ou NCCENR ou NCC)
    """
    try:
        df = normalize_cols(smart_read_csv(download(url, label)))
        print(f"    Colonnes : {list(df.columns)}")

        if "DEP" in df.columns and "CAN" in df.columns:
            df["code"] = df.apply(lambda r: full_canton_code(r["DEP"], r["CAN"]), axis=1)
        elif "CANTON" in df.columns:
            df["code"] = df["CANTON"].str.strip()
        else:
            return {}

        nom_col = next(
            (c for c in ["LIBELLE", "NCCENR", "NCC"] if c in df.columns), None
        )
        if nom_col is None:
            return {}
        return df.set_index("code")[nom_col].to_dict()
    except Exception as e:
        print(f"    ⚠ Noms cantons non disponibles : {e}")
        return {}


# ── Chargement COG 2014 ───────────────────────────────────────────────────────

def load_communes_2014_from_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Prépare le DataFrame communes pré-réforme.
    Colonnes attendues : COM, DEP, CAN  (format v_commune_2014.csv ou similaire)
    Ancien format ZIP COG : peut utiliser 'ACTUAL' au lieu de 'TYPECOM'.
    """
    if "TYPECOM" in df.columns:
        df = df[df["TYPECOM"] == "COM"].copy()
    elif "ACTUAL" in df.columns:
        # Ancien format : ACTUAL = 1 pour commune ordinaire
        df = df[df["ACTUAL"].isin(["1", "1.0"])].copy()

    # Format COG pré-2019 : colonne canton = CT (pas CAN)
    if "CT" in df.columns and "CAN" not in df.columns:
        df = df.rename(columns={"CT": "CAN"})

    req = {"COM", "DEP", "CAN"}
    missing = req - set(df.columns)
    if missing:
        raise ValueError(
            f"Colonnes manquantes dans le fichier communes 2014 : {missing}\n"
            f"Colonnes trouvées : {list(df.columns)}"
        )

    df = df[df["COM"].notna() & df["CAN"].notna() & (df["CAN"] != "")].copy()
    # Format COG pré-2019 : COM sur 3 chars → reconstruire code commune à 5 chars
    sample_com = df["COM"].dropna().iloc[0] if len(df) > 0 else ""
    if len(str(sample_com).strip()) <= 3:
        df = df.copy()
        df["COM"] = df["DEP"].str.strip() + df["COM"].str.strip().str.zfill(3)
    df = df[~df["DEP"].str[:2].isin(["97", "98", "99"])].copy()
    df = df[df["CAN"] != "00"].copy()
    df["canton_14"] = df.apply(lambda r: full_canton_code(r["DEP"], r["CAN"]), axis=1)
    print(f"    {len(df)} communes pré-2015 avec canton assigné")
    return df[["COM", "DEP", "canton_14"]].copy()


def load_communes_2014(zip_url: str, local_path: Path | None = None) -> tuple:
    """
    Charge le COG 2014 (ZIP distant ou fichier local).
    Retourne (df_communes, dict_noms_cantons).
    """
    zip_raw = None
    df_communes_raw = None

    # 1) Fichier local prioritaire
    if local_path and local_path.exists():
        print(f"    Chargement fichier local : {local_path}")
        df_communes_raw = normalize_cols(
            pd.read_csv(local_path, dtype=str, low_memory=False)
        )

    # 2) Téléchargement ZIP distant
    if df_communes_raw is None:
        try:
            zip_raw = download(zip_url, "COG 2014 (ZIP)")
        except Exception as e:
            raise RuntimeError(
                f"Impossible de télécharger le COG 2014 ({e}).\n"
                "Solutions :\n"
                "  a) Téléchargez manuellement depuis https://www.insee.fr/fr/information/1407739\n"
                "     puis relancez avec --cog2014 /chemin/vers/communes2014.csv\n"
                "  b) Essayez data.gouv.fr : https://www.data.gouv.fr/fr/datasets/"
                "code-officiel-geographique-cog/"
            ) from e
        df_communes_raw = normalize_cols(read_zip_csv(zip_raw, hint="commune"))

    df_communes = load_communes_2014_from_df(df_communes_raw)

    # Noms des anciens cantons (depuis le même ZIP si disponible)
    noms_anciens = {}
    if zip_raw is not None:
        try:
            canton_raw = download(URL_COG2015_CANTONS_ZIP, "COG 2011 cantons (ZIP)")
            df_can = normalize_cols(read_zip_csv(canton_raw, hint="canton", enc="cp1252"))
            # Format pré-2019 : colonne CANTON (pas CAN)
            if "CANTON" in df_can.columns and "CAN" not in df_can.columns:
                df_can = df_can.rename(columns={"CANTON": "CAN"})
            if "DEP" in df_can.columns and "CAN" in df_can.columns:
                df_can["code"] = df_can.apply(
                    lambda r: full_canton_code(r["DEP"], r["CAN"]), axis=1
                )
                nom_col = next(
                    (c for c in ["LIBELLE", "NCCENR", "NCC"] if c in df_can.columns), None
                )
                if nom_col:
                    noms_anciens = df_can.set_index("code")[nom_col].to_dict()
                    print(f"    {len(noms_anciens)} noms anciens cantons chargés")
        except Exception as e:
            print(f"    ⚠ Noms anciens cantons non disponibles : {e}")

    return df_communes, noms_anciens


# ── Construction de la correspondance ─────────────────────────────────────────

def build_correspondence(
    df14: pd.DataFrame,
    df24: pd.DataFrame,
    names_14: dict,
    names_24: dict,
) -> pd.DataFrame:
    """
    Jointure communes 2014 ↔ 2024 sur le code commune.
    Retourne un DataFrame avec les colonnes :
      departement, code_ancien_canton, nom_ancien_canton,
      code_nouveau_canton, nom_nouveau_canton, nb_communes
    Trié par département puis par poids (nb_communes décroissant).
    """
    merged = pd.merge(df14, df24[["COM", "canton_24"]], on="COM", how="inner")
    print(
        f"  {len(merged)} communes jointes "
        f"(pré: {len(df14)}, post: {len(df24)})"
    )
    if len(merged) == 0:
        raise ValueError(
            "Aucune commune jointe — vérifier que les codes communes COM "
            "sont au même format (5 chiffres) dans les deux fichiers."
        )

    grp = (
        merged
        .groupby(["DEP", "canton_14", "canton_24"])
        .agg(nb_communes=("COM", "count"))
        .reset_index()
        .sort_values(
            ["DEP", "canton_14", "nb_communes"],
            ascending=[True, True, False],
        )
    )

    grp["nom_ancien_canton"] = grp["canton_14"].map(names_14).fillna("")
    grp["nom_nouveau_canton"] = grp["canton_24"].map(names_24).fillna("")

    return grp.rename(columns={
        "DEP":       "departement",
        "canton_14": "code_ancien_canton",
        "canton_24": "code_nouveau_canton",
    })[
        ["departement", "code_ancien_canton", "nom_ancien_canton",
         "code_nouveau_canton", "nom_nouveau_canton", "nb_communes"]
    ].reset_index(drop=True)


def report(result: pd.DataFrame, names_14: dict) -> None:
    print(f"\n  {len(result)} lignes de correspondance")
    print(
        f"  {result['code_ancien_canton'].nunique()} anciens cantons → "
        f"{result['code_nouveau_canton'].nunique()} nouveaux cantons"
    )

    # Anciens cantons répartis sur >1 nouveau (cas rares — commune à cheval impossible
    # au niveau du canton, mais peut arriver si des communes ont changé de DEP entre
    # les deux millésimes)
    eclatements = result.groupby("code_ancien_canton")["code_nouveau_canton"].nunique()
    multi = eclatements[eclatements > 1].sort_values(ascending=False)
    if not multi.empty:
        print(f"\n  ⚠  {len(multi)} anciens cantons présents dans >1 nouveau canton :")
        for code, n in multi.head(20).items():
            nom = names_14.get(code, "?")
            print(f"     {code}  {nom:<40s}  → {n} nouveaux cantons")

    # Nouveaux cantons couvrant le plus d'anciens cantons
    coverage = result.groupby("code_nouveau_canton")["code_ancien_canton"].nunique()
    big = coverage[coverage > 2].sort_values(ascending=False)
    if not big.empty:
        print(f"\n  ℹ  {len(big)} nouveaux cantons regroupant >2 anciens cantons :")
        for code, n in big.head(10).items():
            print(f"     {code}  → {n} anciens cantons")


# ── Point d'entrée ────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument(
        "--output", "-o",
        default="canton_correspondance.csv",
        metavar="FILE",
        help="Chemin du CSV de sortie (défaut : canton_correspondance.csv)",
    )
    ap.add_argument(
        "--cog2014",
        metavar="FILE",
        help=(
            "Chemin vers un fichier communes pré-2015 (CSV local, "
            "colonnes COM, DEP, CAN) — évite le téléchargement du ZIP INSEE"
        ),
    )
    ap.add_argument(
        "--cog2014-zip-url",
        default=URL_COG2014_ZIP,
        metavar="URL",
        help=f"URL du ZIP COG 2014 (défaut : {URL_COG2014_ZIP})",
    )
    args = ap.parse_args()

    local14 = Path(args.cog2014) if args.cog2014 else None

    print("=== Chargement COG 2024 (post-réforme) ===")
    df24    = load_communes_2024(URL_COG2024_COMMUNES)
    names24 = load_canton_names(URL_COG2024_CANTONS, "noms cantons 2024")
    print(f"    {len(names24)} noms de cantons post-2015 chargés")

    print("\n=== Chargement COG 2014 (pré-réforme) ===")
    df14, names14 = load_communes_2014(args.cog2014_zip_url, local14)

    print("\n=== Calcul des correspondances ===")
    result = build_correspondence(df14, df24, names14, names24)

    output = Path(args.output)
    result.to_csv(output, index=False, encoding="utf-8-sig")
    print(f"\n✓ Fichier généré : {output.resolve()}")
    report(result, names14)


if __name__ == "__main__":
    main()
