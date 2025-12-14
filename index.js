require("dotenv").config();
const bcrypt = require("bcrypt");
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.PAYMENT_SECRET);

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

const uri = `mongodb+srv://${process.env.ADMIN_NAME}:${process.env.ADMIN_PASS}@cluster0.egeojdc.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const db = client.db("digitalLifeLessons");
const usersCollection = db.collection("users");
const lessonsCollection = db.collection("lessons");
const lessonsReportsCollection = db.collection("lessonsReports");
const favoritesCollection = db.collection("favorites");
const commentsCollection = db.collection("comments");

async function run() {
  try {
    await client.connect();
    console.log("✅ MongoDB connected");

    // ==================== USERS ====================

    app.post("/users", async (req, res) => {
      try {
        const { password, ...data } = req.body;
        if (!data.email)
          return res.status(400).send({ message: "Email required" });

        const existingUser = await usersCollection.findOne({
          email: data.email,
        });
        if (existingUser)
          return res.send({ message: "User already exists", inserted: false });

        const hashedPassword = password
          ? await bcrypt.hash(password, await bcrypt.genSalt(10))
          : undefined;

        const result = await usersCollection.insertOne({
          ...data,
          password: hashedPassword,
        });
        res
          .status(201)
          .send({ message: "User created", inserted: true, result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to add user" });
      }
    });

    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).send({ message: "User not found" });

        const match = password
          ? await bcrypt.compare(password, user.password)
          : true;
        if (!match) return res.status(401).send({ message: "Wrong password" });

        res.send({ message: "Login successful", user });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Login failed" });
      }
    });

    app.get("/users/:id", async (req, res) => {
      try {
        const user = await usersCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        if (!user) return res.status(404).send({ message: "User not found" });
        res.send(user);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch user" });
      }
    });

    app.get("/users", async (req, res) => {
      try {
        const { email } = req.query;
        if (email) {
          const user = await usersCollection.findOne({ email });
          if (!user) return res.status(404).send({ message: "User not found" });
          return res.send(user);
        }
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch users" });
      }
    });

    app.patch("/users/:id", async (req, res) => {
      try {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: req.body }
        );
        if (result.matchedCount === 0)
          return res.status(404).send({ message: "User not found" });
        const updatedUser = await usersCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(updatedUser);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to update user" });
      }
    });

    app.delete("/users/:id", async (req, res) => {
      try {
        const result = await usersCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        if (result.deletedCount === 0)
          return res.status(404).send({ message: "User not found" });
        res.send({ success: true, message: "User deleted" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Delete failed" });
      }
    });

    // ==================== LESSONS ====================
    app.post("/lessons", async (req, res) => {
      try {
        const result = await lessonsCollection.insertOne(req.body);
        res.status(201).send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to add lesson" });
      }
    });

    app.get("/lessons", async (req, res) => {
      try {
        const { email } = req.query;
        const query = email ? { creatorEmail: email } : {};
        const lessons = await lessonsCollection.find(query).toArray();
        res.send(lessons);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch lessons" });
      }
    });

    app.get("/lessons/:id", async (req, res) => {
      try {
        const lesson = await lessonsCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(lesson);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch lesson" });
      }
    });

    app.patch("/lessons/:id", async (req, res) => {
      try {
        const { id } = req.params;
        await lessonsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: req.body }
        );
        const updatedLesson = await lessonsCollection.findOne({
          _id: new ObjectId(id),
        });
        res.status(200).send(updatedLesson);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to update lesson" });
      }
    });

    app.delete("/lessons/:id", async (req, res) => {
      try {
        const result = await lessonsCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Lesson not found" });
        }
        res.send({ success: true, message: "Lesson deleted" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Delete failed" });
      }
    });

    app.patch("/lessons/:id/favorite", async (req, res) => {
      try {
        const result = await lessonsCollection.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $inc: { favoritesCount: 1 } },
          { returnDocument: "after" }
        );
        res.send(result.value);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to favorite" });
      }
    });

    app.patch("/lessons/:id/like", async (req, res) => {
      try {
        const result = await lessonsCollection.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $inc: { likesCount: 1 } },
          { returnDocument: "after" }
        );
        res.send(result.value);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to like" });
      }
    });

    app.patch("/lessons/:id/view", async (req, res) => {
      try {
        const result = await lessonsCollection.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $inc: { viewsCount: 1 } },
          { returnDocument: "after" }
        );
        res.send(result.value);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to increment views" });
      }
    });

    app.patch("/lessons/:id/toggle-visibility", async (req, res) => {
      try {
        const lesson = await lessonsCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        if (!lesson)
          return res.status(404).send({ message: "Lesson not found" });

        const newVisibility =
          lesson.visibility === "Public" ? "Private" : "Public";

        const result = await lessonsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { visibility: newVisibility } }
        );

        res.send({
          modifiedCount: result.modifiedCount,
          visibility: newVisibility,
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to toggle visibility" });
      }
    });

    app.patch("/lessons/:id/toggle-access", async (req, res) => {
      try {
        const lesson = await lessonsCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        if (!lesson)
          return res.status(404).send({ message: "Lesson not found" });

        // Toggle access between "Premium" and "Free"
        const newAccess = lesson.accessLevel === "Premium" ? "Free" : "Premium";

        const result = await lessonsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { accessLevel: newAccess } }
        );

        res.send({
          modifiedCount: result.modifiedCount,
          accessLevel: newAccess,
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to toggle access" });
      }
    });

    // GET featured lessons
    app.get("/featured-lessons", async (req, res) => {
      try {
        let featuredLessons = await lessonsCollection
          .find({ featured: true })
          .toArray();

        // If no featured lessons exist, insert defaults
        if (featuredLessons.length === 0) {
          const defaultFeaturedLessons = [
            {
              title: "Boosting Creativity Through Daily Practices",
              description:
                "Creativity isn’t a talent reserved for a few—it’s a skill you can train...",
              category: "Creativity",
              emotionalTone: "Encouraging",
              userImage:
                "https://images.unsplash.com/photo-1740560052722-12abf8819817?q=80&w=1170&auto=format&fit=crop",
              accessLevel: "Free",
              creatorName: "Sophia Rivera",
              creatorPhotoURL:
                "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800",
              featured: true,
            },
            {
              title: "Breaking Negative Thought Patterns",
              description: "Your thoughts shape your actions and identity...",
              category: "Mental Wellness",
              emotionalTone: "Healing",
              userImage:
                "https://images.unsplash.com/photo-1579756423483-7ad1f01ece5c?q=80&w=1170&auto=format&fit=crop",
              accessLevel: "Free",
              creatorName: "Liam Carter",
              creatorPhotoURL:
                "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800",
              featured: true,
            },
            {
              title: "Developing Strong Communication Skills",
              description: "Effective communication opens doors...",
              category: "Skills Development",
              emotionalTone: "Practical",
              userImage:
                "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1170&auto=format&fit=crop",
              accessLevel: "Premium",
              creatorName: "Emma Blake",
              creatorPhotoURL:
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
              featured: true,
            },
          ];

          const result = await lessonsCollection.insertMany(
            defaultFeaturedLessons
          );
          featuredLessons = await lessonsCollection
            .find({ _id: { $in: result.insertedIds } })
            .toArray();
        }

        res.status(200).send(featuredLessons);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch featured lessons" });
      }
    });

    // ==================== COMMENTS ====================
    app.post("/comments", async (req, res) => {
      try {
        const result = await commentsCollection.insertOne(req.body);
        res.status(201).send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to add comment" });
      }
    });

    app.get("/comments", async (req, res) => {
      try {
        const { lessonId } = req.query;
        if (!lessonId)
          return res.status(400).send({ message: "lessonId required" });
        const comments = await commentsCollection.find({ lessonId }).toArray();
        res.send(comments);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch comments" });
      }
    });

    // ==================== FAVORITES ====================
    app.post("/favorites", async (req, res) => {
      try {
        const { userId, lessonId } = req.body;

        // Check if user already favorited this lesson
        const existing = await favoritesCollection.findOne({
          userId,
          lessonId,
        });
        if (existing) {
          return res.status(400).send({ message: "Already favorited" });
        }

        // Insert favorite
        const result = await favoritesCollection.insertOne(req.body);
        res.status(201).send({ message: "Added to favorites", result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to add favorite" });
      }
    });

    app.get("/favorites", async (req, res) => {
      try {
        const { userId } = req.query;
        const favorites = await favoritesCollection.find({ userId }).toArray();

        // populate lesson info
        const favoritesWithLessons = await Promise.all(
          favorites.map(async (fav) => {
            const lesson = await lessonsCollection.findOne({
              _id: new ObjectId(fav.lessonId),
            });
            return {
              ...fav,
              lessonTitle: lesson.title,
              lessonCategory: lesson.category,
              lessonTone: lesson.emotionalTone,
              createdAt: fav.createdAt,
            };
          })
        );

        res.send(favoritesWithLessons);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch favorites" });
      }
    });

    app.delete("/favorites/:id", async (req, res) => {
      try {
        const result = await favoritesCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        if (result.deletedCount === 0)
          return res.status(404).send({ message: "Favorite not found" });
        res.send({ success: true, message: "Favorite deleted" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to delete favorite" });
      }
    });

    // ==================== LESSONS REPORTS ====================
    app.post("/lessonsReports", async (req, res) => {
      try {
        const data = req.body;
        const result = await lessonsReportsCollection.insertOne(data);
        await lessonsCollection.updateOne(
          { _id: new ObjectId(data.lessonId) },
          { $inc: { reportsCount: 1 } }
        );
        res.status(201).send({ reportResult: result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to report" });
      }
    });

    app.get("/lessonsReports", async (req, res) => {
      try {
        const reports = await lessonsReportsCollection.find({}).toArray();
        res.status(200).send(reports);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch reports" });
      }
    });

    // ==================== PAYMENTS ====================
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      const amount = Math.floor(11.801 * 100);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amount,
              product_data: {
                name: "Premium Plan",
                description: "Access to Premium Lessons",
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: paymentInfo.userEmail,
        metadata: { userId: paymentInfo.userId, plan: "Premium" },
        success_url: `${process.env.SITE_DOMAIN}/dashboard/paymentSuccess?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/paymentCancel`,
      });
      res.json({ url: session.url });
    });

    app.get("/payment-success", async (req, res) => {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          req.query.session_id
        );
        const userEmail = session.customer_email;
        const result = await usersCollection.findOneAndUpdate(
          { email: userEmail },
          { $set: { plan: "Premium", isPremium: true } },
          { returnDocument: "after" }
        );
        res.json({ message: "Payment success", user: result.value });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Payment retrieval failed" });
      }
    });
  } catch (err) {
    console.error(err);
  }
}

run();

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
