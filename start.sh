#!/bin/bash

# Script para iniciar o sistema completo

# Obter o diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🌱 Iniciando Sistema de Gerenciamento de Cultivo..."
echo "📁 Diretório: $SCRIPT_DIR"

# Verificar se as dependências estão instaladas
if [ ! -d "$SCRIPT_DIR/backend/node_modules" ]; then
    echo "📦 Instalando dependências do backend..."
    cd "$SCRIPT_DIR/backend" && npm install
fi

if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
    echo "📦 Instalando dependências do frontend..."
    cd "$SCRIPT_DIR/frontend" && npm install
fi

# Matar processos anteriores se existirem
echo "🧹 Limpando processos anteriores..."
pkill -f "node.*test-server.js" 2>/dev/null
pkill -f "tsx.*server.ts" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Iniciar backend em background
echo "🚀 Iniciando backend (porta 3000)..."
cd "$SCRIPT_DIR/backend"
node test-server.js > /tmp/grow-backend.log 2>&1 &
BACKEND_PID=$!

# Aguardar o backend iniciar
sleep 3

# Iniciar frontend
echo "🚀 Iniciando frontend (porta 5173)..."
cd "$SCRIPT_DIR/frontend"
npm run dev > /tmp/grow-frontend.log 2>&1 &
FRONTEND_PID=$!

# Aguardar logs inicializarem
sleep 2

echo ""
echo "✅ Sistema iniciado com sucesso!"
echo ""
echo "📍 Backend: http://localhost:3000"
echo "📍 Frontend: http://localhost:5173"
echo ""
echo "📋 Logs:"
echo "   Backend: tail -f /tmp/grow-backend.log"
echo "   Frontend: tail -f /tmp/grow-frontend.log"
echo ""
echo "Para parar o sistema, pressione Ctrl+C"
echo ""

# Aguardar por Ctrl+C
trap "echo ''; echo '🛑 Parando sistema...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Manter o script rodando
wait
