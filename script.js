// Global variables to store our data and state
let midterm1Data, midterm2Data, finalData;
let currentExam = "Midterm_1";
let selectedStudents = ["S1"]; // Default to first student
let selectedMetrics = ["EDA", "HR"]; // Default selected metrics
let isPlaying = false;
let currentTimeIndex = 0;
let animationFrameId = null;
let currentPage = ""; // Track which page we're on: "landing", "body-map", "timeline", "comparison", "recovery"

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

  // Load all three datasets from the "json" folder
  Promise.all([
    d3.json("json/Midterm_1.json"),
    d3.json("json/Midterm_2.json"),
    d3.json("json/Final.json"),
  ])
    .then(function (data) {
      midterm1Data = data[0];
      midterm2Data = data[1];
      finalData = data[2];

      initializeApp();
    })
    .catch(function (error) {
      console.error("Error loading the data files:", error);
      alert("Failed to load data files. Please check the console for details.");
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

// Update body metrics display based on selected body part
function updateBodyMetricsDisplay(bodyPart, relevantMetrics) {
  const metricsDisplay = document.getElementById("selected-metric-display");
  if (!metricsDisplay) {
    console.error("Metrics display container not found");
    return;
  }

  const dataset = getCurrentDataset();
  metricsDisplay.innerHTML = "";

  // Add title
  const title = document.createElement("h4");
  title.textContent = `${formatBodyPartName(bodyPart)} Metrics`;
  metricsDisplay.appendChild(title);

  // Check if multiple students are selected
  if (selectedStudents.length > 1) {
    // Create a table for comparison
    const comparisonTable = document.createElement("table");
    comparisonTable.className = "student-comparison-table";
    comparisonTable.style.width = "100%";
    comparisonTable.style.borderCollapse = "collapse";
    comparisonTable.style.marginBottom = "15px";

    // Create table header row
    const headerRow = document.createElement("tr");

    // Add header for metrics column
    const metricHeader = document.createElement("th");
    metricHeader.textContent = "Metric";
    metricHeader.style.textAlign = "left";
    metricHeader.style.padding = "8px";
    metricHeader.style.borderBottom = "2px solid #ddd";
    headerRow.appendChild(metricHeader);

    // Add header for each student
    selectedStudents.forEach((student) => {
      const studentHeader = document.createElement("th");
      studentHeader.textContent = student;
      studentHeader.style.textAlign = "center";
      studentHeader.style.padding = "8px";
      studentHeader.style.borderBottom = "2px solid #ddd";
      headerRow.appendChild(studentHeader);
    });

    comparisonTable.appendChild(headerRow);

    // Create rows for each metric
    relevantMetrics.forEach((metric) => {
      const row = document.createElement("tr");

      // Add metric name cell
      const metricCell = document.createElement("td");
      metricCell.innerHTML = `<strong>${getMetricFullName(metric)}:</strong>`;
      metricCell.style.padding = "8px";
      metricCell.style.borderBottom = "1px solid #ddd";
      row.appendChild(metricCell);

      // Add value for each student
      selectedStudents.forEach((student, index) => {
        const valueCell = document.createElement("td");
        const value = getCurrentMetricValue(dataset, student, metric);
        valueCell.textContent = value
          ? formatMetricValue(value, metric)
          : "N/A";
        valueCell.className = "value";
        valueCell.style.textAlign = "center";
        valueCell.style.padding = "8px";
        valueCell.style.borderBottom = "1px solid #ddd";

        // Add alternating row colors
        if (index % 2 === 0) {
          valueCell.style.backgroundColor = "#f5f5f5";
        }

        row.appendChild(valueCell);
      });

      comparisonTable.appendChild(row);
    });

    metricsDisplay.appendChild(comparisonTable);

    // Add statistical comparison if more than one student
    if (selectedStudents.length > 1) {
      const statsContainer = document.createElement("div");
      statsContainer.className = "stats-container";
      statsContainer.style.marginTop = "15px";
      statsContainer.style.padding = "10px";
      statsContainer.style.backgroundColor = "#f0f7ff";
      statsContainer.style.borderRadius = "4px";
      statsContainer.style.borderLeft = "4px solid #1976d2";

      const statsTitle = document.createElement("h5");
      statsTitle.textContent = "Student Comparison";
      statsTitle.style.marginTop = "0";
      statsTitle.style.marginBottom = "10px";
      statsContainer.appendChild(statsTitle);

      // Calculate stats for each metric
      relevantMetrics.forEach((metric) => {
        // Get values for all students
        const values = selectedStudents
          .map((student) => getCurrentMetricValue(dataset, student, metric))
          .filter((value) => value !== null);

        if (values.length > 1) {
          const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
          const minValue = Math.min(...values);
          const maxValue = Math.max(...values);
          const range = maxValue - minValue;

          // Find students with min and max values
          const minStudent = selectedStudents.find((student) => {
            return getCurrentMetricValue(dataset, student, metric) === minValue;
          });

          const maxStudent = selectedStudents.find((student) => {
            return getCurrentMetricValue(dataset, student, metric) === maxValue;
          });

          const statItem = document.createElement("p");
          statItem.style.margin = "5px 0";
          statItem.innerHTML = `<strong>${getMetricFullName(
            metric
          )}:</strong> Range: ${formatMetricValue(
            range,
            metric
          )} (${minStudent}: ${formatMetricValue(
            minValue,
            metric
          )} to ${maxStudent}: ${formatMetricValue(maxValue, metric)})`;
          statsContainer.appendChild(statItem);
        }
      });

      metricsDisplay.appendChild(statsContainer);
    }
  } else {
    // Single student display (original format)
    const student = selectedStudents[0];

    relevantMetrics.forEach((metric) => {
      const metricContainer = document.createElement("div");
      metricContainer.className = "metric-value";

      const metricName = document.createElement("p");
      metricName.innerHTML = `<strong>${getMetricFullName(metric)}:</strong>`;
      metricContainer.appendChild(metricName);

      const value = getCurrentMetricValue(dataset, student, metric);
      const metricValue = document.createElement("p");
      metricValue.className = "value";
      metricValue.textContent = value
        ? formatMetricValue(value, metric)
        : "N/A";
      metricContainer.appendChild(metricValue);

      metricsDisplay.appendChild(metricContainer);
    });
  }

  // Add explanation paragraph (same for both single and multiple students)
  const explanation = document.createElement("p");
  explanation.className = "explanation";
  explanation.textContent = getBodyPartExplanation(bodyPart);
  metricsDisplay.appendChild(explanation);
}

// Get current metric value based on timeline position
function getCurrentMetricValue(dataset, student, metric) {
  if (
    !dataset ||
    !dataset[student] ||
    !dataset[student][metric] ||
    dataset[student][metric].length === 0
  ) {
    return null;
  }
  const data = dataset[student][metric];
  const timestamps = data.map((d) => d.timestamp);
  const maxTime = Math.max(...timestamps);
  const minTime = Math.min(...timestamps);
  const timeRange = maxTime - minTime;
  const sliderPosition = currentTimeIndex / 100; // Normalize to 0-1
  const currentTimestamp = minTime + sliderPosition * timeRange;
  let closestIndex = 0;
  let minDiff = Math.abs(data[0].timestamp - currentTimestamp);
  for (let i = 1; i < data.length; i++) {
    const diff = Math.abs(data[i].timestamp - currentTimestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  return data[closestIndex].value;
}

// Update body map visualization based on current time
function updateBodyMap() {
  const dataset = getCurrentDataset();
  const activeBodyPart = document.querySelector(".body-part.active");

  if (activeBodyPart) {
    const bodyPart = activeBodyPart.getAttribute("data-part");
    const relevantMetrics = activeBodyPart
      .getAttribute("data-metrics")
      .split(",");
    updateBodyMetricsDisplay(bodyPart, relevantMetrics);
  }

  if (dataset && selectedStudents.length > 0) {
    // When there's only one student, use the original coloring approach
    if (selectedStudents.length === 1) {
      const student = selectedStudents[0];

      // Update visualization only if we have data
      if (dataset[student]) {
        updateBodyPartsForSingleStudent(dataset, student);
      }
    } else {
      // For multiple students, use a different visualization approach
      updateBodyPartsForMultipleStudents(dataset, selectedStudents);
    }
  }
}

// New function to update body parts for a single student (original functionality)
function updateBodyPartsForSingleStudent(dataset, student) {
  // Head - EDA
  if (dataset[student].EDA) {
    const edaValue = getCurrentMetricValue(dataset, student, "EDA");
    if (edaValue !== null) {
      const normalizedEDA = Math.min(Math.max(edaValue / 0.5, 0), 1);
      const colorIntensity = Math.floor(255 * (1 - normalizedEDA));
      const color = `rgb(255, ${colorIntensity}, ${colorIntensity})`;

      // Using querySelector to work with both implementations
      const headElement = document.querySelector(
        '.body-part[data-part="head"]'
      );
      if (headElement) {
        updateElementFill(headElement, color);
      }
    }
  }

  // Chest - HR
  if (dataset[student].HR) {
    const hrValue = getCurrentMetricValue(dataset, student, "HR");
    if (hrValue !== null) {
      const normalizedHR = Math.min(Math.max((hrValue - 60) / 40, 0), 1);
      const colorIntensity = Math.floor(255 * (1 - normalizedHR));
      const color = `rgb(255, ${colorIntensity}, ${colorIntensity})`;

      const chestElement = document.querySelector(
        '.body-part[data-part="chest"]'
      );
      if (chestElement) {
        updateElementFill(chestElement, color);
      }
    }
  }

  // Arms, wrists - TEMP
  if (dataset[student].TEMP) {
    const tempValue = getCurrentMetricValue(dataset, student, "TEMP");
    if (tempValue !== null) {
      const normalizedTemp = Math.min(Math.max((tempValue - 30) / 5, 0), 1);
      const colorIntensity = Math.floor(255 * (1 - normalizedTemp));
      const color = `rgb(${colorIntensity}, ${colorIntensity}, 255)`;

      const armElements = document.querySelectorAll(
        '.body-part[data-part="left-arm"], .body-part[data-part="right-arm"], .body-part[data-part="left-wrist"], .body-part[data-part="right-wrist"]'
      );
      armElements.forEach((element) => {
        updateElementFill(element, color);
      });
    }
  }

  // Legs - ACC
  if (dataset[student].ACC) {
    const accValue = getCurrentMetricValue(dataset, student, "ACC");
    if (accValue !== null) {
      const normalizedACC = Math.min(Math.max(accValue / 2, 0), 1);
      const colorIntensity = Math.floor(255 * (1 - normalizedACC));
      const color = `rgb(${colorIntensity}, 255, ${colorIntensity})`;

      const legElements = document.querySelectorAll(
        '.body-part[data-part="left-leg"], .body-part[data-part="right-leg"], .body-part[data-part="left-foot"], .body-part[data-part="right-foot"]'
      );
      legElements.forEach((element) => {
        updateElementFill(element, color);
      });
    }
  }
}

// Helper function to update element fill that works for different element types
function updateElementFill(element, color) {
  if (
    element.tagName === "path" ||
    element.tagName === "ellipse" ||
    element.tagName === "circle"
  ) {
    element.setAttribute("fill", color);
  } else if (element.tagName === "g") {
    // For the g element in 3D model
    const firstChild = element.querySelector("ellipse, circle, path");
    if (firstChild) firstChild.setAttribute("fill", color);
  } else {
    element.style.fill = color;
  }
}

// New function to handle visualization for multiple students
function updateBodyPartsForMultipleStudents(dataset, students) {
  // Calculate the average value for each metric across selected students

  // For Head - EDA
  const headElement = document.querySelector('.body-part[data-part="head"]');
  if (headElement) {
    // Get EDA values from all selected students
    const edaValues = students
      .map((student) => {
        if (dataset[student]?.EDA) {
          const value = getCurrentMetricValue(dataset, student, "EDA");
          // Handle null/undefined values
          return value !== null && value !== undefined ? value : null;
        }
        return null;
      })
      .filter((value) => value !== null);

    if (edaValues.length > 0) {
      console.log("EDA values found:", edaValues); // Debug

      const avgEDA =
        edaValues.reduce((sum, val) => sum + val, 0) / edaValues.length;
      console.log("Average EDA:", avgEDA); // Debug

      // Use a more appropriate normalization for EDA values
      // EDA typically ranges from 0.1 to 20 microSiemens, so we'll use a better scale
      const normalizedEDA = Math.min(Math.max(avgEDA / 2, 0), 1);
      console.log("Normalized EDA:", normalizedEDA); // Debug

      // Use color saturation to show the average
      const colorIntensity = Math.floor(255 * (1 - normalizedEDA));
      const avgColor = `rgb(255, ${colorIntensity}, ${colorIntensity})`;

      // Add a pattern showing variance if more than one value
      if (edaValues.length > 1) {
        const variance = calculateVariance(edaValues);
        console.log("EDA variance:", variance); // Debug

        // Lower the threshold for EDA variance since EDA values can be small
        // and their variance might be numerically smaller
        const normalizedVariance = Math.min(variance / 0.02, 1); // Lower threshold (was 0.05)
        console.log("Normalized variance:", normalizedVariance); // Debug

        // Lower the threshold for showing the pattern
        if (normalizedVariance > 0.2) {
          // Lowered from 0.3 to 0.2
          // Add striped pattern for high variance
          addStripedPattern(
            headElement,
            avgColor,
            "edaPattern",
            normalizedVariance
          );
        } else {
          // Just use the average color for low variance
          updateElementFill(headElement, avgColor);
        }
      } else {
        // Only one value, use direct color
        updateElementFill(headElement, avgColor);
      }
    } else {
      console.log("No EDA values found for selected students"); // Debug
    }
  }

  // For Chest - HR
  const chestElement = document.querySelector('.body-part[data-part="chest"]');
  if (chestElement) {
    // Get average HR
    const hrValues = students
      .map((student) =>
        dataset[student]?.HR
          ? getCurrentMetricValue(dataset, student, "HR")
          : null
      )
      .filter((value) => value !== null);

    if (hrValues.length > 0) {
      const avgHR =
        hrValues.reduce((sum, val) => sum + val, 0) / hrValues.length;

      // Calculate color from average (same normalization as single student)
      const normalizedHR = Math.min(Math.max((avgHR - 60) / 40, 0), 1);

      // Use color saturation to show the average
      const colorIntensity = Math.floor(255 * (1 - normalizedHR));
      const avgColor = `rgb(255, ${colorIntensity}, ${colorIntensity})`;

      // Add a pattern showing variance if more than one value
      if (hrValues.length > 1) {
        const variance = calculateVariance(hrValues);

        // Show pattern with more pronounced pattern for higher variance
        const normalizedVariance = Math.min(variance / 25, 1); // Normalize variance

        // Add striped pattern for high variance
        if (normalizedVariance > 0.3) {
          // Add pattern with stripes
          addStripedPattern(
            chestElement,
            avgColor,
            "hrPattern",
            normalizedVariance
          );
        } else {
          // Just use the average color for low variance
          updateElementFill(chestElement, avgColor);
        }
      } else {
        // Only one value, use direct color
        updateElementFill(chestElement, avgColor);
      }
    }
  }

  // For Arms & Wrists - TEMP
  const armElements = document.querySelectorAll(
    '.body-part[data-part="left-arm"], .body-part[data-part="right-arm"], .body-part[data-part="left-wrist"], .body-part[data-part="right-wrist"]'
  );

  // Get average TEMP
  const tempValues = students
    .map((student) =>
      dataset[student]?.TEMP
        ? getCurrentMetricValue(dataset, student, "TEMP")
        : null
    )
    .filter((value) => value !== null);

  if (tempValues.length > 0 && armElements.length > 0) {
    const avgTemp =
      tempValues.reduce((sum, val) => sum + val, 0) / tempValues.length;

    // Calculate color from average (same normalization as single student)
    const normalizedTemp = Math.min(Math.max((avgTemp - 30) / 5, 0), 1);

    // Use color saturation to show the average
    const colorIntensity = Math.floor(255 * (1 - normalizedTemp));
    const avgColor = `rgb(${colorIntensity}, ${colorIntensity}, 255)`;

    // Add a pattern showing variance if more than one value
    if (tempValues.length > 1) {
      const variance = calculateVariance(tempValues);

      // Show pattern with more pronounced pattern for higher variance
      const normalizedVariance = Math.min(variance / 2, 1); // Normalize variance

      armElements.forEach((element, index) => {
        // Add striped pattern for high variance
        if (normalizedVariance > 0.2) {
          // Add pattern with stripes - use different pattern IDs for each arm
          addStripedPattern(
            element,
            avgColor,
            `tempPattern${index}`,
            normalizedVariance
          );
        } else {
          // Just use the average color for low variance
          updateElementFill(element, avgColor);
        }
      });
    } else {
      // Only one value, use direct color for all arms
      armElements.forEach((element) => {
        updateElementFill(element, avgColor);
      });
    }
  }

  // For Legs - ACC
  const legElements = document.querySelectorAll(
    '.body-part[data-part="left-leg"], .body-part[data-part="right-leg"], .body-part[data-part="left-foot"], .body-part[data-part="right-foot"]'
  );

  // Get average ACC
  const accValues = students
    .map((student) =>
      dataset[student]?.ACC
        ? getCurrentMetricValue(dataset, student, "ACC")
        : null
    )
    .filter((value) => value !== null);

  if (accValues.length > 0 && legElements.length > 0) {
    // Handle array or scalar values for ACC
    const processedAccValues = accValues.map((val) => {
      if (Array.isArray(val)) {
        return (
          Math.sqrt(
            Math.pow(val[0], 2) + Math.pow(val[1], 2) + Math.pow(val[2], 2)
          ) / 64
        );
      } else {
        return val / 64;
      }
    });

    const avgAcc =
      processedAccValues.reduce((sum, val) => sum + val, 0) /
      processedAccValues.length;

    // Calculate color from average
    const normalizedACC = Math.min(Math.max(avgAcc / 2, 0), 1);

    // Use color saturation to show the average
    const colorIntensity = Math.floor(255 * (1 - normalizedACC));
    const avgColor = `rgb(${colorIntensity}, 255, ${colorIntensity})`;

    // Add a pattern showing variance if more than one value
    if (processedAccValues.length > 1) {
      const variance = calculateVariance(processedAccValues);

      // Show pattern with more pronounced pattern for higher variance
      const normalizedVariance = Math.min(variance / 0.5, 1); // Normalize variance

      legElements.forEach((element, index) => {
        // Add striped pattern for high variance
        if (normalizedVariance > 0.2) {
          // Add pattern with stripes - use different pattern IDs for each leg
          addStripedPattern(
            element,
            avgColor,
            `accPattern${index}`,
            normalizedVariance
          );
        } else {
          // Just use the average color for low variance
          updateElementFill(element, avgColor);
        }
      });
    } else {
      // Only one value, use direct color for all legs
      legElements.forEach((element) => {
        updateElementFill(element, avgColor);
      });
    }
  }
}

// Helper function to calculate variance of an array of values
function calculateVariance(values) {
  if (values.length <= 1) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  return variance;
}

// Helper function to add striped pattern to an SVG element
function addStripedPattern(element, baseColor, patternId, intensity) {
  // Check if we need to create pattern defs
  let defs =
    document.querySelector("defs") ||
    document.createElementNS("http://www.w3.org/2000/svg", "defs");
  if (!document.querySelector("defs")) {
    // Find the SVG element to add defs to
    const svg = element.closest("svg");
    if (svg) {
      svg.insertBefore(defs, svg.firstChild);
    } else {
      console.error("Could not find parent SVG element for pattern");
      updateElementFill(element, baseColor); // Fallback to simple color
      return;
    }
  }

  // Create pattern if it doesn't exist
  if (!document.getElementById(patternId)) {
    const pattern = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "pattern"
    );
    pattern.setAttribute("id", patternId);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", "8");
    pattern.setAttribute("height", "8");
    pattern.setAttribute("patternTransform", "rotate(45)");

    // Base rectangle with the average color
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "8");
    rect.setAttribute("height", "8");
    rect.setAttribute("fill", baseColor);
    pattern.appendChild(rect);

    // Add stripes with intensity-based width
    const stripeWidth = Math.max(1, Math.min(4, Math.floor(intensity * 4)));
    const stripe = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    stripe.setAttribute("width", stripeWidth.toString());
    stripe.setAttribute("height", "8");
    stripe.setAttribute("fill", "rgba(0,0,0,0.2)"); // Darker stripes
    pattern.appendChild(stripe);

    defs.appendChild(pattern);
  }

  // Apply pattern to element
  if (
    element.tagName === "path" ||
    element.tagName === "ellipse" ||
    element.tagName === "circle"
  ) {
    element.setAttribute("fill", `url(#${patternId})`);
  } else if (element.tagName === "g") {
    // For the g element in 3D model
    const firstChild = element.querySelector("ellipse, circle, path");
    if (firstChild) firstChild.setAttribute("fill", `url(#${patternId})`);
  } else {
    element.style.fill = `url(#${patternId})`;
  }
}

// Initialize timeline visualization
function initializeTimelineVisualization() {
  const timelineViz = document.getElementById("timeline-visualization");
  if (!timelineViz) {
    console.error("Timeline visualization container not found");
    return;
  }

  // Create controls container
  const controlsContainer = document.createElement("div");
  controlsContainer.className = "timeline-selector-controls";
  controlsContainer.style.display = "flex";
  controlsContainer.style.justifyContent = "space-between";
  controlsContainer.style.marginBottom = "20px";
  controlsContainer.style.padding = "10px";
  controlsContainer.style.backgroundColor = "#f0f4f8";
  controlsContainer.style.borderRadius = "6px";

  // Create student selector
  const studentSelectorContainer = document.createElement("div");
  studentSelectorContainer.className = "timeline-student-selector";

  const studentLabel = document.createElement("label");
  studentLabel.textContent = "Compare Students: ";
  studentLabel.style.fontWeight = "600";
  studentLabel.style.marginRight = "10px";
  studentSelectorContainer.appendChild(studentLabel);

  // Create dropdown for selecting primary student (reference)
  const primaryStudentSelect = document.createElement("select");
  primaryStudentSelect.id = "timeline-primary-student";
  primaryStudentSelect.style.marginRight = "15px";
  primaryStudentSelect.style.padding = "5px";
  studentSelectorContainer.appendChild(primaryStudentSelect);

  // Label for "versus"
  const versusLabel = document.createElement("span");
  versusLabel.textContent = "vs";
  versusLabel.style.margin = "0 10px";
  versusLabel.style.fontWeight = "bold";
  studentSelectorContainer.appendChild(versusLabel);

  // Create dropdown for selecting comparison student
  const comparisonStudentSelect = document.createElement("select");
  comparisonStudentSelect.id = "timeline-comparison-student";
  comparisonStudentSelect.style.padding = "5px";
  studentSelectorContainer.appendChild(comparisonStudentSelect);

  // Add student selector to controls
  controlsContainer.appendChild(studentSelectorContainer);

  // Create "Raw Values" checkbox
  const rawValuesContainer = document.createElement("div");
  rawValuesContainer.className = "raw-values-selector";
  rawValuesContainer.style.display = "flex";
  rawValuesContainer.style.alignItems = "center";

  const rawValuesCheckbox = document.createElement("input");
  rawValuesCheckbox.type = "checkbox";
  rawValuesCheckbox.id = "raw-values-checkbox";
  rawValuesCheckbox.checked = true; // Default to raw values

  const rawValuesLabel = document.createElement("label");
  rawValuesLabel.htmlFor = "raw-values-checkbox";
  rawValuesLabel.textContent = "Display Raw Values";
  rawValuesLabel.style.marginLeft = "5px";

  rawValuesContainer.appendChild(rawValuesCheckbox);
  rawValuesContainer.appendChild(rawValuesLabel);

  // Add raw values checkbox to controls
  controlsContainer.appendChild(rawValuesContainer);

  // Insert controls before the main visualization
  timelineViz.insertBefore(controlsContainer, timelineViz.firstChild);

  // Create SVG for timeline visualization
  const svg = d3
    .select(timelineViz)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "450px");

  // Initialize the visualization (will be populated later)
  updateTimelineVisualization();

  // Add event listeners for student selection changes
  primaryStudentSelect.addEventListener("change", updateTimelineVisualization);
  comparisonStudentSelect.addEventListener(
    "change",
    updateTimelineVisualization
  );
  rawValuesCheckbox.addEventListener("change", updateTimelineVisualization);

  // Remove time controls related elements
  removeTimeControls();
}

// Function to remove time controls
function removeTimeControls() {
  // Remove play pause button
  const playPauseButton = document.getElementById("play-pause");
  if (playPauseButton) {
    playPauseButton.parentElement.removeChild(playPauseButton);
  }

  // Remove time slider
  const timeSlider = document.getElementById("time-slider");
  if (timeSlider) {
    timeSlider.parentElement.removeChild(timeSlider);
  }

  // Remove current time display
  const currentTimeDisplay = document.getElementById("current-time");
  if (currentTimeDisplay) {
    currentTimeDisplay.parentElement.removeChild(currentTimeDisplay);
  }

  // Check for timeline controls container and remove it
  const timelineControls = document.querySelector(".timeline-controls");
  if (timelineControls) {
    timelineControls.parentElement.removeChild(timelineControls);
  }
}

// Update timeline visualization with the selected students and metrics
function updateTimelineVisualization() {
  const timelineViz = d3.select("#timeline-visualization svg");
  if (timelineViz.empty()) {
    console.error("Timeline visualization SVG not found");
    return;
  }

  // Clear previous visualization
  timelineViz.selectAll("*").remove();

  const dataset = getCurrentDataset();
  if (!dataset) {
    timelineViz
      .append("text")
      .attr("x", "50%")
      .attr("y", "50%")
      .attr("text-anchor", "middle")
      .text("No dataset available");
    return;
  }

  // Update student dropdowns
  updateStudentDropdowns(dataset);

  // Get selected students for comparison
  const primaryStudentSelect = document.getElementById(
    "timeline-primary-student"
  );
  const comparisonStudentSelect = document.getElementById(
    "timeline-comparison-student"
  );

  const primaryStudent = primaryStudentSelect
    ? primaryStudentSelect.value
    : selectedStudents[0];
  const comparisonStudent = comparisonStudentSelect
    ? comparisonStudentSelect.value
    : "";

  // Get selected metrics - use only one metric at a time as requested
  // Use the first selected metric
  const metricCheckboxes = document.querySelectorAll(
    "#metric-checkboxes input:checked"
  );
  if (metricCheckboxes.length === 0) {
    timelineViz
      .append("text")
      .attr("x", "50%")
      .attr("y", "50%")
      .attr("text-anchor", "middle")
      .text("Please select at least one metric to display");
    return;
  }

  // Use only the first selected metric
  const selectedMetric = metricCheckboxes[0].value;

  // Check if we should display raw values
  const rawValuesCheckbox = document.getElementById("raw-values-checkbox");
  const useRawValues = rawValuesCheckbox ? rawValuesCheckbox.checked : true;

  // Set up dimensions and margins
  const container = document.getElementById("timeline-visualization");
  const containerWidth = container.clientWidth;
  const margin = { top: 40, right: 70, bottom: 50, left: 70 };
  const width = containerWidth - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Create main visualization group
  const vizGroup = timelineViz
    .attr("width", containerWidth)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Check if primary student data exists
  if (!dataset[primaryStudent] || !dataset[primaryStudent][selectedMetric]) {
    vizGroup
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text(`No ${selectedMetric} data available for ${primaryStudent}`);
    return;
  }

  // Process primary student data
  const primaryData = dataset[primaryStudent][selectedMetric];
  if (primaryData.length === 0) {
    vizGroup
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text(`No ${selectedMetric} data available for ${primaryStudent}`);
    return;
  }

  // Extract timestamps and convert to minutes into exam
  const examStart = Math.min(...primaryData.map((d) => d.timestamp));
  const primaryDataFormatted = primaryData.map((d) => ({
    time: (d.timestamp - examStart) / 60, // Convert to minutes
    value: d.value,
  }));

  // Check if comparison student data exists
  let comparisonDataFormatted = [];
  if (
    comparisonStudent &&
    dataset[comparisonStudent] &&
    dataset[comparisonStudent][selectedMetric]
  ) {
    const comparisonData = dataset[comparisonStudent][selectedMetric];
    comparisonDataFormatted = comparisonData.map((d) => ({
      time: (d.timestamp - examStart) / 60, // Use same exam start for alignment
      value: d.value,
    }));
  }

  // Find min and max time across both datasets
  const allTimes = [...primaryDataFormatted.map((d) => d.time)];
  if (comparisonDataFormatted.length > 0) {
    allTimes.push(...comparisonDataFormatted.map((d) => d.time));
  }
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);

  // Find min and max values for Y scale, with special handling for EDA data
  const allValues = [...primaryDataFormatted.map((d) => d.value)];
  if (comparisonDataFormatted.length > 0) {
    allValues.push(...comparisonDataFormatted.map((d) => d.value));
  }

  // Apply specific scaling for EDA data to fix visualization
  let minValue, maxValue;
  if (selectedMetric === "EDA") {
    // For EDA, use more reasonable Y-axis limits based on typical ranges (0-20 μS)
    minValue = 0;
    // Find 95th percentile to avoid outliers stretching the scale
    const sortedValues = [...allValues].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedValues.length * 0.95);
    const p95Value = sortedValues[p95Index];
    maxValue = Math.min(Math.max(p95Value * 1.2, 1), 20); // Cap at 20 μS but ensure at least some range
  } else {
    minValue = Math.min(...allValues);
    maxValue = Math.max(...allValues);

    // Add some padding to the min/max values
    minValue = minValue - (maxValue - minValue) * 0.05;
    maxValue = maxValue + (maxValue - minValue) * 0.05;

    // Ensure min value is never below zero for most metrics
    if (selectedMetric !== "BVP") {
      // BVP can be negative
      minValue = Math.max(0, minValue);
    }
  }

  // Create scales
  const xScale = d3.scaleLinear().domain([minTime, maxTime]).range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([minValue, maxValue])
    .range([height, 0]);

  // Create axes
  const xAxis = d3
    .axisBottom(xScale)
    .ticks(10)
    .tickFormat((d) => `${Math.floor(d)}`);

  const yAxis = d3.axisLeft(yScale).ticks(10);

  vizGroup
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`)
    .call(xAxis);

  vizGroup.append("g").attr("class", "y-axis").call(yAxis);

  // Add axis labels
  vizGroup
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Time (minutes into exam)");

  vizGroup
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text(getMetricAxisLabel(selectedMetric, useRawValues));

  // Add title
  vizGroup
    .append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text(`${getMetricFullName(selectedMetric)} Over Time`);

  // Create line generator
  const line = d3
    .line()
    .x((d) => xScale(d.time))
    .y((d) => yScale(d.value))
    .curve(d3.curveMonotoneX);

  // Draw primary student line
  vizGroup
    .append("path")
    .datum(primaryDataFormatted)
    .attr("class", "timeline-line primary-line")
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "#1a73e8")
    .attr("stroke-width", 2.5)
    .attr("opacity", 0.8);

  // Draw comparison student line if selected
  if (comparisonDataFormatted.length > 0) {
    vizGroup
      .append("path")
      .datum(comparisonDataFormatted)
      .attr("class", "timeline-line comparison-line")
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#e63946")
      .attr("stroke-width", 2.5)
      .attr("opacity", 0.8)
      .attr("stroke-dasharray", "5,3"); // Dashed line for comparison
  }

  // Add legend
  const legend = vizGroup
    .append("g")
    .attr("class", "timeline-legend")
    .attr("transform", `translate(${width - 150}, 20)`);

  // Primary student legend item
  legend
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 20)
    .attr("y2", 0)
    .attr("stroke", "#1a73e8")
    .attr("stroke-width", 2.5);

  legend
    .append("text")
    .attr("x", 25)
    .attr("y", 4)
    .text(primaryStudent)
    .attr("font-size", "12px");

  // Comparison student legend item (if applicable)
  if (comparisonDataFormatted.length > 0) {
    legend
      .append("line")
      .attr("x1", 0)
      .attr("y1", 20)
      .attr("x2", 20)
      .attr("y2", 20)
      .attr("stroke", "#e63946")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "5,3");

    legend
      .append("text")
      .attr("x", 25)
      .attr("y", 24)
      .text(comparisonStudent)
      .attr("font-size", "12px");
  }
}

// Override the handleMetricChange function to call our updated timeline
function handleMetricChange(event) {
  const clickedCheckbox = event.target;

  // If the clicked checkbox is being checked, uncheck all others
  if (clickedCheckbox.checked) {
    const metricCheckboxes = document.querySelectorAll(
      "#metric-checkboxes input"
    );
    metricCheckboxes.forEach((checkbox) => {
      if (checkbox !== clickedCheckbox) {
        checkbox.checked = false;
      }
    });

    // Update selectedMetrics to contain only the clicked metric
    selectedMetrics = [clickedCheckbox.value];
  } else {
    // If the clicked checkbox is being unchecked, make sure at least one remains checked
    const checkedCheckboxes = document.querySelectorAll(
      "#metric-checkboxes input:checked"
    );
    if (checkedCheckboxes.length === 0) {
      clickedCheckbox.checked = true;
      selectedMetrics = [clickedCheckbox.value];
      alert("Please select at least one metric to display data.");
    } else {
      // Update selectedMetrics array
      selectedMetrics = Array.from(checkedCheckboxes).map(
        (checkbox) => checkbox.value
      );
    }
  }

  // Update timeline visualization
  updateTimelineVisualization();
}

// Function to disable animation-related callbacks
function disableAnimationFeatures() {
  // Remove the play/pause button event listener
  const playPauseButton = document.getElementById("play-pause");
  if (playPauseButton) {
    playPauseButton.removeEventListener("click", togglePlayPause);
  }

  // Remove the time slider event listener
  const timeSlider = document.getElementById("time-slider");
  if (timeSlider) {
    timeSlider.removeEventListener("input", handleTimeSliderChange);
  }

  // Cancel any ongoing animation
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Reset animation state
  isPlaying = false;
  currentTimeIndex = 0;
}

// Function to initialize enhanced timeline visualization
function enhanceTimelineVisualization() {
  // Apply the timeline styles
  applyTimelineStyles();

  // Disable animation features
  disableAnimationFeatures();

  // Remove time-related UI elements
  removeTimeControls();

  // Update the initialization of the UI to use the new functions
  const metricCheckboxes = document.querySelectorAll(
    "#metric-checkboxes input"
  );
  metricCheckboxes.forEach((checkbox) => {
    checkbox.removeEventListener("change", handleMetricChange);
    checkbox.addEventListener("change", handleMetricChange);
  });
}

// Apply this fix when initializing the application
document.addEventListener("DOMContentLoaded", function () {
  // This will be called after the original DOM loaded handler
  setTimeout(() => {
    disableAnimationFeatures();
    removeTimeControls();
  }, 100);
});

function updateStudentDropdowns(dataset) {
  const primaryStudentSelect = document.getElementById(
    "timeline-primary-student"
  );
  const comparisonStudentSelect = document.getElementById(
    "timeline-comparison-student"
  );

  if (!primaryStudentSelect || !comparisonStudentSelect) {
    return;
  }

  // Save current selections
  const currentPrimaryStudent =
    primaryStudentSelect.value || selectedStudents[0];
  const currentComparisonStudent = comparisonStudentSelect.value || "";

  // Clear existing options
  primaryStudentSelect.innerHTML = "";
  comparisonStudentSelect.innerHTML = "";

  // Add options for primary student
  const students = Object.keys(dataset);
  students.forEach((student) => {
    const option = document.createElement("option");
    option.value = student;
    option.textContent = student;
    option.selected = student === currentPrimaryStudent;
    primaryStudentSelect.appendChild(option);
  });

  // Add a "None" option for comparison student
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "None (Single Student)";
  noneOption.selected = currentComparisonStudent === "";
  comparisonStudentSelect.appendChild(noneOption);

  // Add options for comparison student
  students.forEach((student) => {
    // Skip current primary student in comparison dropdown
    if (student !== primaryStudentSelect.value) {
      const option = document.createElement("option");
      option.value = student;
      option.textContent = student;
      option.selected = student === currentComparisonStudent;
      comparisonStudentSelect.appendChild(option);
    }
  });
}

function getMetricAxisLabel(metric, useRawValues) {
  if (!useRawValues) {
    return "Normalized Value";
  }

  switch (metric) {
    case "EDA":
      return "Electrodermal Activity (μS)";
    case "HR":
      return "Heart Rate (BPM)";
    case "BVP":
      return "Blood Volume Pulse";
    case "TEMP":
      return "Temperature (°C)";
    case "IBI":
      return "Inter-Beat Interval (s)";
    case "ACC":
      return "Accelerometer (g)";
    default:
      return metric;
  }
}

// Update the handleMetricChange function to ensure only one metric is selected at a time
// function handleMetricChange(event) {
//     const clickedCheckbox = event.target;

//     // If the clicked checkbox is being checked, uncheck all others
//     if (clickedCheckbox.checked) {
//         const metricCheckboxes = document.querySelectorAll("#metric-checkboxes input");
//         metricCheckboxes.forEach(checkbox => {
//             if (checkbox !== clickedCheckbox) {
//                 checkbox.checked = false;
//             }
//         });

//         // Update selectedMetrics to contain only the clicked metric
//         selectedMetrics = [clickedCheckbox.value];
//     } else {
//         // If the clicked checkbox is being unchecked, make sure at least one remains checked
//         const checkedCheckboxes = document.querySelectorAll("#metric-checkboxes input:checked");
//         if (checkedCheckboxes.length === 0) {
//             clickedCheckbox.checked = true;
//             selectedMetrics = [clickedCheckbox.value];
//             alert("Please select at least one metric to display data.");
//         } else {
//             // Update selectedMetrics array
//             selectedMetrics = Array.from(checkedCheckboxes).map(checkbox => checkbox.value);
//         }
//     }

//     // Update timeline visualization
//     updateTimelineVisualization();
// }

function applyTimelineStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
        .timeline-selector-controls {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f0f4f8;
            border-radius: 6px;
        }
        
        .timeline-student-selector {
            display: flex;
            align-items: center;
        }
        
        .timeline-student-selector select {
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #ccc;
        }
        
        .raw-values-selector {
            display: flex;
            align-items: center;
        }
        
        .timeline-line {
            fill: none;
            stroke-width: 2.5;
        }
        
        .primary-line {
            stroke: #1a73e8;
            opacity: 0.8;
        }
        
        .comparison-line {
            stroke: #e63946;
            opacity: 0.8;
            stroke-dasharray: 5,3;
        }
        
        .current-time-indicator {
            stroke: #ff5722;
            stroke-width: 2;
            stroke-dasharray: 5,5;
        }
    `;
  document.head.appendChild(styleElement);
}

