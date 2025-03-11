// Global variables to store our data and state
let midterm1Data, midterm2Data, finalData;
let currentExam = "Midterm_1";
let selectedStudents = ["S1"]; // Default to first student
let selectedMetrics = ["EDA", "HR"]; // Default selected metrics
let isPlaying = false;
let currentTimeIndex = 0;
let animationFrameId = null;

// Initialize the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    // Load all three datasets from the "json" folder
    Promise.all([
        d3.json("json/Midterm_1.json"),
        d3.json("json/Midterm_2.json"),
        d3.json("json/Final.json")
    ]).then(function(data) {
        midterm1Data = data[0];
        midterm2Data = data[1];
        finalData = data[2];
        
        initializeApp();
    }).catch(function(error) {
        console.error("Error loading the data files:", error);
        alert("Failed to load data files. Please check the console for details.");
    });

    // Setup event listeners for various UI controls
    document.getElementById("exam-select").addEventListener("change", handleExamChange);
    document.getElementById("play-pause").addEventListener("click", togglePlayPause);
    document.getElementById("time-slider").addEventListener("input", handleTimeSliderChange);
    document.getElementById("performance-select").addEventListener("change", updateComparisonVisualization);
    document.getElementById("x-axis-select").addEventListener("change", updateComparisonVisualization);
    document.getElementById("y-axis-select").addEventListener("change", updateComparisonVisualization);
    document.getElementById("bubble-size-select").addEventListener("change", updateComparisonVisualization);
    
    // Setup metric checkbox event listeners
    const metricCheckboxes = document.querySelectorAll("#metric-checkboxes input");
    metricCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", handleMetricChange);
    });
});

// Initialize the application with the loaded data
function initializeApp() {
    populateStudentCheckboxes();
    
    // Replace the original body map with the enhanced 3D version
    // initialize3DHumanModel(); // Use this for the most realistic 3D-like model
    // OR use one of these alternatives:
    initializeBodyMap(); // For the improved SVG version
    // initialize3DBodyMap(); // For the hotspot button version
    
    initializeTimelineVisualization();
    enhanceTimelineVisualization(); // Add this line here
    
    updateComparisonVisualization();
    populateInsights();
    
    // Add recovery button handler
    const analyzeBtn = document.getElementById("analyze-recovery-btn");
    if (analyzeBtn) {
        analyzeBtn.addEventListener("click", visualizeStressRecovery);
    }
    
    // Add resize listener for responsive updates
    addResizeListener();
}


// Get the currently selected dataset based on the exam choice
function getCurrentDataset() {
    switch(currentExam) {
        case "Midterm_1": return midterm1Data;
        case "Midterm_2": return midterm2Data;
        case "Final": return finalData;
        default: return midterm1Data;
    }
}

// Populate student checkboxes based on available data
function populateStudentCheckboxes() {
    const studentCheckboxesContainer = document.getElementById("student-checkboxes");
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
  
  // Reset the timeline and animation state
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
  
  // Repopulate student checkboxes as available students might differ
  populateStudentCheckboxes();
  
  // Reset to the first student if the current selection is empty
  if (selectedStudents.length === 0) {
      const firstStudentCheckbox = document.querySelector("#student-checkboxes input");
      if (firstStudentCheckbox) {
          firstStudentCheckbox.checked = true;
          selectedStudents = [firstStudentCheckbox.value];
      }
  }
  
  // Reinitialize visualizations to ensure proper resizing
  initializeBodyMap();
  updateTimelineVisualization();
  updateComparisonVisualization();
  populateInsights();
}


// Handle student selection change
function handleStudentChange(event) {
    // Update selectedStudents array based on checked checkboxes
    const studentCheckboxes = document.querySelectorAll("#student-checkboxes input:checked");
    selectedStudents = Array.from(studentCheckboxes).map(checkbox => checkbox.value);
    
    // Ensure at least one student is selected
    if (selectedStudents.length === 0) {
        event.target.checked = true;
        selectedStudents = [event.target.value];
        alert("Please select at least one student to display data.");
    }
    
    // Update visualizations
    updateTimelineVisualization();
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
}

