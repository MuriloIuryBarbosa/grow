# 🌱 Sistema de Gerenciamento de Cultivo - Resumo

## ⚡ Início Rápido

```bash
# 1. Instalar dependências
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Iniciar sistema
./start.sh

# 3. Acessar
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

## 📋 Funcionalidades Principais

| Funcionalidade | Status | Descrição |
|---|---|---|
| 🌱 **Cadastro de Sementes** | ✅ | Registre sementes com nome, código, genética, substrato e foto |
| 📝 **Controle Diário** | ✅ | Registre tamanho, folhas, ramos, ambiente, fertilização e fotos |
| 🔄 **Fases do Ciclo** | ✅ | Germinação → Muda → Vegetação → Floração |
| 📊 **Estatísticas** | ✅ | Médias, crescimento, tempo de germinação |
| ⚠️ **Alertas Automáticos** | ✅ | Avisos quando temperatura, umidade, VPD saem do ideal |
| 📸 **Galeria de Fotos** | ✅ | Upload e visualização de fotos em cada etapa |
| 📈 **Análises** | ✅ | Insights e recomendações inteligentes |
| 🎨 **Interface Moderna** | ✅ | Design responsivo e intuitivo |

## 🗂️ Estrutura do Projeto

```
grow/
│
├── 📄 README.md              # Documentação completa
├── 📄 QUICK_START.md         # Guia rápido
├── 📄 FUNCIONALIDADES.md     # Lista de funcionalidades
├── 📄 EXEMPLOS.js            # Dados de exemplo
│
├── 🔧 start.sh               # Script de inicialização
├── 🔧 backup.sh              # Script de backup
├── 🔧 reinstall.sh           # Script de reinstalação
│
├── 🖥️ backend/               # API REST
│   ├── src/
│   │   ├── database.ts       # SQLite
│   │   ├── models.ts         # Lógica de dados
│   │   ├── routes.ts         # Endpoints
│   │   ├── server.ts         # Express
│   │   └── types.ts          # TypeScript types
│   └── package.json
│
├── 🌐 frontend/              # Interface React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx          # Lista de plantas
│   │   │   ├── NewPlant.tsx      # Cadastro
│   │   │   ├── PlantDetail.tsx   # Detalhes + registros
│   │   │   └── Analytics.tsx     # Análises
│   │   ├── api.ts            # Client API
│   │   ├── types.ts          # TypeScript types
│   │   ├── App.tsx           # App principal
│   │   └── App.css           # Estilos
│   └── package.json
│
├── 📁 uploads/               # Fotos (gerado automaticamente)
├── 📁 grow.db                # Banco de dados (gerado automaticamente)
└── 📁 backups/               # Backups (./backup.sh)
```

## 🎯 Páginas do Sistema

### 🏠 Página Inicial (`/`)
- Lista todas as plantas em cards visuais
- Estatísticas por fase (clicáveis para filtrar)
- Botão para cadastrar nova planta

### ➕ Nova Planta (`/new`)
- Formulário completo de cadastro
- Upload de foto
- Validações em tempo real

### 🌱 Detalhes da Planta (`/plant/:code`)
- Informações da planta
- Trocar fase atual
- Estatísticas individuais
- Adicionar registro diário
- Histórico completo em tabela
- Galeria de fotos

### 📊 Análises (`/analytics`)
- Resumo geral do cultivo
- Distribuição por fases
- Alertas automáticos
- Insights e recomendações

## 🔌 API Endpoints

### Plantas
```
GET    /api/plants              # Listar todas
GET    /api/plants/:id          # Por ID ou código
POST   /api/plants              # Criar
PUT    /api/plants/:id          # Atualizar
DELETE /api/plants/:id          # Deletar
GET    /api/plants/phase/:phase # Por fase
```

### Registros
```
GET    /api/records             # Listar todos
GET    /api/records/plant/:id   # Por planta
POST   /api/records             # Criar
PUT    /api/records/:id         # Atualizar
DELETE /api/records/:id         # Deletar
```

### Estatísticas
```
GET    /api/statistics/overview # Geral
GET    /api/statistics/plant/:id # Por planta
```

### Upload
```
POST   /api/upload              # Upload de foto
```

## 📐 Banco de Dados

### Tabela: `plants`
- id (PK)
- name, genetic, code (unique)
- planting_date, germination_date, days_to_germination
- substrate, substrate_other
- current_phase (germinacao | muda | vegetacao | floracao)
- photo_path
- created_at

### Tabela: `daily_records`
- id (PK)
- plant_id (FK → plants)
- record_date
- plant_size, leaf_count, branch_count
- temperature, humidity, ppfd, vpd
- fertilization, observations
- photo_path
- created_at

## 🎨 Tecnologias

**Backend:**
- Node.js + Express
- TypeScript
- SQLite (better-sqlite3)
- Multer (upload)
- date-fns

**Frontend:**
- React 18
- TypeScript
- React Router
- Vite
- CSS puro

## 💡 Dicas de Uso

1. **Códigos únicos**: Use padrão como `TOM001`, `PIM001` para organizar
2. **Fotos**: Tire sempre do mesmo ângulo para comparar crescimento
3. **Registros diários**: Mantenha consistência - mesmo horário todos os dias
4. **Backup**: Execute `./backup.sh` semanalmente
5. **VPD**: Mais importante que temperatura/umidade separadas
6. **PPFD**: Aumente gradualmente conforme a planta cresce

## 📊 Faixas Ideais

| Parâmetro | Ideal | Alerta |
|---|---|---|
| **Temperatura** | 22-28°C | < 18°C ou > 30°C |
| **Umidade** | 50-70% | < 40% ou > 80% |
| **VPD (veg)** | 0.8-1.2 kPa | < 0.4 ou > 1.6 kPa |
| **VPD (flor)** | 1.0-1.5 kPa | < 0.4 ou > 1.6 kPa |
| **PPFD (veg)** | 400-600 | < 300 |
| **PPFD (flor)** | 600-900 | < 300 |

## 🔧 Comandos Úteis

```bash
# Iniciar sistema
./start.sh

# Fazer backup
./backup.sh

# Reinstalar dependências
./reinstall.sh

# Apenas backend
cd backend && npm run dev

# Apenas frontend
cd frontend && npm run dev

# Build para produção
cd backend && npm run build
cd frontend && npm run build
```

## 📱 Responsividade

✅ Desktop (1920x1080)
✅ Laptop (1366x768)
✅ Tablet (768x1024)
✅ Mobile (375x667)

## 🐛 Troubleshooting

**Backend não inicia:**
```bash
cd backend
rm -rf node_modules
npm install
npm run dev
```

**Frontend não carrega:**
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

**Porta em uso:**
- Backend: Mude PORT em backend/.env
- Frontend: Mude server.port em frontend/vite.config.ts

## 📚 Documentação

- 📖 **README.md** - Documentação completa
- 🚀 **QUICK_START.md** - Guia rápido
- ✅ **FUNCIONALIDADES.md** - Lista de funcionalidades
- 📝 **EXEMPLOS.js** - Dados de exemplo

## 🎉 Pronto para Usar!

O sistema está **100% funcional** e pronto para gerenciar seu cultivo! 🌱

```bash
./start.sh
```

Acesse: **http://localhost:5173** 🚀
