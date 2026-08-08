# Genere main-exercices-chimie.html a partir du meme gabarit de carte que la page physique
$ErrorActionPreference = 'Stop'
$sp = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)

$diff = @{
    'facile' = @{ label = 'Débutant&nbsp;(*)';        cls = 'bg-flask-50 text-flask-700 dark:bg-flask-500/10 dark:text-flask-400' }
    'moyen'  = @{ label = 'Intermédiaire&nbsp;(**)';  cls = 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' }
    'avance' = @{ label = 'Avancé&nbsp;(***)';        cls = 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' }
}

$series = @(
    @{ dom='Cinétique chimique';   d='moyen';  lvl='L1 / CPGE 1'; n=5; t='~90 min';
       titre='Série 1 : Cinétique chimique et régimes réactionnels';
       desc='Lois de vitesse, détermination de l''ordre d''une réaction, méthode différentielle et intégrale, loi d''Arrhenius et énergie d''activation.';
       sol='chim-cinetique'; pdf='pdf-chim-cinetique' },
    @{ dom='Thermochimie';         d='moyen';  lvl='L1 / CPGE 1'; n=4; t='~75 min';
       titre='Série 2 : Enthalpies de réaction et constante d''équilibre';
       desc='Loi de Hess, cycle d''Hess, enthalpie libre de réaction, affinité chimique et déplacements d''équilibre (principe de Le Chatelier).';
       sol='chim-thermo'; pdf='pdf-chim-thermo' },
    @{ dom='Chimie organique';     d='avance'; lvl='L2 / CPGE 2'; n=6; t='~120 min';
       titre='Série 3 : Substitution nucléophile et élimination (SN1, SN2, E1, E2)';
       desc='Mécanismes réactionnels, stéréochimie des produits, compétition entre substitution et élimination, effet des solvants et du nucléophile.';
       sol='chim-orga-sn-e'; pdf='pdf-chim-orga-sn-e' },
    @{ dom='Chimie des solutions'; d='facile'; lvl='L1 / CPGE 1'; n=5; t='~60 min';
       titre='Série 4 : Équilibres acido-basiques et solutions tampons';
       desc='Calcul du pH pour des mélanges d''acides et bases forts/faibles, diagrammes de prédominance et pouvoir tampon.';
       sol='chim-sol-acidobasique'; pdf='pdf-chim-sol-acidobasique' },
    @{ dom='Électrochimie';        d='avance'; lvl='L2 / CPGE 2'; n=4; t='~95 min';
       titre='Série 5 : Piles électrochimiques et équation de Nernst';
       desc='Potentiels d''oxydoréduction, construction des diagrammes potentiel-pH (Pourbaix) et équilibres aux électrodes.';
       sol='chim-electro-nernst'; pdf='pdf-chim-electro-nernst' }
)

$card = @'
                <article class="exercise-card flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-soft transition-all duration-300 hover:border-flask-200 hover:shadow-lift lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900 dark:hover:border-flask-900">
                    <div class="flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="badge badge-chimie inline-flex items-center rounded-full bg-flask-50 px-3 py-1 text-xs font-semibold text-flask-700 dark:bg-flask-500/10 dark:text-flask-400">{{DOM}}</span>
                            <span class="inline-flex items-center rounded-full {{DIFFCLS}} px-3 py-1 text-xs font-semibold">{{DIFF}}</span>
                            <span class="text-xs font-medium text-slate-400 dark:text-slate-500">{{LVL}}</span>
                        </div>
                        <h3 class="mt-4 font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {{TITRE}}
                        </h3>
                        <p class="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                            {{DESC}}
                        </p>
                        <ul class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                            <li class="flex items-center gap-2">
                                <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                                {{N}} exercices
                            </li>
                            <li class="flex items-center gap-2">
                                <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                {{TIME}}
                            </li>
                        </ul>
                    </div>

                    <div class="card-actions flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-stretch">
                        <a href="solutions.html#{{SOL}}" class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-flask-600 dark:bg-white dark:text-slate-900 dark:hover:bg-flask-500 dark:hover:text-white">Voir les solutions</a>
                        <a href="telechargements.html#{{PDF}}" class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Télécharger PDF</a>
                        <a href="favoris.html" class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100">Ajouter aux favoris</a>
                    </div>
                </article>
'@

$cards = ($series | ForEach-Object {
    $c = $card
    $c = $c.Replace('{{DOM}}',   $_.dom)
    $c = $c.Replace('{{DIFF}}',    $diff[$_.d].label)
    $c = $c.Replace('{{DIFFCLS}}', $diff[$_.d].cls)
    $c = $c.Replace('{{LVL}}',   $_.lvl)
    $c = $c.Replace('{{TITRE}}', $_.titre)
    $c = $c.Replace('{{DESC}}',  $_.desc)
    $c = $c.Replace('{{N}}',     [string]$_.n)
    $c = $c.Replace('{{TIME}}',  $_.t)
    $c = $c.Replace('{{SOL}}',   $_.sol)
    $c = $c.Replace('{{PDF}}',   $_.pdf)
    $c
}) -join "`r`n"

$page = @'
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
                        <li class="font-medium text-slate-900 dark:text-white">Exercices de Chimie</li>
                    </ol>
                </nav>

                <p class="text-sm font-semibold uppercase tracking-[0.18em] text-flask-600 dark:text-flask-400">Banque d'exercices</p>
                <h1 class="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                    Exercices de Chimie
                </h1>
                <p class="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                    Problèmes, travaux dirigés et sujets d'entraînement classés par domaine, par niveau et par difficulté.
                </p>

                <dl class="mt-12 grid max-w-2xl grid-cols-2 gap-6 border-t border-slate-200 pt-8 sm:grid-cols-4 dark:border-slate-800">
                    <div>
                        <dt class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">5</dt>
                        <dd class="mt-1 text-sm text-slate-500 dark:text-slate-400">Séries publiées</dd>
                    </div>
                    <div>
                        <dt class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">24</dt>
                        <dd class="mt-1 text-sm text-slate-500 dark:text-slate-400">Exercices</dd>
                    </div>
                    <div>
                        <dt class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">6</dt>
                        <dd class="mt-1 text-sm text-slate-500 dark:text-slate-400">Domaines</dd>
                    </div>
                    <div>
                        <dt class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">100%</dt>
                        <dd class="mt-1 text-sm text-slate-500 dark:text-slate-400">Corrigés</dd>
                    </div>
                </dl>
            </div>
        </section>

        <!-- Filtres -->
        <section class="filter-section mx-auto max-w-7xl px-6 py-12 lg:px-8" aria-labelledby="titre-filtres">
            <div class="rounded-3xl border border-slate-200 bg-white p-7 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <h2 id="titre-filtres" class="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Filtrer les exercices
                </h2>

                <form action="exercices-chimie.html" method="get" class="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                    <div>
                        <label for="domaine" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Domaine</label>
                        <select name="domaine" id="domaine"
                                class="mt-2 w-full rounded-xl border-slate-200 bg-white py-3 pl-4 pr-10 text-sm text-slate-900 shadow-sm transition-colors focus:border-flask-500 focus:ring-4 focus:ring-flask-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                            <option value="tous">Tous les domaines</option>
                            <option value="thermochimie">Thermochimie &amp; Équilibres chimiques</option>
                            <option value="cinetique">Cinétique chimique</option>
                            <option value="organique">Chimie organique</option>
                            <option value="solutions">Chimie des solutions &amp; Acido-basicité</option>
                            <option value="electrochimie">Électrochimie &amp; Oxydoréduction</option>
                            <option value="atomistique">Atomistique &amp; Structure de la matière</option>
                        </select>
                    </div>

                    <div>
                        <label for="niveau" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Niveau</label>
                        <select name="niveau" id="niveau"
                                class="mt-2 w-full rounded-xl border-slate-200 bg-white py-3 pl-4 pr-10 text-sm text-slate-900 shadow-sm transition-colors focus:border-flask-500 focus:ring-4 focus:ring-flask-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                            <option value="tous">Tous les niveaux</option>
                            <option value="l1">L1 / CPGE 1ère année</option>
                            <option value="l2">L2 / CPGE 2ème année</option>
                            <option value="l3">L3 / Master / Agrégation</option>
                        </select>
                    </div>

                    <div>
                        <label for="difficulte" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Difficulté</label>
                        <select name="difficulte" id="difficulte"
                                class="mt-2 w-full rounded-xl border-slate-200 bg-white py-3 pl-4 pr-10 text-sm text-slate-900 shadow-sm transition-colors focus:border-flask-500 focus:ring-4 focus:ring-flask-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                            <option value="toutes">Toutes</option>
                            <option value="facile">Débutant (*)</option>
                            <option value="moyen">Intermédiaire (**)</option>
                            <option value="avance">Avancé (***)</option>
                        </select>
                    </div>

                    <button type="submit"
                            class="inline-flex items-center justify-center gap-2 rounded-xl bg-flask-600 px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:bg-flask-700">
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
                        Filtrer
                    </button>
                </form>
            </div>
        </section>

        <!-- Liste des séries -->
        <section class="exercises-list mx-auto max-w-7xl px-6 pb-4 lg:px-8" aria-labelledby="titre-series">
            <h2 id="titre-series" class="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Séries d'exercices disponibles
            </h2>

            <div class="mt-8 grid gap-6">

{{CARDS}}
            </div>
        </section>

        <!-- Pagination -->
        <nav aria-label="Pagination des exercices" class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <ul class="flex items-center justify-center gap-2">
                <li><span class="inline-flex cursor-not-allowed items-center rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 dark:text-slate-600">Précédent</span></li>
                <li><a href="#" aria-current="page" class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-flask-600 text-sm font-semibold text-white shadow-soft">1</a></li>
                <li><a href="#" class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-flask-300 hover:text-flask-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">2</a></li>
                <li><a href="#" class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-flask-300 hover:text-flask-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">3</a></li>
                <li><a href="#" class="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-flask-300 hover:text-flask-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Suivant</a></li>
            </ul>
        </nav>
    </main>
'@

$page = $page.Replace('{{CARDS}}', $cards)
[System.IO.File]::WriteAllText((Join-Path $sp 'main-exercices-chimie.html'), $page, $utf8)
Write-Output ("main-exercices-chimie.html : " + $page.Length + " caracteres")
