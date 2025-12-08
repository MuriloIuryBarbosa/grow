# 📐 Diagrama da Arquitetura

## Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        USER / CLIENT                         │
│                    (Web Browser / Mobile App)                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP/HTTPS
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │ React Web  │  │ React      │  │  Controllers &       │  │
│  │ Components │  │ Native     │  │  Express Routes      │  │
│  │            │  │ Components │  │                      │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
│         │               │                    │               │
└─────────┼───────────────┼────────────────────┼──────────────┘
          │               │                    │
          │               │                    │
┌─────────▼───────────────▼────────────────────▼──────────────┐
│                   APPLICATION LAYER                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              USE CASES (Business Logic)             │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │    │
│  │  │CreatePlant   │ │GetPlant      │ │UpdatePlant │  │    │
│  │  │UseCase       │ │UseCase       │ │UseCase     │  │    │
│  │  └──────────────┘ └──────────────┘ └────────────┘  │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │    │
│  │  │CreateRecord  │ │GetRecords    │ │Statistics  │  │    │
│  │  │UseCase       │ │UseCase       │ │UseCase     │  │    │
│  │  └──────────────┘ └──────────────┘ └────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                     DTOs                            │    │
│  │  (Data Transfer Objects - Input/Output Validation) │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ Interface Contracts
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                      DOMAIN LAYER                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               ENTITIES (Core Business)              │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │    │
│  │  │PlantEntity   │ │DailyRecord   │ │PhaseHistory│  │    │
│  │  │              │ │Entity        │ │Entity      │  │    │
│  │  │- isActive()  │ │- hasPhoto()  │ │- duration()│  │    │
│  │  │- getDays()   │ │- isComplete()│ │            │  │    │
│  │  └──────────────┘ └──────────────┘ └────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          REPOSITORY INTERFACES (Contracts)          │    │
│  │  ┌──────────────────┐  ┌────────────────────────┐  │    │
│  │  │IPlantRepository  │  │IDailyRecordRepository  │  │    │
│  │  │- create()        │  │- create()              │  │    │
│  │  │- findById()      │  │- findByPlantId()       │  │    │
│  │  │- update()        │  │- update()              │  │    │
│  │  └──────────────────┘  └────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ Implementation
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        REPOSITORY IMPLEMENTATIONS                   │    │
│  │  ┌──────────────────┐  ┌────────────────────────┐  │    │
│  │  │PlantRepository   │  │DailyRecordRepository   │  │    │
│  │  │(SQLite)          │  │(SQLite)                │  │    │
│  │  └──────────────────┘  └────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              HTTP CLIENT (Frontend)                 │    │
│  │        Database Connection (Backend)                │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    EXTERNAL SERVICES                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   SQLite     │  │  File System │  │  RESTful API    │   │
│  │   Database   │  │  (Uploads)   │  │  (Backend)      │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Fluxo de Dados: Criar Planta

```
1. USER                    →  Preenche formulário "Nova Planta"
                              ↓
2. PRESENTATION           →  PlantForm component captura dados
                              ↓
3. HOOK                   →  usePlants() hook processa
                              ↓
4. REPOSITORY             →  PlantRepository.create()
   (Infrastructure)           ↓
5. HTTP CLIENT            →  POST /api/plants
                              ↓
6. BACKEND: CONTROLLER    →  PlantController.create()
                              ↓
7. USE CASE               →  CreatePlantUseCase.execute()
   (Application)              - Valida dados
                              - Cria PlantEntity
                              ↓
8. REPOSITORY             →  IPlantRepository.create()
   (Domain Interface)         ↓
9. REPOSITORY IMPL        →  PlantRepository.create()
   (Infrastructure)           - Executa SQL
                              ↓
10. DATABASE              →  SQLite salva dados
                              ↓
11. RESPONSE              ←  Retorna PlantResponseDTO
                              ↓
12. USER                  ←  Vê planta criada na tela
```

## Camadas e Suas Responsabilidades

