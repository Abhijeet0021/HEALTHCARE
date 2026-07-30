# Hospital Management System

A full-stack hospital management app: a React frontend and an Express + SQLite backend,
with three user roles (patient, doctor, admin) and four modules — patients & records,
doctors & schedules, appointments, and billing & pharmacy.

## Tech

- **Frontend:** React (Create React App), talks to the API on port 5001.
- **Backend:** Node/Express, data stored in SQLite via Node's **built-in** `node:sqlite`
  (no native modules to compile) in `backend/hospital.db`.
- **Auth:** email + password, passwords hashed with scrypt. Roles decide which dashboard loads.

## Requirements

- **Node.js 22.5 or newer** (the backend uses the built-in SQLite module). Check with `node -v`.

## Setup

In two terminals:

**1. Backend**
```
cd backend
npm install        # first time only — just installs Express + CORS (no build step)
npm start          # runs on http://localhost:5001
```
On first run it creates `hospital.db` and seeds an admin, six doctors, and pharmacy stock.

**2. Frontend**
```
cd client
npm install        # first time only
npm start          # opens http://localhost:3000
```

> The database file (`hospital.db`) is created automatically and is git-ignored.
> Delete it if you ever want to reset all data back to the seed.

## Demo logins

| Role    | Email                      | Password    |
|---------|----------------------------|-------------|
| Admin   | admin@hospital.com         | admin123    |
| Doctor  | sarah.smith@hospital.com   | doctor123   |
| Doctor  | john.doe@hospital.com      | doctor123   |
| Patient | *register your own on the login screen* | |

Other seeded doctors follow the same pattern: `firstname.lastname@hospital.com` / `doctor123`
(mike.ross, john.williams, emily.johnson, michael.brown).

## What each role can do

**Patient** (self-registers on the login screen)
- Check blood sugar and see reading history.
- Book an appointment with an available doctor.
- View and cancel their appointments.
- See their medical records and bills, and pay bills.

**Doctor**
- See appointments booked with them.
- Confirm or complete an appointment.
- Write a medical record (diagnosis, notes), add a prescription (which reduces pharmacy
  stock), and optionally generate a bill (consultation fee + medicine).

**Admin**
- Overview with counts and paid revenue.
- Add doctors (creates their login) and toggle availability.
- View all patients and open any patient's records and readings.
- See all appointments.
- Manage pharmacy inventory (add medicines, restock).
- See all bills and mark them paid.

## API overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Patient sign-up |
| POST | `/api/auth/login` | Login (any role) |
| GET  | `/api/me/:userId` | Current user + linked profile |
| GET/POST/PATCH | `/api/doctors` | List / add / update doctors |
| GET  | `/api/patients`, `/api/patients/:id` | List patients / one patient with records |
| POST/GET | `/api/health/data`, `/api/health/history` | Save / list sugar readings |
| POST/GET/PATCH | `/api/appointments` | Book / list / change status |
| POST | `/api/records` | Add medical record + prescriptions |
| GET/POST/PATCH | `/api/medicines` | Pharmacy inventory |
| POST/GET/PATCH | `/api/bills` | Create / list / mark paid |

## Notes

This is a learning project. Auth is simplified (no session tokens; the logged-in user is
kept in React state), so it isn't hardened for production use.
