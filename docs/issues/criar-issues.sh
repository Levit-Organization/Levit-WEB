#!/usr/bin/env bash
# Cria no GitHub uma issue por arquivo desta pasta.
# Uso: bash docs/issues/criar-issues.sh                  (simula, não cria nada)
#      bash docs/issues/criar-issues.sh --criar          (cria de verdade)
#      bash docs/issues/criar-issues.sh --criar --pai 42 (cria e liga cada uma
#                                                         como sub-issue da #42)
#      --pular 01,02                                     (ignora esses arquivos,
#                                                         ex.: já criados à mão)
set -euo pipefail

REPO="Levit-Organization/Levit-WEB"
PASTA="$(cd "$(dirname "$0")" && pwd)"
CRIAR=false
PAI=""
PULAR=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --criar) CRIAR=true ;;
    --pular) PULAR=",${2:?ex.: --pular 01,02},"; shift ;;
    --pai) PAI="${2:?informe o número da issue pai, ex.: --pai 42}"; shift ;;
    *) echo "Opção desconhecida: $1" >&2; exit 1 ;;
  esac
  shift
done

if $CRIAR && ! command -v gh >/dev/null; then
  echo "Instale o GitHub CLI (sudo apt install gh) e rode 'gh auth login' antes." >&2
  exit 1
fi

if $CRIAR && [[ -n "$PAI" ]]; then
  gh issue view "$PAI" -R "$REPO" --json title -q '"Issue pai: #'"$PAI"' — " + .title' \
    || { echo "Não encontrei a issue #$PAI em $REPO." >&2; exit 1; }
fi

# Cores das labels (as que já existirem no repositório não são alteradas).
declare -A CORES=(
  [frontend]=1d76db [backend]=5319e7 [infra]=0e8a16 [concluído]=c2e0c6 [pendente]=fbca04
  [desempenho]=f9d0c4 [ux]=d4c5f9 [acessibilidade]=bfd4f2 [segurança]=b60205 [testes]=c5def5
  [automações]=7057ff [notificações]=a2eeef [equipe]=bfdadc [auth]=e99695 [tabelas]=0052cc
  [recrutamento]=fef2c0 [landing]=ff9f1c [coerência]=006b75 [deploy]=0e8a16 ["decisão do time"]=d93f0b
)

if $CRIAR; then
  for label in "${!CORES[@]}"; do
    gh label create "$label" --color "${CORES[$label]}" -R "$REPO" 2>/dev/null || true
  done
fi

for arquivo in "$PASTA"/[0-9][0-9]-*.md; do
  num=$(basename "$arquivo" | cut -c1-2)
  [[ "$PULAR" == *",$num,"* ]] && continue
  titulo=$(sed -n 's/^title: "\(.*\)"$/\1/p' "$arquivo" | head -1)
  labels=$(sed -n 's/^labels: \[\(.*\)\]$/\1/p' "$arquivo" | head -1 | tr -d '"' | sed 's/, */,/g')
  corpo=$(mktemp)
  # Corpo = tudo depois do segundo '---' (bloco de cabeçalho).
  awk 'f>=2{print} /^---$/{f++}' "$arquivo" > "$corpo"

  if $CRIAR; then
    url=$(gh issue create -R "$REPO" --title "$titulo" --label "$labels" --body-file "$corpo")
    echo "$url"
    if [[ -n "$PAI" ]]; then
      # A API de sub-issues pede o id interno da issue, não o número.
      id=$(gh api "repos/$REPO/issues/${url##*/}" --jq .id)
      gh api -X POST "repos/$REPO/issues/$PAI/sub_issues" -F sub_issue_id="$id" >/dev/null \
        && echo "  ↳ ligada como sub-issue da #$PAI" \
        || echo "  ↳ não consegui ligar à #$PAI (ligue manualmente)" >&2
    fi
  else
    echo "[simulação] $titulo  —  labels: $labels${PAI:+  —  sub-issue da #$PAI}"
  fi
  rm -f "$corpo"
done

$CRIAR || echo -e "\nNada foi criado. Para criar de verdade: bash docs/issues/criar-issues.sh --criar"