// Handle metric selection change
function handleMetricChange(event) {
    // Update selectedMetrics array based on checked checkboxes
    const metricCheckboxes = document.querySelectorAll("#metric-checkboxes input:checked");
    selectedMetrics = Array.from(metricCheckboxes).map(checkbox => checkbox.value);
    
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
    
    if (dataset && dataset[student] && dataset[student].EDA && dataset[student].EDA.length > 0) {
        const timestamps = dataset[student].EDA.map(d => d.timestamp);
        const maxTime = Math.max(...timestamps);
        const minTime = Math.min(...timestamps);
        const timeRange = maxTime - minTime;
        
        // Calculate current time based on slider position
        const sliderPosition = currentTimeIndex / 100; // Normalize to 0-1
        const currentTimestamp = minTime + (sliderPosition * timeRange);
        
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
    
    const feComponentTransfer = document.createElementNS(svgNS, "feComponentTransfer");
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
    torso.setAttribute("d", "M110,170 Q130,180 150,170 Q170,180 190,170 L200,350 Q150,360 100,350 Z");
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
    leftArm.setAttribute("d", "M110,170 Q90,200 70,250 Q60,290 60,330 Q65,340 80,330 Q85,290 100,250 Q110,210 110,170");
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
    rightArm.setAttribute("d", "M190,170 Q210,210 230,250 Q245,290 240,330 Q235,340 220,330 Q215,290 200,250 Q190,200 190,170");
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
    leftLeg.setAttribute("d", "M130,350 Q120,400 115,500 Q120,530 135,550 Q145,540 150,530 Q145,450 140,350");
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
    rightLeg.setAttribute("d", "M160,350 Q165,450 150,530 Q155,540 165,550 Q180,530 185,500 Q180,400 170,350");
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
    leftFoot.setAttribute("d", "M115,550 Q125,555 135,550 L150,530 Q130,525 110,530 Z");
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
    rightFoot.setAttribute("d", "M150,530 Q170,525 190,530 L190,550 Q175,555 165,550 Z");
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
        { x: 175, y: 450, text: "Leg", datapart: "right-leg" }
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
    labels.forEach(label => {
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
    instructionText.textContent = "Click on a body part to see physiological data";
    svg.appendChild(instructionText);
}

// Helper function to create gradient for 3D effect
function createGradient(defs, id, color1, color2) {
    const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
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
    const bodyParts = document.querySelectorAll('.body-part');
    bodyParts.forEach(part => {
        part.classList.remove('active');
    });
    
    // Add active class to clicked part
    this.classList.add('active');
    
    // Get data attributes
    const bodyPart = this.getAttribute('data-part');
    const relevantMetrics = this.getAttribute('data-metrics').split(',');
    
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
        selectedStudents.forEach(student => {
            const studentHeader = document.createElement("th");
            studentHeader.textContent = student;
            studentHeader.style.textAlign = "center";
            studentHeader.style.padding = "8px";
            studentHeader.style.borderBottom = "2px solid #ddd";
            headerRow.appendChild(studentHeader);
        });
        
        comparisonTable.appendChild(headerRow);
        
        // Create rows for each metric
        relevantMetrics.forEach(metric => {
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
                valueCell.textContent = value ? formatMetricValue(value, metric) : "N/A";
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
            relevantMetrics.forEach(metric => {
                // Get values for all students
                const values = selectedStudents
                    .map(student => getCurrentMetricValue(dataset, student, metric))
                    .filter(value => value !== null);
                
                if (values.length > 1) {
                    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
                    const minValue = Math.min(...values);
                    const maxValue = Math.max(...values);
                    const range = maxValue - minValue;
                    
                    // Find students with min and max values
                    const minStudent = selectedStudents.find(student => {
                        return getCurrentMetricValue(dataset, student, metric) === minValue;
                    });
                    
                    const maxStudent = selectedStudents.find(student => {
                        return getCurrentMetricValue(dataset, student, metric) === maxValue;
                    });
                    
                    const statItem = document.createElement("p");
                    statItem.style.margin = "5px 0";
                    statItem.innerHTML = `<strong>${getMetricFullName(metric)}:</strong> Range: ${formatMetricValue(range, metric)} (${minStudent}: ${formatMetricValue(minValue, metric)} to ${maxStudent}: ${formatMetricValue(maxValue, metric)})`;
                    statsContainer.appendChild(statItem);
                }
            });
            
            metricsDisplay.appendChild(statsContainer);
        }
    } else {
        // Single student display (original format)
        const student = selectedStudents[0];
        
        relevantMetrics.forEach(metric => {
            const metricContainer = document.createElement("div");
            metricContainer.className = "metric-value";
            
            const metricName = document.createElement("p");
            metricName.innerHTML = `<strong>${getMetricFullName(metric)}:</strong>`;
            metricContainer.appendChild(metricName);
            
            const value = getCurrentMetricValue(dataset, student, metric);
            const metricValue = document.createElement("p");
            metricValue.className = "value";
            metricValue.textContent = value ? formatMetricValue(value, metric) : "N/A";
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
    if (!dataset || !dataset[student] || !dataset[student][metric] || dataset[student][metric].length === 0) {
        return null;
    }
    const data = dataset[student][metric];
    const timestamps = data.map(d => d.timestamp);
    const maxTime = Math.max(...timestamps);
    const minTime = Math.min(...timestamps);
    const timeRange = maxTime - minTime;
    const sliderPosition = currentTimeIndex / 100; // Normalize to 0-1
    const currentTimestamp = minTime + (sliderPosition * timeRange);
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
        const relevantMetrics = activeBodyPart.getAttribute("data-metrics").split(",");
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
            const headElement = document.querySelector('.body-part[data-part="head"]');
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
            
            const chestElement = document.querySelector('.body-part[data-part="chest"]');
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
            
            const armElements = document.querySelectorAll('.body-part[data-part="left-arm"], .body-part[data-part="right-arm"], .body-part[data-part="left-wrist"], .body-part[data-part="right-wrist"]');
            armElements.forEach(element => {
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
            
            const legElements = document.querySelectorAll('.body-part[data-part="left-leg"], .body-part[data-part="right-leg"], .body-part[data-part="left-foot"], .body-part[data-part="right-foot"]');
            legElements.forEach(element => {
                updateElementFill(element, color);
            });
        }
    }
}

// Helper function to update element fill that works for different element types
function updateElementFill(element, color) {
    if (element.tagName === 'path' || element.tagName === 'ellipse' || element.tagName === 'circle') {
        element.setAttribute('fill', color);
    } else if (element.tagName === 'g') {
        // For the g element in 3D model
        const firstChild = element.querySelector('ellipse, circle, path');
        if (firstChild) firstChild.setAttribute('fill', color);
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
        .map(student => {
            if (dataset[student]?.EDA) {
                const value = getCurrentMetricValue(dataset, student, "EDA");
                // Handle null/undefined values
                return value !== null && value !== undefined ? value : null;
            }
            return null;
        })
        .filter(value => value !== null);
    
    if (edaValues.length > 0) {
        console.log("EDA values found:", edaValues); // Debug
        
        const avgEDA = edaValues.reduce((sum, val) => sum + val, 0) / edaValues.length;
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
            if (normalizedVariance > 0.2) { // Lowered from 0.3 to 0.2
                // Add striped pattern for high variance
                addStripedPattern(headElement, avgColor, "edaPattern", normalizedVariance);
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
            .map(student => dataset[student]?.HR ? getCurrentMetricValue(dataset, student, "HR") : null)
            .filter(value => value !== null);
        
        if (hrValues.length > 0) {
            const avgHR = hrValues.reduce((sum, val) => sum + val, 0) / hrValues.length;
            
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
                    addStripedPattern(chestElement, avgColor, "hrPattern", normalizedVariance);
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
    const armElements = document.querySelectorAll('.body-part[data-part="left-arm"], .body-part[data-part="right-arm"], .body-part[data-part="left-wrist"], .body-part[data-part="right-wrist"]');
    
    // Get average TEMP
    const tempValues = students
        .map(student => dataset[student]?.TEMP ? getCurrentMetricValue(dataset, student, "TEMP") : null)
        .filter(value => value !== null);
    
    if (tempValues.length > 0 && armElements.length > 0) {
        const avgTemp = tempValues.reduce((sum, val) => sum + val, 0) / tempValues.length;
        
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
                    addStripedPattern(element, avgColor, `tempPattern${index}`, normalizedVariance);
                } else {
                    // Just use the average color for low variance
                    updateElementFill(element, avgColor);
                }
            });
        } else {
            // Only one value, use direct color for all arms
            armElements.forEach(element => {
                updateElementFill(element, avgColor);
            });
        }
    }
    
    // For Legs - ACC
    const legElements = document.querySelectorAll('.body-part[data-part="left-leg"], .body-part[data-part="right-leg"], .body-part[data-part="left-foot"], .body-part[data-part="right-foot"]');
    
    // Get average ACC
    const accValues = students
        .map(student => dataset[student]?.ACC ? getCurrentMetricValue(dataset, student, "ACC") : null)
        .filter(value => value !== null);
    
    if (accValues.length > 0 && legElements.length > 0) {
        // Handle array or scalar values for ACC
        const processedAccValues = accValues.map(val => {
            if (Array.isArray(val)) {
                return Math.sqrt(
                    Math.pow(val[0], 2) + 
                    Math.pow(val[1], 2) + 
                    Math.pow(val[2], 2)
                ) / 64;
            } else {
                return val / 64;
            }
        });
        
        const avgAcc = processedAccValues.reduce((sum, val) => sum + val, 0) / processedAccValues.length;
        
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
                    addStripedPattern(element, avgColor, `accPattern${index}`, normalizedVariance);
                } else {
                    // Just use the average color for low variance
                    updateElementFill(element, avgColor);
                }
            });
        } else {
            // Only one value, use direct color for all legs
            legElements.forEach(element => {
                updateElementFill(element, avgColor);
            });
        }
    }
}

// Helper function to calculate variance of an array of values
function calculateVariance(values) {
    if (values.length <= 1) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return variance;
}

// Helper function to add striped pattern to an SVG element
function addStripedPattern(element, baseColor, patternId, intensity) {
    // Check if we need to create pattern defs
    let defs = document.querySelector('defs') || document.createElementNS("http://www.w3.org/2000/svg", "defs");
    if (!document.querySelector('defs')) {
        // Find the SVG element to add defs to
        const svg = element.closest('svg');
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
        const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
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
        const stripe = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        stripe.setAttribute("width", stripeWidth.toString());
        stripe.setAttribute("height", "8");
        stripe.setAttribute("fill", "rgba(0,0,0,0.2)"); // Darker stripes
        pattern.appendChild(stripe);
        
        defs.appendChild(pattern);
    }
    
    // Apply pattern to element
    if (element.tagName === 'path' || element.tagName === 'ellipse' || element.tagName === 'circle') {
        element.setAttribute('fill', `url(#${patternId})`);
    } else if (element.tagName === 'g') {
        // For the g element in 3D model
        const firstChild = element.querySelector('ellipse, circle, path');
        if (firstChild) firstChild.setAttribute('fill', `url(#${patternId})`);
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
    const svg = d3.select(timelineViz)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "450px");
    
    // Initialize the visualization (will be populated later)
    updateTimelineVisualization();
    
    // Add event listeners for student selection changes
    primaryStudentSelect.addEventListener("change", updateTimelineVisualization);
    comparisonStudentSelect.addEventListener("change", updateTimelineVisualization);
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
        timelineViz.append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .text("No dataset available");
        return;
    }
    
    // Update student dropdowns
    updateStudentDropdowns(dataset);
    
    // Get selected students for comparison
    const primaryStudentSelect = document.getElementById("timeline-primary-student");
    const comparisonStudentSelect = document.getElementById("timeline-comparison-student");
    
    const primaryStudent = primaryStudentSelect ? primaryStudentSelect.value : selectedStudents[0];
    const comparisonStudent = comparisonStudentSelect ? comparisonStudentSelect.value : "";
    
    // Get selected metrics - use only one metric at a time as requested
    // Use the first selected metric
    const metricCheckboxes = document.querySelectorAll("#metric-checkboxes input:checked");
    if (metricCheckboxes.length === 0) {
        timelineViz.append("text")
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
        vizGroup.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .text(`No ${selectedMetric} data available for ${primaryStudent}`);
        return;
    }
    
    // Process primary student data
    const primaryData = dataset[primaryStudent][selectedMetric];
    if (primaryData.length === 0) {
        vizGroup.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .text(`No ${selectedMetric} data available for ${primaryStudent}`);
        return;
    }
    
    // Extract timestamps and convert to minutes into exam
    const examStart = Math.min(...primaryData.map(d => d.timestamp));
    const primaryDataFormatted = primaryData.map(d => ({
        time: (d.timestamp - examStart) / 60, // Convert to minutes
        value: d.value
    }));
    
    // Check if comparison student data exists
    let comparisonDataFormatted = [];
    if (comparisonStudent && dataset[comparisonStudent] && dataset[comparisonStudent][selectedMetric]) {
        const comparisonData = dataset[comparisonStudent][selectedMetric];
        comparisonDataFormatted = comparisonData.map(d => ({
            time: (d.timestamp - examStart) / 60, // Use same exam start for alignment
            value: d.value
        }));
    }
    
    // Find min and max time across both datasets
    const allTimes = [...primaryDataFormatted.map(d => d.time)];
    if (comparisonDataFormatted.length > 0) {
        allTimes.push(...comparisonDataFormatted.map(d => d.time));
    }
    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);
    
    // Find min and max values for Y scale, with special handling for EDA data
    const allValues = [...primaryDataFormatted.map(d => d.value)];
    if (comparisonDataFormatted.length > 0) {
        allValues.push(...comparisonDataFormatted.map(d => d.value));
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
        if (selectedMetric !== "BVP") { // BVP can be negative
            minValue = Math.max(0, minValue);
        }
    }
    
    // Create scales
    const xScale = d3.scaleLinear()
        .domain([minTime, maxTime])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([height, 0]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
        .ticks(10)
        .tickFormat(d => `${Math.floor(d)}`);
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(10);
    
    vizGroup.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);
    
    vizGroup.append("g")
        .attr("class", "y-axis")
        .call(yAxis);
    
    // Add axis labels
    vizGroup.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Time (minutes into exam)");
    
    vizGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text(getMetricAxisLabel(selectedMetric, useRawValues));
    
    // Add title
    vizGroup.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text(`${getMetricFullName(selectedMetric)} Over Time`);
    
    // Create line generator
    const line = d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);
    
    // Draw primary student line
    vizGroup.append("path")
        .datum(primaryDataFormatted)
        .attr("class", "timeline-line primary-line")
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#1a73e8")
        .attr("stroke-width", 2.5)
        .attr("opacity", 0.8);
    
    // Draw comparison student line if selected
    if (comparisonDataFormatted.length > 0) {
        vizGroup.append("path")
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
    const legend = vizGroup.append("g")
        .attr("class", "timeline-legend")
        .attr("transform", `translate(${width - 150}, 20)`);
    
    // Primary student legend item
    legend.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 20)
        .attr("y2", 0)
        .attr("stroke", "#1a73e8")
        .attr("stroke-width", 2.5);
    
    legend.append("text")
        .attr("x", 25)
        .attr("y", 4)
        .text(primaryStudent)
        .attr("font-size", "12px");
    
    // Comparison student legend item (if applicable)
    if (comparisonDataFormatted.length > 0) {
        legend.append("line")
            .attr("x1", 0)
            .attr("y1", 20)
            .attr("x2", 20)
            .attr("y2", 20)
            .attr("stroke", "#e63946")
            .attr("stroke-width", 2.5)
            .attr("stroke-dasharray", "5,3");
        
        legend.append("text")
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
        const metricCheckboxes = document.querySelectorAll("#metric-checkboxes input");
        metricCheckboxes.forEach(checkbox => {
            if (checkbox !== clickedCheckbox) {
                checkbox.checked = false;
            }
        });
        
        // Update selectedMetrics to contain only the clicked metric
        selectedMetrics = [clickedCheckbox.value];
    } else {
        // If the clicked checkbox is being unchecked, make sure at least one remains checked
        const checkedCheckboxes = document.querySelectorAll("#metric-checkboxes input:checked");
        if (checkedCheckboxes.length === 0) {
            clickedCheckbox.checked = true;
            selectedMetrics = [clickedCheckbox.value];
            alert("Please select at least one metric to display data.");
        } else {
            // Update selectedMetrics array
            selectedMetrics = Array.from(checkedCheckboxes).map(checkbox => checkbox.value);
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
    const metricCheckboxes = document.querySelectorAll("#metric-checkboxes input");
    metricCheckboxes.forEach(checkbox => {
        checkbox.removeEventListener("change", handleMetricChange);
        checkbox.addEventListener("change", handleMetricChange);
    });
}

// Apply this fix when initializing the application
document.addEventListener("DOMContentLoaded", function() {
    // This will be called after the original DOM loaded handler
    setTimeout(() => {
        disableAnimationFeatures();
        removeTimeControls();
    }, 100);
});


function updateStudentDropdowns(dataset) {
    const primaryStudentSelect = document.getElementById("timeline-primary-student");
    const comparisonStudentSelect = document.getElementById("timeline-comparison-student");
    
    if (!primaryStudentSelect || !comparisonStudentSelect) {
        return;
    }
    
    // Save current selections
    const currentPrimaryStudent = primaryStudentSelect.value || selectedStudents[0];
    const currentComparisonStudent = comparisonStudentSelect.value || "";
    
    // Clear existing options
    primaryStudentSelect.innerHTML = "";
    comparisonStudentSelect.innerHTML = "";
    
    // Add options for primary student
    const students = Object.keys(dataset);
    students.forEach(student => {
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
    students.forEach(student => {
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
    
    switch(metric) {
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
    switch(metric) {
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
                const magnitude = Math.sqrt(
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
    if (metric.startsWith("avg") || metric.startsWith("max") || metric.startsWith("variability")) {
        metric = metric.replace(/^avg|^max|^variability/, "");
    }
    switch(metric) {
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
                const magnitude = Math.sqrt(
                    Math.pow(value[0], 2) + 
                    Math.pow(value[1], 2) + 
                    Math.pow(value[2], 2)
                ) / 64;
                return `${magnitude.toFixed(3)} g`;
            } else {
                return `${(value/64).toFixed(3)} g`;
            }
        case "grade":
            return `${value.toFixed(1)}%`;
        default:
            return value.toFixed(2);
    }
}

// Get display name for metric
function getMetricDisplayName(metric) {
    switch(metric) {
        case "grade": return "Grade";
        case "avgEDA": return "Average EDA (μS)";
        case "avgHR": return "Average Heart Rate (BPM)";
        case "avgBVP": return "Average BVP";
        case "avgTEMP": return "Average Temperature (°C)";
        case "variabilityEDA": return "EDA Variability";
        case "variabilityHR": return "Heart Rate Variability";
        case "maxEDA": return "Maximum EDA (μS)";
        case "maxHR": return "Maximum Heart Rate (BPM)";
        default: return metric;
    }
}

// Get full name for a metric
function getMetricFullName(metric) {
    switch(metric) {
        case "EDA": return "Electrodermal Activity";
        case "HR": return "Heart Rate";
        case "BVP": return "Blood Volume Pulse";
        case "TEMP": return "Skin Temperature";
        case "IBI": return "Inter-Beat Interval";
        case "ACC": return "Accelerometer (Movement)";
        default: return metric;
    }
}

// Format body part name to title case
function formatBodyPartName(bodyPart) {
    return bodyPart
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Get explanation for a body part
function getBodyPartExplanation(bodyPart) {
    switch(bodyPart) {
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
    const points = students.map(student => ({
        x: studentMetrics[student][xMetric],
        y: studentMetrics[student][yMetric]
    }));
    const xMean = d3.mean(points, d => d.x);
    const yMean = d3.mean(points, d => d.y);
    let numerator = 0;
    let denominator = 0;
    let yDenominator = 0;
    points.forEach(point => {
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
    Object.keys(dataset).forEach(student => {
        studentMetrics[student] = {
            grade: getStudentGrade(student),
            avgEDA: calculateAverageMetric(dataset, student, "EDA"),
            avgHR: calculateAverageMetric(dataset, student, "HR"),
            avgBVP: calculateAverageMetric(dataset, student, "BVP"),
            avgTEMP: calculateAverageMetric(dataset, student, "TEMP"),
            maxEDA: calculateMaxMetric(dataset, student, "EDA"),
            maxHR: calculateMaxMetric(dataset, student, "HR"),
            variabilityEDA: calculateMetricVariability(dataset, student, "EDA"),
            variabilityHR: calculateMetricVariability(dataset, student, "HR")
        };
    });
    
    let insights = [];
    if (xAxisMetric !== yAxisMetric) {
        const correlation = calculateCorrelation(Object.keys(studentMetrics), studentMetrics, xAxisMetric, yAxisMetric);
        if (Math.abs(correlation) > 0.7) {
            insights.push(`Strong ${correlation > 0 ? "positive" : "negative"} correlation (${correlation.toFixed(2)}) between ${getMetricDisplayName(xAxisMetric)} and ${getMetricDisplayName(yAxisMetric)}.`);
        } else if (Math.abs(correlation) > 0.4) {
            insights.push(`Moderate ${correlation > 0 ? "positive" : "negative"} correlation (${correlation.toFixed(2)}) between ${getMetricDisplayName(xAxisMetric)} and ${getMetricDisplayName(yAxisMetric)}.`);
        } else {
            insights.push(`Weak correlation (${correlation.toFixed(2)}) between ${getMetricDisplayName(xAxisMetric)} and ${getMetricDisplayName(yAxisMetric)}.`);
        }
    }
    
    if (xAxisMetric === "grade" || yAxisMetric === "grade") {
        const otherMetric = xAxisMetric === "grade" ? yAxisMetric : xAxisMetric;
        const highPerformers = Object.keys(studentMetrics).filter(s => studentMetrics[s].grade >= 85);
        const lowPerformers = Object.keys(studentMetrics).filter(s => studentMetrics[s].grade < 70);
        if (highPerformers.length > 0 && lowPerformers.length > 0) {
            const highAvg = d3.mean(highPerformers, s => studentMetrics[s][otherMetric]);
            const lowAvg = d3.mean(lowPerformers, s => studentMetrics[s][otherMetric]);
            if (Math.abs(highAvg - lowAvg) / ((highAvg + lowAvg) / 2) > 0.2) {
                insights.push(`High performers (grades ≥85%) show ${highAvg > lowAvg ? "higher" : "lower"} ${getMetricDisplayName(otherMetric)} compared to low performers.`);
            }
        }
    }
    
    if (currentExam === "Midterm_1") {
        if (xAxisMetric.includes("EDA") || yAxisMetric.includes("EDA")) {
            insights.push("First midterm typically shows higher initial EDA readings in the first 15 minutes, indicating nervousness.");
        }
        if (xAxisMetric.includes("HR") || yAxisMetric.includes("HR")) {
            insights.push("Students who maintained steady heart rates after the first 30 minutes tended to perform better on Midterm 1.");
        }
    } else if (currentExam === "Midterm_2") {
        if (xAxisMetric === "grade" || yAxisMetric === "grade") {
            insights.push("Midterm 2 shows more varied performance with some students improving significantly while others declining.");
        }
        if (xAxisMetric.includes("variability") || yAxisMetric.includes("variability")) {
            insights.push("Lower physiological variability correlates with more consistent academic performance between midterms.");
        }
    } else {
        if (xAxisMetric.includes("EDA") || yAxisMetric.includes("EDA")) {
            insights.push("The 3-hour final exam shows distinct EDA patterns with recovery periods visible for high performers.");
        }
        if (xAxisMetric.includes("HR") || yAxisMetric.includes("HR")) {
            insights.push("Heart rate tends to decrease in the middle hour of the final exam before rising again in the last hour.");
        }
    }
    
    if (xAxisMetric.includes("TEMP") || yAxisMetric.includes("TEMP")) {
        insights.push("Skin temperature stabilization during the exam may indicate better stress regulation.");
    }
    
    if (xAxisMetric.includes("variability") || yAxisMetric.includes("variability")) {
        insights.push("Physiological variability can indicate both positive engagement and negative stress responses.");
    }
    
    const avgHRs = Object.keys(studentMetrics).map(s => studentMetrics[s].avgHR);
    
    if (avgHRs.length > 0 && d3.max(avgHRs) - d3.min(avgHRs) > 20) {
        insights.push(`Wide range of heart rates (${d3.min(avgHRs).toFixed(1)}-${d3.max(avgHRs).toFixed(1)} BPM) suggests varied stress responses among students.`);
    }
    
    insights.forEach(insight => {
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
    return Math.max(...data.map(d => d.value));
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
        return acc + (diff * diff);
    }, 0);
    return Math.sqrt(sumSquaredDiffs / data.length);
}

// Get student grade based on actual grade data
function getStudentGrade(student) {
    const grades = {
        "Midterm_1": {
            "S1": 78, "S01": 78,
            "S2": 82, "S02": 82,
            "S3": 77, "S03": 77,
            "S4": 75, "S04": 75,
            "S5": 67, "S05": 67,
            "S6": 71, "S06": 71,
            "S7": 64, "S07": 64,
            "S8": 92, "S08": 92,
            "S9": 80, "S09": 80,
            "S10": 89
        },
        "Midterm_2": {
            "S1": 82, "S01": 82,
            "S2": 85, "S02": 85,
            "S3": 90, "S03": 90,
            "S4": 77, "S04": 77,
            "S5": 77, "S05": 77,
            "S6": 64, "S06": 64,
            "S7": 33, "S07": 33,
            "S8": 88, "S08": 88,
            "S9": 39, "S09": 39,
            "S10": 64
        },
        "Final": {
            "S1": 91, "S01": 91,
            "S2": 90, "S02": 90,
            "S3": 94, "S03": 94,
            "S4": 75, "S04": 75,
            "S5": 79, "S05": 79,
            "S6": 88, "S06": 88,
            "S7": 55, "S07": 55,
            "S8": 92, "S08": 92,
            "S9": 63, "S09": 63,
            "S10": 58
        }
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
        comparisonViz.innerHTML = "<p>Comparison visualization controls not found</p>";
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
    const svg = d3.select(comparisonViz)
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
    
    // Calculate metrics for each student
    const studentMetrics = {};
    Object.keys(dataset).forEach(student => {
        studentMetrics[student] = {
            grade: getStudentGrade(student),
            avgEDA: calculateAverageMetric(dataset, student, "EDA"),
            avgHR: calculateAverageMetric(dataset, student, "HR"),
            avgBVP: calculateAverageMetric(dataset, student, "BVP"),
            avgTEMP: calculateAverageMetric(dataset, student, "TEMP"),
            maxEDA: calculateMaxMetric(dataset, student, "EDA"),
            maxHR: calculateMaxMetric(dataset, student, "HR"),
            variabilityEDA: calculateMetricVariability(dataset, student, "EDA"),
            variabilityHR: calculateMetricVariability(dataset, student, "HR")
        };
    });
    
    // Filter students based on performance if needed
    let filteredStudents = Object.keys(studentMetrics);
    
    if (performanceFilter !== "all") {
        filteredStudents = filteredStudents.filter(student => {
            const grade = studentMetrics[student].grade;
            
            if (performanceFilter === "high" && grade >= 85) return true;
            if (performanceFilter === "medium" && grade >= 70 && grade < 85) return true;
            if (performanceFilter === "low" && grade < 70) return true;
            
            return false;
        });
    }
    
    // Create the scatter plot with responsive margins
    const margin = { 
        top: Math.max(20, containerWidth * 0.04), 
        right: Math.max(30, containerWidth * 0.05), 
        bottom: Math.max(50, containerWidth * 0.1), 
        left: Math.max(50, containerWidth * 0.08)
    };
    
    const width = containerWidth - margin.left - margin.right;
    const height = chartHeight - margin.top - margin.bottom;
    
    const plotGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Get the data for x and y axes
    const xValues = filteredStudents.map(s => studentMetrics[s][xAxisMetric]);
    const yValues = filteredStudents.map(s => studentMetrics[s][yAxisMetric]);
    
    if (xValues.length === 0 || yValues.length === 0) {
        plotGroup.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .text("No data available for the selected filters");
        return;
    }
    
    // Create scales
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(xValues) * 1.1])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(yValues) * 1.1])
        .range([height, 0]);
    
    // Create bubble size scale
    let radiusScale;
    if (bubbleSizeMetric === "constant") {
        radiusScale = d => 8; // Constant size
    } else {
        const sizeValues = filteredStudents.map(s => studentMetrics[s][bubbleSizeMetric]);
        // Scale bubble size based on container width
        const maxBubbleSize = Math.min(20, containerWidth * 0.04);
        const minBubbleSize = Math.min(5, containerWidth * 0.01);
        
        radiusScale = d3.scaleLinear()
            .domain([d3.min(sizeValues), d3.max(sizeValues)])
            .range([minBubbleSize, maxBubbleSize]);
    }
    
    // Create color scale based on grades
    const colorScale = d3.scaleLinear()
        .domain([50, 70, 85, 100])
        .range(["#e63946", "#f4a261", "#a8dadc", "#1d3557"]);
    
    // Draw axes
    plotGroup.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))
        .attr("class", "x-axis");
    
    plotGroup.append("g")
        .call(d3.axisLeft(yScale))
        .attr("class", "y-axis");
    
    // Add axis labels with size adjustment for small screens
    const labelSize = containerWidth < 500 ? 11 : 14;
    
    plotGroup.append("text")
        .attr("x", width / 2)
        .attr("y", height + (containerWidth < 500 ? 25 : 40))
        .attr("text-anchor", "middle")
        .style("font-size", `${labelSize}px`)
        .text(getMetricDisplayName(xAxisMetric));
    
    plotGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -(containerWidth < 500 ? 30 : 40))
        .attr("text-anchor", "middle")
        .style("font-size", `${labelSize}px`)
        .text(getMetricDisplayName(yAxisMetric));
    
    // Add plot title with responsive font size
    const titleSize = containerWidth < 500 ? 14 : 16;
    
    svg.append("text")
        .attr("x", containerWidth / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", `${titleSize}px`)
        .attr("font-weight", "bold")
        .text(`Relationship Between ${getMetricDisplayName(xAxisMetric)} and ${getMetricDisplayName(yAxisMetric)}`);
    
    // Draw scatter plot points
    plotGroup.selectAll(".student-point")
        .data(filteredStudents)
        .enter()
        .append("circle")
        .attr("class", "student-point")
        .attr("cx", d => xScale(studentMetrics[d][xAxisMetric]))
        .attr("cy", d => yScale(studentMetrics[d][yAxisMetric]))
        .attr("r", d => bubbleSizeMetric === "constant" ? 8 : radiusScale(studentMetrics[d][bubbleSizeMetric]))
        .attr("fill", d => colorScale(studentMetrics[d].grade))
        .attr("stroke", "#444")
        .attr("stroke-width", 1)
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
            // Show tooltip
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "white")
                .style("padding", "5px")
                .style("border", "1px solid #ddd")
                .style("border-radius", "3px")
                .style("z-index", "1000")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
            
            tooltip.html(`
                <strong>${d}</strong><br>
                Grade: ${studentMetrics[d].grade}<br>
                ${getMetricDisplayName(xAxisMetric)}: ${formatMetricValue(studentMetrics[d][xAxisMetric], xAxisMetric.replace('avg', '').replace('variability', '').replace('max', ''))}<br>
                ${getMetricDisplayName(yAxisMetric)}: ${formatMetricValue(studentMetrics[d][yAxisMetric], yAxisMetric.replace('avg', '').replace('variability', '').replace('max', ''))}<br>
                ${bubbleSizeMetric !== "constant" ? `${getMetricDisplayName(bubbleSizeMetric)}: ${formatMetricValue(studentMetrics[d][bubbleSizeMetric], bubbleSizeMetric.replace('avg', '').replace('variability', '').replace('max', ''))}` : ''}
            `);
        })
        .on("mouseout", function() {
            // Remove tooltip
            d3.select(".tooltip").remove();
        });
    
    // *** LEGEND POSITIONING FIX ***
    // Create legends at the bottom - adjust Y position to be below the chart
    const legendY = chartHeight - 30; // Position below the chart
    const legendSpacing = width / 3; // Evenly space the legends
    const legendStartX = margin.left + 20; // Start a bit from the left margin
    
    // Create a container for legends to keep them organized
    const legendContainer = svg.append("g")
        .attr("class", "legend-container")
        .attr("transform", `translate(0, ${legendY})`);
    
    // Grade legend (color scale)
    const gradeLegend = legendContainer.append("g")
        .attr("class", "grade-legend")
        .attr("transform", `translate(${legendStartX}, 0)`);
    
    gradeLegend.append("text")
        .attr("x", 0)
        .attr("y", -15)
        .attr("font-weight", "bold")
        .attr("font-size", "12px")
        .text("Grade");
    
    // Create a gradient for the legend
    const legendGradient = gradeLegend.append("defs")
        .append("linearGradient")
        .attr("id", "grade-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");  // Horizontal gradient
    
    legendGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(50));
    
    legendGradient.append("stop")
        .attr("offset", "33%")
        .attr("stop-color", colorScale(70));
    
    legendGradient.append("stop")
        .attr("offset", "66%")
        .attr("stop-color", colorScale(85));
    
    legendGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(100));
    
    // Draw the gradient rectangle horizontally
    const gradientWidth = Math.min(150, width / 3 - 40);
    gradeLegend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", gradientWidth)
        .attr("height", 15)
        .style("fill", "url(#grade-gradient)");
    
    // Add labels
    gradeLegend.append("text")
        .attr("x", 0)
        .attr("y", 30)
        .attr("dominant-baseline", "middle")
        .attr("font-size", "10px")
        .text("50");
    
    gradeLegend.append("text")
        .attr("x", gradientWidth / 3)
        .attr("y", 30)
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .text("70");
    
    gradeLegend.append("text")
        .attr("x", gradientWidth * 2/3)
        .attr("y", 30)
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .text("85");
    
    gradeLegend.append("text")
        .attr("x", gradientWidth)
        .attr("y", 30)
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .text("100");
    
    // Only add size legend if not using constant size
    if (bubbleSizeMetric !== "constant") {
        const sizeLegend = legendContainer.append("g")
            .attr("class", "size-legend")
            .attr("transform", `translate(${legendStartX + legendSpacing}, 0)`);
        
        sizeLegend.append("text")
            .attr("x", 0)
            .attr("y", -15)
            .attr("font-weight", "bold")
            .attr("font-size", "12px")
            .text(getMetricDisplayName(bubbleSizeMetric));
        
        // Add circles for size reference
        const sizeValues = filteredStudents.map(s => studentMetrics[s][bubbleSizeMetric]);
        const minSize = d3.min(sizeValues);
        const maxSize = d3.max(sizeValues);
        const midSize = (minSize + maxSize) / 2;
        
        const sizePoints = [
            { size: minSize, label: "Min" },
            { size: midSize, label: "Mid" },
            { size: maxSize, label: "Max" }
        ];
        
        // Place the circles horizontally with proper spacing
        const circlePadding = Math.min(40, width / 10);
        sizePoints.forEach((point, i) => {
            // Position circles with even spacing
            const xPos = i * circlePadding;
            
            sizeLegend.append("circle")
                .attr("cx", xPos)
                .attr("cy", 7)  // Half the height of the color gradient rect
                .attr("r", radiusScale(point.size))
                .attr("fill", "#777")
                .attr("stroke", "#444")
                .attr("opacity", 0.8);
            
            sizeLegend.append("text")
                .attr("x", xPos)
                .attr("y", 30)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .text(formatMetricValue(point.size, bubbleSizeMetric.replace('avg', '').replace('variability', '').replace('max', '')));
        });
    }
    
    // After generating the visualization, update insights
    populateInsights();
}

/* ================================
   Stress Recovery Analysis Functions
   ================================ */

// Analyze stress recovery patterns in physiological data
function analyzeStressRecoveryPatterns(dataset, student, metric = "EDA") {
    if (!dataset || !dataset[student] || !dataset[student][metric]) {
        return { recoveryEvents: [], averageRecoveryTime: 0, maxRecoveryTime: 0 };
    }
    
    const data = dataset[student][metric];
    if (data.length < 10) { // Need enough data points to analyze patterns
        return { recoveryEvents: [], averageRecoveryTime: 0, maxRecoveryTime: 0 };
    }
    
    // Parameters for spike detection
    const windowSize = 20; // Moving window to detect local maxima
    const thresholdPercent = 0.25; // Threshold for considering a spike significant (25% above local average)
    const recoveryThresholdPercent = 0.50; // Consider recovered when value drops to 50% of spike magnitude
    
    let recoveryEvents = [];
    let localMaxima = [];
    
    // Find local maxima (potential stress spikes)
    for (let i = windowSize; i < data.length - windowSize; i++) {
        const currentWindow = data.slice(i - windowSize, i + windowSize);
        const localMax = Math.max(...currentWindow.map(d => d.value));
        
        // Use an epsilon to compare floating point values
        if (Math.abs(data[i].value - localMax) < 1e-6) {
            // Calculate baseline (average of surrounding values excluding the spike)
            const surroundingValues = [...data.slice(i - windowSize, i), ...data.slice(i + 1, i + windowSize)];
            const baseline = d3.mean(surroundingValues, d => d.value);
            
            // Check if the spike is significant compared to baseline
            if (data[i].value > baseline * (1 + thresholdPercent)) {
                localMaxima.push({
                    index: i,
                    timestamp: data[i].timestamp,
                    value: data[i].value,
                    baseline: baseline
                });
            }
        }
    }
    
    // Analyze recovery patterns for each significant spike
    for (let j = 0; j < localMaxima.length; j++) {
        const spike = localMaxima[j];
        const spikeMagnitude = spike.value - spike.baseline;
        const recoveryTarget = spike.value - (spikeMagnitude * recoveryThresholdPercent);
        
        let recoveryIndex = null;
        let recoveryTime = null;
        
        // Look for recovery point after the spike
        for (let k = spike.index + 1; k < data.length; k++) {
            if (data[k].value <= recoveryTarget) {
                recoveryIndex = k;
                recoveryTime = data[k].timestamp - spike.timestamp; // seconds to recover
                break;
            }
        }
        
        // Only include events where we found a recovery point
        if (recoveryIndex !== null) {
            recoveryEvents.push({
                spikeIndex: spike.index,
                spikeTime: spike.timestamp,
                spikeValue: spike.value,
                recoveryIndex: recoveryIndex,
                recoveryTime: recoveryTime,
                recoveryTimeMinutes: recoveryTime / 60, // Convert to minutes
                spikeMagnitude: spikeMagnitude
            });
        }
    }
    
    // Calculate summary statistics
    const averageRecoveryTime = recoveryEvents.length > 0 ? 
        d3.mean(recoveryEvents, d => d.recoveryTime) : 0;
    
    const maxRecoveryTime = recoveryEvents.length > 0 ?
        d3.max(recoveryEvents, d => d.recoveryTime) : 0;
    
    return {
        recoveryEvents: recoveryEvents,
        averageRecoveryTime: averageRecoveryTime,
        averageRecoveryTimeMinutes: averageRecoveryTime / 60,
        maxRecoveryTime: maxRecoveryTime,
        maxRecoveryTimeMinutes: maxRecoveryTime / 60,
        spikeCount: recoveryEvents.length
    };
}

// Compare recovery patterns between high and low performers
function compareRecoveryPatterns(dataset, metric = "EDA") {
    const students = Object.keys(dataset);
    const studentMetrics = {};
    
    // Calculate grades and recovery patterns for all students
    students.forEach(student => {
        studentMetrics[student] = {
            grade: getStudentGrade(student),
            recoveryPatterns: analyzeStressRecoveryPatterns(dataset, student, metric)
        };
    });
    
    // Categorize students
    const highPerformers = students.filter(s => studentMetrics[s].grade >= 85);
    const lowPerformers = students.filter(s => studentMetrics[s].grade < 70);
    const midPerformers = students.filter(s => studentMetrics[s].grade >= 70 && studentMetrics[s].grade < 85);
    
    // Calculate average recovery metrics for each group
    const highPerformerAvgRecovery = highPerformers.length > 0 ?
        d3.mean(highPerformers, s => studentMetrics[s].recoveryPatterns.averageRecoveryTime) : 0;
    
    const lowPerformerAvgRecovery = lowPerformers.length > 0 ?
        d3.mean(lowPerformers, s => studentMetrics[s].recoveryPatterns.averageRecoveryTime) : 0;
    
    const midPerformerAvgRecovery = midPerformers.length > 0 ?
        d3.mean(midPerformers, s => studentMetrics[s].recoveryPatterns.averageRecoveryTime) : 0;
    
    // Calculate average spike count for each group
    const highPerformerAvgSpikes = highPerformers.length > 0 ?
        d3.mean(highPerformers, s => studentMetrics[s].recoveryPatterns.spikeCount) : 0;
    
    const lowPerformerAvgSpikes = lowPerformers.length > 0 ?
        d3.mean(lowPerformers, s => studentMetrics[s].recoveryPatterns.spikeCount) : 0;
    
    const midPerformerAvgSpikes = midPerformers.length > 0 ?
        d3.mean(midPerformers, s => studentMetrics[s].recoveryPatterns.spikeCount) : 0;
    
    return {
        studentMetrics: studentMetrics,
        highPerformers: {
            students: highPerformers,
            averageRecoveryTime: highPerformerAvgRecovery,
            averageRecoveryTimeMinutes: highPerformerAvgRecovery / 60,
            averageSpikeCount: highPerformerAvgSpikes
        },
        midPerformers: {
            students: midPerformers,
            averageRecoveryTime: midPerformerAvgRecovery,
            averageRecoveryTimeMinutes: midPerformerAvgRecovery / 60,
            averageSpikeCount: midPerformerAvgSpikes
        },
        lowPerformers: {
            students: lowPerformers,
            averageRecoveryTime: lowPerformerAvgRecovery,
            averageRecoveryTimeMinutes: lowPerformerAvgRecovery / 60,
            averageSpikeCount: lowPerformerAvgSpikes
        },
        comparison: {
            recoveryTimeDiff: lowPerformerAvgRecovery - highPerformerAvgRecovery,
            recoveryTimeDiffMinutes: (lowPerformerAvgRecovery - highPerformerAvgRecovery) / 60,
            recoveryTimeRatio: lowPerformerAvgRecovery / (highPerformerAvgRecovery || 1),
            spikeCountDiff: lowPerformerAvgSpikes - highPerformerAvgSpikes,
            spikeCountRatio: lowPerformerAvgSpikes / (highPerformerAvgSpikes || 1)
        }
    };
}

// Visualize stress recovery patterns
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
  const recoveryMetricSelect = document.getElementById("recovery-metric-select");
  const recoveryMetric = recoveryMetricSelect ? recoveryMetricSelect.value : "EDA";
  
  // Analyze recovery patterns
  const recoveryAnalysis = compareRecoveryPatterns(dataset, recoveryMetric);
  
  // Create visualization
  const container = d3.select(recoveryViz);
  
  // Add title and description
  container.append("h3")
      .text(`Stress Recovery Analysis (${getMetricFullName(recoveryMetric)})`);
  
  container.append("p")
      .text("This analysis shows how quickly students recover from stress spikes during the exam.");
  
  // Create main grid container with better responsive design
  const grid = container.append("div")
      .attr("class", "recovery-grid")
      .style("display", "grid")
      .style("grid-template-columns", "repeat(auto-fit, minmax(300px, 1fr))")
      .style("gap", "20px");
  
  // Add comparison summary
  const summaryDiv = grid.append("div")
      .attr("class", "recovery-summary");
  
  summaryDiv.append("h4")
      .text("Recovery Time Comparison");
  
  const comparisonTable = summaryDiv.append("table")
      .attr("class", "recovery-table")
      .style("width", "100%")
      .style("border-collapse", "collapse")
      .style("margin-bottom", "20px");
  
  // Add table header
  comparisonTable.append("thead").append("tr")
      .selectAll("th")
      .data(["Performance Group", "Avg. Recovery Time", "Stress Spikes"])
      .enter()
      .append("th")
      .style("border", "1px solid #ddd")
      .style("padding", "8px")
      .style("background-color", "#f2f2f2")
      .text(d => d);
  
  // Add table rows
  const tbody = comparisonTable.append("tbody");
  
  // High performers row
  tbody.append("tr")
      .html(`
          <td style="border: 1px solid #ddd; padding: 8px; background-color: #a8dadc;">High Performers (≥85%)</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${recoveryAnalysis.highPerformers.averageRecoveryTimeMinutes.toFixed(1)} minutes</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${recoveryAnalysis.highPerformers.averageSpikeCount.toFixed(1)} per exam</td>
      `);
  
  // Mid performers row
  tbody.append("tr")
      .html(`
          <td style="border: 1px solid #ddd; padding: 8px; background-color: #f4a261;">Mid Performers (70-84%)</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${recoveryAnalysis.midPerformers.averageRecoveryTimeMinutes.toFixed(1)} minutes</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${recoveryAnalysis.midPerformers.averageSpikeCount.toFixed(1)} per exam</td>
      `);
  
  // Low performers row
  tbody.append("tr")
      .html(`
          <td style="border: 1px solid #ddd; padding: 8px; background-color: #e63946;">Low Performers (<70%)</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${recoveryAnalysis.lowPerformers.averageRecoveryTimeMinutes.toFixed(1)} minutes</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${recoveryAnalysis.lowPerformers.averageSpikeCount.toFixed(1)} per exam</td>
      `);
  
  // Add key insight
  summaryDiv.append("div")
      .attr("class", "key-insight")
      .style("padding", "10px")
      .style("border-left", "4px solid #1a73e8")
      .style("background-color", "#f8f9fa")
      .style("margin-top", "15px")
      .html(() => {
          if (recoveryAnalysis.comparison.recoveryTimeDiff > 0) {
              return `<strong>Key Insight:</strong> High performers recover from stress ${recoveryAnalysis.comparison.recoveryTimeRatio.toFixed(1)}× faster than lower performers (${Math.abs(recoveryAnalysis.comparison.recoveryTimeDiffMinutes).toFixed(1)} minutes faster on average).`;
          } else if (recoveryAnalysis.comparison.recoveryTimeDiff < 0) {
              return `<strong>Key Insight:</strong> Interestingly, high performers take ${Math.abs(recoveryAnalysis.comparison.recoveryTimeRatio).toFixed(1)}× longer to recover from stress peaks than lower performers.`;
          } else {
              return `<strong>Key Insight:</strong> There is no significant difference in stress recovery time between high and low performers.`;
          }
      });
  
  // Create bar chart for recovery visualization with responsive sizing
  const chartDiv = grid.append("div");
  
  // Get container width for responsive sizing
  const containerWidth = recoveryViz.clientWidth / 2 - 30;
  const containerHeight = 300;
  
  // Setup SVG for bar chart with responsive dimensions
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const width = Math.min(containerWidth, 400) - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;
  
  const svg = chartDiv.append("svg")
      .attr("width", "100%")
      .attr("height", containerHeight)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Format data for the chart
  const chartData = [
      { group: "High Performers", value: recoveryAnalysis.highPerformers.averageRecoveryTimeMinutes, color: "#a8dadc" },
      { group: "Mid Performers", value: recoveryAnalysis.midPerformers.averageRecoveryTimeMinutes, color: "#f4a261" },
      { group: "Low Performers", value: recoveryAnalysis.lowPerformers.averageRecoveryTimeMinutes, color: "#e63946" }
  ];
  
  // Create X axis with better sizing for labels
  const x = d3.scaleBand()
      .range([0, width])
      .domain(chartData.map(d => d.group))
      .padding(0.2);
      
  svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-15)")
      .style("text-anchor", "end")
      .style("font-size", "10px");
  
  // Add X axis label
  svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 35)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Student Performance Groups");
  
  // Find max value for Y scale with some padding
  const maxValue = d3.max(chartData, d => d.value) * 1.2;
  
  // Create Y axis
  const y = d3.scaleLinear()
      .domain([0, maxValue])
      .range([height, 0]);
      
  svg.append("g")
      .call(d3.axisLeft(y));
  
  // Add Y axis label
  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -35)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Recovery Time (minutes)");
  
  // Add bars
  svg.selectAll(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.group))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.value))
      .attr("height", d => height - y(d.value))
      .attr("fill", d => d.color);
  
  // Add values on top of bars
  svg.selectAll(".bar-label")
      .data(chartData)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", d => x(d.group) + x.bandwidth() / 2)
      .attr("y", d => y(d.value) - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .text(d => d.value.toFixed(1));
  
  // Add individual student recovery time section with responsive table
  const studentSection = container.append("div")
      .attr("class", "student-recovery-section")
      .style("margin-top", "30px")
      .style("overflow-x", "auto");  // Add horizontal scroll for small screens
  
  studentSection.append("h4")
      .text("Individual Student Recovery Patterns");
  
  // Create a table for individual student data
  const studentTable = studentSection.append("table")
      .attr("class", "student-table")
      .style("width", "100%")
      .style("min-width", "500px")  // Ensure minimum width for readability
      .style("border-collapse", "collapse");
  
  // Add table header
  studentTable.append("thead").append("tr")
      .selectAll("th")
      .data(["Student", "Grade", "Avg. Recovery (min)", "# of Stress Spikes", "Performance"])
      .enter()
      .append("th")
      .style("border", "1px solid #ddd")
      .style("padding", "8px")
      .style("background-color", "#f2f2f2")
      .text(d => d);
  
  // Get sorted student data
  const studentData = Object.keys(recoveryAnalysis.studentMetrics)
      .map(student => ({
          id: student,
          grade: recoveryAnalysis.studentMetrics[student].grade,
          recoveryTime: recoveryAnalysis.studentMetrics[student].recoveryPatterns.averageRecoveryTimeMinutes,
          spikeCount: recoveryAnalysis.studentMetrics[student].recoveryPatterns.spikeCount,
          performance: recoveryAnalysis.studentMetrics[student].grade >= 85 ? "High" : 
                      (recoveryAnalysis.studentMetrics[student].grade >= 70 ? "Mid" : "Low")
      }))
      .sort((a, b) => b.grade - a.grade);
  
  // Add rows for each student
  const studentTbody = studentTable.append("tbody");
  
  studentData.forEach(student => {
      const bgColor = student.performance === "High" ? "#a8dadc" : 
                    (student.performance === "Mid" ? "#f4a261" : "#e63946");
      
      studentTbody.append("tr")
          .style("background-color", d3.color(bgColor).copy({opacity: 0.3}))
          .html(`
              <td style="border: 1px solid #ddd; padding: 8px;">${student.id}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${student.grade}%</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${student.recoveryTime.toFixed(1)}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${student.spikeCount}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${student.performance}</td>
          `);
  });
  
  // Add analyze button event listener if it exists
  const analyzeBtn = document.getElementById("analyze-recovery-btn");
  if (analyzeBtn) {
      analyzeBtn.addEventListener("click", visualizeStressRecovery);
  }
}

