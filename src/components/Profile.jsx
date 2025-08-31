import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  Paper,
  Avatar,
} from "@mui/material";

export default function Profile() {
  const [profile, setProfile] = useState({
    name: JSON.parse(localStorage.getItem("user")).name,
    contact: "",
    address: "",
    country: "",
    email: JSON.parse(localStorage.getItem("user")).email,
    disability: "",
    emergencyContactName: "",
    emergencyPhone: "",
    relation: "",
    bloodGroup: "",
    bp: "",
    heartDisease: "",
    allergy: "",
    majorOperation: "",
    medicalHistory: "",
    physicianName: "",
    physicianContact: "",
    govtId: null,
    prescription: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setProfile((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    localStorage.setItem("profileData", JSON.stringify(profile));
    alert("Profile Saved!");
  };

  return (
    <Box sx={{ p: 3 ,mt :6}}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Grid container spacing={3}>
          {/* Profile Picture */}
          <Grid item xs={12} sm={4} md={3} sx={{ textAlign: "center" }}>
            <Avatar
              sx={{ width: 120, height: 120, margin: "0 auto", bgcolor: "primary.main" }}
            >
              {profile.name ? profile.name.charAt(0) : "U"}
            </Avatar>
            <Button variant="outlined" sx={{ mt: 2 }} component="label">
              Upload Photo
              <input hidden accept="image/*" type="file" onChange={handleChange} />
            </Button>
          </Grid>

          {/* Details */}
          <Grid item xs={12} sm={8} md={9}>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact No."
                  name="contact"
                  value={profile.contact}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Current Address"
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Id"
                  name="emailId"
                  value={profile.email}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Country"
                  name="country"
                  value={profile.country}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Disability"
                  name="disability"
                  value={profile.disability}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            {/* Emergency Contact */}
            <Typography variant="h6" sx={{ mt: 3 }}>
              Emergency Contact
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Name"
                  name="emergencyContactName"
                  value={profile.emergencyContactName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="emergencyPhone"
                  value={profile.emergencyPhone}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Relation"
                  name="relation"
                  value={profile.relation}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            {/* Medical Details */}
            <Typography variant="h6" sx={{ mt: 3 }}>
              Medical Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Blood Group"
                  name="bloodGroup"
                  value={profile.bloodGroup}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="High Blood Pressure (Yes/No)"
                  name="bp"
                  value={profile.bp}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Heart Disease (Yes/No)"
                  name="heartDisease"
                  value={profile.heartDisease}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Allergy"
                  name="allergy"
                  value={profile.allergy}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Major Operation"
                  name="majorOperation"
                  value={profile.majorOperation}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  label="Medical History"
                  name="medicalHistory"
                  value={profile.medicalHistory}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            {/* Physician Info */}
            <Typography variant="h6" sx={{ mt: 3 }}>
              Family Physician
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Physician Name"
                  name="physicianName"
                  value={profile.physicianName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Physician Contact"
                  name="physicianContact"
                  value={profile.physicianContact}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            {/* Uploads */}
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" component="label" sx={{ mr: 2 }}>
                Upload Government ID
                <input hidden type="file" name="govtId" onChange={handleChange} />
              </Button>
              <Button variant="contained" component="label">
                Upload Prescription
                <input hidden type="file" name="prescription" onChange={handleChange} />
              </Button>
            </Box>

            {/* Save Button */}
            <Box sx={{ textAlign: "right", mt: 4 }}>
              <Button variant="contained" onClick={handleSave}>
                Save
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
