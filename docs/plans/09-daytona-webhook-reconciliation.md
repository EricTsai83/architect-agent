# Plan 09 — Daytona Webhook Reconciliation

- **Priority**: P1
- **Scope**: Daytona sandbox lifecycle webhook ingress, idempotent event handling, orphan-resource detection, and docs sync.
- **Conflicts**:
  - `convex/http.ts`: 與任何 webhook / callback 類改動衝突。
  - `convex/schema.ts`: 若加入 webhook event journal，會與其他 schema plan 衝突。
  - `convex/{ops,opsNode,daytona}.ts`: 會與 Daytona cleanup / reconciliation 類改動重疊。
- **Dependencies**:
  - 目前的 DB-first provisioning 與 `reconcileDaytonaOrphans` 已存在，這份是其上層 hardening，而不是替代方案。

## 背景

目前系統對 Daytona orphan 資源的處理，已經有三層：

1. **Prevention**：先在 Convex reserve sandbox row，再呼叫 Daytona create。
2. **Request-path cleanup**：import fail / repository delete 時，排 cleanup job。
3. **Cron reconciliation**：
   - `sweepExpiredSandboxes`
   - `reconcileDaytonaOrphans`

這已經足夠安全，但仍是 **eventual consistency**：

- Daytona state 改變後，要等下一次 request-path 或 cron 才會反映到 Convex。
- 如果 webhook 可用，我們可以更快知道：
  - sandbox created
  - sandbox stopped / archived / deleted
  - 疑似 Daytona-side orphan 的出現

但 webhook **不能取代** cron，因為 webhook 也可能延遲、重送、漏送、驗證失敗，或在 deploy / outage 期間未被處理。

## 目標

做成「**webhook 驅動的快速收斂 + cron 驅動的最終對帳**」：

1. Daytona 事件可即時進入 Convex。
2. webhook handler 必須 **idempotent**，能安全處理 retry / duplicate / out-of-order。
3. 對「DB 沒有、Daytona 有」的未知 sandbox，webhook 只做**快速發現**，真正刪除仍保留 safety window 與確認步驟。
4. 保留既有 cron，讓 webhook 只是加強，不是單點依賴。
5. 把 orphan-resource 策略明確寫進文件，而不是散落在 code 與口頭知識裡。

## 非目標

- 不把 webhook 當成 Daytona state 的唯一來源。
- 不移除 `reconcileDaytonaOrphans` 或 `sweepExpiredSandboxes`。
- 不要求把 Daytona 每個細狀態都完整映射到前端 UI。
- 不在第一版就處理 snapshot / volume webhook；先聚焦 sandbox。

## 建議做法

### A. 新增 Daytona webhook endpoint

在 `convex/http.ts` 新增：

- `POST /api/daytona/webhook`

處理原則：

- 讀 raw request body，不要先 parse 後再驗證。
- 只接受需要的 event：
  - `sandbox.created`
  - `sandbox.state.updated`
- 成功驗證後，**不要在 httpAction 裡做重邏輯**；只做：
  - 驗證
  - 事件記錄 / 去重
  - schedule background processor

這樣 endpoint 可以快回 `200`，降低 Daytona retry 與 timeout 機率。

### B. 驗證策略

優先順序：

1. **若 Daytona dashboard / 官方文件提供 signing secret 與簽章 header**：
   - 使用 Daytona 提供的正式驗證機制
   - 驗證內容必須基於 raw body
2. **若 Daytona 文件仍未明確公開簽章格式**：
   - 不要假設 header 名稱硬編碼進正式實作
   - 先在 Daytona 後台確認可用的 secret / signing metadata
   - 若短期內沒有正式簽章能力，再退而求其次使用：
     - HTTPS
     - 高熵 endpoint token（放在 URL query 或 path）
     - event allowlist
     - 組織 ID allowlist

原則上，沒有 cryptographic verification 的 webhook 只能算暫時方案，不應作為最終設計。

### C. 新增 webhook event journal

建議新增一張表，例如 `daytonaWebhookEvents`，用來做：

- idempotency
- retry-safe processing
- observability
- incident debugging

建議欄位：

- `deliveryId`
- `eventType`
- `remoteId`
- `organizationId`
- `dedupeKey`
- `payload`
- `status`：`received` / `processing` / `processed` / `ignored` / `failed`
- `receivedAt`
- `processedAt`
- `errorMessage`

去重邏輯：

- **首選** provider delivery id（若 Daytona webhook 有提供唯一 delivery id）
- **次選** `eventType + remoteId + timestamp + state tuple` 組出的 dedupe key

HTTP handler 的責任應該是：

1. 驗證
2. 寫入 journal（若重複則直接回 200）
3. `ctx.scheduler.runAfter(0, internal.xxx.processDaytonaWebhookEvent, { eventId })`

### D. 背景 processor 的責任

新增一個 internal action，例如：

- `internal.daytonaWebhook.processEvent`

處理邏輯：

#### 1. 若 DB 找得到對應 sandbox

以 `remoteId` 查 `sandboxes.by_remoteId`。

若存在：