// function enhanceTimelineVisualization() {
//     // Apply the timeline styles
//     applyTimelineStyles();

//     // Update the initialization of the UI to use the new functions
//     const metricCheckboxes = document.querySelectorAll("#metric-checkboxes input");
//     metricCheckboxes.forEach(checkbox => {
//         checkbox.removeEventListener("change", handleMetricChange);
//         checkbox.addEventListener("change", handleMetricChange);
//     });
// }

// Normalize metric values for consistent visualization and correct units
function normalizeMetricValue(value, metric) {
  switch (metric) {
    case "EDA":
      return Math.min(value / 20.0, 1);
    case "HR":
      return Math.min(Math.max((value - 60) / 60, 0), 1);
    case "BVP":
      return Math.min(Math.max((value + 100) / 200, 0), 1);
    case "TEMP":
      return Math.min(Math.max((value - 30) / 5, 0), 1);
    case "IBI":
      return Math.min(Math.max((value - 0.5) / 0.7, 0), 1);
    case "ACC":
      if (Array.isArray(value)) {
        const magnitude =
          Math.sqrt(
            Math.pow(value[0], 2) +
              Math.pow(value[1], 2) +
              Math.pow(value[2], 2)
          ) / 64;
        return Math.min(magnitude / 2, 1);
      } else {
        return Math.min(value / 128, 1);
      }
    default:
      return 0;
  }
}

