@echo off
REM ===========================================
REM OpenRPG - Script de déploiement complet
REM Avec rapport horodaté et suivi des commits
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

REM Créer le dossier logs si nécessaire
if not exist "logs\deploys" mkdir "logs\deploys"

REM Horodatage
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set YEAR=%datetime:~0,4%
set MONTH=%datetime:~4,2%
set DAY=%datetime:~6,2%
set HOUR=%datetime:~8,2%
set MINUTE=%datetime:~10,2%
set SECOND=%datetime:~12,2%
set TIMESTAMP=%YEAR%-%MONTH%-%DAY%_%HOUR%h%MINUTE%m%SECOND%s
set DATE_FR=%DAY%/%MONTH%/%YEAR% %HOUR%:%MINUTE%:%SECOND%

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

REM Compter les fichiers modifiés
for /f %%a in ('git status --porcelain ^| find /c /v ""') do set FILES_CHANGED=%%a

REM Lister les fichiers modifiés
git status --porcelain > temp_files.txt
set FILES_LIST=
for /f "tokens=*" %%a in (temp_files.txt) do (
    set FILES_LIST=!FILES_LIST!%%a^

)
del temp_files.txt

REM Mettre à jour package.json via PowerShell
powershell -Command "(Get-Content package.json) -replace '\"version\": \"%CURRENT_VERSION%\"', '\"version\": \"%NEW_VERSION%\"' | Set-Content package.json"
echo ✅ package.json mis a jour

REM Créer le fichier de rapport
set REPORT_FILE=logs\deploys\%TIMESTAMP%_v%NEW_VERSION%.txt
echo ================================================== > "%REPORT_FILE%"
echo   RAPPORT DE DEPLOIEMENT - OpenRPG >> "%REPORT_FILE%"
echo ================================================== >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo 📅 Date: %DATE_FR% >> "%REPORT_FILE%"
echo 🏷️  Version: v%CURRENT_VERSION% → v%NEW_VERSION% >> "%REPORT_FILE%"
echo 📊 Type: %TYPE% >> "%REPORT_FILE%"
echo 💬 Message: %MESSAGE% >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo -------------------------------------------------- >> "%REPORT_FILE%"
echo   FICHIERS MODIFIES (%FILES_CHANGED%) >> "%REPORT_FILE%"
echo -------------------------------------------------- >> "%REPORT_FILE%"
git status --porcelain >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo -------------------------------------------------- >> "%REPORT_FILE%"
echo   STATISTIQUES GIT >> "%REPORT_FILE%"
echo -------------------------------------------------- >> "%REPORT_FILE%"
git diff --stat HEAD~1 2>nul >> "%REPORT_FILE%" || echo Premier commit ou pas de diff >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo ================================================== >> "%REPORT_FILE%"
echo   DEPLOIEMENT REUSSI >> "%REPORT_FILE%"
echo ================================================== >> "%REPORT_FILE%"

echo ✅ Rapport cree: %REPORT_FILE%

REM Mettre à jour le fichier DEPLOYS.md
echo. >> DEPLOYS.md
echo ## v%NEW_VERSION% - %DATE_FR% >> DEPLOYS.md
echo. >> DEPLOYS.md
echo - **Type**: %TYPE% >> DEPLOYS.md
echo - **Message**: %MESSAGE% >> DEPLOYS.md
echo - **Fichiers modifiés**: %FILES_CHANGED% >> DEPLOYS.md
echo - **Rapport**: [%TIMESTAMP%_v%NEW_VERSION%.txt](logs/deploys/%TIMESTAMP%_v%NEW_VERSION%.txt) >> DEPLOYS.md
echo. >> DEPLOYS.md

echo ✅ DEPLOYS.md mis a jour

REM Mettre à jour le fichier PROMPTS.md
echo. >> PROMPTS.md
echo --- >> PROMPTS.md
echo. >> PROMPTS.md
echo ### v%NEW_VERSION% - %DATE_FR% >> PROMPTS.md
echo. >> PROMPTS.md
echo ^> %MESSAGE% >> PROMPTS.md
echo. >> PROMPTS.md
echo **Type**: %TYPE% ^| **Fichiers**: %FILES_CHANGED% >> PROMPTS.md
echo. >> PROMPTS.md

echo ✅ PROMPTS.md mis a jour

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

REM Mettre à jour le rapport avec le hash du commit
for /f %%a in ('git rev-parse --short HEAD') do set COMMIT_HASH=%%a
echo. >> "%REPORT_FILE%"
echo 🔗 Commit: %COMMIT_HASH% >> "%REPORT_FILE%"
echo 🏷️  Tag: v%NEW_VERSION% >> "%REPORT_FILE%"

echo.
echo 🎉 Deploiement v%NEW_VERSION% termine !
echo.
echo 📋 Resume:
echo    Version: v%CURRENT_VERSION% → v%NEW_VERSION%
echo    Type: %TYPE%
echo    Message: %MESSAGE%
echo    Rapport: %REPORT_FILE%
echo    Commit: %COMMIT_HASH%
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
echo Fichiers generes:
echo   - logs/deploys/[timestamp]_v[version].txt (rapport detaille)
echo   - DEPLOYS.md (historique des deployments)
echo   - PROMPTS.md (historique des prompts)
echo.
echo Exemples:
echo   deploy patch "Correction bug login"
echo   deploy minor "Ajout inventaire"
echo   deploy major "Refonte UI"
echo.
exit /b 0
