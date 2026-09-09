# Systify 系統架構導覽（面試簡報用）

這份文件是給「口頭介紹 side project」用的精簡版架構圖集。每一張圖對應一個功能頁面或使用場景，圖下方附上講解重點。圖的內容都對照過目前的程式碼（`src/router.tsx`、`convex/schema.ts`、`convex/http.ts`、`convex/crons.ts`、`convex/chat/*`）。

需要更深的細節時，`docs/` 底下每個主題都有完整的 system design 文件與更多 Mermaid 圖（共 30 多份、60 多張圖），本文件最後有對照表。

---

## 0. 一句話介紹

> Systify 是一個「把 GitHub repo 匯入後，用 AI 幫你理解架構」的工具。前端是 React SPA 部署在 Vercel，後端全部跑在 Convex（DB + serverless functions + scheduler + HTTP endpoint 一體），外部整合 WorkOS 登入、GitHub App、Daytona sandbox 與 OpenAI / Anthropic 兩家 LLM。

---

## 1. 全局系統架構（Runtime Boundaries）

```mermaid
flowchart LR
  subgraph Client["Browser (React SPA on Vercel)"]
    UI[React Router + shadcn UI]
    LocalStore[(localStorage / sessionStorage)]
    UI --- LocalStore
  end

  subgraph Convex["Convex Backend (single deployment)"]
    direction TB
    subgraph V8["V8 runtime"]
      Q[queries<br/>reactive subscriptions]
      M[mutations<br/>transactional writes]
      HTTP[httpActions<br/>/api/github/callback<br/>/api/github/webhook<br/>/api/daytona/webhook]
      CRON[crons<br/>reconcile / sweep / repair]
    end
    subgraph NodeRT["Node runtime (actions)"]
      Import[importsNode<br/>runImportPipeline]
      Reply[chat.generation<br/>generateAssistantReply]
      Design[systemDesignNode<br/>runSystemDesignGeneration]
      Ops[opsNode<br/>sandbox reconciliation]
      Gateway[lib/llmGateway<br/>single LLM chokepoint]
    end
    DB[(Convex DB<br/>~35 tables)]
    Q --> DB
    M --> DB
    HTTP --> M
    CRON --> Ops
    Import --> M
    Reply --> M
    Design --> M
    Reply --> Gateway
    Design --> Gateway
  end

  subgraph External["External services"]
    WorkOS[WorkOS AuthKit<br/>identity / JWT]
    GitHub[GitHub App<br/>REST API + webhooks]
    Daytona[Daytona<br/>sandbox containers]
    OpenAI[OpenAI]
    Anthropic[Anthropic]
  end

  UI -->|sign in| WorkOS
  WorkOS -->|access token| UI
  UI -->|WebSocket, JWT| Q
  UI --> M
  M -.->|scheduler.runAfter| Import
  M -.->|scheduler.runAfter| Reply
  M -.->|scheduler.runAfter| Design
  Import -->|installation token| GitHub
  GitHub -->|installation webhooks| HTTP
  Reply -->|read_file / list_dir / run_shell| Daytona
  Design --> Daytona
  Ops --> Daytona
  Daytona -->|lifecycle webhooks| HTTP
  Gateway --> OpenAI
  Gateway --> Anthropic
```

**講解重點**

- 沒有自己的 API server。Convex 同時是資料庫、後端、背景排程器與少量 HTTP 整合端點。
- 前端透過 WebSocket 訂閱 query，資料變動即時推送。串流回覆也是靠這個機制，不用另外做 SSE。
- 長時間、需要 Node SDK 的工作（GitHub App、Daytona、LLM）放在 Node runtime 的 action，由 mutation 透過 scheduler 觸發。
- 所有 LLM 呼叫都經過 `llmGateway`。OpenAI 與 Anthropic 是對等的 provider，可在同一個介面下切換。

---

## 2. 頁面與路由地圖

