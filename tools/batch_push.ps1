# ==============================================================================
# Script de Deploiement Progressif par Lots (Batch Push) - PhyChemia
# ==============================================================================

[CmdletBinding()]
param(
    [int]$BatchSize = 300,
    [int]$MaxRetries = 4,
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

# Encoding UTF-8 sans BOM pour git --pathspec-from-file
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

Write-Host "================================================================"
Write-Host "   PhyChemia - Script de Deploiement Progressif par Lots        "
Write-Host "================================================================"
Write-Host "Repertoire de travail : $RepoRoot"
Write-Host "Branche de destination : $Branch"
Write-Host "Taille des lots        : $BatchSize fichiers / lot"
Write-Host "Tentatives max / lot   : $MaxRetries"
Write-Host "----------------------------------------------------------------`n"

# 1. Verification de .gitignore
Write-Host "[1/3] Verification des regles .gitignore..."
$GitIgnorePath = Join-Path $RepoRoot ".gitignore"
if (Test-Path $GitIgnorePath) {
    $GitIgnoreContent = Get-Content $GitIgnorePath -Raw
    $HasNodeModules = $GitIgnoreContent -match "node_modules"
    $HasLargeFiles = $GitIgnoreContent -match "public/assets/large_files"

    if (-not $HasNodeModules) {
        Write-Host "Warning: 'node_modules' non trouve dans .gitignore"
    } else {
        Write-Host "  OK: 'node_modules/' est correctement ignore."
    }

    if (-not $HasLargeFiles) {
        Write-Host "Warning: 'public/assets/large_files/' non trouve dans .gitignore"
    } else {
        Write-Host "  OK: 'public/assets/large_files/' est correctement ignore."
    }
} else {
    Write-Host "Erreur: Fichier .gitignore introuvable !"
    exit 1
}

function Push-WithRetry {
    param(
        [string]$TargetBranch,
        [int]$MaxAttempts = 4
    )

    $oldEap = $global:ErrorActionPreference
    $global:ErrorActionPreference = 'Continue'

    try {
        for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
            Write-Host "  Push vers origin/$TargetBranch (Tentative $attempt/$MaxAttempts)..."
            
            $pushOutput = & git push origin $TargetBranch 2>&1 | Out-String
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Push reussi sur origin/$TargetBranch !"
                return $true
            } else {
                Write-Host "  Avertissement: Echec du push (Tentative $attempt): $pushOutput"
                if ($attempt -lt $MaxAttempts) {
                    Write-Host "  Pause de 3 secondes avant la tentative suivante..."
                    Start-Sleep -Seconds 3
                }
            }
        }
        return $false
    } finally {
        $global:ErrorActionPreference = $oldEap
    }
}

# 2. Base Commit (Fichiers du projet hors public/assets/downloads)
Write-Host "`n[2/3] Traitement des fichiers de code / configuration de base..."

$AllModifiedOrUntracked = & git -c core.quotePath=false ls-files -m -o --exclude-standard
$AllDeleted = & git -c core.quotePath=false ls-files -d --exclude-standard

$BaseFiles = @($AllModifiedOrUntracked | Where-Object { ($_ -replace '\\', '/') -notmatch "^public/assets/downloads/" })
$BaseDeleted = @($AllDeleted | Where-Object { ($_ -replace '\\', '/') -notmatch "^public/assets/downloads/" })

$AllBaseTargets = $BaseFiles + $BaseDeleted

if ($AllBaseTargets.Count -gt 0) {
    Write-Host "  Fichiers de base trouves : $($AllBaseTargets.Count) fichier(s)."
    
    $TempListPath = Join-Path $env:TEMP "git_base_batch.txt"
    [System.IO.File]::WriteAllLines($TempListPath, $AllBaseTargets, $Utf8NoBom)

    & git add --pathspec-from-file=$TempListPath
    Remove-Item $TempListPath -Force -ErrorAction SilentlyContinue

    & git commit -m "chore: update source code, views, and deployment tools"
    if ($LASTEXITCODE -eq 0) {
        $pushSuccess = Push-WithRetry -TargetBranch $Branch -MaxAttempts $MaxRetries
        if (-not $pushSuccess) {
            Write-Host "Erreur critique lors du push du commit de base."
            exit 1
        }
    } else {
        Write-Host "  Aucun changement a commiter pour la base."
    }
} else {
    Write-Host "  Aucun fichier de code source ou de configuration a commiter."
}

# 3. Traitement par Lots dans public/assets/downloads
Write-Host "`n[3/3] Traitement par lots des assets dans public/assets/downloads..."

$DownloadFiles = @(& git -c core.quotePath=false ls-files -m -o --exclude-standard "public/assets/downloads")

if ($DownloadFiles.Count -eq 0) {
    Write-Host "Aucun fichier a commiter dans public/assets/downloads. Tout est a jour !"
    Write-Host "`n================================================================"
    Write-Host "   Statut : Deploiement termine avec succes !                  "
    Write-Host "================================================================"
    exit 0
}

$TotalFiles = $DownloadFiles.Count
$TotalBatches = [Math]::Ceiling($TotalFiles / $BatchSize)

Write-Host "Total de fichiers downloads a commiter : $TotalFiles"
Write-Host "Nombre total de lots prevus          : $TotalBatches (taille: $BatchSize)"
Write-Host "----------------------------------------------------------------`n"

$BatchesPushed = 0
$FilesPushed = 0

for ($i = 0; $i -lt $TotalBatches; $i++) {
    $BatchNumber = $i + 1
    $StartIndex = $i * $BatchSize
    $EndIndex = [Math]::Min(($i + 1) * $BatchSize - 1, $TotalFiles - 1)
    
    $BatchFiles = $DownloadFiles[$StartIndex..$EndIndex]
    Write-Host "Lot $BatchNumber/$TotalBatches ($($BatchFiles.Count) fichiers)..."

    $BatchListPath = Join-Path $env:TEMP "git_downloads_batch_$BatchNumber.txt"
    [System.IO.File]::WriteAllLines($BatchListPath, $BatchFiles, $Utf8NoBom)

    & git add --pathspec-from-file=$BatchListPath
    Remove-Item $BatchListPath -Force -ErrorAction SilentlyContinue

    $CommitMsg = "chore(assets): upload downloads batch $BatchNumber/$TotalBatches ($($BatchFiles.Count) files)"
    & git commit -m "$CommitMsg"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Avertissement: git commit a retourne un code d'erreur sur le lot $BatchNumber."
        continue
    }

    $pushSuccess = Push-WithRetry -TargetBranch $Branch -MaxAttempts $MaxRetries
    if ($pushSuccess) {
        $BatchesPushed++
        $FilesPushed += $BatchFiles.Count
        $Percent = [Math]::Round(($FilesPushed / $TotalFiles) * 100, 1)
        Write-Host "  Progression globale : $FilesPushed / $TotalFiles fichiers ($Percent %)`n"
    } else {
        Write-Host "Echec critique lors du push du lot $BatchNumber/$TotalBatches."
        Write-Host "L'execution s'arrete ici. Vous pourrez relancer le script pour reprendre au meme endroit."
        exit 1
    }
}

Write-Host "================================================================"
Write-Host "   BILAN DU DEPLOIEMENT PAR LOTS                                "
Write-Host "================================================================"
Write-Host "Lots envoyes avec succes   : $BatchesPushed / $TotalBatches"
Write-Host "Fichiers envoyes sur GitHub: $FilesPushed / $TotalFiles"
Write-Host "Statut final               : TERMINÉ AVEC SUCCÈS"
Write-Host "================================================================"
