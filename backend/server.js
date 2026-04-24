const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// --- Data ---
const users = [];
const doctors = [
    { id: 1, name: "Dr. Sarah Smith", specialty: "Endocrinologist", available: true },
    { id: 2, name: "Dr. John Doe", specialty: "General Physician", available: true },
    { id: 3, name: "Dr. Mike Ross", specialty: "Endocrinologist", available: true },
    {id: 4, name: "Dr. John Williams", specialty: "Cardiologist", available: false},
    {id: 5, name: "Dr. Emily Johnson", specialty: "Dermatologist", available: true},
    {id: 6, name: "Dr. Michael Brown", specialty: "Neurologist", available: true},
    {id: 7, name: "Dr. Olivia Davis", specialty: "Pediatrician", available: false},
    {id: 8, name: "Dr. James Anderson", specialty: "Psychiatrist", available: false}

];

// --- Routes ---

// Login
app.post('/api/auth/login', (req, res) => {
    const { name, email } = req.body;
    let user = users.find(u => u.email === email);
    if (!user) {
        user = { id: Date.now(), name, email };
        users.push(user);
    }
    res.json({ success: true, user });
});

// Diagnosis
app.post('/api/health/data', (req, res) => {
    const { sugarLevel } = req.body;
    let status = "Normal";
    let advice = "Your health is good.";
    let warning = false;

    if (sugarLevel > 180) {
        status = "High Sugar";
        advice = "Consult a doctor immediately.";
        warning = true;
    } else if (sugarLevel < 70) {
        status = "Low Sugar";
        advice = "Eat something sweet.";
        warning = true;
    }
    res.json({ status, advice, warning });
});

// Get Doctors
app.get('/api/doctors', (req, res) => {
    const { specialty } = req.query;
    let result = specialty ? doctors.filter(d => d.specialty.toLowerCase().includes(specialty.toLowerCase())) : doctors;
    res.json(result);
});

// Book Appointment
app.post('/api/appointments', (req, res) => {
    const { doctorId } = req.body;
    const doctor = doctors.find(d => d.id === doctorId);
    res.json({ success: true, message: `Booked with ${doctor.name}` });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));