```mermaid
flowchart TD
  Root["/"] --> Landing[Landing page<br/>auth hint via cookie]
  Root --> Callback["/callback<br/>WorkOS redirect"]
  Root --> Share["/share/t/:token<br/>public shared thread (no login)"]

  Landing -->|authenticated| Protected

  subgraph Protected["ProtectedLayout (requires WorkOS session)"]
    Chat["/chat/:threadId?<br/>Repoless Discuss"]
    Repo["/r/:repositoryId"]
    Discuss["/r/:repositoryId/discuss/:threadId?<br/>Discuss mode"]
    DiscussNew["/r/:repositoryId/discuss/new<br/>draft thread"]
    Library["/r/:repositoryId/library<br/>Library mode"]
    Artifact["/r/:repositoryId/library/a/:artifactId<br/>artifact reader + Ask"]
    Archive["/archive<br/>archived repos, paginated + search"]
    Resources["/resources"]
    Settings["/settings/:section?"]
  end

  Repo --> Discuss
  Discuss --> DiscussNew
  Repo --> Library
  Library --> Artifact
  Chat -->|attach repository| Discuss

  Discuss -.->|prefetch on hover| Library
```

**講解重點**

- 兩個核心模式：**Discuss**（自由對話，可逐則訊息開啟 Library / Sandbox grounding）與 **Library**（讀 artifact 文件 + 針對文件 Ask）。
- 使用者可以先在 `/chat` 不綁 repo 聊天，之後再「attach repository」把 thread 升級，歷史訊息不會被改寫。
- 所有頁面 lazy load。切到 Library 時在 hover 就先 prefetch route chunk，減少切換等待。
- `/share/t/:token` 是唯一公開頁面，用 `threadShares` 表發 token 讓外部人閱讀對話。

---

## 3. 場景：登入與連接 GitHub App

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant FE as React SPA
  participant WA as WorkOS AuthKit
  participant CX as Convex
  participant GH as GitHub

  U->>FE: Sign in
  FE->>WA: redirect / popup
  WA-->>FE: access token (JWT)
  FE->>CX: ConvexProviderWithAuthKit attaches JWT
  Note over CX: auth.config.ts validates JWT<br/>every function calls requireViewerIdentity()

  U->>FE: Connect GitHub App
  FE->>CX: initiateGitHubInstall(returnTo)
  CX->>CX: rate limit + create state + PKCE, insert githubOAuthStates
  CX-->>FE: install URL with state
  FE->>GH: open GitHub App installation page
  GH->>CX: GET /api/github/callback?installation_id&state
  CX-->>GH: 302 GitHub user OAuth (PKCE)
  GH->>CX: GET /api/github/callback?code&state
  CX->>GH: exchange code, GET /user/installations
  GH-->>CX: installations visible to this GitHub user
  CX->>CX: verify installation belongs to user, saveInstallation (1 active per owner)
  CX-->>FE: callback page, navigate to allowlisted returnTo

  GH-->>CX: POST /api/github/webhook (suspend / unsuspend / deleted)
  CX->>CX: HMAC-SHA256 verify, patch githubInstallations.status
```

**講解重點**

- 不用 personal access token，用 GitHub App installation token，權限由使用者在 GitHub 端控制。
- Callback 帶回來的 `installation_id` 是不可信輸入。多做一次 GitHub user OAuth，確認「這個 GitHub 使用者真的能存取這個 installation」，才綁定到 Systify 帳號。
- `returnTo` 走 origin allowlist，避免 open redirect。
- Webhook 用 HMAC 常數時間比對，維護 installation 狀態機（active / suspended / deleted）。

---

## 4. 場景：匯入 Repository（sandbox-free）

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant FE as ImportRepoDialog
  participant M as Convex mutation<br/>createRepositoryImport / syncRepository
  participant DB as Convex DB
  participant A as importsNode.runImportPipeline<br/>(Node action)
  participant GH as GitHub REST API

  U->>FE: paste GitHub repo URL
  FE->>M: verify access, create import
  M->>M: auth, in-flight guard, per-owner + global rate limit
  M->>DB: upsert repositories, insert imports + jobs (with lease), default thread
  M-->>A: scheduler.runAfter(0)
  A->>GH: GET /repos/{owner}/{repo} (installation token)
  A->>GH: GET commits/{branch}, git/trees?recursive=1
  A->>GH: GET git/blobs for README, manifests, important files<br/>(bounded parallelism, retry 429/5xx)
  GH-->>A: bounded repository snapshot
  A->>DB: persistImportHeader + seed System Design folders
  A->>DB: persist repoFiles in batches
  A->>DB: persist repoChunks in batches
  A->>DB: finalize: latestImportId, fileCount, commitSha (single publish boundary)
  DB-->>FE: reactive query flips repository to ready
  Note over A,DB: on failure: job.failed + cleanup staged rows<br/>cron reconcileStaleImportJobs recovers expired leases
```

