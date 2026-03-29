#!/bin/bash

# Script de inicialização rápida do PWA Câmera Remota
# Uso: bash start.sh

echo "🚀 Iniciando Câmera Remota PWA..."
echo ""

# Verificar se está no diretório correto
if [ ! -f "index.html" ]; then
  echo "❌ Erro: Execute este script dentro da pasta camera-remota-pwa"
  exit 1
fi

# Verificar se Python está instalado
if command -v python3 &> /dev/null; then
  PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
  PYTHON_CMD="python"
else
  echo "❌ Erro: Python não encontrado. Instale Python ou use Node.js"
  exit 1
fi

# Obter IP local
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
  # Linux ou macOS
  LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
else
  # Windows (Git Bash)
  LOCAL_IP=$(ipconfig | grep "IPv4" | awk '{print $NF}' | head -n 1)
fi

# Porta padrão
PORT=8080

echo "✅ Servidor será iniciado em:"
echo "   Local:    http://localhost:$PORT"
echo "   Rede:     http://$LOCAL_IP:$PORT"
echo ""
echo "📱 Para conectar o celular:"
echo "   1. Certifique-se de que está na mesma WiFi"
echo "   2. Abra no celular: http://$LOCAL_IP:$PORT"
echo ""
echo "⚠️  Para instalar como PWA, use HTTPS (GitHub Pages, Vercel, etc.)"
echo ""
echo "🛑 Pressione Ctrl+C para parar o servidor"
echo ""

# Iniciar servidor HTTP
$PYTHON_CMD -m http.server $PORT
