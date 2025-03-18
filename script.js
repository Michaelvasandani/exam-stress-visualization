// Global variables to store our data and state
let midterm1Data, midterm2Data, finalData;
let currentExam = "Midterm_1";
let selectedStudents = ["S1"]; // Default to first student
let selectedMetrics = ["EDA", "HR"]; // Default selected metrics
let isPlaying = false;
let currentTimeIndex = 0;
let animationFrameId = null;
let currentPage = ""; // Track which page we're on: "landing", "body-map", "timeline", "comparison", "recovery"

// Firebase Storage URLs for data files
const FIREBASE_URLS = {
  Midterm_1: "https://firebasestorage.googleapis.com/v0/b/dsc106finalproject.firebasestorage.app/o/Midterm_1.json?alt=media&token=5c59590d-3a2d-496c-889a-739886fe345f",
  Midterm_2: "https://firebasestorage.googleapis.com/v0/b/dsc106finalproject.firebasestorage.app/o/Midterm_2.json?alt=media&token=6e010ffa-42d7-4d25-b202-9e4e53af592c",
  Final: "https://firebasestorage.googleapis.com/v0/b/dsc106finalproject.firebasestorage.app/o/Final.json?alt=media&token=3efbaf21-6e99-400c-93d8-a2f217d91948"
};

