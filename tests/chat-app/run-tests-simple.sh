#!/bin/bash

# Script simples para executar os testes da aplicação Chat LexiDecis
# Autor: Sistema de Testes LexiDecis
# Versão: 1.0

echo "🧪 Executando Testes - LexiDecis Chat"
echo "====================================="
echo ""

# Configurações
BASE_URL="http://localhost:8000"
TEST_DIR="tests/chat-app"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir com cores
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "success")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "info")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Verificar se o servidor está rodando
check_server() {
    if curl -s "$BASE_URL" > /dev/null 2>&1; then
        print_status "success" "Servidor local rodando em $BASE_URL"
        return 0
    else
        print_status "error" "Servidor não está rodando em $BASE_URL"
        print_status "info" "Iniciando servidor..."
        python3 -m http.server 8000 &
        sleep 2
        return 1
    fi
}

# Função para abrir teste no navegador
open_test() {
    local test_file=$1
    local test_name=$2
    
    print_status "info" "Abrindo: $test_name"
    
    if open "$BASE_URL/$test_file" 2>/dev/null; then
        print_status "success" "Teste $test_name aberto no navegador"
        return 0
    else
        print_status "error" "Falha ao abrir teste $test_name"
        return 1
    fi
}

# Função principal
main() {
    # Verificar servidor
    check_server
    
    echo ""
    print_status "info" "Abrindo testes no navegador..."
    echo ""
    
    # Lista de testes para executar
    tests=(
        "test-simple.html:Teste Simples"
        "unit/services/stateManager.test.html:Teste Unitário - StateManager"
        "integration/chatWorkflow.test.html:Teste de Integração - Fluxo de Chat"
        "e2e/mobileResponsiveness.test.html:Teste E2E - Responsividade Mobile"
    )
    
    # Contadores
    total_tests=${#tests[@]}
    executed_tests=0
    failed_tests=0
    
    # Executar cada teste
    for test in "${tests[@]}"; do
        IFS=':' read -r test_file test_name <<< "$test"
        
        if open_test "$TEST_DIR/$test_file" "$test_name"; then
            ((executed_tests++))
        else
            ((failed_tests++))
        fi
        
        # Pequena pausa entre testes
        sleep 1
    done
    
    echo ""
    echo "====================================="
    print_status "info" "Resumo da execução:"
    echo "   Total de testes: $total_tests"
    echo "   Testes executados: $executed_tests"
    echo "   Testes com falha: $failed_tests"
    echo ""
    
    if [ $failed_tests -eq 0 ]; then
        print_status "success" "Todos os testes foram abertos com sucesso!"
    else
        print_status "warning" "Alguns testes falharam ao abrir."
    fi
    
    echo ""
    print_status "info" "💡 Instruções:"
    echo "   1. Verifique as abas do navegador que foram abertas"
    echo "   2. Execute os testes clicando nos botões de cada página"
    echo "   3. Verifique o console do navegador para logs detalhados"
    echo "   4. Para parar o servidor: Ctrl+C"
    echo ""
    
    # Manter o script rodando para manter o servidor ativo
    print_status "info" "Servidor mantido ativo. Pressione Ctrl+C para parar."
    wait
}

# Executar função principal
main "$@" 