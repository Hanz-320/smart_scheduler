#!/usr/bin/env bash
# exit on error
set -o errexit

# Frontend build
cd frontend
npm install
npm run build
cd ..

# Backend build
cd backend
pip install -r requirements.txt
cd ..
