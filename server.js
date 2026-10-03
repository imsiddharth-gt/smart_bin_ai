const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;

// --------------------------------
// MongoDB
// --------------------------------

mongoose.connect(
    "mongodb://127.0.0.1:27017/wastewise"
)
.then(() => {
    console.log("MongoDB connected");
})
.catch(err => {
    console.error(err);
});


// --------------------------------
// Waste Event Schema
// --------------------------------

const wasteSchema = new mongoose.Schema({

    item: String,

    confidence: Number,

    expected_bin: String,

    correct: Boolean,

    bin_id: String,

    timestamp: Date

});

const WasteEvent = mongoose.model(
    "WasteEvent",
    wasteSchema
);


// --------------------------------
// RECEIVE WASTE EVENT
// --------------------------------

app.post(
    "/api/waste-event",
    async (req, res) => {

        try {

            const {
                item,
                confidence,
                expected_bin,
                correct,
                bin_id
            } = req.body;

            const event =
                new WasteEvent({

                    item,
                    confidence,
                    expected_bin,
                    correct,
                    bin_id,

                    timestamp: new Date()

                });

            await event.save();

            res.json({

                success: true,

                message:
                    "Waste event recorded"

            });

        }

        catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                error: error.message

            });

        }

    }
);


// --------------------------------
// DASHBOARD STATISTICS
// --------------------------------

app.get(
    "/api/statistics",
    async (req, res) => {

        try {

            const total =
                await WasteEvent.countDocuments();

            const correct =
                await WasteEvent.countDocuments({
                    correct: true
                });

            const incorrect =
                await WasteEvent.countDocuments({
                    correct: false
                });

            const contaminationRate =
                total === 0
                    ? 0
                    : (
                        incorrect / total
                    ) * 100;

            res.json({

                totalItems: total,

                correctItems: correct,

                contaminatedItems: incorrect,

                contaminationRate:
                    contaminationRate.toFixed(2)

            });

        }

        catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);


// --------------------------------
// RECENT EVENTS
// --------------------------------

app.get(
    "/api/recent",
    async (req, res) => {

        try {

            const events =
                await WasteEvent
                    .find()
                    .sort({
                        timestamp: -1
                    })
                    .limit(20);

            res.json(events);

        }

        catch (error) {

            res.status(500).json({
                error: error.message
            });

        }

    }
);


// --------------------------------
// START SERVER
// --------------------------------

app.listen(
    PORT,
    () => {

        console.log(
            `WasteWise API running on port ${PORT}`
        );

    }
);