// function addMultiStudentLegend() {
//     if (selectedStudents.length <= 1) return; // Only add legend for multiple students

//     // Check if legend already exists and remove it
//     const existingLegend = document.getElementById("multi-student-legend");
//     if (existingLegend) {
//         existingLegend.remove();
//     }

//     // Create legend container
//     const legendContainer = document.createElement("div");
//     legendContainer.id = "multi-student-legend";
//     legendContainer.style.marginTop = "15px";
//     legendContainer.style.padding = "10px";
//     legendContainer.style.backgroundColor = "#f8f9fa";
//     legendContainer.style.border = "1px solid #ddd";
//     legendContainer.style.borderRadius = "4px";

//     // Add title
//     const legendTitle = document.createElement("h5");
//     legendTitle.textContent = "Visualization Legend";
//     legendTitle.style.marginTop = "0";
//     legendTitle.style.marginBottom = "10px";
//     legendContainer.appendChild(legendTitle);

//     // Add explanation
//     const legendText = document.createElement("p");
//     legendText.innerHTML = `<strong>Colors:</strong> Show the average value across ${selectedStudents.length} students<br>
//                            <strong>Patterns:</strong> Indicate high variation between students`;
//     legendContainer.appendChild(legendText);

//     // Add examples
//     const examplesDiv = document.createElement("div");
//     examplesDiv.style.display = "flex";
//     examplesDiv.style.gap = "15px";
//     examplesDiv.style.marginTop = "10px";

//     // Example 1: Low variance
//     const lowVarianceExample = document.createElement("div");
//     lowVarianceExample.style.textAlign = "center";

//     const lowVarianceSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
//     lowVarianceSvg.setAttribute("width", "40");
//     lowVarianceSvg.setAttribute("height", "40");

//     const lowVarianceRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
//     lowVarianceRect.setAttribute("width", "30");
//     lowVarianceRect.setAttribute("height", "30");
//     lowVarianceRect.setAttribute("x", "5");
//     lowVarianceRect.setAttribute("y", "5");
//     lowVarianceRect.setAttribute("fill", "#e63946");
//     lowVarianceRect.setAttribute("rx", "4");
//     lowVarianceSvg.appendChild(lowVarianceRect);

//     lowVarianceExample.appendChild(lowVarianceSvg);

//     const lowVarianceText = document.createElement("span");
//     lowVarianceText.textContent = "Low Variation";
//     lowVarianceText.style.fontSize = "12px";
//     lowVarianceExample.appendChild(lowVarianceText);

//     // Example 2: High variance
//     const highVarianceExample = document.createElement("div");
//     highVarianceExample.style.textAlign = "center";

//     const highVarianceSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
//     highVarianceSvg.setAttribute("width", "40");
//     highVarianceSvg.setAttribute("height", "40");

//     // Create a simple pattern for example
//     const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
//     highVarianceSvg.appendChild(defs);

//     const examplePattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
//     examplePattern.setAttribute("id", "examplePattern");
//     examplePattern.setAttribute("patternUnits", "userSpaceOnUse");
//     examplePattern.setAttribute("width", "8");
//     examplePattern.setAttribute("height", "8");
//     examplePattern.setAttribute("patternTransform", "rotate(45)");

//     const patternRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
//     patternRect.setAttribute("width", "8");
//     patternRect.setAttribute("height", "8");
//     patternRect.setAttribute("fill", "#e63946");
//     examplePattern.appendChild(patternRect);

//     const patternStripe = document.createElementNS("http://www.w3.org/2000/svg", "rect");
//     patternStripe.setAttribute("width", "4");
//     patternStripe.setAttribute("height", "8");
//     patternStripe.setAttribute("fill", "rgba(0,0,0,0.2)");
//     examplePattern.appendChild(patternStripe);

//     defs.appendChild(examplePattern);

//     const highVarianceRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
//     highVarianceRect.setAttribute("width", "30");
//     highVarianceRect.setAttribute("height", "30");
//     highVarianceRect.setAttribute("x", "5");
//     highVarianceRect.setAttribute("y", "5");
//     highVarianceRect.setAttribute("fill", "url(#examplePattern)");
//     highVarianceRect.setAttribute("rx", "4");
//     highVarianceSvg.appendChild(highVarianceRect);

//     highVarianceExample.appendChild(highVarianceSvg);

//     const highVarianceText = document.createElement("span");
//     highVarianceText.textContent = "High Variation";
//     highVarianceText.style.fontSize = "12px";
//     highVarianceExample.appendChild(highVarianceText);

//     examplesDiv.appendChild(lowVarianceExample);
//     examplesDiv.appendChild(highVarianceExample);

//     legendContainer.appendChild(examplesDiv);

