# Genere main-chapitres.html (sommaire des chapitres) a partir des donnees de modules
$ErrorActionPreference = 'Stop'
$sp = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)

# matiere : 'phys' ou 'chim' (pilote la couleur d'accent et la page d'exercices ciblee)
$modules = @(
    @{ id='meca'; mat='phys'; titre='Mécanique du Point et du Solide'; niveau='L1 / CPGE 1ère année'; ch=@(
        @{ a='meca-ch1'; t='Cinématique du point matériel';   d='Vecteurs position, vitesse, accélération. Repères cartésien, cylindrique et sphérique.' },
        @{ a='meca-ch2'; t='Dynamique newtonienne et PFD';    d='Principes fondamentaux de la dynamique, forces de frottement fluide et solide.' },
        @{ a='meca-ch3'; t='Énergétique du point matériel';   d='Travail d''une force, énergie cinétique, forces conservatives et potentiel.' },
        @{ a='meca-ch4'; t='Oscillateurs mécaniques';         d='Oscillateur libre, amorti et forcé en régime sinusoïdal. Résonance.' }) },

    @{ id='thermo'; mat='phys'; titre='Thermodynamique Macroscopique'; niveau='L1 / CPGE 1ère année'; ch=@(
        @{ a='thermo-ch1'; t='Description d''un système à l''équilibre'; d='Variables d''état, équation d''état des gaz parfaits et réels.' },
        @{ a='thermo-ch2'; t='Premier principe de la thermodynamique';   d='Travail, transfert thermique, énergie interne et enthalpie.' },
        @{ a='thermo-ch3'; t='Second principe et entropie';              d='Transformations réversibles et irréversibles, bilan d''entropie.' }) },

    @{ id='electromag'; mat='phys'; titre='Électromagnétisme &amp; Équations de Maxwell'; niveau='L2 / CPGE 2ème année'; ch=@(
        @{ a='em-ch1'; t='Électrostatique et théorème de Gauss';     d='Champ et potentiel électrostatiques, propriétés de symétrie.' },
        @{ a='em-ch2'; t='Magnétostatique et loi de Biot-Savart';    d='Champ magnétostatique, théorème d''Ampère, dipôle magnétique.' },
        @{ a='em-ch3'; t='Équations de Maxwell dans le vide';        d='Formes locales et intégrales, potentiel vecteur et vecteur de Poynting.' }) },

    @{ id='fluides'; mat='phys'; titre='Mécanique des Fluides'; niveau='L2 / L3 / CPGE 2ème année'; ch=@(
        @{ a='fluides-ch1'; t='Statique des fluides';                                  d='Pression, équation fondamentale de l''hydrostatique, poussée d''Archimède.' },
        @{ a='fluides-ch2'; t='Dynamique des fluides parfaits et équation de Bernoulli'; d='Conservation du débit, ligne de courant, applications du théorème de Bernoulli.' }) },

    @{ id='thermochimie'; mat='chim'; titre='Thermochimie &amp; Équilibres Chimiques'; niveau='L1 / CPGE 1ère année'; ch=@(
        @{ a='thermochim-ch1'; t='Premier principe appliqué à la réaction chimique'; d='Enthalpie de réaction, état standard, lois de Hess et de Kirchhoff.' },
        @{ a='thermochim-ch2'; t='Second principe et énergie libre de Gibbs';        d='Enthalpie libre de réaction, constante d''équilibre K° et loi de Van ''t Hoff.' }) },

    @{ id='cinetique'; mat='chim'; titre='Cinétique Chimique'; niveau='L1 / CPGE 1ère année'; ch=@(
        @{ a='cinet-ch1'; t='Vitesse de réaction et ordre de réaction';        d='Lois de vitesse intégrées, temps de demi-réaction, méthode d''isolement d''Ostwald.' },
        @{ a='cinet-ch2'; t='Mécanismes réactionnels en phase homogène';       d='Actes élémentaires, approximation de l''état quasi-stationnaire (AEQS) et étape limitante.' }) },

    @{ id='organique'; mat='chim'; titre='Chimie Organique Structurale'; niveau='L2 / CPGE 2ème année'; ch=@(
        @{ a='orga-ch1'; t='Stéréochimie et conformation';                d='Chiralité, énantiomérie, diastéréoisomérie, représentations de Cram, Newman et Fischer.' },
        @{ a='orga-ch2'; t='Substitution nucléophile et élimination';     d='Étude comparative des mécanismes SN1, SN2, E1 et E2. Régiosélectivité et stéréosélectivité.' }) },

    @{ id='electrochimie'; mat='chim'; titre='Électrochimie &amp; Oxydoréduction'; niveau='L2 / CPGE 2ème année'; ch=@(
        @{ a='electro-ch1'; t='Piles et équation de Nernst';              d='Potentiel d''électrode, constante d''équilibre d''une réaction d''oxydoréduction.' },
        @{ a='electro-ch2'; t='Diagrammes Potentiel-pH (Pourbaix)';       d='Construction, domaines de prédominance, stabilité de l''eau et corrosion.' }) }
)

