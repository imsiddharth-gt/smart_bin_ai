import React, { useEffect, useState } from "react";
import "./App.css";

function App() {

    const [stats, setStats] = useState(null);
    const [events, setEvents] = useState([]);

    const API = "http://localhost:5000";

    async function loadData() {

        try {

            const statsResponse =
                await fetch(
                    `${API}/api/statistics`
                );

            const statsData =
                await statsResponse.json();

            setStats(statsData);


            const eventsResponse =
                await fetch(
                    `${API}/api/recent`
                );

            const eventsData =
                await eventsResponse.json();

            setEvents(eventsData);

        }

        catch (error) {

            console.error(error);

        }

    }

    useEffect(() => {

        loadData();

        const interval =
            setInterval(
                loadData,
                5000
            );

        return () =>
            clearInterval(interval);

    }, []);


    if (!stats) {

        return (
            <div className="loading">
                Loading WasteWise...
            </div>
        );

    }


    return (

        <div className="dashboard">

            <header>

                <h1>
                    WasteWise AI
                </h1>

                <p>
                    Intelligent Waste Management
                </p>

            </header>


            <section className="cards">

                <div className="card">

                    <h3>
                        Items Detected
                    </h3>

                    <strong>
                        {stats.totalItems}
                    </strong>

                </div>


                <div className="card">

                    <h3>
                        Correctly Sorted
                    </h3>

                    <strong>
                        {stats.correctItems}
                    </strong>

                </div>


                <div className="card">

                    <h3>
                        Contaminated
                    </h3>

                    <strong>
                        {stats.contaminatedItems}
                    </strong>

                </div>


                <div className="card">

                    <h3>
                        Contamination Rate
                    </h3>

                    <strong>
                        {stats.contaminationRate}%
                    </strong>

                </div>

            </section>


            <section className="events">

                <h2>
                    Recent Waste Events
                </h2>

                <table>

                    <thead>

                        <tr>

                            <th>Item</th>

                            <th>
                                Confidence
                            </th>

                            <th>
                                Expected Bin
                            </th>

                            <th>
                                Result
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {events.map(
                            (event, index) => (

                            <tr key={index}>

                                <td>
                                    {event.item}
                                </td>

                                <td>
                                    {(
                                        event.confidence
                                        * 100
                                    ).toFixed(1)}%
                                </td>

                                <td>
                                    {event.expected_bin}
                                </td>

                                <td>

                                    {event.correct
                                        ? "✓ Correct"
                                        : "✗ Incorrect"}

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </section>

        </div>

    );

}

export default App;