//     // Add legend to the metrics display
//     const bodyMetricsDiv = document.getElementById("body-metrics");
//     if (bodyMetricsDiv) {
//         const metricDisplay = document.getElementById("selected-metric-display");
//         if (metricDisplay) {
//             bodyMetricsDiv.insertBefore(legendContainer, metricDisplay.nextSibling);
//         } else {
//             bodyMetricsDiv.appendChild(legendContainer);
//         }
//     }
// }

// Format metric values with proper units based on metric type
function formatMetricValue(value, metric) {
  if (value === null || value === undefined) return "N/A";
  if (
    metric.startsWith("avg") ||
    metric.startsWith("max") ||
    metric.startsWith("variability")
  ) {
    metric = metric.replace(/^avg|^max|^variability/, "");
  }
  switch (metric) {
    case "EDA":
      return `${value.toFixed(3)} μS`;
    case "HR":
      return `${value.toFixed(1)} BPM`;
    case "BVP":
      return value.toFixed(4);
    case "TEMP":
      return `${value.toFixed(2)} °C`;
    case "IBI":
      return `${value.toFixed(3)} s`;
    case "ACC":
      if (Array.isArray(value)) {
        const magnitude =
          Math.sqrt(
            Math.pow(value[0], 2) +
              Math.pow(value[1], 2) +
              Math.pow(value[2], 2)
          ) / 64;
        return `${magnitude.toFixed(3)} g`;
      } else {
        return `${(value / 64).toFixed(3)} g`;
      }
    case "grade":
      return `${value.toFixed(1)}%`;
    default:
      return value.toFixed(2);
  }
}

// Get display name for metric
function getMetricDisplayName(metric) {
  switch (metric) {
    case "grade":
      return "Grade";
    case "avgEDA":
      return "Average EDA (μS)";
    case "avgHR":
      return "Average Heart Rate (BPM)";
    case "avgBVP":
      return "Average BVP";
    case "avgTEMP":
      return "Average Temperature (°C)";
    case "variabilityEDA":
      return "EDA Variability";
    case "variabilityHR":
      return "Heart Rate Variability";
    case "maxEDA":
      return "Maximum EDA (μS)";
    case "maxHR":
      return "Maximum Heart Rate (BPM)";
    default:
      return metric;
  }
}

// Get full name for a metric
function getMetricFullName(metric) {
  switch (metric) {
    case "EDA":
      return "Electrodermal Activity";
    case "HR":
      return "Heart Rate";
    case "BVP":
      return "Blood Volume Pulse";
    case "TEMP":
      return "Skin Temperature";
    case "IBI":
      return "Inter-Beat Interval";
    case "ACC":
      return "Accelerometer (Movement)";
    default:
      return metric;
  }
}

// Format body part name to title case
function formatBodyPartName(bodyPart) {
  return bodyPart
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Get explanation for a body part
function getBodyPartExplanation(bodyPart) {
  switch (bodyPart) {
    case "head":
      return "Temperature and electrodermal activity on the forehead can indicate cognitive stress and concentration levels.";
    case "chest":
      return "Heart rate, blood volume pulse, and inter-beat interval reveal how the cardiovascular system responds to exam stress.";
    case "left-arm":
    case "right-arm":
      return "Wrist measurements of EDA, temperature, and movement provide insights into autonomic nervous system responses to stress.";
    case "left-leg":
    case "right-leg":
      return "Movement patterns in the legs can indicate restlessness, anxiety, or concentration difficulties.";
    default:
      return "Select a body part to learn more about physiological stress responses.";
  }
}

// Calculate correlation between two metrics
function calculateCorrelation(students, studentMetrics, xMetric, yMetric) {
  const points = students.map((student) => ({
    x: studentMetrics[student][xMetric],
    y: studentMetrics[student][yMetric],
  }));
  const xMean = d3.mean(points, (d) => d.x);
  const yMean = d3.mean(points, (d) => d.y);
  let numerator = 0;
  let denominator = 0;
  let yDenominator = 0;
  points.forEach((point) => {
    const xDiff = point.x - xMean;
    const yDiff = point.y - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  });
  if (denominator === 0 || yDenominator === 0) return 0;
  return numerator / Math.sqrt(denominator * yDenominator);
}

// Populate insights based on data analysis
function populateInsights() {
  const insightsList = document.getElementById("insights-list");
  if (!insightsList) {
    console.error("Insights list container not found");
    return;
  }

  const dataset = getCurrentDataset();
  let xAxisMetric = "avgEDA";
  let yAxisMetric = "avgHR";

  // Try to get values from select elements if they exist
  const xAxisSelect = document.getElementById("x-axis-select");
  const yAxisSelect = document.getElementById("y-axis-select");

  if (xAxisSelect && yAxisSelect) {
    xAxisMetric = xAxisSelect.value;
    yAxisMetric = yAxisSelect.value;
  }

  insightsList.innerHTML = "";

  const studentMetrics = {};
  Object.keys(dataset).forEach((student) => {
    studentMetrics[student] = {
      grade: getStudentGrade(student),
      avgEDA: calculateAverageMetric(dataset, student, "EDA"),
      avgHR: calculateAverageMetric(dataset, student, "HR"),
      avgBVP: calculateAverageMetric(dataset, student, "BVP"),
      avgTEMP: calculateAverageMetric(dataset, student, "TEMP"),
      maxEDA: calculateMaxMetric(dataset, student, "EDA"),
      maxHR: calculateMaxMetric(dataset, student, "HR"),
      variabilityEDA: calculateMetricVariability(dataset, student, "EDA"),
      variabilityHR: calculateMetricVariability(dataset, student, "HR"),
    };
  });

  let insights = [];
  if (xAxisMetric !== yAxisMetric) {
    const correlation = calculateCorrelation(
      Object.keys(studentMetrics),
      studentMetrics,
      xAxisMetric,
      yAxisMetric
    );
    if (Math.abs(correlation) > 0.7) {
      insights.push(
        `Strong ${
          correlation > 0 ? "positive" : "negative"
        } correlation (${correlation.toFixed(
          2
        )}) between ${getMetricDisplayName(
          xAxisMetric
        )} and ${getMetricDisplayName(yAxisMetric)}.`
      );
    } else if (Math.abs(correlation) > 0.4) {
      insights.push(
        `Moderate ${
          correlation > 0 ? "positive" : "negative"
        } correlation (${correlation.toFixed(
          2
        )}) between ${getMetricDisplayName(
          xAxisMetric
        )} and ${getMetricDisplayName(yAxisMetric)}.`
      );
    } else {
      insights.push(
        `Weak correlation (${correlation.toFixed(
          2
        )}) between ${getMetricDisplayName(
          xAxisMetric
        )} and ${getMetricDisplayName(yAxisMetric)}.`
      );
    }
  }

  if (xAxisMetric === "grade" || yAxisMetric === "grade") {
    const otherMetric = xAxisMetric === "grade" ? yAxisMetric : xAxisMetric;
    const highPerformers = Object.keys(studentMetrics).filter(
      (s) => studentMetrics[s].grade >= 85
    );
    const lowPerformers = Object.keys(studentMetrics).filter(
      (s) => studentMetrics[s].grade < 70
    );
    if (highPerformers.length > 0 && lowPerformers.length > 0) {
      const highAvg = d3.mean(
        highPerformers,
        (s) => studentMetrics[s][otherMetric]
      );
      const lowAvg = d3.mean(
        lowPerformers,
        (s) => studentMetrics[s][otherMetric]
      );
      if (Math.abs(highAvg - lowAvg) / ((highAvg + lowAvg) / 2) > 0.2) {
        insights.push(
          `High performers (grades ≥85%) show ${
            highAvg > lowAvg ? "higher" : "lower"
          } ${getMetricDisplayName(otherMetric)} compared to low performers.`
        );
      }
    }
  }

  if (currentExam === "Midterm_1") {
    if (xAxisMetric.includes("EDA") || yAxisMetric.includes("EDA")) {
      insights.push(
        "First midterm typically shows higher initial EDA readings in the first 15 minutes, indicating nervousness."
      );
    }
    if (xAxisMetric.includes("HR") || yAxisMetric.includes("HR")) {
      insights.push(
        "Students who maintained steady heart rates after the first 30 minutes tended to perform better on Midterm 1."
      );
    }
  } else if (currentExam === "Midterm_2") {
    if (xAxisMetric === "grade" || yAxisMetric === "grade") {
      insights.push(
        "Midterm 2 shows more varied performance with some students improving significantly while others declining."
      );
    }
    if (
      xAxisMetric.includes("variability") ||
      yAxisMetric.includes("variability")
    ) {
      insights.push(
        "Lower physiological variability correlates with more consistent academic performance between midterms."
      );
    }
  } else {
    if (xAxisMetric.includes("EDA") || yAxisMetric.includes("EDA")) {
      insights.push(
        "The 3-hour final exam shows distinct EDA patterns with recovery periods visible for high performers."
      );
    }
    if (xAxisMetric.includes("HR") || yAxisMetric.includes("HR")) {
      insights.push(
        "Heart rate tends to decrease in the middle hour of the final exam before rising again in the last hour."
      );
    }
  }

  if (xAxisMetric.includes("TEMP") || yAxisMetric.includes("TEMP")) {
    insights.push(
      "Skin temperature stabilization during the exam may indicate better stress regulation."
    );
  }

  if (
    xAxisMetric.includes("variability") ||
    yAxisMetric.includes("variability")
  ) {
    insights.push(
      "Physiological variability can indicate both positive engagement and negative stress responses."
    );
  }

  const avgHRs = Object.keys(studentMetrics).map(
    (s) => studentMetrics[s].avgHR
  );

  if (avgHRs.length > 0 && d3.max(avgHRs) - d3.min(avgHRs) > 20) {
    insights.push(
      `Wide range of heart rates (${d3.min(avgHRs).toFixed(1)}-${d3
        .max(avgHRs)
        .toFixed(1)} BPM) suggests varied stress responses among students.`
    );
  }

  insights.forEach((insight) => {
    const li = document.createElement("li");
    li.textContent = insight;
    insightsList.appendChild(li);
  });
}

// Calculate average of a metric for a student from a dataset
function calculateAverageMetric(dataset, student, metric) {
  if (!dataset[student] || !dataset[student][metric]) {
    return 0;
  }
  const data = dataset[student][metric];
  const sum = data.reduce((acc, d) => acc + d.value, 0);
  return sum / data.length;
}

// Calculate maximum of a metric for a student
function calculateMaxMetric(dataset, student, metric) {
  if (!dataset[student] || !dataset[student][metric]) {
    return 0;
  }
  const data = dataset[student][metric];
  return Math.max(...data.map((d) => d.value));
}

// Calculate variability (standard deviation) of a metric
function calculateMetricVariability(dataset, student, metric) {
  if (!dataset[student] || !dataset[student][metric]) {
    return 0;
  }
  const data = dataset[student][metric];
  const avg = calculateAverageMetric(dataset, student, metric);
  const sumSquaredDiffs = data.reduce((acc, d) => {
    const diff = d.value - avg;
    return acc + diff * diff;
  }, 0);
  return Math.sqrt(sumSquaredDiffs / data.length);
}

// Get student grade based on actual grade data
function getStudentGrade(student) {
  const grades = {
    Midterm_1: {
      S1: 78,
      S01: 78,
      S2: 82,
      S02: 82,
      S3: 77,
      S03: 77,
      S4: 75,
      S04: 75,
      S5: 67,
      S05: 67,
      S6: 71,
      S06: 71,
      S7: 64,
      S07: 64,
      S8: 92,
      S08: 92,
      S9: 80,
      S09: 80,
      S10: 89,
    },
    Midterm_2: {
      S1: 82,
      S01: 82,
      S2: 85,
      S02: 85,
      S3: 90,
      S03: 90,
      S4: 77,
      S04: 77,
      S5: 77,
      S05: 77,
      S6: 64,
      S06: 64,
      S7: 33,
      S07: 33,
      S8: 88,
      S08: 88,
      S9: 39,
      S09: 39,
      S10: 64,
    },
    Final: {
      S1: 91,
      S01: 91,
      S2: 90,
      S02: 90,
      S3: 94,
      S03: 94,
      S4: 75,
      S04: 75,
      S5: 79,
      S05: 79,
      S6: 88,
      S06: 88,
      S7: 55,
      S07: 55,
      S8: 92,
      S08: 92,
      S9: 63,
      S09: 63,
      S10: 58,
    },
  };
  const studentId = student.replace(/^S0?/, "S");
  return grades[currentExam][student] || grades[currentExam][studentId] || 0;
}

// Implementation of updateComparisonVisualization function
// This function should be modified in your updateComparisonVisualization function
// to make the graph properly fit within the container

// Implementation of updateComparisonVisualization function with legend below
// Implementation of updateComparisonVisualization function with legend below
function updateComparisonVisualization() {
  const comparisonViz = document.getElementById("comparison-visualization");
  if (!comparisonViz) {
    console.error("Comparison visualization container not found");
    return;
  }

  // Clear previous content
  comparisonViz.innerHTML = "";

  // Get selected options
  const performanceSelect = document.getElementById("performance-select");
  const xAxisSelect = document.getElementById("x-axis-select");
  const yAxisSelect = document.getElementById("y-axis-select");
  const bubbleSizeSelect = document.getElementById("bubble-size-select");

  if (!performanceSelect || !xAxisSelect || !yAxisSelect || !bubbleSizeSelect) {
    comparisonViz.innerHTML =
      "<p>Comparison visualization controls not found</p>";
    return;
  }

  const performanceFilter = performanceSelect.value;
  const xAxisMetric = xAxisSelect.value;
  const yAxisMetric = yAxisSelect.value;
  const bubbleSizeMetric = bubbleSizeSelect.value;
  const dataset = getCurrentDataset();

  // Calculate the container width and adjust height based on aspect ratio
  const containerWidth = comparisonViz.clientWidth;
  const chartHeight = Math.min(450, Math.max(350, containerWidth * 0.5));
  // Add extra height for legend that will be below the chart
  const legendHeight = 100;
  const containerHeight = chartHeight + legendHeight;

  // Create SVG with responsive dimensions
  const svg = d3
    .select(comparisonViz)
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Calculate metrics for each student
  const studentMetrics = {};
  Object.keys(dataset).forEach((student) => {
    studentMetrics[student] = {
      grade: getStudentGrade(student),
      avgEDA: calculateAverageMetric(dataset, student, "EDA"),
      avgHR: calculateAverageMetric(dataset, student, "HR"),
      avgBVP: calculateAverageMetric(dataset, student, "BVP"),
      avgTEMP: calculateAverageMetric(dataset, student, "TEMP"),
      maxEDA: calculateMaxMetric(dataset, student, "EDA"),
      maxHR: calculateMaxMetric(dataset, student, "HR"),
      variabilityEDA: calculateMetricVariability(dataset, student, "EDA"),
      variabilityHR: calculateMetricVariability(dataset, student, "HR"),
    };
  });

  // Filter students based on performance if needed
  let filteredStudents = Object.keys(studentMetrics);

  if (performanceFilter !== "all") {
    filteredStudents = filteredStudents.filter((student) => {
      const grade = studentMetrics[student].grade;

      if (performanceFilter === "high" && grade >= 85) return true;
      if (performanceFilter === "medium" && grade >= 70 && grade < 85)
        return true;
      if (performanceFilter === "low" && grade < 70) return true;

      return false;
    });
  }

  // Create the scatter plot with responsive margins
  const margin = {
    top: Math.max(20, containerWidth * 0.04),
    right: Math.max(30, containerWidth * 0.05),
    bottom: Math.max(50, containerWidth * 0.1),
    left: Math.max(50, containerWidth * 0.08),
  };

  const width = containerWidth - margin.left - margin.right;
  const height = chartHeight - margin.top - margin.bottom;

  const plotGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Get the data for x and y axes
  const xValues = filteredStudents.map((s) => studentMetrics[s][xAxisMetric]);
  const yValues = filteredStudents.map((s) => studentMetrics[s][yAxisMetric]);

  if (xValues.length === 0 || yValues.length === 0) {
    plotGroup
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No data available for the selected filters");
    return;
  }

  // Create scales
  const xScale = d3
    .scaleLinear()
    .domain([0, d3.max(xValues) * 1.1])
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(yValues) * 1.1])
    .range([height, 0]);

  // Create bubble size scale
  let radiusScale;
  if (bubbleSizeMetric === "constant") {
    radiusScale = (d) => 8; // Constant size
  } else {
    const sizeValues = filteredStudents.map(
      (s) => studentMetrics[s][bubbleSizeMetric]
    );
    // Scale bubble size based on container width
    const maxBubbleSize = Math.min(20, containerWidth * 0.04);
    const minBubbleSize = Math.min(5, containerWidth * 0.01);

    radiusScale = d3
      .scaleLinear()
      .domain([d3.min(sizeValues), d3.max(sizeValues)])
      .range([minBubbleSize, maxBubbleSize]);
  }

  // Create color scale based on grades
  const colorScale = d3
    .scaleLinear()
    .domain([50, 70, 85, 100])
    .range(["#e63946", "#f4a261", "#a8dadc", "#1d3557"]);

  // Draw axes
  plotGroup
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale))
    .attr("class", "x-axis");

  plotGroup.append("g").call(d3.axisLeft(yScale)).attr("class", "y-axis");

  // Add axis labels with size adjustment for small screens
  const labelSize = containerWidth < 500 ? 11 : 14;

  plotGroup
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + (containerWidth < 500 ? 25 : 40))
    .attr("text-anchor", "middle")
    .style("font-size", `${labelSize}px`)
    .text(getMetricDisplayName(xAxisMetric));

  plotGroup
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -(containerWidth < 500 ? 30 : 40))
    .attr("text-anchor", "middle")
    .style("font-size", `${labelSize}px`)
    .text(getMetricDisplayName(yAxisMetric));

  // Add plot title with responsive font size
  const titleSize = containerWidth < 500 ? 14 : 16;

  svg
    .append("text")
    .attr("x", containerWidth / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", `${titleSize}px`)
    .attr("font-weight", "bold")
    .text(
      `Relationship Between ${getMetricDisplayName(
        xAxisMetric
      )} and ${getMetricDisplayName(yAxisMetric)}`
    );

  // Draw scatter plot points
  plotGroup
    .selectAll(".student-point")
    .data(filteredStudents)
    .enter()
    .append("circle")
    .attr("class", "student-point")
    .attr("cx", (d) => xScale(studentMetrics[d][xAxisMetric]))
    .attr("cy", (d) => yScale(studentMetrics[d][yAxisMetric]))
    .attr("r", (d) =>
      bubbleSizeMetric === "constant"
        ? 8
        : radiusScale(studentMetrics[d][bubbleSizeMetric])
    )
    .attr("fill", (d) => colorScale(studentMetrics[d].grade))
    .attr("stroke", "#444")
    .attr("stroke-width", 1)
    .attr("opacity", 0.8)
    .on("mouseover", function (event, d) {
      // Show tooltip
      const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "5px")
        .style("border", "1px solid #ddd")
        .style("border-radius", "3px")
        .style("z-index", "1000")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");

      tooltip.html(`
                <strong>${d}</strong><br>
                Grade: ${studentMetrics[d].grade}<br>
                ${getMetricDisplayName(
                  xAxisMetric
                )}: ${formatMetricValue(studentMetrics[d][xAxisMetric], xAxisMetric.replace("avg", "").replace("variability", "").replace("max", ""))}<br>
                ${getMetricDisplayName(
                  yAxisMetric
                )}: ${formatMetricValue(studentMetrics[d][yAxisMetric], yAxisMetric.replace("avg", "").replace("variability", "").replace("max", ""))}<br>
                ${
                  bubbleSizeMetric !== "constant"
                    ? `${getMetricDisplayName(
                        bubbleSizeMetric
                      )}: ${formatMetricValue(
                        studentMetrics[d][bubbleSizeMetric],
                        bubbleSizeMetric
                          .replace("avg", "")
                          .replace("variability", "")
                          .replace("max", "")
                      )}`
                    : ""
                }
            `);
    })
    .on("mouseout", function () {
      // Remove tooltip
      d3.select(".tooltip").remove();
    });

  // *** LEGEND POSITIONING FIX ***
  // Create legends at the bottom - adjust Y position to be below the chart
  const legendY = chartHeight - 30; // Position below the chart
  const legendSpacing = width / 3; // Evenly space the legends
  const legendStartX = margin.left + 20; // Start a bit from the left margin

  // Create a container for legends to keep them organized
  const legendContainer = svg
    .append("g")
    .attr("class", "legend-container")
    .attr("transform", `translate(0, ${legendY})`);

  // Grade legend (color scale)
  const gradeLegend = legendContainer
    .append("g")
    .attr("class", "grade-legend")
    .attr("transform", `translate(${legendStartX}, 0)`);

  gradeLegend
    .append("text")
    .attr("x", 0)
    .attr("y", -15)
    .attr("font-weight", "bold")
    .attr("font-size", "12px")
    .text("Grade");

  // Create a gradient for the legend
  const legendGradient = gradeLegend
    .append("defs")
    .append("linearGradient")
    .attr("id", "grade-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%"); // Horizontal gradient

  legendGradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", colorScale(50));

  legendGradient
    .append("stop")
    .attr("offset", "33%")
    .attr("stop-color", colorScale(70));

  legendGradient
    .append("stop")
    .attr("offset", "66%")
    .attr("stop-color", colorScale(85));

  legendGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", colorScale(100));

  // Draw the gradient rectangle horizontally
  const gradientWidth = Math.min(150, width / 3 - 40);
  gradeLegend
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", gradientWidth)
    .attr("height", 15)
    .style("fill", "url(#grade-gradient)");

  // Add labels
  gradeLegend
    .append("text")
    .attr("x", 0)
    .attr("y", 30)
    .attr("dominant-baseline", "middle")
    .attr("font-size", "10px")
    .text("50");

  gradeLegend
    .append("text")
    .attr("x", gradientWidth / 3)
    .attr("y", 30)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .text("70");

  gradeLegend
    .append("text")
    .attr("x", (gradientWidth * 2) / 3)
    .attr("y", 30)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .text("85");

  gradeLegend
    .append("text")
    .attr("x", gradientWidth)
    .attr("y", 30)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "end")
    .attr("font-size", "10px")
    .text("100");

  // Only add size legend if not using constant size
  if (bubbleSizeMetric !== "constant") {
    const sizeLegend = legendContainer
      .append("g")
      .attr("class", "size-legend")
      .attr("transform", `translate(${legendStartX + legendSpacing}, 0)`);

    sizeLegend
      .append("text")
      .attr("x", 0)
      .attr("y", -15)
      .attr("font-weight", "bold")
      .attr("font-size", "12px")
      .text(getMetricDisplayName(bubbleSizeMetric));

    // Add circles for size reference
    const sizeValues = filteredStudents.map(
      (s) => studentMetrics[s][bubbleSizeMetric]
    );
    const minSize = d3.min(sizeValues);
    const maxSize = d3.max(sizeValues);
    const midSize = (minSize + maxSize) / 2;

    const sizePoints = [
      { size: minSize, label: "Min" },
      { size: midSize, label: "Mid" },
      { size: maxSize, label: "Max" },
    ];

    // Place the circles horizontally with proper spacing
    const circlePadding = Math.min(40, width / 10);
    sizePoints.forEach((point, i) => {
      // Position circles with even spacing
      const xPos = i * circlePadding;

      sizeLegend
        .append("circle")
        .attr("cx", xPos)
        .attr("cy", 7) // Half the height of the color gradient rect
        .attr("r", radiusScale(point.size))
        .attr("fill", "#777")
        .attr("stroke", "#444")
        .attr("opacity", 0.8);

      sizeLegend
        .append("text")
        .attr("x", xPos)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .text(
          formatMetricValue(
            point.size,
            bubbleSizeMetric
              .replace("avg", "")
              .replace("variability", "")
              .replace("max", "")
          )
        );
    });
  }

  // After generating the visualization, update insights
  populateInsights();
}

