(function () {
    'use strict';

    const RAW_CSV = `Origine;Tableau source;Nom standard;Espèce botanique;Code;1;2;3.1;3.2;4;5;Résistance insectes larves xylophages;Résistance termites;Notes
Européen;Tableau 4;Aulne d'Oregon / Aulne rouge;Alnus rubra;ALRU;L3;L2;L1;N;N;N;non;non;
Européen;Tableau 4;Bouleau d'Europe;Betula pendula;BTXX;L3;L2;N;N;N;N;non;non;
Européen;Tableau 4;Châtaignier;Castanea sativa;CTST;L3;L3;L3;L2;L1;N;oui;non;[Note T4-1] L1 en CE4 applicable uniquement hors sol (ni en contact, ni enfoui dans le sol)
Européen;Tableau 4;Chêne blanc US (Oak white);Quercus spp.;QCXA;L3;L3;L3;L2;L1;N;oui;non;
Européen;Tableau 4;Chêne rouvre et/ou pédonculé;Quercus petraea / Quercus robur;QCXE;L3;L3;L3;L2;L1;N;oui;non;[Note T4-1] L1 en CE4 applicable uniquement hors sol (ni en contact, ni enfoui dans le sol)
Européen;Tableau 4;Chêne rouge d'Amérique;Quercus spp.;QCXR;L3;L2;L1;N;N;N;oui;non;
Européen;Tableau 4;Érable sycomore;Acer pseudoplatanus;ACPS;L3;L2;N;N;N;N;non;non;
Européen;Tableau 4;Frêne;Fraxinus spp.;FXXX;L3;L2;L1;N;N;N;non;non;
Européen;Tableau 4;Frêne commun;Fraxinus excelsior L.;FXEX;L3;L2;N;N;N;N;non;non;
Européen;Tableau 4;Hêtre;Fagus sylvatica;FASY;L3;L2;N;N;N;N;non;non;
Européen;Tableau 4;Peuplier blanc;Populus alba L.;POAL;L3;L2;L1;N;N;N;non;non;
Européen;Tableau 4;Robinier faux Acacia;Robinia pseudoacacia L.;ROPS;L3;L3;L3;L2;L1;N;oui;oui;
Européen;Tableau 4;Cèdre;C. deodara;CDXX;L3;L3;L2;L1;N;N;oui;non;
Européen;Tableau 4;Douglas;Pseudotsuga menziesii;PSMN;L3;L3;L2;L1;N;N;oui;non;
Européen;Tableau 4;Épicéa;Picea abies;PCAB;L3;L2;L1;N;N;N;non;non;
Européen;Tableau 4;Western Hemlock;Tsuga heterophylla;TSHT;L3;L2;L1;N;N;N;non;non;
Européen;Tableau 4;Mélèze d'Europe;Larix decidua;LADC;L3;L3;L2;L1;N;N;oui;non;
Européen;Tableau 4;Pin maritime;Pinus pinaster;PNPN;L3;L3;L2;L1;N;N;oui;non;
Européen;Tableau 4;Pin noir d'Autriche et pin Laricio;Pinus nigra;PNNN;L3;L2;L1;N;N;N;oui;non;
Européen;Tableau 4;Pin d'Oregon (Douglas fir);Pseudotsuga menziesii;PSMN2;L3;L3;L2;L1;N;N;oui;non;
Européen;Tableau 4;Pin sylvestre;Pinus sylvestris;PNSY;L3;L3;L1;L1;N;N;oui;non;
Européen;Tableau 4;Pitchpin;Pinus caribaea;PNCR;L3;L3;L1;L1;N;N;oui;non;
Européen;Tableau 4;Western Red Cedar;Thuja plicata;THPL;L3;L3;L2;L1;N;N;oui;non;
Européen;Tableau 4;Sapin blanc;Abies alba;ABAL;L3;L2;L1;N;N;N;non;non;
Européen;Tableau 4;Pinus elliottii (d≥0,69);Pinus elliottii;PNEL;L3;L3;L1;L1;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Européen;Tableau 4;Pinus taeda (d≥0,56);Pinus taeda;PNTD;L3;L2;L1;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Européen;Tableau 4;Pinus radiata (d≥0,48);Pinus radiata - Monterey pine USA;PNRD;L3;L2;L1;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Européen;Tableau 4;Pinus strobus (d≥0,39);Pinus strobus - Pine yellow;PNST;L3;L2;L1;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Européen;Tableau 4;Southern yellow pine (0,66≤d≤0,69);Pinus palustris et Pinus elliottii;PNPL;L3;L3;L1;L1;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Angelim vermelho;Dinizia excelsa;DEEX;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Amarante;Peltogyne spp.;PGXX;L3;L3;L3;L2;N;N;oui;oui;
Tropical;Tableau 5;Andira (Saint Martin rouge);Andira spp.;AAXX;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Aningré;Aningeria spp.;AQXX;L3;L2;L1;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Ayous / Samba;Triplochiton scleroxylon;TRSC;L3;L2;L1;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Azobé;Lophira alata;LOAL;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Balau red (d≥0,75);Shorea section Rubroshorea;SHRB;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Bété;Mansonia altissima;MAAL;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Bangkiraï;Shorea Section Eushorea;SHBL;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Basralocus / Angélique;Dicorynia guianensis;DIXX;L3;L3;L3;L3;L2;L1;oui;non;
Tropical;Tableau 5;Bossé;Guarea spp. Afrique;GRXX;L3;L3;L3;L2;N;N;oui;non;
Tropical;Tableau 5;Bubinga;Guibourtia pellegriniana;GUXX;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Bilinga;Nauclea diderrichii;NADD;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Bintangor;Calophyllum spp.;CLXX;L3;L2;L1;N;N;N;oui;non;
Tropical;Tableau 5;Cambara / Jaboty;Erisma uncinatum;EUIN;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Caxinguba / Figueira;Ficus spp.;FIXX;L3;L2;N;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Cumaru;Dipteryx spp.;DXXX;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Curupixa;Micropholis spp.;MPXX;L3;L2;N;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Dibétou;Lovoa spp.;LVXX;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Difou;Morus mesozygia;MRMZ;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Doussié;Afzelia spp.;AFXX;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Durian;Durio spp. / Coelostegia spp. / Neesia spp.;DUXX;L3;L2;L1;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Eucalyptus globulus;Eucalyptus globulus;EUGL;L3;L2;N;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Eucalyptus grandis;Eucalyptus grandis;EUGR;L3;L2;L1;N;N;N;oui;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Framiré;Terminalia ivorensis;TMIV;L3;L3;L3;L1;N;N;non;non;
Tropical;Tableau 5;Garapa / Grapia;Apuleia leiocarpa;APLC;L3;L3;L2;L3;L2;L1;oui;non;
Tropical;Tableau 5;Gonçalo alves / Muiracatiara;Astronium spp.;AVXX;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Greenheart;Chlorocardium rodiei;CHRD;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Iatandza;Albizia ferruginea;AZFR;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Ipé / Ébène verte (d≥0,85);Tabebuia spp. denses et foncés;TBXX;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Iroko;Milicia excelsa / Milicia regia;MIXX;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Itauba;Mezilaurus spp.;MZXX;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Jatoba;Hymenaea spp.;HYXX;L3;L3;L3;L2;L1;N;oui;non;
Tropical;Tableau 5;Jequitiba;Cariniana spp.;CZXX;L3;L3;L2;L1;N;N;non;oui;
Tropical;Tableau 5;Kapur;Dryobalanops spp.;DRXX;L3;L3;L3;L2;L1;N;oui;non;
Tropical;Tableau 5;Kempas;Koompassia malaccensis;KOML;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Kéruing;Dipterocarpus spp.;DPXX;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Kosipo;Entandrophragma candollei;ENCN;L3;L3;L3;L1;N;N;oui;non;
Tropical;Tableau 5;Kotibé;Nesogordonia spp.;NEXX;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Lauan white / white seraya (0,45≤d≤0,65);Parashorea spp.;PHWS;L3;L2;N;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Limba / Fraké;Terminalia superba;TMSP;L3;L3;N;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Limbali;Gilbertiodendron spp.;GBXX;L3;L3;L3;L2;L1;N;oui;non;
Tropical;Tableau 5;Louro vermelho / Grignon franc;Sextonia rubra;SXRB;L3;L3;L3;L2;N;N;oui;oui;
Tropical;Tableau 5;Mandioqueïra / Gonfolo;Qualea spp. / Ruizterania albiflora;QUXX;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Maçaranduba;Manilkara spp. Amérique du Sud;MNXX;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Makoré / Douka;Tieghemella spp.;TGAF;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Marupá;Simarouba spp.;SMAM;L3;L2;N;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Mengkulang;Heritiera spp.;HEXM;L3;L2;L1;N;N;N;oui;non;
Tropical;Tableau 5;Méranti light red (d≤0,58);Shorea section Rubroshorea;SHLR;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Méranti dark red (0,58≤d≤0,75);Shorea section Rubroshorea;SHDR;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Merbau;Intsia spp.;INXX;L3;L3;L3;L2;L1;N;oui;non;
Tropical;Tableau 5;Moabi;Baillonella toxisperma;BLTX;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Movingui;Distemonanthus benthamianus;DTBN;L3;L3;L3;L3;L2;L1;oui;non;
Tropical;Tableau 5;Mukulungu;Autranella congolensis;AWCO;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Niangon;Heritiera utilis;HEXN;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Nyatoh;Palaquium spp.;PPXX;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Niové;Staudtia kamerunensis;SSST;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Okan;Cylicodiscus gabunensis;CKGB;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Okoumé;Aucoumea klaineana;AUKL;L3;L2;L1;N;N;N;oui;non;
Tropical;Tableau 5;Padouk;Pterocarpus soyauxii / P. osun;PTXX;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Pau amarelo;Euxylophora paraensis;EXPA;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Piquiarana;Caryocar glabrum;COGL;L3;L3;L3;L2;L1;N;non;oui;
Tropical;Tableau 5;Pyinkado;Xylia xylocarpa;XYXX;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Sapelli;Entandrophragma cylindricum;ENCY;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Sipo;Entandrophragma utile;ENUT;L3;L3;L3;L1;N;N;oui;non;
Tropical;Tableau 5;Sucupira;Diplotropis spp.;BOXX;L3;L3;L3;L2;L1;N;oui;oui;
Tropical;Tableau 5;Tali;Erythrophleum spp. Afrique;EYXX;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Tatajuba;Bagassa guianensis;BGGN;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Tauari;Couratari spp.;CIXX;L3;L2;L1;N;N;N;non;non;[◆] Aubier peu ou pas distinct du duramen à l'état sec
Tropical;Tableau 5;Tiama;Entandrophragma angolense;ENAN;L3;L3;L2;L1;N;N;oui;non;
Tropical;Tableau 5;Teck de forêt naturelle;Tectona grandis;TEGR;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Teck de plantation;Tectona grandis;TEGR_P;L3;L3;L3;L3;L2;L1;oui;oui;
Tropical;Tableau 5;Tola;Gosweilerodendron balsamiferum;GOXX;L3;L3;L2;L1;N;N;non;non;
Tropical;Tableau 5;Tornillo / Cedrorana;Cedrelinga cateniformis;CGCT;L3;L3;L2;L1;N;N;non;non;
Tropical;Tableau 5;Wacapou;Vouacapoua spp.;VCXX;L3;L3;L3;L3;L2;N;oui;oui;`;

    function parseRows(rawCsv) {
        return rawCsv
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith(';'))
            .slice(1)
            .map((line) => line.split(';'))
            .filter((cols) => cols.length >= 14)
            .map((cols) => ({
                origine: (cols[0] || '').trim(),
                tableauSource: (cols[1] || '').trim(),
                nomStandard: (cols[2] || '').trim(),
                especeBotanique: (cols[3] || '').trim(),
                code: (cols[4] || '').trim().toUpperCase(),
                CE1: (cols[5] || '').trim().toUpperCase(),
                CE2: (cols[6] || '').trim().toUpperCase(),
                CE3a: (cols[7] || '').trim().toUpperCase(),
                CE3b: (cols[8] || '').trim().toUpperCase(),
                CE4: (cols[9] || '').trim().toUpperCase(),
                CE5: (cols[10] || '').trim().toUpperCase(),
                resistanceInsectesLarvesXylophages: (cols[11] || '').trim(),
                resistanceTermites: (cols[12] || '').trim(),
                notes: (cols[13] || '').trim()
            }))
            .filter((entry) => entry.code);
    }

    window.VALOBOIS_LONGEVITE_FD_P20651 = {
        source: 'FD P 20-651 - Juin 2011 - AFNOR - Durabilité des éléments et ouvrages en bois',
        tables: ['Tableau 4', 'Tableau 5', 'Tableau 7 (8.3, regle CE5)'],
        legend: {
            L3: 'Longévité supérieure à 100 ans',
            L2: 'Longévité entre 50 et 99 ans',
            L1: 'Longévité entre 10 et 49 ans',
            N: 'Longévité incertaine, inférieure à 10 ans'
        },
        classes: ['CE1', 'CE2', 'CE3a', 'CE3b', 'CE4', 'CE5'],
        notes: {
            T4_1: 'Pour le Châtaignier (CTST) et le Chêne rouvre/pédonculé (QCXE) la norme spécifie que la longévité L1 en classe d\'emploi 4 est applicable uniquement en situation hors sol (ni en contact avec le sol, ni enfouis dans le sol).',
            T4_2: 'Ces longévités sont en principe relatives exclusivement à des bois purgés d\'aubier. Quelle que soit l\'essence, l\'aubier ne présente à l\'état naturel aucune résistance vis-à-vis des agents de dégradation biologique du bois.',
            T5_2: 'Malgré que certaines essences ont une résistance « moyenne » au termite (s\'en référer à la NF EN 350-2), elles sont ici considérées comme non résistantes.',
            T7: 'Les essences listées en classe d\'emploi 5 sont réputées résistantes aux organismes marins invertébrés (Limnoria spp. et Teredo spp.). Les essences absentes du Tableau 7 reçoivent la valeur N en CE5. Les essences du Tableau 7 reçoivent une longévité L3 jusqu\'en CE3b et L2 en CE4.',
            aubier: 'Un point de vigilance est signalé par la norme pour les essences marquées du symbole « ◆ » : l\'aubier est « peu ou pas distinct du duramen à l\'état sec ».'
        },
        entries: parseRows(RAW_CSV)
    };
})();
