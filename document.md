# Company Platform

---

## 1. Idea Evaluation

### Evaluation Criteria  
- **Feasibility**: Technical complexity, available resources, and required time.  
- **Potential Impact**: Value to users, efficiency improvements, or revenue potential.  
- **Technical Alignment**: Compatibility with existing systems (e.g., SI data).  
- **Scalability**: Ability to handle increased data or user volume.  

### Scoring Rubric  
| Idea                       | Feasibility (1-5) | Impact (1-5) | Technical Alignment (1-5) | Scalability (1-5) | Total |  
|----------------------------|-------------------|--------------|---------------------------|-------------------|-------|  
| Automated Data Aggregation | 4                 | 5            | 5                         | 4                 | **18**|  
| AI-Driven Data Comparison  | 2                 | 4            | 3                         | 3                 | **12**|  
| User Dashboard             | 3                 | 3            | 4                         | 4                 | **14**|  

### Risks and Constraints  
- **Automated Data Aggregation**: Risks include reliability of data sources and API rate limits. Constraints: requires integration with SI systems.  
- **AI-Driven Comparison**: High technical complexity and reliance on clean datasets.  
- **User Dashboard**: Requires UI/UX expertise and may increase development time.  

---

## 2. Decision and Refinement

### Selected MVP  
**Automated Data Aggregation and Comparison Tool**  
- **Rationale**: Highest score in feasibility, impact, and alignment. Solves key pain points of manual data collection.

### Enhancements for Pre-Assigned MVP  
- Add real-time data synchronization.  
- Include basic visualization for comparison results.  

### Refined Concept  
- **Problem Solved**: Reduces manual effort in collecting and validating open data against internal systems.  
- **Target Audience**: Business analysts, compliance teams, and enterprise users.  
- **Key Features**:  
  - API integrations with open data sources  
  - Automated comparison engine  
  - Exportable reports  
- **Expected Outcomes**:  
  - 50% reduction in data collection time  
  - Improved accuracy in compliance reporting  

---

## 3. Idea Development Documentation

### All Considered Ideas  
1. **Automated Data Aggregation**  
   - *Strengths*: High impact, aligns with internal systems  
   - *Weaknesses*: Requires API expertise  
   - *Rejection Reason*: None (selected)  
2. **AI-Driven Comparison**  
   - *Strengths*: Advanced analysis  
   - *Weaknesses*: High complexity, longer development time  
   - *Rejection Reason*: Not feasible for MVP  
3. **User Dashboard**  
   - *Strengths*: User-friendly interface  
   - *Weaknesses*: Secondary to core functionality  
   - *Rejection Reason*: Postponed to Phase 2  

### Selected MVP Summary  
- **Rationale**: Solves the most urgent need for efficient data aggregation and validation  
- **Potential Impact**: Streamlines compliance processes and reduces operational costs  

### Team Formation & Process  
- **Team Roles**:  
  - Project Manager: Oversees timelines  
  - Backend Developer: API integrations  
  - Data Engineer: Data pipeline design  
- **Process**: Agile sprints, weekly reviews, and stakeholder feedback  

---

## 4. Team Formation & Organization

The team consists of two members:

- **Maxime**: Responsible for the **front-end** of the platform. He will develop the user interface, integrate APIs, and ensure a smooth user experience.  
- **Giovanni**: Responsible for the **back-end**. He will design the database, develop necessary APIs, and handle all business logic including company and banking modules.  
- **Shared Project Management**: Both members will collaborate closely to make functional and technical decisions and ensure overall consistency of the project.  

---

## 5. Technical Stack & Tools

### Planned Technologies:

- **Front-end**:  
  - Framework: React.js with Vite or Next.js  
  - UI: Tailwind CSS for a fast and responsive interface  
  - Libraries: Axios for API calls, React Query or Zustand for state management  

- **Back-end**:  
  - Language: Node.js with Express  
  - Database: PostgreSQL (relational) or MongoDB (if more flexibility is needed)  
  - Authentication: JWT or session-based  
  - External API: INSEE / Sirene API for company data  

- **Project Management**:  
  - GitHub for code collaboration and versioning  
  - Trello or Notion for task tracking  
  - Regular team meetings for coordination  

### Proposed Architecture:

- **REST API** architecture between front-end and back-end  
- Front-end decoupled for potential mobile version in the future  
- Company data stored in database for performance and advanced search  
- Secure simulation of banking operations  

---

## 6. Next Steps

- [ ] Finalize UI/UX wireframes  
- [ ] Implement the database  
- [ ] Integrate INSEE/SIRENE API  
- [ ] Front-end development by Maxime  
- [ ] Back-end development by Giovanni  
- [ ] Functional testing of the MVP  
- [ ] Deploy a demo version  

---

## 7. Final Objective

To deliver a **fast, intuitive, and complete platform** allowing users to **access official French company data** and simulate or interact with simplified banking services.

The project is designed to be **scalable**, with possible future features such as:

- Custom dashboards  
- Data export functionality  
- Analytical tools integration  
- Secure multi-user access
