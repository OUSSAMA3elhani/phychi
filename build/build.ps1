# Assemble les pages PhyChi : _head + _header + main-<cle> + _footer
$ErrorActionPreference = 'Stop'
$sp   = $PSScriptRoot
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object System.Text.UTF8Encoding($false)

$head   = [System.IO.File]::ReadAllText((Join-Path $sp '_head.html'))
$header = [System.IO.File]::ReadAllText((Join-Path $sp '_header.html'))
$footer = [System.IO.File]::ReadAllText((Join-Path $sp '_footer.html'))

# --- Classes : etat inactif -> etat actif -------------------------------
$dTopOff = 'rounded-lg px-3.5 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
$dTopOn  = 'rounded-lg bg-brand-50 px-3.5 py-2 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'

$dItemOff = 'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800'
$dItemOn  = 'flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 transition-colors dark:bg-slate-800'

$grpOff = 'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
$grpOn  = 'flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10'

$mOff = 'block rounded-xl px-4 py-3 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
$mOn  = 'block rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'

$fOff = 'text-slate-500 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400'
$fOn  = 'font-semibold text-brand-600 dark:text-brand-400'

function Activate([string]$html, [string]$attr, [string]$key, $pairs, [bool]$aria) {
    if (-not $key) { return $html }
    $marker = ('{0}="{1}"' -f $attr, $key)
    if ($html.IndexOf($marker) -lt 0) { return $html }
    $newMarker = if ($aria) { $marker + ' aria-current="page"' } else { $marker }
    # on essaie chaque variante de classe inactive connue (lien principal, item de menu deroulant...)
    foreach ($p in $pairs) {
        $needle = $marker + ' class="' + $p.off + '"'
        if ($html.IndexOf($needle) -ge 0) {
            return $html.Replace($needle, ($newMarker + ' class="' + $p.on + '"'))
        }
    }
    # aucune variante connue : on pose seulement aria-current (cas Connexion / Inscription / Profil)
    if ($aria) { return $html.Replace($marker, $newMarker) }
    return $html
}