**講解重點**

- 匯入完全不開 sandbox，只打 GitHub API，成本低、速度快。Sandbox 只在真的需要即時檔案系統時才 lazy provision。
- 寫入分批（Convex 單次 transaction 有大小限制），最後由一個 finalize mutation 一次發布，中途失敗不會留下半成品被看到。
- Job 帶 lease，action 掛掉時由 cron 回收，不會卡在 running。
- Sync 走同一條 pipeline。前端在 tab 重新 focus 時會打 `checkForUpdates` 比對 remote SHA，顯示「有新 commit」。

---

## 5. 場景：Discuss 送出訊息與串流回覆

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant FE as ChatPanel
  participant M as chat.sendMessage<br/>(mutation)
  participant DB as Convex DB
  participant A as generateAssistantReply<br/>(Node action)
  participant GW as llmGateway
  participant DT as Daytona sandbox
  participant LLM as OpenAI / Anthropic

  U->>FE: type message, toggle Library / Sandbox grounding
  FE->>M: sendMessage(threadId, content, grounding flags)
  M->>M: auth, rate limit, usage budget check, provider lock check
  M->>DB: insert user message + assistant placeholder + messageStreams row + chat job
  opt Sandbox grounding on
    M->>DB: ensureSandboxSessionForThread (cost tracking row)
  end
  M-->>A: scheduler.runAfter(0)

  A->>DB: getReplyContext (history, thread, repository)
  opt Library grounding on
    A->>DB: hybrid retrieval over artifactChunks (see section 6)
  end
  opt Sandbox grounding on
    A->>DT: ensureSandboxReady (probe / wake / provision + clone)
    A->>A: createSandboxTools: read_file, list_dir, run_shell
  end

  A->>GW: streamViaGateway(prompt, tools, provider, model)
  GW->>LLM: streamText
  loop streaming
    LLM-->>GW: text delta
    GW-->>A: chunk
    A->>DB: appendAssistantStreamChunk (compact tail into header)
    DB-->>FE: getActiveMessageStream subscription pushes delta
    opt tool call
      LLM-->>A: tool_call
      A->>DT: execute, redact secrets, truncate output
      A->>DB: appendAssistantToolCallEvent + sandboxToolCallLog (audit)
      A->>GW: tool_result
    end
  end

  A->>DB: finalizeAssistantReply: patch messages.content once, fold tool calls,<br/>delete stream rows, settle tokens + cost to jobs / usage rollups
  DB-->>FE: listMessagesPaginated shows durable message
```

**講解重點**

- **熱資料與冷資料分表**：串流中的內容放 `messageStreams` / `messageStreamChunks`，完成後才一次寫進 `messages`，再刪掉熱資料。歷史訊息的 query 不會因為串流一直 invalidate。
- **每則訊息獨立的 grounding toggle**：Library = 對 artifact 做 RAG；Sandbox = 給 LLM 三個受限工具，在 Daytona 裡讀真實原始碼。
- **Sandbox 安全四層**：system prompt、Zod schema、tool layer（deny list、路徑解析、timeout、輸出上限、secret redaction）、Daytona 容器本身。
- **Thread provider lock**：一個 thread 一旦由某家 provider 回過話，就鎖定該 provider，避免上下文風格跳動。
- 每次回覆結算 token 與費用，寫入 `jobs` 與 `userUsage*` rollup 表，供每日 / 週期用量預算判斷。

---

## 6. 場景：Library 模式（Artifact 索引與 Ask 檢索）

```mermaid
flowchart TD
  subgraph Indexing["Artifact indexing (write path)"]
    Art[(artifacts<br/>markdown body, versions, drafts)]
    Chunk[chunk markdown by heading]
    Summ[LLM summary per chunk]
    Emb[OpenAI embeddings via llmGateway]
    AC[(artifactChunks<br/>content + summary + embedding)]
    Retry[cron retryFailedArtifactIndexing]

    Art -->|on save / new version| Chunk --> Summ --> Emb --> AC
    Emb -.->|transient failure: lexical-only chunk| AC
    Retry -.-> Emb
  end

  subgraph Ask["Library Ask (read path)"]
    Qn[user question]
    FT1[full-text search_content]
    FT2[full-text search_summary]
    Vec[vector index by_embedding]
    RRF[Reciprocal Rank Fusion + bound to latest import snapshot]
    Prompt[prompt with cited chunks]
    Lint[citationLint: verify citations map to real chunks]

    Qn --> FT1 --> RRF
    Qn --> FT2 --> RRF
    Qn -->|embed query| Vec --> RRF
    RRF --> Prompt --> Lint
  end

  AC --> FT1
  AC --> FT2
  AC --> Vec

  subgraph Reader["Library UI"]
    Nav[FolderNavigator<br/>unseen dot / drift badge]
    Editor[artifact reader + editor<br/>Mermaid render + auto-repair]
    Views[(artifactViews<br/>per user read state)]
    Nav --> Editor
    Editor --> Views
  end

  Art --> Editor
