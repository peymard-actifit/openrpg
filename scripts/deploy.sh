#!/bin/bash
# ===========================================
# OpenRPG - Script de commit et déploiement
# Versioning sémantique (major.minor.patch)
# ===========================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Fonctions d'affichage
success() { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# Aide
show_help() {
    echo ""
    echo -e "${MAGENTA}🎲 OpenRPG - Script de déploiement${NC}"
    echo ""
    echo "Usage: ./deploy.sh <type> <message>"
    echo ""
    echo "Types de version:"
    echo "  major   - Changements majeurs incompatibles (1.0.0 → 2.0.0)"
    echo "  minor   - Nouvelles fonctionnalités rétrocompatibles (1.0.0 → 1.1.0)"
    echo "  patch   - Corrections de bugs (1.0.0 → 1.0.1)"
    echo ""
    echo "Exemples:"
    echo "  ./deploy.sh patch \"Correction bug authentification\""
    echo "  ./deploy.sh minor \"Ajout système d'inventaire\""
    echo "  ./deploy.sh major \"Refonte complète du jeu\""
    echo ""
    exit 0
}

# Vérifier les arguments
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    show_help
fi

if [ -z "$1" ] || [ -z "$2" ]; then
    error "Usage: ./deploy.sh <major|minor|patch> \"message de commit\""
fi

TYPE=$1
MESSAGE=$2

# Valider le type
if [[ ! "$TYPE" =~ ^(major|minor|patch)$ ]]; then
    error "Type invalide: $TYPE. Utilisez major, minor ou patch"
fi

echo ""
echo -e "${MAGENTA}🎲 OpenRPG - Déploiement${NC}"
echo -e "${MAGENTA}========================${NC}"
echo ""

# Aller à la racine du projet
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Lire la version actuelle
CURRENT_VERSION=$(node -p "require('./package.json').version")
info "Version actuelle: v$CURRENT_VERSION"

# Parser la version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Incrémenter
case $TYPE in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
info "Nouvelle version: v$NEW_VERSION"

# Mettre à jour package.json
if command -v jq &> /dev/null; then
    # Avec jq
    jq ".version = \"$NEW_VERSION\"" package.json > package.tmp.json && mv package.tmp.json package.json
else
    # Sans jq (sed)
    sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
    rm -f package.json.bak
fi
success "package.json mis à jour"

# Git add
info "Ajout des fichiers..."
git add -A

# Git commit
COMMIT_MSG="v$NEW_VERSION - $MESSAGE"
info "Commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"
success "Commit créé"

# Git tag
TAG_NAME="v$NEW_VERSION"
info "Création du tag: $TAG_NAME"
git tag -a "$TAG_NAME" -m "$MESSAGE" 2>/dev/null || warning "Tag existant ou erreur"
success "Tag créé"

# Git push
info "Push vers GitHub..."
git push origin main
git push origin "$TAG_NAME" 2>/dev/null || true
success "Push effectué"

# Info Vercel
info "Vercel déploiera automatiquement depuis GitHub"

echo ""
echo -e "${GREEN}🎉 Déploiement v$NEW_VERSION terminé !${NC}"
echo ""
echo -e "${CYAN}📋 Résumé:${NC}"
echo "   Version: v$CURRENT_VERSION → v$NEW_VERSION"
echo "   Type: $TYPE"
echo "   Message: $MESSAGE"
echo "   Tag: $TAG_NAME"
echo ""