// Initialize the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Determine which page we're on based on the current URL
  const path = window.location.pathname;

  if (path.includes("body-map.html")) {
    currentPage = "body-map";
  } else if (path.includes("timeline.html")) {
    currentPage = "timeline";
  } else if (path.includes("comparison.html")) {
    currentPage = "comparison";
  } else if (path.includes("recovery.html")) {
    currentPage = "recovery";
  } else {
    currentPage = "landing";
  }

  console.log("Current page:", currentPage);

  // Show loading indicator
  const loadingIndicator = document.createElement("div");
  loadingIndicator.id = "loading-indicator";
  loadingIndicator.style.position = "fixed";
  loadingIndicator.style.top = "50%";
  loadingIndicator.style.left = "50%";
  loadingIndicator.style.transform = "translate(-50%, -50%)";
  loadingIndicator.style.padding = "20px";
  loadingIndicator.style.background = "rgba(255,255,255,0.8)";
  loadingIndicator.style.borderRadius = "5px";
  loadingIndicator.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  loadingIndicator.style.zIndex = "1000";
  loadingIndicator.innerHTML = `
    <div style="text-align: center;">
      <div style="border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; width: 50px; height: 50px; margin: 0 auto; animation: spin 1s linear infinite;"></div>
      <p style="margin-top: 10px; font-weight: bold;">Loading data from Firebase...</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(loadingIndicator);

  // Load all three datasets from Firebase Storage
  Promise.all([
    d3.json(FIREBASE_URLS.Midterm_1),
    d3.json(FIREBASE_URLS.Midterm_2),
    d3.json(FIREBASE_URLS.Final),
  ])
    .then(function (data) {
      midterm1Data = data[0];
      midterm2Data = data[1];
      finalData = data[2];

      console.log("All data loaded successfully from Firebase Storage");
      
      // Remove loading indicator
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
      
      initializeApp();
    })
    .catch(function (error) {
      console.error("Error loading the data files from Firebase:", error);
      
      // Update loading indicator to show error
      if (loadingIndicator) {
        loadingIndicator.innerHTML = `
          <div style="text-align: center;">
            <div style="color: #e74c3c; font-size: 50px; margin-bottom: 10px;">⚠️</div>
            <p style="color: #e74c3c; font-weight: bold;">Failed to load data from Firebase</p>
            <p style="margin-top: 10px;">Please check your internet connection and try again.</p>
            <button id="retry-button" style="margin-top: 15px; padding: 8px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
          </div>
        `;
        
        // Add retry button functionality
        document.getElementById("retry-button").addEventListener("click", function() {
          window.location.reload();
        });
      } else {
        alert("Failed to load data files from Firebase. Please check the console for details.");
      }
    });

  // Setup event listeners based on the current page
  if (currentPage !== "landing") {
    // Common elements across all visualization pages
    document
      .getElementById("exam-select")
      .addEventListener("change", handleExamChange);

    // Specific event listeners for each page
    if (currentPage === "body-map") {
      // Body map page doesn't need additional listeners beyond the common ones
    } else if (currentPage === "timeline") {
      document
        .getElementById("play-pause")
        .addEventListener("click", togglePlayPause);
      document
        .getElementById("time-slider")
        .addEventListener("input", handleTimeSliderChange);

      // Setup metric checkbox event listeners
      const metricCheckboxes = document.querySelectorAll(
        "#metric-checkboxes input"
      );
      metricCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", handleMetricChange);
      });
    } else if (currentPage === "comparison") {
      document
        .getElementById("performance-select")
        .addEventListener("change", updateComparisonVisualization);
      document
        .getElementById("x-axis-select")
        .addEventListener("change", updateComparisonVisualization);
      document
        .getElementById("y-axis-select")
        .addEventListener("change", updateComparisonVisualization);
      document
        .getElementById("bubble-size-select")
        .addEventListener("change", updateComparisonVisualization);
    } else if (currentPage === "recovery") {
      const analyzeBtn = document.getElementById("analyze-recovery-btn");
      if (analyzeBtn) {
        analyzeBtn.addEventListener("click", visualizeStressRecovery);
      }
    }
  }
});

// Initialize the application with the loaded data
function initializeApp() {
  // Skip initialization for landing page
  if (currentPage === "landing") {
    return;
  }

  // Common initialization steps for all visualization pages
  populateStudentCheckboxes();

  // Page-specific initialization
  if (currentPage === "body-map") {
    initializeBodyMap();
  } else if (currentPage === "timeline") {
    initializeTimelineVisualization();
    enhanceTimelineVisualization();
  } else if (currentPage === "comparison") {
    updateComparisonVisualization();
    populateInsights();
  } else if (currentPage === "recovery") {
    // Recovery page is initialized when the analyze button is clicked
  }

  // Add resize listener for responsive updates
  addResizeListener();
}

// Add resize listener for responsive updates
function addResizeListener() {
  window.addEventListener("resize", function () {
    // Debounce resize events to avoid excessive redraws
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(function () {
      // Page-specific resize handling
      if (currentPage === "timeline") {
        updateTimelineVisualization();
      } else if (currentPage === "comparison") {
        updateComparisonVisualization();
      }
    }, 250);
  });
}

// Get the currently selected dataset based on the exam choice
function getCurrentDataset() {
  switch (currentExam) {
    case "Midterm_1":
      return midterm1Data;
    case "Midterm_2":
      return midterm2Data;
    case "Final":
      return finalData;
    default:
      return midterm1Data;
  }
}

// Populate student checkboxes based on available data
function populateStudentCheckboxes() {
  const studentCheckboxesContainer =
    document.getElementById("student-checkboxes");
  if (!studentCheckboxesContainer) {
    console.error("Student checkboxes container not found");
    return;
  }

  const dataset = getCurrentDataset();

  // Clear existing checkboxes
  studentCheckboxesContainer.innerHTML = "";

  // Create a checkbox for each student in the dataset
  Object.keys(dataset).forEach((studentId, index) => {
    const checkboxLabel = document.createElement("label");
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.value = studentId;
    checkbox.name = "student";
    checkbox.checked = index === 0; // Select the first student by default

    checkbox.addEventListener("change", handleStudentChange);

    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(document.createTextNode(` ${studentId}`));

    studentCheckboxesContainer.appendChild(checkboxLabel);
  });
}

// Handle exam selection change
function handleExamChange(event) {
  currentExam = event.target.value;

  // Reset the timeline and animation state if on timeline page
  if (currentPage === "timeline") {
    currentTimeIndex = 0;
    if (isPlaying) {
      togglePlayPause();
    }

    const timeSlider = document.getElementById("time-slider");
    if (timeSlider) {
      timeSlider.value = 0;
    }

    // Update time display
    updateCurrentTimeDisplay();
  }

  // Repopulate student checkboxes as available students might differ
  populateStudentCheckboxes();

  // Reset to the first student if the current selection is empty
  if (selectedStudents.length === 0) {
    const firstStudentCheckbox = document.querySelector(
      "#student-checkboxes input"
    );
    if (firstStudentCheckbox) {
      firstStudentCheckbox.checked = true;
      selectedStudents = [firstStudentCheckbox.value];
    }
  }

  // Page-specific updates
  if (currentPage === "body-map") {
    initializeBodyMap();
  } else if (currentPage === "timeline") {
    updateTimelineVisualization();
  } else if (currentPage === "comparison") {
    updateComparisonVisualization();
    populateInsights();
  }
}

// Handle student selection change
function handleStudentChange(event) {
  // Update selectedStudents array based on checked checkboxes
  const studentCheckboxes = document.querySelectorAll(
    "#student-checkboxes input:checked"
  );
  selectedStudents = Array.from(studentCheckboxes).map(
    (checkbox) => checkbox.value
  );

  // Ensure at least one student is selected
  if (selectedStudents.length === 0) {
    event.target.checked = true;
    selectedStudents = [event.target.value];
    alert("Please select at least one student to display data.");
  }

  // Page-specific updates
  if (currentPage === "body-map") {
    updateBodyMap();

    // Add or remove multi-student legend based on selection
    if (selectedStudents.length > 1) {
      addMultiStudentLegend();
    } else {
      const existingLegend = document.getElementById("multi-student-legend");
      if (existingLegend) {
        existingLegend.remove();
      }
    }
  } else if (currentPage === "timeline") {
    updateTimelineVisualization();
  }
}

// Handle metric selection change
function handleMetricChange(event) {
  // Update selectedMetrics array based on checked checkboxes
  const metricCheckboxes = document.querySelectorAll(
    "#metric-checkboxes input:checked"
  );
  selectedMetrics = Array.from(metricCheckboxes).map(
    (checkbox) => checkbox.value
  );

  // Ensure at least one metric is selected
  if (selectedMetrics.length === 0) {
    event.target.checked = true;
    selectedMetrics = [event.target.value];
    alert("Please select at least one metric to display data.");
  }

  // Update timeline visualization
  updateTimelineVisualization();
}

// Homepage/index.html specific functionality
if (currentPage === "landing" || currentPage === "") {
  // Enhanced scrollytelling script for landing page
  const sections = document.querySelectorAll(".scroll-section");
  const header = document.querySelector(".transparent-header");

  // Set initial states
  sections.forEach((section, index) => {
    if (index === 0) {
      section.classList.add("active");
    }
  });

  // Helper function to check if element is in viewport
  function isInViewport(element, offset = 0.8) {
    const rect = element.getBoundingClientRect();
    return rect.top <= window.innerHeight * offset && rect.bottom >= 0;
  }

  // Helper function to calculate scroll progress
  function getScrollProgress(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Calculate how far the element is through the viewport
    let progress = 1 - (rect.top + rect.height) / (windowHeight + rect.height);

    // Clamp between 0 and 1
    return Math.min(Math.max(progress, 0), 1);
  }

  // Update scroll position for parallax and scroll-based animations
  function updateOnScroll() {
    sections.forEach((section) => {
      // Add active class when section is in viewport
      if (isInViewport(section)) {
        section.classList.add("active");

        // Get scroll progress for this section
        const progress = getScrollProgress(section);

        // Apply parallax effect to visual elements based on scroll progress
        const visual = section.querySelector(".visual-container");
        if (visual) {
          visual.style.transform = `translateY(${progress * -30}px)`;
        }
      } else {
        // Optional: remove active class when section leaves viewport
        // section.classList.remove("active");
      }
    });

    // Make header more transparent on scroll
    const scrollY = window.scrollY;
    if (scrollY > 100) {
      header.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
    } else {
      header.style.backgroundColor =
        "rgba(255, 255, 255, " + (0.6 + scrollY / 250) + ")";
    }
  }

  // Function to reset the metrics grid to its original state
  function resetMetricsGrid() {
    const metricsGrid = document.querySelector(".metrics-grid");
    if (metricsGrid) {
      metricsGrid.classList.remove("with-chart");
    }
  }

  // Emily's metrics visualization code for the landing page modal
  let landingPageMidterm1Data, landingPageMidterm2Data, landingPageFinalData;
  let currentMetric = "HR";
  let currentExam = "midterm1";

  // Load data for the Emily metrics chart from Firebase
  Promise.all([
    d3.json(FIREBASE_URLS.Midterm_1).catch((error) => {
      console.error("Error loading midterm1 data from Firebase:", error);
      return null;
    }),
    d3.json(FIREBASE_URLS.Midterm_2).catch((error) => {
      console.error("Error loading midterm2 data from Firebase:", error);
      return null;
    }),
    d3.json(FIREBASE_URLS.Final).catch((error) => {
      console.error("Error loading final data from Firebase:", error);
      return null;
    }),
  ]).then((data) => {
    [landingPageMidterm1Data, landingPageMidterm2Data, landingPageFinalData] =
      data;
    if (
      landingPageMidterm1Data &&
      landingPageMidterm2Data &&
      landingPageFinalData
    ) {
      console.log(
        "All data loaded successfully from Firebase for Emily's metrics visualization"
      );

      // Check if we have the data for Emily (S1)
      if (landingPageMidterm1Data.S1) {
        console.log(
          "Student S1 (Emily) metrics available:",
          Object.keys(landingPageMidterm1Data.S1).join(", ")
        );
      } else {
        console.warn("Student S1 (Emily) not found in data");
      }
    } else {
      console.warn("Some data failed to load from Firebase for Emily's metrics:", {
        midterm1: !!landingPageMidterm1Data,
        midterm2: !!landingPageMidterm2Data,
        final: !!landingPageFinalData,
      });
    }
  });

  // Helper to get the current dataset based on exam selection for Emily's metrics
  function getCurrentEmilyDataset() {
    if (currentExam === "midterm1") return landingPageMidterm1Data;
    if (currentExam === "midterm2") return landingPageMidterm2Data;
    if (currentExam === "final") return landingPageFinalData;
    return null;
  }

  // Helper to get the real metric data for a student (Emily)
  function getEmilyMetricData(metric) {
    const dataset = getCurrentEmilyDataset();
    if (!dataset) {
      console.warn("No dataset available for the selected exam:", currentExam);
      return null;
    }

    // Emily is student S1 in the dataset
    const studentId = "S1";
    const studentData = dataset[studentId];

    if (!studentData) {
      console.warn("No data found for student S1 (Emily)");
      return null;
    }

    if (!studentData[metric]) {
      console.warn(`No ${metric} data found for student S1 (Emily)`);
      return null;
    }

    console.log(
      `Processing ${studentData[metric].length} data points for ${metric}`
    );

    // Process the data - the timeline data format is different than what we need
    // Each data point has a timestamp and value
    const processedData = studentData[metric].map((point, index) => {
      return {
        time:
          (index * (currentExam === "final" ? 180 : 90)) /
          studentData[metric].length,
        value: point.value,
      };
    });

    // Filter out any potential null or undefined values
    const cleanData = processedData.filter(
      (d) => d.value !== null && d.value !== undefined
    );

    console.log(
      `Processed ${cleanData.length} valid data points for ${metric}`
    );

    return cleanData;
  }

  // Chart rendering function for Emily's metrics
  function renderEmilyChart(metric, exam) {
    const chartContainer = document.getElementById("lineChart");
    chartContainer.innerHTML = "";

    // Show loading indicator in chart container
    chartContainer.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; margin: 0 auto; animation: chartSpin 1s linear infinite;"></div>
        <p style="margin-top: 10px;">Loading data from Firebase...</p>
      </div>
      <style>
        @keyframes chartSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    // Try to get real data first
    let data = getEmilyMetricData(metric);

    // Continue only if we have actual data
    if (!data || data.length === 0) {
      console.error("No valid data found for", metric, "in", exam);

      // Display error message in the chart
      chartContainer.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #666;">
          <h3>Data Unavailable</h3>
          <p>Unable to load valid data for ${metric} in ${exam}.</p>
          <p>Please try another metric or exam.</p>
        </div>
      `;
      return;
    }

    console.log("Successfully loaded real data for", metric, "in", exam);

    // Clear the loading indicator
    chartContainer.innerHTML = "";

    const margin = { top: 30, right: 40, bottom: 60, left: 70 };
    const width = chartContainer.clientWidth - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select("#lineChart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set scales
    const x = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.time)])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([
        d3.min(data, (d) => d.value) * 0.9, // Increase space at bottom
        d3.max(data, (d) => d.value) * 1.1, // Increase space at top
      ])
      .range([height, 0]);

    // Create axes with more ticks for better readability
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(10) // Increase number of ticks
          .tickFormat((d) => {
            if (d === 0) return "0";
            return `${Math.round(d)}m`;
          })
      )
      .selectAll("text")
      .attr("font-size", "12px");

    svg
      .append("g")
      .call(d3.axisLeft(y).ticks(10)) // Increase number of ticks
      .selectAll("text")
      .attr("font-size", "12px");

    // Add axes labels with larger font
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 20)
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Time (minutes)");

    const metricUnits = {
      HR: "BPM",
      EDA: "μS",
      BVP: "a.u.",
      TEMP: "°C",
    };

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 25)
      .attr("x", -height / 2)
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(metricUnits[metric]);

    // Add grid lines for better readability
    svg
      .append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(d3.axisLeft(y).ticks(10).tickSize(-width).tickFormat(""));

    // Add the line with increased stroke width
    const line = d3
      .line()
      .x((d) => x(d.time))
      .y((d) => y(d.value))
      .curve(d3.curveCatmullRom);

    // Add path
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", getEmilyMetricColor(metric))
      .attr("stroke-width", 3.5) // Increased for better visibility
      .attr("d", line);

    // Define key events based on exam duration
    const duration = exam === "final" ? 180 : 90; // 3 hours for final, 1.5 hours for midterms
    const keyEvents = [
      { time: 0, label: "Start" },
      { time: duration * 0.3, label: "Difficult Q" },
      { time: duration * 0.5, label: "Halfway" },
      { time: duration * 0.8, label: "Time Warning" },
      { time: duration, label: "End" },
    ];

    // Add dots and labels for key events with increased size
    keyEvents.forEach((event) => {
      const closestDataPoint = data.reduce((prev, curr) => {
        return Math.abs(curr.time - event.time) <
          Math.abs(prev.time - event.time)
          ? curr
          : prev;
      });

      svg
        .append("circle")
        .attr("cx", x(closestDataPoint.time))
        .attr("cy", y(closestDataPoint.value))
        .attr("r", 6) // Increased dot size
        .attr("fill", getEmilyMetricColor(metric));

      svg
        .append("text")
        .attr("x", x(closestDataPoint.time))
        .attr(
          "y",
          event.label === "Halfway"
            ? y(closestDataPoint.value) - 20
            : y(closestDataPoint.value) + 20
        )
        .attr("text-anchor", "middle")
        .attr("font-size", "12px") // Increased font size
        .attr("font-weight", "bold")
        .text(event.label);
    });
  }

  function getEmilyMetricColor(metric) {
    const colors = {
      HR: "#ff5252",
      EDA: "#2196f3",
      BVP: "#9c27b0",
      TEMP: "#ff9800",
    };
    return colors[metric] || "#666";
  }

  // Set up the click handlers for the metric icons on landing page
  const metricIcons = document.querySelectorAll(".metric-icon");
  const chartOverlay = document.querySelector(".chart-modal-overlay");
  const metricNameSpan = document.querySelector(".metric-name");

  if (metricIcons.length > 0) {
    metricIcons.forEach((icon) => {
      icon.addEventListener("click", function () {
        currentMetric = this.dataset.metric;
        if (metricNameSpan) {
          metricNameSpan.textContent = this.querySelector(".label").textContent;
        }

        // Show the modal overlay
        if (chartOverlay) {
          chartOverlay.style.display = "flex";
          document.body.style.overflow = "hidden"; // Prevent scrolling while modal is open
        }

        // Render the chart in the modal
        renderEmilyChart(currentMetric, currentExam);

        // Highlight the active icon
        metricIcons.forEach((i) => {
          i.classList.remove("active");
        });
        this.classList.add("active");
      });
    });
  }

  // Set up the close button handler for Emily's metrics modal
  const closeButton = document.querySelector(".close-button");
  if (closeButton) {
    closeButton.addEventListener("click", function () {
      // Hide the modal overlay
      if (chartOverlay) {
        chartOverlay.style.display = "none";
        document.body.style.overflow = ""; // Restore scrolling
      }

      // Reset active icon
      if (metricIcons.length > 0) {
        metricIcons.forEach((i) => {
          i.classList.remove("active");
        });
      }
    });
  }

  // Also close when clicking on the overlay background
  if (chartOverlay) {
    chartOverlay.addEventListener("click", function (event) {
      if (event.target === chartOverlay) {
        chartOverlay.style.display = "none";
        document.body.style.overflow = ""; // Restore scrolling

        // Reset active icon
        if (metricIcons.length > 0) {
          metricIcons.forEach((i) => {
            i.classList.remove("active");
          });
        }
      }
    });
  }

  // Set up the exam button handlers
  const examButtons = document.querySelectorAll(".exam-button");
  if (examButtons.length > 0) {
    examButtons.forEach((button) => {
      button.addEventListener("click", function () {
        currentExam = this.dataset.exam;

        // Update active button
        examButtons.forEach((b) => b.classList.remove("active"));
        this.classList.add("active");

        // Re-render the chart
        renderEmilyChart(currentMetric, currentExam);
      });
    });
  }

  // Check scroll position on load
  updateOnScroll();

  // Update on scroll
  window.addEventListener("scroll", updateOnScroll);

  // Smooth scroll for arrow down
  const scrollArrow = document.querySelector(".arrow-down");
  if (scrollArrow) {
    scrollArrow.addEventListener("click", function () {
      window.scrollBy({
        top: window.innerHeight,
        behavior: "smooth",
      });
    });
  }
}

