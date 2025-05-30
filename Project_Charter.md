# 📘 Project Charter: Enterprise Data Aggregation & Comparison Platform

## 0. Project Objectives

### 🎯 Purpose
The project aims to streamline the manual and error-prone process of validating French enterprise data by automating the collection, analysis, and comparison of open-source company information with internal system data. The platform will empower compliance officers and analysts to make faster, more accurate decisions.

### ✅ SMART Objectives
1. **Automate Data Collection** – Retrieve enterprise data from official French registries like INSEE/SIRENE through robust API pipelines.
2. **Process and Aggregate Data** – Develop data cleaning and merging routines to prepare datasets for analysis.
3. **Enable Data Comparison** – Build an intuitive interface to match open data against internal business systems and export reports (CSV, PDF).

---

## 1. Stakeholders & Team Roles

### 👥 Stakeholders

| Type     | Stakeholder                                                         |
|----------|---------------------------------------------------------------------|
| Internal | Giovanni, Maxime (development team)                                 |
| External | Open data providers, End-users (compliance officers, data analysts) |

### 🧑‍💼 Team Roles

| Name     | Role(s)                            | Responsibility                                                              |
|----------|------------------------------------|-------------------------------------------------------------------------------|
| Giovanni | Project Manager, Backend Developer | Coordinates timeline and sprints; designs API, data aggregation engine        |
| Maxime   | Frontend Developer, Domain Expert  | Builds UI/UX interface and validates functional requirements for compliance   |

---

## 2. Scope

### ✅ In Scope
- INSEE/SIRENE API integration
- Data aggregation and validation
- Comparison module with internal SI
- Report generation (CSV, PDF)
- Responsive web interface

### ❌ Out of Scope
- Real-time synchronization with all internal systems
- Advanced ML-based predictions or analytics
- Full user management with permissions
- Financial transaction simulation

---

## 3. Identify Risks

| ⚠️ Risk                                     | 💡 Mitigation Strategy                                  |
|--------------------------------------------|---------------------------------------------------------|
| API unreliability from INSEE/SIRENE        | Implement fallback/error-handling logic, retry queues   |
| Tight development window with small team   | Focus on MVP; use agile sprints and scope control       |
| Limited experience in data normalization   | Schedule early POCs and assign learning sessions        |
| Inconsistent open data formats/structures  | Create standardized transformation pipelines            |

---

## 4. High-Level Plan

| 🧭 Phase   | 📅 Weeks    | 🛠️ Activities                                              | 📦 Deliverables                     |
|-----------|-------------|-------------------------------------------------------------|------------------------------------|
| Phase 1   | Week 1–2    | Finalize idea, stakeholder alignment, design architecture   | Project Charter, feature roadmap   |
| Phase 2   | Week 3–4    | Source analysis, select tech stack, structure data model    | Architecture diagram, task board   |
| Phase 3   | Week 5–8    | Develop backend, frontend components, data pipeline         | MVP with test data comparisons     |
| Phase 4   | Week 9      | QA, integration testing, feedback loop                      | QA report, user feedback summary   |
| Phase 5   | Week 10     | Polishing, deployment, documentation, team presentation     | Final MVP, GitHub repo, pitch deck |

---

## 5. Technologies

| 🧱 Layer    | 🔧 Technologies                  |
|------------|----------------------------------|
| Backend    | Python (Pandas, Scrapy)          |
| Frontend   | React.js                         |
| Storage    | PostgreSQL                       |
| DevOps     | Docker, GitLab CI                |
| Others     | REST APIs, CSV/PDF export modules |

---

## ✅ Summary

This charter defines the roadmap for delivering a lightweight, scalable, and responsive platform that leverages open data sources to enhance enterprise data workflows. With well-defined roles, scoped goals, and a realistic timeline, the project is set to deliver a functional MVP that will support compliance and data quality assurance teams efficiently.