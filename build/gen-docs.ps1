# Genere main-solutions.html et main-telechargements.html
$ErrorActionPreference = 'Stop'
$sp = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)

$CODE = 'class="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800 dark:bg-slate-800 dark:text-slate-200"'

# ===================================================================== SOLUTIONS
$corriges = @(
    @{ id='phys-meca-osc'; mat='phys'; badge='Physique'; ref='PHYS-MECA-01'; niveau='L1 / CPGE 1';
       titre='Corrigé — Série 1 : Oscillateur harmonique amorti et forcé';
       apercu='Résolution de l''équation différentielle linéaire du second ordre à coefficients constants avec second membre sinusoïdal. Passage en représentation complexe pour la recherche du régime permanent.';
       pdf='pdf-meca-osc';
       etapes=@(
         @{ t='Étape 1 — Équation du mouvement';
            p=@('Appliquer le principe fondamental de la dynamique (PFD) dans le référentiel terrestre supposé galiléen.');
            f='m d²x/dt² + h dx/dt + k x = F₀ cos(ω t)' },
         @{ t='Étape 2 — Régime sinusoïdal forcé';
            p=@('En notation complexe, on isole l''amplitude complexe puis on en déduit le déphasage de la réponse du système par rapport à l''excitation.');
            f='(−m ω² + j h ω + k) X_m = F₀' }
       ) },

    @{ id='phys-thermo-cycles'; mat='phys'; badge='Physique'; ref='PHYS-THERMO-02'; niveau='L1 / CPGE 1';
       titre='Corrigé — Série 2 : Cycles thermodynamiques et machines thermiques';
       apercu='Calcul des travaux et des transferts thermiques pour chaque transformation (isotherme, isochore, isobare, adiabatique) puis vérification du premier et du second principe.';
       pdf='pdf-thermo-cycles';
       etapes=@(
         @{ t='Étape 1 — Bilans d''énergie';
            p=@('Utilisation de la première loi de Joule pour un gaz parfait, puis intégration du travail élémentaire sur chaque transformation.');
            f='dU = C_v dT     et     δW = −P_ext dV' },
         @{ t='Étape 2 — Rendement et efficacité';
            p=@('Définir le rendement du cycle et le comparer au rendement maximal de Carnot pour vérifier la cohérence du résultat.');
            f='η = −W / Q_chaud     ≤     η_Carnot = 1 − T_f / T_c' }
       ) },

    @{ id='chim-cinetique'; mat='chim'; badge='Chimie'; ref='CHIM-CINE-01'; niveau='L1 / CPGE 1';
       titre='Corrigé — Série 1 : Cinétique chimique et régimes réactionnels';
       apercu='Intégration de la loi de vitesse d''ordre 1 et 2. Graphiques de linéarisation pour vérifier l''ordre d''une réaction et calculer la constante de vitesse k.';
       pdf='pdf-chim-cinetique';
       etapes=@(
         @{ t='Étape 1 — Intégration de la vitesse';
            p=@('Pour un ordre 1, la linéarisation du logarithme de la concentration donne directement la constante de vitesse. Le temps de demi-réaction en découle.');
            f='ln([A]₀ / [A]) = k t     →     t₁/₂ = ln(2) / k' },
         @{ t='Étape 2 — Énergie d''activation';
            p=@('Analyse de la variation de la constante de vitesse en fonction de la température grâce à la loi d''Arrhenius.');
            f='ln(k) = ln(A) − E_a / (R T)' }
       ) },

    @{ id='chim-orga-sn-e'; mat='chim'; badge='Chimie'; ref='CHIM-ORGA-03'; niveau='L2 / CPGE 2';
       titre='Corrigé — Série 3 : Substitution nucléophile et élimination (SN1, SN2, E1, E2)';
       apercu='Analyse de la classe du dérivé halogéné, de la force du nucléophile ou de la base et de la polarité du solvant pour trancher entre les voies monomoléculaire et bimoléculaire.';
       pdf='pdf-chim-orga-sn-e';
       etapes=@(
         @{ t='Étape 1 — Analyse des réactifs';
            p=@('Le substrat tertiaire favorise la formation du carbocation intermédiaire via une étape cinétiquement déterminante (mécanismes SN1 et E1).');
            f='R₃C—X  →  R₃C⁺ + X⁻   (étape lente)' },
         @{ t='Étape 2 — Stéréochimie';
            p=@('Pour la SN1, le carbocation plan autorise l''attaque du nucléophile par les deux faces, menant à un mélange racémique.');
            f='attaque faces Re / Si  →  mélange racémique (50/50)' }
       ) }
)

