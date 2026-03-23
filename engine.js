/**
 * engine.js — Moteur d'Inférence BurnoutScan (100% JavaScript)
 * Traduction fidèle de engine.py (Python) → JavaScript
 * Auteur  : Imane Mourafik · 2025–2026
 * Sources : OMS CIM-11 · Maslach MBI · DSM-5 · INRS · HAS
 */

const BurnoutEngine = (() => {

  /* ══════════════════════════════════════════════
     6 NIVEAUX DE DIAGNOSTIC
  ══════════════════════════════════════════════ */
  const NIVEAUX = [
    {
      id: "bienetre", label: "Bien-être", emoji: "✅",
      min: 0, max: 15,
      color: "#22c55e", color_bg: "rgba(34,197,94,0.1)",
      description: "Aucun signe pathologique détecté. Votre gestion du stress semble saine et équilibrée. Continuez à entretenir vos ressources personnelles.",
      recommandations: [
        "Maintenez vos bonnes habitudes de sommeil (7–9h par nuit, OMS)",
        "Pratiquez une activité physique régulière (150 min/semaine selon l'OMS)",
        "Cultivez vos relations sociales et activités de loisir",
        "Apprenez des techniques préventives : cohérence cardiaque, pleine conscience"
      ]
    },
    {
      id: "stress_leger", label: "Stress léger", emoji: "🟡",
      min: 16, max: 30,
      color: "#f59e0b", color_bg: "rgba(245,158,11,0.1)",
      description: "Des signaux de stress modérés sont détectés. Ils sont gérables avec des ajustements préventifs. Prenez soin de vous maintenant avant que ça s'aggrave.",
      recommandations: [
        "Identifiez et réduisez vos sources de stress principales",
        "Pratiquez la relaxation : respiration 4-7-8, cohérence cardiaque",
        "Améliorez votre hygiène de sommeil : horaires réguliers, écrans éteints 1h avant",
        "N'hésitez pas à en parler à un proche ou un médecin de confiance"
      ]
    },
    {
      id: "stress_modere", label: "Stress modéré", emoji: "🟠",
      min: 31, max: 50,
      color: "#f97316", color_bg: "rgba(249,115,22,0.1)",
      description: "Votre niveau de stress est significatif et mérite attention. Des symptômes physiques et émotionnels sont présents. Une consultation médicale est recommandée.",
      recommandations: [
        "Consultez votre médecin traitant pour un bilan complet",
        "Envisagez un suivi psychologique ou une thérapie brève",
        "Évaluez votre charge de travail avec votre employeur ou manager",
        "Établissez des limites claires entre vie professionnelle et personnelle",
        "Pratiquez une activité physique régulière — excellente contre le stress"
      ]
    },
    {
      id: "stress_eleve", label: "Stress élevé", emoji: "🔴",
      min: 51, max: 70,
      color: "#ef4444", color_bg: "rgba(239,68,68,0.1)",
      description: "Votre niveau de stress est élevé et préoccupant. Plusieurs dimensions sont touchées simultanément. Une prise en charge professionnelle est fortement conseillée.",
      recommandations: [
        "Consultez un médecin ou psychiatre en urgence relative",
        "Parlez de votre situation à votre médecin du travail",
        "Envisagez sérieusement un arrêt de travail temporaire",
        "Contactez le 3114 si vous ressentez une détresse intense",
        "Demandez un soutien à votre entourage proche"
      ]
    },
    {
      id: "burnout", label: "Burnout", emoji: "🚨",
      min: 71, max: 89,
      color: "#dc2626", color_bg: "rgba(220,38,38,0.1)",
      description: "Les indicateurs correspondent à un burnout avéré selon les critères OMS CIM-11 et Maslach MBI. Un arrêt de travail et une prise en charge immédiate sont nécessaires.",
      recommandations: [
        "Consultez votre médecin traitant AUJOURD'HUI pour un arrêt de travail",
        "Contactez un psychiatre ou psychologue spécialisé en burnout",
        "Informez votre médecin du travail de votre situation",
        "Ne prenez pas de décisions importantes dans cet état",
        "Acceptez l'aide de votre entourage — vous n'avez pas à traverser ça seul(e)"
      ]
    },
    {
      id: "danger", label: "Urgence Vitale", emoji: "🆘",
      min: 90, max: 100,
      color: "#e11d48", color_bg: "rgba(225,29,72,0.1)",
      description: "Situation de crise identifiée. Des professionnels sont disponibles maintenant, gratuitement et anonymement, pour vous accompagner.",
      recommandations: [
        "Appelez le 3114 (Prévention Suicide) — gratuit, 24h/24, anonyme",
        "Appelez le 15 (SAMU) en cas d'urgence immédiate",
        "Rendez-vous aux urgences psychiatriques les plus proches",
        "Appelez un proche de confiance maintenant",
        "Éloignez-vous de tout moyen potentiellement dangereux"
      ]
    }
  ];

  /* ══════════════════════════════════════════════
     60 RÈGLES D'INFÉRENCE IF-THEN
  ══════════════════════════════════════════════ */
  const REGLES = [

    // ── PHYSIQUES (R001–R012) ──────────────────
    { id:"R001", cat:"physique", nom:"Insomnie sévère (< 4h/nuit)",
      cond: f => (f.heures_sommeil !== undefined && f.heures_sommeil < 4),
      pts:8, src:"INRS 2015 / OMS CIM-11",
      expl:"Dormir < 4h/nuit est un trouble du sommeil sévère — facteur de risque majeur du burnout." },

    { id:"R002", cat:"physique", nom:"Sommeil insuffisant (4–6h)",
      cond: f => (f.heures_sommeil !== undefined && f.heures_sommeil >= 4 && f.heures_sommeil < 6),
      pts:4, src:"OMS — Recommandation 7–9h adulte",
      expl:"Un sommeil de 4–6h compromet la récupération physique et cognitive. L'OMS recommande 7–9h." },

    { id:"R003", cat:"physique", nom:"Difficultés d'endormissement",
      cond: f => f.difficulte_endormissement === true,
      pts:4, src:"DSM-5 — Trouble insomnie F51.0",
      expl:"Les difficultés à s'endormir sont un marqueur d'hyperactivation du système nerveux sympathique." },

    { id:"R004", cat:"physique", nom:"Fatigue chronique",
      cond: f => f.fatigue_chronique === true,
      pts:6, src:"Maslach MBI — Épuisement émotionnel",
      expl:"La fatigue persistante non soulagée par le repos est le symptôme cardinal de l'épuisement (Maslach, 1981)." },

    { id:"R005", cat:"physique", nom:"Céphalées fréquentes",
      cond: f => f.maux_tete === true,
      pts:3, src:"CIM-11 — Céphalées de tension",
      expl:"Les maux de tête tensionnels récurrents sont un symptôme somatique classique du stress chronique." },

    { id:"R006", cat:"physique", nom:"Tensions musculaires",
      cond: f => f.tensions_musculaires === true,
      pts:3, src:"DSM-5 — Trouble anxieux généralisé",
      expl:"La tension musculaire (nuque, dos, épaules) est un symptôme somatique des troubles anxieux (DSM-5)." },

    { id:"R007", cat:"physique", nom:"Troubles digestifs",
      cond: f => f.troubles_digestifs === true,
      pts:4, src:"HAS France — Manifestations somatiques",
      expl:"Les troubles gastro-intestinaux sont des manifestations somatiques du stress reconnues par la HAS." },

    { id:"R008", cat:"physique", nom:"Palpitations cardiaques",
      cond: f => f.palpitations === true,
      pts:5, src:"DSM-5 — Critère D anxiété",
      expl:"Les palpitations reflètent une hyperactivation du système nerveux autonome (DSM-5)." },

    { id:"R009", cat:"physique", nom:"Variation de poids involontaire",
      cond: f => f.variation_poids === true,
      pts:4, src:"DSM-5 — Dépression caractérisée critère A",
      expl:"Une variation de poids non intentionnelle est un critère diagnostique de la dépression." },

    { id:"R010", cat:"physique", nom:"Dermatoses / chute de cheveux",
      cond: f => f.problemes_cutanes === true,
      pts:3, src:"INRS — Manifestations dermatologiques stress",
      expl:"L'eczéma, psoriasis ou chute de cheveux liés au stress sont des réponses inflammatoires cutanées (INRS)." },

    { id:"R011", cat:"physique", nom:"Douleurs chroniques inexpliquées",
      cond: f => f.douleurs_chroniques === true,
      pts:5, src:"HAS — Somatisation et douleur chronique",
      expl:"Les douleurs musculo-articulaires sans cause organique sont des manifestations somatiques du stress (HAS)." },

    { id:"R012", cat:"physique", nom:"Infections fréquentes",
      cond: f => f.infections_frequentes === true,
      pts:4, src:"Cohen et al. 1991 — Psychoneuroimmunologie",
      expl:"Le stress chronique affaiblit le système immunitaire via l'axe HPA (Cohen, 1991)." },

    // ── ÉMOTIONNELS (R013–R024) ────────────────
    { id:"R013", cat:"emotionnel", nom:"Anxiété persistante",
      cond: f => f.anxiete === true,
      pts:6, src:"DSM-5 F41.1 / CIM-11 6B00",
      expl:"L'anxiété chronique difficile à contrôler est le critère principal du Trouble Anxieux Généralisé." },

    { id:"R014", cat:"emotionnel", nom:"Irritabilité excessive",
      cond: f => f.irritabilite === true,
      pts:5, src:"OMS CIM-11 QD85",
      expl:"L'irritabilité disproportionnée révèle un seuil de tolérance abaissé par l'épuisement émotionnel." },

    { id:"R015", cat:"emotionnel", nom:"Tristesse persistante",
      cond: f => f.tristesse === true,
      pts:7, src:"DSM-5 — Critère A dépression",
      expl:"Une tristesse durable est le premier critère de la dépression caractérisée (DSM-5, critère A)." },

    { id:"R016", cat:"emotionnel", nom:"Épuisement émotionnel (vide intérieur)",
      cond: f => f.sentiment_vide === true,
      pts:8, src:"Maslach MBI — Sous-échelle EE",
      expl:"Le sentiment de vide est la dimension centrale du burnout : l'Épuisement Émotionnel (Maslach, 1981)." },

    { id:"R017", cat:"emotionnel", nom:"Cynisme / Dépersonnalisation",
      cond: f => f.cynisme === true,
      pts:7, src:"Maslach MBI + OMS CIM-11 QD85",
      expl:"Le cynisme envers le travail est la 2e dimension du burnout (Dépersonnalisation, MBI)." },

    { id:"R018", cat:"emotionnel", nom:"Détachement émotionnel",
      cond: f => f.detachement === true,
      pts:6, src:"OMS CIM-11 — Détachement mental",
      expl:"Le détachement vis-à-vis du travail est explicitement mentionné dans la définition OMS du burnout." },

    { id:"R019", cat:"emotionnel", nom:"Crises de larmes fréquentes",
      cond: f => f.crises_larmes === true,
      pts:6, src:"INRS — Indicateurs cliniques burnout",
      expl:"Les crises de larmes indiquent un débordement du système de régulation émotionnelle (INRS)." },

    { id:"R020", cat:"emotionnel", nom:"Perte de motivation / Anhédonie",
      cond: f => f.perte_motivation === true,
      pts:7, src:"DSM-5 — Critère A2 dépression",
      expl:"La perte de plaisir et de motivation (anhédonie) est le 2e critère de la dépression (DSM-5)." },

    { id:"R021", cat:"emotionnel", nom:"Sentiment de honte / d'échec",
      cond: f => f.honte_echec === true,
      pts:6, src:"Maslach & Leiter 2016",
      expl:"La honte, culpabilité et sentiment d'échec personnel sont des prédicteurs forts du burnout." },

    { id:"R022", cat:"emotionnel", nom:"Hyperémotivité",
      cond: f => f.hyperemotivite === true,
      pts:5, src:"INRS — Signaux faibles burnout",
      expl:"Une sensibilité émotionnelle accrue et réactions disproportionnées sont des signaux précoces du burnout." },

    { id:"R023", cat:"emotionnel", nom:"Sentiment d'impuissance",
      cond: f => f.sentiment_impuissance === true,
      pts:6, src:"Seligman 1975 — Learned Helplessness",
      expl:"Le sentiment d'impuissance apprise est un facteur prédicteur majeur de la dépression (Seligman, 1975)." },

    { id:"R024", cat:"emotionnel", nom:"Angoisse anticipatoire",
      cond: f => f.angoisse_anticipatoire === true,
      pts:5, src:"DSM-5 — Trouble panique / TAG",
      expl:"L'angoisse à l'idée d'affronter certaines situations est caractéristique du trouble anxieux généralisé." },

    // ── COGNITIFS (R025–R034) ──────────────────
    { id:"R025", cat:"cognitif", nom:"Difficultés de concentration",
      cond: f => f.difficultes_concentration === true,
      pts:6, src:"Neurosciences — Déficit cortex préfrontal",
      expl:"Le stress chronique altère les fonctions exécutives du cortex préfrontal (attention, concentration)." },

    { id:"R026", cat:"cognitif", nom:"Problèmes de mémoire",
      cond: f => f.problemes_memoire === true,
      pts:5, src:"McEwen 2007 — Cortisol et hippocampe",
      expl:"Le cortisol élevé en stress chronique endommage l'hippocampe, siège de la mémoire (McEwen, 2007)." },

    { id:"R027", cat:"cognitif", nom:"Rumination mentale",
      cond: f => f.rumination === true,
      pts:5, src:"Nolen-Hoeksema 1991 — Rumination",
      expl:"Les pensées négatives répétitives maintiennent et aggravent la dépression (Nolen-Hoeksema, 1991)." },

    { id:"R028", cat:"cognitif", nom:"Indécision pathologique",
      cond: f => f.indecision === true,
      pts:4, src:"DSM-5 — Critère G dépression",
      expl:"L'incapacité à prendre des décisions simples est un critère diagnostique de la dépression (DSM-5)." },

    { id:"R029", cat:"cognitif", nom:"Sentiment d'incompétence",
      cond: f => f.sentiment_incompetence === true,
      pts:7, src:"Maslach MBI — Perte d'accomplissement",
      expl:"La perte d'accomplissement personnel est la 3e dimension du burnout selon Maslach (MBI, 1981)." },

    { id:"R030", cat:"cognitif", nom:"Pensées automatiques négatives",
      cond: f => f.pensees_negatives === true,
      pts:5, src:"Beck 1979 — Thérapie Cognitive",
      expl:"Les pensées automatiques négatives sont le cœur du modèle cognitif de la dépression (Beck, 1979)." },

    { id:"R031", cat:"cognitif", nom:"Brouillard mental (Brain Fog)",
      cond: f => f.confusion_mentale === true,
      pts:6, src:"Neurosciences — Surcharge cognitive",
      expl:"L'incapacité à penser clairement (brain fog) est un symptôme de surcharge cognitive chronique." },

    { id:"R032", cat:"cognitif", nom:"Perte de créativité",
      cond: f => f.perte_creativite === true,
      pts:4, src:"OMS CIM-11 — Réduction efficacité",
      expl:"La perte de curiosité et créativité correspond à la réduction d'efficacité professionnelle (OMS)." },

    { id:"R033", cat:"cognitif", nom:"Hypersensibilité sensorielle",
      cond: f => f.hypersensibilite_sensorielle === true,
      pts:4, src:"DSM-5 — Hypervigilance anxieuse",
      expl:"L'hyperréactivité aux stimuli sensoriels est un signe d'hypervigilance liée à l'anxiété chronique." },

    { id:"R034", cat:"cognitif", nom:"Perte de sens du travail",
      cond: f => f.perte_sens_travail === true,
      pts:5, src:"Frankl 1984 — Logothérapie / OMS",
      expl:"La perte de sens du travail est un facteur aggravant majeur du burnout et de la dépression." },

    // ── COMPORTEMENTAUX (R035–R045) ────────────
    { id:"R035", cat:"comportemental", nom:"Isolement social",
      cond: f => f.isolement === true,
      pts:6, src:"OMS — Retrait social et dépression",
      expl:"L'évitement des contacts sociaux aggrave le burnout en privant l'individu de ressources sociales." },

    { id:"R036", cat:"comportemental", nom:"Procrastination excessive",
      cond: f => f.procrastination === true,
      pts:4, src:"INRS — Comportements d'évitement",
      expl:"La procrastination massive est un mécanisme d'évitement lié à l'épuisement des ressources cognitives." },

    { id:"R037", cat:"comportemental", nom:"Consommation d'alcool augmentée",
      cond: f => f.alcool === true,
      pts:6, src:"INRS — Comportements addictifs stress",
      expl:"L'augmentation de la consommation d'alcool comme stratégie de coping est un indicateur de stress chronique." },

    { id:"R038", cat:"comportemental", nom:"Consommation excessive de caféine",
      cond: f => f.cafeine_excessive === true,
      pts:3, src:"INRS — Stimulants et stress",
      expl:"Consommer > 5 cafés/jour pour tenir indique une fatigue chronique compensée artificiellement." },

    { id:"R039", cat:"comportemental", nom:"Absentéisme / Présentéisme",
      cond: f => f.absenteisme === true,
      pts:6, src:"HAS — Indicateurs RH burnout",
      expl:"Les retards, absences répétées et arrêts maladie fréquents sont des indicateurs comportementaux du burnout." },

    { id:"R040", cat:"comportemental", nom:"Abandon des loisirs",
      cond: f => f.abandon_loisirs === true,
      pts:5, src:"Hobfoll 1989 — Conservation Resources",
      expl:"L'abandon des activités de ressourcement accélère l'épuisement des ressources personnelles (Hobfoll)." },

    { id:"R041", cat:"comportemental", nom:"Négligence de soi",
      cond: f => f.negligence_soi === true,
      pts:5, src:"OMS — Indicateurs de détresse",
      expl:"La négligence de l'alimentation, hygiène et apparence signale un épuisement des ressources de base." },

    { id:"R042", cat:"comportemental", nom:"Hyperconnexion numérique",
      cond: f => f.hyperconnexion === true,
      pts:4, src:"ANACT — Risques numériques au travail",
      expl:"Travailler constamment sans déconnexion (emails le soir, week-end) favorise l'épuisement chronique (ANACT)." },

    { id:"R043", cat:"comportemental", nom:"Agressivité / sautes d'humeur",
      cond: f => f.agressivite === true,
      pts:5, src:"CIM-11 — Dérégulation émotionnelle",
      expl:"Les accès de colère imprévisibles reflètent une dérégulation émotionnelle par épuisement des ressources." },

    { id:"R044", cat:"comportemental", nom:"Consommation de médicaments anxiolytiques",
      cond: f => f.medicaments_stress === true,
      pts:6, src:"HAS — Pharmacothérapie anxiété",
      expl:"La prise régulière de somnifères ou anxiolytiques sans suivi médical indique un stress non pris en charge." },

    { id:"R045", cat:"comportemental", nom:"Tabagisme augmenté",
      cond: f => f.tabagisme_augmente === true,
      pts:3, src:"INRS — Comportements addictifs stress",
      expl:"L'augmentation de la consommation de tabac comme stratégie de coping est un indicateur de stress chronique." },

    // ── CONTEXTUELS (R046–R053) ────────────────
    { id:"R046", cat:"contexte", nom:"Surcharge horaire > 50h/semaine",
      cond: f => (f.heures_travail !== undefined && f.heures_travail > 50),
      pts:8, src:"INRS / Agence Européenne Sécurité",
      expl:"Travailler > 50h/semaine double le risque cardiovasculaire et est un facteur majeur de burnout." },

    { id:"R047", cat:"contexte", nom:"Manque de reconnaissance",
      cond: f => f.manque_reconnaissance === true,
      pts:5, src:"Maslach & Leiter 2016",
      expl:"Le déficit de reconnaissance est l'un des 6 facteurs de risque du burnout (Maslach & Leiter, 2016)." },

    { id:"R048", cat:"contexte", nom:"Conflits professionnels répétés",
      cond: f => f.conflits_travail === true,
      pts:5, src:"ANI 2013 — Risques psychosociaux",
      expl:"Les conflits répétés sont un facteur de risque psychosocial reconnu (ANI, 2013)." },

    { id:"R049", cat:"contexte", nom:"Manque d'autonomie au travail",
      cond: f => f.manque_autonomie === true,
      pts:5, src:"Karasek 1979 — Job Demand-Control",
      expl:"Le manque d'autonomie combiné à de fortes exigences est le facteur central du modèle de Karasek (1979)." },

    { id:"R050", cat:"contexte", nom:"Ambiguïté ou surcharge de rôle",
      cond: f => f.ambiguite_role === true,
      pts:4, src:"Siegrist 1996 — Effort-Reward Imbalance",
      expl:"L'ambiguïté des missions crée un déséquilibre effort-récompense, facteur de burnout (Siegrist, 1996)." },

    { id:"R051", cat:"contexte", nom:"Insécurité de l'emploi",
      cond: f => f.insecurite_emploi === true,
      pts:5, src:"Siegrist ERI + INRS",
      expl:"La peur de perdre son emploi est un stresseur chronique qui active l'axe HPA." },

    { id:"R052", cat:"contexte", nom:"Télétravail isolant",
      cond: f => f.teletravail_isolant === true,
      pts:3, src:"ANACT 2021 — Télétravail et santé",
      expl:"Le télétravail sans lien social suffisant est un facteur de risque de burnout identifié par l'ANACT (2021)." },

    { id:"R053", cat:"contexte", nom:"Charge émotionnelle du travail",
      cond: f => f.charge_emotionnelle === true,
      pts:5, src:"Maslach 1982 — Professions d'aide",
      expl:"La charge émotionnelle élevée (professions d'aide) est un facteur de burnout spécifique (Maslach, 1982)." },

    // ── COMBINAISONS AVANCÉES (R054–R059) ─────
    { id:"R054", cat:"combinaison", nom:"★ Triade du Burnout — Maslach",
      cond: f => f.sentiment_vide && f.cynisme && f.sentiment_incompetence,
      pts:15, src:"Maslach MBI + OMS CIM-11 QD85",
      expl:"Triade complète : Épuisement Émotionnel + Dépersonnalisation + Perte d'Accomplissement → Burnout avéré." },

    { id:"R055", cat:"combinaison", nom:"★ Syndrome anxio-dépressif mixte",
      cond: f => f.anxiete && f.tristesse && f.rumination,
      pts:10, src:"CIM-11 6A72 — Syndrome mixte",
      expl:"Anxiété + tristesse + rumination = syndrome mixte anxieux-dépressif (CIM-11 6A72)." },

    { id:"R056", cat:"combinaison", nom:"★ Effondrement cognitif",
      cond: f => f.difficultes_concentration && f.problemes_memoire && f.indecision,
      pts:8, src:"Neurosciences — Surcharge exécutive",
      expl:"Trois déficits cognitifs simultanés indiquent une surcharge exécutive sévère caractéristique du burnout." },

    { id:"R057", cat:"combinaison", nom:"★ Retrait social pathologique",
      cond: f => f.isolement && f.perte_motivation && f.abandon_loisirs,
      pts:8, src:"OMS — Retrait social et dépression",
      expl:"Retrait social + perte de motivation + abandon des loisirs = retrait pathologique aggravant le risque dépressif." },

    { id:"R058", cat:"combinaison", nom:"★ Surcharge professionnelle totale",
      cond: f => (f.heures_travail > 45) && f.manque_reconnaissance && f.absenteisme,
      pts:10, src:"Karasek-Siegrist — Modèles combinés",
      expl:"Surcharge horaire + manque de reconnaissance + absentéisme = profil de risque très élevé." },

    { id:"R059", cat:"combinaison", nom:"★ Détresse globale",
      cond: f => f.sentiment_vide && f.tristesse && f.isolement && f.perte_motivation,
      pts:12, src:"OMS — Détresse psychologique globale",
      expl:"Épuisement + tristesse + isolement + perte de motivation = détresse psychologique globale." },

    // ── URGENCE (R060) ─────────────────────────
    { id:"R060", cat:"urgence", nom:"🚨 Pensées auto-agressives",
      cond: f => f.pensees_suicidaires === true,
      pts:999, emergency: true,
      src:"OMS — Prévention suicide",
      expl:"Urgence vitale. Contact immédiat avec le 3114 (Prévention Suicide, 24h/24) ou le 15 (SAMU)." }
  ];

  /* ══════════════════════════════════════════════
     55 QUESTIONS CLINIQUES
  ══════════════════════════════════════════════ */
  const mkS = (s, l, e) => ({ section: s, section_label: l, section_emoji: e });
  const P  = mkS("profil",         "Votre profil",               "👤");
  const PH = mkS("physique",       "Sommeil & Santé physique",   "🩺");
  const EM = mkS("emotionnel",     "État émotionnel",            "💭");
  const CG = mkS("cognitif",       "Fonctionnement mental",      "🧠");
  const CB = mkS("comportemental", "Comportements & Habitudes",  "🚶");
  const CT = mkS("contexte",       "Environnement de travail",   "💼");
  const UR = mkS("urgence",        "Question confidentielle",    "🔒");

  const QUESTIONS = [
    // PROFIL
    { ...P,  id:"prenom",           type:"text",   question:"Quel est votre prénom ?", placeholder:"Votre prénom..." },
    { ...P,  id:"age",              type:"slider", question:"Quel est votre âge ?", min:16, max:70, default:28, unit:"ans", labels:["16 ans","28 ans","70 ans+"] },
    { ...P,  id:"heures_travail",   type:"slider", question:"Combien d'heures travaillez-vous en moyenne par semaine ?", min:0, max:80, default:35, unit:"h / semaine", labels:["0h","35h (plein)","80h+"] },

    // SOMMEIL & PHYSIQUE
    { ...PH, id:"heures_sommeil",             type:"slider", question:"Combien d'heures dormez-vous en moyenne par nuit ?", min:2, max:12, default:7, unit:"h / nuit", labels:["2h (insomnie)","7h (OMS)","12h+"] },
    { ...PH, id:"difficulte_endormissement",  type:"yesno",  question:"Avez-vous des difficultés à vous endormir ou à rester endormi(e) ?" },
    { ...PH, id:"fatigue_chronique",          type:"yesno",  question:"Ressentez-vous une fatigue persistante, même après une nuit de sommeil complète ?" },
    { ...PH, id:"maux_tete",                  type:"yesno",  question:"Souffrez-vous de maux de tête fréquents (plus de 2 fois par semaine) ?" },
    { ...PH, id:"tensions_musculaires",       type:"yesno",  question:"Avez-vous des tensions musculaires régulières — nuque, dos, épaules ?" },
    { ...PH, id:"troubles_digestifs",         type:"yesno",  question:"Avez-vous des troubles digestifs fréquents : nausées, douleurs abdominales, ballonnements ?" },
    { ...PH, id:"palpitations",               type:"yesno",  question:"Ressentez-vous des palpitations ou un rythme cardiaque accéléré sans effort physique ?" },
    { ...PH, id:"variation_poids",            type:"yesno",  question:"Avez-vous constaté une variation de poids non intentionnelle (plusieurs kg) ?" },
    { ...PH, id:"problemes_cutanes",          type:"yesno",  question:"Avez-vous développé des problèmes de peau (eczéma, urticaire) ou une chute de cheveux inhabituelle ?" },
    { ...PH, id:"douleurs_chroniques",        type:"yesno",  question:"Souffrez-vous de douleurs musculaires ou articulaires chroniques sans cause médicale identifiée ?" },
    { ...PH, id:"infections_frequentes",      type:"yesno",  question:"Tombez-vous plus souvent malade qu'avant — rhumes à répétition, infections fréquentes ?" },

    // ÉMOTIONNEL
    { ...EM, id:"anxiete",                type:"yesno", question:"Ressentez-vous une anxiété fréquente que vous avez du mal à contrôler ?" },
    { ...EM, id:"irritabilite",           type:"yesno", question:"Êtes-vous plus irritable qu'avant, avec des réactions parfois disproportionnées ?" },
    { ...EM, id:"tristesse",              type:"yesno", question:"Ressentez-vous une tristesse persistante, même sans raison apparente ?" },
    { ...EM, id:"sentiment_vide",         type:"yesno", question:"Avez-vous un sentiment de vide intérieur ou d'épuisement émotionnel profond ?" },
    { ...EM, id:"cynisme",                type:"yesno", question:"Avez-vous développé une attitude cynique ou très négative envers votre travail ou collègues ?" },
    { ...EM, id:"detachement",            type:"yesno", question:"Vous sentez-vous émotionnellement détaché(e) de votre travail et des personnes autour de vous ?" },
    { ...EM, id:"crises_larmes",          type:"yesno", question:"Avez-vous des crises de larmes fréquentes ou imprévisibles ?" },
    { ...EM, id:"perte_motivation",       type:"yesno", question:"Avez-vous perdu la motivation pour des activités qui vous plaisaient auparavant ?" },
    { ...EM, id:"honte_echec",            type:"yesno", question:"Avez-vous un fort sentiment de honte, de culpabilité ou d'échec personnel ?" },
    { ...EM, id:"hyperemotivite",         type:"yesno", question:"Des petits événements vous affectent-ils de façon intense et disproportionnée ?" },
    { ...EM, id:"sentiment_impuissance",  type:"yesno", question:"Avez-vous le sentiment que rien de ce que vous faites ne peut changer votre situation ?" },
    { ...EM, id:"angoisse_anticipatoire", type:"yesno", question:"Ressentez-vous de l'angoisse à l'idée d'affronter certaines situations futures (travail, rendez-vous) ?" },

    // COGNITIF
    { ...CG, id:"difficultes_concentration",   type:"yesno", question:"Avez-vous des difficultés à vous concentrer, même sur des tâches simples du quotidien ?" },
    { ...CG, id:"problemes_memoire",           type:"yesno", question:"Avez-vous des trous de mémoire ou des oublis inhabituellement fréquents ?" },
    { ...CG, id:"rumination",                  type:"yesno", question:"Avez-vous des pensées négatives répétitives qui tournent en boucle, surtout la nuit ?" },
    { ...CG, id:"indecision",                  type:"yesno", question:"Avez-vous du mal à prendre des décisions, même des décisions simples du quotidien ?" },
    { ...CG, id:"sentiment_incompetence",      type:"yesno", question:"Avez-vous le sentiment de ne plus être aussi efficace ou compétent(e) qu'avant ?" },
    { ...CG, id:"pensees_negatives",           type:"yesno", question:"Avez-vous des pensées automatiques très négatives sur vous-même ou votre avenir ?" },
    { ...CG, id:"confusion_mentale",           type:"yesno", question:"Ressentez-vous un brouillard mental — une incapacité à penser clairement (brain fog) ?" },
    { ...CG, id:"perte_creativite",            type:"yesno", question:"Avez-vous perdu votre créativité, votre curiosité ou l'envie de proposer de nouvelles idées ?" },
    { ...CG, id:"hypersensibilite_sensorielle",type:"yesno", question:"Êtes-vous devenu(e) hypersensible aux bruits, lumières ou situations stressantes ?" },
    { ...CG, id:"perte_sens_travail",          type:"yesno", question:"Votre travail vous semble-t-il vide de sens ou sans intérêt ?" },

    // COMPORTEMENTAL
    { ...CB, id:"isolement",           type:"yesno", question:"Évitez-vous les contacts sociaux — amis, famille, collègues — plus qu'avant ?" },
    { ...CB, id:"procrastination",     type:"yesno", question:"Procrastinez-vous excessivement, même pour des tâches importantes ?" },
    { ...CB, id:"alcool",              type:"yesno", question:"Avez-vous augmenté votre consommation d'alcool pour décompresser ou oublier ?" },
    { ...CB, id:"cafeine_excessive",   type:"yesno", question:"Consommez-vous plus de 5 cafés ou boissons énergisantes par jour pour tenir le coup ?" },
    { ...CB, id:"absenteisme",         type:"yesno", question:"Avez-vous du mal à vous rendre au travail — retards fréquents, absences, arrêts maladie répétés ?" },
    { ...CB, id:"abandon_loisirs",     type:"yesno", question:"Avez-vous complètement abandonné vos loisirs — sport, hobbies, sorties, voyages ?" },
    { ...CB, id:"negligence_soi",      type:"yesno", question:"Avez-vous tendance à négliger votre alimentation, hygiène ou apparence par manque d'énergie ?" },
    { ...CB, id:"hyperconnexion",      type:"yesno", question:"Consultez-vous vos emails professionnels le soir, le week-end ou en vacances sans pouvoir décrocher ?" },
    { ...CB, id:"agressivite",         type:"yesno", question:"Avez-vous des accès de colère ou sautes d'humeur imprévisibles difficiles à contrôler ?" },
    { ...CB, id:"medicaments_stress",  type:"yesno", question:"Prenez-vous des somnifères, anxiolytiques ou autres médicaments pour gérer votre stress/sommeil ?" },
    { ...CB, id:"tabagisme_augmente",  type:"yesno", question:"Avez-vous augmenté votre consommation de tabac depuis que vous vous sentez stressé(e) ?" },

    // CONTEXTE
    { ...CT, id:"manque_reconnaissance", type:"yesno", question:"Avez-vous le sentiment de ne pas être reconnu(e) ou valorisé(e) pour votre travail ?" },
    { ...CT, id:"conflits_travail",      type:"yesno", question:"Avez-vous des conflits fréquents avec des collègues, supérieurs ou clients ?" },
    { ...CT, id:"manque_autonomie",      type:"yesno", question:"Avez-vous le sentiment de n'avoir aucun contrôle sur votre travail ou organisation ?" },
    { ...CT, id:"ambiguite_role",        type:"yesno", question:"Vos responsabilités et missions sont-elles floues, contradictoires ou excessives ?" },
    { ...CT, id:"insecurite_emploi",     type:"yesno", question:"Avez-vous peur de perdre votre emploi ou craignez-vous des changements professionnels importants ?" },
    { ...CT, id:"teletravail_isolant",   type:"yesno", question:"Le télétravail vous isole-t-il excessivement et aggrave-t-il votre sentiment de solitude ?" },
    { ...CT, id:"charge_emotionnelle",   type:"yesno", question:"Votre travail exige-t-il de gérer les émotions des autres (patients, clients, élèves) de façon épuisante ?" },

    // URGENCE
    { ...UR, id:"pensees_suicidaires", type:"yesno",
      question:"Avez-vous eu des pensées de vous faire du mal ou de mettre fin à vos jours ?",
      sensitive: true,
      help:"Cette question est strictement confidentielle. Si vous répondez oui, vous recevrez immédiatement des ressources d'aide disponibles 24h/24, gratuitement et anonymement." }
  ];

  /* ══════════════════════════════════════════════
     SOURCES SCIENTIFIQUES
  ══════════════════════════════════════════════ */
  const SOURCES_BASE = [
    { icon:"🌍", nom:"OMS — CIM-11 Burnout (QD85)", desc:"Classification Internationale des Maladies, 11e révision. Définition officielle.", url:"https://icd.who.int" },
    { icon:"📊", nom:"Maslach Burnout Inventory (MBI)", desc:"Échelle de référence mondiale, validée dans 40+ pays. Maslach & Jackson, 1981.", url:"https://www.mindgarden.com/117-maslach-burnout-inventory" },
    { icon:"🇫🇷", nom:"INRS — Stress et burnout", desc:"Institut National de Recherche et de Sécurité. Guide officiel risques psychosociaux.", url:"https://www.inrs.fr/risques/stress.html" },
    { icon:"🏥", nom:"HAS — Haute Autorité de Santé", desc:"Recommandations cliniques officielles pour la prise en charge du burnout.", url:"https://www.has-sante.fr" },
    { icon:"📖", nom:"DSM-5 — APA (2013)", desc:"Manuel Diagnostique et Statistique des Troubles Mentaux, 5e édition.", url:"https://www.psychiatry.org/psychiatrists/practice/dsm" },
    { icon:"🔬", nom:"PubMed — Littérature scientifique", desc:"Base internationale de recherches peer-reviewed sur le burnout.", url:"https://pubmed.ncbi.nlm.nih.gov/?term=burnout" },
  ];

  const SOURCES_AIDE = [
    { icon:"📞", nom:"3114 — Prévention Suicide", type:"emergency", desc:"Numéro National, gratuit, 24h/24, 7j/7. Professionnels formés.", url:"https://www.3114.fr" },
    { icon:"🧠", nom:"Psychologue.net", desc:"Trouver un psychologue agréé. Cabinet ou séances en ligne.", url:"https://www.psychologue.net" },
    { icon:"💬", nom:"Fil Santé Jeunes", desc:"0 800 235 236 — Gratuit, anonyme, 24h/24 pour les jeunes.", url:"https://www.filsantejeunes.com" },
  ];

  /* ══════════════════════════════════════════════
     MOTEUR D'INFÉRENCE — CHAÎNAGE AVANT
  ══════════════════════════════════════════════ */
  function analyser(faits) {
    // 1. Sécurité urgence
    const ps = faits.pensees_suicidaires;
    faits.pensees_suicidaires = (ps === true || ps === "true");

    let score   = 0;
    let syms    = [];
    let urgence = false;

    // 2. Évaluation des 60 règles (chaînage avant)
    for (const r of REGLES) {
      try {
        if (r.cond(faits)) {
          if (r.emergency) {
            if (faits.pensees_suicidaires) {
              urgence = true;
              score   = 100;
              syms.push({ id:r.id, nom:r.nom, cat:r.cat, points:100, src:r.src, expl:r.expl });
              break; // Arrêt immédiat
            }
          } else {
            score += r.pts;
            syms.push({ id:r.id, nom:r.nom, cat:r.cat, points:r.pts, src:r.src, expl:r.expl });
          }
        }
      } catch(e) { /* tolérance aux erreurs */ }
    }

    // 3. Plafonnement
    if (!urgence) score = Math.min(score, 89);

    // 4. Niveau
    let niveau = NIVEAUX[4];
    for (const n of NIVEAUX) {
      if (score >= n.min && score <= n.max) { niveau = n; break; }
    }

    // 5. Stats catégories
    const cats = { physique:0, emotionnel:0, cognitif:0, comportemental:0, contexte:0, combinaison:0 };
    syms.forEach(s => { if (s.cat in cats) cats[s.cat]++; });

    // 6. Sources
    const sources = ["burnout","danger","stress_eleve"].includes(niveau.id)
      ? [...SOURCES_AIDE, ...SOURCES_BASE]
      : SOURCES_BASE;

    return { score, niveau, urgence, symptomes: syms, categories: cats,
             prenom: faits.prenom || "", sources };
  }

  return { analyser, QUESTIONS, NIVEAUX };
})();
