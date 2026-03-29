# Hospital Management System POC

This project is a Proof of Concept (POC) for a scalable hospital SaaS platform, providing robust APIs for managing hospitals, doctors, patients, appointments, and available slots with proper data isolation and professional architecture.

## Tech Stack
- **Database**: Supabase (PostgreSQL)
- **Framework**: Vercel Serverless Functions (Node.js)
- **Architecture**: Clean Modular Architecture (Controller-Service-Repository)

---

## API Documentation

### 1. GET Hospitals
Fetch all hospitals with their location details and logo.

**Endpoint**: `GET /api/hospitals`

**Query Parameters**:
- `search` (optional): Filter by hospital name.
- `page` (optional): Page number for pagination (default: 1).
- `limit` (optional): Number of records per page (default: 10).

**Sample Request**:
`GET /api/hospitals?search=Global&page=1&limit=5`

**Sample Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "hosp-uuid-1",
      "name": "Global Hospital",
      "address": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "logo_url": "https://supabase.co/logo.png"
    }
  ],
  "meta": {
    "totalCount": 1,
    "currentPage": 1,
    "totalPages": 1,
    "limit": 5
  }
}
```

---

### 2. GET Doctors (Hospital Scoped)
Fetch doctors associated with a specific hospital.

**Endpoint**: `GET /api/doctors`

**Query Parameters**:
- `hospital_id` (**Required**): UUID of the hospital.
- `search` (optional): Filter by doctor name.
- `page` (optional): Page number (default: 1).
- `limit` (optional): Records per page (default: 10).
- `sort` (optional): Sort by name (`asc` or `desc`).

**Sample Request**:
`GET /api/doctors?hospital_id=hosp-uuid-1&search=Gupta`

**Sample Response**:
```json
{
  "success": true,
  "data": [
    {
      "doctor_id": "doc-uuid-1",
      "doctor_name": "Dr. Gupta",
      "specialization": "Cardiologist",
      "hospital_id": "hosp-uuid-1"
    }
  ],
  "meta": {
    "totalCount": 1,
    "currentPage": 1,
    "totalPages": 1,
    "limit": 10
  }
}
```

---

### 3. GET Patients
Fetch patients, optionally filtered by hospital (via appointment association).

**Endpoint**: `GET /api/patients`

**Query Parameters**:
- `hospital_id` (optional): Scope patients connected to this hospital.
- `search` (optional): Filter by patient name or mobile.
- `page` (optional): Page number (default: 1).
- `limit` (optional): Records per page (default: 10).

**Sample Request**:
`GET /api/patients?hospital_id=hosp-uuid-1&search=Ravi`

**Sample Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "p-uuid-1",
      "name": "Ravi Sharma",
      "mobile": "9990246555",
      "created_at": "2026-03-29T00:00:00Z"
    }
  ],
  "meta": {
    "totalCount": 1,
    "currentPage": 1,
    "totalPages": 1,
    "limit": 10
  }
}
```

---

### 4. GET Appointments
Fetch appointments with detailed joins for doctors and patients.

**Endpoint**: `GET /api/appointments`

**Query Parameters**:
- `hospital_id` (optional): Filter by hospital.
- `doctor_id` (optional): Filter by doctor.
- `date` (optional): Filter by appointment date (`YYYY-MM-DD`).
- `status_id` (optional): Filter by status code (e.g., BOOKED).
- `search` (optional): Filter by patient name or mobile.

**Sample Request**:
`GET /api/appointments?hospital_id=hosp-uuid-1&status_id=1`

**Sample Response**:
```json
{
  "success": true,
  "data": [
    {
      "appointment_id": "apt-uuid-1",
      "doctor_name": "Dr. Gupta",
      "patient_name": "Ravi Sharma",
      "appointment_date": "2026-03-30",
      "time_slot": "10:00 AM",
      "status": "BOOKED"
    }
  ],
  "meta": {
    "totalCount": 1,
    "currentPage": 1,
    "totalPages": 1,
    "limit": 10
  }
}
```

---

### 5. GET Available Slots
Fetch available time slots for a specific doctor on a given date.

**Endpoint**: `GET /api/slots`

**Query Parameters**:
- `doctor_id` (**Required**): UUID of the doctor.
- `hospital_id` (**Required**): UUID of the hospital.
- `date` (**Required**): Date for slots (`YYYY-MM-DD`).

**Sample Request**:
`GET /api/slots?doctor_id=doc-uuid-1&hospital_id=hosp-uuid-1&date=2026-03-30`

**Sample Response**:
```json
{
  "success": true,
  "data": [
    {
      "slot_id": "slot-uuid-1",
      "start_time": "10:00 AM",
      "end_time": "10:30 AM"
    },
    {
      "slot_id": "slot-uuid-2",
      "start_time": "11:00 AM",
      "end_time": "11:30 AM"
    }
  ]
}
```

---

## Development Structure
```
api/             # Vercel Serverless Functions
src/
  ├── config/    # Connection logic (Supabase)
  ├── controllers/ # HTTP Request Handling
  ├── services/   # Business Logic/Validation
  └── repositories/# SQL/Database Logic (Supabase)
```
