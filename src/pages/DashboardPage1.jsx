import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import Layout from "../components/Layout";
import FloatingChatButton from "../chatcomponents/FloatingChatButton";
import styles from "./Dashboard.module.css";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import DeviceThermostatIcon from "@mui/icons-material/DeviceThermostat";
import CloudIcon from "@mui/icons-material/Cloud";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TravelNewsFeed from "../components/TravelNewsFeed";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import api from "../services/api";


export default function DashboardPage() {
  const [location, setLocation] = useState({ city: "", region: "", country: "" });
  const [weather, setWeather] = useState({ temp: "", description: "", humidity: "" });
  const [date, setDate] = useState("");

  const userName = localStorage.getItem("userName") || "User";

  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState("")


  const [journeyData, setJourneyData] = useState([]);

  const fetchJourney = async () => {
    try {
      const token =
        localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");

      const res = await api.get("http://localhost:4000/auth/get-plan", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true, // keep if you use refresh-cookie flow
      });
      // console.log(res.data) // e.g. { items, page, total } or { plan } depending on your route

      if (res) {
        setJourneyData(res.data.items);
      }
    } catch (err) {
      console.error("fetchJourney error:", err?.response?.data || err.message);
    }
  };

  const fetchCurrentUser = async() => {
    let user = localStorage.getItem("user") || sessionStorage.getItem("user");
    user = JSON.parse(user)
    console.log(user)
    if (user) {
      setCurrentUser(user.name)
    }

  }

  useEffect(() => {
    fetchCurrentUser();
    fetchJourney();
    const fetchNews = async () => {
      try {
        const res = await fetch(
          `https://newsdata.io/api/1/latest?apikey=pub_a9b4ef8457154e18845b075439f7ecf4&q=Travel%2C%20Famous%20places%2C%20Famous%20foods%2C%20Tourism`
        );
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          setNews(data.results);
        }
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);


  //  Get today’s date
  useEffect(() => {
    const today = new Date();
    const formatted = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const dayName = today.toLocaleDateString("en-GB", { weekday: "long" });
    setDate(`${formatted} (${dayName})`);
  }, []);

  // Get user location + weather
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Reverse geocode → city/region/country
        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const geoData = await geoRes.json();
        setLocation({
          city: geoData.city || geoData.locality,
          region: geoData.principalSubdivision,
          country: geoData.countryName,
        });

        // Weather (OpenWeather API)
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY; // set in .env
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
        );
        const weatherData = await weatherRes.json();
        setWeather({
          temp: weatherData.main.temp,
          description: weatherData.weather[0].description,
          humidity: weatherData.main.humidity,
        });
      });
    }
  }, []);

  return (
    <Box sx={{ display: "flex" }}>
      <Layout />
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ p: 1, mt: 8 }}>
          <section className={styles.section}>
            {/* Welcome */}
            <div className={styles.titleRow}>
              <div>
                <img className={styles.welcome} src="../../../stha-background.png" alt="welcome" />
                <h2 className={styles.pageTitle}>Hi {currentUser}! Welcome Back!</h2>
              </div>
            </div>

            {/* KPI Cards */}
            <div className={styles.kpiGrid}>
              {/* Location */}
              <div className={styles.iconCard}>
                <div className={`${styles.icon} ${styles.purple}`}><MyLocationIcon /></div>
                <div className={styles.kpiContent}>
                  <h6 className={styles.kpiLabel}>My Current Location</h6>
                  <h3 className={styles.kpiValue}>{location.city || "Detecting..."}</h3>
                  <p className={`${styles.delta} ${styles.up}`}>
                    {location.country} <span className={styles.muted}>({location.region})</span>
                  </p>
                </div>
              </div>

              {/* Weather */}
              <div className={styles.iconCard}>
                <div className={`${styles.icon} ${styles.success}`}><DeviceThermostatIcon /></div>
                <div className={styles.kpiContent}>
                  <h6 className={styles.kpiLabel}>Current Weather</h6>
                  <h3 className={styles.kpiValue}>
                    {weather.temp ? `${weather.temp}°C` : "Loading..."}
                  </h3>
                  <p className={`${styles.delta} ${styles.up}`}>
                    {weather.humidity && `${weather.humidity}% Humidity`}{" "}
                    <span className={styles.muted}>{weather.description}</span>
                  </p>
                </div>
              </div>

              {/* Weather description */}
              <div className={styles.iconCard}>
                <div className={`${styles.icon} ${styles.primary}`}><CloudIcon /></div>
                <div className={styles.kpiContent}>
                  <h6 className={styles.kpiLabel}>Condition</h6>
                  <h3 className={styles.kpiValue}>
                    {weather.description || "Fetching..."}
                  </h3>
                  <p className={`${styles.delta} ${styles.up}`}>Weather Updates</p>
                </div>
              </div>

              {/* Date */}
              <div className={styles.iconCard}>
                <div className={`${styles.icon} ${styles.orange}`}><CalendarMonthIcon /></div>
                <div className={styles.kpiContent}>
                  <h6 className={styles.kpiLabel}>Today</h6>
                  <h3 className={styles.kpiValue}>{date || "Loading..."}</h3>
                  <p className={`${styles.delta} ${styles.down}`}>
                    <span className={styles.muted}>Stay safe & enjoy!</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Charts row */}
            <div className={styles.gridTwoColsLargeLeft}>
              {/* CURRENT PLANS */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h6 className={styles.cardSubtitle}>Plans</h6>
                    <h3 className={styles.cardTitle}>
                      Current Plans (
                      {(Array.isArray(journeyData) ? journeyData : []).filter(
                        (p) =>
                          p.fromDate &&
                          p.toDate &&
                          new Date(p.fromDate) <= new Date() &&
                          new Date() <= new Date(p.toDate)
                      ).length}
                      )
                    </h3>
                  </div>
                  <select className={styles.select} defaultValue="Yearly">
                    <option>Yearly</option>
                    <option>Monthly</option>
                    <option>Weekly</option>
                  </select>
                </div>

                <div>Plans {(Array.isArray(journeyData) ? journeyData.length : 0)}</div>

                {/* <div className={styles.chartHolder}>
      <canvas id="chart1" className={styles.canvas}></canvas>
    </div> */}

                {/* List current plans */}
                <div style={{ padding: "12px 16px" }}>
                  {((Array.isArray(journeyData) ? journeyData : []).filter(
                    (p) =>
                      p.fromDate &&
                      p.toDate &&
                      new Date(p.fromDate) <= new Date() &&
                      new Date() <= new Date(p.toDate)
                  ).length === 0) ? (
                    <p style={{ opacity: 0.7 }}>No current plans.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {(Array.isArray(journeyData) ? journeyData : [])
                        .filter(
                          (p) =>
                            p.fromDate &&
                            p.toDate &&
                            new Date(p.fromDate) <= new Date() &&
                            new Date() <= new Date(p.toDate)
                        )
                        .map((p) => (
                          <li key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
                            <div style={{ fontWeight: 600 }}>{p.planName}</div>
                            <div style={{ fontSize: 12, color: "#667085" }}>
                              {p.source} → {p.destination} •{" "}
                              {new Date(p.fromDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              –{" "}
                              {new Date(p.toDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            {p.pythonPlan?.summary && (
                              <div style={{ fontSize: 12, marginTop: 6 }}>{p.pythonPlan.summary}</div>
                            )}
                            {typeof p?.pythonPlan?.cost_breakdown?.total_inr === "number" && (
                              <div style={{ fontSize: 12, marginTop: 6 }}>
                                Estimated Total: ₹
                                {p.pythonPlan.cost_breakdown.total_inr.toLocaleString("en-IN")}
                              </div>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* UPCOMING PLANS */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h6 className={styles.cardSubtitle}>
                    Upcoming Plans (
                    {(Array.isArray(journeyData) ? journeyData : []).filter(
                      (p) => p.fromDate && new Date(p.fromDate) > new Date()
                    ).length}
                    )
                  </h6>
                  <select className={styles.select} defaultValue="Yearly">
                    <option>Yearly</option>
                    <option>Monthly</option>
                    <option>Weekly</option>
                  </select>
                </div>



                {/* List upcoming plans */}
                <div style={{ padding: "12px 16px" }}>
                  {((Array.isArray(journeyData) ? journeyData : []).filter(
                    (p) => p.fromDate && new Date(p.fromDate) > new Date()
                  ).length === 0) ? (
                    <p style={{ opacity: 0.7 }}>No upcoming plans.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {(Array.isArray(journeyData) ? journeyData : [])
                        .filter((p) => p.fromDate && new Date(p.fromDate) > new Date())
                        .map((p) => (
                          <li key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
                            <div style={{ fontWeight: 600 }}>{p.planName}</div>
                            <div style={{ fontSize: 12, color: "#667085" }}>
                              {p.source} → {p.destination} •{" "}
                              {new Date(p.fromDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              –{" "}
                              {new Date(p.toDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            {p.pythonPlan?.summary && (
                              <div style={{ fontSize: 12, marginTop: 6 }}>{p.pythonPlan.summary}</div>
                            )}
                            {typeof p?.pythonPlan?.cost_breakdown?.total_inr === "number" && (
                              <div style={{ fontSize: 12, marginTop: 6 }}>
                                Estimated Total: ₹
                                {p.pythonPlan.cost_breakdown.total_inr.toLocaleString("en-IN")}
                              </div>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>


            {/* Travel News */}
            <div className={styles.gridTwoColsSmallLeft}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h6 className={styles.cardSubtitle}>Travel News</h6>
                </div>
                <div className={styles.cardContent}>
                  {loading ? (
                    <p className="text-gray-500 text-sm">Loading news...</p>
                  ) : news.length === 0 ? (
                    <p className="text-gray-500 text-sm">No travel news available.</p>
                  ) : (
                    <ul className="space-y-3">
                      {news.slice(0, 6).map((item, index) => (
                        <li key={index} className="border-b pb-2 last:border-none">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {item.title}
                          </a>
                          <p className="text-xs text-gray-500">
                            {item.pubDate
                              ? new Date(item.pubDate).toLocaleString()
                              : "No date"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className={styles.muted}>Last updated: Just Now</p>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h6 className={styles.cardSubtitle}>Your Scheduled Plans</h6>
                  <select className={styles.select} defaultValue="Yearly">
                    <option>Yearly</option>
                    <option>Monthly</option>
                    <option>Weekly</option>
                  </select>
                </div>

                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th></th>
                        <th>Trip Name</th>
                        <th>Location</th>
                        <th>Estimate Cost</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(journeyData) ? journeyData : []).length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", opacity: 0.7, padding: 12 }}>
                            No plans yet.
                          </td>
                        </tr>
                      ) : (
                        (Array.isArray(journeyData) ? journeyData : []).map((p) => (
                          <tr key={p.id}>
                            <td><input type="checkbox" /></td>
                            <td>
                              <div className={styles.productCell}>
                                <p>{p.planName || "—"}</p>
                              </div>
                            </td>
                            <td>{p.destination || p.source || "—"}</td>
                            <td>
                              {typeof p?.pythonPlan?.cost_breakdown?.total_inr === "number"
                                ? new Intl.NumberFormat("en-IN", {
                                  style: "currency",
                                  currency: "INR",
                                  maximumFractionDigits: 0,
                                }).format(p.pythonPlan.cost_breakdown.total_inr)
                                : "—"}
                            </td>
                            <td>
                              {p.fromDate
                                ? new Date(p.fromDate).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                })
                                : "—"}
                            </td>
                            <td>
                              {p.toDate
                                ? new Date(p.toDate).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                })
                                : "—"}
                            </td>
                            <td className={styles.textRight}>
                              <button aria-label="Edit">📝</button>|
                              <button aria-label="Delete">🗑️</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* You can continue porting more sections below if needed */}
          </section>
          {/* ======== END: Body ======== */}

          {/* Keep nested routes working if you need them later */}
          <Outlet />
        </Box>
      </Box>

      <FloatingChatButton />
    </Box>
  );
}