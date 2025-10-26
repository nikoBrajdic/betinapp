// Sample data for development and testing

export const sampleNotes = [
  {
    id: "1",
    title: "Grocery List",
    content: "Milk, eggs, bread, butter, cheese, vegetables",
    author: "John Doe",
    createdAt: new Date("2025-10-20"),
  },
  {
    id: "2",
    title: "Home Maintenance",
    content: "Fix leaky faucet in bathroom, replace air filter, clean gutters",
    author: "Jane Doe",
    createdAt: new Date("2025-10-22"),
  },
  {
    id: "3",
    title: "Vacation Planning",
    content: "Research destinations, book flights, reserve hotel, plan activities",
    author: "John Doe",
    createdAt: new Date("2025-10-25"),
  },
]

export const sampleTasks = [
  {
    id: "1",
    title: "Take out trash",
    description: "Weekly trash and recycling pickup",
    status: "todo",
    dueDate: new Date("2025-10-27"),
    assignee: "John Doe",
    points: 1,
  },
  {
    id: "2",
    title: "Mow the lawn",
    description: "Front and back yard",
    status: "in-progress",
    dueDate: new Date("2025-10-28"),
    assignee: "Jane Doe",
    points: 3,
  },
  {
    id: "3",
    title: "Clean kitchen",
    description: "Deep clean counters, appliances, and floors",
    status: "todo",
    dueDate: new Date("2025-10-29"),
    assignee: "John Doe",
    points: 2,
  },
  {
    id: "4",
    title: "Grocery shopping",
    description: "Weekly grocery run",
    status: "done",
    dueDate: new Date("2025-10-24"),
    assignee: "Jane Doe",
    points: 2,
  },
  {
    id: "5",
    title: "Pay utility bills",
    description: "Electricity and water bills",
    status: "in-progress",
    dueDate: new Date("2025-10-30"),
    assignee: "John Doe",
    points: 1,
  },
]

export const sampleEvents = [
  {
    id: "1",
    title: "Family Dinner",
    description: "Weekly family dinner at home",
    date: new Date("2025-10-26T18:00:00"),
  },
  {
    id: "2",
    title: "John's Birthday",
    description: "Birthday celebration",
    date: new Date("2025-11-05T00:00:00"),
  },
  {
    id: "3",
    title: "Doctor Appointment",
    description: "Annual checkup",
    date: new Date("2025-11-10T10:00:00"),
  },
]

export const sampleBills = [
  {
    id: "1",
    name: "Internet Bill",
    amount: 50,
    dueDate: new Date("2025-11-01"),
    paid: false,
  },
  {
    id: "2",
    name: "Electricity Bill",
    amount: 100,
    dueDate: new Date("2025-11-05"),
    paid: false,
  },
  {
    id: "3",
    name: "Water Bill",
    amount: 45,
    dueDate: new Date("2025-10-28"),
    paid: true,
  },
]

export const sampleUtilities = [
  {
    id: "1",
    type: "Electricity",
    value: 700,
    maxValue: 1000,
    unit: "kWh",
  },
  {
    id: "2",
    type: "Water",
    value: 4500,
    maxValue: 10000,
    unit: "gallons",
  },
  {
    id: "3",
    type: "Gas",
    value: 30,
    maxValue: 100,
    unit: "therms",
  },
]

export const sampleGuestStays = [
  {
    id: "1",
    guestName: "Sarah Johnson",
    fromDate: new Date("2025-11-15"),
    toDate: new Date("2025-11-18"),
    notes: "Visiting from Seattle, vegetarian",
  },
  {
    id: "2",
    guestName: "Mike Chen",
    fromDate: new Date("2025-12-01"),
    toDate: new Date("2025-12-05"),
    notes: "Business trip, needs workspace",
  },
]
