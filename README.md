# Noter element - Prototype af nyt element til PlaNet

## Projektbeskrivelse

Dette projekt er en prototype af et nyt element i værktøjet PlaNet, som kan håndtere opgaver, noter og lister uden et tidspunkt. Prototypen er udviklet fra en fagpersons synsvinkel og demonstrerer hvordan fagpersoner kan administrere deres egne noter samt se og dele noter med deres borgere.

## Formål

Dette projekt er udviklet som en prototype som illustrere hvordan et nyt element til PlaNet værktøjet, kan se ud og hvad det skal indholde.

## Funktioner

### Fagpersonens Perspektiv
- **Egne noter**: Fagpersonen kan oprette, redigere og administrere deres egne noter
- **Borgernes noter**: Fagpersonen kan se og redigere og oprette noter tilhørende deres borgere
- **Deling af noter**: Fagpersonen kan dele noter til deres borgere

### Hardkodede Brugere
I prototypen er der implementeret tre hardkodede brugere:
- **Fagperson** (standardbruger) - kan se alle noter
- **Ane** - borger
- **Simon** - borger


## Teknisk Arkitektur

### Frontend
- **Next.js 15** med TypeScript
- **React 18** med hooks
- **Tailwind CSS** til styling
- **Radix UI** komponenter
- **Framer Motion** til animationer

### Backend
- **Express.js** server
- **SQLite** database
- **RESTful API** endpoints
- **CORS** understøttelse

### Database Struktur
- **Checked Notes tabel**: Afsluttede/afkrydsede noter

## Installation

### Forudsætninger
- Node.js (version 18 eller nyere)
- npm

### Frontend Setup
```bash
npm install

# Start udviklingsserver
npm run dev
```

### Backend Setup
```bash
# Gå til server mappen
cd server

# Installer dependencies
npm install

# Start server
npm run dev
```
## API Endpoints

### Noter
- `GET /notes/:user` - Hent noter for en specifik bruger
- `POST /notes` - Opret ny note
- `PUT /notes/:id` - Opdater eksisterende note
- `DELETE /notes/:id` - Slet note

### Afkrydsede Noter
- `GET /checked-notes/:user` - Hent afkrydsede noter
- `POST /checked-notes` - Opret afkrydset note
- `PUT /checked-notes/:id` - Opdater afkrydset note
- `DELETE /checked-notes/:id` - Slet afkrydset note

## Server Deployment

Koden er udviklet til at blive sat op på en server. Backend serveren kan deployes på enhver Node.js hosting platform

### Produktions Setup
1. Konfigurer miljøvariabler
2. Sæt database op (SQLite eller PostgreSQL)
3. Konfigurer CORS for frontend domæne
4. Start server med `npm start`


