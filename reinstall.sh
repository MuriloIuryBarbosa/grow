#!/bin/bash

echo "🧹 Limpando dependências e builds..."

# Remover node_modules e builds
rm -rf backend/node_modules
rm -rf backend/dist
rm -rf frontend/node_modules
rm -rf frontend/dist

echo "📦 Reinstalando dependências do backend..."
cd backend
npm install
cd ..

echo "📦 Reinstalando dependências do frontend..."
cd frontend
npm install
cd ..

echo "✅ Dependências reinstaladas com sucesso!"
echo ""
echo "Para iniciar o sistema, execute:"
echo "  ./start.sh"
