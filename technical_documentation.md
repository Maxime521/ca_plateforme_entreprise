# 📋 Technical Documentation: Enterprise Data Aggregation & Comparison Platform

## 0. User Stories and Mockups

### Prioritized User Stories (MoSCoW Method)

#### Must Have (M)
1. **US-001**: As a compliance officer, I want to search for French enterprise data using SIRET/SIREN numbers, so that I can validate company information against our internal systems.
2. **US-002**: As a data analyst, I want to compare retrieved enterprise data with internal records, so that I can identify discrepancies and data quality issues.
3. **US-003**: As a compliance officer, I want to export comparison results to CSV and PDF formats, so that I can share findings with stakeholders and maintain audit trails.
4. **US-004**: As a user, I want to view enterprise data in a structured format, so that I can easily understand company information (name, address, activity codes, etc.).

#### Should Have (S)
5. **US-005**: As a data analyst, I want to batch process multiple enterprise searches, so that I can efficiently validate large datasets.
6. **US-006**: As a user, I want to see the data source and last update timestamp, so that I can assess data freshness and reliability.
7. **US-007**: As a compliance officer, I want to filter and sort comparison results, so that I can focus on specific discrepancies or patterns.

#### Could Have (C)
8. **US-008**: As a user, I want to save frequently used search queries, so that I can quickly repeat common validation tasks.
9. **US-009**: As a user, I want to see a dashboard with recent searches and statistics, so that I can track my validation activities.

#### Won't Have (W)
10. **US-010**: As a user, I want real-time notifications when external data changes, so that I can proactively update internal records. (Out of scope for MVP)

### Key UI Mockups Description
- **Search Interface**: Clean search form with SIRET/SIREN input field and search button
- **Results Display**: Split-screen layout showing external data on left, internal data on right, with highlighted differences
- **Comparison Dashboard**: Table view with filtering options and export buttons
- **Report Preview**: Modal or separate page showing formatted comparison report before export

---

## 1. System Architecture

### High-Level Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   React.js      │    │   Python/Flask   │    │   INSEE/SIRENE      │
│   Frontend      │◄──►│   Backend API    │◄──►│   External APIs     │
│                 │    │                  │    │                     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
         │                        │
         │                        ▼
         │              ┌──────────────────┐
         │              │   PostgreSQL     │
         └──────────────►│   Database       │
                        │                  │
                        └──────────────────┘

Data Flow:
1. User initiates search through React frontend
2. Frontend sends API request to Flask backend
3. Backend queries INSEE/SIRENE APIs for enterprise data
4. Backend processes and stores data in PostgreSQL
5. Backend compares external data with internal records
6. Results returned to frontend for display
7. User can export results as CSV/PDF
```

### Component Responsibilities
- **Frontend**: User interface, data visualization, export functionality
- **Backend API**: Business logic, data processing, external API integration
- **Database**: Data persistence, caching, internal records storage
- **External APIs**: Source of truth for French enterprise data

---

## 2. Components, Classes, and Database Design

### Backend Components and Classes

#### Core Classes

```python
# models/enterprise.py
class Enterprise:
    def __init__(self):
        self.siret: str
        self.siren: str
        self.company_name: str
        self.legal_form: str
        self.address: dict
        self.activity_code: str
        self.activity_description: str
        self.creation_date: datetime
        self.status: str
        self.employee_count: int
        self.last_updated: datetime
    
    def to_dict(self) -> dict
    def from_insee_data(self, data: dict) -> 'Enterprise'

# services/data_aggregator.py
class DataAggregator:
    def __init__(self, api_client: APIClient):
        self.api_client = api_client
        self.db_manager = DatabaseManager()
    
    def fetch_enterprise_data(self, identifier: str) -> Enterprise
    def process_and_store(self, enterprise: Enterprise) -> bool
    def compare_with_internal(self, external_data: Enterprise) -> ComparisonResult

# services/comparison_engine.py
class ComparisonEngine:
    def compare_enterprises(self, external: Enterprise, internal: Enterprise) -> ComparisonResult
    def generate_report(self, comparison: ComparisonResult, format: str) -> bytes
    def highlight_differences(self, comparison: ComparisonResult) -> dict

# utils/api_client.py
class APIClient:
    def __init__(self, base_url: str, api_key: str = None):
        self.base_url = base_url
        self.session = requests.Session()
    
    def get_enterprise_by_siret(self, siret: str) -> dict
    def get_enterprise_by_siren(self, siren: str) -> dict
    def handle_api_errors(self, response: requests.Response) -> dict
```

#### Frontend Components

```javascript
// components/SearchForm.jsx
const SearchForm = ({ onSearch, loading }) => {
  // Handles user input and search submission
}