# cle | titre | description | nav | groupe | footer-nav
$pages = @(
    @{ k='index';                     t='PhyChi - Physique & Chimie pour l''Enseignement Supérieur | Accueil'; d='PhyChi - Plateforme de cours, d''exercices et de ressources en physique et chimie pour l''enseignement supérieur.'; nav='index';                grp=''         ; fnav='' },
    @{ k='cours';                     t='PhyChi - Cours de Physique & Chimie';                                  d='PhyChi - Cours complets de physique et de chimie pour l''enseignement supérieur (CPGE, Licence, Master, Agrégation).'; nav='cours';       grp='apprendre'; fnav='' },
    @{ k='chapitres';                 t='PhyChi - Chapitres de Cours';                                          d='PhyChi - Structure détaillée des chapitres de cours en physique et chimie pour l''enseignement supérieur.'; nav='chapitres';           grp='apprendre'; fnav='' },
    @{ k='exercices-physique';        t='PhyChi - Exercices de Physique';                                       d='PhyChi - Exercices et problèmes corrigés de physique pour le niveau supérieur (Mécanique, Thermodynamique, Électromagnétisme, Optique, Fluides).'; nav='exercices-physique'; grp='entrainer'; fnav='' },
    @{ k='exercices-chimie';          t='PhyChi - Exercices de Chimie';                                         d='PhyChi - Exercices et problèmes corrigés de chimie pour l''enseignement supérieur (Thermodynamique chimique, Cinétique, Chimie organique, Solutions, Électrochimie).'; nav='exercices-chimie'; grp='entrainer'; fnav='' },
    @{ k='solutions';                 t='PhyChi - Solutions & Corrigés Détaillés';                              d='PhyChi - Corrigés détaillés et solutions des exercices de physique et de chimie pour l''enseignement supérieur.'; nav='solutions';     grp='entrainer'; fnav='' },
    @{ k='telechargements';           t='PhyChi - Espace Téléchargements PDF';                                  d='PhyChi - Espace de téléchargement gratuit de cours, fiches de révision, travaux pratiques (TP) et annales au format PDF en physique et chimie.'; nav='telechargements'; grp=''; fnav='' },
    @{ k='recherche';                 t='PhyChi - Recherche de Contenus';                                       d='PhyChi - Moteur de recherche de cours, d''exercices, de corrigés et de documents PDF de physique et chimie pour l''enseignement supérieur.'; nav='recherche'; grp=''; fnav='' },
    @{ k='favoris';                   t='PhyChi - Mes Favoris';                                                 d='PhyChi - Vos ressources favorites en physique et chimie. Retrouvez rapidement vos cours, exercices et corrigés enregistrés.'; nav='favoris'; grp=''; fnav='' },
    @{ k='login';                     t='PhyChi - Connexion';                                                   d='PhyChi - Espace de connexion pour accéder à votre compte, vos ressources enregistrées et vos favoris.'; nav='login';                    grp=''; fnav='' },
    @{ k='inscription';               t='PhyChi - Inscription';                                                 d='PhyChi - Inscription. Créez un compte gratuitement pour suivre vos cours, accéder aux corrigés et enregistrer vos exercices favoris en physique et chimie.'; nav='inscription'; grp=''; fnav='' },
    @{ k='profil';                    t='PhyChi - Mon Profil';                                                  d='PhyChi - Espace profil utilisateur. Gérez vos informations personnelles, suivez votre progression et accédez à vos contenus enregistrés.'; nav='profil'; grp=''; fnav='' },
    @{ k='apropos';                   t='PhyChi - À propos';                                                    d='PhyChi - À propos. Découvrez la mission, la vision et l''équipe derrière la plateforme éducative de physique et chimie pour l''enseignement supérieur.'; nav=''; grp=''; fnav='apropos' },
    @{ k='contact';                   t='PhyChi - Contact';                                                     d='PhyChi - Contactez-nous. Posez vos questions sur les cours, signalez une erreur ou envoyez vos suggestions à notre équipe.'; nav=''; grp=''; fnav='contact' },
    @{ k='faq';                       t='PhyChi - Foire Aux Questions (FAQ)';                                   d='PhyChi - Foire Aux Questions (FAQ). Réponses aux questions fréquentes sur l''accès aux cours, exercices, corrigés et fonctionnalités du site.'; nav=''; grp=''; fnav='faq' },
    @{ k='mentions-legales';          t='PhyChi - Mentions Légales';                                            d='PhyChi - Mentions légales. Informations réglementaires, éditeur du site, hébergement et droits de propriété intellectuelle.'; nav=''; grp=''; fnav='mentions-legales' },
    @{ k='politique-confidentialite'; t='PhyChi - Politique de Confidentialité';                                d='PhyChi - Politique de confidentialité. Découvrez comment nous collectons, utilisons et protégeons vos données personnelles.'; nav=''; grp=''; fnav='politique-confidentialite' }
)

$built = 0
foreach ($p in $pages) {
    $mainPath = Join-Path $sp ('main-' + $p.k + '.html')
    if (-not (Test-Path $mainPath)) { Write-Warning ("main manquant : " + $p.k); continue }
    $main = [System.IO.File]::ReadAllText($mainPath)

    $h = $head.Replace('{{TITLE}}', $p.t).Replace('{{DESC}}', $p.d)

    $hd = $header
    $hd = Activate $hd 'data-nav'      $p.nav @( @{off=$dTopOff; on=$dTopOn}, @{off=$dItemOff; on=$dItemOn} ) $true
    $hd = Activate $hd 'data-navgroup' $p.grp @( @{off=$grpOff;  on=$grpOn}  )                                $false
    $hd = Activate $hd 'data-mnav'     $p.nav @( @{off=$mOff;    on=$mOn}    )                                $true

    $ft = Activate $footer 'data-fnav' $p.fnav @( @{off=$fOff; on=$fOn} ) $true

    $out = $h + $hd + "`r`n" + $main + $ft
    [System.IO.File]::WriteAllText((Join-Path $root ($p.k + '.html')), $out, $utf8)
    $built++
}
Write-Output ("Pages generees : " + $built)
