# Genere les pages editoriales (a propos, mentions legales, confidentialite)
# Mise en page : sommaire lateral collant + article
$ErrorActionPreference = 'Stop'
$sp = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)

$P  = 'class="text-[15px] leading-relaxed text-slate-600 dark:text-slate-400"'
$UL = 'class="mt-4 grid gap-3"'
$LI = 'class="flex gap-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400"'
$DOT = '<span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true"></span>'
$STRONG = 'class="font-semibold text-slate-900 dark:text-white"'

function P($t)  { "                        <p $P>$t</p>" }
function UL($items) {
    $rows = ($items | ForEach-Object { "                            <li $LI>$DOT<span>$_</span></li>" }) -join "`r`n"
    "                        <ul $UL>`r`n$rows`r`n                        </ul>"
}
function CARD($titre, $texte) {
    @"
                        <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50">
                            <h3 class="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">$titre</h3>
                            <p class="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">$texte</p>
                        </div>
"@
}

# ----------------------------------------------------------------- contenus
$pages = @{

 'apropos' = @{
    eyebrow = 'Qui sommes-nous'
    h1      = 'À propos de PhyChi'
    lede    = 'Découvrez l''origine, la mission et les engagements de notre plateforme d''apprentissage en sciences physiques et chimiques.'
    crumb   = 'À propos'
    cta     = @{ titre = 'Une question ou une suggestion ?'; texte = 'Nous faisons évoluer la plateforme en continu. Pour nous faire part de vos retours ou nous poser des questions, rendez-vous sur notre page de contact.'; lien = 'contact.html'; label = 'Accéder au formulaire de contact' }
    sections = @(
      @{ id='mission'; h2='Notre mission'; body = @(
          (P '<strong ' + $STRONG + '>PhyChi</strong> est une plateforme pédagogique conçue pour accompagner les étudiants de l''enseignement supérieur (CPGE, Licence, Master, écoles d''ingénieurs et concours d''enseignement) dans leur parcours académique en physique et en chimie.'),
          (P 'Notre objectif principal est de proposer un contenu d''excellence, rigoureux et directement exploitable, pour faciliter la compréhension des concepts fondamentaux et la maîtrise des méthodes de résolution de problèmes scientifiques.')
        ) },
      @{ id='offre'; h2='Ce que nous proposons'; body = @(
          (UL @(
            '<strong ' + $STRONG + '>Des cours structurés :</strong> un découpage clair par domaine et par chapitre couvrant l''intégralité des programmes universitaires et des classes préparatoires.',
            '<strong ' + $STRONG + '>Des exercices variés et corrigés :</strong> des problèmes d''application directe ainsi que des sujets d''approfondissement méthodologique avec solutions étape par étape.',
            '<strong ' + $STRONG + '>Des fiches et supports PDF :</strong> un espace de téléchargement regroupant des synthèses, formulaires et travaux pratiques clés en main.',
            '<strong ' + $STRONG + '>Un accès libre et centralisé :</strong> une navigation intuitive pour accéder rapidement aux concepts clés recherchés.'
          ))
        ) },
      @{ id='public'; h2='À qui s''adresse PhyChi ?'; body = @(
          (CARD 'Étudiants' 'Étudiants en licence de sciences, élèves en classes préparatoires aux grandes écoles (CPGE), étudiants en écoles d''ingénieurs et candidats aux concours de recrutement d''enseignants (CAPES, agrégation).'),
          (CARD 'Enseignants &amp; formateurs' 'Enseignants du supérieur et du secondaire à la recherche de supports d''exercices, de schémas explicatifs ou de fiches récapitulatives pour enrichir leurs séances d''enseignement.')
        ) }
    )
 }

 'mentions-legales' = @{
    eyebrow = 'Informations juridiques'
    h1      = 'Mentions Légales'
    lede    = 'Informations juridiques et réglementaires relatives à la publication et à l''hébergement du site PhyChi.'
    crumb   = 'Mentions légales'
    cta     = @{ titre = 'Une erreur à signaler ?'; texte = 'L''utilisateur est invité à signaler toute coquille ou inexactitude via notre formulaire de contact.'; lien = 'contact.html'; label = 'Signaler une erreur' }
    sections = @(
      @{ id='edition'; h2='1. Édition du site'; body = @(
          (P 'Le site internet <strong ' + $STRONG + '>PhyChi</strong> (accessible à l''adresse <code class="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200">www.psychi.org</code>) est une plateforme éducative d''enseignement supérieur.'),
          (UL @(
            '<strong ' + $STRONG + '>Directeur de la publication :</strong> Équipe pédagogique PhyChi',
            '<strong ' + $STRONG + '>Contact e-mail :</strong> contact@psychi.org',
            '<strong ' + $STRONG + '>Responsable de la rédaction :</strong> Département de Physique &amp; Chimie'
          ))
        ) },
      @{ id='hebergement'; h2='2. Hébergement du site'; body = @(
          (P 'Le site PhyChi est hébergé par :'),
          (UL @(
            '<strong ' + $STRONG + '>Hébergeur :</strong> Services d''hébergement web',
            '<strong ' + $STRONG + '>Adresse de l''hébergeur :</strong> Service cloud, serveurs européens',
            '<strong ' + $STRONG + '>Site web de l''hébergeur :</strong> www.hebergeur-exemple.com'
          ))
        ) },
      @{ id='propriete'; h2='3. Propriété intellectuelle et contrefaçons'; body = @(
          (P 'L''ensemble des éléments accessibles sur le site PhyChi (textes, cours, exercices, schémas, corrigés, fiches PDF, logo, icônes) reste la propriété exclusive de leurs auteurs au titre des droits d''auteur et de la propriété intellectuelle.'),
          (P 'Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans l''autorisation écrite préalable du responsable de la publication.'),
          (P 'Les contenus pédagogiques sont destinés à un usage strictement personnel, privé et non commercial à des fins d''apprentissage et d''enseignement.')
        ) },
      @{ id='responsabilite'; h2='4. Limitation de responsabilité'; body = @(
          (P 'L''équipe d''édition du site PhyChi s''efforce de fournir des informations et démonstrations scientifiques aussi précises que possible. Toutefois, elle ne pourra être tenue responsable des omissions, des inexactitudes ou des erreurs qui pourraient subsister dans les corrigés ou les fiches de cours.'),
          (P 'L''utilisateur est invité à signaler toute coquille ou erreur via le <a href="contact.html" class="font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-400">formulaire de contact</a>.')
        ) },
      @{ id='liens'; h2='5. Liens hypertextes'; body = @(
          (P 'Le site PhyChi peut contenir des liens hypertextes renvoyant vers d''autres sites web. PhyChi ne dispose d''aucun moyen de contrôle du contenu de ces sites tiers et décline toute responsabilité quant à leur contenu ou leurs pratiques.')
        ) }
    )
 }

 'politique-confidentialite' = @{
    eyebrow = 'Vos données'
    h1      = 'Politique de Confidentialité'
    lede    = 'Protection de vos données personnelles et respect de votre vie privée sur la plateforme PhyChi.'
    crumb   = 'Politique de confidentialité'
    cta     = @{ titre = 'Exercer vos droits'; texte = 'Pour toute demande d''accès, de rectification ou de suppression de vos données, contactez notre équipe.'; lien = 'contact.html'; label = 'Nous contacter' }
    sections = @(
      @{ id='collecte'; h2='1. Collecte des données personnelles'; body = @(
          (P 'Dans le cadre de l''utilisation du site PhyChi, nous pouvons être amenés à collecter les données personnelles suivantes :'),
          (UL @(
            '<strong ' + $STRONG + '>Lors de l''inscription :</strong> nom, prénom, adresse e-mail et niveau d''études.',
            '<strong ' + $STRONG + '>Lors de l''envoi d''un message :</strong> nom, adresse e-mail et contenu du message envoyé via la page de <a href="contact.html" class="font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-400">contact</a>.',
            '<strong ' + $STRONG + '>Données de navigation :</strong> adresse IP, type de navigateur et pages consultées à des fins purement statistiques.'
          ))
        ) },
      @{ id='utilisation'; h2='2. Utilisation des données'; body = @(
          (P 'Les données collectées sont utilisées exclusivement pour :'),
          (UL @(
            'Gérer votre compte utilisateur et vos éléments sauvegardés dans la page <a href="favoris.html" class="font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-400">favoris</a>.',
            'Répondre à vos demandes envoyées via le formulaire de contact.',
            'Améliorer la qualité des cours, des exercices et des services de la plateforme.'
          )),
          (P 'Vos données personnelles ne seront en aucun cas vendues, louées ou cédées à des tiers à des fins commerciales.')
        ) },
      @{ id='conservation'; h2='3. Conservation et sécurité des données'; body = @(
          (P 'Vos informations sont conservées de manière sécurisée tant que votre compte utilisateur reste actif. Vous pouvez à tout moment demander la suppression de vos données personnelles ou de votre compte en nous contactant.')
        ) },
      @{ id='cookies'; h2='4. Gestion des cookies'; body = @(
          (P 'Le site PhyChi peut utiliser des cookies techniquement nécessaires au bon fonctionnement de la session (maintien de la connexion au compte utilisateur, mémorisation des préférences de navigation).'),
          (P 'Vous pouvez configurer votre navigateur pour bloquer ou supprimer les cookies, bien que cela puisse altérer le fonctionnement de certaines fonctionnalités du site.')
        ) },
      @{ id='droits'; h2='5. Vos droits (accès, rectification, suppression)'; body = @(
          (P 'Conformément à la réglementation sur la protection des données personnelles, vous disposez d''un droit d''accès, de rectification, de modification et de suppression des données qui vous concernent.'),
          (P 'Pour exercer ces droits, vous pouvez modifier vos données depuis votre <a href="profil.html" class="font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-400">profil</a> ou nous adresser une demande par e-mail via notre page de <a href="contact.html" class="font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-400">contact</a>.')
        ) }
    )
 }
}

