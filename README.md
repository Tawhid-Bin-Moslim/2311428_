# ApartmentCare

**ApartmentCare** is a web-based Apartment Building Management System designed to simplify and centralize the daily operations of residential apartment buildings. It provides a single platform where administrators, building managers, and residents can manage apartment-related activities, communicate efficiently, and access relevant information according to their roles and permissions.

The system focuses on improving property management, maintenance coordination, resident services, visitor management, and financial transparency through a centralized and role-based application.

## Project Objectives

- Digitize everyday apartment management activities.
- Provide residents with an easy way to submit and track maintenance requests.
- Help building managers manage their assigned buildings efficiently.
- Allow administrators to manage buildings, flats, users, and system operations.
- Implement secure authentication and role-based access control (RBAC).
- Maintain organized records of apartment operations and financial activities.

## Main Features

### 1. Authentication and Authorization
- Secure user login and authentication.
- Role-based access control.
- Protected application routes and API endpoints.
- Permission-based access to system resources.

### 2. Building Management
- Manage apartment buildings.
- Maintain building information and status.
- Restrict building managers to their assigned buildings.
- Allow administrators to manage buildings across the system.

### 3. Flat and Resident Management
- Manage apartment flats.
- Assign residents to flats.
- Support owner and tenant occupancy types.
- Maintain occupancy history.
- Support multiple residents associated with the same flat.

### 4. Maintenance Management
- Allow residents to submit maintenance requests for their own flats.
- Track maintenance request status and priority.
- Allow building managers to view requests within their assigned buildings.
- Support maintenance request updates and coordination.

### 5. Announcements
- Publish announcements for apartment residents.
- Provide a centralized place for building-related notices and updates.

### 6. Visitor Management
- Maintain visitor pass records.
- Support organized visitor entry management.

### 7. Billing and Payments
- Maintain apartment billing records.
- Store payment information.
- Support financial record management.

### 8. Audit Logs
- Maintain records of important system activities.
- Improve accountability and operational transparency.

## User Roles

ApartmentCare currently supports three main user roles:

| Role | Responsibilities |
|---|---|
| **Admin** | Manages the overall system, buildings, users, flats, and administrative operations. |
| **Building Manager** | Manages an assigned building, handles maintenance requests, and oversees building-related activities. |
| **Resident** | Accesses personal apartment information, submits maintenance requests, and views relevant announcements and services. |

Each role has different permissions to ensure that users can only access the resources and operations they are authorized to use.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, TypeScript |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| Database Hosting | Supabase |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |
| API Architecture | REST API |
| Authentication | JWT |
| Password Security | Argon2 |
| Version Control | Git and GitHub |

## System Architecture

ApartmentCare follows a client-server architecture. The React frontend communicates with the FastAPI backend through REST API endpoints. The backend handles authentication, authorization, business logic, and database operations.

The PostgreSQL database, hosted on Supabase, stores the application's persistent data.

```text
                 Users
                   |
                   v
          React + TypeScript
             (Vercel)
                   |
              REST API
                   |
                   v
             FastAPI
              (Render)
                   |
       Authentication & RBAC
                   |
            Business Logic
                   |
                   v
             PostgreSQL
              (Supabase)
```

## Security and Access Control

Security is an important part of ApartmentCare. The application implements:

- JWT-based authentication.
- Password hashing using Argon2.
- Role-based authorization.
- Protected API endpoints.
- Building-level access restrictions for Building Managers.
- Resident-level access restrictions for apartment-related resources.

These mechanisms help protect application data and enforce the responsibilities of each user role.

## Deployment

The application uses a cloud-based deployment architecture:

- **Frontend:** Vercel
- **Backend API:** Render
- **Database:** Supabase PostgreSQL

This separation allows the frontend, backend, and database to operate as independent components.

## Project Purpose

ApartmentCare is developed as an academic software engineering and web application project. It demonstrates practical implementation of frontend development, backend API development, relational database management, authentication, authorization, role-based access control, and full-stack application integration.

The project aims to provide a practical and maintainable solution for managing apartment building operations through a centralized web application.

---

**Project Name:** ApartmentCare  
**Project Type:** Apartment Building Management System  
**Architecture:** Full-Stack Web Application  
**Backend:** FastAPI  
**Frontend:** React + TypeScript  
**Database:** PostgreSQL
