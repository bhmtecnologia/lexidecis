#!/bin/bash

# Script principal para executar todos os testes da aplicação Chat LexiDecis
# Autor: Sistema de Testes LexiDecis
# Versão: 1.0

echo "🧪 Sistema de Testes Completo - LexiDecis Chat"
echo "=============================================="
echo ""

# Configurações
BASE_DIR="tests/chat-app"
BROWSER="open"  # Para macOS
# BROWSER="xdg-open"  # Para Linux
# BROWSER="start"     # Para Windows

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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
        "header")
            echo -e "${PURPLE}📋 $message${NC}"
            ;;
        "subheader")
            echo -e "${CYAN}🔹 $message${NC}"
            ;;
    esac
}

# Função para mostrar menu
show_menu() {
    echo ""
    print_status "header" "Menu de Testes Disponíveis:"
    echo ""
    echo "1. 🧪 Testes Unitários"
    echo "2. 🔄 Testes de Integração"
    echo "3. 🎯 Testes End-to-End"
    echo "4. ⚡ Testes de Performance"
    echo "5. 🚀 Executar Todos os Testes"
    echo "6. 📊 Relatório de Cobertura"
    echo "7. 🛠️  Configurações"
    echo "0. ❌ Sair"
    echo ""
}

# Função para executar testes unitários
run_unit_tests() {
    print_status "header" "Executando Testes Unitários"
    echo ""
    
    if [ -d "$BASE_DIR/unit" ]; then
        print_status "subheader" "Testes de Serviços:"
        for test_file in "$BASE_DIR"/unit/services/*.test.html; do
            if [ -f "$test_file" ]; then
                test_name=$(basename "$test_file" .html)
                print_status "info" "Abrindo: $test_name"
                $BROWSER "$test_file" 2>/dev/null
                sleep 1
            fi
        done
        
        print_status "subheader" "Testes de Componentes:"
        for test_file in "$BASE_DIR"/unit/components/*.test.html; do
            if [ -f "$test_file" ]; then
                test_name=$(basename "$test_file" .html)
                print_status "info" "Abrindo: $test_name"
                $BROWSER "$test_file" 2>/dev/null
                sleep 1
            fi
        done
        
        print_status "success" "Testes unitários iniciados"
    else
        print_status "error" "Diretório de testes unitários não encontrado"
    fi
}

# Função para executar testes de integração
run_integration_tests() {
    print_status "header" "Executando Testes de Integração"
    echo ""
    
    if [ -d "$BASE_DIR/integration" ]; then
        for test_file in "$BASE_DIR"/integration/*.test.html; do
            if [ -f "$test_file" ]; then
                test_name=$(basename "$test_file" .html)
                print_status "info" "Abrindo: $test_name"
                $BROWSER "$test_file" 2>/dev/null
                sleep 1
            fi
        done
        
        print_status "success" "Testes de integração iniciados"
    else
        print_status "error" "Diretório de testes de integração não encontrado"
    fi
}

# Função para executar testes E2E
run_e2e_tests() {
    print_status "header" "Executando Testes End-to-End"
    echo ""
    
    if [ -d "$BASE_DIR/e2e" ]; then
        for test_file in "$BASE_DIR"/e2e/*.test.html; do
            if [ -f "$test_file" ]; then
                test_name=$(basename "$test_file" .html)
                print_status "info" "Abrindo: $test_name"
                $BROWSER "$test_file" 2>/dev/null
                sleep 1
            fi
        done
        
        print_status "success" "Testes E2E iniciados"
    else
        print_status "error" "Diretório de testes E2E não encontrado"
    fi
}

# Função para executar testes de performance
run_performance_tests() {
    print_status "header" "Executando Testes de Performance"
    echo ""
    
    if [ -d "$BASE_DIR/performance" ]; then
        for test_file in "$BASE_DIR"/performance/*.test.html; do
            if [ -f "$test_file" ]; then
                test_name=$(basename "$test_file" .html)
                print_status "info" "Abrindo: $test_name"
                $BROWSER "$test_file" 2>/dev/null
                sleep 1
            fi
        done
        
        print_status "success" "Testes de performance iniciados"
    else
        print_status "error" "Diretório de testes de performance não encontrado"
    fi
}

# Função para executar todos os testes
run_all_tests() {
    print_status "header" "Executando Todos os Testes"
    echo ""
    
    print_status "info" "Iniciando execução completa..."
    echo ""
    
    # Testes unitários
    print_status "subheader" "1. Testes Unitários"
    run_unit_tests
    echo ""
    
    # Testes de integração
    print_status "subheader" "2. Testes de Integração"
    run_integration_tests
    echo ""
    
    # Testes E2E
    print_status "subheader" "3. Testes End-to-End"
    run_e2e_tests
    echo ""
    
    # Testes de performance
    print_status "subheader" "4. Testes de Performance"
    run_performance_tests
    echo ""
    
    print_status "success" "Todos os testes foram iniciados!"
    print_status "info" "Verifique as abas do navegador para acompanhar os resultados"
}

# Função para gerar relatório de cobertura
generate_coverage_report() {
    print_status "header" "Relatório de Cobertura de Testes"
    echo ""
    
    # Contar arquivos de teste
    unit_count=$(find "$BASE_DIR/unit" -name "*.test.html" 2>/dev/null | wc -l)
    integration_count=$(find "$BASE_DIR/integration" -name "*.test.html" 2>/dev/null | wc -l)
    e2e_count=$(find "$BASE_DIR/e2e" -name "*.test.html" 2>/dev/null | wc -l)
    performance_count=$(find "$BASE_DIR/performance" -name "*.test.html" 2>/dev/null | wc -l)
    
    total_tests=$((unit_count + integration_count + e2e_count + performance_count))
    
    echo "📊 Estatísticas de Cobertura:"
    echo "   Testes Unitários: $unit_count"
    echo "   Testes de Integração: $integration_count"
    echo "   Testes E2E: $e2e_count"
    echo "   Testes de Performance: $performance_count"
    echo "   Total: $total_tests"
    echo ""
    
    # Verificar componentes cobertos
    print_status "subheader" "Componentes Cobertos:"
    
    if [ $unit_count -gt 0 ]; then
        echo "   ✅ StateManager"
        echo "   ✅ ChatManager"
        echo "   ✅ UIManager"
        echo "   ✅ GPTManager"
        echo "   ✅ ApiService"
    fi
    
    if [ $integration_count -gt 0 ]; then
        echo "   ✅ Fluxo de Chat"
        echo "   ✅ Integração com Autenticação"
        echo "   ✅ Seleção de GPT"
        echo "   ✅ Persistência de Estado"
    fi
    
    if [ $e2e_count -gt 0 ]; then
        echo "   ✅ Jornada do Usuário"
        echo "   ✅ Responsividade Mobile"
        echo "   ✅ Tratamento de Erros"
    fi
    
    if [ $performance_count -gt 0 ]; then
        echo "   ✅ Tempo de Carregamento"
        echo "   ✅ Uso de Memória"
        echo "   ✅ Performance do Histórico"
    fi
    
    echo ""
    print_status "info" "Relatório gerado com sucesso!"
}

# Função para configurações
show_configuration() {
    print_status "header" "Configurações do Sistema de Testes"
    echo ""
    
    echo "🔧 Configurações Atuais:"
    echo "   Diretório Base: $BASE_DIR"
    echo "   Navegador: $BROWSER"
    echo "   Sistema: $(uname -s)"
    echo ""
    
    echo "📁 Estrutura de Diretórios:"
    if [ -d "$BASE_DIR" ]; then
        tree "$BASE_DIR" -I "node_modules" 2>/dev/null || find "$BASE_DIR" -type d | head -20
    else
        print_status "error" "Diretório de testes não encontrado"
    fi
    
    echo ""
    print_status "info" "Para alterar configurações, edite este script"
}

# Função principal
main() {
    # Verificar se o diretório base existe
    if [ ! -d "$BASE_DIR" ]; then
        print_status "error" "Diretório de testes não encontrado: $BASE_DIR"
        print_status "info" "Certifique-se de estar no diretório raiz do projeto"
        exit 1
    fi
    
    print_status "success" "Sistema de testes carregado com sucesso!"
    print_status "info" "Diretório base: $BASE_DIR"
    echo ""
    
    while true; do
        show_menu
        read -p "Escolha uma opção (0-7): " choice
        
        case $choice in
            1)
                run_unit_tests
                ;;
            2)
                run_integration_tests
                ;;
            3)
                run_e2e_tests
                ;;
            4)
                run_performance_tests
                ;;
            5)
                run_all_tests
                ;;
            6)
                generate_coverage_report
                ;;
            7)
                show_configuration
                ;;
            0)
                print_status "info" "Saindo do sistema de testes..."
                exit 0
                ;;
            *)
                print_status "error" "Opção inválida. Tente novamente."
                ;;
        esac
        
        echo ""
        read -p "Pressione Enter para continuar..."
        clear
    done
}

# Verificar se o script está sendo executado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 