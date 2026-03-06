#!/bin/bash

# MED-Flow - Instalador Automático para Mac
echo "🚀 Iniciando instalação do MED-Flow..."

# Verifica se o Node.js está instalado
if ! command -v node &> /dev/null
then
    echo "❌ Erro: Node.js não encontrado."
    echo "Por favor, instale o Node.js em: https://nodejs.org/"
    exit
fi

echo "📦 Instalando dependências (isso pode levar um minuto)..."
npm install

echo "🗄️ Configurando banco de dados local..."
# O banco de dados é criado automaticamente pelo servidor ao iniciar

echo "✅ Instalação concluída com sucesso!"
echo "🌐 Abrindo o MED-Flow no seu navegador..."

# Inicia o servidor em segundo plano e abre o navegador
npm run dev &
sleep 5
open http://localhost:3000

echo "-------------------------------------------------------"
echo "O aplicativo está rodando!"
echo "Para fechar, volte aqui e pressione CTRL+C."
echo "-------------------------------------------------------"
