import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";

const app = express();
dotenv.config();

const { API_PORT } = process.env;
const port = API_PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(router);
app.use(cookieParser(process.env.JWT_SECRET!));
// app.use(express.static(__dirname + '/' + process.env.PUBLIC_FOLDER as string));

app.get("/", (req, res) => {
    console.log(req.headers.authorization);
    res.send("Hello World!");
});

// Start the Express app listening on the specified port
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});