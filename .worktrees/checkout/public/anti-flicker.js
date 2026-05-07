(function() {
  try {
    var PREFIX = "tenant-branding";
    var keys = Object.keys(localStorage).filter(function(k) {
      return k.startsWith(PREFIX);
    });
    if (keys.length === 0) return;
    var mostRecent = null;
    var mostRecentTime = 0;
    for (var i = 0; i < keys.length; i++) {
      var raw = localStorage.getItem(keys[i]);
      if (!raw) continue;
      try {
        var parsed = JSON.parse(raw);
        if (parsed.timestamp > mostRecentTime) {
          mostRecentTime = parsed.timestamp;
          mostRecent = parsed.colors;
        }
      } catch (_e) {}
    }
    if (!mostRecent) return;
    var root = document.documentElement;
    var c = mostRecent;
    if (c.primary) {
      root.style.setProperty("--primary", c.primary);
      root.style.setProperty("--ring", c.primary);
      root.style.setProperty("--accent", c.primary);
      root.style.setProperty("--sidebar-primary", c.primary);
      root.style.setProperty("--sidebar-ring", c.primary);
      root.style.setProperty("--chart-1", c.primary);
    }
    if (c.secondary) {
      root.style.setProperty("--secondary", c.secondary);
      root.style.setProperty("--sidebar-accent", c.secondary);
      root.style.setProperty("--chart-2", c.secondary);
    }
    if (c.background) {
      root.style.setProperty("--background", c.background);
      root.style.setProperty("--card", c.background);
      root.style.setProperty("--popover", c.background);
      root.style.setProperty("--sidebar", c.background);
    }
    if (c.text) {
      root.style.setProperty("--foreground", c.text);
      root.style.setProperty("--card-foreground", c.text);
      root.style.setProperty("--popover-foreground", c.text);
      root.style.setProperty("--muted-foreground", c.text + "80");
      root.style.setProperty("--sidebar-foreground", c.text);
      root.style.setProperty("--sidebar-border", c.text + "20");
    }
    if (c.primaryText) {
      root.style.setProperty("--primary-foreground", c.primaryText);
      root.style.setProperty("--accent-foreground", c.primaryText);
      root.style.setProperty("--sidebar-primary-foreground", c.primaryText);
      root.style.setProperty("--sidebar-accent-foreground", c.primaryText);
    }
    if (c.secondaryText) {
      root.style.setProperty("--secondary-foreground", c.secondaryText);
    }
    if (c.background) {
      root.style.setProperty("--muted", c.background + "80");
      if (c.text) {
        root.style.setProperty("--border", c.text + "20");
        root.style.setProperty("--input", c.text + "20");
      }
    }
  } catch (_e) {}
})();