- `sandbox.created`
  - 通常只做 no-op 或補 remote timestamps
  - 不直接改掉 import pipeline 的主狀態機
- `sandbox.state.updated`
  - `newState = started`
    - 本地狀態可保持 `ready`
    - 更新 `lastHeartbeatAt` 或 remote observation time
  - `newState = stopped`
    - 可提早把本地狀態標成 `stopped`
  - `newState = archived` / `deleted`
    - 本地可提早標 `archived`
  - `newState = error`
    - 記錄錯誤觀測，必要時標 `failed`

這裡的重點不是讓 webhook 完全接管狀態機，而是讓 DB 更快收斂到 Daytona reality。

#### 2. 若 DB 找不到對應 sandbox

這是最重要的 orphan detection 路徑。

但**不要在收到 webhook 當下直接刪除**，因為還有 race：

- `sandbox.created` webhook 可能比 `attachSandboxRemoteInfo` 更早到
- import pipeline 可能只是慢，不是真的 orphan

建議做法：

- 先把 journal 標記成 `received_unknown_remote`
- schedule 一個 **延遲確認動作**，例如 10 分鐘後：
  - `confirmUnknownDaytonaSandbox(remoteId, firstSeenAt)`

延遲確認動作再做：

1. 再查一次 Convex `sandboxes.by_remoteId`
2. 若仍不存在，再查 Daytona `get(remoteId)` 或 list-by-label
3. 若 Daytona 仍存在，且超過 safety window，才刪除
4. 記錄 `orphan_deleted_via_webhook_confirmation`

### E. Cron 保留，而且角色不變

webhook 加進來後，以下兩個 cron 都應保留：

- `sweepExpiredSandboxes`
- `reconcileDaytonaOrphans`

角色分工：

- **webhook**：低延遲、事件驅動、快速收斂
- **cron**：最終對帳、補 webhook 遺漏、補 request-path 失敗

不要因為 webhook 上線就移除 cron，否則會把系統從「多層防線」退化成「單點依賴」。

### F. 建議的狀態與資料擴充

若要讓 webhook 真的有 operational value，建議在 `sandboxes` 或旁路表補一些觀測欄位。最小可接受做法擇一：

#### 選項 1：擴充 `sandboxes`

- `lastObservedRemoteState`
- `lastObservedRemoteAt`
- `remoteCreatedAt`
- `lastWebhookAt`

優點：

- 查詢簡單
- UI / debugging 容易看

缺點：

- 會把 projection 與 workflow state 混在一起

#### 選項 2：另建 observation / event projection 表

例如 `sandboxRemoteObservations`

優點：

- 分離 workflow state 與 provider observation
- 比較容易保留 event history

缺點：

- 複雜度較高

若先求穩定與可落地，**第一版可先走選項 1 或只用 webhook journal，不必一次做滿。**

## 建議事件流程

### 正常已知 sandbox

1. Daytona 發送 `sandbox.state.updated`
2. Convex webhook endpoint 驗證並記錄 journal
3. 背景 processor 依 `remoteId` 找到 sandbox
4. 更新本地投影狀態 / observation timestamp
5. journal 標記 `processed`

### 疑似 orphan sandbox

1. Daytona 發送 `sandbox.created`
2. Convex webhook endpoint 驗證並記錄 journal
3. processor 找不到對應 `remoteId`
4. 排程延遲確認
5. 延遲確認時若 DB 仍不存在且 Daytona 仍存在，才刪除
6. 同時保留 cron 作為第二層保險

## 觀測與告警

至少要加 structured log：

- `daytona_webhook_received`
- `daytona_webhook_duplicate`
- `daytona_webhook_signature_failed`
- `daytona_webhook_unknown_remote`
- `daytona_webhook_processed`
- `daytona_webhook_failed`
- `daytona_orphan_deleted_via_webhook`

若未來有 metrics / dashboard，再補：

- webhook receive count
- verification failure count
- duplicate rate
- unknown remote count
- orphan delete count

## 文件同步要求

這件事必須同時寫進兩層文件：

### 1. Core docs（描述 current state）

- `docs/system-overview.md`
- `docs/integrations-and-operations.md`

要明確說明：

- orphan resource handling 是一級 reliability concern
- 目前的層次是 prevention + request-path cleanup + cron reconciliation
- Daytona webhook 尚未接入前，系統仍屬 eventual consistency

### 2. Plan docs（描述 future design）

- 新增本文件，描述 webhook-enhanced design

## 驗證

- 重送同一筆 webhook，不會重複處理
- 無效簽章 / 無效 token 會被拒絕
- 已知 sandbox 的 `sandbox.state.updated` 能快速更新本地投影
- 未知 remote sandbox 不會在 webhook 到達當下被誤刪
- 延遲確認流程會刪掉超過 safety window 且 DB 仍不存在的 Daytona sandbox
- 即使停掉 webhook，既有 cron 仍能最終清掉 orphan

## Out of Scope

- 不處理 Daytona snapshot / volume webhook
- 不把 Daytona 全部 lifecycle 細節都映射到前端
- 不把 cron 拔掉