```
┌────────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER                                             │
│ ────────────────────────────────────────────────────────────── │
│ Responsabilidades:                                             │
│ • Capturar input do usuário                                    │
│ • Exibir dados na UI                                           │
│ • Roteamento e navegação                                       │
│ • Gerenciar estado da UI                                       │
│                                                                 │
│ Tecnologias:                                                   │
│ • React / React Native                                         │
│ • Express Controllers                                          │
│ • Hooks customizados                                           │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ APPLICATION LAYER                                              │
│ ────────────────────────────────────────────────────────────── │
│ Responsabilidades:                                             │
│ • Orquestrar fluxo de dados                                    │
│ • Implementar regras de negócio                                │
│ • Validar dados                                                │
│ • Transformar dados (DTOs)                                     │
│                                                                 │
│ Tecnologias:                                                   │
│ • TypeScript classes                                           │
│ • Validation libraries                                         │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ DOMAIN LAYER                                                   │
│ ────────────────────────────────────────────────────────────── │
│ Responsabilidades:                                             │
│ • Definir entidades core                                       │
│ • Regras de negócio puras                                      │
│ • Definir contratos (interfaces)                               │
│ • Lógica independente de framework                             │
│                                                                 │
│ Características:                                               │
│ • Sem dependências externas                                    │
│ • 100% testável                                                │
│ • 100% reutilizável                                            │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE LAYER                                           │
│ ────────────────────────────────────────────────────────────── │
│ Responsabilidades:                                             │
│ • Implementar acesso a dados                                   │
│ • Comunicação com APIs                                         │
│ • Gerenciar conexões externas                                  │
│ • File system operations                                       │
│                                                                 │
│ Tecnologias:                                                   │
│ • SQLite / PostgreSQL                                          │
│ • HTTP Clients (fetch, axios)                                  │
│ • File upload libraries                                        │
└────────────────────────────────────────────────────────────────┘
```

## Dependências entre Camadas

```
                    ┌──────────────┐
                    │ Presentation │
                    └───────┬──────┘
                            │ depende de
                            ↓
                    ┌──────────────┐
                    │ Application  │
                    └───────┬──────┘
                            │ depende de
                            ↓
                    ┌──────────────┐
                    │   Domain     │ ← Centro (não depende de nada)
                    └───────▲──────┘
                            │ implementa
                            │
                    ┌───────┴──────┐
                    │Infrastructure│
                    └──────────────┘

REGRA: As setas apontam para dentro!
Domain não conhece ninguém
Infrastructure conhece Domain
Application conhece Domain
Presentation conhece Application e Domain
```

## Benefícios da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│ TESTABILIDADE                                               │
│ • Cada camada pode ser testada isoladamente                │
│ • Mock de dependências é simples                           │
│ • Domain layer 100% testável sem mocks                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MANUTENIBILIDADE                                            │
│ • Mudanças localizadas em uma camada                       │
│ • Código organizado e fácil de encontrar                   │
│ • Onboarding de novos devs mais rápido                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ESCALABILIDADE                                              │
│ • Adicionar features não quebra código existente           │
│ • Múltiplos devs podem trabalhar em paralelo               │
│ • Fácil adicionar novas plataformas (mobile, desktop)      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FLEXIBILIDADE                                               │
│ • Trocar banco de dados: só mudar Infrastructure           │
│ • Trocar framework: só mudar Presentation                  │
│ • Regras de negócio protegidas no Domain                   │
└─────────────────────────────────────────────────────────────┘
```

## Multiplataforma: Compartilhamento de Código

```
┌──────────────────────────────────────────────────────────────┐
│                         WEB APP                              │
│  ┌────────────┐   ┌─────────────┐   ┌──────────────────┐   │
│  │   React    │   │  Application│   │     Domain       │   │
│  │ Components │ → │  Use Cases  │ → │    Entities      │   │
│  └────────────┘   └─────────────┘   └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                       MOBILE APP                             │
│  ┌────────────┐   ┌─────────────┐   ┌──────────────────┐   │
│  │   React    │   │  Application│   │     Domain       │   │
│  │   Native   │ → │  Use Cases  │ → │    Entities      │   │
│  └────────────┘   └─────────────┘   └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘

        🆕 Novo             ✅ Reutilizado        ✅ Reutilizado
     (React Native)       (Mesmos Use Cases)   (Mesmas Entidades)

ESTIMATIVA: ~70% do código pode ser compartilhado entre web e mobile
```

---

## Resumo Visual

```
🎨 PRESENTATION  →  O que o usuário vê
📋 APPLICATION   →  O que o sistema faz
🧠 DOMAIN        →  O que o negócio é
🔧 INFRASTRUCTURE →  Como funciona por baixo
```

**Lembre-se**: Domain é o coração. Tudo depende dele, mas ele não depende de nada!
