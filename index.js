const express = require("express");

const app = express();
const PORT = 3000;
const db = require("./db");
const plansRoutes = require("./routes/plan.route");
const clientsRoutes = require("./routes/client.route");

app.use(express.json());

app.get("/", async (req, res) => {
  res.send("Server is live ...");
});

app.use("/plans", plansRoutes);
app.use("/client", clientsRoutes);

app.listen(PORT, () => {
  console.log("http://localhost:3000");
});

process.on("SIGINT", async () => {
  await db.end();
  process.exit(0);
});

// 1️⃣ GET /client/:id/balance
//    ➤ Purpose: Return the balance of a specific client.
//    ➤ Response: { id, name, balance }
//
// 2️⃣ GET /stock/available
//    ➤ Purpose: Return the number of “ready” cards for each plan.
//    ➤ Response Example:
//        [
//          { planId: 1, planName: "Zain 5K", available: 25 },
//          { planId: 2, planName: "Google Play 10$", available: 10 }
//        ]
//
// 3️⃣ GET /stock/sold
//    ➤ Purpose: Count sold cards for each plan.
//
// 4️⃣ GET /plans
//    ➤ Purpose: Return all available plans.
//
// 5️⃣ GET /plans/:id/stock
//    ➤ Purpose: Show stock summary for a single plan (ready/sold/error counts).
//    ➤ Response Example:
//        { planId, planName, ready, sold, error }
//
// 6️⃣ POST /client/:id/topup
//    ➤ Purpose: Add funds to a client’s wallet.
//    ➤ Body: { amount }
//    ➤ Response: { id, oldBalance, newBalance }
//
// 7️⃣ GET /invoice/client/:id
//    ➤ Purpose: Return recent invoices for one client (limit 50).
//
// 8️⃣ POST /stock/batch
//    ➤ Purpose: Insert multiple card codes for one plan.
//    ➤ Body: { planId, codes: ["...", "..."] }
//    ➤ Response: { inserted: N }
