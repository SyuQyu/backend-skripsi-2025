import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";

dotenv.config();

const app = express();

const { API_PORT } = process.env;
const port = API_PORT || 8080;

// Konfigurasi CORS dengan opsi yang lebih spesifik
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Tentukan origin yang diizinkan
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Izinkan semua metode HTTP yang dibutuhkan
    allowedHeaders: ['Content-Type', 'Authorization'], // Izinkan header tertentu
    credentials: true // Izinkan credentials (cookies, auth headers)
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser(process.env.JWT_SECRET!));

app.use(router);
// app.use(express.static(__dirname + '/' + process.env.PUBLIC_FOLDER as string));

app.get("/", (req, res) => {
    console.log(req.headers.authorization);
    res.send("Hello World!");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});