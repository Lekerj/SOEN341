const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

app.get("/", (req, res) => {
  res.send("Welcome to ConEvents backend!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${3000}`);
});
