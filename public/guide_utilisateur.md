# Guide utilisateur — PEEB Med Jordan
**Assemblage ingénierie S.A.S.U. — v2.0 — 2025**

---

## Table des matières

1. [Vue d'ensemble de l'interface](#1-vue-densemble)
2. [Dashboard](#2-dashboard)
3. [Inventaire des bâtiments](#3-inventaire-des-bâtiments)
4. [Fiche bâtiment](#4-fiche-bâtiment)
5. [Carte](#5-carte)
6. [Calculateur EE](#6-calculateur-ee)
7. [Paramètres](#7-paramètres)
8. [Export PDF / Rapport](#8-export-pdf--rapport)
9. [Import de données EDGE](#9-import-de-données-edge)
10. [Logique de calcul — référence rapide](#10-logique-de-calcul)

---

## 1. Vue d'ensemble

```
┌─────────────────┬──────────────────────────────────────────────┐
│   SIDEBAR       │   HEADER  (titre de page + notifications)    │
│   Navigation    ├──────────────────────────────────────────────┤
│   + logo        │                                              │
│   + compteur    │   CONTENU PRINCIPAL                          │
│   bâtiments     │                                              │
│                 │                                              │
└─────────────────┴──────────────────────────────────────────────┘
```

### Navigation principale (sidebar gauche)
| Icône | Section | Rôle |
|-------|---------|------|
| Tableau de bord | **Dashboard** | KPIs globaux du programme |
| Bâtiment | **Buildings** | Inventaire complet |
| Carte | **Map View** | Localisation géographique |
| Calculatrice | **Calculator** | Simulateur de scénarios |
| Curseurs | **Parameters** | Paramètres monétaires et coûts |

Le badge numérique à côté de "Buildings" indique le nombre total de bâtiments en base.

---

## 2. Dashboard

### Ce qu'on y trouve
La page d'accueil agrège automatiquement tous les bâtiments de la base.

#### Bande de KPIs (ligne du haut)
| Carte | Valeur affichée |
|-------|----------------|
| **Bâtiments** | Nombre total dans la base |
| **Surface totale** | Somme des surfaces (m²) |
| **Capex total** | Somme de tous les capex (EE + GR) |
| **Énergie économisée** | kWh/an estimés sur le programme |
| **Subvention PEEB** | Total des grants PEEB calculés |

> Les valeurs s'actualisent en temps réel à chaque modification d'un bâtiment.

#### Distribution PEEB (barre de tiers)
Répartition visuelle des bâtiments par palier de financement :
- **Gris** — Non éligible / sous seuil
- **Rouge clair** — Tier 1 (≥10 % gain)
- **Rouge moyen** — Tier 2 (≥20 %)
- **Rouge** — Tier 3 (≥30 %)
- **Violet** — Tier 4 (≥40 %)

#### Tableau des bâtiments prioritaires
Les bâtiments sont triés par priorité (High → Medium → Low). Cliquer sur un nom ouvre directement la fiche du bâtiment.

---

## 3. Inventaire des bâtiments

### Accès
Cliquer sur **Buildings** dans la sidebar.

### Filtres et recherche
- **Barre de recherche** — filtre par nom, adresse ou gouvernorat (insensible à la casse)
- **Pilules de statut** — filtre par statut : Assessed / Pending Audit / Ineligible / (All)
- **Tri par colonne** — cliquer sur n'importe quel en-tête pour trier (↑ ↓)

### Colonnes du tableau
| Colonne | Description |
|---------|-------------|
| Nom | Nom du bâtiment (lien cliquable vers la fiche) |
| Typologie | School / Hospital / Office / Municipality / University |
| Gouvernorat | Région jordanienne |
| Surface | m² (cellule rouge si donnée manquante) |
| EUI | kWh/m²/an de référence (rouge si manquant) |
| Statut | Badge coloré |
| Priorité | High / Medium / Low |
| Tier PEEB | Palier de financement calculé |
| Capex total | EE + GR en JOD ou EUR selon le paramètre actif |

### Détection des lacunes (cellules rouges)
Quand une valeur critique est absente (surface, EUI, coordonnées…), la cellule s'affiche en **rouge** avec un point d'exclamation. La fiche bâtiment indique les champs à compléter.

### Ajouter un bâtiment
Bouton **+ Nouveau bâtiment** (en haut à droite) → formulaire de création avec valeurs par défaut selon la typologie sélectionnée.

### Import EDGE (batch)
Bouton **Importer EDGE** → sélectionner un fichier `.json` ou `.csv` exporté depuis EDGE → les bâtiments sont ajoutés à la base existante. Voir [section 9](#9-import-de-données-edge).

---

## 4. Fiche bâtiment

### Accès
Cliquer sur un bâtiment dans l'inventaire ou le dashboard.

### Structure de la fiche

#### 4.1 Informations générales
- Nom, typologie, gouvernorat, adresse
- Année de construction, nombre d'étages
- Surface (m²)
- Horaires d'exploitation
- Source de financement existante (GIZ, KfW, etc.)

> **Inéligibilité automatique** : si le champ "Source de financement" contient GIZ ou KfW, un bandeau d'avertissement apparaît et le bâtiment est marqué "Ineligible".

#### 4.2 Données énergétiques
- **EUI de référence** (kWh/m²/an) — consommation actuelle
- Les valeurs manquantes sont signalées en rouge
- Les valeurs issues des défauts typologiques s'affichent en *italique*

#### 4.3 Mini-carte (localisation)
Une carte Leaflet/OpenStreetMap centrée sur le bâtiment est affichée avec :
- Un marqueur rouge (cercle) positionné sur les coordonnées GPS
- Un popup avec le nom du bâtiment
- Navigation désactivée (carte fixe) pour ne pas perturber le scroll

Pour modifier la position, mettre à jour les coordonnées `[lat, lng]` dans les informations générales.

#### 4.4 Observations de terrain
Zone de texte libre pour noter les constats d'audit (ponts thermiques, état de l'enveloppe, équipements, etc.).

#### 4.5 Mesures — Efficacité énergétique (EE)
Les 5 mesures EE sont configurables individuellement :

| Mesure | Capex par défaut (JOD/m²) | Économie de base |
|--------|--------------------------|-----------------|
| Isolation | selon typologie | 15 % |
| Fenêtres | selon typologie | 12 % |
| HVAC | selon typologie | 25 % |
| Éclairage | selon typologie | 30 % |
| Photovoltaïque | selon typologie | 20 % |

**Synergie thermique** : si Isolation ET/OU Fenêtres sont sélectionnées, le capex HVAC est automatiquement réduit de **−20 %** et son efficacité augmentée de **+15 %**. Un bandeau d'information le signale.

Pour chaque mesure :
- ☐ Cocher pour l'inclure dans le calcul
- Modifier le capex (JOD/m²) si différent du défaut
- Modifier le taux d'économie (%) si audité précisément

#### 4.6 Mesures — Réhabilitation globale (GR)
3 mesures non-énergétiques à taux d'économie **toujours 0 %** :

| Mesure | Rôle |
|--------|------|
| Structure | Travaux structurels |
| Accessibilité | Mise aux normes PMR |
| Hygiène & Sécurité | Conformité sanitaire et sécurité incendie |

Ces mesures sont incluses dans le capex total mais **n'entrent pas** dans le calcul du gain énergétique ni dans l'assiette de la subvention PEEB.

#### 4.7 Sources de financement
Trois champs de saisie (en JOD) :
- **Prêt AFD** — montant du prêt Agence Française de Développement
- **Budget national** — contribution de l'État jordanien
- **Autres** — autres bailleurs (UE, USAID, fonds propres…)

#### 4.8 Résultats calculés (panneau de droite)
| Indicateur | Description |
|------------|-------------|
| Gain énergétique | % de réduction de consommation (mesures EE uniquement) |
| Tier PEEB | Palier de subvention atteint (T1 à T4) |
| Taux de subvention | % appliqué au capex EE |
| Capex EE | Coût total des mesures d'efficacité énergétique |
| Capex GR | Coût total des mesures de réhabilitation globale |
| Capex total | EE + GR |
| Subvention PEEB | Montant calculé (sur capex EE uniquement) |
| Coût net | Capex total − subvention PEEB − financements tiers |

#### 4.9 Photos du bâtiment
- Bouton **+ Ajouter une photo** → sélectionner une image locale
- Les photos s'affichent en grille
- Cliquer sur × pour supprimer une photo
- Les photos sont incluses dans l'export PDF

#### 4.10 Export PDF
Bouton **Imprimer / Exporter PDF** → ouvre la fenêtre d'impression du navigateur.
Le rapport imprimé inclut :
- En-tête Assemblage ingénierie
- Informations générales et données énergétiques
- Localisation (coordonnées GPS + lien OSM)
- Mesures sélectionnées et résultats financiers
- Photos
- Observations de terrain

> La sidebar, le header et la mini-carte interactive sont masqués à l'impression ; une version statique de la localisation est affichée.

---

## 5. Carte

### Accès
Cliquer sur **Map View** dans la sidebar.

### Fonctionnalités
- Carte OpenStreetMap centrée sur la Jordanie
- **Marqueurs colorés** par tier PEEB :
  - Gris — non éligible
  - Rouge clair → rouge → violet — T1 à T4
  - Rouge vif — inéligible (bailleur concurrent)
- **Cliquer sur un marqueur** → popup avec nom, typologie, EUI, tier
- **Cliquer sur "Voir la fiche"** dans le popup → ouvre la fiche bâtiment

---

## 6. Calculateur EE

Le calculateur est un outil **autonome** (non lié à un bâtiment spécifique) pour modéliser rapidement des scénarios.

### Accès
Cliquer sur **Calculator** dans la sidebar.

### 6.1 Paramètres bâtiment
- **Typologie** — charge les valeurs par défaut correspondantes
- **Surface** (m²)
- **EUI de référence** (kWh/m²/an)

### 6.2 Mesures — Efficacité énergétique
Mêmes 5 mesures EE qu'en fiche bâtiment, configurables individuellement (capex + taux d'économie). La synergie thermique s'applique de la même façon.

### 6.3 Mesures — Réhabilitation globale
Mêmes 3 mesures GR, taux d'économie verrouillé à 0 %.

### 6.4 Sources de financement
- **Subvention PEEB** — calculée automatiquement (lecture seule)
- **Prêt AFD** — saisir le montant envisagé
- **Budget national** — saisir la contribution nationale
- **Autres** — autres financements
- **Coût net** — mis à jour en temps réel

### 6.5 Résultats
- **Carte Tier PEEB** — palier atteint avec taux de subvention
- **Répartition du capex** — EE vs GR, avec note sur éligibilité PEEB et AFD
- **KPIs énergétiques** — gain %, kWh économisés/an, économie annuelle en JOD/EUR
- **Tableau de référence PEEB** — tous les paliers et taux

---

## 7. Paramètres

### Accès
Cliquer sur **Parameters** dans la sidebar.

### 7.1 Devise et taux de change
- **Basculer JOD ↔ EUR** — toutes les valeurs monétaires de l'application s'actualisent
- **Taux de change** — modifiable (défaut : 1 JOD = 1,41 EUR)

### 7.2 Coût de l'énergie
- Coût du kWh en JOD — utilisé pour calculer les économies annuelles en valeur monétaire

### 7.3 Coûts unitaires par mesure
Coûts par défaut en JOD/m² pour chacune des 8 mesures, modifiables globalement ici.

> Ces valeurs sont les **défauts** chargés à la création d'un bâtiment ou dans le calculateur. Les valeurs saisies dans une fiche individuelle priment sur ces défauts.

### 7.4 Tableau de référence PEEB
Rappel des 4 paliers de financement et taux de subvention correspondants.

---

## 8. Export PDF / Rapport

### Depuis une fiche bâtiment
1. Ouvrir la fiche du bâtiment
2. Cliquer sur **Imprimer / Exporter PDF**
3. Dans la fenêtre du navigateur, choisir "Enregistrer en PDF" comme imprimante
4. Recommandé : format A4, marges normales, activer "Graphiques d'arrière-plan"

### Contenu du rapport
- Logo Assemblage ingénierie
- Identité du bâtiment (nom, typologie, gouvernorat, adresse, coordonnées GPS)
- Données énergétiques et surface
- Mesures sélectionnées avec capex détaillé
- Résultats : gain énergétique, tier PEEB, subvention, coût net
- Galerie photos
- Observations de terrain
- Pied de page Assemblage ingénierie avec date

---

## 9. Import de données EDGE

EDGE (Excellence in Design for Greater Efficiencies) est l'outil IFC de certification énergétique des bâtiments.

### Format JSON EDGE
```json
{
  "buildingName": "Nom du bâtiment",
  "typology": "School",
  "area": 2400,
  "baselineEUI": 82,
  "measures": { ... }
}
```

### Format CSV EDGE
```
name,typology,area,baselineEUI,governorate,...
Al-Hussain School,School,2400,82,Amman,...
```

### Procédure d'import
1. Aller dans **Buildings**
2. Cliquer sur **Importer EDGE**
3. Sélectionner le fichier `.json` ou `.csv`
4. Les bâtiments importés s'ajoutent à la base existante
5. Les champs manquants sont signalés en rouge dans l'inventaire

---

## 10. Logique de calcul

### Gain énergétique
Calculé uniquement sur les mesures **EE** (insulation, fenêtres, HVAC, éclairage, PV).

Modèle à rendements décroissants composés :
```
gain = 1 − ∏(1 − rᵢ)  pour chaque mesure i sélectionnée
```
où `rᵢ` est le taux d'économie de la mesure i (après application de la synergie thermique).

### Synergie thermique
Si isolation **ou** fenêtres est sélectionnée :
- Capex HVAC × **0,80** (réduction de 20 %)
- Taux d'économie HVAC × **1,15** (bonus de 15 %)

### Paliers PEEB
| Tier | Gain énergétique minimum | Taux de subvention |
|------|--------------------------|-------------------|
| — | < 10 % | 0 % |
| T1 | ≥ 10 % | 50 % |
| T2 | ≥ 20 % | 60 % |
| T3 | ≥ 30 % | 70 % |
| T4 | ≥ 40 % | 80 % |

La subvention PEEB s'applique **uniquement au capex EE** — le capex GR (structure, accessibilité, hygiène) est éligible au **Prêt AFD** mais pas à la subvention PEEB.

### Coût net
```
Coût net = Capex EE + Capex GR − Subvention PEEB − Prêt AFD − Budget national − Autres
```

---

*Guide généré par Assemblage ingénierie — PEEB Med Jordan 2025*
*Pour toute question : contact@assemblage.net*
