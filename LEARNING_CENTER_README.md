# NGI Learning Center v1 - Implementation Guide

## Overview

The NGI Learning Center v1 is a comprehensive educational platform designed to teach essential business school learnings for advisory deals. It features a modern, dopamine-driven UI/UX, integrated Manim animations, AI-powered coaching, and Goldman Sachs investment banking standards validation.

## Architecture

### Frontend (Student App)
- **Location**: `apps/student/src/app/learning/`
- **Framework**: Next.js 14 with React 18
- **Styling**: Tailwind CSS with custom animations
- **Components**: 
  - Enhanced homepage with hero section
  - Module cards with 3D hover effects
  - Video player for Manim animations
  - Lesson content renderer

### Backend (API)
- **Location**: `src/api/`
- **Framework**: FastAPI with SQLAlchemy
- **Database**: PostgreSQL with learning-specific models
- **Services**:
  - Learning content management
  - Manim animation rendering
  - AI coaching and feedback
  - Excel validation system

## Key Features

### 1. Curriculum Structure
- **5 Core Modules**: Business Foundations, Accounting I, Accounting II, Managerial Accounting, Finance & Valuation
- **80+ Lessons**: Comprehensive coverage of investment banking fundamentals
- **Progressive Difficulty**: Beginner to advanced learning paths
- **Prerequisites**: Structured learning dependencies

### 2. Manim Animation System
- **Location**: `scripts/manim_scenes/`
- **Core Animations**:
  - Business Model Canvas visualization
  - Three Statement Flow analysis
  - Porter's 5 Forces framework
  - DCF Valuation modeling
  - Working Capital analysis
- **Rendering Service**: Asynchronous animation processing
- **API Integration**: Real-time status tracking and video streaming

### 3. AI-Powered Coaching
- **Learning Agent**: OpenAI Agent Builder integration
- **Personalized Feedback**: Submission analysis and improvement suggestions
- **Practice Generation**: Dynamic question and exercise creation
- **Progress Tracking**: Comprehensive learning analytics

### 4. Excel Validation System
- **Goldman Sachs Standards**: Investment banking best practices
- **Comprehensive Checks**: Formula validation, formatting, data integrity
- **Real-time Feedback**: Immediate validation results and suggestions
- **Professional Reports**: Detailed analysis and improvement recommendations

### 5. Modern UI/UX Design
- **Dopamine-Driven**: Engaging animations and micro-interactions
- **3D Effects**: Hover animations and depth perception
- **Progress Visualization**: Real-time completion tracking
- **Responsive Design**: Mobile-first approach with desktop optimization

## Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 13+
- Manim (for animations)
- OpenAI API key (for AI coaching)

### Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Set up environment variables
export OPENAI_API_KEY="your_openai_api_key"
export DATABASE_URL="postgresql://user:password@localhost/ngi_learning"

# Run database migrations
alembic upgrade head

# Seed learning content
python scripts/seed_learning_content.py

# Start the backend server
uvicorn services.api.main:app --reload
```

### Frontend Setup
```bash
# Navigate to student app
cd apps/student

# Install dependencies
npm install

# Start development server
npm run dev
```

### Manim Setup
```bash
# Install Manim
pip install manim

# Install additional dependencies
pip install openpyxl xlsxwriter

