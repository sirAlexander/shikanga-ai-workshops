#!/bin/bash
# Minimal sanity checks for Bug Busters backend
# Run: sh tests/test.sh

set -e
echo "Testing /health..."
curl -sf http://localhost:3000/health | grep 'OK'
echo "Testing /scores (empty)..."
curl -sf http://localhost:3000/scores | grep '\[.*\]'
echo "Testing submit score..."
curl -sf -X POST http://localhost:3000/scores -H "Content-Type: application/json" \
  -d '{"name":"TestUser","score":7}' | grep 'TestUser'
echo "Testing /scores (not empty)..."
curl -sf http://localhost:3000/scores | grep 'TestUser'
echo "All API tests passed."