```

**講解重點**

- Library 是「以文件為中心」的模式。Artifact 是 Design Docs 產生或使用者自己寫的 markdown。
- 檢索是 **hybrid**：兩組 full-text index（內文、摘要）加 vector index，用 RRF 合併排序。Embedding 失敗時該 chunk 降級成只走 lexical，不阻塞索引。
- 回答後有 citation lint，確認引用的 chunk 真的存在，減少幻覺引用。
- Artifact 上帶 `alignedImportCommitSha`，跟 repo 最新 import 比對就能標示「這份文件可能過期」。

---

## 7. 場景：Design Docs 產生（System Design generation）

```mermaid
flowchart TD
  Menu[Design Docs menu / overview] --> Pick[pick up to 8 templates<br/>readme_summary, architecture_overview,<br/>architecture_diagram, data_model, api_surface,<br/>deployment, security, operations]
  Pick --> Req[requestSystemDesignGeneration mutation]
  Req --> Guard[auth + rate limit + usage budget]
  Guard --> Job[create system_design job with lease<br/>or append selections to running job]
  Job --> Sched[scheduler → systemDesignNode.runSystemDesignGeneration]

  Sched --> Sandbox[ensureSandboxReady<br/>lazy provision Daytona + clone repo]
  Sandbox --> Loop{next selected kind?}

  Loop -->|yes| Cache{cache hit?<br/>repo + kind + commitSha<br/>+ provider + model + promptVersion}
  Cache -->|hit| Settle[finalizeKindPublication: cached_hit]
  Cache -->|miss| Reserve[reserve per-kind budget]
  Reserve --> Gen[LLM inspects repo via sandbox tools<br/>emits markdown]
  Gen --> QC{quality gate<br/>required sections / mermaid block}
  QC -->|pass| Write[write artifact into kind folder<br/>replace previous version]
  QC -->|fail| Reject[quality_rejected kindRun]
  Write --> Settle
  Reject --> Settle
  Settle --> Progress[updateGenerationProgress n/total]
  Progress --> Loop

  Loop -->|no| Done[complete job]
  Write --> Index[artifact indexing → artifactChunks]
```

**講解重點**

- 每個模板是一個 **kind**，逐一執行，進度即時推到 UI。使用者可以在執行中追加勾選。
- **Idempotent cache key**：同一個 commit、同一個模型、同一版 prompt 不會重算，直接重用舊 artifact，省 LLM 費用。
- 有 quality gate。架構圖模板要求至少有一個 Mermaid block，不合格記成 `quality_rejected` 而不是寫出爛文件。
- 每個 kind 獨立結算成本與 metrics（duration、steps、tokens、cost）。

---

## 8. 場景：Sandbox 生命週期與可靠性

```mermaid
flowchart TD
  Trigger[Sandbox-grounded reply<br/>or Design Docs generation] --> Ensure[ensureSandboxReady]
  Ensure --> Probe{existing sandbox<br/>for repository?}
  Probe -->|running| Use[use it]
  Probe -->|stopped| Wake[wake via Daytona] --> Use
  Probe -->|none| Reserve[reserve sandboxes row in DB first<br/>remoteId = empty]
  Reserve --> Create[Daytona create]
  Create --> Attach{attach remoteId<br/>back to DB ok?}
  Attach -->|yes| Clone[clone repo with installation token] --> Ready[mark ready, patch repositories.latestSandboxId] --> Use
  Attach -->|no| Fail[fail row + schedule cleanup<br/>+ best-effort delete remote]

  subgraph Converge["Convergence layers"]
    WH[POST /api/daytona/webhook] --> Verify[Svix signature + org allowlist]
    Verify --> Inbox[(daytonaWebhookEvents inbox)]
    Inbox --> Proc[processor: dedupe, ordering]
    Proc --> Obs[(sandboxRemoteObservations projection)]
    Obs --> Patch[patch sandboxes only on coarse lifecycle change]
    Proc -->|unknown remoteId| Delay[delayed confirm] --> Orphan[delete confirmed orphan]

    C1[cron 1h sweepExpiredSandboxes]
    C2[cron 6h reconcileDaytonaOrphans]
    C3[cron 5m repairBacklog]
    C1 --> Obs
    C2 --> Orphan
    C3 --> Inbox
  end

  Use --> Cost[(sandboxSessions.spentCents<br/>per-message cost ticker<br/>daily caps close the toggle)]
