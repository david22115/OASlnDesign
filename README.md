# TaskMaster Monorepo

Welcome to the **TaskMaster** monorepo! This project is built using [Turborepo](https://turbo.build/repo) and [pnpm](https://pnpm.io/) workspaces. It contains a full-stack ecosystem with web and mobile clients sharing code with a Node.js backend.

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- [pnpm](https://pnpm.io/installation) (v8.0.0 or newer)
- Redis (required for BullMQ in the API)

### Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Environment Variables:**
   Copy the example environment file and configure it as needed.
   ```bash
   cp .env.example .env
   ```

3. **Start the development servers:**
   ```bash
   pnpm run dev
   ```
   This will use Turborepo to start all apps (`api`, `portal`, `admin`) concurrently. You can also run specific apps:
   ```bash
   pnpm run dev:portal
   pnpm run dev:admin
   ```

## 💻 Tech Stack & Specifications

**Infrastructure & Architecture:**
- **Monorepo:** Turborepo, pnpm workspaces
- **Language:** TypeScript 5+ across the entire stack

**Backend (`api`):**
- **Runtime:** Node.js 18+ (Express.js)
- **Database & ORM:** Prisma
- **Queue / Background Jobs:** BullMQ with Redis
- **Authentication:** JWT, bcryptjs for local auth, plus SSO capabilities
- **Dynamic Forms Engine:** JSONB based Master-Detail architecture with State Machine

**Frontend (`portal`, `admin`):**
- **Framework:** Next.js 14, React 18
- **Styling:** Tailwind CSS, PostCSS

**Mobile (`mobile`):**
- **Framework:** React Native 0.73
- **Tooling:** Expo 50

## 🏗️ Project Structure

This monorepo uses `pnpm` workspaces and is divided into `apps` and `packages`.

### Apps (`/apps`)

- **`api`**: The main Node.js backend using Express. Handles authentication (JWT, bcrypt), background jobs/queues (BullMQ with Redis), and serves the core business logic.
- **`portal`**: A Next.js web application (React 18). Styled with Tailwind CSS.
- **`admin`**: The administrative web dashboard.
- **`mobile`**: A React Native application built with Expo for iOS and Android.

### Packages (`/packages`)

Shared libraries utilized across multiple apps to keep code DRY:

- **`database`**: Database connection, models, and ORM configurations.
- **`shared-types`**: TypeScript interfaces and types shared between the client and backend.
- **`ui-configs`**: Shared UI configurations.
- **`utils`**: Common utility functions.

## 🛠️ Available Scripts

At the root level, you can run the following commands:

- `pnpm run build`: Build all applications and packages.
- `pnpm run dev`: Start all apps in development mode.
- `pnpm run lint`: Run linting across all workspaces.
- `pnpm run format`: Format code using Prettier.

You can also filter commands using Turborepo. For example, to build only the portal:
```bash
pnpm run build --filter=portal
```

## 📱 Running the Mobile App

To run the React Native mobile app with Expo:

```bash
cd apps/mobile
pnpm run start
```
From there, you can press `a` to run on an Android emulator, `i` to run on an iOS simulator, or scan the QR code with the Expo Go app on your physical device.
