// Where the screen reads its feed. The publishable key is public (it is in
// every page of the app); the display token is NOT here. The packaged LG app
// gets it written in by scripts/reception-tv.mjs, and a browser gets it from
// the link in Admin > Reception (#token=...), remembered on that device.
window.HEC_RECEPTION = {
  feedUrl: "https://aswgmbefikhsnhogtryv.supabase.co/functions/v1/reception-feed",
  apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd2dtYmVmaWtoc25ob2d0cnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzQwNTYsImV4cCI6MjA5MzMxMDA1Nn0.ELWucKWBlB-SSW5XfewHiNeHWpIkzHe2W_gQYlJc2Gw",
  token: "",
  screen: ""  // "tv" in the packaged LG app: only it counts as the screen checking in
};
