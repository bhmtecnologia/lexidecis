#!/bin/bash

# 🧪 Script para Executar Testes do LexiDecis
# Uso: ./run-tests.sh [tipo]

echo "🧪 LexiDecis - Executor de Testes"
echo "=================================="

# Função para abrir arquivo no navegador padrão
open_browser() {
    local file_path="$1"
    local full_path="$(pwd)/$file_path"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$full_path"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open "$full_path" 2>/dev/null || sensible-browser "$full_path" 2>/dev/null || firefox "$full_path"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows
        start "$full_path"
    else
        echo "❌ Sistema operacional não suportado: $OSTYPE"
        echo "📁 Abra manualmente: $full_path"
        return 1
    fi
}

# Função para mostrar menu
show_menu() {
    echo ""
    echo "📋 Testes Disponíveis:"
    echo "1) 🧩 Teste de Integração (UIManager)"
    echo "2) 📱 Teste de UI Mobile (Sidebar)"
    echo "3) 🔧 Teste de Debug (Sidebar)"
    echo "4) ⚠️  Teste de Tratamento de Erros"
    echo "5) 📊 Executar Todos os Testes"
    echo "6) 📖 Abrir Documentação"
    echo "0) ❌ Sair"
    echo ""
    read -p "Escolha uma opção (0-6): " choice
}

# Função para executar teste específico
run_test() {
    local test_type="$1"
    
    case $test_type in
        "integration")
            echo "🧩 Executando Teste de Integração..."
            open_browser "tests/integration-tests/test-integration.html"
            ;;
        "ui-mobile")
            echo "📱 Executando Teste de UI Mobile..."
            open_browser "tests/ui-tests/test-sidebar-mobile.html"
            ;;
        "debug")
            echo "🔧 Executando Teste de Debug..."
            open_browser "tests/debug/test-sidebar-debug.html"
            ;;
        "error-handling")
            echo "⚠️  Executando Teste de Tratamento de Erros..."
            open_browser "tests/error-handling/interactive-test.html"
            ;;
        "all")
            echo "📊 Executando Todos os Testes..."
            open_browser "tests/integration-tests/test-integration.html"
            sleep 2
            open_browser "tests/ui-tests/test-sidebar-mobile.html"
            sleep 2
            open_browser "tests/debug/test-sidebar-debug.html"
            sleep 2
            open_browser "tests/error-handling/interactive-test.html"
            ;;
        "docs")
            echo "📖 Abrindo Documentação..."
            open_browser "tests/README.md"
            ;;
        *)
            echo "❌ Opção inválida: $test_type"
            return 1
            ;;
    esac
}

# Verificar se foi passado argumento
if [ $# -eq 1 ]; then
    case $1 in
        "integration"|"ui-mobile"|"debug"|"error-handling"|"all"|"docs")
            run_test "$1"
            exit 0
            ;;
        *)
            echo "❌ Argumento inválido: $1"
            echo "Uso: $0 [integration|ui-mobile|debug|error-handling|all|docs]"
            exit 1
            ;;
    esac
fi

# Menu interativo
while true; do
    show_menu
    
    case $choice in
        1)
            run_test "integration"
            ;;
        2)
            run_test "ui-mobile"
            ;;
        3)
            run_test "debug"
            ;;
        4)
            run_test "error-handling"
            ;;
        5)
            run_test "all"
            ;;
        6)
            run_test "docs"
            ;;
        0)
            echo "👋 Saindo..."
            exit 0
            ;;
        *)
            echo "❌ Opção inválida. Tente novamente."
            ;;
    esac
    
    echo ""
    read -p "Pressione ENTER para continuar..."
done 