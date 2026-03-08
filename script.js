/* =========================================================
   GLOBAL VISUAL DATA — ULTIMATE RACE ENGINE (FINAL PRO v3)
   ✔ Auto interpolation to every year
   ✔ Smooth race animation
   ✔ Smooth vertical bar sliding (FLIP animation)
   ✔ Leader highlight + crown
   ✔ Stable ordering
   ✔ Numbers outside bars
   ✔ Music auto fade-out
   ✔ 2026 Audio Context Fix
========================================================= */

async function startRace() {
  const music = document.getElementById("bgMusic");

  /* Start music safely */
  music.volume = 0.35;
  music.play().catch(() => {});

  /* =========================================================
     LOAD DATA
  ========================================================= */
  const response = await fetch("data.json");
  const json = await response.json();
  const rawData = json.data;

  /* =========================================================
     INTERPOLATE DATA
  ========================================================= */
  function interpolateData(originalData) {
    const years = Object.keys(originalData)
      .map(Number)
      .sort((a, b) => a - b);

    // 1. Discover every country present in the entire dataset for safety
    const allCountries = new Set();
    years.forEach(y => {
      Object.keys(originalData[y]).forEach(c => allCountries.add(c));
    });

    const result = {};

    for (let i = 0; i < years.length - 1; i++) {
      const y1 = years[i];
      const y2 = years[i + 1];
      const start = originalData[y1];
      const end = originalData[y2];
      const span = y2 - y1;

      for (let step = 0; step < span; step++) {
        const year = y1 + step;
        result[year] = {};

        for (const country of allCountries) {
          const v1 = start[country] ?? 0;
          const v2 = end[country] ?? v1;

          // Linear interpolation formula
          const value = v1 + ((v2 - v1) * step) / span;
          result[year][country] = Math.round(value);
        }
      }
    }

    // Add the final year explicitly
    const lastYear = years[years.length - 1];
    result[lastYear] = originalData[lastYear];

    return result;
  }

  const data = interpolateData(rawData);
  const years = Object.keys(data).map(Number).sort((a, b) => a - b);
  
  // Get unique country keys for row creation
  const allCountriesList = Array.from(new Set(years.flatMap(y => Object.keys(data[y]))));

  /* =========================================================
     DOM REFERENCES
  ========================================================= */
  const chart = document.getElementById("chart");
  const yearBox = document.getElementById("yearBox");
  const leaderBanner = document.getElementById("leaderBanner");

  /* =========================================================
     FLAGS (Ensure these match your assets folder)
  ========================================================= */
  const flags = {
    usa: "assets/flags/usa.png",
    japan: "assets/flags/japan.png",
    germany: "assets/flags/germany.png",
    china: "assets/flags/china.png",
    south_korea: "assets/flags/south-korea.png",
    france: "assets/flags/france.png",
    uk: "assets/flags/uk.png",
    italy: "assets/flags/italy.png"
  };

  /* =========================================================
     CREATE ROWS
  ========================================================= */
  const rowMap = {};

  allCountriesList.forEach(country => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.dataset.country = country;

    row.innerHTML = `
      <div class="rank">0.</div>
      <div class="bar-label">
        <img src="${flags[country] || 'assets/flags/default.png'}" class="flag">
        ${country.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
      </div>
      <div class="bar-container">
        <div class="bar">
          <img src="assets/crown.png" class="crown" style="display:none;">
        </div>
        <div class="bar-value">0</div>
      </div>
    `;

    chart.appendChild(row);
    rowMap[country] = row;
  });

  /* =========================================================
     NUMBER ANIMATION
  ========================================================= */
  function animateNumber(el, start, end, duration = 500) {
    if (start === end) {
      el.textContent = end.toLocaleString();
      return;
    }
    const startTime = performance.now();
    function frame(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Out-Cubic easing
      const value = Math.floor(start + (end - start) * eased);
      el.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* =========================================================
     UPDATE YEAR & RANKINGS
  ========================================================= */
  function updateYear(year) {
    yearBox.textContent = year;
    const values = data[year];

    const sorted = Object.entries(values).sort((a, b) => b[1] - a[1]);
    const maxValue = sorted[0][1];

    /* ---------- RECORD OLD POSITIONS (FLIP PREP) ---------- */
    const positions = {};
    document.querySelectorAll(".bar-row").forEach(row => {
      positions[row.dataset.country] = row.getBoundingClientRect().top;
    });

    /* ---------- LEADER BANNER ---------- */
    if (leaderBanner) {
      const leaderName = sorted[0][0].replace(/_/g, " ").toUpperCase();
      leaderBanner.textContent = leaderName + " LEADING";
    }

    /* ---------- UPDATE BARS ---------- */
    sorted.forEach(([country, value], index) => {
      const row = rowMap[country];
      const rankEl = row.querySelector(".rank");
      const bar = row.querySelector(".bar");
      const valueEl = row.querySelector(".bar-value");
      const crown = row.querySelector(".crown");

      rankEl.textContent = (index + 1) + ".";

      const widthPercent = (value / maxValue) * 100;
      bar.style.width = widthPercent + "%";

      const current = parseInt(valueEl.textContent.replace(/,/g, "")) || 0;
      animateNumber(valueEl, current, value);

      crown.style.display = index === 0 ? "block" : "none";
      bar.classList.toggle("leader", index === 0);

      chart.appendChild(row); // Re-orders DOM based on ranking
    });

    /* ---------- FLIP ANIMATION (SMOOTH SLIDING) ---------- */
    document.querySelectorAll(".bar-row").forEach(row => {
      const oldTop = positions[row.dataset.country];
      const newTop = row.getBoundingClientRect().top;
      const delta = oldTop - newTop;

      if (delta) {
        row.style.transition = 'none'; // Instant jump to old position
        row.style.transform = `translateY(${delta}px)`;
        
        // Force a reflow
        row.offsetHeight; 

        row.style.transition = 'transform 0.6s cubic-bezier(.22,1,.36,1)';
        row.style.transform = ""; // Slide to new position
      }
    });
  }

  /* =========================================================
     PLAY RACE LOOP
  ========================================================= */
  let i = 0;
  function play() {
    updateYear(years[i]);
    i++;
    if (i < years.length) {
      setTimeout(play, 400); // Speed of the year progression
    } else {
      fadeOutMusic(music, 3000);
    }
  }

  /* =========================================================
     MUSIC FADE LOGIC
  ========================================================= */
  function fadeOutMusic(audioElement, duration) {
    const startVolume = audioElement.volume;
    const fadeSteps = 20;
    const intervalTime = duration / fadeSteps;
    const volumeStep = startVolume / fadeSteps;

    const fadeInterval = setInterval(() => {
      if (audioElement.volume > volumeStep) {
        audioElement.volume -= volumeStep;
      } else {
        audioElement.volume = 0;
        audioElement.pause();
        clearInterval(fadeInterval);
      }
    }, intervalTime);
  }

  play();
}

/* =========================================================
   INITIALIZATION (With 2026 UX & Audio Fix)
========================================================= */
function init() {
  const overlay = document.createElement("div");
  overlay.id = "startOverlay";

  overlay.innerHTML = `
    <div class="start-card">
      <h2 style="margin-top:0;font-family:'Nunito Sans';font-weight:900;">
        GLOBAL DATA VISUALS
      </h2>
      <p style="margin-bottom:20px;font-weight:600;color:#5f6f7f;">
        Ready to record the race?
      </p>
      <button class="start-btn">▶ START ENGINE</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", () => {
    // Wake up Audio Engine for 2026 Browser Policy
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    overlay.remove();
    startRace();
  });
}

window.addEventListener("load", init);