function Render-Module($m) {
    if ($m.mat -eq 'phys') {
        $accentBg = 'bg-brand-50'; $accentTx = 'text-brand-700'; $accentDk = 'dark:bg-brand-500/10 dark:text-brand-400'
        $hoverBd  = 'hover:border-brand-200 dark:hover:border-brand-900'
        $numBg    = 'bg-brand-600'
        $exPage   = 'exercices-physique.html'
        $label    = 'Physique'
    } else {
        $accentBg = 'bg-flask-50'; $accentTx = 'text-flask-700'; $accentDk = 'dark:bg-flask-500/10 dark:text-flask-400'
        $hoverBd  = 'hover:border-flask-200 dark:hover:border-flask-900'
        $numBg    = 'bg-flask-600'
        $exPage   = 'exercices-chimie.html'
        $label    = 'Chimie'
    }

    $items = @()
    $i = 0
    foreach ($c in $m.ch) {
        $i++
        $items += @"
                    <li class="group relative flex gap-5 rounded-2xl border border-transparent p-5 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-950/50">
                        <span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl $numBg font-display text-sm font-bold text-white" aria-hidden="true">$i</span>
                        <div class="min-w-0">
                            <h4 class="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">$($c.t)</h4>
                            <p class="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">$($c.d)</p>
                            <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                                <a href="cours.html#$($c.a)" class="inline-flex items-center gap-1.5 text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400">
                                    Lire le cours
                                    <svg class="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                </a>
                                <a href="$exPage#$($c.a)" class="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Exercices associés</a>
                            </div>
                        </div>
                    </li>
"@
    }
    $inner = $items -join "`r`n"
    $count = $m.ch.Count

    return @"
            <article class="module-block scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-7 shadow-soft transition-colors duration-300 $hoverBd dark:border-slate-800 dark:bg-slate-900" id="$($m.id)">
                <header class="border-b border-slate-200 pb-6 dark:border-slate-800">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="inline-flex items-center rounded-full $accentBg px-3 py-1 text-xs font-semibold $accentTx $accentDk">$label</span>
                        <span class="text-xs font-medium text-slate-400 dark:text-slate-500">$($m.niveau)</span>
                        <span aria-hidden="true" class="text-xs text-slate-300 dark:text-slate-600">•</span>
                        <span class="text-xs font-medium text-slate-400 dark:text-slate-500">$count chapitres</span>
                    </div>
                    <h3 class="mt-4 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">$($m.titre)</h3>
                </header>

                <ol class="mt-4 grid gap-1">
$inner
                </ol>
            </article>
"@
}

$physModules = ($modules | Where-Object { $_.mat -eq 'phys' } | ForEach-Object { Render-Module $_ }) -join "`r`n`r`n"
$chimModules = ($modules | Where-Object { $_.mat -eq 'chim' } | ForEach-Object { Render-Module $_ }) -join "`r`n`r`n"

function Render-Pills($mat) {
    ($modules | Where-Object { $_.mat -eq $mat } | ForEach-Object {
        $short = $_.titre -replace ' &amp; .*$', '' -replace '^Module : ', ''
        "                    <li><a href=`"#$($_.id)`" class=`"inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:text-brand-400`">$short</a></li>"
    }) -join "`r`n"
}

$page = @'
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
                        <li class="font-medium text-slate-900 dark:text-white">Chapitres</li>
                    </ol>
                </nav>

                <p class="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Programme détaillé</p>
                <h1 class="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                    Sommaire des Chapitres
                </h1>
                <p class="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                    Accédez directement aux chapitres détaillés de nos programmes de physique et de chimie.
                </p>
            </div>
        </section>

        <!-- Accès rapide -->
        <section class="quick-nav mx-auto max-w-7xl px-6 py-12 lg:px-8" aria-labelledby="titre-acces-rapide">
            <div class="rounded-3xl border border-slate-200 bg-white p-7 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                <h2 id="titre-acces-rapide" class="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Accès rapide par discipline
                </h2>

                <div class="mt-6 grid gap-6 md:grid-cols-2">
                    <div>
                        <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Physique</h3>
                        <ul class="mt-4 flex flex-wrap gap-2">
{{PILLS_PHYS}}
                        </ul>
                    </div>
                    <div>
                        <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-flask-600 dark:text-flask-400">Chimie</h3>
                        <ul class="mt-4 flex flex-wrap gap-2">
{{PILLS_CHIM}}
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <!-- Chapitres de Physique -->
        <section class="chapters-section mx-auto max-w-7xl px-6 pb-4 lg:px-8" aria-labelledby="titre-chap-physique">
            <div class="flex items-center gap-3">
                <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" aria-hidden="true">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/></svg>
                </span>
                <h2 id="titre-chap-physique" class="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    Chapitres de Physique
                </h2>
            </div>

            <div class="mt-8 grid gap-6">
{{MODULES_PHYS}}
            </div>
        </section>

        <!-- Chapitres de Chimie -->
        <section class="chapters-section mx-auto max-w-7xl px-6 py-16 lg:px-8" aria-labelledby="titre-chap-chimie">
            <div class="flex items-center gap-3">
                <span class="grid h-10 w-10 place-items-center rounded-xl bg-flask-50 text-flask-600 dark:bg-flask-500/10 dark:text-flask-400" aria-hidden="true">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31a2 2 0 0 1-.24.95l-5.5 9.9A2 2 0 0 0 6 23h12a2 2 0 0 0 1.74-2.84l-5.5-9.9a2 2 0 0 1-.24-.95V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>
                </span>
                <h2 id="titre-chap-chimie" class="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    Chapitres de Chimie
                </h2>
            </div>

            <div class="mt-8 grid gap-6">
{{MODULES_CHIM}}
            </div>
        </section>
    </main>
'@

$page = $page.Replace('{{PILLS_PHYS}}',   (Render-Pills 'phys'))
$page = $page.Replace('{{PILLS_CHIM}}',   (Render-Pills 'chim'))
$page = $page.Replace('{{MODULES_PHYS}}', $physModules)
$page = $page.Replace('{{MODULES_CHIM}}', $chimModules)

[System.IO.File]::WriteAllText((Join-Path $sp 'main-chapitres.html'), $page, $utf8)
Write-Output ("main-chapitres.html : " + $page.Length + " caracteres")
