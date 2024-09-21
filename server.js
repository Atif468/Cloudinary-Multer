import express from "express";
import { config } from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import cloudinary from './cloudinary.js'; // Import cloudinary config
config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");

mongoose
  .connect("mongodb://127.0.0.1:27017", { dbName: "audioBlob" })
  .then(() => {
    console.log("Database connected");
  })
  .catch((error) => {
    console.error("Error connecting to DB:", error);
  });

const audioSchema = new mongoose.Schema({
  songName: {
    type: String,
  },
  authorName: {
    type: String,
  },
  image: {
    type: String,
  },
  audio: {
    type: String,
  },
});

const audioModel = mongoose.model("audioModel", audioSchema);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

const cloudinaryUploadImage = async (fileToUpload) => {
  try {
    const data = await cloudinary.uploader.upload(fileToUpload, {
      resource_type: "auto",
    });
    return data;
  } catch (error) {
    console.log("Cloudinary Error:", error);
    throw new Error("Internal Server Error (cloudinary)");
  }
};

app.get("/", (req, res) => {
  res.render("index");
});

app.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return res.status(400).send(err.message);
      } else if (err) {
        console.error("Unknown error:", err);
        return res.status(500).send("Server error");
      }
      if (!req.file) {
        return res.status(400).send("No file uploaded.");
      }
      next();
    });
  },
  async (req, res) => {
    try {
      console.log("File received:", req.file);

      const data = await cloudinaryUploadImage(req.file.path);
      const newAudio = {
        songName: req.body.name,
        authorName: req.body.author,
        image: data.secure_url,
      };
      await audioModel.create(newAudio);
      res.send("Audio file uploaded and saved in the database.");
    } catch (error) {
      console.error("Error uploading audio:", error);
      res.status(500).send("Internal server error.");
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
