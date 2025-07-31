#!/bin/bash

# Script para executar todos os testes unitários da aplicação Chat LexiDecis
# Autor: Sistema de Testes LexiDecis
# Versão: 1.0

echo "🧪 Executando Testes Unitários - LexiDecis Chat"
echo "================================================"
echo ""

# Configurações
TEST_DIR="tests/chat-app/unit"
BROWSER="open"  # Para macOS
# BROWSER="xdg-open"  # Para Linux
# BROWSER="start"     # Para Windows

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

# Verificar se o diretório de testes existe
if [ ! -d "$TEST_DIR" ]; then
    print_status "error" "Diretório de testes unitários não encontrado: $TEST_DIR"
    exit 1
fi

print_status "info" "Iniciando execução dos testes unitários..."
echo ""

# Contadores
total_tests=0
executed_tests=0
failed_tests=0

# Função para executar um teste
run_test() {
    local test_file=$1
    local test_name=$(basename "$test_file" .html)
    
    print_status "info" "Executando: $test_name"
    
    if [ -f "$test_file" ]; then
        # Abrir o teste no navegador
        $BROWSER "$test_file" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            print_status "success" "Teste $test_name aberto no navegador"
            ((executed_tests++))
        else
            print_status "error" "Falha ao abrir teste $test_name"
            ((failed_tests++))
        fi
    else
        print_status "error" "Arquivo de teste não encontrado: $test_file"
        ((failed_tests++))
    fi
    
    ((total_tests++))
    echo ""
}

# Executar testes de serviços
print_status "info" "📁 Executando testes de serviços..."
echo ""

if [ -d "$TEST_DIR/services" ]; then
    for test_file in "$TEST_DIR"/services/*.test.html; do
        if [ -f "$test_file" ]; then
            run_test "$test_file"
        fi
    done
else
    print_status "warning" "Diretório de testes de serviços não encontrado"
fi

# Executar testes de componentes
print_status "info" "📁 Executando testes de componentes..."
echo ""

if [ -d "$TEST_DIR/components" ]; then
    for test_file in "$TEST_DIR"/components/*.test.html; do
        if [ -f "$test_file" ]; then
            run_test "$test_file"
        fi
    done
else
    print_status "warning" "Diretório de testes de componentes não encontrado"
fi

# Resumo final
echo "================================================"
print_status "info" "Resumo da execução:"
echo "   Total de testes encontrados: $total_tests"
echo "   Testes executados: $executed_tests"
echo "   Testes com falha: $failed_tests"
echo ""

if [ $failed_tests -eq 0 ]; then
    print_status "success" "Todos os testes foram executados com sucesso!"
else
    print_status "warning" "Alguns testes falharam. Verifique os logs acima."
fi

echo ""
print_status "info" "💡 Dica: Verifique o console do navegador para detalhes dos testes"
print_status "info" "📋 Os resultados dos testes aparecerão na interface de cada teste"
echo ""

# Aguardar input do usuário para continuar
read -p "Pressione Enter para continuar..."

exit 0 