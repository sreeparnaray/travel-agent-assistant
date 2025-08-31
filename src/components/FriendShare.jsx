import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Chip,
} from "@mui/material";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";

import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import PaymentsIcon from "@mui/icons-material/Payments";
import FlightIcon from "@mui/icons-material/Flight";

export default function FriendShare() {
  const [trips, setTrips] = useState([]);
  const [newTripName, setNewTripName] = useState("");
  const [friendName, setFriendName] = useState("");
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaidBy, setExpensePaidBy] = useState("");
  const [tripDate, setTripDate] = useState("");

  // Load trips from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "trips"), (snapshot) => {
      setTrips(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Stats (KPI Cards)
  const stats = useMemo(() => {
    const totalTrips = trips.length;
    const totalFriends = trips.reduce((acc, t) => acc + (t.friends?.length || 0), 0);
    const totalExpenses = trips.reduce(
      (acc, t) => acc + t.expenses.reduce((eAcc, e) => eAcc + (e.amount || 0), 0),
      0
    );
    return { totalTrips, totalFriends, totalExpenses };
  }, [trips]);

  // Add a new trip
  const handleAddTrip = async () => {
    if (!newTripName.trim()) return;
    await addDoc(collection(db, "trips"), {
      tripName: newTripName,
      friends: [],
      expenses: [],
      planDate: "",
      confirmations: {},
    });
    setNewTripName("");
  };

  // Add friend to trip
  const handleAddFriend = async (tripId) => {
    if (!friendName.trim()) return;
    const tripRef = doc(db, "trips", tripId);
    await updateDoc(tripRef, {
      friends: arrayUnion(friendName),
      [`confirmations.${friendName}`]: false,
    });
    setFriendName("");
  };

  // Add expense to trip
  const handleAddExpense = async (tripId) => {
    if (!expenseName.trim() || !expenseAmount || !expensePaidBy.trim()) return;
    const tripRef = doc(db, "trips", tripId);
    await updateDoc(tripRef, {
      expenses: arrayUnion({
        name: expenseName,
        amount: parseFloat(expenseAmount),
        paidBy: expensePaidBy,
      }),
    });
    setExpenseName("");
    setExpenseAmount("");
    setExpensePaidBy("");
  };

  // Set trip date
  const handleSetDate = async (tripId) => {
    if (!tripDate) return;
    const tripRef = doc(db, "trips", tripId);
    await updateDoc(tripRef, { planDate: tripDate });
    setTripDate("");
  };

  // Confirm trip by friend
  const handleConfirmTrip = async (tripId, friend) => {
    const tripRef = doc(db, "trips", tripId);
    await updateDoc(tripRef, {
      [`confirmations.${friend}`]: true,
    });
  };

  return (
    <div style={styles.pageWrap}>
      <Typography variant="h4" gutterBottom >
        ✈️ Trip Collaboration
      </Typography>

      {/* KPI Row */}
      <div style={styles.kpiRow}>
        <div style={{ ...styles.kpiCard, background: "#e0f2fe" }}>
          <FlightIcon style={styles.kpiIcon} />
          <div>
            <div style={styles.kpiValue}>{stats.totalTrips}</div>
            <div style={styles.kpiLabel}>Trips</div>
          </div>
        </div>
        <div style={{ ...styles.kpiCard, background: "#fef9c3" }}>
          <PeopleIcon style={styles.kpiIcon} />
          <div>
            <div style={styles.kpiValue}>{stats.totalFriends}</div>
            <div style={styles.kpiLabel}>Friends</div>
          </div>
        </div>
        <div style={{ ...styles.kpiCard, background: "#dcfce7" }}>
          <PaymentsIcon style={styles.kpiIcon} />
          <div>
            <div style={styles.kpiValue}>₹{stats.totalExpenses}</div>
            <div style={styles.kpiLabel}>Expenses</div>
          </div>
        </div>
      </div>

      {/* Add new trip */}
      <Card style={styles.card}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ➕ Create a New Trip
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8}>
              <TextField
                label="New Trip Name"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={4}>
              <Button variant="contained" onClick={handleAddTrip} fullWidth>
                Add Trip
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Show trips */}
      {trips.map((trip) => (
        <Card key={trip.id} style={styles.card}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              🌍 {trip.tripName}
            </Typography>
            <Typography
              variant="subtitle1"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <EventIcon fontSize="small" /> Date: {trip.planDate || "Not set"}
            </Typography>

            <Divider style={styles.divider} />

            {/* Add friend & date row */}
            <Grid container spacing={2} alignItems="center" style={{ marginBottom: 12 }}>
              <Grid item xs={4}>
                <TextField
                  label="Friend Name"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <Button variant="outlined" onClick={() => handleAddFriend(trip.id)}>
                  Add Friend
                </Button>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={2}>
                <Button variant="outlined" onClick={() => handleSetDate(trip.id)}>
                  Set Date
                </Button>
              </Grid>
            </Grid>

            {/* Friends list & confirmation */}
            <Typography
              variant="subtitle2"
              gutterBottom
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <PeopleIcon fontSize="small" /> Friends:
            </Typography>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {trip.friends.map((f, idx) => (
                <Chip
                  key={idx}
                  label={trip.confirmations?.[f] ? `${f} ✔` : f}
                  color={trip.confirmations?.[f] ? "success" : "default"}
                  onClick={() =>
                    !trip.confirmations?.[f] && handleConfirmTrip(trip.id, f)
                  }
                />
              ))}
            </div>

            <Divider style={styles.divider} />

            {/* Expenses section */}
            <Typography
              variant="subtitle2"
              gutterBottom
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <PaymentsIcon fontSize="small" /> Expenses:
            </Typography>
            {trip.expenses.length > 0 ? (
              trip.expenses.map((exp, idx) => (
                <div key={idx} style={styles.expenseRow}>
                  💵 {exp.name} – ₹{exp.amount} (Paid by {exp.paidBy})
                </div>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No expenses added yet
              </Typography>
            )}

            {/* Add expense form */}
            <Grid container spacing={1} alignItems="center" style={{ marginTop: 12 }}>
              <Grid item xs={3}>
                <TextField
                  label="Expense Name"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Amount"
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="Paid By"
                  value={expensePaidBy}
                  onChange={(e) => setExpensePaidBy(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={3}>
                <Button
                  variant="contained"
                  onClick={() => handleAddExpense(trip.id)}
                  fullWidth
                >
                  Add Expense
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// 🎨 Inline Styles
const styles = {
  pageWrap: { padding: 20, marginTop: "60px", fontFamily: "system-ui, Arial, sans-serif", marginLeft: "20px"},
  pageTitle: { fontWeight: 700, marginBottom: 20, color: "#1e293b" },

  // KPI cards
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  kpiCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    borderRadius: 12,
    boxShadow: "0 3px 6px rgba(0,0,0,.1)",
  },
  kpiIcon: { fontSize: 40, color: "#111" },
  kpiValue: { fontSize: 22, fontWeight: 700 },
  kpiLabel: { fontSize: 14, color: "#334155" },

  // Cards
  card: {
    background: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
    boxShadow: "0 3px 8px rgba(0,0,0,.1)",
  },
  divider: { margin: "16px 0" },
  expenseRow: {
    padding: 6,
    margin: "4px 0",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
  },
};
