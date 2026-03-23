# ai-coding-dojo-mcp-poc-fx

A custom **Model Context Protocol (MCP) server** that provides real-time exchange rates from three Czech banks: **CSAS** (Česká spořitelna), **KB** (Komerční banka), and **RB** (Raiffeisenbank).

## Features

- 📊 Fetch exchange rates from all three major Czech banks simultaneously
- 🏆 Find the **best buy or sell rate** for any currency across all banks
- 🔄 Compare rates side-by-side for any currency
- ⚡ Parallel fetching for low latency
- 🔌 Works as an MCP server (stdio transport) — plug it into any MCP-compatible AI assistant

## Data Sources

| Bank | Method | URL |
|------|--------|-----|
| **CSAS** (Česká spořitelna) | REST API | `https://www.csas.cz/webapi/api/v3/exchangerates` |
| **KB** (Komerční banka) | Web scraping | `https://www.kb.cz/cs/kurzy-a-sazby/devizove-kurzy-kb` |
| **RB** (Raiffeisenbank) | Web scraping | `https://www.rb.cz/osobni/sporeni-a-investice/vymena-men` |

## Prerequisites

- **Node.js** v18 or newer
- **npm** v8 or newer

## Installation

```bash
npm install
npm run build
```

## Usage

### Run directly

```bash
npm start
```

The server listens on **stdio** (stdin/stdout) using the MCP protocol.

### Register with an MCP client (e.g. Claude Desktop)

Add the following to your Claude Desktop MCP config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "czech-banks-fx": {
      "command": "node",
      "args": ["/path/to/ai-coding-dojo-mcp-poc-fx/dist/index.js"]
    }
  }
}
```

## Available MCP Tools

### `get_all_rates`
Fetches exchange rates from all three banks in parallel.

**Parameters:** none

**Returns:** Array of `BankRates` objects for CSAS, KB, and RB.

---

### `get_bank_rates`
Fetches exchange rates from a single bank.

**Parameters:**
- `bank` (`"CSAS"` | `"KB"` | `"RB"`) — which bank to query

---

### `get_best_rate`
Finds the best rate for a given currency and action across all three banks.

**Parameters:**
- `currencyCode` (string, 3 chars) — ISO 4217 code, e.g. `"EUR"`, `"USD"`, `"GBP"`
- `action` (`"buy"` | `"sell"`) — from the **client's perspective**:
  - `"buy"` = you want to *buy* foreign currency (pay CZK) → best = lowest bank sell rate
  - `"sell"` = you want to *sell* foreign currency (receive CZK) → best = highest bank buy rate

---

### `compare_rates`
Shows buy/sell rates for a specific currency across all three banks.

**Parameters:**
- `currencyCode` (string, 3 chars) — ISO 4217 code

## Project Structure

```
src/
├── index.ts          # MCP server entry point – tool definitions
├── types.ts          # Shared TypeScript interfaces
└── banks/
    ├── csas.ts       # Česká spořitelna – REST API
    ├── kb.ts         # Komerční banka – web scraping
    └── rb.ts         # Raiffeisenbank – web scraping
```

## Development

```bash
# Build TypeScript
npm run build

# Build and start
npm run dev
```

## License

ISC
