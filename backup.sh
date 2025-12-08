#!/bin/bash

echo "💾 Criando backup dos dados..."

# Criar diretório de backup com timestamp
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Copiar banco de dados
if [ -f "grow.db" ]; then
    cp grow.db "$BACKUP_DIR/"
    echo "✅ Banco de dados copiado"
else
    echo "⚠️  Banco de dados não encontrado"
fi

# Copiar uploads
if [ -d "uploads" ]; then
    cp -r uploads "$BACKUP_DIR/"
    echo "✅ Fotos copiadas"
else
    echo "⚠️  Pasta de uploads não encontrada"
fi

echo ""
echo "✅ Backup criado em: $BACKUP_DIR"
echo ""
echo "Para restaurar:"
echo "  cp $BACKUP_DIR/grow.db ."
echo "  cp -r $BACKUP_DIR/uploads ."