function addResizeListener() {
  let resizeTimeout;
  window.addEventListener('resize', function() {
      // Debounce resize events to prevent excessive updates
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
          // Update visualizations on window resize
          updateTimelineVisualization();
          updateComparisonVisualization();
          
          // Check if stress recovery is visible and update it
          const recoveryViz = document.getElementById("recovery-visualization");
          if (recoveryViz && recoveryViz.innerHTML !== "") {
              visualizeStressRecovery();
          }
      }, 250); // Wait for 250ms after resize ends
  });
}


const cssUpdates = `
@media (max-width: 768px) {
    .body-map-container {
        flex-direction: column;
    }
    
    #body-visualization, #body-metrics {
        width: 100%;
    }
    
    .timeline-controls {
        flex-direction: column;
        align-items: stretch;
    }
    
    .recovery-grid {
        grid-template-columns: 1fr;
    }
    
    #comparison-visualization svg {
        height: 500px;
    }
    
    .recovery-controls {
        flex-wrap: wrap;
    }
    
    .comparison-controls {
        grid-template-columns: 1fr;
    }
}

/* Better visualization of active body parts */
.body-part {
    fill: #a8dadc;
    stroke: #457b9d;
    stroke-width: 2;
    transition: all 0.3s ease;
    cursor: pointer;
}

.body-part:hover {
    fill: #1a73e8;
    stroke: #1557b0;
    stroke-width: 3;
}

.body-part.active {
    stroke: #e63946;
    stroke-width: 3;
}

/* Better tooltip design */
.tooltip {
    position: absolute;
    padding: 10px;
    background-color: rgba(255, 255, 255, 0.95);
    border: 1px solid #ccc;
    border-radius: 4px;
    pointer-events: none;
    font-size: 0.9rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    max-width: 300px;
}

/* Improved timeline visualization */
.current-time-indicator {
    stroke: #e63946;
    stroke-width: 2;
    stroke-dasharray: 5,5;
    transition: transform 0.3s ease;
}

#time-slider {
    width: 100%;
    margin: 10px 0;
}

#play-pause {
    min-width: 100px;
}

/* Visualization container improvements */
#timeline-visualization, #comparison-visualization, #recovery-visualization {
    transition: height 0.3s ease;
    min-height: 400px;
}
`;


