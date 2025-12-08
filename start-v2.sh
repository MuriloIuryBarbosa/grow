#!/bin/bash

# ============================================
# GROW - Sistema de Gerenciamento de Cultivo
# Script de Inicialização - Versão 2.0
# ============================================

set -e  # Parar em caso de erro

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🌱 GROW - Sistema de Gerenciamento de Cultivo v2.0${NC}"
echo -e "${BLUE}================================================${NC}\n"

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}📁 Diretório:${NC} $PROJECT_DIR\n"

# ============================================
# 1. Instalar Dependências
# ============================================
echo -e "${YELLOW}📦 Instalando dependências...${NC}"

# Backend
if [ -f "backend/package.json" ]; then
  cd backend
  npm install --silent
  cd ..
  echo -e "${GREEN}✅ Backend dependencies installed${NC}"
fi

# Frontend
if [ -f "frontend/package.json" ]; then
  cd frontend
  npm install --silent
  cd ..
  echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
fi

echo ""

# ============================================
# 2. Verificar Banco de Dados
# ============================================
echo -e "${YELLOW}🗄️  Verificando banco de dados...${NC}"

if [ ! -f "grow.db" ]; then
  echo -e "${RED}❌ Banco de dados não encontrado!${NC}"
  echo -e "${YELLOW}Criando banco de dados...${NC}"
  sqlite3 grow.db < backend/database/schema.sql
  echo -e "${GREEN}✅ Banco de dados criado${NC}"
else
  echo -e "${GREEN}✅ Banco de dados encontrado${NC}"
fi

# Verificar diretório de uploads
if [ ! -d "uploads" ]; then
  mkdir -p uploads
  echo -e "${GREEN}✅ Diretório de uploads criado${NC}"
fi

echo ""

# ============================================
# 3. Limpar Processos Anteriores
# ============================================
echo -e "${YELLOW}🧹 Limpando processos anteriores...${NC}"
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1
echo -e "${GREEN}✅ Processos limpos${NC}\n"

# ============================================
# 4. Iniciar Serviços
# ============================================
echo -e "${YELLOW}🚀 Iniciando serviços...${NC}"

# Backend
cd backend
node server.js > /tmp/grow-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend iniciado (PID: $BACKEND_PID)${NC}"
cd ..

# Aguardar backend inicializar
sleep 2

# Frontend
cd frontend
npm run dev > /tmp/grow-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend iniciado (PID: $FRONTEND_PID)${NC}"
cd ..

echo ""

# ============================================
# 5. Informações do Sistema
# ============================================
echo -e "${GREEN}✨ Sistema iniciado com sucesso!${NC}\n"
echo -e "${BLUE}📍 URLs:${NC}"
echo -e "   Backend:  http://localhost:3000"
echo -e "   Frontend: http://localhost:5173"
echo ""
echo -e "${BLUE}📋 Logs:${NC}"
echo -e "   Backend:  tail -f /tmp/grow-backend.log"
echo -e "   Frontend: tail -f /tmp/grow-frontend.log"
echo ""
echo -e "${YELLOW}Para parar o sistema, pressione Ctrl+C${NC}\n"

# ============================================
# 6. Aguardar e Limpar ao Sair
# ============================================
trap "echo -e '\n${YELLOW}🛑 Parando sistema...${NC}'; \
      kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; \
      pkill -f 'node.*server.js' 2>/dev/null; \
      pkill -f 'vite' 2>/dev/null; \
      echo -e '${GREEN}✅ Sistema parado${NC}'; \
      exit 0" INT TERM

# Aguardar indefinidamente
wait
