# User Management Guide

## Overview
The EchoRidge Search Frontend uses JWT-based authentication with a SQLite database for user management. All users are stored locally in the frontend database (`data/frontend.db`).

## Adding New Users

### Method 1: Using Node.js directly (Recommended for admins)

1. **Navigate to the frontend directory**:
   ```bash
   cd echoridge_search_frontend
   ```

2. **Create a new user using Node.js**:
   ```bash
   node -e "
   const Database = require('better-sqlite3');
   const bcrypt = require('bcryptjs');
   const db = new Database('./data/frontend.db');

   // Set user details
   const email = 'newuser@example.com';
   const password = 'securepassword123';
   const role = 'admin'; // or 'user'

   // Check if user already exists
   const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
   if (existingUser) {
     console.log('User already exists with email:', email);
   } else {
     // Create new user
     const hashedPassword = bcrypt.hashSync(password, 12);
     const result = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) RETURNING id').get(email, hashedPassword, role);
     console.log('Created user:', email, 'with ID:', result.id);
   }
   db.close();
   "
   ```

### Method 2: Using the database directly

1. **Connect to the SQLite database**:
   ```bash
   # If you have sqlite3 installed
   sqlite3 ./data/frontend.db

   # Or use Node.js
   node -e "const db = require('better-sqlite3')('./data/frontend.db'); console.log('Connected to database');"
   ```

2. **Hash a password first** (using Node.js):
   ```bash
   node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('yourpassword', 12));"
   ```

3. **Insert the user**:
   ```sql
   INSERT INTO users (email, password_hash, role)
   VALUES ('user@example.com', '$2a$12$hash_from_above', 'admin');
   ```

## User Roles

- **admin**: Full access to all features including database management
- **user**: Basic access (for future role-based restrictions)

## Authentication Flow

1. **Login**: Users authenticate at `/login` with email/password
2. **JWT Token**: Server returns a JWT token valid for 7 days
3. **Authorization**: Frontend stores token in localStorage
4. **Protected Routes**: All main app features require valid authentication
5. **Auto-redirect**: Expired/invalid tokens redirect to login page

## Protected Features

The following features now require authentication:

- **Main Search Interface** (`/`): The primary business search functionality
- **Database Dashboard** (`/database`): Pipeline runs, business logs, and management
- **All API Endpoints**: Database operations, search, cleanup, etc.

## Managing Existing Users

### List all users:
```bash
node -e "
const db = require('better-sqlite3')('./data/frontend.db');
const users = db.prepare('SELECT id, email, role, created_at FROM users').all();
console.table(users);
db.close();
"
```

### Delete a user:
```bash
node -e "
const db = require('better-sqlite3')('./data/frontend.db');
const email = 'user@example.com';
const result = db.prepare('DELETE FROM users WHERE email = ?').run(email);
console.log('Deleted', result.changes, 'user(s)');
db.close();
"
```

### Change user password:
```bash
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('./data/frontend.db');

const email = 'user@example.com';
const newPassword = 'newpassword123';
const hashedPassword = bcrypt.hashSync(newPassword, 12);

const result = db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hashedPassword, email);
console.log('Updated', result.changes, 'user password(s)');
db.close();
"
```

## Security Notes

- Passwords are hashed using bcrypt with 12 salt rounds
- JWT tokens expire after 7 days
- All sensitive operations require authentication
- Database access is restricted to authenticated users
- No user registration endpoint exists (admin-controlled user creation)

## Troubleshooting

### "Invalid or expired token" error
- Clear browser localStorage and login again
- Check if user exists in database
- Verify JWT secret is consistent

### Cannot access frontend
- Ensure you have at least one admin user created
- Check that the database file exists at `data/frontend.db`
- Verify the auth system is working by checking browser console

### Database connection issues
- Make sure you're in the correct directory (`echoridge_search_frontend`)
- Check that `better-sqlite3` and `bcryptjs` are installed
- Verify database file permissions