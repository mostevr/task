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
app.get("/client/:id/balance", async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const result = await db.query(`SELECT id, name, balance FROM client WHERE id = ${clientId}`);
    if (result.rows.length === 0) {
      return res.status(404).send({ message: "Client not found" });
    }
    res.send(result.rows[0]);
  } catch (error) {
    res.status(500).send({ message: "اكو مشكله بالدنيا..." });
  }
});
//
// 2️⃣ GET /stock/available
//    ➤ Purpose: Return the number of “ready” cards for each plan.
//    ➤ Response Example:
//        [
//          { planId: 1, planName: "Zain 5K", available: 25 },
//          { planId: 2, planName: "Google Play 10$", available: 10 }
//        ]
app.get("/stock/available", async (req, res) => {
  try {
    const result = await db.query(`
                    SELECT plan.id , plan.name , COUNT(stock.id) FROM plan JOIN stock 
                    ON plan.id = stock.plan_id AND stock.state = 'ready'
                    GROUP BY plan.id, plan.name;`);
    res.send(result.rows);
  } catch (error) {
    res.status(500).send({ message: "اكو مشكله بالدنيا..." });
  }
});
//
// 3️⃣ GET /stock/sold
//    ➤ Purpose: Count sold cards for each plan.
//
app.get("/stock/sold", async (req, res) => {
  try {
    const result = await db.query(`
                    SELECT plan.id , plan.name , COUNT(stock.id) as Soled_No FROM plan JOIN stock 
                    ON plan.id = stock.plan_id AND stock.state = 'sold'
                    GROUP BY plan.id, plan.name;`);
    res.send(result.rows);
  } catch (error) {
    res.status(500).send({ message: "اكو مشكله بالدنيا..." });
  }
});
// 4️⃣ GET /plans
//    ➤ Purpose: Return all available plans.
//

//this route is already implemented in routes/plan.route.js so i am just change route path to avoid duplication
app.get("/plansfirstrows", async (req, res) => {
  try {
    const result = await db.query(`SELECT id, name, price FROM plan`);
    res.send(result.rows);
  } catch (error) {
    res.status(500).send({ message: "اكو مشكله بالدنيا..." });
  }
});


// 5️⃣ GET /plans/:id/stock
//    ➤ Purpose: Show stock summary for a single plan (ready/sold/error counts).
//    ➤ Response Example:
//        { planId, planName, ready, sold, error }
//
app.get("/plans/:id/stock", async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const result = await db.query(`
                    SELECT plan.id as planId , plan.name as planName ,
                    SUM(CASE WHEN stock.state = 'ready' THEN 1 ELSE 0 END) as ready,
                    SUM(CASE WHEN stock.state = 'sold' THEN 1 ELSE 0 END) as sold,
                    SUM(CASE WHEN stock.state = 'error' THEN 1 ELSE 0 END) as error
                    FROM plan JOIN stock 
                    ON plan.id = stock.plan_id
                    WHERE plan.id = ${planId}
                    GROUP BY plan.id, plan.name;`);
    if (result.rows.length === 0) {
      return res.status(404).send({ message: "Plan not found" });
    }
    res.send(result.rows[0]);
  } catch (error) {
    res.status(500).send({ message: "اكو مشكله بالدنيا..." });
  }
});


// 6️⃣ POST /client/:id/topup
//    ➤ Purpose: Add funds to a client’s wallet.
//    ➤ Body: { amount }
//    ➤ Response: { id, oldBalance, newBalance }
//
app.post("/client/:id/topup", async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).send({ message: "Invalid amount" });
    }

    const clientResult = await db.query(`SELECT balance FROM client WHERE id = ${clientId}`);
    if (clientResult.rows.length === 0) {
      return res.status(404).send({ message: "Client not found" });
    }

    const oldBalance = parseFloat(clientResult.rows[0].balance);
    const newBalance = oldBalance + amount;

    await db.query(`UPDATE client SET balance = ${newBalance} WHERE id = ${clientId}`);

    res.send({ id: clientId, oldBalance, newBalance });
  } catch (error) {
    res.status(500).send({ message: "اكو مشكله بالدنيا..." });
  }
});


// 7️⃣ GET /invoice/client/:id
//    ➤ Purpose: Return recent invoices for one client (limit 50).
//
app.get("/invoice/client/:id", async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const result = await db.query(`
                    SELECT id, plan_id, amount, created_at 
                    FROM invoice 
                    WHERE client_id = ${clientId}
                    ORDER BY created_at DESC
                    LIMIT 50;`);

     if (result.rows.length === 0) {
      return res.status(404).send({ message: "no invoice founded" });
    }                
                     
    res.send(result.rows);
  } catch (error) {
    res.status(500).send({ message: "اكو مشكله بالدنيا..." });
  }
});


// 8️⃣ POST /stock/batch
//    ➤ Purpose: Insert multiple card codes for one plan.
//    ➤ Body: { planId, codes: ["...", "..."] }
//    ➤ Response: { inserted: N }

app.post("/stock/batch", async (req, res) => {
  try {
    const { planId, codes } = req.body;
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).send({ message: "there is no codes inserted" });
    }

    const values = codes.map(code => `(${planId}, '${code}', 'ready')`).join(", ");
    const result = await db.query(`
                    INSERT INTO stock (plan_id, code, state) 
                    VALUES ${values}
                    RETURNING id;`);

    res.send({ inserted: result.rows.length });
  } catch (error) {
    res.status(500).send({ message: "اكو مشكله بالدنيا..." });
  }
});
