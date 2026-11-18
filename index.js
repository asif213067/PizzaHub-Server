import express from 'express';


const app = express();
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Hello Asif Khan! Hiiiiiiiiiii');
});

app.listen(port, () => {
  console.log(`Pizza Hub server is running on port ${port}`);
});
