# LLM-Driven Artifact Impact Plan

## 背景與目標

目前 artifact（architecture diagram / ADR / failure mode analysis）會隨 codebase 變動而過時。  
此計劃的目標不是用固定 rule 判斷，而是用 LLM 依據「實際程式碼變更內容」判斷：

1. 哪些 artifact 受影響
2. 影響程度（low / medium / high）
3. 是否需要立即更新
4. 建議由誰或哪個 agent 更新

核心原則：**由 code change 驅動 artifact 更新責任，而不是由 artifact 自己判斷是否過期。**

---

## 非目標（先不做）

- 不做 artifact versioning / diff UI
- 不做完全自動 merge-block（先以建議為主）
- 不做跨 repo 的全域影響分析
- 不做高成本全量重算（每次 commit 全重跑）

---

## 解法概述

建立一個 **Impact Analysis Pipeline**：

1. 收集變更上下文（PR diff、受影響檔案、commit 訊息）
2. 交給 LLM 進行語意判斷（哪些 artifact 被影響）
3. 產生結構化結果（JSON）
4. 寫入 Convex（impact records）
5. 在 UI / PR 顯示「待更新 artifact 清單」與建議負責人

---

## 核心資料模型（建議）

新增 `artifactImpactAssessments`（建議表名）：

- `repositoryId`
- `threadId` (optional)
- `sourceType` (`pr` | `commit` | `manual`)
- `sourceRef` (PR number 或 commit SHA)
- `changedFiles` (array)
- `assessmentJson` (LLM 輸出原文 JSON)
- `impacts` (normalized array)
  - `artifactKind` (`architecture_diagram` / `adr` / `failure_mode_analysis` ...)
  - `scope`（例如 `auth`, `data-access`, `api-gateway`）
  - `impactLevel` (`low` | `medium` | `high`)
  - `action` (`refresh_now` | `refresh_later` | `no_action`)
  - `reason`
  - `suggestedOwner` (string)
  - `confidence` (0~1)
- `status` (`proposed` | `accepted` | `dismissed` | `completed`)
- `createdBy` (`system` | user id)
- `createdAt`

> 先以 `assessmentJson + normalized impacts` 雙存。前者可追溯，後者可查詢與 UI 呈現。

---

## LLM 輸入與輸出設計

### 輸入（Prompt Context）

- repository metadata（名稱、主要語言）
- 這次變更檔案清單
- 精簡 diff（限制 token）
- 既有 artifact 索引（kind + title + summary）
- 可選：當前 thread 的最近設計對話摘要

### 輸出（嚴格 JSON）

LLM 只回：

- `globalSummary`
- `impacts[]`（每筆包含 artifactKind / scope / impactLevel / action / reason / confidence / suggestedOwner）
- `unknowns[]`（需要人工判斷的不確定點）

加上 schema 驗證（zod 或 Convex validator）。驗證失敗即重試一次（帶格式修正指令）。

---

## 判斷策略（避免「不精準」）

不是只問 LLM 一次就直接採信，建議使用以下機制：

1. **Two-pass 評估**
   - Pass 1: broad impact sweep（先抓可能受影響 artifact）
   - Pass 2: per-artifact verification（逐一驗證）

2. **Confidence Gate**
   - `confidence >= 0.75`：直接列為建議更新
   - `0.45 ~ 0.74`：標註需要人工確認
   - `< 0.45`：不觸發更新，只記錄

3. **Grounding hints**
   - Prompt 明確要求引用 changed files 與 diff 片段作為理由來源

4. **Fallback**
   - LLM 無法判斷時，輸出 `unknowns`，不強制更新

---

## 使用者體驗（UI / PR）

在 thread 或 repo 頁顯示：

- 「This change may invalidate 2 artifacts」
- 每個 artifact 的：
  - 影響程度
  - 建議行動（現在更新 / 可延後）
  - 理由
  - 建議負責人
  - 一鍵操作（Regenerate / Capture ADR / Run FMA）

在 PR comment 顯示摘要：

- impacted artifacts 清單
- high-impact 項目
- 建議更新動作

---

## 推進階段（建議）

### Phase A（MVP）

- 手動觸發分析（按鈕）
- 產生 impact JSON 並存在 DB
- UI 顯示建議，不自動做任何更新

### Phase B

- PR 開啟/更新時自動跑分析
- 顯示在 PR comment
- 支援「Accept/Reject 建議」

### Phase C

- 針對 `accepted` 的 high-impact 建議，提供一鍵產生 artifact
- 串接工作流程（owner 指派、狀態追蹤）

---

## 驗收指標（Success Metrics）

1. Precision（建議更新中，實際被使用者接受的比例）
2. Recall proxy（後續人工補做但先前沒被建議的比例）
3. Time to update artifact（變更後到 artifact 更新完成的時間）
4. False alarm rate（被 dismiss 的建議比例）
5. User trust score（主觀滿意度）

---

## 風險與對策

1. **LLM 幻覺 / 過度觸發**
   - 用 confidence gate + 人工確認層
2. **Token 成本過高**
   - diff 摘要化、分段分析、限制檔案數
3. **輸出不穩定**
   - 嚴格 JSON schema + retry
4. **責任人建議不可靠**
   - 初期只作建議，不直接自動指派

---

## 實作切入點（對現有系統）

1. 新增 Convex module：`convex/artifactImpact.ts`
   - `requestImpactAssessment`
   - `listImpactAssessments`
   - `acceptImpactSuggestion`
   - `dismissImpactSuggestion`

2. 新增 Node action：`convex/artifactImpactNode.ts`
   - 組 prompt、呼叫 LLM、驗證輸出、回寫 DB

3. 前端
   - 在 `ArtifactPanel` 或 `RepositoryTabs` 增加 Impact 區塊
   - 提供一鍵更新入口（沿用 Phase 4 的 artifact actions）

4. 後續再接 PR webhook / GitHub App event

---

## 開放問題（待確認）

1. 建議負責人來源：GitHub CODEOWNERS / internal owner map / thread owner？
2. 要不要把 impact assessment 綁定到特定 thread？
3. low confidence 建議的預設 UX（隱藏或顯示）？
4. 何時判定「已完成」：artifact 產生即完成，還是要人工確認？

---

## 總結

這份規劃把「artifact 更新責任」改成由 **程式碼變更語意** 驅動，並利用 LLM 做影響判斷。  
先做 MVP（手動觸發 + 建議清單）可以快速驗證準確度，再逐步走向 PR 自動化與一鍵更新流程。
