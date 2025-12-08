# 🚀 Guia de Migração para Clean Architecture

## Resumo das Mudanças

O projeto foi refatorado seguindo **Clean Architecture** para garantir:
- ✅ **Escalabilidade**
- ✅ **Multiplataforma** (preparado para mobile)
- ✅ **Manutenibilidade**
- ✅ **Testabilidade**
- ✅ **Separação de responsabilidades**

## 📁 Nova Estrutura

### Backend

```
backend/src/
├── domain/               # Camada de Domínio (regras de negócio puras)
│   ├── entities/        # PlantEntity, DailyRecordEntity
│   └── repositories/    # IPlantRepository, IDailyRecordRepository
│
├── application/         # Camada de Aplicação (casos de uso)
│   ├── use-cases/      # CreatePlantUseCase, GetPlantUseCase, etc.
│   └── dtos/           # PlantDTO, DailyRecordDTO
│
├── infrastructure/      # Camada de Infraestrutura (implementações)
│   ├── database/       # Configuração SQLite
│   └── repositories/   # PlantRepository, DailyRecordRepository
│
├── presentation/        # Camada de Apresentação (HTTP)
│   ├── controllers/    # PlantController, RecordController
│   └── middlewares/    # Error handler, etc.
│
└── shared/             # Código compartilhado
    ├── config.ts       # Variáveis de ambiente
    ├── errors/         # AppError, ValidationError, etc.
    └── utils/          # Utilitários gerais
```

### Frontend

```
frontend/src/
├── domain/              # Camada de Domínio
│   ├── entities/       # Mesmas entidades do backend
│   └── repositories/   # Interfaces dos repositórios
│
├── application/         # Camada de Aplicação
│   └── use-cases/      # Casos de uso (opcional no frontend)
│
├── infrastructure/      # Camada de Infraestrutura
│   ├── http/           # HttpClient
│   └── repositories/   # PlantRepository, RecordRepository
│
├── presentation/        # Camada de Apresentação
│   ├── components/     # Componentes React
│   ├── pages/          # Páginas
│   └── hooks/          # useAsync, usePlants, etc.
│
└── shared/             # Código compartilhado
    ├── config/         # environment.ts
    └── utils/          # Utilitários gerais
```

## 🔄 Como a Arquitetura Funciona

### Fluxo Backend (Exemplo: Criar Planta)

```typescript
// 1. REQUEST chega no Controller (presentation)
// presentation/controllers/PlantController.ts
export class PlantController {
  constructor(private createPlantUseCase: CreatePlantUseCase) {}
  
  async create(req: Request, res: Response) {
    const dto: CreatePlantDTO = req.body;
    const plant = await this.createPlantUseCase.execute(dto);
    res.json(plant);
  }
}

// 2. Controller chama Use Case (application)
// application/use-cases/CreatePlantUseCase.ts
export class CreatePlantUseCase {
  constructor(private plantRepository: IPlantRepository) {}
  
  async execute(data: CreatePlantDTO): Promise<PlantResponseDTO> {
    // Validações
    if (!data.name) throw new ValidationError('Nome obrigatório');
    
    // Cria entidade
    const plant = new PlantEntity({ ...data, status: 'ativa' });
    
    // Salva via repository
    const saved = await this.plantRepository.create(plant);
    
    return this.mapToResponse(saved);
  }
}

// 3. Use Case usa Repository Interface (domain)
// domain/repositories/IPlantRepository.ts
export interface IPlantRepository {
  create(plant: Plant): Promise<Plant>;
  findById(id: number): Promise<Plant | null>;
  // ...
}

// 4. Repository Implementation acessa banco (infrastructure)
// infrastructure/repositories/PlantRepository.ts
export class PlantRepository implements IPlantRepository {
  async create(plant: Plant): Promise<Plant> {
    // SQL direto no banco
    const stmt = db.prepare('INSERT INTO plants ...');
    return stmt.run(...);
  }
}
```

### Fluxo Frontend (Exemplo: Buscar Plantas)

```typescript
// 1. Componente usa Hook customizado
// presentation/pages/Home.tsx
function Home() {
  const { plants, loading, loadPlants } = usePlants();
  
  useEffect(() => {
    loadPlants();
  }, []);
  
  return <div>{plants.map(p => <PlantCard plant={p} />)}</div>;
}

// 2. Hook usa Repository
// presentation/hooks/usePlants.ts
export function usePlants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  
  const loadPlants = async () => {
    const data = await plantRepository.findAll();
    setPlants(data);
  };
  
  return { plants, loadPlants };
}

// 3. Repository usa HttpClient
// infrastructure/repositories/PlantRepository.ts
export class PlantRepository {
  async findAll(): Promise<Plant[]> {
    return httpClient.get<Plant[]>('/plants');
  }
}

// 4. HttpClient faz requisição
// infrastructure/http/HttpClient.ts
export class HttpClient {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    return response.json();
  }
}
```

## 🎯 Benefícios Práticos

