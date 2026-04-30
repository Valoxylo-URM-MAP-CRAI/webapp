const normalizeTropixEssenceKey = (value) => (value == null ? '' : String(value))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const TROPIX_ESSENCES = [
    {
        "region": "Afrique",
        "essence": "ABURA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ABURA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ACAJOU CAILCÉDRAT",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ACAJOU%20CAILC%C3%89DRAT%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ACAJOU D'AFRIQUE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ACAJOU%20D%27AFRIQUE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "AFRORMOSIA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/AFRORMOSIA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "AIÉLÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/AI%C3%89L%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "AKO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/AKO%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "AKOSSIKA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/AKOSSIKA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ALEP",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ALEP%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ALUMBI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ALUMBI%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ANANTA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ANANTA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Afrique",
        "essence": "ANDOK",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ANDOK%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ANDOUNG",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ANDOUNG%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ANGOA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ANGOA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ANGUEUK",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ANGUEUK%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ANIÉGRÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ANI%C3%89GR%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ANZÈM NTÉNÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ANZ%C3%88M%20NT%C3%89N%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "AVODIRÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/AVODIR%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "AWOURA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/AWOURA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Afrique",
        "essence": "AYOUS",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/AYOUS%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "AZOBÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/AZOB%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "BILINGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/BILINGA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "BODIOA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/BODIOA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "BOMANGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/BOMANGA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "BOSSÉ CLAIR",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/BOSS%C3%89%20CLAIR%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "BOSSÉ FONCÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/BOSS%C3%89%20FONC%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "BUBINGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/BUBINGA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "BÉTÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/B%C3%89T%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "COCOTIER",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/COCOTIER%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "CONGOTALI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/CONGOTALI%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "CORDIA D'AFRIQUE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/CORDIA%20D%27AFRIQUE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "COULA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/COULA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "DABÉMA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/DAB%C3%89MA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Afrique",
        "essence": "DIANIA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/DIANIA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "DIBÉTOU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/DIB%C3%89TOU%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "DIFOU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/DIFOU%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "DOUKA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/DOUKA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "DOUSSIÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/DOUSSI%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "EBIARA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/EBIARA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "EBÈNE D'AFRIQUE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/EB%C3%88NE%20D%27AFRIQUE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "EKABA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/EKABA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "EKOUNE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/EKOUNE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "EMIEN",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/EMIEN%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ESSESSANG",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ESSESSANG%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ESSIA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ESSIA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ETIMOÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ETIMO%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "EVEUSS",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/EVEUSS%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "EYONG",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/EYONG%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "EYOUM",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/EYOUM%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "FARO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/FARO%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "FRAMIRÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/FRAMIR%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "FUMA ou FROMAGER",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/FUMA%20ou%20FROMAGER%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "GHÉOMBI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/GH%C3%89OMBI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Afrique",
        "essence": "GOMBÉ ROUGE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/GOMB%C3%89%20ROUGE%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Afrique",
        "essence": "GOMBÉ TOWÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/GOMB%C3%89%20TOW%C3%89%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Afrique",
        "essence": "GRENADILLO GRENADILLE D'AFRIQUE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/GRENADILLO%20GRENADILLE%20D%27AFRIQUE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "IATANDZA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/IATANDZA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "IDÉWA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ID%C3%89WA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "IGAGANGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/IGAGANGA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Afrique",
        "essence": "ILOMBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ILOMBA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "IROKO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/IROKO%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "IZOMBÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/IZOMB%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "KANDA BRUN",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/KANDA%20BRUN%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "KANDA ROSE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/KANDA%20ROSE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "KAPOKIER",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/KAPOKIER%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "KONDROTI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/KONDROTI%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "KOSIPO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/KOSIPO%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "KOTIBÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/KOTIB%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "KOTO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/KOTO%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "KUMBI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/KUMBI%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "KÉKÉLÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/K%C3%89K%C3%89L%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "LANDA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/LANDA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "LATI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/LATI%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "LIMBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/LIMBA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "LIMBALI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/LIMBALI%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "LONGHI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/LONGHI%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "LOTOFA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/LOTOFA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "MAKORÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/MAKOR%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "MAMBODÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/MAMBOD%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "MECRUSSÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/MECRUSS%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "MOABI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/MOABI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Afrique",
        "essence": "MONGHINZA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/MONGHINZA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "MOVINGUI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/MOVINGUI%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "MUBALA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/MUBALA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "MUHUHU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/MUHUHU%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "MUKULUNGU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/MUKULUNGU%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "MUSIZI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/MUSIZI%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "MUTÉNYÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/MUT%C3%89NY%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "NAGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/NAGA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "NIANGON",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/NIANGON%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "NIEUK",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/NIEUK%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "NIOVÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/NIOV%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OBOTO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OBOTO%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OHIA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OHIA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OKAN",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OKAN%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OKOUMÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OKOUM%C3%89%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Afrique",
        "essence": "OLON",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OLON%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OLÈNE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OL%C3%88NE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ONZABILI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ONZABILI%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OSANGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OSANGA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OSSABEL",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OSSABEL%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OSSIMIALE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OSSIMIALE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OSSOKO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OSSOKO%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OVENGKOL",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OVENGKOL%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OVOGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OVOGA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OWUI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OWUI%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OZIGO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OZIGO%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "OZOUGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/OZOUGA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "PADOUK D'AFRIQUE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/PADOUK%20D%27AFRIQUE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "PAO ROSA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/PAO%20ROSA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "SAFUKALA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/SAFUKALA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "SAPELLI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/SAPELLI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Afrique",
        "essence": "SIPO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/SIPO%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "SOUGUÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/SOUGU%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "TALI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/TALI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Afrique",
        "essence": "TCHITOLA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/TCHITOLA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "TECK",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/TECK%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "TIAMA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/TIAMA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "TOLA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/TOLA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "VÉSÁMBATA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/V%C3%89S%C3%81MBATA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "VÊNE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/V%C3%8ANE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "WAMBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/WAMBA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "WENGÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/WENG%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Afrique",
        "essence": "ZINGANA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Afrique/ZINGANA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "ABARCO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/ABARCO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "ABIURANA VERMELHA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/ABIURANA%20VERMELHA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "AIEOUEKO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/AIEOUEKO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "AMESCLÀO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/AMESCL%C3%80O%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "ANDIRA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/ANDIRA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "ANDIROBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/ANDIROBA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "ANGELIM",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/ANGELIM%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "ANGELIM RAJADO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/ANGELIM%20RAJADO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "ANGELIM VERMELHO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/ANGELIM%20VERMELHO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "ARARACANGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/ARARACANGA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "AÇACU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/A%C3%87ACU%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "BACURI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/BACURI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "BALSA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/BALSA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "BALSAMO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/BALSAMO%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "BASRALOCUS",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/BASRALOCUS%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "BATIBATRA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/BATIBATRA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "CAMBARA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/CAMBARA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "CARDEIRO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/CARDEIRO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "CASTANHEIRO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/CASTANHEIRO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "CATUCAÉM LOURO FAIA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/CATUCA%C3%89M%20LOURO%20FAIA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "CEDRO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/CEDRO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "CEREJEIRA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/CEREJEIRA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "CHICHA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/CHICHA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "COCOTIER",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/COCOTIER%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "COPAIBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/COPAIBA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "CORAÇAO DE NEGRO PANACOCO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/CORA%C3%87AO%20DE%20NEGRO%20PANACOCO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "COUROUPITA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/COUROUPITA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "CUMARU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/CUMARU%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "CUPIUBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/CUPIUBA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "CURUPIXA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/CURUPIXA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "DUKALI AMAPA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/DUKALI%20AMAPA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "FAVEIRA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/FAVEIRA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "FAVEIRA AMARGOSA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/FAVEIRA%20AMARGOSA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "FREIJO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/FREIJO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "GARAPA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/GARAPA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "GOIABAO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/GOIABAO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "GOMMIER",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/GOMMIER%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "GREENHEART",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/GREENHEART%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "GUARIUBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/GUARIUBA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "GUATAMBU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/GUATAMBU%2020204.pdf",
        "year": "N/A"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "HÉVÉA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/H%C3%89V%C3%89A%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "IMBUIA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/IMBUIA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "INGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/INGA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "IPÊ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/IP%C3%8A%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "ITAÚBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/ITA%C3%9ABA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "JACAREUBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/JACAREUBA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "JATOBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/JATOBA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "JEQUITIBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/JEQUITIBA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "KUROKAÏ ou BREU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/KUROKA%C3%8F%20ou%20BREU%202024%20.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "LOURO BRANCO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/LOURO%20BRANCO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "LOURO VERMELHO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/LOURO%20VERMELHO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MACACAUBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MACACAUBA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MACUCU DE PACA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MACUCU%20DE%20PACA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MAHOGANY",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MAHOGANY%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MANCHICHE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MANCHICHE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MANDIOQUEIRA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MANDIOQUEIRA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MANIL",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MANIL%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MANNIBALLI MANIL MONTAGNE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MANNIBALLI%20MANIL%20MONTAGNE%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MARUPA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MARUPA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MAÇARANDUBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MA%C3%87ARANDUBA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MELANCIEIRA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MELANCIEIRA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MORA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MORA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MORAL",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MORAL%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MOROTOTO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MOROTOTO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MUIRACATIARA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MUIRACATIARA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MUIRAPIRANGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MUIRAPIRANGA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "MUIRATINGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/MUIRATINGA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "NOGAL",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/NOGAL%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PARA-PARA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PARA-PARA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PASHACO PARICÁ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PASHACO%20PARIC%C3%81%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PAU AMARELO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PAU%20AMARELO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PAU MULATO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PAU%20MULATO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PAU ROXO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PAU%20ROXO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PIN DE PARANA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PIN%20DE%20PARANA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PIN DES CARAÏBES",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PIN%20DES%20CARA%C3%8FBES%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PINUS PATULA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PINUS%20PATULA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PIQUIA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PIQUIA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PIQUIARANA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PIQUIARANA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PRECIOSA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PRECIOSA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "PUCTÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/PUCT%C3%89%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "QUARUBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/QUARUBA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "RED GRANDIS",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/RED%20GRANDIS%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "ROSEWOOD PARA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/ROSEWOOD%20PARA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "SANDÉ",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/SAND%C3%89%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "SAPUCAIA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/SAPUCAIA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "SUCUPIRA PRETA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/SUCUPIRA%20PRETA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "SUMAUMA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/SUMAUMA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "TACHI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/TACHI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "TAMARINDO - GROÇAI-ROSA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/TAMARINDO%20-%20GRO%C3%87AI-ROSA%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "TAMBORIL",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/TAMBORIL%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "TANIMBUCA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/TANIMBUCA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "TATAJUBA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/TATAJUBA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "TAUARI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/TAUARI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "TECK",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/TECK%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "TENTO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/TENTO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "TIMBORANA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/TIMBORANA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "TORNILLO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/TORNILLO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "UCHY",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/UCHY%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "VIROLA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/VIROLA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "WACAPOU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/WACAPOU%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "WALLABA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/WALLABA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Amérique Centrale et du Sud",
        "essence": "WAMARA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Amerique/WAMARA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "ACACIA MANGIUM",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/ACACIA%20MANGIUM%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "ALAN ALAN-BATU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/ALAN%20ALAN-BATU%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "ALMON",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/ALMON%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "BALAU RED",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/BALAU%20RED%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "BANGKIRAI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/BANGKIRAI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "BILLIAN",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/BILLIAN%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "BINTANGOR",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/BINTANGOR%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "BITIS",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/BITIS%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "BUNGUR",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/BUNGUR%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "CHENGAL",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/CHENGAL%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "COCOTIER",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/COCOTIER%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "CRYPTOMERIA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/CRYPTOMERIA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "DUABANGA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/DUABANGA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "DURIAN",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/DURIAN%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "EBÈNE NOIRE D'ASIE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/EB%C3%88NE%20NOIRE%20D%27ASIE%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "EBÈNE VEINÉE D'ASIE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/EB%C3%88NE%20VEIN%C3%89E%20D%27ASIE%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "GERONGGANG",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/GERONGGANG%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "GERUTU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/GERUTU%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "GIAM",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/GIAM%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "HALDU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/HALDU%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "HÉVÉA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/H%C3%89V%C3%89A%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "JARRAH",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/JARRAH%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "JELUTONG",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/JELUTONG%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "KAPUR",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/KAPUR%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "KARRI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/KARRI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "KASAI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/KASAI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "KAURI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/KAURI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "KEDONDONG",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/KEDONDONG%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "KELAT",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/KELAT%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "KELEDANG",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/KELEDANG%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "KEMBANG SEMANGKOK",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/KEMBANG%20SEMANGKOK%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "KEMPAS",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/KEMPAS%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "KERANJI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/KERANJI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "KERUING",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/KERUING%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "LAUAN RED",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/LAUAN%20RED%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "MANGO MACHANG",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/MANGO%20MACHANG%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "MENGKULANG",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/MENGKULANG%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "MERANTI DARK RED",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/MERANTI%20DARK%20RED%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "MERANTI LIGHT RED",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/MERANTI%20LIGHT%20RED%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "MERANTI WHITE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/MERANTI%20WHITE%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "MERANTI YELLOW",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/MERANTI%20YELLOW%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "MERAWAN",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/MERAWAN%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "MERBAU",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/MERBAU%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "MERPAUH",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/MERPAUH%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "MERSAWA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/MERSAWA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "NYATOH",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/NYATOH%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "PADAUK AMBOINA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/PADAUK%20AMBOINA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "PERUPOK",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/PERUPOK%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "PIN DES CARAÏBES",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/PIN%20DES%20CARA%C3%8FBES%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "PINUS KESIYA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/PINUS%20KESIYA%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "PINUS MERKUSII",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/PINUS%20MERKUSII%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "PULAI",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/PULAI%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "PUNAH",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/PUNAH%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "PYINKADO",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/PYINKADO%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "RAMIN",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/RAMIN%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "RED GRANDIS",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/RED%20GRANDIS%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Asie et Océanie",
        "essence": "RENGAS",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/RENGAS%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "RESAK",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/RESAK%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "ROSEWOOD, SONOKELING",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/ROSEWOOD%2C%20SONOKELING%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "ROSEWOOD, TAMALAN",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/ROSEWOOD%2C%20TAMALAN%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "SATIN, CEYLON",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/SATIN%2C%20CEYLON%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "SEPETIR",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/SEPETIR%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "SERAYA WHITE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/SERAYA%20WHITE%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "SESENDOK",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/SESENDOK%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "SIMPOH",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/SIMPOH%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "SUREN",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/SUREN%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "TASMANIAN OAK",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/TASMANIAN%20OAK%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Asie et Océanie",
        "essence": "TECK",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/TECK%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Asie et Océanie",
        "essence": "YEMANE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Asie/YEMANE%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Zones tempérées",
        "essence": "CEDRE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/CEDRE.pdf",
        "year": "N/A"
    },
    {
        "region": "Zones tempérées",
        "essence": "CHATAIGNIER",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/CHATAIGNIER.pdf",
        "year": "N/A"
    },
    {
        "region": "Zones tempérées",
        "essence": "CHÊNE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/CH%C3%8ANE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Zones tempérées",
        "essence": "DOUGLAS",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/DOUGLAS%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Zones tempérées",
        "essence": "EPICEA",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/EPICEA.pdf",
        "year": "N/A"
    },
    {
        "region": "Zones tempérées",
        "essence": "ERABLE SYCOMORE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/ERABLE%20SYCOMORE.pdf",
        "year": "N/A"
    },
    {
        "region": "Zones tempérées",
        "essence": "FRENE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/FRENE.pdf",
        "year": "N/A"
    },
    {
        "region": "Zones tempérées",
        "essence": "HÊTRE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/H%C3%8ATRE%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Zones tempérées",
        "essence": "MELEZE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/MELEZE.pdf",
        "year": "N/A"
    },
    {
        "region": "Zones tempérées",
        "essence": "MERISIER",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/MERISIER.pdf",
        "year": "N/A"
    },
    {
        "region": "Zones tempérées",
        "essence": "NOYER",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/NOYER%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Zones tempérées",
        "essence": "PEUPLIER",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/PEUPLIER%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Zones tempérées",
        "essence": "PIN MARITIME",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/PIN%20MARITIME%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Zones tempérées",
        "essence": "PIN RADIATA DE PLANTATION EUROPÉEN",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/PIN%20RADIATA%20DE%20PLANTATION%20EUROP%C3%89EN%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Zones tempérées",
        "essence": "PIN SYLVESTRE",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/PIN%20SYLVESTRE%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Zones tempérées",
        "essence": "PIN À CROCHETS",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/PIN%20%C3%80%20CROCHETS%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Zones tempérées",
        "essence": "ROBINIER",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/ROBINIER%202024.pdf",
        "year": "2024"
    },
    {
        "region": "Zones tempérées",
        "essence": "SAPIN",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/SAPIN%202023.pdf",
        "year": "2023"
    },
    {
        "region": "Zones tempérées",
        "essence": "WESTERN RED CEDAR",
        "url": "https://tropix.cirad.fr/FichiersComplementaires/FR/Temperees/WESTERN%20RED%20CEDAR.pdf",
        "year": "N/A"
    }
];

const TROPIX_ESSENCES_BY_NAME = new Map();
TROPIX_ESSENCES.forEach((entry) => {
    const key = normalizeTropixEssenceKey(entry && entry.essence);
    if (!key) return;
    const existing = TROPIX_ESSENCES_BY_NAME.get(key) || [];
    existing.push(entry);
    TROPIX_ESSENCES_BY_NAME.set(key, existing);
});
