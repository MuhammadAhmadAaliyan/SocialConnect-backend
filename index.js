const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// File to simulate a database
const POSTS_FILE = './posts.json';

// Helper: read posts
const getPosts = () => {
  if (!fs.existsSync(POSTS_FILE)) return [];
  const data = fs.readFileSync(POSTS_FILE);
  return JSON.parse(data);
};

// Helper: save posts
const savePosts = (posts) => {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
};

// GET all posts
app.get('/posts', (req, res) => {
  const posts = getPosts();
  res.json(posts);
});

// POST a new post
app.post('/posts', (req, res) => {
  const { userName, content, imageUrl } = req.body;
  const posts = getPosts();

  const newPost = {
    id: Date.now().toString(),
    userName,
    content,
    imageUrl,
    timestamp: new Date().toISOString(),
  };

  posts.unshift(newPost);
  savePosts(posts);
  res.status(201).json(newPost);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
