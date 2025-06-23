# OptiGains Nutrition

A comprehensive nutrition tracking app designed for bodybuilders and fitness enthusiasts, complementing the OptiGains Workout Tracker.

## Features (Planned)

### 1. Adaptive Nutrition Coaching
- Auto-adjust calories/macros weekly based on weight and intake data
- Support for multiple goal modes: Maintenance, Gain (lean bulk), Cut, Recomp
- Smart detection of adherence and progress

### 2. Detailed Macro Tracking
- Custom macro targets (protein, carbs, fats, fiber)
- Meal templates for easy logging
- Food quality metrics (saturated fat, sugar)

### 3. Dynamic TDEE Estimation
- Track metabolic adaptation during bulks and cuts
- Use actual intake and weight data for accuracy
- Signal when to implement diet breaks

### 4. Flexible Coaching Styles
- **Coached**: Fully automated adjustments
- **Manual**: You set all targets
- **Collaborative**: AI suggests, you approve

### 5. Smart Food Database
- Barcode scanner integration
- Custom food creation
- Favorite foods for quick access
- USDA database integration

### 6. Progress Analytics
- Weight trend analysis
- Visual progress tracking
- Weekly check-ins with photos
- Correlation with training phases

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Authentication**: Clerk (shared with workout app)
- **Database**: Supabase with Row Level Security
- **Deployment**: Vercel

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (already configured in .env)

3. Run development server:
```bash
npm run dev
```

## Integration with OptiGains Workout

This app is designed to work alongside the OptiGains Workout Tracker:
- Shared authentication (same Clerk account)
- Future features: Training-based nutrition adjustments
- Unified progress tracking across both apps

## Roadmap

1. **Phase 1 (MVP)**: Basic macro tracking and daily logging
2. **Phase 2**: TDEE calculation and weekly adjustments
3. **Phase 3**: Barcode scanning and meal templates
4. **Phase 4**: Integration with workout app for holistic tracking