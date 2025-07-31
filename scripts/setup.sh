#!/bin/bash

# 🚀 Script de Setup - LexiDecis

echo "🚀 Configurando ambiente LexiDecis..."

# Verificar diretório
if [ ! -f "pages/chat.html" ]; then
    echo "❌ Execute este script no diretório raiz do projeto"
    exit 1
fi

# Criar diretórios
mkdir -p config logs temp backup

# Configurar ambiente
if [ ! -f "config/environment.js" ]; then
    if [ -f "config/environment.example.js" ]; then
        cp config/environment.example.js config/environment.js
        echo "✅ Arquivo de ambiente criado"
    fi
fi

# Tornar scripts executáveis
chmod +x tests/chat-app/scripts/*.sh 2>/dev/null || true

echo "✅ Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure config/environment.js"
echo "2. Execute: python3 -m http.server 8000"
echo "3. Acesse: http://localhost:8000/pages/chat.html"
echo "4. Teste: http://localhost:8000/tests/index.html" 