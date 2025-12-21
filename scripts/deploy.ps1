<# 
.SYNOPSIS
    Script de commit et déploiement OpenRPG avec versioning sémantique

.DESCRIPTION
    - Incrémente la version (majeure, mineure, correctif)
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
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "🎲 OpenRPG - Déploiement" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta
Write-Host ""

# Lire package.json
$packagePath = Join-Path $PSScriptRoot "..\package.json"
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

# Mettre à jour package.json
$package.version = $newVersion
$package | ConvertTo-Json -Depth 10 | Set-Content $packagePath -Encoding UTF8
Write-Success "package.json mis à jour"

# Git add
Write-Info "Ajout des fichiers..."
git add -A
if ($LASTEXITCODE -ne 0) { Write-Error "Erreur git add"; exit 1 }

# Git commit
$commitMessage = "v$newVersion - $Message"
Write-Info "Commit: $commitMessage"
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) { Write-Error "Erreur git commit"; exit 1 }
Write-Success "Commit créé"

# Git tag
$tagName = "v$newVersion"
Write-Info "Création du tag: $tagName"
git tag -a $tagName -m "$Message"
if ($LASTEXITCODE -ne 0) { Write-Warning "Tag déjà existant ou erreur" }
else { Write-Success "Tag créé" }

# Git push
Write-Info "Push vers GitHub..."
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Error "Erreur git push"; exit 1 }

git push origin $tagName 2>$null
Write-Success "Push effectué"

# Déploiement Vercel (optionnel via API)
$vercelToken = $env:VERCEL_TOKEN
if ($vercelToken) {
    Write-Info "Déclenchement du déploiement Vercel..."
    try {
        $headers = @{
            "Authorization" = "Bearer $vercelToken"
            "Content-Type" = "application/json"
        }
        # Le push GitHub déclenche automatiquement Vercel si connecté
        Write-Success "Déploiement déclenché automatiquement par le push"
    } catch {
        Write-Warning "Déploiement Vercel manuel nécessaire"
    }
} else {
    Write-Info "Vercel déploiera automatiquement depuis GitHub"
}

Write-Host ""
Write-Host "🎉 Déploiement v$newVersion terminé !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Résumé:" -ForegroundColor Cyan
Write-Host "   Version: v$currentVersion → v$newVersion"
Write-Host "   Type: $Type"
Write-Host "   Message: $Message"
Write-Host "   Tag: $tagName"
Write-Host ""