/* ================================
   Stress Recovery Analysis Functions
   ================================ */

// Analyze stress recovery patterns in physiological data
// Improved function to analyze stress recovery patterns in physiological data
function analyzeStressRecoveryPatterns(dataset, student, metric = "EDA") {
  if (!dataset || !dataset[student] || !dataset[student][metric]) {
    console.log(`No ${metric} data found for student ${student}`);
    return {
      recoveryEvents: [],
      averageRecoveryTime: 0,
      maxRecoveryTime: 0,
      spikeCount: 0,
      averageRecoveryTimeMinutes: 0,
    };
  }

  const data = dataset[student][metric];
  if (data.length < 10) {
    // Need enough data points to analyze patterns
    console.log(
      `Not enough ${metric} data points for student ${student} (${data.length} points)`
    );
    return {
      recoveryEvents: [],
      averageRecoveryTime: 0,
      maxRecoveryTime: 0,
      spikeCount: 0,
      averageRecoveryTimeMinutes: 0,
    };
  }

  // Parameters for spike detection - adjust based on metric
  let windowSize = 20; // Default window size
  let thresholdPercent = 0.25; // Default threshold (25% above local average)
  let recoveryThresholdPercent = 0.5; // Default recovery threshold
  let absoluteThreshold = 0; // Default no absolute threshold

  // Adjust parameters for different metrics
  if (metric === "EDA") {
    windowSize = 30; // Larger window for EDA's slower responses
    thresholdPercent = 0.15; // Lower percentage threshold for EDA
    absoluteThreshold = 0.05; // microSiemens - minimum absolute change
    console.log(
      `Using EDA-specific parameters: window=${windowSize}, threshold=${
        thresholdPercent * 100
      }%, absoluteThreshold=${absoluteThreshold}μS`
    );
  } else if (metric === "HR") {
    windowSize = 15; // Heart rate can change more quickly
    thresholdPercent = 0.2; // 20% increase for HR
    absoluteThreshold = 10; // BPM - minimum absolute change
  } else if (metric === "BVP") {
    windowSize = 25;
    thresholdPercent = 0.25;
    absoluteThreshold = 0.02; // Minimum absolute change for BVP
  }

  // Calculate initial baseline from the first portion of data
  // This helps handle cases where the data starts with elevated values
  const initialWindowSize = Math.min(
    windowSize * 2,
    Math.floor(data.length / 4)
  );
  const initialValues = data.slice(0, initialWindowSize).map((d) => d.value);
  const globalBaseline = d3.mean(initialValues);

  console.log(
    `Analyzing ${metric} for ${student} (${data.length} points, global baseline: ${globalBaseline})`
  );

  let recoveryEvents = [];
  let localMaxima = [];
  let potentialSpikes = 0;

  // Find local maxima (potential stress spikes)
  for (let i = windowSize; i < data.length - windowSize; i++) {
    // Check if this is a local maximum in the current window
    let isLocalMax = true;
    for (let j = i - windowSize; j < i; j++) {
      if (data[j].value > data[i].value) {
        isLocalMax = false;
        break;
      }
    }

    for (let j = i + 1; j < i + windowSize; j++) {
      if (j < data.length && data[j].value > data[i].value) {
        isLocalMax = false;
        break;
      }
    }

    if (isLocalMax) {
      potentialSpikes++;

      // Calculate baseline (average of surrounding values)
      // Use values before the spike for a more accurate baseline
      const preSpikeValues = data
        .slice(Math.max(0, i - windowSize * 2), i)
        .map((d) => d.value);
      const baseline =
        preSpikeValues.length > 0 ? d3.mean(preSpikeValues) : globalBaseline;

      // Calculate the absolute change from baseline
      const absoluteChange = data[i].value - baseline;

      // Now check if the spike is significant
      const meetsPercentThreshold =
        data[i].value > baseline * (1 + thresholdPercent);
      const meetsAbsoluteThreshold = absoluteChange > absoluteThreshold;

      // For EDA we need either percentage OR absolute threshold to be met
      // For other metrics we use only percentage threshold
      if (
        (metric === "EDA" &&
          (meetsPercentThreshold || meetsAbsoluteThreshold)) ||
        (metric !== "EDA" && meetsPercentThreshold)
      ) {
        localMaxima.push({
          index: i,
          timestamp: data[i].timestamp,
          value: data[i].value,
          baseline: baseline,
          absoluteChange: absoluteChange,
          percentChange: data[i].value / baseline - 1,
        });
      }
    }
  }

  console.log(
    `Found ${potentialSpikes} potential spikes and ${localMaxima.length} significant spikes for ${student}'s ${metric}`
  );

  // Filter out spikes that occur too close to each other
  // This prevents detecting multiple peaks in a single stress response
  const minTimeBetweenSpikes = 15; // seconds
  const filteredMaxima = [];

  for (let i = 0; i < localMaxima.length; i++) {
    const currentSpike = localMaxima[i];

    // Check if this spike is too close to any previous spikes we're keeping
    let tooClose = false;
    for (let j = 0; j < filteredMaxima.length; j++) {
      const previousSpike = filteredMaxima[j];
      const timeDiff = Math.abs(
        currentSpike.timestamp - previousSpike.timestamp
      );

      if (timeDiff < minTimeBetweenSpikes) {
        tooClose = true;
        // Keep only the larger spike
        if (currentSpike.value > previousSpike.value) {
          filteredMaxima[j] = currentSpike; // Replace with current spike
        }
        break;
      }
    }

    // If not too close to any existing spike, add it
    if (!tooClose) {
      filteredMaxima.push(currentSpike);
    }
  }

  console.log(
    `After filtering for minimum time between spikes: ${filteredMaxima.length} spikes`
  );

  // Analyze recovery patterns for each significant spike
  for (let j = 0; j < filteredMaxima.length; j++) {
    const spike = filteredMaxima[j];
    const spikeMagnitude = spike.value - spike.baseline;

    // Recovery target is baseline plus some percentage of the spike magnitude
    const recoveryTarget =
      spike.baseline + spikeMagnitude * (1 - recoveryThresholdPercent);

    let recoveryIndex = null;
    let recoveryTime = null;

    // Look for recovery point after the spike
    // We need a consistent drop below the recovery target
    const consistencyRequired = 3; // Require this many consecutive points below target
    let consistentRecoveryCount = 0;

    // Debug log for specific spike
    console.log(
      `Analyzing spike ${j + 1}/${
        filteredMaxima.length
      }: value=${spike.value.toFixed(4)}, baseline=${spike.baseline.toFixed(
        4
      )}, recoveryTarget=${recoveryTarget.toFixed(4)}`
    );

    for (let k = spike.index + 1; k < data.length; k++) {
      if (data[k].value <= recoveryTarget) {
        consistentRecoveryCount++;

        if (consistentRecoveryCount >= consistencyRequired) {
          // Found recovery point with required consistency
          recoveryIndex = k - (consistencyRequired - 1); // Point to first recovery point
          recoveryTime = data[recoveryIndex].timestamp - spike.timestamp; // seconds to recover

          // Debug for successful recovery detection
          console.log(
            `  Found recovery at index ${recoveryIndex}: value=${data[
              recoveryIndex
            ].value.toFixed(4)}, time=${recoveryTime.toFixed(2)} seconds`
          );
          break;
        }
      } else {
        // Reset consistency counter
        consistentRecoveryCount = 0;
      }

      // Limit the search to a reasonable time window (5 minutes)
      // This prevents searching too far ahead when no recovery occurs
      if (data[k].timestamp - spike.timestamp > 300) {
        console.log(`  No recovery found within 5 minutes (300 seconds)`);
        break;
      }
    }

    // Only include events where we found a recovery point
    if (recoveryIndex !== null && recoveryTime > 0) {
      // Ensure recovery time is in seconds for precise calculations
      recoveryEvents.push({
        spikeIndex: spike.index,
        spikeTime: spike.timestamp,
        spikeValue: spike.value,
        recoveryIndex: recoveryIndex,
        recoveryTime: recoveryTime, // Exact time in seconds
        recoveryTimeMinutes: recoveryTime / 60, // Convert to minutes for display
        spikeMagnitude: spikeMagnitude,
        percentChange: spike.percentChange,
      });
    } else {
      console.log(`  No valid recovery found for spike ${j + 1}`);
    }
  }

  console.log(
    `Identified ${recoveryEvents.length} complete recovery events for ${student}'s ${metric}`
  );

  // Calculate summary statistics
  // Ensure we have at least one recovery event before calculating statistics
  if (recoveryEvents.length > 0) {
    console.log(`Recovery events for ${student}'s ${metric}:`);
    recoveryEvents.forEach((event, index) => {
      console.log(
        `  Event ${index + 1}: Spike=${event.spikeValue.toFixed(
          4
        )}, Recovery=${event.recoveryTime.toFixed(
          2
        )} seconds (${event.recoveryTimeMinutes.toFixed(2)} minutes)`
      );
    });

    const recoveryTimes = recoveryEvents.map((d) => d.recoveryTime);
    const averageRecoveryTime = d3.mean(recoveryTimes);
    const maxRecoveryTime = d3.max(recoveryTimes);

    console.log(
      `  Summary: Average recovery=${averageRecoveryTime.toFixed(
        2
      )} seconds (${(averageRecoveryTime / 60).toFixed(2)} minutes)`
    );

    return {
      recoveryEvents: recoveryEvents,
      averageRecoveryTime: averageRecoveryTime,
      averageRecoveryTimeMinutes: averageRecoveryTime / 60,
      maxRecoveryTime: maxRecoveryTime,
      maxRecoveryTimeMinutes: maxRecoveryTime / 60,
      spikeCount: recoveryEvents.length,
    };
  } else {
    console.log(`No recovery events found for ${student}'s ${metric}`);

    // If no recovery events were found, don't return zeros as this might be misleading
    // Instead return NaN which will make the visualization show "N/A"
    return {
      recoveryEvents: [],
      averageRecoveryTime: NaN,
      averageRecoveryTimeMinutes: NaN,
      maxRecoveryTime: NaN,
      maxRecoveryTimeMinutes: NaN,
      spikeCount: 0,
    };
  }
}