// Continue with the rest of your script here...
// Toggle play/pause of the timeline animation
function togglePlayPause() {
  const playPauseButton = document.getElementById("play-pause");
  if (!playPauseButton) {
    console.error("Play/pause button not found");
    return;
  }

  isPlaying = !isPlaying;

  if (isPlaying) {
    playPauseButton.textContent = "⏸️ Pause";
    animateTimeline();
  } else {
    playPauseButton.textContent = "▶️ Play";
    cancelAnimationFrame(animationFrameId);
  }
}

// Handle timeline slider change
function handleTimeSliderChange(event) {
  currentTimeIndex = parseInt(event.target.value);
  updateCurrentTimeDisplay();
  updateBodyMap();
}

// Animate the timeline
function animateTimeline() {
  const timeSlider = document.getElementById("time-slider");
  if (!timeSlider) {
    console.error("Time slider not found");
    return;
  }

  const maxValue = parseInt(timeSlider.max);

  // Increment time index
  currentTimeIndex++;

  // Reset if we reach the end
  if (currentTimeIndex > maxValue) {
    currentTimeIndex = 0;
  }

  // Update slider value
  timeSlider.value = currentTimeIndex;

  // Update time display and visualizations
  updateCurrentTimeDisplay();
  updateBodyMap();

  // Continue animation
  if (isPlaying) {
    animationFrameId = requestAnimationFrame(animateTimeline);
  }
}

