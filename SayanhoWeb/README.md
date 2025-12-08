# Sayanho Web Application

This is the web version of the Sayanho Electrical Diagram Application.

## Project Structure

- **Sayanho.Core**: Shared business logic and models.
- **Sayanho.Backend**: ASP.NET Core Web API.
- **Sayanho.Frontend**: React + Vite application.

## Prerequisites

- .NET 8 SDK
- Node.js (v18 or later)

## Environment Configuration

The application uses environment-specific configuration to support both local development and production deployments.

### Frontend Environment Variables

The frontend uses Vite's environment variable system with two files:

- `.env.development` - Used when running `npm run dev`
- `.env.production` - Used when running `npm run build`

These files configure the `VITE_API_URL` variable to point to the appropriate backend server.

### Backend Configuration

The backend uses ASP.NET Core's `appsettings.json` hierarchy:

- `appsettings.json` - Base configuration
- `appsettings.Development.json` - Development overrides
- `appsettings.Production.json` - Production overrides

Configuration includes logging levels and CORS allowed origins for each environment.

## How to Run Locally

### Backend

1. Navigate to `Sayanho.Backend`:
   ```bash
   cd Sayanho.Backend
   ```
2. Run in Development mode:
   ```bash
   dotnet run --environment Development
   ```
   The API will start at `http://localhost:5000`.

### Frontend

1. Navigate to `Sayanho.Frontend`:
   ```bash
   cd Sayanho.Frontend
   ```
2. Install dependencies (first time only):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

The frontend will automatically connect to the local backend using the configuration in `.env.development`.

## Production Build

### Frontend

1. Build the production bundle:
   ```bash
   cd Sayanho.Frontend
   npm run build
   ```
   The built files will be in the `dist/` directory.

2. Preview the production build locally:
   ```bash
   npm run preview
   ```

### Backend

Run the backend in Production mode:
```bash
cd Sayanho.Backend
dotnet run --environment Production
```

When deployed to a hosting service (e.g., Render, Azure), set the `ASPNETCORE_ENVIRONMENT` environment variable to `Production`.

## Features

- **Diagramming**: Drag and drop items from the toolbox, move them on the canvas.
- **Network Analysis**: Run electrical network analysis using the ported C# logic.
- **Save/Load**: Save diagrams to the backend and load them.

## Notes

- The backend uses file-based storage for diagrams in `Sayanho.Backend/Data/Diagrams`.
- Icons are served from `Sayanho.Backend/wwwroot/icons` in production or from the external icons directory in development.
- CORS origins are configured per environment in the `appsettings.json` files.