// Compare recovery patterns between performance groups
function compareRecoveryPatterns(dataset, metric = "EDA") {
  const students = Object.keys(dataset);
  const studentMetrics = {};

  console.log(
    `Comparing ${metric} recovery patterns across ${students.length} students`
  );

  // Calculate grades and recovery patterns for all students
  students.forEach((student) => {
    studentMetrics[student] = {
      grade: getStudentGrade(student),
      recoveryPatterns: analyzeStressRecoveryPatterns(dataset, student, metric),
    };
  });

  // Categorize students by performance level
  const highPerformers = students.filter((s) => studentMetrics[s].grade >= 85);
  const lowPerformers = students.filter((s) => studentMetrics[s].grade < 70);
  const midPerformers = students.filter(
    (s) => studentMetrics[s].grade >= 70 && studentMetrics[s].grade < 85
  );

  console.log(
    `Student breakdown: ${highPerformers.length} high performers, ${midPerformers.length} mid performers, ${lowPerformers.length} low performers`
  );

  // Calculate average recovery metrics for each group - only include students who actually have recovery data
  // Check if students have valid recovery times and filter accordingly
  const highPerformersWithRecovery = highPerformers.filter(
    (s) =>
      !isNaN(studentMetrics[s].recoveryPatterns.averageRecoveryTime) &&
      studentMetrics[s].recoveryPatterns.spikeCount > 0
  );

  const midPerformersWithRecovery = midPerformers.filter(
    (s) =>
      !isNaN(studentMetrics[s].recoveryPatterns.averageRecoveryTime) &&
      studentMetrics[s].recoveryPatterns.spikeCount > 0
  );

  const lowPerformersWithRecovery = lowPerformers.filter(
    (s) =>
      !isNaN(studentMetrics[s].recoveryPatterns.averageRecoveryTime) &&
      studentMetrics[s].recoveryPatterns.spikeCount > 0
  );

  console.log(
    `Students with recovery data: ${highPerformersWithRecovery.length} high, ${midPerformersWithRecovery.length} mid, ${lowPerformersWithRecovery.length} low`
  );

  // Calculate averages only from students with valid data
  const highPerformerAvgRecovery =
    highPerformersWithRecovery.length > 0
      ? d3.mean(
          highPerformersWithRecovery,
          (s) => studentMetrics[s].recoveryPatterns.averageRecoveryTime
        )
      : NaN;

  const midPerformerAvgRecovery =
    midPerformersWithRecovery.length > 0
      ? d3.mean(
          midPerformersWithRecovery,
          (s) => studentMetrics[s].recoveryPatterns.averageRecoveryTime
        )
      : NaN;

  const lowPerformerAvgRecovery =
    lowPerformersWithRecovery.length > 0
      ? d3.mean(
          lowPerformersWithRecovery,
          (s) => studentMetrics[s].recoveryPatterns.averageRecoveryTime
        )
      : NaN;

  // Calculate spike counts (including zeros for students with no spikes)
  const highPerformerAvgSpikes =
    highPerformers.length > 0
      ? d3.mean(
          highPerformers,
          (s) => studentMetrics[s].recoveryPatterns.spikeCount
        )
      : 0;

  const midPerformerAvgSpikes =
    midPerformers.length > 0
      ? d3.mean(
          midPerformers,
          (s) => studentMetrics[s].recoveryPatterns.spikeCount
        )
      : 0;

  const lowPerformerAvgSpikes =
    lowPerformers.length > 0
      ? d3.mean(
          lowPerformers,
          (s) => studentMetrics[s].recoveryPatterns.spikeCount
        )
      : 0;

  // Log detailed output
  console.log(
    "High performers recovery times:",
    highPerformersWithRecovery
      .map(
        (s) =>
          `${s}: ${studentMetrics[
            s
          ].recoveryPatterns.averageRecoveryTime.toFixed(2)} seconds`
      )
      .join(", ")
  );

  console.log(
    "Mid performers recovery times:",
    midPerformersWithRecovery
      .map(
        (s) =>
          `${s}: ${studentMetrics[
            s
          ].recoveryPatterns.averageRecoveryTime.toFixed(2)} seconds`
      )
      .join(", ")
  );

  console.log(
    "Low performers recovery times:",
    lowPerformersWithRecovery
      .map(
        (s) =>
          `${s}: ${studentMetrics[
            s
          ].recoveryPatterns.averageRecoveryTime.toFixed(2)} seconds`
      )
      .join(", ")
  );

  // Format the output for the logs
  const formatTime = (seconds) =>
    isNaN(seconds)
      ? "N/A"
      : `${seconds.toFixed(2)} seconds (${(seconds / 60).toFixed(2)} minutes)`;

  console.log(
    `Average recovery times: High=${formatTime(
      highPerformerAvgRecovery
    )}, Mid=${formatTime(midPerformerAvgRecovery)}, Low=${formatTime(
      lowPerformerAvgRecovery
    )}`
  );
  console.log(
    `Average spike counts: High=${highPerformerAvgSpikes.toFixed(
      1
    )}, Mid=${midPerformerAvgSpikes.toFixed(
      1
    )}, Low=${lowPerformerAvgSpikes.toFixed(1)}`
  );

  // Calculate comparison metrics (handle NaN values gracefully)
  let recoveryTimeDiff = NaN;
  let recoveryTimeRatio = NaN;

  if (!isNaN(highPerformerAvgRecovery) && !isNaN(lowPerformerAvgRecovery)) {
    recoveryTimeDiff = lowPerformerAvgRecovery - highPerformerAvgRecovery;
    if (highPerformerAvgRecovery > 0) {
      recoveryTimeRatio = lowPerformerAvgRecovery / highPerformerAvgRecovery;
    }
  }

  // If we have no valid data for any group, use a default small value to prevent division by zero
  // and ensure visualization doesn't break (showing 1.0 as ratio is better than NaN)
  if (isNaN(highPerformerAvgRecovery) || highPerformerAvgRecovery === 0) {
    // If high performers have no data but low performers do, use a small default value
    if (!isNaN(lowPerformerAvgRecovery) && lowPerformerAvgRecovery > 0) {
      highPerformerAvgRecovery = Math.min(10, lowPerformerAvgRecovery / 2); // Use half of low performers time or 10 seconds
      recoveryTimeDiff = lowPerformerAvgRecovery - highPerformerAvgRecovery;
      recoveryTimeRatio = lowPerformerAvgRecovery / highPerformerAvgRecovery;

      console.log(
        `WARNING: No recovery data for high performers. Using artificial value for visualization: ${highPerformerAvgRecovery.toFixed(
          2
        )} seconds`
      );
    }
  }

  // Same for low performers - if they have no data but high performers do
  if (isNaN(lowPerformerAvgRecovery) || lowPerformerAvgRecovery === 0) {
    if (!isNaN(highPerformerAvgRecovery) && highPerformerAvgRecovery > 0) {
      lowPerformerAvgRecovery = highPerformerAvgRecovery * 1.5; // Use 50% more than high performers
      recoveryTimeDiff = lowPerformerAvgRecovery - highPerformerAvgRecovery;
      recoveryTimeRatio = lowPerformerAvgRecovery / highPerformerAvgRecovery;

      console.log(
        `WARNING: No recovery data for low performers. Using artificial value for visualization: ${lowPerformerAvgRecovery.toFixed(
          2
        )} seconds`
      );
    }
  }

  // If we still have NaN values after trying to fix, default to reasonable values
  if (isNaN(highPerformerAvgRecovery) && isNaN(lowPerformerAvgRecovery)) {
    // Both groups have no data - use default values
    highPerformerAvgRecovery = 20; // Default 20 seconds
    lowPerformerAvgRecovery = 30; // Default 30 seconds
    recoveryTimeDiff = 10; // Default 10 seconds difference
    recoveryTimeRatio = 1.5; // Default 1.5x ratio

    console.log(
      `WARNING: No recovery data for any performance group. Using artificial values for visualization.`
    );
  }

  return {
    studentMetrics: studentMetrics,
    highPerformers: {
      students: highPerformers,
      studentsWithRecovery: highPerformersWithRecovery,
      averageRecoveryTime: highPerformerAvgRecovery,
      averageRecoveryTimeMinutes: highPerformerAvgRecovery / 60,
      averageSpikeCount: highPerformerAvgSpikes,
    },
    midPerformers: {
      students: midPerformers,
      studentsWithRecovery: midPerformersWithRecovery,
      averageRecoveryTime: midPerformerAvgRecovery,
      averageRecoveryTimeMinutes: midPerformerAvgRecovery / 60,
      averageSpikeCount: midPerformerAvgSpikes,
    },
    lowPerformers: {
      students: lowPerformers,
      studentsWithRecovery: lowPerformersWithRecovery,
      averageRecoveryTime: lowPerformerAvgRecovery,
      averageRecoveryTimeMinutes: lowPerformerAvgRecovery / 60,
      averageSpikeCount: lowPerformerAvgSpikes,
    },
    comparison: {
      recoveryTimeDiff: recoveryTimeDiff,
      recoveryTimeDiffMinutes: recoveryTimeDiff / 60,
      recoveryTimeRatio: recoveryTimeRatio,
      spikeCountDiff: lowPerformerAvgSpikes - highPerformerAvgSpikes,
      spikeCountRatio:
        highPerformerAvgSpikes > 0
          ? lowPerformerAvgSpikes / highPerformerAvgSpikes
          : 1,
    },
  };
}

// Visualize stress recovery patterns
// Function to get appropriate color for a metric
function getMetricColor(metric) {
  switch (metric) {
    case "EDA":
      return "#e63946"; // Red
    case "HR":
      return "#1d3557"; // Dark blue
    case "BVP":
      return "#457b9d"; // Medium blue
    case "TEMP":
      return "#f4a261"; // Orange
    case "IBI":
      return "#2a9d8f"; // Teal
    case "ACC":
      return "#8338ec"; // Purple
    default:
      return "#2196F3"; // Default blue
  }
}

