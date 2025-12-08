# 📘 Exemplos Práticos - Clean Architecture

## Índice
- [Backend: Criar Nova Funcionalidade](#backend-criar-nova-funcionalidade)
- [Frontend: Criar Nova Tela](#frontend-criar-nova-tela)
- [Compartilhamento para Mobile](#compartilhamento-para-mobile)
- [Boas Práticas](#boas-práticas)

---

## Backend: Criar Nova Funcionalidade

### Exemplo: Sistema de Notas/Anotações para Plantas

#### 1. Criar Entidade (`domain/entities/Note.ts`)

```typescript
export interface Note {
  id?: number;
  plant_id: number;
  title: string;
  content: string;
  category: 'observacao' | 'problema' | 'solucao' | 'lembrete';
  created_at?: string;
  updated_at?: string;
}

export class NoteEntity implements Note {
  id?: number;
  plant_id: number;
  title: string;
  content: string;
  category: 'observacao' | 'problema' | 'solucao' | 'lembrete';
  created_at?: string;
  updated_at?: string;

  constructor(data: Note) {
    Object.assign(this, data);
  }

  isImportant(): boolean {
    return this.category === 'problema';
  }

  getPreview(length: number = 50): string {
    return this.content.substring(0, length) + 
      (this.content.length > length ? '...' : '');
  }
}
```

#### 2. Criar Interface do Repository (`domain/repositories/INoteRepository.ts`)

```typescript
import { Note } from '../entities/Note';

export interface INoteRepository {
  create(note: Note): Promise<Note>;
  findById(id: number): Promise<Note | null>;
  findByPlantId(plantId: number): Promise<Note[]>;
  update(id: number, data: Partial<Note>): Promise<Note>;
  delete(id: number): Promise<void>;
  findByCategory(category: string): Promise<Note[]>;
}
```

#### 3. Criar DTOs (`application/dtos/NoteDTO.ts`)

```typescript
export interface CreateNoteDTO {
  plant_id: number;
  title: string;
  content: string;
  category: 'observacao' | 'problema' | 'solucao' | 'lembrete';
}

export interface UpdateNoteDTO {
  title?: string;
  content?: string;
  category?: 'observacao' | 'problema' | 'solucao' | 'lembrete';
}

export interface NoteResponseDTO {
  id: number;
  plant_id: number;
  title: string;
  content: string;
  category: string;
  preview: string;
  created_at: string;
  updated_at: string;
}
```

#### 4. Criar Use Cases (`application/use-cases/`)

```typescript
// CreateNoteUseCase.ts
import { INoteRepository } from '../../domain/repositories/INoteRepository';
import { CreateNoteDTO, NoteResponseDTO } from '../dtos/NoteDTO';
import { NoteEntity } from '../../domain/entities/Note';
import { ValidationError } from '../../shared/errors/AppError';

export class CreateNoteUseCase {
  constructor(private noteRepository: INoteRepository) {}

  async execute(data: CreateNoteDTO): Promise<NoteResponseDTO> {
    // Validações
    if (!data.title?.trim()) {
      throw new ValidationError('Título é obrigatório');
    }

    if (!data.content?.trim()) {
      throw new ValidationError('Conteúdo é obrigatório');
    }

    if (!data.plant_id) {
      throw new ValidationError('ID da planta é obrigatório');
    }

    // Criar entidade
    const note = new NoteEntity(data);

    // Salvar
    const created = await this.noteRepository.create(note);

    // Retornar DTO
    return this.mapToResponse(created);
  }

  private mapToResponse(note: Note): NoteResponseDTO {
    const entity = new NoteEntity(note);
    return {
      ...note,
      preview: entity.getPreview(),
      id: note.id!,
      created_at: note.created_at!,
      updated_at: note.updated_at!,
    };
  }
}

// GetPlantNotesUseCase.ts
export class GetPlantNotesUseCase {
  constructor(private noteRepository: INoteRepository) {}

  async execute(plantId: number): Promise<NoteResponseDTO[]> {
    const notes = await this.noteRepository.findByPlantId(plantId);
    return notes.map(n => this.mapToResponse(n));
  }

  private mapToResponse(note: Note): NoteResponseDTO {
    const entity = new NoteEntity(note);
    return {
      ...note,
      preview: entity.getPreview(),
      id: note.id!,
      created_at: note.created_at!,
      updated_at: note.updated_at!,
    };
  }
}
```

#### 5. Implementar Repository (`infrastructure/repositories/NoteRepository.ts`)

```typescript
import Database from 'better-sqlite3';
import { INoteRepository } from '../../domain/repositories/INoteRepository';
import { Note } from '../../domain/entities/Note';
import { DatabaseError, NotFoundError } from '../../shared/errors/AppError';

export class NoteRepository implements INoteRepository {
  constructor(private db: Database.Database) {}

  async create(note: Note): Promise<Note> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO notes (plant_id, title, content, category)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(
        note.plant_id,
        note.title,
        note.content,
        note.category
      );

      return this.findById(result.lastInsertRowid as number);
    } catch (error) {
      throw new DatabaseError('Erro ao criar nota');
    }
  }

  async findById(id: number): Promise<Note | null> {
    const stmt = this.db.prepare('SELECT * FROM notes WHERE id = ?');
    const note = stmt.get(id) as Note | undefined;
    return note || null;
  }

  async findByPlantId(plantId: number): Promise<Note[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM notes 
      WHERE plant_id = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(plantId) as Note[];
  }

  async update(id: number, data: Partial<Note>): Promise<Note> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new NotFoundError('Nota');
      return existing;
    }

    values.push(id);
    
    const stmt = this.db.prepare(`
      UPDATE notes 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    stmt.run(...values);
    
    const updated = await this.findById(id);
    if (!updated) throw new NotFoundError('Nota');
    return updated;
  }

  async delete(id: number): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM notes WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      throw new NotFoundError('Nota');
    }
  }

  async findByCategory(category: string): Promise<Note[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM notes 
      WHERE category = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(category) as Note[];
  }
}
```

#### 6. Criar Controller (`presentation/controllers/NoteController.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';
import { CreateNoteUseCase } from '../../application/use-cases/CreateNoteUseCase';
import { GetPlantNotesUseCase } from '../../application/use-cases/GetPlantNotesUseCase';
import { UpdateNoteUseCase } from '../../application/use-cases/UpdateNoteUseCase';
import { DeleteNoteUseCase } from '../../application/use-cases/DeleteNoteUseCase';

