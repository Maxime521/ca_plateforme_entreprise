# Plateforme Entreprise

Une plateforme moderne pour rechercher et analyser les entreprises françaises en utilisant les données ouvertes officielles.

## Fonctionnalités

- **Recherche d'entreprises** : Recherche par SIREN, dénomination sociale ou adresse
- **Données détaillées** : Informations complètes issues de la base SIRENE et du RNE
- **Documents officiels** : Accès aux comptes annuels, publications BODACC, actes et statuts
- **Analyse financière** : Ratios financiers et indicateurs sectoriels
- **Interface moderne** : Design responsive et intuitive

## APIs intégrées

- **API SIRENE** (INSEE) : Données d'identification des entreprises
- **API RNE** (INPI) : Documents et actes officiels
- **API BODACC** : Publications commerciales
- **API Ratios financiers** (BCE/INPI) : Indicateurs financiers

## Installation

```bash
npm install
npm run dev
```

## Variables d'environnement

```env
INSEE_API_TOKEN=your_insee_token
RNE_API_TOKEN=your_rne_token
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Structure du projet

```
├── pages/
│   ├── api/           # API routes
│   ├── entreprise/    # Pages d'entreprise
│   └── index.js       # Page d'accueil
├── components/        # Composants React
├── utils/            # Utilitaires
└── styles/           # Styles CSS
```

## Utilisation

1. Recherchez une entreprise par nom, SIREN ou adresse
2. Consultez les informations détaillées
3. Accédez aux documents officiels
4. Analysez les ratios financiers

## API Endpoints

- `GET /api/search?q={query}` - Recherche d'entreprises
- `GET /api/entreprise/{siren}` - Détails d'une entreprise
- `GET /api/documents/{id}` - Téléchargement de documents
- `GET /api/ratios/{siren}` - Ratios financiers

## Licence

MIT License
