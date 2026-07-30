# Hospital Management System — Project Summary

## Objective
A web-based Hospital Management System that lets a hospital manage patients, doctors,
appointments, medical records, pharmacy stock, and billing through a single application.
Different types of users (patient, doctor, admin) log in and see a dashboard suited to their role.

## Technology Stack
- **Frontend:** React (Create React App), plain CSS for styling.
- **Backend:** Node.js with the Express framework (REST API).
- **Database:** SQLite, using Node's built-in `node:sqlite` module (no external database server needed).
- **Security:** Passwords are stored as scrypt hashes, not plain text.

## User Roles
- **Patient** — registers themselves, records health vitals, books appointments, and views
  their records and bills.
- **Doctor** — sees their appointments, updates their status, and writes diagnoses,
  prescriptions, and bills.
- **Admin** — manages doctors and pharmacy stock, and views all patients, appointments, and bills.

## Main Modules
1. **Authentication** — registration and role-based login.
2. **Patients & Records** — patient profiles and their medical history.
3. **Health Check (Vitals)** — record blood sugar, blood pressure, temperature, heart rate,
   SpO₂, and weight; each value is checked against its normal range.
4. **Doctors & Appointments** — book, confirm, complete, or cancel appointments.
5. **Pharmacy** — medicine inventory; stock reduces automatically when a doctor prescribes.
6. **Billing** — bills are generated from consultation fees and medicines, and can be marked paid.

## How It Works
The React frontend sends requests to the Express backend over a REST API. The backend reads
and writes data in the SQLite database and returns JSON responses. When a user logs in, the
app checks their role and loads the matching dashboard. All data (users, appointments,
readings, bills) is stored in a local database file, so it is saved between sessions.

## Architecture (flow)
    React (browser)  →  Express REST API  →  SQLite database
        UI / forms         business logic         stored data

## Sample Logins
- Admin: `admin@hospital.com` / `admin123`
- Doctor: `sarah.smith@hospital.com` / `doctor123`
- Patient: register a new account from the login screen.

## Possible Future Enhancements
BMI calculation, charts of vitals over time, prevention of double-booking, and secure
session-based login.
