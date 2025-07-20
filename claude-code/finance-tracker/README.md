# Personal Finance Tracker

A beautiful, modern personal finance tracker built with React and Express. Track your income, expenses, and savings goals with interactive charts and a clean, Notion-inspired interface.

## ✨ Features

- **Dashboard Overview**: Quick stats and recent transactions at a glance
- **Transaction Management**: Add, view, and categorize income and expenses
- **Interactive Analytics**: Beautiful charts showing spending patterns and trends
- **Savings Goals**: Set and track progress towards financial objectives
- **Responsive Design**: Optimized for desktop and mobile devices
- **Modern UI**: Clean design inspired by Notion with Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finance-tracker
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   Backend will run on `http://localhost:5000`

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm start
   ```
   Frontend will run on `http://localhost:3000`

## 📱 Usage

### Dashboard
- View your total income, expenses, and net balance
- See recent transactions at a glance
- Monitor savings goals progress with visual indicators
- Quick actions for adding income, expenses, and creating goals
- Monitor key financial metrics

### Transactions
- Add new income or expense transactions
- Categorize transactions with predefined categories
- View all transactions in a sortable table
- Delete transactions as needed

### Analytics
- Visualize monthly income vs expenses with bar charts
- View expense breakdown by category with pie charts
- Track financial trends over time

### Savings Goals
- Create savings goals with target amounts and deadlines
- Track progress with visual progress bars
- Update current amounts as you save
- Manage multiple goals simultaneously

## 🛠️ Technology Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Recharts** for data visualization
- **Heroicons** for icons

### Backend
- **Express.js** with TypeScript
- **SQLite3** for database
- **CORS** for cross-origin requests
- RESTful API design

## 📂 Project Structure

```
finance-tracker/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Main page components
│   │   ├── types/           # TypeScript type definitions
│   │   └── ...
│   └── package.json
├── backend/                  # Express backend application
│   ├── src/
│   │   ├── models/          # Database models and setup
│   │   ├── routes/          # API route handlers
│   │   ├── types/           # TypeScript type definitions
│   │   └── index.ts         # Main server file
│   └── package.json
└── README.md
```

## 🎯 API Endpoints

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/stats` - Get transaction statistics

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category
- `DELETE /api/categories/:id` - Delete category

### Savings Goals
- `GET /api/savings-goals` - Get all savings goals
- `POST /api/savings-goals` - Create new savings goal
- `PUT /api/savings-goals/:id` - Update savings goal
- `DELETE /api/savings-goals/:id` - Delete savings goal

## 🎨 Design System

The application uses a consistent design system with:
- **Primary Color**: Blue (#3B82F6)
- **Success Color**: Green (#10B981)  
- **Warning Color**: Orange (#F59E0B)
- **Danger Color**: Red (#EF4444)
- **Typography**: System fonts with consistent sizing
- **Spacing**: 8px grid system
- **Shadows**: Subtle drop shadows for depth

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev    # Start development server with hot reload
npm run build  # Build TypeScript to JavaScript
npm start      # Start production server
```

### Frontend Development
```bash
cd frontend
npm start      # Start development server
npm run dev    # Start development server with enhanced hot reloading
npm run build  # Build for production
npm test       # Run tests
```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using React, Express, and modern web technologies.