```

**講解重點**

- **DB-first provisioning**：先在 Convex 佇下 row 再呼叫 Daytona，任何一步失敗都有紀錄可追、可清。孤兒資源是系統設計問題，不是「清掃 bug」。
- **三層收斂**：webhook（快）、cron 對帳（保底）、request path 清理。Webhook 走 inbox + projection，重複與亂序事件都能處理。
- **成本可見**：sandbox session 累計花費、每則訊息顯示估算成本、每人每 repo 每日上限用完會直接關掉 Sandbox toggle。

---

## 9. 核心資料模型（簡化版）

```mermaid
erDiagram
  githubInstallations ||--o{ repositories : "authorizes"
  repositories ||--o{ imports : "snapshots"
  repositories ||--o{ repoFiles : "indexed files"
  repositories ||--o{ repoChunks : "retrieval chunks"
  repositories ||--o{ threads : "discuss threads"
  repositories ||--o{ artifactFolders : "library tree"
  repositories ||--o{ artifacts : "generated / authored docs"
  repositories ||--o| sandboxes : "latestSandboxId"
  repositories ||--o{ sandboxSessions : "cost per session"
  repositories ||--o{ jobs : "import / chat / system_design"

  threads ||--o{ messages : "durable history"
  threads ||--o{ threadShares : "public share tokens"
  messages ||--o| messageStreams : "in-flight stream (hot)"
  messageStreams ||--o{ messageStreamChunks : "tail chunks"
  messages ||--o{ messageToolCallEvents : "live tool ticker (ephemeral)"
  messages ||--o{ sandboxToolCallLog : "audit, 90-day TTL"

  artifacts ||--o{ artifactVersions : "history"
  artifacts ||--o{ artifactDrafts : "unsaved edits"
  artifacts ||--o{ artifactChunks : "full-text + vector"
  artifacts ||--o{ artifactViews : "per-user read state"
  jobs ||--o{ systemDesignKindRuns : "per-template outcome"

  sandboxes ||--o{ sandboxRemoteObservations : "provider projection"
  daytonaWebhookEvents }o--|| sandboxRemoteObservations : "feeds"

  userUsageEvents }o--|| userUsageDailyRollups : "sharded counters"
  userUsageBudgetPeriods ||--o{ userUsageBudgetReservations : "reserve before LLM call"
```

**講解重點**

- 幾乎每張表都有 `ownerTokenIdentifier`，資料隔離在 index 層就做掉，query 一律 `withIndex` 加 owner 條件。
- 刻意把「熱 / 冷」「短暫 / 持久」分開：`messageStreams` vs `messages`、`messageToolCallEvents` vs `sandboxToolCallLog`。
- 用量走 sharded counter rollup，避免高頻寫入同一 document 造成 OCC 衝突。

---

## 10. 橫切關注：請求防護與背景維運

```mermaid
flowchart LR
  subgraph Guard["Every write-path mutation"]
    A[auth: requireViewerIdentity] --> B[ownership check]
    B --> C[in-flight guard<br/>OPERATION_ALREADY_IN_PROGRESS]
    C --> D[per-owner rate limit]
    D --> E[global rate limit]
    E --> F[usage budget reservation]
    F --> G[write rows + schedule action]
  end

  subgraph Gateway["llmGateway"]
    H[fairness buckets<br/>per-user + global] --> I[provider dispatch<br/>OpenAI / Anthropic]
    I --> J[retry on 429 / 5xx]
    J --> K[normalize usage → cost USD]
  end

  subgraph Crons["crons.ts"]
    S1[5m reconcile stale interactive jobs]
    S2[5m reconcile stale import jobs]
    S3[1h sweep expired sandboxes]
    S4[6h reconcile Daytona orphans]
    S5[5m repair Daytona webhook backlog]
    S6[retry failed artifact indexing]
    S7[12h cleanup expired OAuth states]
    S8[cleanup expired sandbox tool-call logs]
    S9[1h repair chat history groups]
  end

  G --> Gateway
  K --> Settle[settle usage to jobs + rollups]
```

**講解重點**

- 防護順序刻意排成「便宜的先擋」：先 auth 與 ownership，再 in-flight，再 rate limit，最後才動 budget。全局限流被擋時不留任何 side effect。
- Job 都有 lease。Action 中途死掉不會永久卡住，cron 每 5 分鐘回收並把 assistant message 標成 failed。
- 維運不是 best effort。Cron 是可靠性設計的一部分，跟 webhook 互為備援。

---

## 11. 部署模型

```mermaid
flowchart LR
  Push[git push] --> VB[Vercel build]
  VB --> CD[convex deploy<br/>functions + schema + crons]
  CD --> URL[Convex deployment URL]
  URL --> Build[bun run build<br/>VITE_CONVEX_URL injected]
  Build --> Static[static assets on Vercel CDN]

  subgraph Env["Environment ownership"]
    VE[Vercel env: VITE_* for browser]
    CE[Convex env: GitHub App keys,<br/>Daytona, OpenAI, Anthropic, WorkOS]
  end
  VE --> Build
  CE --> CD
```

**講解重點**

- 只有一套 CD。Vercel build 裡順便跑 `convex deploy`，preview branch 也會拿到自己的 Convex deployment。
- 秘密全部在 Convex 端，瀏覽器只拿到 `VITE_` 前綴變數。

---

## 附錄：既有文件對照表

想深入哪個主題，直接翻對應文件（都在 `docs/` 底下，內含更細的 Mermaid 圖）：

| 本文件章節 | 深入文件 |
| --- | --- |
| 1 全局架構 | `core/system-overview.md`、`integrations/integrations-and-operations.md` |
| 2 路由 | `chat/service-modes-discuss-library-system-design.md`、`chat/repository-mode-switching-system-design.md`、`client/landing-auth-hint-system-design.md` |
| 3 登入 / GitHub App | `core/auth-and-access.md`、`integrations/github-app-integration-system-design.md`（18 張圖，含完整 sequence 與 state machine）、`integrations/github-callback-returnto-allowlist-system-design.md` |
| 4 匯入 | `repository/repository-lifecycle.md`、`repository/import-persistence-system-design.md`、`repository/repository-remote-freshness-check-system-design.md` |
| 5 Discuss 串流 | `chat/chat-and-analysis-pipeline.md`、`chat/streaming-reply-optimization-system-design.md`、`chat/chat-context-retrieval-system-design.md`、`sandbox/sandbox-mode-system-design.md`、`sandbox/sandbox-mode-security-system-design.md` |
| 6 Library | `chat/artifact-view-state-system-design.md`、`repository/artifact-import-drift-system-design.md`、`chat/instant-view-switching-system-design.md` |
| 7 Design Docs | `architecture/system-design-generation.md`、`architecture/eval-workflow.md` |
| 8 Sandbox | `sandbox/orphan-resource-handling.md`、`sandbox/sandbox-provisioning-cleanup-system-design.md`、`sandbox/daytona-webhook-reconciliation-system-design.md`、`sandbox/sandbox-tool-call-audit-log-system-design.md` |
| 9 資料模型 | `core/domain-and-data-model.md` |
| 10 防護 / 維運 | `architecture/rate-limiting-and-fairness.md`、`architecture/llm-gateway.md`、`architecture/cost-tracking.md` |
| 11 部署 | `integrations/vercel-convex-deployment-system-design.md` |
