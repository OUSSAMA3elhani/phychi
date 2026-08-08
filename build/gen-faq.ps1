# Genere main-faq.html : accordeons <details> groupes par categorie
$ErrorActionPreference = 'Stop'
$sp = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)

$lien = 'class="font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-400"'

$categories = @(
    @{ id='acces'; h2='Généralités &amp; accès au site'; items=@(
        @{ q='L''accès aux cours et exercices est-il gratuit ?';
           r='Oui, l''ensemble des cours, exercices, solutions et documents téléchargeables disponibles sur PhyChi est entièrement gratuit et accessible à tous les étudiants et enseignants.' },
        @{ q='Faut-il obligatoirement créer un compte pour consulter le site ?';
           r='Non. La consultation des cours, des énoncés d''exercices et des solutions est libre. Néanmoins, la création d''un compte gratuit permet de sauvegarder vos contenus dans vos favoris et de personnaliser votre profil.' },
        @{ q='À quels niveaux d''études s''adressent les contenus ?';
           r='Les contenus sont principalement conçus pour le niveau supérieur : licences scientifiques (L1, L2, L3), classes préparatoires aux grandes écoles (CPGE), écoles d''ingénieurs, ainsi que les concours d''enseignement (CAPES et agrégation).' }
      ) },
    @{ id='contenus'; h2='Cours, exercices &amp; documents PDF'; items=@(
        @{ q='Sous quel format sont disponibles les documents téléchargeables ?';
           r='Tous les polycopiés de cours, fiches de synthèse, sujets de TP et examens sont disponibles au format standard PDF, consultables sur ordinateur, tablette ou smartphone.' },
        @{ q='Comment faire si je remarque une erreur ou une coquille dans une solution ?';
           r='Nous apportons une attention particulière à la rigueur scientifique de nos contenus. Si vous repérez une erreur, merci de nous la signaler en utilisant notre <a href="contact.html" ' + $lien + '>formulaire de contact</a> en précisant le chapitre et la référence de l''exercice.' },
        @{ q='Puis-je réutiliser les supports pour mes séances d''enseignement ou de soutien ?';
           r='Oui, l''usage des documents est libre à des fins éducatives et non commerciales, sous réserve de conserver les mentions d''origine et le logo PhyChi.' }
      ) },
    @{ id='compte'; h2='Gestion de compte &amp; problèmes techniques'; items=@(
        @{ q='J''ai oublié mon mot de passe, comment le réinitialiser ?';
           r='Rendez-vous sur la page de <a href="login.html" ' + $lien + '>connexion</a> et cliquez sur le lien « Mot de passe oublié ? ». Un message contenant la procédure de réinitialisation vous sera envoyé par e-mail.' },
        @{ q='Comment ajouter un cours ou un exercice à mes favoris ?';
           r='Une fois connecté à votre compte, il vous suffit de cliquer sur le bouton « Ajouter aux favoris » présent sur chaque carte de cours, d''exercice ou de solution. Vous pourrez ensuite les retrouver sur la page <a href="favoris.html" ' + $lien + '>Mes favoris</a>.' }
      ) }
)

function Render-Item($it) {
    @"
                    <article class="faq-item overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                        <details>
                            <summary class="flex items-center justify-between gap-4 p-6">
                                <span class="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">$($it.q)</span>
                                <span class="details-chevron grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition-transform duration-300 dark:bg-slate-800 dark:text-slate-400" aria-hidden="true">
                                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </span>
                            </summary>
                            <div class="border-t border-slate-200 px-6 py-5 dark:border-slate-800">
                                <p class="text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">$($it.r)</p>
                            </div>
                        </details>
                    </article>
"@
}

$blocks = ($categories | ForEach-Object {
    $items = ($_.items | ForEach-Object { Render-Item $_ }) -join "`r`n"
    @"
            <section class="faq-category scroll-mt-28" id="$($_.id)" aria-labelledby="titre-$($_.id)">
                <h2 id="titre-$($_.id)" class="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">$($_.h2)</h2>
                <div class="mt-6 grid gap-4">
$items
                </div>
            </section>
"@
}) -join "`r`n`r`n"

$toc = ($categories | ForEach-Object {
    "                            <li><a href=`"#$($_.id)`" class=`"block rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white`">$($_.h2)</a></li>"
}) -join "`r`n"

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
                        <li class="font-medium text-slate-900 dark:text-white">FAQ</li>
                    </ol>
                </nav>

                <p class="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Centre d'aide</p>
                <h1 class="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                    Foire Aux Questions
                </h1>
                <p class="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                    Retrouvez les réponses aux questions les plus fréquentes sur l'utilisation de la plateforme PhyChi.
                </p>
            </div>
        </section>

        <!-- Corps de la page -->
        <div class="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-12 lg:gap-16 lg:px-8">

            <aside class="lg:col-span-3">
                <nav aria-label="Sommaire de la page" class="lg:sticky lg:top-28">
                    <h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Catégories</h2>
                    <ul class="mt-4 grid gap-1">
$toc
                    </ul>
                </nav>
            </aside>

            <div class="grid gap-12 lg:col-span-9">
$blocks

                <!-- Aide supplémentaire -->
                <section class="faq-contact flex flex-col items-start justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-soft sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900" aria-labelledby="titre-support">
                    <div>
                        <h2 id="titre-support" class="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                            Vous ne trouvez pas la réponse à votre question ?
                        </h2>
                        <p class="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                            Notre équipe est à votre disposition pour vous répondre dans les plus brefs délais.
                        </p>
                    </div>
                    <a href="contact.html" class="group inline-flex shrink-0 items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-700">
                        Envoyer un message
                        <svg class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </a>
                </section>
            </div>
        </div>
    </main>
"@

[System.IO.File]::WriteAllText((Join-Path $sp 'main-faq.html'), $page, $utf8)
Write-Output ("main-faq.html : " + $page.Length + " caracteres")