# Test animation rendering
python scripts/manim_renderer.py
```

## API Endpoints

### Learning Content
- `GET /api/learning/enhanced/content/{lesson_id}` - Get lesson content
- `POST /api/learning/enhanced/content/{lesson_id}/complete` - Mark lesson complete

### Animations
- `POST /api/learning/enhanced/animations/render` - Trigger animation render
- `GET /api/learning/enhanced/animations/{job_id}/status` - Get render status
- `GET /api/learning/enhanced/animations/{animation_id}/video` - Stream video

### AI Coaching
- `POST /api/learning/enhanced/coaching/session` - Start coaching session
- `POST /api/learning/enhanced/coaching/feedback` - Provide feedback
- `POST /api/learning/enhanced/coaching/practice` - Generate practice material
- `GET /api/learning/enhanced/coaching/session/{session_id}/status` - Get session status
- `POST /api/learning/enhanced/coaching/session/{session_id}/end` - End session

### Excel Validation
- `POST /api/learning/enhanced/validation/excel` - Validate Excel file

### Progress Tracking
- `GET /api/learning/enhanced/progress/{user_id}` - Get user progress
- `GET /api/learning/enhanced/analytics/overview` - Get learning analytics

## Database Schema

### Core Tables
- `learning_content` - Lesson content and metadata
- `learning_progress` - Student progress tracking
- `learning_submissions` - Student submissions
- `learning_feedback` - AI-generated feedback
- `learning_leaderboard` - Student rankings
- `learning_telemetry` - Usage analytics

### Key Relationships
- Content has hierarchical structure (module → unit → lesson)
- Progress tracks completion and performance
- Submissions link to content and feedback
- Telemetry provides usage insights

## Development Workflow

### Adding New Content
1. Create lesson content in `scripts/seed_learning_content.py`
2. Add to database using seed script
3. Update frontend types in `apps/student/src/types/learning.ts`
4. Test content rendering

### Creating New Animations
1. Create Manim scene in `scripts/manim_scenes/`
2. Add to animation registry
3. Update frontend video player
4. Test rendering pipeline

### Implementing New Features
1. Create backend API endpoints
2. Add frontend components
3. Write comprehensive tests
4. Update documentation

## Testing

### Running Tests
```bash
# Backend tests
pytest tests/test_learning_center.py -v

# Frontend tests
cd apps/student
npm test

# Integration tests
pytest tests/test_integration.py -v
```

### Test Coverage
- Unit tests for all services
- Integration tests for API endpoints
- E2E tests for complete workflows
- Performance tests for animations

## Deployment

### Production Setup
1. Configure environment variables
2. Set up PostgreSQL database
3. Deploy backend API
4. Build and deploy frontend
5. Configure CDN for animations
6. Set up monitoring and logging

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=postgresql://user:password@host/db
SECRET_KEY=your_secret_key

# Optional
MANIM_QUALITY=high
ANIMATION_CACHE_TTL=3600
COACHING_SESSION_TIMEOUT=7200
```

## Monitoring & Analytics

### Key Metrics
- Lesson completion rates
- Animation render times
- AI coaching effectiveness
- Excel validation accuracy
- User engagement patterns

### Logging
- Structured logging with correlation IDs
- Performance metrics tracking
- Error monitoring and alerting
- User behavior analytics

## Troubleshooting

### Common Issues
1. **Animation Rendering**: Check Manim installation and dependencies
2. **AI Coaching**: Verify OpenAI API key and agent configuration
3. **Excel Validation**: Ensure file format compatibility
4. **Database**: Check connection and migration status

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with debug flags
python -m uvicorn services.api.main:app --reload --log-level debug
```

## Contributing

### Code Standards
- Follow PEP 8 for Python code
- Use TypeScript for frontend
- Write comprehensive tests
- Document all public APIs
- Use conventional commits

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit PR with description
5. Address review feedback
6. Merge after approval

## Roadmap

### Phase 2 (Next Release)
- Advanced analytics dashboard
- Peer learning features
- Mobile app development
- Additional animation scenes
- Enhanced AI coaching

### Phase 3 (Future)
- Virtual reality integration
- Advanced simulation tools
- Industry partnerships
- Certification programs
- Global expansion

## Support

### Documentation
- API documentation: `/docs` endpoint
- Component library: Storybook
- User guides: In-app help system
- Video tutorials: Animation library

### Contact
- Technical issues: GitHub Issues
- Feature requests: GitHub Discussions
- General support: support@ngicapital.com
- Learning questions: learning@ngicapital.com

## License

Proprietary - NGI Capital Internal Use Only

---

*This implementation represents the foundation of the NGI Learning Center v1, providing a comprehensive platform for investment banking education with modern technology and best practices.*
