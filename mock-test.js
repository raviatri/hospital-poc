// Mocking the repository to show what the response looks like without a live DB connection
const mockData = [
  {
    id: "d1-uuid",
    name: "Dr. John Smith",
    is_active: true,
    created_at: "2024-03-29T10:00:00Z",
    specialization: "Cardiology"
  },
  {
    id: "d2-uuid",
    name: "Dr. Sarah Wilson",
    is_active: true,
    created_at: "2024-03-29T11:00:00Z",
    specialization: "Dermatology"
  }
];

const mockResult = {
  success: true,
  message: "Doctors fetched successfully",
  data: mockData,
  meta: {
    totalCount: 2,
    currentPage: 1,
    totalPages: 1,
    limit: 10
  }
};

console.log("--- Mock API Response Simulation ---");
console.log(JSON.stringify(mockResult, null, 2));
