# 🌱 Sistema de Gerenciamento de Cultivo

Sistema completo para gerenciamento de cultivo com arquitetura limpa (Clean Architecture), preparado para escalabilidade e multiplataforma.

## 📋 Índice

- [Arquitetura](#arquitetura)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Tecnologias](#tecnologias)
- [Instalação](#instalação)
- [Desenvolvimento](#desenvolvimento)
- [Boas Práticas](#boas-práticas)
- [API](#api)

## 🏗️ Arquitetura

O projeto segue os princípios da **Clean Architecture** (Arquitetura Limpa), garantindo:

- ✅ **Separação de responsabilidades**
- ✅ **Independência de frameworks**
- ✅ **Testabilidade**
- ✅ **Independência de UI**
- ✅ **Independência de banco de dados**
- ✅ **Escalabilidade**
- ✅ **Multiplataforma (web e mobile)**

### Camadas

#### Backend

```
src/
├── domain/                 # Camada de Domínio (Entidades e Regras de Negócio)
│   ├── entities/          # Entidades do domínio
│   └── repositories/      # Interfaces dos repositórios
├── application/           # Camada de Aplicação (Casos de Uso)
│   ├── use-cases/        # Casos de uso da aplicação
│   └── dtos/             # Data Transfer Objects
├── infrastructure/        # Camada de Infraestrutura (Implementações)
│   ├── database/         # Configuração do banco de dados
│   └── repositories/     # Implementações dos repositórios
├── presentation/         # Camada de Apresentação (Controllers e Routes)
│   ├── controllers/      # Controllers HTTP
│   └── middlewares/      # Middlewares
└── shared/               # Código compartilhado
    ├── config.ts         # Configurações
    ├── errors/           # Classes de erro
    └── utils/            # Utilitários
```

#### Frontend

```
src/
├── domain/                # Camada de Domínio
│   ├── entities/         # Entidades
│   └── repositories/     # Interfaces dos repositórios
├── application/          # Camada de Aplicação
│   └── use-cases/       # Casos de uso
├── infrastructure/       # Camada de Infraestrutura
│   ├── http/            # Cliente HTTP
│   └── repositories/    # Implementações dos repositórios
├── presentation/         # Camada de Apresentação
│   ├── components/      # Componentes React
│   ├── pages/           # Páginas
│   └── hooks/           # Hooks customizados
└── shared/              # Código compartilhado
    ├── config/          # Configurações
    └── utils/           # Utilitários
```

## 📁 Estrutura do Projeto

```
grow/
├── backend/
│   ├── src/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── shared/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── shared/
│   ├── .env.example
│   └── package.json
├── uploads/
├── start.sh
└── README.md
```

## 🚀 Tecnologias

### Backend
- **Node.js** + **TypeScript**
- **Express** - Framework web
- **SQLite** + **better-sqlite3** - Banco de dados
- **Multer** - Upload de arquivos
- **date-fns** - Manipulação de datas
- **dotenv** - Variáveis de ambiente

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool
- **React Router** - Roteamento
- **Recharts** - Gráficos
- **date-fns** - Manipulação de datas

## 📦 Instalação

### 1. Clone o repositório

```bash
git clone <repository-url>
cd grow
```

### 2. Configure as variáveis de ambiente

#### Backend
```bash
cd backend
cp .env.example .env
# Edite o arquivo .env conforme necessário
```

#### Frontend
```bash
cd frontend
cp .env.example .env
# Edite o arquivo .env conforme necessário
```

### 3. Instale as dependências

```bash
# Usar o script de inicialização
chmod +x start.sh
./start.sh
```

Ou manualmente:

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

## 💻 Desenvolvimento

### Iniciar o sistema completo

```bash
./start.sh
```

### Iniciar serviços separadamente

#### Backend
```bash
cd backend
npm run dev
# Servidor rodando em http://localhost:3000
```

#### Frontend
```bash
cd frontend
npm run dev
# Aplicação rodando em http://localhost:5173
```

### Logs

Os logs são salvos em:
- Backend: `/tmp/grow-backend.log`
- Frontend: `/tmp/grow-frontend.log`

```bash
# Visualizar logs em tempo real
tail -f /tmp/grow-backend.log
tail -f /tmp/grow-frontend.log
```

## 📚 Boas Práticas

### Backend

#### 1. **Separação de Responsabilidades**
- **Entidades**: Lógica de negócio pura
- **Use Cases**: Orquestração de operações
- **Repositories**: Acesso a dados
- **Controllers**: Manipulação de requisições HTTP

#### 2. **Dependency Injection**
```typescript
// Use Case recebe dependências via construtor
export class CreatePlantUseCase {
  constructor(private plantRepository: IPlantRepository) {}
}
```

#### 3. **DTOs para transferência de dados**
```typescript
export interface CreatePlantDTO {
  name: string;
  genetic: string;
  // ...
}
```

#### 4. **Tratamento de erros padronizado**
```typescript
throw new ValidationError('Mensagem de erro');
throw new NotFoundError('Recurso');
```

#### 5. **Validações no Use Case**
```typescript
if (!data.name || data.name.trim().length === 0) {
  throw new ValidationError('Nome é obrigatório');
}
```

### Frontend

#### 1. **Hooks customizados para lógica reutilizável**
```typescript
const { data, loading, error, execute } = useAsync<Plant>();
```

#### 2. **Cliente HTTP centralizado**
```typescript
const plant = await httpClient.get<Plant>('/plants/1');
```

#### 3. **Configurações centralizadas**
```typescript
import { config } from '@/shared/config/environment';
```

#### 4. **Componentes pequenos e focados**
- Um componente = uma responsabilidade
- Props tipadas com TypeScript
- Evitar lógica complexa nos componentes

#### 5. **Nomenclatura clara**
```typescript
// ✅ Bom
function PlantCard({ plant }: PlantCardProps) {}

// ❌ Evitar
function Card1({ data }: any) {}
```

## 🔌 API

### Base URL
```
http://localhost:3000/api
```

### Endpoints Principais

#### Plantas
- `GET /plants` - Listar todas as plantas
- `GET /plants/:identifier` - Buscar planta por ID ou código
- `POST /plants` - Criar nova planta
- `PUT /plants/:id` - Atualizar planta
- `DELETE /plants/:id` - Deletar planta
- `PATCH /plants/:id/status` - Atualizar status da planta
- `POST /plants/:id/photo` - Upload de foto

#### Registros Diários
- `GET /records/plant/:plantId` - Listar registros de uma planta
- `GET /records/:id` - Buscar registro específico
- `POST /records` - Criar novo registro
- `PUT /records/:id` - Atualizar registro
- `DELETE /records/:id` - Deletar registro

#### Estatísticas
- `GET /statistics` - Obter estatísticas gerais

## 🔄 Fluxo de Dados

### Backend (Request → Response)
```
HTTP Request
    ↓
Controller (presentation)
    ↓
Use Case (application)
    ↓
Repository Interface (domain)
    ↓
Repository Implementation (infrastructure)
    ↓
Database
    ↓
Entity (domain)
    ↓
DTO (application)
    ↓
Controller Response
    ↓
HTTP Response
```

### Frontend (User Action → UI Update)
```
User Action
    ↓
Component Event Handler
    ↓
Custom Hook
    ↓
Use Case (application)
    ↓
Repository (infrastructure)
    ↓
HTTP Client
    ↓
API Call
    ↓
State Update
    ↓
UI Re-render
```

## 🎯 Benefícios da Arquitetura

### Para o Projeto Atual (Web)
- ✅ Código organizado e fácil de manter
- ✅ Testes mais simples
- ✅ Menos bugs
- ✅ Desenvolvimento mais rápido

### Para Expansão Mobile
- ✅ **Reutilização de código**: Camadas de domínio e aplicação podem ser compartilhadas
- ✅ **Apenas a UI muda**: React Native vs React Web
- ✅ **Mesmo backend**: API já preparada para múltiplos clientes
- ✅ **Consistência**: Mesmas regras de negócio em todas as plataformas

### Para a Equipe
- ✅ **Onboarding mais rápido**: Estrutura clara
- ✅ **Trabalho em paralelo**: Equipes podem trabalhar em camadas diferentes
- ✅ **Menos conflitos**: Separação clara de responsabilidades

## 📱 Preparação para Mobile

### O que já está pronto
- ✅ API RESTful compatível com qualquer cliente
- ✅ Autenticação stateless (pronto para tokens)
- ✅ Uploads otimizados
- ✅ Respostas JSON padronizadas

### Para adicionar React Native
1. Criar novo projeto: `npx react-native init GrowMobile`
2. Copiar camadas `domain` e `application` do frontend web
3. Reimplementar apenas a camada `presentation` com componentes React Native
4. Usar o mesmo `HttpClient` com pequenas adaptações
5. Pronto! ✨

## 🛠️ Scripts Úteis

```bash
# Iniciar sistema completo
./start.sh

# Parar todos os processos
pkill -f "vite|tsx.*server"

# Ver processos rodando
ps aux | grep -E "(vite|tsx)"

# Ver logs
tail -f /tmp/grow-*.log
```

## 📝 Convenções de Código

### Nomenclatura
- **PascalCase**: Classes, Interfaces, Types, Components
- **camelCase**: Funções, variáveis, métodos
- **UPPER_CASE**: Constantes, variáveis de ambiente

### Arquivos
- **PascalCase**: Componentes React, Classes (`PlantCard.tsx`, `CreatePlantUseCase.ts`)
- **camelCase**: Utilitários, hooks (`formatDate.ts`, `useAsync.ts`)
- **kebab-case**: Arquivos de configuração (`database-config.ts`)

### Imports
```typescript
// 1. Bibliotecas externas
import { useState } from 'react';
import express from 'express';

// 2. Domínio/Aplicação
import { PlantEntity } from '@/domain/entities/Plant';
import { CreatePlantUseCase } from '@/application/use-cases';

// 3. Infraestrutura
import { httpClient } from '@/infrastructure/http/HttpClient';

// 4. Apresentação
import { PlantCard } from '@/presentation/components';

// 5. Shared/Utils
import { formatDate } from '@/shared/utils';

// 6. Estilos
import './styles.css';
```

## 🤝 Contribuindo

1. Siga a estrutura de camadas
2. Mantenha responsabilidades separadas
3. Escreva código limpo e legível
4. Documente funções complexas
5. Use TypeScript corretamente

## 📄 Licença

Este projeto está sob a licença MIT.

## 👥 Equipe

Desenvolvido com ❤️ para gerenciamento eficiente de cultivo.

---

**Versão**: 1.0.0  
**Última atualização**: Dezembro 2025
