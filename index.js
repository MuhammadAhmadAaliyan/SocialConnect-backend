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

// === USERS ===

// Create a new user
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  const users = getData(USERS_FILE);

  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    avatar: '',
    bio: ''
  };

  users.push(newUser);
  saveData(USERS_FILE, users);
  res.status(201).json(newUser);
});

// Get all users
app.get('/users', (req, res) => {
  const users = getData(USERS_FILE);
  res.json(users);
});

// Get a specific user by ID
app.get('/users/:id', (req, res) => {
  const users = getData(USERS_FILE);
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// Update user profile (name, bio, avatar)
app.patch('/users/:id', (req, res) => {
  const users = getData(USERS_FILE);
  const index = users.findIndex(u => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'User not found' });

  const user = users[index];
  const { name, bio, avatar } = req.body;

  users[index] = {
    ...user,
    name: name ?? user.name,
    bio: bio ?? user.bio,
    avatar: avatar ?? user.avatar,
  };

  saveData(USERS_FILE, users);
  res.json(users[index]);
});

// Get posts liked by a specific user
app.get('/users/:id/liked-posts', (req, res) => {
  const posts = getData(POSTS_FILE);
  const likedPosts = posts.filter(p => p.likedBy?.includes(req.params.id));
  res.json(likedPosts);
});

// === POSTS ===

// Get all posts with user and comments enriched
app.get('/posts', (req, res) => {
  const posts = getData(POSTS_FILE);
  const users = getData(USERS_FILE);

  const enrichedPosts = posts.map(post => {
    const user = users.find(u => u.id === post.userId) || {};
    const comments = (post.comments || []).map(comment => ({
      ...comment,
      user: users.find(u => u.id === comment.userId) || {}
    }));

    return {
      ...post,
      user,
      comments,
      likes: post.likedBy?.length || 0,
      unlikes: post.unlikedBy?.length || 0,
    };
  });

  res.json(enrichedPosts);
});

// Create a new post
app.post('/posts', (req, res) => {
  const { userId, content, imageUrl } = req.body;
  const posts = getData(POSTS_FILE);

  const newPost = {
    id: Date.now().toString(),
    userId,
    content,
    imageUrl,
    timestamp: new Date().toISOString(),
    likedBy: [],
    unlikedBy: [],
    comments: []
  };

  posts.unshift(newPost);
  saveData(POSTS_FILE, posts);
  res.status(201).json(newPost);
});

// Add a comment to a post
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

  post.comments.push(newComment);
  saveData(POSTS_FILE, posts);
  res.status(201).json(newComment);
});

// Toggle like
app.post('/posts/:id/like', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const posts = getData(POSTS_FILE);

  const post = posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  post.likedBy = post.likedBy || [];
  post.unlikedBy = post.unlikedBy || [];

  const likedIndex = post.likedBy.indexOf(userId);
  const unlikedIndex = post.unlikedBy.indexOf(userId);

  if (likedIndex === -1) {
    post.likedBy.push(userId);
    if (unlikedIndex !== -1) post.unlikedBy.splice(unlikedIndex, 1);
  } else {
    post.likedBy.splice(likedIndex, 1);
  }

  saveData(POSTS_FILE, posts);
  res.json({
    message: 'Toggled like',
    likes: post.likedBy.length,
    unlikes: post.unlikedBy.length,
  });
});

// Toggle unlike
app.post('/posts/:id/unlike', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const posts = getData(POSTS_FILE);

  const post = posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  post.unlikedBy = post.unlikedBy || [];
  post.likedBy = post.likedBy || [];

  const unlikedIndex = post.unlikedBy.indexOf(userId);
  const likedIndex = post.likedBy.indexOf(userId);

  if (unlikedIndex === -1) {
    post.unlikedBy.push(userId);
    if (likedIndex !== -1) post.likedBy.splice(likedIndex, 1);
  } else {
    post.unlikedBy.splice(unlikedIndex, 1);
  }

  saveData(POSTS_FILE, posts);
  res.json({
    message: 'Toggled unlike',
    likes: post.likedBy.length,
    unlikes: post.unlikedBy.length,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
});
