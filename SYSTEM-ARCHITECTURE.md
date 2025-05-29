# My Connect AI v2.0 - System Architecture

## 🎯 Přehled systému

My Connect AI je hybridní systém kombinující lokální zpracování dat s AI asistencí. Umožňuje připojení k různým CRM systémům (aktuálně Tabidoo) a využívá různé AI modely (OpenAI, Gemini, Claude) pro inteligentní odpovědi.

### Klíčové vlastnosti:
- **Modulární architektura** - snadné přidávání nových AI a CRM providerů
- **Lokální zpracování** - rychlé vyhledávání bez čekání na API
- **Flexibilní konfigurace** - vše důležité v JSON souborech
- **Bezpečné** - API klíče šifrované lokálně v prohlížeči

## 📁 Struktura souborů

### Dokumentace
- `SYSTEM-ARCHITECTURE.md` - tento soubor, hlavní dokumentace
- `CHANGELOG.md` - historie změn a verzí

### Core systém
- `core-main.js` - hlavní orchestrátor, inicializace aplikace
- `core-config.js` - správa konfigurace, načítání JSON souborů
- `core-security.js` - šifrování API klíčů, bezpečnostní funkce
- `core-query-processor.js` - analýza a zpracování uživatelských dotazů
- `core-search-engine.js` - lokální vyhledávání v načtených datech
- `core-display.js` - formátování a zobrazování výsledků

### Konfigurace
- `config-app.json` - obecné nastavení aplikace (název, verze, UI)
- `config-example-queries.json` - příklady dotazů pro úvodní obrazovku
- `config-providers-ai.json` - konfigurace AI providerů včetně promptů
- `config-providers-crm.json` - konfigurace CRM systémů včetně mapování

### AI Providers
- `ai-base-connector.js` - abstraktní třída definující AI rozhraní
- `ai-openai-connector.js` - implementace pro OpenAI (ChatGPT)
- `ai-gemini-connector.js` - implementace pro Google Gemini
- `ai-claude-connector.js` - implementace pro Anthropic Claude

### CRM Providers
- `crm-base-connector.js` - abstraktní třída definující CRM rozhraní
- `crm-tabidoo-connector.js` - implementace pro Tabidoo
- `crm-hubspot-connector.js` - připraveno pro HubSpot
- `crm-salesforce-connector.js` - připraveno pro Salesforce

### UI a témata
- `ui-manager.js` - správa UI, event handling, zobrazení zpráv
- `theme-base.css` - základní styly a CSS proměnné
- `theme-claude.css` - Claude téma (výchozí)
- `theme-google.css` - Google Material téma
- `theme-replit.css` - tmavé vývojářské téma

### Ostatní
- `provider-registry.js` - centrální registr všech providerů
- `wizard-setup.js` - průvodce prvním nastavením
- `wizard-setup.css` - styly pro průvodce

## 🏗️ Architektonické principy

### 1. Provider Pattern
Každý AI a CRM provider implementuje společné rozhraní definované v base třídě:

```javascript
// AI Provider musí implementovat:
class MyAIProvider extends AIBaseConnector {
    async formatMessage(query, context) { }
    async testConnection() { }
}

// CRM Provider musí implementovat:
class MyCRMProvider extends CRMBaseConnector {
    async connect() { }
    async loadData() { }
    async saveData(data) { }
    async testConnection() { }
}
