# Green Gamers

A full-stack MERN eco-gamification web application that combines plant collection & care tracking (`hortusfox-web`), AI species & health diagnostics (`Green-Sense`), HTML5 Canvas foliage growth measurement (`plant-growth-tracker`), and a live Smart Plantation Location Advisor powered by Open-Meteo & Leaflet.

## Tech Stack
- **Frontend:** React.js (Vite), Tailwind CSS, `lucide-react`, `recharts`, `leaflet`, `react-leaflet`
- **Backend:** Node.js, Express.js (ES modules), Mongoose, JWT (`jsonwebtoken`), `bcryptjs`, `multer`
- **Media & AI:** Cloudinary SDK (automatic base64 data-URL fallback when `CLOUDINARY_*` env vars are empty), Google Gemini Vision REST API `gemini-2.5-flash` (deterministic fallback when `GEMINI_API_KEY` is empty)
- **Geospatial & Climate:** MongoDB `2dsphere` index (`$near` 2500m), Open-Meteo Air Quality & Weather APIs, OpenStreetMap tiles

## Prerequisites
- Node.js 18+ (tested with Node 24)
- MongoDB running locally (`mongodb://127.0.0.1:27017/green_gamers`) or a MongoDB Atlas URI

## Setup Instructions

### 1. Backend Setup
```bash
cd server
npm install
```
Copy `.env.example` to `.env` and customize values if needed:
```bash
cp .env.example .env
```
Environment variables (`server/.env`):
- `PORT=5000`
- `MONGO_URI=mongodb://127.0.0.1:27017/green_gamers`
- `JWT_SECRET=your_super_secret_jwt_key`
- `CLIENT_URL=http://localhost:5173`
- `CLOUDINARY_CLOUD_NAME=` *(optional — falls back to local data-URL if blank)*
- `CLOUDINARY_API_KEY=` *(optional)*
- `CLOUDINARY_API_SECRET=` *(optional)*
- `GEMINI_API_KEY=` *(optional — falls back to deterministic species & health analysis if blank)*

Start the backend server:
```bash
npm run dev
# or
npm start
```
The API runs on `http://localhost:5000/api`.

### 2. Frontend Setup
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
The frontend runs on `http://localhost:5173` and connects to `http://localhost:5000/api` by default (override via `VITE_API_URL` in `client/.env` if needed).

## Core Features & XP Economy
- **Register Plant:** `+50 XP` + automatic watering & fertilizing reminders
- **Priority Zone Plantation:** `+50 Bonus XP` when planting in an advised priority spot
- **Canvas Visual Growth Update:** `+20 XP` (calculates `greenPixels`, `canopyCoveragePct`, `growthPercentage`, estimated height, and AI health status)
- **Complete Care Reminder:** `+20 XP` (and schedules the next recurring reminder)
- **Green-Sense AI Scan:** `+15 XP`
- **Join Eco Challenge:** `+25 XP`