### 1. **Testabilidade**
```typescript
// Fácil de testar: apenas mock do repository
describe('CreatePlantUseCase', () => {
  it('deve criar uma planta', async () => {
    const mockRepo = { create: jest.fn() };
    const useCase = new CreatePlantUseCase(mockRepo);
    
    await useCase.execute({ name: 'Test' });
    
    expect(mockRepo.create).toHaveBeenCalled();
  });
});
```

### 2. **Reutilização para Mobile**
```typescript
// ✅ Reutilizar: domain/, application/
// 🔄 Adaptar: infrastructure/http (axios/fetch)
// 🆕 Reescrever: presentation/ (React Native components)
```

### 3. **Manutenibilidade**
```typescript
// Mudança no banco de dados?
// ➡️ Só alterar infrastructure/repositories/

// Nova regra de negócio?
// ➡️ Só alterar domain/entities/ ou application/use-cases/

// Mudar de Express para Fastify?
// ➡️ Só alterar presentation/controllers/
```

### 4. **Trabalho em Equipe**
```
👥 Dev A: Trabalha em use-cases
👥 Dev B: Trabalha em UI components
👥 Dev C: Trabalha em repositories
➡️ Menos conflitos, mais produtividade
```

## 🔧 Como Usar

### Backend

#### Criar novo endpoint

1. **Criar DTO** (`application/dtos/`)
```typescript
export interface CreateSomethingDTO {
  name: string;
  value: number;
}
```

2. **Criar Use Case** (`application/use-cases/`)
```typescript
export class CreateSomethingUseCase {
  constructor(private repo: ISomethingRepository) {}
  
  async execute(data: CreateSomethingDTO) {
    // Validações
    // Lógica de negócio
    // Chamar repository
  }
}
```

3. **Criar Controller** (`presentation/controllers/`)
```typescript
export class SomethingController {
  async create(req: Request, res: Response) {
    const result = await this.useCase.execute(req.body);
    res.json(result);
  }
}
```

4. **Adicionar rota** (`presentation/routes.ts`)
```typescript
router.post('/something', controller.create);
```

### Frontend

#### Criar novo hook para funcionalidade

1. **Criar Repository** (`infrastructure/repositories/`)
```typescript
export class SomethingRepository {
  async findAll() {
    return httpClient.get('/something');
  }
}
```

2. **Criar Hook** (`presentation/hooks/`)
```typescript
export function useSomething() {
  const [data, setData] = useState([]);
  
  const load = async () => {
    const result = await repository.findAll();
    setData(result);
  };
  
  return { data, load };
}
```

3. **Usar no Componente**
```typescript
function MyComponent() {
  const { data, load } = useSomething();
  
  useEffect(() => { load(); }, []);
  
  return <div>{data.map(...)}</div>;
}
```

## ⚙️ Variáveis de Ambiente

### Backend (`.env`)
```bash
PORT=3000
NODE_ENV=development
DATABASE_PATH=./database.sqlite
UPLOADS_DIR=../uploads
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`.env`)
```bash
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Sistema de Gerenciamento de Cultivo
VITE_APP_VERSION=1.0.0
```

## 📋 Checklist de Migração

### Backend
- [x] Criar estrutura de pastas (domain, application, infrastructure, presentation)
- [x] Mover entidades para `domain/entities/`
- [x] Criar interfaces de repositórios em `domain/repositories/`
- [x] Criar DTOs em `application/dtos/`
- [x] Criar Use Cases em `application/use-cases/`
- [x] Implementar repositórios em `infrastructure/repositories/`
- [x] Criar controllers em `presentation/controllers/`
- [x] Configurar variáveis de ambiente
- [x] Adicionar tratamento de erros padronizado

### Frontend
- [x] Criar estrutura de pastas
- [x] Copiar entidades do backend
- [x] Criar HttpClient em `infrastructure/http/`
- [x] Criar repositories em `infrastructure/repositories/`
- [x] Criar hooks customizados em `presentation/hooks/`
- [x] Reorganizar componentes em `presentation/components/`
- [x] Configurar variáveis de ambiente
- [x] Migrar chamadas API para repositories

## 🚀 Próximos Passos

1. **Migrar código antigo** gradualmente para nova estrutura
2. **Adicionar testes** para use cases e repositories
3. **Documentar** cada use case importante
4. **Preparar** para React Native:
   - Extrair lógica de negócio para hooks
   - Garantir que repositories sejam independentes da UI
   - Documentar API contracts

## 📚 Recursos

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Dependency Injection](https://en.wikipedia.org/wiki/Dependency_injection)

## ❓ FAQ

**P: Por que tantas camadas?**  
R: Cada camada tem uma responsabilidade. Isso facilita manutenção, testes e reutilização.

**P: Não fica muito complexo?**  
R: No início pode parecer, mas para projetos que crescem, é essencial.

**P: Preciso refatorar tudo de uma vez?**  
R: Não! Migre gradualmente, começando por funcionalidades novas.

**P: Como isso ajuda no mobile?**  
R: Camadas de domain e application são 100% reutilizáveis. Só muda a UI.

**P: E se eu mudar de banco de dados?**  
R: Só precisa alterar `infrastructure/repositories`. O resto continua igual.

---

**Dúvidas?** Consulte `ARCHITECTURE.md` para documentação completa.
