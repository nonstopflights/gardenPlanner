# Garden Planner

A visual-first, mobile-responsive garden planning application built with SvelteKit. Plan and track your garden with drag-and-drop bed visualization, plant management, image storage, and web search integration.

## Features

- **Visual Bed Layout**: 12 raised 4x8 beds with rounded corners, zone-based drag-and-drop plant placement
- **Plant Library**: Manage plants in three categories (Past, Want to Plant, Currently Planted)
- **Image Management**: Upload and store plant photos, automatically download images from web search
- **Web Search Integration**: Automatic search for plant varieties using Trefle.io API
- **Mobile Responsive**: Touch-friendly drag-and-drop, optimized for field updates
- **Plant Information**: Track planting dates, harvest dates, spacing, sun/water requirements, companion plants, and growing/harvesting notes

## Tech Stack

- **Framework**: SvelteKit with TypeScript
- **Database**: SQLite with Drizzle ORM
- **Styling**: Tailwind CSS
- **Drag & Drop**: @dnd-kit
- **Image Processing**: Sharp

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Generate database migrations:
```bash
npm run db:generate
```

3. Run migrations (database will be created automatically):
```bash
npm run db:migrate
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5190`

## Project Structure

```
gardenPlanner/
├── src/
│   ├── lib/
│   │   ├── db/              # Database schema, client, queries
│   │   ├── components/       # Reusable components
│   │   ├── services/         # Plant search service
│   │   └── utils/            # Utility functions
│   ├── routes/
│   │   ├── beds/             # Bed visualization page
│   │   ├── plants/           # Plant library and detail pages
│   │   └── api/              # API endpoints
│   └── app.css               # Global styles
├── static/
│   └── plant-images/         # Uploaded and web images
├── database/
│   └── garden.db             # SQLite database
└── drizzle/                  # Database migrations
```

## Usage

### Adding Plants

1. Navigate to "Plant Library" or click "Add Plant"
2. Optionally search for plant information (auto-fills form)
3. Fill in plant details and save

### Planning Your Garden

1. Go to "View Garden Beds"
2. Toggle "Show Plant Library" to see available plants
3. Drag plants from the library onto bed zones
4. Click the × button on a zone to remove a plant

### Managing Plant Information

- View full plant details by clicking on a plant card
- Edit plant information using the Edit button
- Upload images via the image upload section
- View web-sourced information if available

## Database

The application uses SQLite with the following main tables:

- `plants` - Plant information
- `beds` - Garden bed definitions (12 default beds)
- `bed_plants` - Plant-bed-zone relationships
- `plant_images` - Image references
- `plant_web_info` - Cached web search results

## Development

### Database Migrations

Generate a new migration after schema changes:
```bash
npm run db:generate
```

Apply migrations:
```bash
npm run db:migrate
```

### Building for Production

```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Notes

- Images are stored in `static/plant-images/` and optimized on upload
- Web search uses Trefle.io API (requires free API token from https://trefle.io/)
- The database is automatically initialized with 12 beds on first run
- All drag-and-drop functionality works on mobile devices

### Environment Variables

Create a `.env` file in the project root with:

```
TREFLE_API_TOKEN=your_trefle_api_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

- **TREFLE_API_TOKEN**: Get your free API token by signing up at [Trefle.io](https://trefle.io/)
- **OPENAI_API_KEY**: Required for AI plant lookup and classification. Get your key at [platform.openai.com](https://platform.openai.com/api-keys)

## License

MIT
