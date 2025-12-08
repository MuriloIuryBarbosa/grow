# 📱 Status do Projeto Mobile - Grow System

## ✅ Concluído

### 1. Infraestrutura
- ✅ Repositório GitHub criado: https://github.com/MuriloIuryBarbosa/grow
- ✅ Branch `mobile` separada da `master`
- ✅ Projeto Expo inicializado (React Native 0.81.5)
- ✅ Dependências instaladas:
  - @react-navigation/native + native-stack
  - axios
  - date-fns + date-fns-tz
  - react-native-screens + safe-area-context

### 2. Estrutura do Projeto
```
mobile/
├── src/
│   ├── screens/         ✅ 8 telas criadas
│   ├── navigation/      ✅ AppNavigator configurado
│   ├── services/        ✅ API completa (28 endpoints)
│   ├── hooks/           ✅ usePlants
│   ├── utils/           ✅ date.utils com BRT
│   └── types/           ✅ Todos os tipos do web
├── App.js               ✅ Integrado com navegação
├── package.json         ✅ Todas as dependências
└── README.md            ✅ Documentação completa
```

### 3. Telas Implementadas

#### HomeScreen (100% completa)
- ✅ Tabs: Dashboard e Plantas
- ✅ Dashboard com estatísticas:
  - Total de plantas
  - Plantas ativas
  - Por fase (Germinação, Muda, Vegetação, Floração)
- ✅ Lista de plantas com:
  - Cards com informações resumidas
  - Pull-to-refresh
  - Navegação para detalhes
- ✅ Botões de ação:
  - Sensores
  - Registrar Leitura
  - Nova Planta (FAB)

#### Placeholders criados:
- 🚧 PlantDetailScreen
- 🚧 NewPlantScreen
- 🚧 EditPlantScreen
- 🚧 NewRecordScreen
- 🚧 EditRecordScreen
- 🚧 SensorsScreen
- 🚧 RecordReadingScreen

### 4. Serviços e Hooks
- ✅ API completa (plantsAPI, recordsAPI, sensorsAPI, readingsAPI)
- ✅ usePlants hook (lista e detalhes)
- ✅ date.utils com timezone brasileiro (America/Sao_Paulo)

## 🚧 Em Desenvolvimento

### Próximas Implementações (em ordem):

1. **PlantDetailScreen**
   - Exibir informações completas da planta
   - Histórico de fases com duração
   - Gráficos de crescimento
   - Lista de registros diários
   - Botões de ação (Editar, Novo Registro, Mudar Fase)

2. **NewPlantScreen**
   - Formulário de cadastro
   - Validações
   - Integração com API

3. **EditPlantScreen**
   - Formulário de edição
   - Carregamento de dados existentes
   - Opções de status (ativa, morta, falha)

4. **NewRecordScreen**
   - Formulário de registro diário
   - Campos: tamanho, folhas, galhos, PPFD, VPD
   - Seleção de planta
   - Data e hora com timezone BRT

5. **EditRecordScreen**
   - Similar ao NewRecordScreen
   - Carregamento de dados do registro

6. **SensorsScreen**
   - CRUD de sensores
   - Cards com leituras recentes
   - Toggle ativo/inativo
   - Dashboard com gráficos

7. **RecordReadingScreen**
   - Formulário de leitura
   - Seleção de sensor
   - Temperatura e umidade
   - Timezone BRT automático

## 🔗 API Backend

**URL**: `http://10.0.2.2:3000` (Android Emulator)  
**Alterar para**: IP da sua máquina quando rodar em dispositivo físico

### Endpoints Disponíveis:
- **Plantas**: 11 endpoints (CRUD completo + fases)
- **Registros**: CRUD por planta
- **Sensores**: 17 endpoints (CRUD + leituras + stats)
- **Estatísticas**: Métricas gerais

## 🚀 Como Rodar

### 1. Backend (se ainda não estiver rodando):
```bash
cd /home/shurillo/Programming/grow
./start-v2.sh
```

### 2. Mobile:
```bash
cd /home/shurillo/Programming/grow/mobile
npm start
```

### 3. Escolher plataforma:
- `a` - Android Emulator
- `i` - iOS Simulator (macOS)
- `w` - Web Browser

## 📝 Notas Técnicas

### Avisos do Node 18
- ⚠️ Avisos de engine (Node 18 vs 20 requerido)
- ✅ Funcional apesar dos avisos
- 💡 Recomendação: Atualizar para Node 20+ quando possível

### Configuração de IP
- **Android Emulator**: `10.0.2.2:3000`
- **iOS Simulator**: `localhost:3000`
- **Dispositivo Físico**: IP da máquina (ex: `192.168.1.100:3000`)

Edite `/mobile/src/services/api.ts` linha 7 se necessário.

### Timezone
Todas as datas estão configuradas para **America/Sao_Paulo (BRT/BRST - UTC-3)**.

## 📊 Progresso Geral

```
Infraestrutura:    ████████████████████ 100%
HomeScreen:        ████████████████████ 100%
PlantDetail:       ░░░░░░░░░░░░░░░░░░░░   0%
Forms (Plantas):   ░░░░░░░░░░░░░░░░░░░░   0%
Forms (Registros): ░░░░░░░░░░░░░░░░░░░░   0%
Sensores:          ░░░░░░░░░░░░░░░░░░░░   0%
Gráficos:          ░░░░░░░░░░░░░░░░░░░░   0%

TOTAL:             ██░░░░░░░░░░░░░░░░░░  15%
```

## 🎯 Meta

Replicar **100%** das funcionalidades do sistema web:
- ✅ Listagem e estatísticas
- 🚧 CRUD de plantas
- 🚧 CRUD de registros
- 🚧 CRUD de sensores
- 🚧 Gráficos de evolução
- 🚧 Histórico de fases
- 🚧 Dashboard de sensores

## 📚 Referências

- **Web App**: `/home/shurillo/Programming/grow/frontend/`
- **Backend**: `/home/shurillo/Programming/grow/backend/`
- **Database**: `/home/shurillo/Programming/grow/grow.db`

## 🤝 Contribuição

Este é um projeto de migração web → mobile.  
Todas as funcionalidades devem ser **idênticas** ao sistema web.

---

**Última atualização**: 08/12/2025 - 21:45 BRT  
**Status**: 🟢 Em desenvolvimento ativo  
**Branch**: `mobile`
