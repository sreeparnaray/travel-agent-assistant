import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Divider,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";

export default function FriendLocation() {
  const [location, setLocation] = useState(null);
  const [tripName, setTripName] = useState("");
  const [friends, setFriends] = useState([]);
  const [friendName, setFriendName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [liveLink, setLiveLink] = useState("");

  // Get current user location
  const findFriend = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLocation(loc);

      // Trip Invitation Link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/trip-invite?trip=${encodeURIComponent(
        tripName || "My Trip"
      )}&lat=${loc.lat}&lng=${loc.lng}`;
      setInviteLink(link);

      // Live Location Link (Google Maps)
      const live = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
      setLiveLink(live);
    });
  };

  // Add friend to list
  const addFriend = () => {
    if (!friendName.trim()) return;
    setFriends([...friends, friendName]);
    setFriendName("");
  };

  // Social share links generator
  const getShareLinks = (link, text) => {
    const encodedText = encodeURIComponent(text);
    const encodedLink = encodeURIComponent(link);

    return {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedLink}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedLink}&text=${encodedText}`,
      telegram: `https://t.me/share/url?url=${encodedLink}&text=${encodedText}`,
      copy: link,
    };
  };

  const inviteShareLinks =
    inviteLink && getShareLinks(inviteLink, `Join my trip: ${tripName}`);
  const liveShareLinks =
    liveLink && getShareLinks(liveLink, `📍 My Live Location`);

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3, marginTop: "70px", marginLeft: "20px", marginRight: "10px"}}>
      <CardContent>
        <Typography variant="h4" gutterBottom>
          🗺️ Trip Invitation & Live Location Sharing
        </Typography>

        {/* Trip name */}
        <TextField
          label="Trip Name"
          value={tripName}
          onChange={(e) => setTripName(e.target.value)}
          fullWidth
          sx={{ mb: 2 , mt: 2}}
        />

        {/* Friend list */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={8}>
            <TextField
              label="Friend Name"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={4}>
            <Button
              variant="outlined"
              onClick={addFriend}
              fullWidth
              sx={{ height: "100%" }}
            >
              Add Friend
            </Button>
          </Grid>
        </Grid>

        {friends.length > 0 && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            👥 Friends invited: {friends.join(", ")}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Generate location & links */}
        <Button variant="contained" onClick={findFriend}>
          Generate Trip & Live Location Links
        </Button>

        {location && (
          <Typography sx={{ mt: 2 }}>
            📍 Lat: {location.lat}, Lng: {location.lng}
          </Typography>
        )}

        {/* Invitation link + sharing */}
        {inviteLink && (
          <div style={{ marginTop: 20 }}>
            <Typography variant="subtitle1" gutterBottom>
              🎉 Share Trip Invitation
            </Typography>
            <TextField
              value={inviteLink}
              fullWidth
              InputProps={{ readOnly: true }}
              sx={{ mb: 2 }}
            />
            <Grid container spacing={1}>
              {Object.entries(inviteShareLinks).map(([platform, url]) =>
                platform !== "copy" ? (
                  <Grid item key={platform}>
                    <Button
                      variant="outlined"
                      startIcon={<ShareIcon />}
                      onClick={() => window.open(url, "_blank")}
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </Button>
                  </Grid>
                ) : (
                  <Grid item key="copy">
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        alert("Invitation link copied!");
                      }}
                    >
                      Copy Link
                    </Button>
                  </Grid>
                )
              )}
            </Grid>
          </div>
        )}

        {/* Live location link + sharing */}
        {liveLink && (
          <div style={{ marginTop: 30 }}>
            <Typography variant="subtitle1" gutterBottom>
              🌍 Share Live Location
            </Typography>
            <TextField
              value={liveLink}
              fullWidth
              InputProps={{ readOnly: true }}
              sx={{ mb: 2 }}
            />
            <Grid container spacing={1}>
              {Object.entries(liveShareLinks).map(([platform, url]) =>
                platform !== "copy" ? (
                  <Grid item key={platform}>
                    <Button
                      variant="outlined"
                      startIcon={<ShareIcon />}
                      onClick={() => window.open(url, "_blank")}
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </Button>
                  </Grid>
                ) : (
                  <Grid item key="copy-live">
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        alert("Live location link copied!");
                      }}
                    >
                      Copy Link
                    </Button>
                  </Grid>
                )
              )}
            </Grid>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
