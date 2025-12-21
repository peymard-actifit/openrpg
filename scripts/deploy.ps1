<# 
.SYNOPSIS
    Script de commit et déploiement OpenRPG avec versioning sémantique

.DESCRIPTION
    - Incrémente la version (majeure, mineure, correctif)
    - Génère un rapport de déploiement horodaté
    - Commit les changements
    - Push sur GitHub
    - Déclenche le déploiement Vercel

.PARAMETER Type
    Type de version: major, minor, patch

.PARAMETER Message
    Message de commit

.EXAMPLE
    .\deploy.ps1 -Type patch -Message "Correction bug login"
    .\deploy.ps1 -Type minor -Message "Ajout système inventaire"
    .\deploy.ps1 -Type major -Message "Refonte complète UI"
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("major", "minor", "patch")]
    [string]$Type,
    
    [Parameter(Mandatory=$true)]
    [string]$Message
)

$ErrorActionPreference = "Stop"

# Couleurs
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "🎲 OpenRPG - Déploiement" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta
Write-Host ""

# Aller à la racine du projet
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptPath "..")

# Créer le dossier logs si nécessaire
$logsPath = "logs/deploys"
if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Force -Path $logsPath | Out-Null
}

# Horodatage
$timestamp = Get-Date -Format "yyyy-MM-dd_HHhmmss"
$dateFr = Get-Date -Format "dd/MM/yyyy HH:mm:ss"

# Lire package.json
$packagePath = "package.json"
$package = Get-Content $packagePath -Raw | ConvertFrom-Json
$currentVersion = $package.version

Write-Info "Version actuelle: v$currentVersion"

# Parser la version
$versionParts = $currentVersion.Split(".")
$major = [int]$versionParts[0]
$minor = [int]$versionParts[1]
$patch = [int]$versionParts[2]

# Incrémenter selon le type
switch ($Type) {
    "major" {
        $major++
        $minor = 0
        $patch = 0
    }
    "minor" {
        $minor++
        $patch = 0
    }
    "patch" {
        $patch++
    }
}

$newVersion = "$major.$minor.$patch"
Write-Info "Nouvelle version: v$newVersion"

# Compter les fichiers modifiés
$filesChanged = (git status --porcelain | Measure-Object -Line).Lines
$filesList = git status --porcelain

# Mettre à jour package.json
$package.version = $newVersion
$package | ConvertTo-Json -Depth 10 | Set-Content $packagePath -Encoding UTF8
Write-Success "package.json mis à jour"

# Créer le fichier de rapport
$reportFile = "$logsPath/${timestamp}_v$newVersion.txt"
$report = @"
==================================================
  RAPPORT DE DEPLOIEMENT - OpenRPG
==================================================

📅 Date: $dateFr
🏷️  Version: v$currentVersion → v$newVersion
📊 Type: $Type
💬 Message: $Message

--------------------------------------------------
  FICHIERS MODIFIES ($filesChanged)
--------------------------------------------------
$filesList

--------------------------------------------------
  ENVIRONNEMENT
--------------------------------------------------
PowerShell: $($PSVersionTable.PSVersion)
Git: $(git --version)
Node: $(node --version 2>$null)

==================================================
  DEPLOIEMENT EN COURS...
==================================================
"@

Set-Content -Path $reportFile -Value $report -Encoding UTF8
Write-Success "Rapport créé: $reportFile"

# Mettre à jour DEPLOYS.md
$deployEntry = @"

## v$newVersion - $dateFr

- **Type**: $Type
- **Message**: $Message
- **Fichiers modifiés**: $filesChanged
- **Rapport**: [${timestamp}_v$newVersion.txt](logs/deploys/${timestamp}_v$newVersion.txt)

"@

Add-Content -Path "DEPLOYS.md" -Value $deployEntry -Encoding UTF8
Write-Success "DEPLOYS.md mis à jour"

# Git add
Write-Info "Ajout des fichiers..."
git add -A
if ($LASTEXITCODE -ne 0) { throw "Erreur git add" }

# Git commit
$commitMessage = "v$newVersion - $Message"
Write-Info "Commit: $commitMessage"
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) { throw "Erreur git commit" }
Write-Success "Commit créé"

# Git tag
$tagName = "v$newVersion"
Write-Info "Création du tag: $tagName"
git tag -a $tagName -m "$Message" 2>$null
Write-Success "Tag créé"

# Git push
Write-Info "Push vers GitHub..."
git push origin main
if ($LASTEXITCODE -ne 0) { throw "Erreur git push" }

git push origin $tagName 2>$null
Write-Success "Push effectué"

# Récupérer le hash du commit
$commitHash = git rev-parse --short HEAD

# Finaliser le rapport
$finalReport = @"

==================================================
  DEPLOIEMENT REUSSI
==================================================

🔗 Commit: $commitHash
🏷️  Tag: v$newVersion
🚀 Vercel: Déploiement automatique déclenché

"@

Add-Content -Path $reportFile -Value $finalReport -Encoding UTF8

Write-Host ""
Write-Host "🎉 Déploiement v$newVersion terminé !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Résumé:" -ForegroundColor Cyan
Write-Host "   Version: v$currentVersion → v$newVersion"
Write-Host "   Type: $Type"
Write-Host "   Message: $Message"
Write-Host "   Rapport: $reportFile"
Write-Host "   Commit: $commitHash"
Write-Host ""
