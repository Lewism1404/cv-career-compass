# CV Career Compass

CV Career Compass is a full-stack web application that helps graduates identify suitable technology roles and improve their CV for a specific job.

The application combines a career questionnaire with role-specific CV analysis. Users can create an account, save CVs, receive structured feedback, review missing keywords and track recommended improvements over time.

## Main features

- Email/password and Google authentication through Supabase
- Graduate technology career questionnaire
- Personalised role recommendations
- CV text upload and storage
- Role-specific CV scoring and feedback
- ATS and keyword analysis
- Previous analysis history
- Trackable recommendation items
- Responsive dashboard

## Technology

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Tailwind CSS
- Supabase Authentication and PostgreSQL
- OpenAI-compatible AI API
- Zod validation
- React Query

## Running the project locally

### Requirements

- Node.js 20 or newer
- A Supabase project
- An API key for an OpenAI-compatible AI provider

### Installation

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, copy the environment file with:

```powershell
Copy-Item .env.example .env
```

The development server runs at `http://localhost:3000`.

## Environment variables

Add these values to `.env`:

```env
SUPABASE_PROJECT_ID=your_project_id
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

AI_API_KEY=your_api_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
AI_APP_NAME=CV Career Compass
AI_SITE_URL=http://localhost:3000
```

Never commit `.env`, service-role keys or private API keys.

## Database setup

Run the SQL migration files in `supabase/migrations` against your Supabase project. The migrations create the CV, questionnaire, analysis and recommendation tables, including row-level security policies.

For Google login, enable the Google provider in Supabase Authentication and add your local and deployed callback URLs to the Supabase redirect allow list.

## Useful commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run format
```

## Project structure

```text
src/
  components/       Shared user-interface components
  integrations/     Supabase client and authentication middleware
  lib/              CV, questionnaire and AI server functions
  routes/           Application pages and route definitions
supabase/
  migrations/       Database schema and security policies
public/             Static files
```

## How the analysis works

1. The user selects a target role and optionally supplies a job description.
2. The application sends the CV text and role requirements to the configured AI provider.
3. The response is validated and stored as structured JSON.
4. The dashboard displays scores, strengths, weaknesses, keywords and prioritised recommendations.
5. Recommendation items can be tracked as todo, in progress, completed or not applicable.

The analysis prompt explicitly prevents invented qualifications or achievements. Suggested wording uses placeholders where the user must provide evidence or metrics.

## Future development

- Parse text directly from PDF and DOCX files
- Compare multiple CV versions
- Import job descriptions from application links
- Add application tracking
- Add automated tests for server functions and core user flows
- Improve accessibility and keyboard navigation

## Author

Lewis Murdoch
