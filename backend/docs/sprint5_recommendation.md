# Sprint 5 Recommendation: Conversation Planner

## Vision: What DOPA Needs to Be

What we are building is not an "architecture form wizard." We want DOPA to behave like an intelligent architect.

**Instead of:**
> Please provide: traffic, availability, budget, region, database, compliance

**We want a conversational flow:**
> **User:** I want to deploy a small shop website.
> 
> **DOPA:** Great. Is this an ecommerce store where users can purchase products, or is it mainly a showcase/business website?
> 
> **User:** Users can buy products.
> 
> **DOPA:** Understood. Approximately how many daily visitors do you expect?
> 
> **User:** Maybe 1000 per day.
> 
> **DOPA:** That's relatively small traffic. Do you expect traffic spikes during sales or festivals?
> 
> **User:** Yes, maybe 10x during sales.
> 
> **DOPA:** Got it. Do you want users only in India or globally?

The first feels like talking to an architect. The second feels like filling a form.

---

## Current Problem

The Discovery Engine currently operates on a strict, deterministic loop:
`message` → `extract fields` → `find missing fields` → `ask next missing field`

While reliable, it lacks conversational reasoning and fluidity.

---

## Proposed Solution: The Conversation Planner

We need to add a layer between the Conversation, the Discovery Engine, and the Requirements.

**New Architecture Flow:**
`User Message` → `Discovery Engine` → `Conversation Planner` → `Requirement Store`

**Why?**
The Discovery Engine is your source of truth.

For example:

*User:* Build WhatsApp for India

*Discovery extracts:*
```json
{
  "application_type": "chat",
  "region": "ap-south-1"
}
```

*Now the planner sees:*
```json
{
  "known": {
    "application_type": "chat",
    "region": "ap-south-1"
  },
  "missing": [
    "realtime_latency",
    "users",
    "availability"
  ]
}
```

*The planner decides:*
Chat application detected. Need realtime clarification.

*And asks:*
Will users exchange messages instantly, similar to WhatsApp, or is this more like a forum/discussion board?

This separation keeps extraction deterministic and lets the planner focus purely on conversation quality.

---

## Core Concepts & Implementation Approach

Do not jump to LLMs yet for the entire loop. Instead, build a robust state machine and rule-based planner.

### 1. Expanded Conversation State
Instead of a simple dictionary, the state must track intent and active context:
```python
class ConversationState:
    discovered_fields: dict
    active_goal: str | None
    active_question: str | None
    assumptions: list[dict]
    confidence_scores: dict[str, float]
    conversation_stage: str
    clarification_history: list[str]
```

*Example:*
```json
{
    "active_goal": "understand_scale",
    "active_question": "How many users do you expect?",
    "conversation_stage": "requirements_discovery"
}
```
This prevents DOPA from repeating questions.

### 2. Goal-Based Discovery
Instead of checking against hardcoded required fields:
```json
{
  "required_fields": ["users", "budget", "region"]
}
```
Use conversational goals:
```json
{
  "goals": [
    "understand_scale",
    "understand_latency",
    "understand_storage",
    "understand_cost"
  ]
}
```
A goal may be satisfied by several fields.
Example: `understand_scale` can be satisfied by `{"users": 100000, "traffic": "high"}` OR `{"concurrent_users": 20000}`. This is much more flexible.

### 3. Clarification Priority
Not every missing field deserves a question at the same time.

*Example:*
- **Priority 1:** application_type, users, realtime
- **Priority 2:** region, database
- **Priority 3:** compliance, budget

The conversation should ask "What is this application?" before "What's your HIPAA requirement?"

### 4. Architecture-Driven Questions
This is where DOPA becomes special. Questions should exist because the architecture selection needs them, not just because a field is missing.

*Example:*
**User:** Social media app
**Planner:**
- *Potential architectures:* A: Monolith, B: Microservices, C: Event Driven
- *Uncertainty:* Need scale information
- *Question:* How many active users are you expecting?

That's a huge shift in reasoning.

---

## Sprint 5 Deliverables

### New Files
- `backend/services/conversation_planner.py`
- `backend/knowledge/clarification-rules.json`
- `backend/knowledge/discovery-goals.json`
- `backend/tests/test_conversation_planner.py`

### New Response Schema
```python
class DiscoveryResponse:
    extracted: dict
    missing_fields: list[str]
    planner_goal: str | None
    confidence: float
    next_question: str | None
    is_complete: bool
```

---

## After Sprint 5 (Sprint 6 Vision)

Once this is working, don't immediately add LLMs everywhere. A better Sprint 6 would be:

**Deterministic Discovery Engine + Rule-based Planner + Optional LLM Rewriter**

*Example:*
Internal planner generates: `Need scale information. Ask about expected users.`
LLM rewrites to: `"To make sure I recommend the right architecture, roughly how many users do you expect during peak hours?"`

That gives you natural conversation while keeping the architecture logic deterministic.

**For DOPA's long-term vision, this Conversation Planner is probably more important than another graph renderer, recommendation algorithm, or UI redesign. It is the layer that makes users feel they're talking to an architect rather than filling out a deployment questionnaire.**
