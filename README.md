# NestJS PostgreSQL Prisma Authentication Project

This project is a NestJS application with PostgreSQL database using Prisma ORM for data access. It includes authentication with various strategies, DTOs for data validation, guards for route protection, decorators for custom metadata, and social logins. Docker and docker-compose files are provided for easy setup and deployment.

## Features

- **Authentication**: Supports various authentication strategies, including JWT, session-based, and social logins (e.g., Google, Facebook).
- **Guards**: Protects routes using guards to ensure only authorized users can access certain endpoints.
- **Decorators**: Uses decorators to add custom metadata to classes and methods for additional functionality.
- **DTOs**: Defines DTOs (Data Transfer Objects) for data validation and transformation.
- **Prisma ORM**: Integrates with Prisma for database access, providing a type-safe database client.

## Installation

1. Clone the repository: 
2. Install dependencies: `npm install`
3. Set up environment variables: Create a `.env` file based on the `.env.example` file.
4. Run PostgreSQL database using Docker: `docker-compose up -d`
5. Apply Prisma migrations: `npx prisma migrate dev`
6. Run the application: `npm run start:dev`

## Usage

1. Register a new user: `POST /auth/register`
2. Login with username and password: `POST /auth/login`
3. Access protected routes by providing the JWT token in the `Authorization` header.

## Configuration

- Edit the `ormconfig.json` file to configure the database connection.
- Configure social login strategies in the `auth.strategy.ts` file.

## Project Structure

- `src/`: Contains the main source code of the application.
    - `auth/`: Authentication related files (guards, strategies, DTOs).
    - `decorators/`: Custom decorators for adding metadata.
    - `users/`: User-related files (controllers, services, DTOs).
- `prisma/`: Contains Pri
