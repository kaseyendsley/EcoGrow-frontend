# EcoGrow 🌱 (Frontend)

EcoGrow helps users build climate-conscious habits through sustainability quests. Users can create and undertake challenges across categories like food, transportation, and energy, share their progress with photos and reflections, and connect with users who share their values. Whether it’s reducing waste, trying eco-friendly swaps, or learning new green habits, EcoGrow makes sustainable living approachable and fun.

The backend for EcoGrow, built with Python, Django, Django REST Framework, and Poetry, can be found here:[EcoGrow Backend Repository](https://github.com/kaseyendsley/EcoGrow-backend)

---

## Features
- Next.js 14+ with **App Router** and **TypeScript**
- **TailwindCSS** pre-configured for styling
- **TanStack Query** integrated for API data fetching
- Example `/health` page that fetches from a backend `/health` endpoint

---

## Requirements
- [Node.js](https://nodejs.org/) 18+ (recommended)
- npm (installed with Node)

---

## Getting Started

1. **Clone the Repo**
   ```
   git clone <this-repo-url>
   cd nextjs-django-template-frontend
   ```

2. **Install Dependencies**
   ```
   npm install
   ```

3. **Run Development Server**
   ```
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to view the app.

4. **Health Page**
   - Make sure the backend template is running: [http://127.0.0.1:8000](http://127.0.0.1:8000)
   - Visit [http://localhost:3000/health](http://localhost:3000/health) to see a live API check.

---

## Project Structure
```
src/
 └─ app/
      ├─ health/page.tsx    # Fetches /health from backend
      ├─ layout.tsx         # Root layout wrapped with QueryClientProvider
      ├─ page.tsx           # Default homepage
      ├─ globals.css        # Global styles (Tailwind)
```

---


## License
This template is free to use and modify for any personal or professional projects.
