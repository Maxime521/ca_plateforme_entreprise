# 🚀 Plateforme de recherche d'entreprises

Bonjour à tous ! Voici comment on a organisé le développement de notre super plateforme de recherche d'entreprises.

---

## 📅 0. On a commencé par planifier

**Le but** : Ne pas se lancer tête baissée comme des fous !

**Ce qu'on a fait** :
- On a listé toutes les fonctionnalités dont on avait besoin
- On a trié par importance :
  - 🔥 **Indispensable** : Recherche par SIRET/SIREN
  - 👍 **Super important** : Recherche par nom
  - 💅 **Si on a le temps** : Un joli export PDF
- On a fait des sprints de 2 semaines (parce qu'une semaine c'est trop court, et trois c'est trop long)

---

## 👨‍💻 1. On s'est mis à coder

**Le but** : Transformer le café en code fonctionnel !

**Notre organisation** :
- **Les API** : On a connecté l'API INSEE pour récupérer les infos entreprises
- **L'interface** : Création d'un formulaire de recherche simple et efficace
- **Le workflow** :
  - Chaque nouvelle fonctionnalité = une nouvelle branche Git
  - Pas de merge sans validation par un collègue

---

## 📊 2. On a surveillé l'avancement

**Le but** : Vérifier qu'on n'était pas en retard (trop)

**Notre routine** :
- Petit stand-up quotidien de 15min max :
  - "Hier j'ai fini la recherche par SIREN"
  - "Aujourd'hui je m'attaque à l'affichage des résultats"
  - "J'ai un problème avec l'API INSEE qui limite les requêtes"
- On a suivi notre vitesse
- Quand on voyait un retard, on s'adaptait

---

## 🔍 3. On a fait le point chaque fin de sprint

**Le but** : Apprendre de nos erreurs (et se féliciter !)

**Notre rituel** :
1. **Rétrospective** :
   - 😍 Ce qui a bien marché : La communication entre devs

---

## 🧪 4. On a tout testé sérieusement

**Le but** : Éviter les "ça marchait sur ma machine" !

**Notre processus qualité** :
- Tests d'intégration :
  - Est-ce que le front affiche bien les données de l'API ?
  - Que se passe-t-il si on entre un SIRET bidon ?
- Tests manuels :
  - "Ça marche sur Chrome ? Sur Firefox ? Sur Edge ?"
  - "Et sur mobile ?"
  
