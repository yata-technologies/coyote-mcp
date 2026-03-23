#!/bin/bash
set -e
COYOTE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🐺 Coyote MCP Installer"

# Build
echo "→ Building..."
cd "$COYOTE_DIR/mcp" && npm install --silent && npm run build --silent

# ~/.coyote/config.json
mkdir -p ~/.coyote
if [ ! -f ~/.coyote/config.json ]; then
  echo '{ "auto_update": true }' > ~/.coyote/config.json
  echo "→ Created ~/.coyote/config.json (auto_update: true)"
fi

# Add coyote entry to ~/.claude/mcp.json
MCP_CONFIG=~/.claude/mcp.json
mkdir -p ~/.claude
if [ ! -f "$MCP_CONFIG" ]; then
  echo "{ \"mcpServers\": { \"coyote\": { \"command\": \"node\", \"args\": [\"$COYOTE_DIR/mcp/dist/index.js\"] } } }" > "$MCP_CONFIG"
else
  if ! grep -q '"coyote"' "$MCP_CONFIG"; then
    node -e "
      const fs = require('fs');
      const cfg = JSON.parse(fs.readFileSync('$MCP_CONFIG', 'utf8'));
      cfg.mcpServers = cfg.mcpServers || {};
      cfg.mcpServers.coyote = { command: 'node', args: ['$COYOTE_DIR/mcp/dist/index.js'] };
      fs.writeFileSync('$MCP_CONFIG', JSON.stringify(cfg, null, 2));
    "
  fi
fi
echo "→ Updated ~/.claude/mcp.json"

echo ""
echo "✅ Installation complete. Starting authentication..."
echo ""
node "$COYOTE_DIR/mcp/dist/index.js" login
echo ""
echo "Please restart Claude Code to activate the Coyote MCP server."
