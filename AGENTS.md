# Project Context

## Overview
Educational platform with teacher/student features including announcements, documents, exams, courses, messaging, and live video calling.

## Tech Stack
- Vite + React + TypeScript
- shadcn-ui + Tailwind CSS
- Supabase (auth + database)
- React Router DOM
- TanStack React Query

## Key Features
- Announcements system
- Document management
- Exam/quiz creation
- Course/content management
- Classroom management
- Real-time messaging
- WebRTC video calling (useWebRTCCall)

## Database
- Supabase with migrations in `supabase/migrations/`
- Multiple tables: users, profiles, announcements, documents, exams, courses, classrooms, messages, etc.

## Key Hooks
- use-teacher-data.ts / use-student-data.ts - User role-based data
- use-announcements.ts
- use-documents.ts
- use-exams.ts
- use-courses.ts
- use-classrooms.ts
- use-messages.ts
- use-groups.ts
- use-events.ts
- use-presence.ts
- use-profile.ts

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run lint` - Lint code
- `npm run test` - Run tests

## Notes
- Uses WebRTC for live video calls
- Real-time presence tracking
- Dark/light theme support
- Toast notifications
- Idle timer for sessions