// Update the current time display based on the slider position
function updateCurrentTimeDisplay() {
  const timeDisplay = document.getElementById("current-time");
  if (!timeDisplay) {
    console.error("Time display element not found");
    return;
  }

  const dataset = getCurrentDataset();
  const student = selectedStudents[0]; // Use first selected student for reference

  if (
    dataset &&
    dataset[student] &&
    dataset[student].EDA &&
    dataset[student].EDA.length > 0
  ) {
    const timestamps = dataset[student].EDA.map((d) => d.timestamp);
    const maxTime = Math.max(...timestamps);
    const minTime = Math.min(...timestamps);
    const timeRange = maxTime - minTime;

    // Calculate current time based on slider position
    const sliderPosition = currentTimeIndex / 100; // Normalize to 0-1
    const currentTimestamp = minTime + sliderPosition * timeRange;

    // Convert timestamp to minutes into exam
    const examStart = minTime;
    const minutesIntoExam = Math.floor((currentTimestamp - examStart) / 60);

    timeDisplay.textContent = `${minutesIntoExam} minutes into exam`;
  } else {
    timeDisplay.textContent = "Time data unavailable";
  }
}

// Initialize body map visualization
function initializeBodyMap() {
  const bodyViz = document.getElementById("body-visualization");
  if (!bodyViz) {
    console.error("Body visualization container not found");
    return;
  }

  // Show loading indicator while initializing
  bodyViz.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 500px;">
      <div style="text-align: center;">
        <div style="border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; width: 50px; height: 50px; margin: 0 auto; animation: bodyMapSpin 1s linear infinite;"></div>
        <p style="margin-top: 10px;">Loading body map visualization...</p>
      </div>
    </div>
    <style>
      @keyframes bodyMapSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  // Proceed with initialization with a small delay to allow the loading indicator to render
  setTimeout(() => {
    // Clear existing content
    bodyViz.innerHTML = "";
  
    // Create container with relative positioning
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.height = "500px";
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.alignItems = "center";
    bodyViz.appendChild(container);
  
    // SVG for 3D-like human model using more sophisticated shapes
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "0 0 300 600");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    container.appendChild(svg);
  
    // Add defs for gradients to create 3D effect
    const defs = document.createElementNS(svgNS, "defs");
    svg.appendChild(defs);
  
    // Create gradients for body parts
    createGradient(defs, "headGradient", "#ffebee", "#ffcdd2");
    createGradient(defs, "torsoGradient", "#ef5350", "#c62828");
    createGradient(defs, "limbGradient", "#bbdefb", "#64b5f6");
  
    // Create drop shadow filter
    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "dropShadow");
    filter.setAttribute("x", "-20%");
    filter.setAttribute("y", "-20%");
    filter.setAttribute("width", "140%");
    filter.setAttribute("height", "140%");
    defs.appendChild(filter);
  
    const feGaussianBlur = document.createElementNS(svgNS, "feGaussianBlur");
    feGaussianBlur.setAttribute("in", "SourceAlpha");
    feGaussianBlur.setAttribute("stdDeviation", "3");
    filter.appendChild(feGaussianBlur);
  
    const feOffset = document.createElementNS(svgNS, "feOffset");
    feOffset.setAttribute("dx", "2");
    feOffset.setAttribute("dy", "2");
    feOffset.setAttribute("result", "offsetblur");
    filter.appendChild(feOffset);
  
    const feComponentTransfer = document.createElementNS(
      svgNS,
      "feComponentTransfer"
    );
    filter.appendChild(feComponentTransfer);
  
    const feFuncA = document.createElementNS(svgNS, "feFuncA");
    feFuncA.setAttribute("type", "linear");
    feFuncA.setAttribute("slope", "0.3");
    feComponentTransfer.appendChild(feFuncA);
  
    const feMerge = document.createElementNS(svgNS, "feMerge");
    filter.appendChild(feMerge);
  
    const feMergeNode1 = document.createElementNS(svgNS, "feMergeNode");
    feMergeNode1.setAttribute("in", "offsetblur");
    feMerge.appendChild(feMergeNode1);
  
    const feMergeNode2 = document.createElementNS(svgNS, "feMergeNode");
    feMergeNode2.setAttribute("in", "SourceGraphic");
    feMerge.appendChild(feMergeNode2);
  
    // Create 3D human body parts
  
    // Head (with 3D effect)
    const head = document.createElementNS(svgNS, "g");
    head.classList.add("body-part");
    head.setAttribute("data-part", "head");
    head.setAttribute("data-metrics", "EDA,TEMP");
    head.addEventListener("click", handleBodyPartClick);
    svg.appendChild(head);
  
    const headCircle = document.createElementNS(svgNS, "ellipse");
    headCircle.setAttribute("cx", "150");
    headCircle.setAttribute("cy", "80");
    headCircle.setAttribute("rx", "60");
    headCircle.setAttribute("ry", "65");
    headCircle.setAttribute("fill", "url(#headGradient)");
    headCircle.setAttribute("stroke", "#457b9d");
    headCircle.setAttribute("stroke-width", "2");
    headCircle.setAttribute("filter", "url(#dropShadow)");
    head.appendChild(headCircle);
  
    // Add face details (optional)
    const rightEye = document.createElementNS(svgNS, "ellipse");
    rightEye.setAttribute("cx", "130");
    rightEye.setAttribute("cy", "70");
    rightEye.setAttribute("rx", "5");
    rightEye.setAttribute("ry", "3");
    rightEye.setAttribute("fill", "#333");
    head.appendChild(rightEye);
  
    const leftEye = document.createElementNS(svgNS, "ellipse");
    leftEye.setAttribute("cx", "170");
    leftEye.setAttribute("cy", "70");
    leftEye.setAttribute("rx", "5");
    leftEye.setAttribute("ry", "3");
    leftEye.setAttribute("fill", "#333");
    head.appendChild(leftEye);
  
    const mouth = document.createElementNS(svgNS, "path");
    mouth.setAttribute("d", "M135,100 Q150,110 165,100");
    mouth.setAttribute("fill", "none");
    mouth.setAttribute("stroke", "#333");
    mouth.setAttribute("stroke-width", "2");
    head.appendChild(mouth);
  
    // Neck
    const neck = document.createElementNS(svgNS, "rect");
    neck.setAttribute("x", "135");
    neck.setAttribute("y", "135");
    neck.setAttribute("width", "30");
    neck.setAttribute("height", "35");
    neck.setAttribute("fill", "url(#limbGradient)");
    neck.setAttribute("stroke", "#457b9d");
    neck.setAttribute("stroke-width", "1");
    svg.appendChild(neck);
  
    // Torso/Chest
    const torso = document.createElementNS(svgNS, "path");
    torso.classList.add("body-part");
    torso.setAttribute(
      "d",
      "M110,170 Q130,180 150,170 Q170,180 190,170 L200,350 Q150,360 100,350 Z"
    );
    torso.setAttribute("fill", "url(#torsoGradient)");
    torso.setAttribute("stroke", "#457b9d");
    torso.setAttribute("stroke-width", "2");
    torso.setAttribute("filter", "url(#dropShadow)");
    torso.setAttribute("data-part", "chest");
    torso.setAttribute("data-metrics", "HR,BVP,IBI");
    torso.addEventListener("click", handleBodyPartClick);
    svg.appendChild(torso);
  
    // Left arm (from viewer perspective)
    const leftArm = document.createElementNS(svgNS, "path");
    leftArm.classList.add("body-part");
    leftArm.setAttribute(
      "d",
      "M110,170 Q90,200 70,250 Q60,290 60,330 Q65,340 80,330 Q85,290 100,250 Q110,210 110,170"
    );
    leftArm.setAttribute("fill", "url(#limbGradient)");
    leftArm.setAttribute("stroke", "#457b9d");
    leftArm.setAttribute("stroke-width", "2");
    leftArm.setAttribute("filter", "url(#dropShadow)");
    leftArm.setAttribute("data-part", "left-arm");
    leftArm.setAttribute("data-metrics", "EDA,TEMP,ACC");
    leftArm.addEventListener("click", handleBodyPartClick);
    svg.appendChild(leftArm);
  
    // Right arm (from viewer perspective)
    const rightArm = document.createElementNS(svgNS, "path");
    rightArm.classList.add("body-part");
    rightArm.setAttribute(
      "d",
      "M190,170 Q210,210 230,250 Q245,290 240,330 Q235,340 220,330 Q215,290 200,250 Q190,200 190,170"
    );
    rightArm.setAttribute("fill", "url(#limbGradient)");
    rightArm.setAttribute("stroke", "#457b9d");
    rightArm.setAttribute("stroke-width", "2");
    rightArm.setAttribute("filter", "url(#dropShadow)");
    rightArm.setAttribute("data-part", "right-arm");
    rightArm.setAttribute("data-metrics", "EDA,TEMP,ACC");
    rightArm.addEventListener("click", handleBodyPartClick);
    svg.appendChild(rightArm);
  
    // Left hand/wrist
    const leftWrist = document.createElementNS(svgNS, "ellipse");
    leftWrist.classList.add("body-part");
    leftWrist.setAttribute("cx", "70");
    leftWrist.setAttribute("cy", "345");
    leftWrist.setAttribute("rx", "15");
    leftWrist.setAttribute("ry", "18");
    leftWrist.setAttribute("fill", "url(#limbGradient)");
    leftWrist.setAttribute("stroke", "#457b9d");
    leftWrist.setAttribute("stroke-width", "2");
    leftWrist.setAttribute("filter", "url(#dropShadow)");
    leftWrist.setAttribute("data-part", "left-wrist");
    leftWrist.setAttribute("data-metrics", "EDA,TEMP,ACC");
    leftWrist.addEventListener("click", handleBodyPartClick);
    svg.appendChild(leftWrist);
  
    // Right hand/wrist
    const rightWrist = document.createElementNS(svgNS, "ellipse");
    rightWrist.classList.add("body-part");
    rightWrist.setAttribute("cx", "230");
    rightWrist.setAttribute("cy", "345");
    rightWrist.setAttribute("rx", "15");
    rightWrist.setAttribute("ry", "18");
    rightWrist.setAttribute("fill", "url(#limbGradient)");
    rightWrist.setAttribute("stroke", "#457b9d");
    rightWrist.setAttribute("stroke-width", "2");
    rightWrist.setAttribute("filter", "url(#dropShadow)");
    rightWrist.setAttribute("data-part", "right-wrist");
    rightWrist.setAttribute("data-metrics", "EDA,TEMP,ACC");
    rightWrist.addEventListener("click", handleBodyPartClick);
    svg.appendChild(rightWrist);
  
    // Improved legs - create more 3D-like legs
    // Left leg
    const leftLeg = document.createElementNS(svgNS, "path");
    leftLeg.classList.add("body-part");
    leftLeg.setAttribute(
      "d",
      "M130,350 Q120,400 115,500 Q120,530 135,550 Q145,540 150,530 Q145,450 140,350"
    );
    leftLeg.setAttribute("fill", "url(#limbGradient)");
    leftLeg.setAttribute("stroke", "#457b9d");
    leftLeg.setAttribute("stroke-width", "2");
    leftLeg.setAttribute("filter", "url(#dropShadow)");
    leftLeg.setAttribute("data-part", "left-leg");
    leftLeg.setAttribute("data-metrics", "ACC");
    leftLeg.addEventListener("click", handleBodyPartClick);
    svg.appendChild(leftLeg);
  
    // Right leg
    const rightLeg = document.createElementNS(svgNS, "path");
    rightLeg.classList.add("body-part");
    rightLeg.setAttribute(
      "d",
      "M160,350 Q165,450 150,530 Q155,540 165,550 Q180,530 185,500 Q180,400 170,350"
    );
    rightLeg.setAttribute("fill", "url(#limbGradient)");
    rightLeg.setAttribute("stroke", "#457b9d");
    rightLeg.setAttribute("stroke-width", "2");
    rightLeg.setAttribute("filter", "url(#dropShadow)");
    rightLeg.setAttribute("data-part", "right-leg");
    rightLeg.setAttribute("data-metrics", "ACC");
    rightLeg.addEventListener("click", handleBodyPartClick);
    svg.appendChild(rightLeg);
  
    // Add left foot with 3D effect
    const leftFoot = document.createElementNS(svgNS, "path");
    leftFoot.classList.add("body-part");
    leftFoot.setAttribute(
      "d",
      "M115,550 Q125,555 135,550 L150,530 Q130,525 110,530 Z"
    );
    leftFoot.setAttribute("fill", "url(#limbGradient)");
    leftFoot.setAttribute("stroke", "#457b9d");
    leftFoot.setAttribute("stroke-width", "2");
    leftFoot.setAttribute("filter", "url(#dropShadow)");
    leftFoot.setAttribute("data-part", "left-foot");
    leftFoot.setAttribute("data-metrics", "ACC");
    leftFoot.addEventListener("click", handleBodyPartClick);
    svg.appendChild(leftFoot);
  
    // Add right foot with 3D effect
    const rightFoot = document.createElementNS(svgNS, "path");
    rightFoot.classList.add("body-part");
    rightFoot.setAttribute(
      "d",
      "M150,530 Q170,525 190,530 L190,550 Q175,555 165,550 Z"
    );
    rightFoot.setAttribute("fill", "url(#limbGradient)");
    rightFoot.setAttribute("stroke", "#457b9d");
    rightFoot.setAttribute("stroke-width", "2");
    rightFoot.setAttribute("filter", "url(#dropShadow)");
    rightFoot.setAttribute("data-part", "right-foot");
    rightFoot.setAttribute("data-metrics", "ACC");
    rightFoot.addEventListener("click", handleBodyPartClick);
    svg.appendChild(rightFoot);
  
    // Add body part labels with better positioning and styling
    const labels = [
      { x: 150, y: 30, text: "Head", datapart: "head" },
      { x: 150, y: 250, text: "Heart", datapart: "chest" },
      { x: 70, y: 345, text: "Wrist", datapart: "left-wrist" },
      { x: 230, y: 345, text: "Wrist", datapart: "right-wrist" },
      { x: 125, y: 450, text: "Leg", datapart: "left-leg" },
      { x: 175, y: 450, text: "Leg", datapart: "right-leg" },
    ];
  
    // Add text shadow filter for better text visibility
    const textShadow = document.createElementNS(svgNS, "filter");
    textShadow.setAttribute("id", "text-shadow");
    defs.appendChild(textShadow);
  
    const feDropShadow = document.createElementNS(svgNS, "feDropShadow");
    feDropShadow.setAttribute("dx", "0");
    feDropShadow.setAttribute("dy", "0");
    feDropShadow.setAttribute("stdDeviation", "1.5");
    feDropShadow.setAttribute("flood-color", "white");
    feDropShadow.setAttribute("flood-opacity", "0.7");
    textShadow.appendChild(feDropShadow);
  
    // Add the labels with better styling
    labels.forEach((label) => {
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", label.x);
      text.setAttribute("y", label.y);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#333");
      text.setAttribute("pointer-events", "none");
      text.setAttribute("filter", "url(#text-shadow)");
      text.setAttribute("data-part", label.datapart);
      text.style.fontWeight = "bold";
      text.style.fontSize = "14px";
      text.textContent = label.text;
      svg.appendChild(text);
    });
  
    // Add instruction text
    const instructionText = document.createElementNS(svgNS, "text");
    instructionText.setAttribute("x", "150");
    instructionText.setAttribute("y", "580");
    instructionText.setAttribute("text-anchor", "middle");
    instructionText.setAttribute("fill", "#666");
    instructionText.style.fontStyle = "italic";
    instructionText.style.fontSize = "14px";
    instructionText.textContent =
      "Click on a body part to see physiological data";
    svg.appendChild(instructionText);
  
    // Update the body map with data
    updateBodyMap();
  }, 100); // Small delay to ensure the loading indicator is shown
}

