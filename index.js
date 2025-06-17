const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const POSTS_FILE = './posts.json';
const USERS_FILE = './users.json';

// Helpers
const getData = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
const saveData = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// GET all posts (with user info and comments)
app.get('/posts', (req, res) => {
  const posts = getData(POSTS_FILE);
  const users = getData(USERS_FILE);

  // Join user data to each post and comment
  const enrichedPosts = posts.map(post => {
    const user = users.find(u => u.id === post.userId) || {};
    const comments = (post.comments || []).map(comment => ({
      ...comment,
      user: users.find(u => u.id === comment.userId) || {}
    }));

    return {
      ...post,
      user,
      comments
    };
  });

  res.json(enrichedPosts);
});

// POST a new post
app.post('/posts', (req, res) => {
  const { userId, content, imageUrl } = req.body;
  const posts = getData(POSTS_FILE);

  const newPost = {
    id: Date.now().toString(),
    userId,
    content,
    imageUrl,
    timestamp: new Date().toISOString(),
    likes: 0,
    unlikes: 0,
    comments: []
  };

  posts.unshift(newPost);
  saveData(POSTS_FILE, posts);
  res.status(201).json(newPost);
});

// POST a comment to a post
app.post('/posts/:id/comments', (req, res) => {
  const { id } = req.params;
  const { userId, text } = req.body;
  const posts = getData(POSTS_FILE);

  const post = posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const newComment = {
    id: Date.now().toString(),
    userId,
    text
  };

  post.comments = post.comments || [];
  post.comments.push(newComment);

  saveData(POSTS_FILE, posts);
  res.status(201).json(newComment);
});

// Like a post
app.post('/posts/:id/like', (req, res) => {
  const { id } = req.params;
  const posts = getData(POSTS_FILE);

  const post = posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  post.likes = (post.likes || 0) + 1;
  saveData(POSTS_FILE, posts);

  res.json({ message: 'Liked', likes: post.likes });
});

// Unlike a post
app.post('/posts/:id/unlike', (req, res) => {
  const { id } = req.params;
  const posts = getData(POSTS_FILE);

  const post = posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  post.unlikes = (post.unlikes || 0) + 1;
  saveData(POSTS_FILE, posts);

  res.json({ message: 'Unliked', unlikes: post.unlikes });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