// components/ComparisonView.jsx
const ComparisonView = ({ externalData, internalData, differences }) => {
  // Displays side-by-side comparison with highlighted differences
}

// components/ResultsTable.jsx
const ResultsTable = ({ results, onFilter, onSort, onExport }) => {
  // Displays tabular results with sorting and filtering
}

// components/ExportButtons.jsx
const ExportButtons = ({ data, onExport }) => {
  // Handles CSV and PDF export functionality
}
```

### Database Design (PostgreSQL)

#### Entity-Relationship Diagram

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│    enterprises      │     │    comparisons      │     │    internal_records │
├─────────────────────┤     ├─────────────────────┤     ├─────────────────────┤
│ id (PK)            │     │ id (PK)            │     │ id (PK)            │
│ siret              │◄────┤ enterprise_id (FK) │     │ siret              │
│ siren              │     │ internal_record_id │────►│ siren              │
│ company_name       │     │ comparison_date    │     │ company_name       │
│ legal_form         │     │ differences_json   │     │ legal_form         │
│ address_json       │     │ similarity_score   │     │ address_json       │
│ activity_code      │     │ status             │     │ activity_code      │
│ activity_desc      │     │ created_at         │     │ activity_desc      │
│ creation_date      │     │ updated_at         │     │ creation_date      │
│ status             │     └─────────────────────┘     │ status             │
│ employee_count     │                                 │ employee_count     │
│ data_source        │                                 │ data_source        │
│ last_updated       │                                 │ last_updated       │
│ created_at         │                                 │ created_at         │
│ updated_at         │                                 │ updated_at         │
└─────────────────────┘                                 └─────────────────────┘

┌─────────────────────┐
│    search_history   │
├─────────────────────┤
│ id (PK)            │
│ search_term        │
│ search_type        │
│ results_count      │
│ user_session       │
│ created_at         │
└─────────────────────┘
```

#### Table Schemas

```sql
-- External enterprise data from INSEE/SIRENE
CREATE TABLE enterprises (
    id SERIAL PRIMARY KEY,
    siret VARCHAR(14) UNIQUE NOT NULL,
    siren VARCHAR(9) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    legal_form VARCHAR(100),
    address_json JSONB,
    activity_code VARCHAR(10),
    activity_description TEXT,
    creation_date DATE,
    status VARCHAR(50),
    employee_count INTEGER,
    data_source VARCHAR(50) DEFAULT 'INSEE',
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Internal system records for comparison
CREATE TABLE internal_records (
    id SERIAL PRIMARY KEY,
    siret VARCHAR(14) UNIQUE,
    siren VARCHAR(9),
    company_name VARCHAR(255),
    legal_form VARCHAR(100),
    address_json JSONB,
    activity_code VARCHAR(10),
    activity_description TEXT,
    creation_date DATE,
    status VARCHAR(50),
    employee_count INTEGER,
    data_source VARCHAR(50) DEFAULT 'INTERNAL',
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comparison results and analysis
CREATE TABLE comparisons (
    id SERIAL PRIMARY KEY,
    enterprise_id INTEGER REFERENCES enterprises(id),
    internal_record_id INTEGER REFERENCES internal_records(id),
    comparison_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    differences_json JSONB,
    similarity_score DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search history for analytics
CREATE TABLE search_history (
    id SERIAL PRIMARY KEY,
    search_term VARCHAR(255),
    search_type VARCHAR(20),
    results_count INTEGER,
    user_session VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. High-Level Sequence Diagrams

### Sequence 1: Enterprise Data Search and Retrieval

```
User → Frontend → Backend → INSEE API → Database
  │        │         │          │          │
  ├─1─────►│         │          │          │ Search request (SIRET)
  │        ├─2──────►│          │          │ API call (/api/search)
  │        │         ├─3───────►│          │ Query INSEE API
  │        │         │◄─4───────┤          │ Enterprise data response
  │        │         ├─5──────────────────►│ Store/update enterprise data
  │        │         │◄─6──────────────────┤ Confirm storage
  │        │◄─7──────┤          │          │ Formatted response
  │◄─8─────┤         │          │          │ Display results
```

### Sequence 2: Data Comparison Process

```
User → Frontend → Backend → Database → Comparison Engine
  │        │         │          │              │
  ├─1─────►│         │          │              │ Compare request
  │        ├─2──────►│          │              │ API call (/api/compare)
  │        │         ├─3──────►│              │ Fetch external data
  │        │         │◄─4──────┤              │ External enterprise data
  │        │         ├─5──────►│              │ Fetch internal data
  │        │         │◄─6──────┤              │ Internal enterprise data
  │        │         ├─7──────────────────────►│ Compare datasets
  │        │         │◄─8──────────────────────┤ Comparison results
  │        │         ├─9──────►│              │ Store comparison
  │        │         │◄─10─────┤              │ Confirm storage
  │        │◄─11─────┤          │              │ Return results
  │◄─12────┤         │          │              │ Display comparison