# ----------------------------------------------------------------- rendu
foreach ($key in $pages.Keys) {
    $pg = $pages[$key]

    $toc = ($pg.sections | ForEach-Object {
        "                            <li><a href=`"#$($_.id)`" class=`"block rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white`">$($_.h2)</a></li>"
    }) -join "`r`n"

    $body = ($pg.sections | ForEach-Object {
        $inner = ($_.body) -join "`r`n"
        @"
                    <section id="$($_.id)" class="scroll-mt-28 border-b border-slate-200 pb-10 last:border-0 dark:border-slate-800">
                        <h2 class="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">$($_.h2)</h2>
                        <div class="mt-4 grid gap-4">
$inner
                        </div>
                    </section>
"@
    }) -join "`r`n`r`n"

    $page = @"
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
                        <li class="font-medium text-slate-900 dark:text-white">$($pg.crumb)</li>
                    </ol>
                </nav>

                <p class="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">$($pg.eyebrow)</p>
                <h1 class="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                    $($pg.h1)
                </h1>
                <p class="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                    $($pg.lede)
                </p>
            </div>
        </section>

        <!-- Corps de la page -->
        <div class="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-12 lg:gap-16 lg:px-8">

            <!-- Sommaire -->
            <aside class="lg:col-span-3">
                <nav aria-label="Sommaire de la page" class="lg:sticky lg:top-28">
                    <h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Sur cette page</h2>
                    <ul class="mt-4 grid gap-1">
$toc
                    </ul>
                </nav>
            </aside>

            <!-- Article -->
            <article class="lg:col-span-9">
                <div class="grid gap-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-soft sm:p-10 dark:border-slate-800 dark:bg-slate-900">
$body
                </div>

                <!-- Appel à l'action -->
                <div class="mt-8 flex flex-col items-start justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-soft sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
                    <div>
                        <h2 class="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">$($pg.cta.titre)</h2>
                        <p class="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">$($pg.cta.texte)</p>
                    </div>
                    <a href="$($pg.cta.lien)" class="group inline-flex shrink-0 items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-700">
                        $($pg.cta.label)
                        <svg class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </a>
                </div>
            </article>
        </div>
    </main>
"@

    [System.IO.File]::WriteAllText((Join-Path $sp ("main-$key.html")), $page, $utf8)
    Write-Output ("main-$key.html : " + $page.Length + " caracteres")
}