function Render-Corrige($c) {
    if ($c.mat -eq 'phys') {
        $bCls = 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
        $hov  = 'hover:border-brand-200 dark:hover:border-brand-900'
        $btn  = 'hover:bg-brand-600 dark:hover:bg-brand-500'
    } else {
        $bCls = 'bg-flask-50 text-flask-700 dark:bg-flask-500/10 dark:text-flask-400'
        $hov  = 'hover:border-flask-200 dark:hover:border-flask-900'
        $btn  = 'hover:bg-flask-600 dark:hover:bg-flask-500'
    }

    $etapes = ($c.etapes | ForEach-Object {
        $paras = ($_.p | ForEach-Object { "                                <p class=`"mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400`">$_</p>" }) -join "`r`n"
        @"
                            <li class="relative pl-8">
                                <span class="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-brand-500 bg-white dark:bg-slate-900" aria-hidden="true"></span>
                                <h5 class="font-display text-sm font-bold uppercase tracking-[0.12em] text-slate-900 dark:text-white">$($_.t)</h5>
$paras
                                <p class="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">$($_.f)</p>
                            </li>
"@
    }) -join "`r`n"

    @"
                <article class="solution-card flex flex-col scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-7 shadow-soft transition-colors duration-300 $hov dark:border-slate-800 dark:bg-slate-900" id="$($c.id)">
                    <header>
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="badge inline-flex items-center rounded-full $bCls px-3 py-1 text-xs font-semibold">$($c.badge)</span>
                            <span class="text-xs font-medium text-slate-400 dark:text-slate-500">$($c.niveau)</span>
                            <span aria-hidden="true" class="text-xs text-slate-300 dark:text-slate-600">•</span>
                            <span class="font-mono text-xs text-slate-400 dark:text-slate-500">$($c.ref)</span>
                        </div>
                        <h3 class="mt-4 font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">$($c.titre)</h3>
                    </header>

                    <div class="solution-summary mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
                        <h4 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Aperçu de la méthode</h4>
                        <p class="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">$($c.apercu)</p>
                    </div>

                    <details class="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                        <summary class="flex items-center justify-between gap-4 bg-slate-50 px-5 py-4 dark:bg-slate-950/50">
                            <span class="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">Afficher la résolution complète</span>
                            <span class="details-chevron grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 transition-transform duration-300 dark:bg-slate-800 dark:text-slate-400" aria-hidden="true">
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </span>
                        </summary>
                        <div class="solution-content border-t border-slate-200 p-6 dark:border-slate-800">
                            <ol class="grid gap-7">
$etapes
                            </ol>
                        </div>
                    </details>

                    <div class="card-actions mt-6 flex flex-wrap gap-2">
                        <a href="telechargements.html#$($c.pdf)" class="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors $btn dark:bg-white dark:text-slate-900 dark:hover:text-white">Télécharger le corrigé PDF</a>
                        <a href="favoris.html" class="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100">Ajouter aux favoris</a>
                    </div>
                </article>
"@
}

$cards = ($corriges | ForEach-Object { Render-Corrige $_ }) -join "`r`n`r`n"

$solutions = @"
    <main id="contenu">

        <!-- En-tête de page -->
        <section class="relative isolate overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div class="pointer-events-none absolute inset-0 bg-grid" aria-hidden="true"></div>
            <div class="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-flask-500/10 blur-3xl dark:bg-flask-600/20" aria-hidden="true"></div>

            <div class="relative mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:px-8">
                <nav aria-label="Fil d'Ariane" class="mb-8">
                    <ol class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <li><a href="index.html" class="transition-colors hover:text-brand-600 dark:hover:text-brand-400">Accueil</a></li>
                        <li aria-hidden="true" class="text-slate-300 dark:text-slate-600">/</li>
                        <li class="font-medium text-slate-900 dark:text-white">Solutions</li>
                    </ol>
                </nav>

                <p class="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Corrigés</p>
                <h1 class="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                    Solutions &amp; Corrigés Détaillés
                </h1>
                <p class="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                    Consultez les étapes de résolution, les démarches méthodologiques et la rédaction complète des exercices.
                </p>
            </div>
        </section>

        <!-- Recherche d'un corrigé -->
        <section class="filter-section mx-auto max-w-7xl px-6 py-12 lg:px-8" aria-labelledby="titre-filtres">
            <div class="rounded-3xl border border-slate-200 bg-white p-7 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <h2 id="titre-filtres" class="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Rechercher un corrigé
                </h2>

                <form action="solutions.html" method="get" class="mt-6 grid gap-5 md:grid-cols-[1fr_2fr_auto] md:items-end">
                    <div>
                        <label for="matiere" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Matière</label>
                        <select name="matiere" id="matiere"
                                class="mt-2 w-full rounded-xl border-slate-200 bg-white py-3 pl-4 pr-10 text-sm text-slate-900 shadow-sm transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                            <option value="toutes">Toutes les matières</option>
                            <option value="physique">Physique</option>
                            <option value="chimie">Chimie</option>
                        </select>
                    </div>

                    <div>
                        <label for="motcle" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Mot-clé ou référence</label>
                        <input type="text" id="motcle" name="motcle" placeholder="Ex : Oscillateur, Nernst, SN1…"
                               class="mt-2 w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                    </div>

                    <button type="submit"
                            class="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-700">
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        Rechercher
                    </button>
                </form>
            </div>
        </section>

        <!-- Liste des corrigés -->
        <section class="solutions-list mx-auto max-w-7xl px-6 pb-4 lg:px-8" aria-labelledby="titre-corriges">
            <h2 id="titre-corriges" class="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Derniers corrigés consultables
            </h2>

            <div class="mt-8 grid gap-6">
$cards
            </div>
        </section>

        <!-- Pagination -->
        <nav aria-label="Pagination des solutions" class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <ul class="flex items-center justify-center gap-2">
                <li><span class="inline-flex cursor-not-allowed items-center rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 dark:text-slate-600">Précédent</span></li>
                <li><a href="#" aria-current="page" class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-glow">1</a></li>
                <li><a href="#" class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">2</a></li>
                <li><a href="#" class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">3</a></li>
                <li><a href="#" class="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Suivant</a></li>
            </ul>
        </nav>
    </main>
"@

[System.IO.File]::WriteAllText((Join-Path $sp 'main-solutions.html'), $solutions, $utf8)
Write-Output ("main-solutions.html : " + $solutions.Length + " caracteres")


# =============================================================== TELECHARGEMENTS
$cats = @(
    @{ titre='Fiches récapitulatives &amp; formulaires'; icone='<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 13h6"/><path d="M9 17h3"/>'; rows=@(
        @{ id='pdf-thermo';               t='Formulaire complet de Thermodynamique Macroscopique';                mat='Physique'; niv='L1 / CPGE 1'; taille='1.2 Mo' },
        @{ id='pdf-em-maxwell';           t='Fiche de synthèse : Équations de Maxwell &amp; Ondes';               mat='Physique'; niv='L2 / CPGE 2'; taille='850 Ko' },
        @{ id='pdf-chim-orga-sn-e';       t='Aide-mémoire : Mécanismes de Chimie Organique (SN1, SN2, E1, E2)';  mat='Chimie';   niv='L2 / CPGE 2'; taille='1.8 Mo' },
        @{ id='pdf-chim-electro-nernst';  t='Fiche de cours : Diagrammes E-pH et Électrochimie';                 mat='Chimie';   niv='L2 / CPGE 2'; taille='940 Ko' }
      ) },
    @{ titre='Polycopiés de cours complets'; icone='<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'; rows=@(
        @{ id='cours-meca';         t='Polycopié : Mécanique du Point et du Solide (6 chapitres)'; mat='Physique'; niv='L1 / CPGE 1'; taille='4.5 Mo' },
        @{ id='cours-thermo';       t='Polycopié : Thermodynamique &amp; Changements d''état';      mat='Physique'; niv='L1 / CPGE 1'; taille='3.1 Mo' },
        @{ id='cours-thermochimie'; t='Polycopié : Thermochimie &amp; Équilibres en Solution';      mat='Chimie';   niv='L1 / CPGE 1'; taille='2.9 Mo' },
        @{ id='cours-orga';         t='Polycopié : Chimie Organique Structurale et Réactivité';    mat='Chimie';   niv='L2 / CPGE 2'; taille='5.2 Mo' }
      ) },
    @{ titre='Protocoles de travaux pratiques (TP)'; icone='<path d="M10 2v7.31a2 2 0 0 1-.24.95l-5.5 9.9A2 2 0 0 0 6 23h12a2 2 0 0 0 1.74-2.84l-5.5-9.9a2 2 0 0 1-.24-.95V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>'; rows=@(
        @{ id='tp-michelson'; t='TP Physique : Étude de l''interféromètre de Michelson';              mat='Physique'; niv='L2 / CPGE 2'; taille='1.1 Mo' },
        @{ id='tp-spectro';   t='TP Chimie : Suivi cinétique d''une réaction par spectrophotométrie'; mat='Chimie';   niv='L1 / CPGE 1'; taille='780 Ko' },
        @{ id='tp-potentio';  t='TP Chimie : Dosage potentiométrique d''une solution acide/base';     mat='Chimie';   niv='L1 / CPGE 1'; taille='620 Ko' }
      ) }
)

function Render-Cat($c) {
    $rows = ($c.rows | ForEach-Object {
        if ($_.mat -eq 'Physique') { $mCls = 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' }
        else                       { $mCls = 'bg-flask-50 text-flask-700 dark:bg-flask-500/10 dark:text-flask-400' }
        @"
                            <tr id="$($_.id)" class="scroll-mt-28 border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                                <td class="px-6 py-5">
                                    <span class="font-medium text-slate-900 dark:text-white">$($_.t)</span>
                                </td>
                                <td class="px-6 py-5">
                                    <span class="inline-flex items-center rounded-full $mCls px-3 py-1 text-xs font-semibold">$($_.mat)</span>
                                </td>
                                <td class="whitespace-nowrap px-6 py-5 text-sm text-slate-500 dark:text-slate-400">$($_.niv)</td>
                                <td class="whitespace-nowrap px-6 py-5 text-sm text-slate-500 dark:text-slate-400">$($_.taille)</td>
                                <td class="whitespace-nowrap px-6 py-5 text-right">
                                    <a href="#" class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 dark:bg-white dark:text-slate-900 dark:hover:bg-brand-500 dark:hover:text-white">
                                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
                                        PDF
                                    </a>
                                </td>
                            </tr>
"@
    }) -join "`r`n"

    @"
            <section class="download-category min-w-0" aria-labelledby="cat-$($c.rows[0].id)">
                <div class="flex items-center gap-3">
                    <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" aria-hidden="true">
                        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">$($c.icone)</svg>
                    </span>
                    <h2 id="cat-$($c.rows[0].id)" class="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">$($c.titre)</h2>
                </div>

                <div class="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-[46rem] border-collapse text-left">
                            <thead>
                                <tr class="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
                                    <th scope="col" class="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Document</th>
                                    <th scope="col" class="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Matière</th>
                                    <th scope="col" class="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Niveau</th>
                                    <th scope="col" class="px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Taille</th>
                                    <th scope="col" class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Action</th>
                                </tr>
                            </thead>
                            <tbody>
$rows
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
"@
}

$catBlocks = ($cats | ForEach-Object { Render-Cat $_ }) -join "`r`n`r`n"

$telech = @"
    <main id="contenu">

        <!-- En-tête de page -->
        <section class="relative isolate overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div class="pointer-events-none absolute inset-0 bg-grid" aria-hidden="true"></div>
            <div class="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-600/20" aria-hidden="true"></div>

            <div class="relative mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:px-8">
                <nav aria-label="Fil d'Ariane" class="mb-8">
                    <ol class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <li><a href="index.html" class="transition-colors hover:text-brand-600 dark:hover:text-brand-400">Accueil</a></li>
                        <li aria-hidden="true" class="text-slate-300 dark:text-slate-600">/</li>
                        <li class="font-medium text-slate-900 dark:text-white">Téléchargements</li>
                    </ol>
                </nav>

                <p class="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Ressources PDF</p>
                <h1 class="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                    Centre de Téléchargement
                </h1>
                <p class="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                    Retrouvez l'ensemble de nos supports pédagogiques en libre accès au format PDF : cours, fiches de révision, sujets de TP et annales.
                </p>
            </div>
        </section>

        <!-- Filtres -->
        <section class="filter-section mx-auto max-w-7xl px-6 py-12 lg:px-8" aria-labelledby="titre-filtres">
            <div class="rounded-3xl border border-slate-200 bg-white p-7 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <h2 id="titre-filtres" class="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Filtrer les fichiers
                </h2>

                <form action="telechargements.html" method="get" class="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                    <div>
                        <label for="type" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Type de document</label>
                        <select name="type" id="type"
                                class="mt-2 w-full rounded-xl border-slate-200 bg-white py-3 pl-4 pr-10 text-sm text-slate-900 shadow-sm transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                            <option value="tous">Tous les documents</option>
                            <option value="fiches">Fiches de synthèse &amp; formulaires</option>
                            <option value="polys">Polycopiés de cours</option>
                            <option value="tp">Sujets &amp; protocoles de TP</option>
                            <option value="examens">Annales &amp; sujets d'examens</option>
                        </select>
                    </div>

                    <div>
                        <label for="matiere" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Matière</label>
                        <select name="matiere" id="matiere"
                                class="mt-2 w-full rounded-xl border-slate-200 bg-white py-3 pl-4 pr-10 text-sm text-slate-900 shadow-sm transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                            <option value="toutes">Toutes les matières</option>
                            <option value="physique">Physique</option>
                            <option value="chimie">Chimie</option>
                        </select>
                    </div>

                    <div>
                        <label for="niveau" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Niveau</label>
                        <select name="niveau" id="niveau"
                                class="mt-2 w-full rounded-xl border-slate-200 bg-white py-3 pl-4 pr-10 text-sm text-slate-900 shadow-sm transition-colors focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                            <option value="tous">Tous les niveaux</option>
                            <option value="l1">L1 / CPGE 1ère année</option>
                            <option value="l2">L2 / CPGE 2ème année</option>
                            <option value="l3">L3 / Master / Agrégation</option>
                        </select>
                    </div>

                    <button type="submit"
                            class="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-700">
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
                        Filtrer
                    </button>
                </form>
            </div>
        </section>

        <!-- Catégories de documents -->
        <div class="mx-auto grid max-w-7xl gap-16 px-6 pb-4 lg:px-8">
$catBlocks
        </div>

        <!-- Pagination -->
        <nav aria-label="Pagination des téléchargements" class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <ul class="flex items-center justify-center gap-2">
                <li><span class="inline-flex cursor-not-allowed items-center rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 dark:text-slate-600">Précédent</span></li>
                <li><a href="#" aria-current="page" class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-glow">1</a></li>
                <li><a href="#" class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">2</a></li>
                <li><a href="#" class="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Suivant</a></li>
            </ul>
        </nav>
    </main>
"@

[System.IO.File]::WriteAllText((Join-Path $sp 'main-telechargements.html'), $telech, $utf8)
Write-Output ("main-telechargements.html : " + $telech.Length + " caracteres")