```

### Sequence 3: Report Generation and Export

```
User → Frontend → Backend → Comparison Engine → Report Generator
  │        │         │              │                │
  ├─1─────►│         │              │                │ Export request (CSV/PDF)
  │        ├─2──────►│              │                │ API call (/api/export)
  │        │         ├─3────────────►│                │ Get comparison data
  │        │         │◄─4────────────┤                │ Comparison data
  │        │         ├─5──────────────────────────────►│ Generate report
  │        │         │◄─6──────────────────────────────┤ Report file (bytes)
  │        │◄─7──────┤              │                │ File download response
  │◄─8─────┤         │              │                │ Download file
```

---

## 4. API Specifications

### External APIs

#### INSEE Sirene API
- **Purpose**: Official French enterprise registry data
- **Base URL**: `https://api.insee.fr/entreprises/sirene/v3/`
- **Authentication**: Bearer token required
- **Key Endpoints**:
  - `GET /siret/{siret}` - Get enterprise by SIRET
  - `GET /siren/{siren}` - Get enterprise by SIREN
- **Rate Limits**: 30 requests/minute for free tier
- **Data Format**: JSON with nested objects for address and activity

#### Backup Data Sources
- **data.gouv.fr SIRENE**: Fallback option if INSEE API is unavailable
- **Base URL**: `https://entreprise.data.gouv.fr/api/sirene/v3/`

### Internal API Endpoints

#### Authentication
```
POST /api/auth/login
Input: { "username": "string", "password": "string" }
Output: { "token": "string", "expires_in": 3600 }
```

#### Enterprise Search
```
GET /api/enterprises/search?q={identifier}&type={siret|siren}
Input: Query parameters
Output: {
  "success": true,
  "data": {
    "siret": "12345678901234",
    "siren": "123456789",
    "company_name": "Example Company",
    "legal_form": "SAS",
    "address": {
      "street": "123 Main St",
      "city": "Paris",
      "postal_code": "75001"
    },
    "activity_code": "6201Z",
    "activity_description": "Computer programming",
    "creation_date": "2020-01-15",
    "status": "Active",
    "employee_count": 50,
    "last_updated": "2024-01-15T10:30:00Z"
  }
}
```

#### Data Comparison
```
POST /api/comparisons/create
Input: {
  "external_id": 123,
  "internal_id": 456
}
Output: {
  "success": true,
  "comparison_id": 789,
  "differences": [
    {
      "field": "company_name",
      "external_value": "ABC Corp",
      "internal_value": "ABC Corporation",
      "severity": "minor"
    }
  ],
  "similarity_score": 85.5
}
```

#### Export Reports
```
GET /api/exports/{comparison_id}?format={csv|pdf}
Input: Path parameter and query parameter
Output: Binary file download with appropriate headers
Content-Type: application/csv or application/pdf
Content-Disposition: attachment; filename="comparison_report.csv"
```

#### Batch Processing
```
POST /api/batch/process
Input: {
  "identifiers": ["12345678901234", "98765432109876"],
  "type": "siret",
  "compare_with_internal": true
}
Output: {
  "success": true,
  "batch_id": "batch_123",
  "status": "processing",
  "total_items": 2,
  "estimated_completion": "2024-01-15T11:00:00Z"
}
```

---

## 5. SCM and QA Strategies

### Source Control Management (SCM)

#### Git Branching Strategy
- **Main Branch**: Production-ready code, protected with required reviews
- **Development Branch**: Integration branch for features
- **Feature Branches**: Individual features (`feature/user-search`, `feature/export-pdf`)
- **Hotfix Branches**: Critical production fixes (`hotfix/api-timeout-fix`)

#### Workflow Process
1. Create feature branch from development
2. Implement feature with regular commits
3. Write/update tests for new functionality
4. Create pull request to development branch
5. Code review by team member (mandatory)
6. Automated testing pipeline runs
7. Merge after approval and successful tests
8. Regular merges from development to main for releases

#### Commit Convention
```
type(scope): description

Examples:
feat(search): add SIRET validation
fix(api): handle INSEE API timeout errors
docs(readme): update installation instructions
test(comparison): add unit tests for similarity scoring
```

### Quality Assurance (QA)

#### Testing Strategy

**Unit Testing (Backend)**
- **Tool**: pytest
- **Coverage**: Minimum 80% code coverage
- **Focus Areas**:
  - Data aggregation logic
  - Comparison algorithms
  - API client error handling
  - Database operations

