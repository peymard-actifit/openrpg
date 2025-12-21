@echo off
REM ===========================================
REM OpenRPG - Script de déploiement rapide
REM ===========================================

setlocal enabledelayedexpansion

if "%~1"=="" goto :help
if "%~2"=="" goto :help
if "%~1"=="-h" goto :help
if "%~1"=="--help" goto :help

set TYPE=%~1
set MESSAGE=%~2

REM Valider le type
if /i not "%TYPE%"=="major" if /i not "%TYPE%"=="minor" if /i not "%TYPE%"=="patch" (
    echo ❌ Type invalide: %TYPE%. Utilisez major, minor ou patch
    exit /b 1
)

echo.
echo 🎲 OpenRPG - Deploiement
echo ========================
echo.

REM Lire la version actuelle
for /f "tokens=2 delims=:, " %%a in ('findstr /c:"\"version\"" package.json') do set CURRENT_VERSION=%%~a
echo ℹ️  Version actuelle: v%CURRENT_VERSION%

REM Parser la version
for /f "tokens=1,2,3 delims=." %%a in ("%CURRENT_VERSION%") do (
    set MAJOR=%%a
    set MINOR=%%b
    set PATCH=%%c
)

REM Incrémenter
if /i "%TYPE%"=="major" (
    set /a MAJOR+=1
    set MINOR=0
    set PATCH=0
)
if /i "%TYPE%"=="minor" (
    set /a MINOR+=1
    set PATCH=0
)
if /i "%TYPE%"=="patch" (
    set /a PATCH+=1
)

set NEW_VERSION=%MAJOR%.%MINOR%.%PATCH%
echo ℹ️  Nouvelle version: v%NEW_VERSION%

REM Mettre à jour package.json via PowerShell
powershell -Command "(Get-Content package.json) -replace '\"version\": \"%CURRENT_VERSION%\"', '\"version\": \"%NEW_VERSION%\"' | Set-Content package.json"
echo ✅ package.json mis a jour

REM Git operations
echo ℹ️  Ajout des fichiers...
git add -A

echo ℹ️  Commit: v%NEW_VERSION% - %MESSAGE%
git commit -m "v%NEW_VERSION% - %MESSAGE%"
echo ✅ Commit cree

echo ℹ️  Creation du tag: v%NEW_VERSION%
git tag -a "v%NEW_VERSION%" -m "%MESSAGE%" 2>nul
echo ✅ Tag cree

echo ℹ️  Push vers GitHub...
git push origin main
git push origin "v%NEW_VERSION%" 2>nul
echo ✅ Push effectue

echo.
echo 🎉 Deploiement v%NEW_VERSION% termine !
echo.
echo 📋 Resume:
echo    Version: v%CURRENT_VERSION% → v%NEW_VERSION%
echo    Type: %TYPE%
echo    Message: %MESSAGE%
echo.
goto :eof

:help
echo.
echo 🎲 OpenRPG - Script de deploiement
echo.
echo Usage: deploy ^<type^> "message"
echo.
echo Types de version:
echo   major   - Changements majeurs (1.0.0 → 2.0.0)
echo   minor   - Nouvelles fonctionnalites (1.0.0 → 1.1.0)
echo   patch   - Corrections de bugs (1.0.0 → 1.0.1)
echo.
echo Exemples:
echo   deploy patch "Correction bug login"
echo   deploy minor "Ajout inventaire"
echo   deploy major "Refonte UI"
echo.
exit /b 0