export class NoteController {
  constructor(
    private createNoteUseCase: CreateNoteUseCase,
    private getPlantNotesUseCase: GetPlantNotesUseCase,
    private updateNoteUseCase: UpdateNoteUseCase,
    private deleteNoteUseCase: DeleteNoteUseCase
  ) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const note = await this.createNoteUseCase.execute(req.body);
      res.status(201).json(note);
    } catch (error) {
      next(error);
    }
  };

  getByPlant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plantId = parseInt(req.params.plantId);
      const notes = await this.getPlantNotesUseCase.execute(plantId);
      res.json(notes);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const note = await this.updateNoteUseCase.execute(id, req.body);
      res.json(note);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await this.deleteNoteUseCase.execute(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
```

#### 7. Adicionar Rotas (`presentation/routes.ts`)

```typescript
// Dependency Injection
const noteRepository = new NoteRepository(db);
const createNoteUseCase = new CreateNoteUseCase(noteRepository);
const getPlantNotesUseCase = new GetPlantNotesUseCase(noteRepository);
const updateNoteUseCase = new UpdateNoteUseCase(noteRepository);
const deleteNoteUseCase = new DeleteNoteUseCase(noteRepository);

const noteController = new NoteController(
  createNoteUseCase,
  getPlantNotesUseCase,
  updateNoteUseCase,
  deleteNoteUseCase
);

// Rotas
router.post('/notes', noteController.create);
router.get('/notes/plant/:plantId', noteController.getByPlant);
router.put('/notes/:id', noteController.update);
router.delete('/notes/:id', noteController.delete);
```

---

## Frontend: Criar Nova Tela

### Exemplo: Tela de Notas da Planta

#### 1. Criar Repository (`infrastructure/repositories/NoteRepository.ts`)

```typescript
import { httpClient } from '../http/HttpClient';

export interface Note {
  id: number;
  plant_id: number;
  title: string;
  content: string;
  category: string;
  preview: string;
  created_at: string;
}

export class NoteRepository {
  async getByPlant(plantId: number): Promise<Note[]> {
    return httpClient.get<Note[]>(`/notes/plant/${plantId}`);
  }

  async create(data: {
    plant_id: number;
    title: string;
    content: string;
    category: string;
  }): Promise<Note> {
    return httpClient.post<Note>('/notes', data);
  }

  async update(id: number, data: Partial<Note>): Promise<Note> {
    return httpClient.put<Note>(`/notes/${id}`, data);
  }

  async delete(id: number): Promise<void> {
    return httpClient.delete(`/notes/${id}`);
  }
}

export const noteRepository = new NoteRepository();
```

#### 2. Criar Hook (`presentation/hooks/useNotes.ts`)

```typescript
import { useState, useCallback } from 'react';
import { noteRepository, Note } from '../../infrastructure/repositories/NoteRepository';

export function useNotes(plantId: number) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await noteRepository.getByPlant(plantId);
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  const createNote = useCallback(async (data: {
    title: string;
    content: string;
    category: string;
  }) => {
    try {
      setLoading(true);
      const note = await noteRepository.create({ ...data, plant_id: plantId });
      setNotes(prev => [note, ...prev]);
      return note;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar nota');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  const deleteNote = useCallback(async (id: number) => {
    try {
      setLoading(true);
      await noteRepository.delete(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar nota');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    notes,
    loading,
    error,
    loadNotes,
    createNote,
    deleteNote,
  };
}
```

#### 3. Criar Componente (`presentation/components/NoteCard.tsx`)

```typescript
import { Note } from '../../infrastructure/repositories/NoteRepository';
import './NoteCard.css';

interface NoteCardProps {
  note: Note;
  onDelete: (id: number) => void;
}

export function NoteCard({ note, onDelete }: NoteCardProps) {
  const categoryIcons = {
    observacao: '📝',
    problema: '⚠️',
    solucao: '✅',
    lembrete: '⏰',
  };

  return (
    <div className={`note-card note-card--${note.category}`}>
      <div className="note-card__header">
        <span className="note-card__icon">
          {categoryIcons[note.category as keyof typeof categoryIcons]}
        </span>
        <h3 className="note-card__title">{note.title}</h3>
        <button 
          onClick={() => onDelete(note.id)}
          className="note-card__delete"
        >
          🗑️
        </button>
      </div>
      
      <p className="note-card__content">{note.content}</p>
      
      <div className="note-card__footer">
        <span className="note-card__date">
          {new Date(note.created_at).toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  );
}
```

#### 4. Criar Página (`presentation/pages/PlantNotes.tsx`)

```typescript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNotes } from '../hooks/useNotes';
import { NoteCard } from '../components/NoteCard';

export function PlantNotes() {
  const { plantId } = useParams<{ plantId: string }>();
  const { notes, loading, loadNotes, createNote, deleteNote } = useNotes(
    parseInt(plantId!)
  );

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'observacao',
  });

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createNote(formData);
      setFormData({ title: '', content: '', category: 'observacao' });
      setShowForm(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente deletar esta nota?')) {
      await deleteNote(id);
    }
  };

  if (loading && notes.length === 0) {
    return <div className="loading">Carregando notas...</div>;
  }

  return (
    <div className="plant-notes">
      <div className="page-header">
        <h1>📝 Notas da Planta</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancelar' : '+ Nova Nota'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="note-form card">
          <div className="form-group">
            <label>Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Categoria</label>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="observacao">📝 Observação</option>
              <option value="problema">⚠️ Problema</option>
              <option value="solucao">✅ Solução</option>
              <option value="lembrete">⏰ Lembrete</option>
            </select>
          </div>

          <div className="form-group">
            <label>Conteúdo</label>
            <textarea
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              rows={5}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Salvar Nota
          </button>
        </form>
      )}

      <div className="notes-grid">
        {notes.map(note => (
          <NoteCard key={note.id} note={note} onDelete={handleDelete} />
        ))}
      </div>

      {notes.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-text">Nenhuma nota ainda</div>
        </div>
      )}
    </div>
  );
}
```

---

## Compartilhamento para Mobile

### O que pode ser compartilhado?

```
✅ 100% Compartilhável:
├── domain/entities/          # Todas as entidades
├── domain/repositories/      # Todas as interfaces
└── application/dtos/         # Todos os DTOs