function applyStyleUpdates() {
  const styleElement = document.createElement('style');
  styleElement.textContent = cssUpdates;
  document.head.appendChild(styleElement);
}

// Make sure to call this when the DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  // Original event setup code from the file...
  
  // Add our style updates
  applyStyleUpdates();
});

document.addEventListener("DOMContentLoaded", function() {
    // Apply the enhanced styles for body map
    const style = document.createElement('style');
    style.textContent = `
    /* Body map container */
    .body-map-container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin: 1.5rem 0;
      align-items: stretch;
    }
    
    #body-visualization {
      flex: 1;
      min-width: 300px;
      min-height: 500px;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px solid #eee;
      border-radius: 8px;
      background-color: #f9f9f9;
      padding: 1rem;
    }
    
    #body-metrics {
      flex: 1;
      min-width: 300px;
      padding: 1.5rem;
      background-color: #f8f9fa;
      border: 1px solid #eee;
      border-radius: 8px;
      box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
    }
    
    /* Body parts styling */
    .body-part {
      transition: all 0.3s ease;
      cursor: pointer;
    }
    
    .body-part:hover {
      filter: brightness(1.1) drop-shadow(0 0 3px rgba(25, 118, 210, 0.4)) !important;
    }
    
    .body-part.active {
      stroke: #d32f2f !important;
      stroke-width: 3 !important;
      filter: drop-shadow(0 0 5px rgba(211, 47, 47, 0.5)) !important;
    }
    
    /* Metrics display styling */
    #selected-metric-display {
      padding: 15px;
      background-color: white;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    #selected-metric-display h4 {
      margin-top: 0;
      margin-bottom: 15px;
      color: #1976d2;
      border-bottom: 1px solid #eee;
      padding-bottom: 8px;
    }
    
    .metric-value {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 8px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
    
    .metric-value:nth-child(even) {
      background-color: #e3f2fd;
    }
    
    .value {
      font-weight: bold;
      color: #d32f2f;
    }
    
    .explanation {
      margin-top: 15px;
      padding: 10px;
      background-color: #e8f5e9;
      border-left: 4px solid #4caf50;
      border-radius: 0 4px 4px 0;
      font-style: italic;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .body-map-container {
        flex-direction: column;
      }
      
      #body-visualization, 
      #body-metrics {
        width: 100%;
      }
    }`;
    document.head.appendChild(style);
});
