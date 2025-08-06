# Next.js + Django Fullstack Template (Frontend)

This is the **Next.js + TypeScript + TailwindCSS** frontend template for full-stack projects.  
It is designed to pair with the [Django + Django REST Framework backend template](https://github.com/kaseyendsley/nextjs-django-template-backend).

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

## Next Steps
- Add reusable UI components under `src/components/`
- Add environment variable support for API base URL
- Add additional pages and API calls as needed

---

## License
This template is free to use and modify for any personal or professional projects.