// Helper function to create gradient for 3D effect
function createGradient(defs, id, color1, color2) {
  const gradient = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient"
  );
  gradient.setAttribute("id", id);
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("y1", "0%");
  gradient.setAttribute("x2", "100%");
  gradient.setAttribute("y2", "100%");

  const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", color1);

  const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", color2);

  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
}

// Custom handler for body part clicks
function handleBodyPartClick(event) {
  // Remove active class from all body parts
  const bodyParts = document.querySelectorAll(".body-part");
  bodyParts.forEach((part) => {
    part.classList.remove("active");
  });

  // Add active class to clicked part
  this.classList.add("active");

  // Get data attributes
  const bodyPart = this.getAttribute("data-part");
  const relevantMetrics = this.getAttribute("data-metrics").split(",");

  // Update metrics display
  updateBodyMetricsDisplay(bodyPart, relevantMetrics);
}

// The rest of your script continues here...
// Update body metrics display based on selected body part
// Format metric values with proper units based on metric type
// Get display name for metric
// Get full name for a metric
// Format body part name to title case
// Get explanation for a body part
// Calculate correlation between two metrics
// Populate insights based on data analysis
// Calculate average of a metric for a student from a dataset
// Calculate maximum of a metric for a student
// Calculate variability (standard deviation) of a metric
// Get student grade based on actual grade data

