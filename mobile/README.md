# Grow Mobile

Aplicativo mobile do sistema de gerenciamento de cultivo.

## 🚀 Tecnologias

- **Expo** (React Native)
- **TypeScript**
- **React Navigation** (navegação)
- **Axios** (requisições HTTP)
- **date-fns** & **date-fns-tz** (datas com timezone brasileiro)

## 📁 Estrutura

```
src/
├── screens/          # Telas do app (Home, PlantDetail, NewPlant, etc)
├── components/       # Componentes reutilizáveis
├── services/         # API e serviços (axios)
├── hooks/            # Custom hooks (usePlants, useRecords)
├── utils/            # Funções utilitárias (formatação de data)
├── types/            # TypeScript types
└── navigation/       # Configuração de navegação
```

## 🎯 Funcionalidades (a implementar)

### Plantas
- [x] Estrutura base criada
- [ ] Listagem de plantas
- [ ] Detalhes da planta
- [ ] Criar nova planta
- [ ] Editar planta
- [ ] Excluir planta

### Fases
- [ ] Histórico de fases
- [ ] Duração das fases
- [ ] Gráficos de crescimento

### Registros Diários
- [ ] Criar registro
- [ ] Editar registro
- [ ] Visualizar histórico
- [ ] Campos: tamanho, folhas, galhos, PPFD, VPD

### Sensores
- [ ] Dashboard com gráficos
- [ ] Gerenciamento de sensores (CRUD)
- [ ] Registrar leituras (temperatura/umidade)
- [ ] Gráficos de evolução
- [ ] Timezone: America/São_Paulo (BRT/BRST - UTC-3)

## 🔗 Backend

O app mobile consome a mesma API do sistema web:

- **URL**: `http://localhost:3000` (desenvolvimento)
- **Endpoints**: 28 rotas (11 plantas + 17 sensores)

## ⚙️ Configuração

1. Instalar dependências:
```bash
npm install
```

2. Iniciar o servidor de desenvolvimento:
```bash
npm start
```

3. Rodar no Android:
```bash
npm run android
```

4. Rodar no iOS:
```bash
npm run ios
```

5. Rodar no navegador:
```bash
npm run web
```

## 📱 Desenvolvimento

Este app **replica exatamente** as funcionalidades do sistema web.

**Importante**: O backend deve estar rodando na porta 3000.

## 🔄 Status

**Branch**: `mobile`  
**Status**: 🚧 Em desenvolvimento (estrutura inicial criada)

### Próximos passos:
1. Configurar navegação (Stack Navigator)
2. Criar serviço de API (axios)
3. Implementar telas principais
4. Portar componentes do web
5. Adicionar gráficos (react-native-chart-kit ou similar)

## 📝 Notas

- Node.js 18.19.1 (avisos de engine ignorados - funcional)
- Expo SDK 52
- React Native 0.81.5
- Timezone: BRT/BRST (UTC-3)
