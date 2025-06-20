const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// Load users from JSON file
const loadUsers = () => {
  const data = fs.readFileSync('db.json');
  return JSON.parse(data);
};

const saveUsers = (users) => {
  fs.writeFileSync('db.json', JSON.stringify(users, null, 2));
};

// ✅ Signup
app.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  const users = loadUsers();

  if (users.find(user => user.email === email)) {
    return res.status(400).json({ message: 'Email already exists' });
  }

  const newUser = {
    id: String(Date.now()),
    name,
    email,
    password,
    avatar: '',
    bio: ''
  };

  users.push(newUser);
  saveUsers(users);

  res.status(201).json({ message: 'Signup successful', user: newUser });
});

// ✅ Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json({ message: 'Login successful', user });
});

// ✅ Get All Users (Optional for testing)
app.get('/users', (req, res) => {
  const users = loadUsers();
  res.json(users);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