🔄 Adaptável (90% compartilhável):
├── application/use-cases/    # Lógica de negócio pura
└── infrastructure/repositories/  # Trocar httpClient

🆕 Reescrever:
└── presentation/             # UI específica (React Native)
```

### Exemplo: Adaptar para React Native

```typescript
// ✅ Mesmo código (domain/entities/Note.ts)
export class NoteEntity {
  // ... mesmo código do web
}

// ✅ Mesmo código (application/use-cases/CreateNoteUseCase.ts)
export class CreateNoteUseCase {
  // ... mesmo código do web
}

// 🔄 Adaptar (infrastructure/http/HttpClient.ts)
// Web usa fetch, Mobile pode usar axios
import axios from 'axios';

export class HttpClient {
  async get<T>(endpoint: string): Promise<T> {
    const response = await axios.get(`${this.baseUrl}${endpoint}`);
    return response.data;
  }
}

// 🆕 Reescrever (presentation/components/NoteCard.tsx)
// React Native usa View, Text, TouchableOpacity
import { View, Text, TouchableOpacity } from 'react-native';

export function NoteCard({ note, onDelete }: NoteCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{note.title}</Text>
      <Text>{note.content}</Text>
      <TouchableOpacity onPress={() => onDelete(note.id)}>
        <Text>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Boas Práticas

### ✅ FAZER

```typescript
// ✅ Use nomes descritivos
class CreatePlantUseCase { }  // Bom
class PlantCreator { }         // Menos claro

// ✅ Injete dependências
constructor(private repo: IRepository) { }

// ✅ Valide no Use Case
if (!data.name) throw new ValidationError('...');

// ✅ Use DTOs para comunicação externa
return this.mapToDTO(entity);

// ✅ Mantenha entidades com lógica de negócio
class PlantEntity {
  isActive(): boolean { }
  getDaysInPhase(): number { }
}

// ✅ Separe responsabilidades
// Controller → Use Case → Repository → Database
```

### ❌ EVITAR

```typescript
// ❌ Não coloque SQL no Controller
router.get('/plants', (req, res) => {
  const plants = db.query('SELECT * FROM plants'); // ERRADO
});

// ❌ Não acesse banco direto no Use Case
class CreatePlantUseCase {
  execute(data) {
    db.insert('INSERT INTO...'); // ERRADO
  }
}

// ❌ Não coloque lógica de negócio no Controller
controller.create(req, res) {
  if (req.body.days > 30) { // ERRADO - vai para Use Case
    // ...
  }
}

// ❌ Não retorne entidades diretamente
return plant; // ERRADO - use DTO
```

---

## 📝 Resumo

### Para criar nova funcionalidade:

1. **Entidade** (domain/entities/)
2. **Interface Repository** (domain/repositories/)
3. **DTOs** (application/dtos/)
4. **Use Cases** (application/use-cases/)
5. **Repository Implementation** (infrastructure/repositories/)
6. **Controller** (presentation/controllers/)
7. **Rotas** (presentation/routes.ts)

### No Frontend:

1. **Repository** (infrastructure/repositories/)
2. **Hook** (presentation/hooks/)
3. **Componentes** (presentation/components/)
4. **Página** (presentation/pages/)

### Para Mobile:

1. **Copiar** domain/ e application/
2. **Adaptar** infrastructure/
3. **Reescrever** presentation/ com React Native

---

✨ **Dica Final**: Comece simples, cresça gradualmente. Não precisa criar todas as camadas de uma vez. Vá adicionando conforme a necessidade!
