# Raahat India — Verified Healthcare Facility Intelligence

## Overview
Raahat India is a healthcare discovery and intelligence platform designed to help patients, families, NGOs, and policymakers identify reliable medical facilities across India. It transforms messy, unstructured healthcare data into a structured, trustworthy, and queryable system.

Built during a 24-hour global AI hackathon, the platform focuses on enabling fast, informed decision-making in high-stakes scenarios such as medical emergencies and resource planning.


**URL**: [Project Link](https://guardian-wings-watch.lovable.app)
---

## Problem Statement
Healthcare data in many regions is:
- Unstructured and inconsistent  
- Self-reported and often unreliable  
- Difficult to query for real-world needs  

This leads to:
- Patients traveling long distances without guaranteed care  
- Poor resource allocation by NGOs and governments  
- Lack of visibility into regional healthcare gaps  

---

## Solution
Raahat India converts fragmented healthcare facility records into a structured intelligence layer with:

- **Natural Language Search**  
  Query facilities using real-world phrases (e.g., “ICU bed in Pune tonight”)

- **Trust Scoring System**  
  Detects inconsistencies in facility claims (e.g., ICU without oxygen supply)

- **Capability Mapping**  
  Standardized levels for ICU, surgery, and dialysis capabilities

- **Medical Desert Identification**  
  Highlights underserved regions lacking critical care infrastructure

- **Transparent Data Quality Layer**  
  “Truth Gap Audit” exposes missing or inconsistent data

---

## Key Features
- Conversational search interface  
- Map + list dual visualization  
- Facility-level trust scores and warnings  
- Planner dashboard for NGOs and policymakers  
- Telegram bot integration for on-the-go queries  
- Resilient fallback to demo data if live systems fail  

---

## Architecture

### High-Level Flow
1. User submits query  
2. Query is parsed into structured intent  
3. Backend executes parameterized query on Databricks  
4. Results are validated and enriched with trust scoring  
5. UI renders results with maps, filters, and insights  

---

## Tech Stack

### Frontend
- React 19 + TypeScript  
- TanStack Start (SSR + routing)  
- Tailwind CSS  
- Leaflet (maps)  
- React Query (data fetching)  

### Backend
- Server routes (Edge/Cloudflare Workers)  
- API proxy layer for secure data access  

### Data & AI
- Databricks SQL Warehouse  
- Vector Search (semantic retrieval)  
- RAG-based query system  
- Trust validation using rule-based + schema checks  

### Integrations
- Telegram Bot API  
- Supabase (via managed cloud)  

---

## Data Model

Each facility includes:
- Location (state, city)  
- Capability levels (ICU, surgery, dialysis)  
- Trust score (0–100)  
- Warning flags for inconsistencies  

---

## Core Modules

- `ChatPanel` — Natural language query interface  
- `FacilitiesMap` — Interactive geographic visualization  
- `FacilityCard` — Facility-level insights and trust indicators  
- `PlannerDashboard` — Regional healthcare gap analysis  
- `TruthGapAudit` — Data quality transparency layer  

---

## Impact
- Reduces healthcare discovery time from hours to seconds  
- Surfaces unreliable or contradictory facility claims  
- Enables data-driven decision-making for NGOs and policymakers  
- Provides a scalable blueprint for healthcare intelligence in emerging markets  

---

## Setup Instructions

### Prerequisites
- Node.js / Bun  
- Databricks account (optional for live data)  

### Environment Variables