// Error handling utility for data issues
function handleDataError(message, elementId, fallbackAction = null) {
  console.error(message);
  
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <div class="error-message" style="padding: 20px; color: #e74c3c; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
          <h4 style="margin: 0 0 10px 0;">Data Error</h4>
          <p>${message}</p>
          ${fallbackAction ? `<button id="error-action-btn" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">Try Again</button>` : ''}
        </div>
      `;
      
      if (fallbackAction) {
        document.getElementById("error-action-btn").addEventListener("click", fallbackAction);
      }
    }
  }
  
  return null;
}

// Improved caching mechanism to optimize Firebase access
const dataCache = {
  store: {},
  set: function(key, data, ttl = 1800000) { // Default TTL: 30 minutes
    this.store[key] = {
      data: data,
      expiry: Date.now() + ttl
    };
    
    // Try to also cache in localStorage for persistence between sessions
    try {
      localStorage.setItem(`dataCache_${key}`, JSON.stringify({
        data: data,
        expiry: Date.now() + ttl
      }));
    } catch (e) {
      console.warn("Could not cache data in localStorage:", e);
    }
  },
  get: function(key) {
    // First check memory cache
    const item = this.store[key];
    
    if (item && item.expiry > Date.now()) {
      console.log(`Using in-memory cached data for ${key}`);
      return item.data;
    }
    
    // Then check localStorage
    try {
      const storedItem = localStorage.getItem(`dataCache_${key}`);
      if (storedItem) {
        const parsedItem = JSON.parse(storedItem);
        if (parsedItem.expiry > Date.now()) {
          console.log(`Using localStorage cached data for ${key}`);
          // Also update memory cache
          this.store[key] = parsedItem;
          return parsedItem.data;
        } else {
          // Clean up expired cache
          localStorage.removeItem(`dataCache_${key}`);
        }
      }
    } catch (e) {
      console.warn("Error accessing localStorage cache:", e);
    }
    
    return null;
  },
  clear: function() {
    this.store = {};
    
    // Clear localStorage cache items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('dataCache_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// Firebase specific utilities
const firebaseUtils = {
  // Fetch data with retry mechanism and caching
  fetchData: async function(url, cacheKey, retries = 3) {
    // First check cache
    const cachedData = dataCache.get(cacheKey);
    if (cachedData) return cachedData;
    
    // Show loading status in console
    console.log(`Fetching data from Firebase: ${url}`);
    
    let attempt = 0;
    while (attempt < retries) {
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Successfully loaded data from Firebase: ${cacheKey}`);
        
        // Cache the data
        dataCache.set(cacheKey, data);
        
        return data;
      } catch (error) {
        attempt++;
        console.error(`Error fetching data (attempt ${attempt}/${retries}):`, error);
        
        if (attempt >= retries) {
          throw new Error(`Failed to fetch data after ${retries} attempts: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
};

// Helper function to detect network status changes
function setupNetworkStatusMonitoring() {
  window.addEventListener('online', function() {
    console.log('Connection restored! Refreshing data...');
    // Clear loading indicators that might be showing errors
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) loadingIndicator.remove();
    
    // Reload data if needed
    if (!midterm1Data || !midterm2Data || !finalData) {
      window.location.reload();
    }
  });

  window.addEventListener('offline', function() {
    console.log('Connection lost! App will attempt to use cached data.');
    // Show a notification to the user
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.background = 'rgba(255, 87, 34, 0.9)';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '9999';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.textContent = 'You are offline. Some features may be limited.';
    document.body.appendChild(notification);
    
    // Remove after a few seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  });
}

// Call this function when the app initializes
setupNetworkStatusMonitoring();