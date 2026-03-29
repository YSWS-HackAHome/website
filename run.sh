#!/bin/bash

# Exit on any error
set -e

skip_build=false
skip_dependencies=false

for arg in "$@"; do
  if [ "$arg" == "--skip-build" ]; then
    skip_build=true
  elif [ "$arg" == "--skip-dependencies" ]; then
    skip_dependencies=true
  fi
done

# Install dependencies
if [ "$skip_dependencies" == true ]; then
  echo "📦 Skipping Dependency Installation..."
else
  echo "📦 Installing Dependencies..."
  pip install -r requirements.txt
  cd web
  npm install
  cd ..
fi

if [ "$skip_build" == true ]; then
  echo "📦 Skipping Frontend Build..."
else
  echo "📦 Building Frontend..."
  cd web
  if [ -d "dist" ]; then
      rm -R dist
  fi
  npm run build
  cd ..
fi

echo "🔥 Launching Backend..."
python3 main.py