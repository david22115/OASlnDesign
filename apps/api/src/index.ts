import express from "express";
import cors from "cors";

const app = express();
const port = 3001;

app.use(cors());

app.get("/", (req, res) => {
    res.json({ message: "Hello from API" });
});

app.listen(port, () => {
    console.log(`API listening at http://localhost:${port}`);
});
