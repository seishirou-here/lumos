# Project Lumos - AI Refinement Engine Specification (`docs/AI_REFINEMENT.md`)

**Document:** AI Refinement & LLM Prompting Specification  
**Status:** Approved & Finalized  
**Model Gateway:** 9router (`http://127.0.0.1:20128/v1`)  
**Authors:** Papa (Seishirou) & Lumi  

---

## 1. Overview & Core Philosophy

The **Lumi Refinement Engine** acts as the intelligent bridge between Papa's raw, uninhibited mobile brain dumps and the structured environment of Hermes Kanban `triage`.

### Core Tenets:
1. **Papa is the Visionary, Lumi is the Polisher:** Papa unloads mental sparks on mobile; Lumi structures them on the host laptop.
2. **Strict Fidelity (Zero Hallucination):** Never invent details or make unilateral decisions. If Papa writes a 5-word reminder, do not bloat it into an essay.
3. **Sacred Raw Dump:** The original unedited mobile text is *always* preserved verbatim inside the Kanban card.
4. **Resilient Fallback:** If the AI engine or 9router is offline/unreachable, the memo is ingested directly into Kanban `triage` as a raw card with tag `#unrefined` so no idea is ever delayed or lost.

---

## 2. LLM Provider: 9router Hub

Rather than managing disparate external APIs or local model runtimes, Lumos connects directly to Papa's active local **9router** instance:

* **Endpoint:** `http://127.0.0.1:20128/v1/chat/completions` (OpenAI-compatible)
* **Default Model:** `fast_daily` or `gemini/gemini-3.8-flash` (Sub-second latency, excellent Indonesian & slang understanding, very low token overhead).
* **Configurable via `.env`:**
  ```env
  ROUTER_BASE_URL="http://127.0.0.1:20128/v1"
  ROUTER_API_KEY="dummy" # 9router runs locally without auth requirement
  REFINEMENT_MODEL="fast_daily"
  REFINEMENT_TEMPERATURE=0.3
  ```

---

## 3. Refinement Prompt Specification

### System Prompt
```text
You are Lumi's Refinement Engine for Project Lumos.
Your job is to read Papa's (Seishirou's) raw mobile brain dump and structure it into a clean, actionable concept for his Hermes Kanban board.

Rules:
1. Output MUST be valid JSON adhering strictly to the required schema.
2. Tone: Respectful, sharp, concise. Understand casual Indonesian, English, and tech slang (wkwk, typo, shorthand).
3. "title": Punchy, descriptive, 3 to 7 words. Captures the primary subject.
4. "summary": 1 to 2 crisp sentences framing the idea.
5. "key_points": Array of 2 to 4 concise bullet points detailing action items, core questions, or technical highlights.
6. Do NOT invent requirements Papa did not state. If the dump is a quick question/dilemma, list it as a consideration point.
7. Tags: Extract 1-3 lowercase relevant tags without '#' (e.g. ["lumos", "architecture"]).
```

### JSON Response Schema
```json
{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "summary": { "type": "string" },
    "key_points": {
      "type": "array",
      "items": { "type": "string" }
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["title", "summary", "key_points", "tags"]
}
```

---

## 4. Ingestion Card Template (Kanban Target)

When the server receives the JSON from 9router, it formats the description using the standard template:

```markdown
### 💡 Inti Ide
{summary}

### 🎯 Poin-Poin Utama
{key_points.map(pt => `- ${pt}`).join('\n')}

---
> 📝 **Original Raw Dump (dari HP):**
> "{rawContent}"
```

### CLI Command Execution
The server executes:
```bash
hermes kanban create "{title}" \
  --description "{formattedMarkdown}" \
  --tag "lumos,{tags.join(',')}"
```
*Destination Column:* Strictly `triage` (passive, manual green light only).

---

## 5. Fallback & Fault Tolerance

```text
[ Incoming Memo ]
        │
        ▼
[ Ping 9router (:20128) ]
   ├──► [ Success ] ──► [ Generate Structured Card ] ──► [ Inject to Kanban ]
   │
   └──► [ Timeout / Offline ]
            │
            ▼
        [ Direct Ingestion ]
          - Title: Truncated first 40 chars of rawContent
          - Description: Raw text dump verbatim
          - Tag: "lumos,unrefined"
          - Result: Idea saved safely into Kanban triage!
```