```python
# Example unit test
def test_enterprise_comparison():
    external_data = Enterprise(company_name="ABC Corp")
    internal_data = Enterprise(company_name="ABC Corporation")
    
    comparison = ComparisonEngine().compare_enterprises(external_data, internal_data)
    
    assert comparison.similarity_score > 80
    assert len(comparison.differences) == 1
    assert comparison.differences[0].field == "company_name"
```

**Integration Testing**
- **Tool**: pytest with database fixtures
- **Focus Areas**:
  - API endpoint responses
  - Database transactions
  - External API integration

**Frontend Testing**
- **Tool**: Jest + React Testing Library
- **Focus Areas**:
  - Component rendering
  - User interactions
  - Data display accuracy

**End-to-End Testing**
- **Tool**: Cypress
- **Critical User Flows**:
  - Complete search and comparison workflow
  - Export functionality
  - Error handling scenarios

#### Continuous Integration Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test_backend:
  stage: test
  script:
    - pip install -r requirements.txt
    - pytest --cov=app tests/
    - flake8 app/

test_frontend:
  stage: test
  script:
    - npm install
    - npm run test:coverage
    - npm run lint

build_docker:
  stage: build
  script:
    - docker build -t data-platform:$CI_COMMIT_SHA .
    - docker push registry/data-platform:$CI_COMMIT_SHA

deploy_staging:
  stage: deploy
  script:
    - docker-compose up -d
  only:
    - development
```

#### Quality Gates
- All tests must pass before merge
- Code coverage must be ≥80%
- No critical security vulnerabilities (using safety, bandit)
- Performance benchmarks for API response times (<2s)
- Manual testing for critical user paths

---

## 6. Technical Justifications

### Technology Stack Rationale

#### Backend: Python with Flask
**Justification**: 
- Pandas for efficient data manipulation and comparison
- Rich ecosystem of libraries for data processing
- Flask provides lightweight, flexible API framework
- Team expertise in Python reduces learning curve
- Strong integration capabilities with PostgreSQL

#### Frontend: React.js
**Justification**:
- Component-based architecture suits the comparison interface
- Large ecosystem for data visualization (charts, tables)
- Team member (Maxime) has React experience
- Excellent performance for dynamic data updates
- Strong community support and documentation

#### Database: PostgreSQL
**Justification**:
- JSONB support for flexible data storage (addresses, metadata)
- ACID compliance for data integrity
- Excellent performance for complex queries and joins
- Built-in full-text search capabilities
- Strong compatibility with Python/SQLAlchemy

#### Containerization: Docker
**Justification**:
- Ensures consistent development and deployment environments
- Simplifies dependency management
- Enables easy scaling and deployment strategies
- Supports microservices architecture if needed in future

### Architecture Decisions

#### API-First Design
**Justification**: Separates concerns between frontend and backend, enables future integrations, supports mobile development if needed.

#### Batch Processing Support
**Justification**: Addresses real-world need for validating large datasets efficiently, prevents API rate limiting issues.

#### Flexible Data Storage
**Justification**: JSONB fields accommodate varying data structures from different sources, future-proofs against API changes.

#### Caching Strategy
**Justification**: Reduces external API calls, improves response times, provides fallback during API outages.

### Security Considerations
- API key management through environment variables
- Input validation and sanitization
- Rate limiting to prevent abuse
- Secure session management
- Regular security dependency updates

### Performance Optimizations
- Database indexing on frequently queried fields (SIRET, SIREN)
- Async processing for batch operations
- Response caching for repeated queries
- Pagination for large result sets
- Lazy loading for frontend components

---

## 7. Implementation Timeline

### Sprint Breakdown (Weeks 5-8)

**Week 5: Core Backend Development**
- Set up project structure and CI/CD pipeline
- Implement INSEE API client with error handling
- Create database models and migrations
- Basic CRUD operations for enterprises

**Week 6: Data Processing and Comparison**
- Implement data aggregation service
- Build comparison engine with similarity scoring
- Create batch processing capabilities
- Unit tests for core business logic

**Week 7: Frontend Development**
- Set up React application structure
- Implement search interface and results display
- Create comparison view with difference highlighting
- Integrate with backend APIs

**Week 8: Integration and Export Features**
- Complete API integration between frontend and backend
- Implement CSV and PDF export functionality
- End-to-end testing
- Performance optimization and bug fixes

This technical documentation provides a comprehensive blueprint for developing the Enterprise Data Aggregation & Comparison Platform MVP, ensuring all team members have clear guidance for implementation while maintaining flexibility for iterative improvements.