# 🌱 GROW - Sistema de Gerenciamento de Cultivo v2.0

Sistema completo para gerenciamento e monitoramento de cultivo de plantas com registro diário, histórico de fases e visualização de dados.

## ✨ O que foi refatorado

✅ **Banco de Dados Robusto**
- Schema consolidado com constraints, triggers e views
- Validações automáticas em nível de banco
- Migração de dados preservando histórico

✅ **Backend com Arquitetura Limpa**
- Repository Pattern para separação de responsabilidades
- Prepared statements para segurança e performance
- Middleware de erro centralizado
- Singleton para conexão de banco

✅ **Frontend Otimizado**
- Utilitários centralizados (date.utils)
- Hooks otimizados com logs de debug
- Tratamento de erros robusto
- TypeScript para type safety

✅ **Boas Práticas**
- Código documentado e organizado
- Logs estruturados para debug
- Scripts de inicialização automatizados
- README completo com documentação

## 🚀 Como Usar

### Método Rápido
```bash
./start-v2.sh
```

### URLs
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## 📊 Funcionalidades

- ✅ Cadastro completo de plantas
- ✅ Histórico automático de fases
- ✅ Registros diários com métricas
- ✅ Gráficos interativos com tooltips
- ✅ Upload de fotos
- ✅ Cálculo automático de estatísticas
- ✅ Marcadores de fase nos gráficos
- ✅ Interpolação inteligente de dados

## 🗄️ Estrutura do Banco

### Tabelas
- **plants** - Dados das plantas
- **phase_history** - Histórico de fases
- **daily_records** - Registros diários

### Triggers
- Auto-atualização de `updated_at`
- Cálculo automático de `duration_days`

### Views
- `v_plants_stats` - Plantas com estatísticas
- `v_latest_records` - Últimos registros

## 📝 Logs e Debug

```bash
# Backend
tail -f /tmp/grow-backend.log

# Frontend
tail -f /tmp/grow-frontend.log
```

## 🛠️ Tecnologias

**Backend:** Node.js, Express, SQLite, Multer  
**Frontend:** React 18, TypeScript, Vite, date-fns

---

**Versão:** 2.0.0 | **Data:** Dezembro 2025