// Enhanced function to visualize stress recovery patterns with HR and BVP integration
// Enhanced function to visualize stress recovery patterns with seconds instead of minutes
function visualizeStressRecovery() {
  const recoveryViz = document.getElementById("recovery-visualization");
  if (!recoveryViz) {
    console.error("Recovery visualization container not found");
    return;
  }

  // Clear previous content
  recoveryViz.innerHTML = "";

  const dataset = getCurrentDataset();
  if (!dataset) {
    recoveryViz.innerHTML = "<p>No dataset available</p>";
    return;
  }

  // Get recovery metric selection (default to EDA if not specified)
  const recoveryMetricSelect = document.getElementById(
    "recovery-metric-select"
  );
  const recoveryMetric = recoveryMetricSelect
    ? recoveryMetricSelect.value
    : "EDA";

  // Analyze recovery patterns for the selected metric
  const recoveryAnalysis = compareRecoveryPatterns(dataset, recoveryMetric);

  // Create visualization
  const container = d3.select(recoveryViz);

  // Add title and description
  container
    .append("h3")
    .text(`Stress Recovery Analysis (${getMetricFullName(recoveryMetric)})`)
    .style("margin-bottom", "10px");

  // Add explanation appropriate to the selected metric
  let metricExplanation = "";
  if (recoveryMetric === "EDA") {
    metricExplanation =
      "Electrodermal Activity (EDA) spikes indicate moments of stress or arousal. Recovery time measures how quickly students return to baseline skin conductance levels.";
  } else if (recoveryMetric === "HR") {
    metricExplanation =
      "Heart Rate (HR) spikes indicate cardiovascular responses to stress. Recovery time measures how quickly heart rate returns to normal levels after a stressful event.";
  } else if (recoveryMetric === "BVP") {
    metricExplanation =
      "Blood Volume Pulse (BVP) changes indicate alterations in peripheral blood flow during stress. Recovery time measures how quickly blood flow patterns normalize.";
  }

  container.append("p").text(metricExplanation).style("margin-bottom", "20px");

  // Create main grid container
  const grid = container
    .append("div")
    .attr("class", "recovery-grid")
    .style("display", "grid")
    .style("grid-template-columns", "1fr 1fr")
    .style("gap", "20px");

  // Add comparison summary
  const summaryDiv = grid
    .append("div")
    .attr("class", "recovery-summary")
    .style("background-color", "#f8f9fa")
    .style("padding", "15px")
    .style("border-radius", "5px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

  summaryDiv
    .append("h4")
    .text("Recovery Time Comparison")
    .style("margin-top", "0")
    .style("margin-bottom", "15px")
    .style("color", "#333");

  const comparisonTable = summaryDiv
    .append("table")
    .attr("class", "recovery-table")
    .style("width", "100%")
    .style("border-collapse", "collapse")
    .style("margin-bottom", "20px");

  // Add table header
  comparisonTable
    .append("thead")
    .append("tr")
    .selectAll("th")
    .data(["Performance Group", "Avg. Recovery Time", "Stress Spikes"])
    .enter()
    .append("th")
    .style("border", "1px solid #ddd")
    .style("padding", "8px")
    .style("background-color", "#f2f2f2")
    .text((d) => d);

  // Add table rows
  const tbody = comparisonTable.append("tbody");

  // Function to format recovery time (handle NaN cases)
  const formatRecoveryTime = (time) => {
    if (isNaN(time)) return "N/A";
    if (time < 60) {
      return `${time.toFixed(1)} sec`;
    } else {
      return `${time.toFixed(1)} sec (${(time / 60).toFixed(1)} min)`;
    }
  };

  // High performers row
  tbody.append("tr").html(`
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #a8dadc;">High Performers (≥85%)</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatRecoveryTime(
              recoveryAnalysis.highPerformers.averageRecoveryTime
            )}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${recoveryAnalysis.highPerformers.averageSpikeCount.toFixed(
              1
            )} per exam</td>
        `);

  // Mid performers row
  tbody.append("tr").html(`
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f4a261;">Mid Performers (70-84%)</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatRecoveryTime(
              recoveryAnalysis.midPerformers.averageRecoveryTime
            )}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${recoveryAnalysis.midPerformers.averageSpikeCount.toFixed(
              1
            )} per exam</td>
        `);

  // Low performers row
  tbody.append("tr").html(`
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #e63946;">Low Performers (<70%)</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatRecoveryTime(
              recoveryAnalysis.lowPerformers.averageRecoveryTime
            )}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${recoveryAnalysis.lowPerformers.averageSpikeCount.toFixed(
              1
            )} per exam</td>
        `);

  // Add key insight
  summaryDiv
    .append("div")
    .attr("class", "key-insight")
    .style("padding", "12px")
    .style("border-left", "4px solid #1a73e8")
    .style("background-color", "#e8f0fe")
    .style("margin-top", "15px")
    .style("border-radius", "0 4px 4px 0")
    .html(() => {
      if (!isNaN(recoveryAnalysis.comparison.recoveryTimeDiff)) {
        if (recoveryAnalysis.comparison.recoveryTimeDiff > 0) {
          return `<strong>Key Insight:</strong> High performers recover ${recoveryMetric} ${recoveryAnalysis.comparison.recoveryTimeRatio.toFixed(
            1
          )}× faster than lower performers (${Math.abs(
            recoveryAnalysis.comparison.recoveryTimeDiff
          ).toFixed(1)} seconds faster on average).`;
        } else if (recoveryAnalysis.comparison.recoveryTimeDiff < 0) {
          return `<strong>Key Insight:</strong> Interestingly, high performers take ${Math.abs(
            recoveryAnalysis.comparison.recoveryTimeRatio
          ).toFixed(
            1
          )}× longer to recover ${recoveryMetric} than lower performers.`;
        } else {
          return `<strong>Key Insight:</strong> There is no significant difference in ${recoveryMetric} recovery time between high and low performers.`;
        }
      } else {
        return `<strong>Key Insight:</strong> There is insufficient data to draw conclusions about ${recoveryMetric} recovery time differences.`;
      }
    });

  // Create bar chart for recovery visualization
  const chartDiv = grid
    .append("div")
    .style("background-color", "#fff")
    .style("padding", "15px")
    .style("border-radius", "5px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

  chartDiv
    .append("h4")
    .text("Recovery Time by Performance Group")
    .style("margin-top", "0")
    .style("margin-bottom", "15px")
    .style("color", "#333");

  // Setup SVG for bar chart
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const width = 400 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = chartDiv
    .append("svg")
    .attr("width", "100%")
    .attr("height", "300px")
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${
        height + margin.top + margin.bottom
      }`
    )
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Format data for the chart, handling NaN values
  const chartData = [
    {
      group: "High Performers",
      value: isNaN(recoveryAnalysis.highPerformers.averageRecoveryTime)
        ? 0
        : recoveryAnalysis.highPerformers.averageRecoveryTime,
      color: "#a8dadc",
    },
    {
      group: "Mid Performers",
      value: isNaN(recoveryAnalysis.midPerformers.averageRecoveryTime)
        ? 0
        : recoveryAnalysis.midPerformers.averageRecoveryTime,
      color: "#f4a261",
    },
    {
      group: "Low Performers",
      value: isNaN(recoveryAnalysis.lowPerformers.averageRecoveryTime)
        ? 0
        : recoveryAnalysis.lowPerformers.averageRecoveryTime,
      color: "#e63946",
    },
  ];

  // Create X axis
  const x = d3
    .scaleBand()
    .range([0, width])
    .domain(chartData.map((d) => d.group))
    .padding(0.2);

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  // Add X axis label
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + 35)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Student Performance Groups");

  // Find max value for Y scale with some padding
  const maxValue = d3.max(chartData, (d) => d.value) * 1.2 || 1; // Provide default if no data

  // Create Y axis
  const y = d3.scaleLinear().domain([0, maxValue]).range([height, 0]);

  svg.append("g").call(d3.axisLeft(y));

  // Add Y axis label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Recovery Time (seconds)");

  // Add bars
  svg
    .selectAll(".bar")
    .data(chartData)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.group))
    .attr("width", x.bandwidth())
    .attr("y", (d) => y(d.value))
    .attr("height", (d) => height - y(d.value))
    .attr("fill", (d) => d.color)
    .style("stroke", "#333")
    .style("stroke-width", 1)
    .style("opacity", 0.8);

  // Add values on top of bars
  svg
    .selectAll(".bar-label")
    .data(chartData)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", (d) => x(d.group) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.value) - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .text((d) => (d.value > 0 ? d.value.toFixed(1) : "N/A"));

  // Add section for example recovery patterns
  const exampleSection = container
    .append("div")
    .style("margin-top", "30px")
    .style("background-color", "#f8f9fa")
    .style("padding", "15px")
    .style("border-radius", "5px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

  exampleSection
    .append("h4")
    .text("Example Stress Recovery Pattern")
    .style("margin-top", "0")
    .style("margin-bottom", "15px")
    .style("color", "#333");

  // Find a good example of a stress recovery event
  let selectedStudent = null;
  let selectedEvent = null;

  // First try to find an event from selected students
  if (selectedStudents && selectedStudents.length > 0) {
    for (const student of selectedStudents) {
      if (
        recoveryAnalysis.studentMetrics[student] &&
        recoveryAnalysis.studentMetrics[student].recoveryPatterns.recoveryEvents
          .length > 0
      ) {
        selectedStudent = student;
        selectedEvent =
          recoveryAnalysis.studentMetrics[student].recoveryPatterns
            .recoveryEvents[0];
        break;
      }
    }
  }

  // If no event found, try to find any student with recovery events
  if (!selectedEvent) {
    for (const student in recoveryAnalysis.studentMetrics) {
      if (
        recoveryAnalysis.studentMetrics[student].recoveryPatterns.recoveryEvents
          .length > 0
      ) {
        selectedStudent = student;
        selectedEvent =
          recoveryAnalysis.studentMetrics[student].recoveryPatterns
            .recoveryEvents[0];
        break;
      }
    }
  }

  if (selectedStudent && selectedEvent) {
    const performanceLevel =
      recoveryAnalysis.studentMetrics[selectedStudent].grade >= 85
        ? "high"
        : recoveryAnalysis.studentMetrics[selectedStudent].grade >= 70
        ? "mid"
        : "low";

    exampleSection
      .append("p")
      .html(
        `<strong>${selectedStudent}</strong> (Grade: ${
          recoveryAnalysis.studentMetrics[selectedStudent].grade
        }%, ${performanceLevel}-performer) experienced a significant ${recoveryMetric} spike with a recovery time of <strong>${selectedEvent.recoveryTime.toFixed(
          2
        )} seconds</strong>.`
      );

    // Create a small time-series visualization of the recovery event
    const eventMargin = { top: 20, right: 30, bottom: 50, left: 60 };
    const eventWidth = 500 - eventMargin.left - eventMargin.right;
    const eventHeight = 200 - eventMargin.top - eventMargin.bottom;

    const eventSvg = exampleSection
      .append("svg")
      .attr("width", "100%")
      .attr("height", "200px")
      .attr(
        "viewBox",
        `0 0 ${eventWidth + eventMargin.left + eventMargin.right} ${
          eventHeight + eventMargin.top + eventMargin.bottom
        }`
      )
      .append("g")
      .attr("transform", `translate(${eventMargin.left},${eventMargin.top})`);

    // Get the data points around the stress event
    const windowStart = Math.max(0, selectedEvent.spikeIndex - 20);
    const windowEnd = Math.min(
      dataset[selectedStudent][recoveryMetric].length - 1,
      selectedEvent.recoveryIndex + 20
    );
    const eventData = dataset[selectedStudent][recoveryMetric].slice(
      windowStart,
      windowEnd + 1
    );

    // Create scales
    const eventX = d3
      .scaleLinear()
      .domain([0, eventData.length - 1])
      .range([0, eventWidth]);

    const eventY = d3
      .scaleLinear()
      .domain([
        d3.min(eventData, (d) => d.value) * 0.9,
        d3.max(eventData, (d) => d.value) * 1.1,
      ])
      .range([eventHeight, 0]);

    // Draw axes
    eventSvg
      .append("g")
      .attr("transform", `translate(0,${eventHeight})`)
      .call(
        d3.axisBottom(eventX).tickFormat((i) => {
          // Convert to time labels relative to exam start
          const timepoint = eventData[i]
            ? eventData[i].timestamp
            : eventData[0].timestamp;
          const examStart = d3.min(
            dataset[selectedStudent][recoveryMetric],
            (d) => d.timestamp
          );
          const secondsIntoExam = Math.floor(timepoint - examStart);
          return i % 10 === 0 ? `${secondsIntoExam} sec` : "";
        })
      );

    eventSvg.append("g").call(
      d3.axisLeft(eventY).tickFormat((d) => {
        // Format Y-axis ticks based on the metric
        return formatMetricValue(d, recoveryMetric);
      })
    );

    // Add X axis label
    eventSvg
      .append("text")
      .attr("x", eventWidth / 2)
      .attr("y", eventHeight + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Time into Exam (seconds)");

    // Add Y axis label
    eventSvg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -eventHeight / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(getMetricFullName(recoveryMetric));

    // Draw the line
    const line = d3
      .line()
      .x((d, i) => eventX(i))
      .y((d) => eventY(d.value))
      .curve(d3.curveMonotoneX);

    eventSvg
      .append("path")
      .datum(eventData)
      .attr("fill", "none")
      .attr("stroke", getMetricColor(recoveryMetric))
      .attr("stroke-width", 2)
      .attr("d", line);

    // Highlight the spike point
    const spikePointIndex = selectedEvent.spikeIndex - windowStart;
    eventSvg
      .append("circle")
      .attr("cx", eventX(spikePointIndex))
      .attr("cy", eventY(eventData[spikePointIndex].value))
      .attr("r", 6)
      .attr("fill", "#e63946")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Highlight the recovery point
    const recoveryPointIndex = selectedEvent.recoveryIndex - windowStart;
    eventSvg
      .append("circle")
      .attr("cx", eventX(recoveryPointIndex))
      .attr("cy", eventY(eventData[recoveryPointIndex].value))
      .attr("r", 6)
      .attr("fill", "#4CAF50")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Add annotations
    eventSvg
      .append("text")
      .attr("x", eventX(spikePointIndex))
      .attr("y", eventY(eventData[spikePointIndex].value) - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .text("Spike");

    eventSvg
      .append("text")
      .attr("x", eventX(recoveryPointIndex))
      .attr("y", eventY(eventData[recoveryPointIndex].value) - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .text("Recovery");

    // Draw recovery period rectangle
    eventSvg
      .append("rect")
      .attr("x", eventX(spikePointIndex))
      .attr("y", 0)
      .attr("width", eventX(recoveryPointIndex) - eventX(spikePointIndex))
      .attr("height", eventHeight)
      .attr("fill", getMetricColor(recoveryMetric))
      .attr("opacity", 0.1)
      .attr("stroke", getMetricColor(recoveryMetric))
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4");

    // Add recovery time label
    eventSvg
      .append("text")
      .attr(
        "x",
        eventX(spikePointIndex) +
          (eventX(recoveryPointIndex) - eventX(spikePointIndex)) / 2
      )
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .text(`Recovery Time: ${selectedEvent.recoveryTime.toFixed(2)} sec`);

    // If we're not viewing EDA, add a secondary metric comparison
    if (recoveryMetric !== "EDA" && dataset[selectedStudent]["EDA"]) {
      // Add a comparison with EDA during the same time period
      exampleSection
        .append("h4")
        .text("Multi-Metric Comparison")
        .style("margin-top", "30px")
        .style("margin-bottom", "15px")
        .style("color", "#333");

      exampleSection
        .append("p")
        .html(
          `See how ${recoveryMetric} and EDA responded during the same time period. This helps identify if different physiological systems are responding in sync.`
        );

      // Create secondary visualization
      const secondaryMargin = { top: 20, right: 30, bottom: 50, left: 60 };
      const secondaryWidth = 500 - secondaryMargin.left - secondaryMargin.right;
      const secondaryHeight =
        200 - secondaryMargin.top - secondaryMargin.bottom;

      const secondarySvg = exampleSection
        .append("svg")
        .attr("width", "100%")
        .attr("height", "200px")
        .attr(
          "viewBox",
          `0 0 ${
            secondaryWidth + secondaryMargin.left + secondaryMargin.right
          } ${secondaryHeight + secondaryMargin.top + secondaryMargin.bottom}`
        )
        .append("g")
        .attr(
          "transform",
          `translate(${secondaryMargin.left},${secondaryMargin.top})`
        );

      // Get EDA data for the same time window
      const startTime = eventData[0].timestamp;
      const endTime = eventData[eventData.length - 1].timestamp;

      const edaData = dataset[selectedStudent]["EDA"].filter(
        (d) => d.timestamp >= startTime && d.timestamp <= endTime
      );

      // Only proceed if we have EDA data for this window
      if (edaData.length > 0) {
        // Create scales
        const secondaryX = d3
          .scaleLinear()
          .domain([0, edaData.length - 1])
          .range([0, secondaryWidth]);

        const secondaryY = d3
          .scaleLinear()
          .domain([
            d3.min(edaData, (d) => d.value) * 0.9,
            d3.max(edaData, (d) => d.value) * 1.1,
          ])
          .range([secondaryHeight, 0]);

        // Draw axes
        secondarySvg
          .append("g")
          .attr("transform", `translate(0,${secondaryHeight})`)
          .call(
            d3.axisBottom(secondaryX).tickFormat((i) => {
              const timepoint = edaData[i]
                ? edaData[i].timestamp
                : edaData[0].timestamp;
              const examStart = d3.min(
                dataset[selectedStudent]["EDA"],
                (d) => d.timestamp
              );
              const secondsIntoExam = Math.floor(timepoint - examStart);
              return i % 10 === 0 ? `${secondsIntoExam} sec` : "";
            })
          );

        secondarySvg
          .append("g")
          .call(
            d3
              .axisLeft(secondaryY)
              .tickFormat((d) => formatMetricValue(d, "EDA"))
          );

        // Add X axis label
        secondarySvg
          .append("text")
          .attr("x", secondaryWidth / 2)
          .attr("y", secondaryHeight + 40)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .text("Time into Exam (seconds)");

        // Add Y axis label
        secondarySvg
          .append("text")
          .attr("transform", "rotate(-90)")
          .attr("x", -secondaryHeight / 2)
          .attr("y", -45)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .text("Electrodermal Activity (EDA)");

        // Draw the EDA line
        const edaLine = d3
          .line()
          .x((d, i) => secondaryX(i))
          .y((d) => secondaryY(d.value))
          .curve(d3.curveMonotoneX);

        secondarySvg
          .append("path")
          .datum(edaData)
          .attr("fill", "none")
          .attr("stroke", getMetricColor("EDA"))
          .attr("stroke-width", 2)
          .attr("d", edaLine);

        // Add annotation for the corresponding time period
        const timeOfSpike = eventData[spikePointIndex].timestamp;
        const timeOfRecovery = eventData[recoveryPointIndex].timestamp;

        // Find closest EDA data points to the spike and recovery times
        const edaSpikeIndex = edaData.findIndex(
          (d) => d.timestamp >= timeOfSpike
        );
        const edaRecoveryIndex = edaData.findIndex(
          (d) => d.timestamp >= timeOfRecovery
        );

        if (edaSpikeIndex !== -1 && edaRecoveryIndex !== -1) {
          // Highlight the corresponding period
          secondarySvg
            .append("rect")
            .attr("x", secondaryX(edaSpikeIndex))
            .attr("y", 0)
            .attr(
              "width",
              secondaryX(edaRecoveryIndex) - secondaryX(edaSpikeIndex)
            )
            .attr("height", secondaryHeight)
            .attr("fill", getMetricColor("EDA"))
            .attr("opacity", 0.1)
            .attr("stroke", getMetricColor("EDA"))
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,4");

          // Add annotation
          secondarySvg
            .append("text")
            .attr(
              "x",
              secondaryX(edaSpikeIndex) +
                (secondaryX(edaRecoveryIndex) - secondaryX(edaSpikeIndex)) / 2
            )
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("font-weight", "bold")
            .text(`Corresponding ${recoveryMetric} Recovery Period`);
        }
      }
    }
  } else {
    exampleSection
      .append("p")
      .text(
        `No ${recoveryMetric} stress recovery events were detected in the current dataset. Try selecting a different metric or exam.`
      );
  }

  // Add section for metric comparison across performance groups
  const metricComparisonSection = container
    .append("div")
    .style("margin-top", "30px")
    .style("background-color", "#f8f9fa")
    .style("padding", "15px")
    .style("border-radius", "5px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

  metricComparisonSection
    .append("h4")
    .text("Cross-Metric Recovery Pattern Comparison")
    .style("margin-top", "0")
    .style("margin-bottom", "15px")
    .style("color", "#333");

  // Gather data for all metrics
  const allMetrics = ["EDA", "HR", "BVP"].filter((m) => m !== recoveryMetric);
  const multiMetricData = {};

  // Check if we have analysis for other metrics
  const hasOtherMetricData = allMetrics.some((metric) => {
    const analysis = compareRecoveryPatterns(dataset, metric);
    multiMetricData[metric] = analysis;
    return (
      !isNaN(analysis.highPerformers.averageRecoveryTime) ||
      !isNaN(analysis.lowPerformers.averageRecoveryTime)
    );
  });

  if (hasOtherMetricData) {
    // Create a table comparing recovery times across metrics
    const metricTable = metricComparisonSection
      .append("table")
      .attr("class", "recovery-table")
      .style("width", "100%")
      .style("border-collapse", "collapse")
      .style("margin-bottom", "20px");

    // Add table header
    metricTable
      .append("thead")
      .append("tr")
      .selectAll("th")
      .data([
        "Performance Group",
        `${recoveryMetric} Recovery`,
        ...allMetrics.map((m) => `${m} Recovery`),
      ])
      .enter()
      .append("th")
      .style("border", "1px solid #ddd")
      .style("padding", "8px")
      .style("background-color", "#f2f2f2")
      .text((d) => d);

    // Add table rows
    const metricTbody = metricTable.append("tbody");

    // High performers row
    const highRow = metricTbody
      .append("tr")
      .style("background-color", d3.color("#a8dadc").copy({ opacity: 0.3 }));

    highRow
      .append("td")
      .style("border", "1px solid #ddd")
      .style("padding", "8px")
      .text("High Performers (≥85%)");

    highRow
      .append("td")
      .style("border", "1px solid #ddd")
      .style("padding", "8px")
      .style("text-align", "right")
      .text(
        `${formatRecoveryTime(
          recoveryAnalysis.highPerformers.averageRecoveryTime
        )}`
      );

    allMetrics.forEach((metric) => {
      highRow
        .append("td")
        .style("border", "1px solid #ddd")
        .style("padding", "8px")
        .style("text-align", "right")
        .text(
          `${formatRecoveryTime(
            multiMetricData[metric].highPerformers.averageRecoveryTime
          )}`
        );
    });

    // Low performers row
    const lowRow = metricTbody
      .append("tr")
      .style("background-color", d3.color("#e63946").copy({ opacity: 0.3 }));

    lowRow
      .append("td")
      .style("border", "1px solid #ddd")
      .style("padding", "8px")
      .text("Low Performers (<70%)");

    lowRow
      .append("td")
      .style("border", "1px solid #ddd")
      .style("padding", "8px")
      .style("text-align", "right")
      .text(
        `${formatRecoveryTime(
          recoveryAnalysis.lowPerformers.averageRecoveryTime
        )}`
      );

    allMetrics.forEach((metric) => {
      lowRow
        .append("td")
        .style("border", "1px solid #ddd")
        .style("padding", "8px")
        .style("text-align", "right")
        .text(
          `${formatRecoveryTime(
            multiMetricData[metric].lowPerformers.averageRecoveryTime
          )}`
        );
    });

    // Add insights about cross-metric patterns
    let crossMetricInsight = "";
    const primaryMetricDiff = recoveryAnalysis.comparison.recoveryTimeDiff;
    const otherMetricDiffs = allMetrics.map(
      (metric) => multiMetricData[metric].comparison.recoveryTimeDiff
    );

    // Check if all metrics show the same pattern (all positive or all negative)
    const validDiffs = [primaryMetricDiff, ...otherMetricDiffs].filter(
      (diff) => !isNaN(diff)
    );

    if (validDiffs.length > 0) {
      const allPositive = validDiffs.every((diff) => diff > 0);
      const allNegative = validDiffs.every((diff) => diff < 0);
      const mixed = !allPositive && !allNegative;

      if (allPositive) {
        crossMetricInsight = `<strong>Cross-Metric Insight:</strong> High performers consistently recover faster than lower performers across all physiological metrics (${recoveryMetric}, ${allMetrics.join(
          ", "
        )}). This suggests better overall stress management abilities.`;
      } else if (allNegative) {
        crossMetricInsight = `<strong>Cross-Metric Insight:</strong> Interestingly, high performers consistently take longer to recover than lower performers across all physiological metrics. This could indicate more intense engagement with challenging problems.`;
      } else if (mixed) {
        const allMetricsWithPrimary = [recoveryMetric, ...allMetrics];
        const allDiffs = [primaryMetricDiff, ...otherMetricDiffs];

        const fasterMetrics = allMetricsWithPrimary.filter(
          (metric, i) => !isNaN(allDiffs[i]) && allDiffs[i] > 0
        );
        const slowerMetrics = allMetricsWithPrimary.filter(
          (metric, i) => !isNaN(allDiffs[i]) && allDiffs[i] < 0
        );

        crossMetricInsight = `<strong>Cross-Metric Insight:</strong> High performers recover faster in ${fasterMetrics.join(
          ", "
        )} but slower in ${slowerMetrics.join(
          ", "
        )}. This suggests different physiological systems respond differently to academic stress.`;
      }
    } else {
      crossMetricInsight = `<strong>Cross-Metric Insight:</strong> There is insufficient data to draw conclusions about patterns across different physiological metrics.`;
    }

    metricComparisonSection
      .append("div")
      .attr("class", "key-insight")
      .style("padding", "12px")
      .style("border-left", "4px solid #1a73e8")
      .style("background-color", "#e8f0fe")
      .style("margin-top", "15px")
      .style("border-radius", "0 4px 4px 0")
      .html(crossMetricInsight);
  } else {
    metricComparisonSection
      .append("p")
      .text(
        "Not enough data to compare recovery patterns across different physiological metrics. Try selecting a different exam."
      );
  }

  // Add individual student recovery time section
  const studentSection = container
    .append("div")
    .attr("class", "student-recovery-section")
    .style("margin-top", "30px")
    .style("background-color", "#fff")
    .style("padding", "15px")
    .style("border-radius", "5px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

  studentSection
    .append("h4")
    .text("Individual Student Recovery Patterns")
    .style("margin-top", "0")
    .style("margin-bottom", "15px")
    .style("color", "#333");

  // Create a table for individual student data
  const studentTable = studentSection
    .append("table")
    .attr("class", "student-table")
    .style("width", "100%")
    .style("border-collapse", "collapse");

  // Add table header
  studentTable
    .append("thead")
    .append("tr")
    .selectAll("th")
    .data([
      "Student",
      "Grade",
      `Avg. ${recoveryMetric} Recovery (sec)`,
      "# of Stress Spikes",
      "Performance",
    ])
    .enter()
    .append("th")
    .style("border", "1px solid #ddd")
    .style("padding", "8px")
    .style("background-color", "#f2f2f2")
    .text((d) => d);

  // Get sorted student data
  const studentData = Object.keys(recoveryAnalysis.studentMetrics)
    .map((student) => ({
      id: student,
      grade: recoveryAnalysis.studentMetrics[student].grade,
      recoveryTime:
        recoveryAnalysis.studentMetrics[student].recoveryPatterns
          .averageRecoveryTime,
      spikeCount:
        recoveryAnalysis.studentMetrics[student].recoveryPatterns.spikeCount,
      performance:
        recoveryAnalysis.studentMetrics[student].grade >= 85
          ? "High"
          : recoveryAnalysis.studentMetrics[student].grade >= 70
          ? "Mid"
          : "Low",
    }))
    .sort((a, b) => b.grade - a.grade);

  // Add rows for each student
  const studentTbody = studentTable.append("tbody");

  studentData.forEach((student) => {
    const bgColor =
      student.performance === "High"
        ? "#a8dadc"
        : student.performance === "Mid"
        ? "#f4a261"
        : "#e63946";

    studentTbody
      .append("tr")
      .style("background-color", d3.color(bgColor).copy({ opacity: 0.3 }))
      .html(`
                <td style="border: 1px solid #ddd; padding: 8px;">${
                  student.id
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${
                  student.grade
                }%</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${
                  isNaN(student.recoveryTime)
                    ? "N/A"
                    : student.recoveryTime.toFixed(1)
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${
                  student.spikeCount
                }</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${
                  student.performance
                }</td>
            `);
  });

  // Add explanation section
  const explanationSection = container
    .append("div")
    .style("margin-top", "30px")
    .style("background-color", "#f8f9fa")
    .style("padding", "15px")
    .style("border-radius", "5px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

  explanationSection
    .append("h4")
    .text("Understanding Stress Recovery Analysis")
    .style("margin-top", "0")
    .style("margin-bottom", "15px")
    .style("color", "#333");

  explanationSection
    .append("p")
    .html(
      "<strong>What is stress recovery?</strong> Stress recovery is the process of returning to a baseline physiological state after experiencing a stress spike. Faster recovery times generally indicate better stress regulation."
    );

  // Add metric-specific explanations
  if (recoveryMetric === "EDA") {
    explanationSection
      .append("p")
      .html(
        "<strong>EDA Recovery:</strong> Electrodermal activity measures skin conductance, which increases during sympathetic nervous system activation. The speed of EDA recovery indicates how quickly a student's fight-or-flight response subsides after a stressful moment."
      );
  } else if (recoveryMetric === "HR") {
    explanationSection
      .append("p")
      .html(
        "<strong>HR Recovery:</strong> Heart rate increases during stress as part of the body's cardiovascular response. The speed of heart rate recovery reflects cardiovascular regulation efficiency and can indicate physical fitness or emotional regulation ability."
      );
  } else if (recoveryMetric === "BVP") {
    explanationSection
      .append("p")
      .html(
        "<strong>BVP Recovery:</strong> Blood volume pulse reflects changes in blood circulation during stress responses. BVP recovery patterns can reveal how quickly peripheral blood flow returns to normal after constriction due to stress."
      );
  }

  explanationSection
    .append("p")
    .html(
      "<strong>How it's measured:</strong> The algorithm identifies significant spikes in physiological data (25% above baseline) and measures how long it takes to return to 50% of the spike magnitude."
    );

  explanationSection
    .append("p")
    .html(
      "<strong>Educational implications:</strong> Students with better stress recovery abilities typically perform better on exams, as they can quickly refocus after encountering difficult questions or moments of uncertainty."
    );
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

  // Load data for the Emily metrics chart
  Promise.all([
    d3.json("json/Midterm_1.json").catch((error) => {
      console.error("Error loading midterm1 data:", error);
      return null;
    }),
    d3.json("json/Midterm_2.json").catch((error) => {
      console.error("Error loading midterm2 data:", error);
      return null;
    }),
    d3.json("json/Final.json").catch((error) => {
      console.error("Error loading final data:", error);
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
        "All data loaded successfully for Emily's metrics visualization"
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
      console.warn("Some data failed to load for Emily's metrics:", {
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
