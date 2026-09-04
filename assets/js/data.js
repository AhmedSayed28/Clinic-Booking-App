/* Mock data used to seed localStorage on a visitor's first session. */
window.CareNestData = {
  users: [{ id: 'user-demo', name: 'Alex Morgan', email: 'patient@carenest.com', password: 'patient123' }],
  doctors: [
    { id: 'dr-amelia', name: 'Dr. Amelia Carter', specialty: 'Cardiologist', clinic: 'Central Medical Clinic', rating: 4.9, reviews: 124, fee: 90, experience: 12, image: 'AC', about: 'Specializing in preventive cardiology and compassionate heart care.', slots: ['09:00 AM', '10:30 AM', '01:00 PM', '03:30 PM'] },
    { id: 'dr-james', name: 'Dr. James Lee', specialty: 'Dermatologist', clinic: 'Riverside Health', rating: 4.8, reviews: 98, fee: 75, experience: 9, image: 'JL', about: 'Helping patients feel confident in their skin with evidence-based care.', slots: ['09:30 AM', '11:00 AM', '02:00 PM', '04:00 PM'] },
    { id: 'dr-sofia', name: 'Dr. Sofia Patel', specialty: 'Pediatrician', clinic: 'Central Medical Clinic', rating: 4.9, reviews: 156, fee: 70, experience: 11, image: 'SP', about: 'Friendly, family-centered care for infants, children, and teens.', slots: ['08:30 AM', '10:00 AM', '12:30 PM', '03:00 PM'] },
    { id: 'dr-noah', name: 'Dr. Noah Williams', specialty: 'Orthopedic Surgeon', clinic: 'Westside Specialists', rating: 4.7, reviews: 82, fee: 110, experience: 15, image: 'NW', about: 'Focused on restoring mobility and helping you return to what you love.', slots: ['09:00 AM', '11:30 AM', '01:30 PM', '04:30 PM'] }
  ]
};
