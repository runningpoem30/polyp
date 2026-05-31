import fs from 'node:fs';

const mermaidCode = `graph TD
    %% Styling
    classDef user fill:#7B61FF,stroke:#fff,stroke-width:2px,color:#fff,font-weight:bold;
    classDef agent fill:#00D4AA,stroke:#fff,stroke-width:2px,color:#1E1E2E,font-weight:bold;
    classDef coral fill:#FF7F50,stroke:#fff,stroke-width:2px,color:#fff,font-weight:bold;
    classDef api fill:#1E1E2E,stroke:#6C7086,stroke-width:2px,color:#CDD6F4,stroke-dasharray: 5 5;

    %% Nodes
    User(("🧑‍💻 You (Terminal)")):::user
    
    subgraph Polyp ["🧠 Polyp (ReAct AI Agent)"]
        LLM["Gemini/OpenAI/Claude<br/>(Reasoning Engine)"]
        Loop{"ReAct Loop<br/>(Generate SQL → Observe)"}
    end

    subgraph CoralLayer ["🪸 Coral (Virtual SQL Engine)"]
        SQLParser["SQL Parser & Optimizer"]
        Auth["Zero-Config OAuth & Secrets"]
    end

    subgraph SaaS ["Your Organization's Data"]
        GitHub[("GitHub API")]:::api
        Notion[("Notion API")]:::api
        Slack[("Slack API")]:::api
        Linear[("Linear API")]:::api
    end

    %% Flow
    User -->|1. 'Why use Postgres?'| LLM
    LLM -->|2. Generate Query| Loop
    Loop -->|3. 'SELECT * FROM notion...'| SQLParser
    SQLParser --> Auth
    Auth -->|4. Translate to API Calls| Notion
    Notion -->|5. Return JSON| SQLParser
    SQLParser -->|6. Return SQL Rows| Loop
    Loop -.->|7. Next Query?| LLM
    Loop -->|8. Final Answer| User

    %% Highlight Coral's central role
    class Polyp agent;
    class CoralLayer coral;`;

const json = JSON.stringify({ code: mermaidCode, mermaid: { theme: 'default' } });
const base64 = Buffer.from(json).toString('base64');
const url = `https://mermaid.ink/svg/${base64}`;

console.log(url);
