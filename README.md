# Project Echo Ridge Search

A minimal, functional PMF (Product-Market Fit) Search Engine built with Next.js and Tailwind CSS.

## Features

- **Clean UI**: Pure black, white, and grayscale design
- **Responsive**: Works on desktop and mobile devices
- **Mock Search**: Simulates search functionality with fake API calls
- **Loading States**: Shows loading spinner during search
- **Error Handling**: Displays error messages (10% chance for testing)
- **Search Results**: Displays 3-5 mock results with titles, snippets, scores, and tags

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React** - UI components

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Testing the Application

### Basic Functionality
1. **Search Input**: Enter any search query in the textarea
2. **Submit**: Click "Submit" button or press Enter
3. **Loading**: Observe the loading spinner for 1-2 seconds
4. **Results**: View the mock search results in card format

### Error Testing
- The app has a 10% chance of simulating an error
- Keep searching to eventually trigger the error state
- Error messages appear in a red-bordered box

### Responsive Testing
- Resize browser window to test mobile responsiveness
- Search bar stacks vertically on smaller screens
- Results maintain proper spacing across all screen sizes

### Key User Flows
1. **First Visit**: Shows "Enter a search query to see results"
2. **Search**: Enter query → Click Submit → Loading → Results
3. **Empty Search**: Shows "No results found" message
4. **Error State**: Shows error message with retry instruction

## File Structure

```
/
├── components/
│   ├── SearchBar.tsx     # Search input and submit button
│   ├── ResultCard.tsx    # Individual result display
│   └── Dashboard.tsx     # Results container with states
├── lib/
│   └── fakeSearch.ts     # Mock search API
├── pages/
│   ├── _app.tsx         # App wrapper
│   └── index.tsx        # Main page
├── styles/
│   └── globals.css      # Tailwind imports
└── package.json
```

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Design Notes

- **No Colors**: Strictly black, white, and grayscale palette
- **Typography**: Modern sans-serif fonts via Tailwind
- **Spacing**: Consistent spacing using Tailwind utilities
- **Cards**: Gray-bordered cards with hover effects
- **Loading**: CSS spinner with matching color scheme