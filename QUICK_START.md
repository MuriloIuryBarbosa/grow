# 🚀 Guia Rápido de Início

## Primeira vez usando o sistema?

### 1. Instalar dependências

```bash
cd backend
npm install
cd ../frontend
npm install
cd ..
```

### 2. Iniciar o sistema

**Opção 1: Script automático (recomendado)**
```bash
./start.sh
```

**Opção 2: Manual (dois terminais)**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### 3. Acessar

Abra o navegador em: **http://localhost:5173**

---

## Comandos Úteis

### 🧹 Reinstalar tudo do zero
```bash
./reinstall.sh
```

### 💾 Fazer backup dos dados
```bash
./backup.sh
```

### 🛑 Parar o sistema
Pressione `Ctrl+C` nos terminais

---

## Estrutura de Pastas

```
grow/
├── backend/          # API e banco de dados
├── frontend/         # Interface web
├── uploads/          # Fotos (criado automaticamente)
├── grow.db           # Banco de dados (criado automaticamente)
└── backups/          # Backups (criado ao executar backup.sh)
```

---

## Primeiros Passos após Instalação

1. **Cadastre sua primeira planta**
   - Clique em "+ Nova Planta"
   - Preencha nome e código (obrigatórios)
   - Adicione foto (opcional)

2. **Adicione registros diários**
   - Clique na planta
   - Clique em "+ Novo Registro"
   - Preencha os dados do dia

3. **Veja as análises**
   - Clique em "📊 Análises" no menu
   - Visualize estatísticas e alertas

---

## Portas Usadas

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

Se alguma porta estiver em uso, você verá um erro. Feche o processo que está usando a porta ou altere nas configurações.

---

## Precisa de Ajuda?

Consulte o **README.md** completo para:
- Detalhes de todas as funcionalidades
- Troubleshooting
- Documentação da API
- Faixas ideais de temperatura, umidade, etc.
