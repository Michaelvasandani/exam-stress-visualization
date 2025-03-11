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
    initializeBodyMap();
    initializeTimelineVisualization();
    updateComparisonVisualization();
    populateInsights();
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
    
    // Reset the timeline
    currentTimeIndex = 0;
    const timeSlider = document.getElementById("time-slider");
    if (timeSlider) {
        timeSlider.value = 0;
    }
    updateCurrentTimeDisplay();
    
    // Stop any ongoing animation
    if (isPlaying) {
        togglePlayPause();
    }
    
    // Repopulate student checkboxes as available students might differ
    populateStudentCheckboxes();
    
    // Update all visualizations
    updateBodyMap();
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
    
    // Create SVG for body visualization
    const svg = d3.select(bodyViz)
        .append("svg")
        .attr("viewBox", "0 0 200 400")
        .attr("preserveAspectRatio", "xMidYMid meet");
    
    // Draw a simple body outline
    // Head
    svg.append("circle")
        .attr("cx", 100)
        .attr("cy", 50)
        .attr("r", 40)
        .attr("class", "body-part")
        .attr("data-part", "head")
        .attr("data-metrics", "EDA,TEMP")
        .on("click", handleBodyPartClick);
    
    // Torso
    svg.append("rect")
        .attr("x", 70)
        .attr("y", 90)
        .attr("width", 60)
        .attr("height", 120)
        .attr("rx", 10)
        .attr("class", "body-part")
        .attr("data-part", "chest")
        .attr("data-metrics", "HR,BVP,IBI")
        .on("click", handleBodyPartClick);
    
    // Left arm
    svg.append("rect")
        .attr("x", 30)
        .attr("y", 100)
        .attr("width", 40)
        .attr("height", 20)
        .attr("rx", 10)
        .attr("class", "body-part")
        .attr("data-part", "left-arm")
        .attr("data-metrics", "EDA,TEMP,ACC")
        .on("click", handleBodyPartClick);
    
    // Right arm
    svg.append("rect")
        .attr("x", 130)
        .attr("y", 100)
        .attr("width", 40)
        .attr("height", 20)
        .attr("rx", 10)
        .attr("class", "body-part")
        .attr("data-part", "right-arm")
        .attr("data-metrics", "EDA,TEMP,ACC")
        .on("click", handleBodyPartClick);
    
    // Left leg
    svg.append("rect")
        .attr("x", 80)
        .attr("y", 210)
        .attr("width", 20)
        .attr("height", 100)
        .attr("rx", 5)
        .attr("class", "body-part")
        .attr("data-part", "left-leg")
        .attr("data-metrics", "ACC")
        .on("click", handleBodyPartClick);
    
    // Right leg
    svg.append("rect")
        .attr("x", 100)
        .attr("y", 210)
        .attr("width", 20)
        .attr("height", 100)
        .attr("rx", 5)
        .attr("class", "body-part")
        .attr("data-part", "right-leg")
        .attr("data-metrics", "ACC")
        .on("click", handleBodyPartClick);
    
    // Add labels
    svg.append("text")
        .attr("x", 100)
        .attr("y", 50)
        .attr("text-anchor", "middle")
        .attr("fill", "#666")
        .attr("pointer-events", "none")
        .text("Head");
    
    svg.append("text")
        .attr("x", 100)
        .attr("y", 150)
        .attr("text-anchor", "middle")
        .attr("fill", "#666")
        .attr("pointer-events", "none")
        .text("Heart");
    
    svg.append("text")
        .attr("x", 50)
        .attr("y", 110)
        .attr("text-anchor", "middle")
        .attr("fill", "#666")
        .attr("pointer-events", "none")
        .text("Wrist");
    
    svg.append("text")
        .attr("x", 150)
        .attr("y", 110)
        .attr("text-anchor", "middle")
        .attr("fill", "#666")
        .attr("pointer-events", "none")
        .text("Wrist");
}

// Handle click on body part
function handleBodyPartClick(event, d) {
    d3.selectAll(".body-part").classed("active", false);
    d3.select(this).classed("active", true);
    const bodyPart = d3.select(this).attr("data-part");
    const relevantMetrics = d3.select(this).attr("data-metrics").split(",");
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
    const student = selectedStudents[0]; // Use first selected student for display
    metricsDisplay.innerHTML = "";
    const title = document.createElement("h4");
    title.textContent = `${formatBodyPartName(bodyPart)} Metrics`;
    metricsDisplay.appendChild(title);
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
    const activeBodyPart = d3.select(".body-part.active");
    if (!activeBodyPart.empty()) {
        const bodyPart = activeBodyPart.attr("data-part");
        const relevantMetrics = activeBodyPart.attr("data-metrics").split(",");
        updateBodyMetricsDisplay(bodyPart, relevantMetrics);
    }
    if (dataset && selectedStudents.length > 0) {
        const student = selectedStudents[0];
        if (dataset[student] && dataset[student].EDA) {
            const edaValue = getCurrentMetricValue(dataset, student, "EDA");
            if (edaValue !== null) {
                const normalizedEDA = Math.min(Math.max(edaValue / 0.5, 0), 1);
                const colorIntensity = Math.floor(255 * (1 - normalizedEDA));
                const color = `rgb(255, ${colorIntensity}, ${colorIntensity})`;
                d3.select(".body-part[data-part='head']")
                    .style("fill", color);
            }
        }
        if (dataset[student] && dataset[student].HR) {
            const hrValue = getCurrentMetricValue(dataset, student, "HR");
            if (hrValue !== null) {
                const normalizedHR = Math.min(Math.max((hrValue - 60) / 40, 0), 1);
                const colorIntensity = Math.floor(255 * (1 - normalizedHR));
                const color = `rgb(255, ${colorIntensity}, ${colorIntensity})`;
                d3.select(".body-part[data-part='chest']")
                    .style("fill", color);
            }
        }
        if (dataset[student] && dataset[student].TEMP) {
            const tempValue = getCurrentMetricValue(dataset, student, "TEMP");
            if (tempValue !== null) {
                const normalizedTemp = Math.min(Math.max((tempValue - 30) / 5, 0), 1);
                const colorIntensity = Math.floor(255 * (1 - normalizedTemp));
                const color = `rgb(${colorIntensity}, ${colorIntensity}, 255)`;
                d3.selectAll(".body-part[data-part='left-arm'], .body-part[data-part='right-arm']")
                    .style("fill", color);
            }
        }
        if (dataset[student] && dataset[student].ACC) {
            const accValue = getCurrentMetricValue(dataset, student, "ACC");
            if (accValue !== null) {
                const normalizedACC = Math.min(Math.max(accValue / 2, 0), 1);
                const colorIntensity = Math.floor(255 * (1 - normalizedACC));
                const color = `rgb(${colorIntensity}, 255, ${colorIntensity})`;
                d3.selectAll(".body-part[data-part='left-leg'], .body-part[data-part='right-leg']")
                    .style("fill", color);
            }
        }
    }
}

// Initialize timeline visualization
function initializeTimelineVisualization() {
    const timelineViz = document.getElementById("timeline-visualization");
    if (!timelineViz) {
        console.error("Timeline visualization container not found");
        return;
    }
    
    const svg = d3.select(timelineViz)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "400px");
    const vizGroup = svg.append("g")
        .attr("transform", "translate(50, 20)");
    vizGroup.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", "translate(0, 350)");
    vizGroup.append("g")
        .attr("class", "axis y-axis");
    vizGroup.append("text")
        .attr("x", svg.node().getBoundingClientRect().width / 2 - 50)
        .attr("y", 390)
        .attr("text-anchor", "middle")
        .text("Time (minutes into exam)");
    vizGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -175)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Metric Value (normalized)");
    const legend = vizGroup.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${svg.node().getBoundingClientRect().width - 200}, 20)`);
    updateTimelineVisualization();
}

// Update timeline visualization based on selected exam, students, and metrics
function updateTimelineVisualization() {
    const timelineViz = d3.select("#timeline-visualization svg");
    if (timelineViz.empty()) {
        console.error("Timeline visualization SVG not found");
        return;
    }
    
    const vizWidth = timelineViz.node().getBoundingClientRect().width - 100;
    const vizHeight = 350;
    const dataset = getCurrentDataset();
    timelineViz.select(".viz-group").remove();
    const vizGroup = timelineViz.append("g")
        .attr("class", "viz-group")
        .attr("transform", "translate(50, 20)");
    if (dataset && selectedStudents.length > 0 && selectedMetrics.length > 0) {
        let minTime = Infinity;
        let maxTime = -Infinity;
        selectedStudents.forEach(student => {
            selectedMetrics.forEach(metric => {
                if (dataset[student] && dataset[student][metric]) {
                    const timestamps = dataset[student][metric].map(d => d.timestamp);
                    const localMin = Math.min(...timestamps);
                    const localMax = Math.max(...timestamps);
                    minTime = Math.min(minTime, localMin);
                    maxTime = Math.max(maxTime, localMax);
                }
            });
        });
        const examStart = minTime;
        const examDurationMinutes = (maxTime - examStart) / 60;
        const xScale = d3.scaleLinear()
            .domain([0, examDurationMinutes])
            .range([0, vizWidth]);
        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([vizHeight, 0]);
        vizGroup.select(".x-axis").remove();
        vizGroup.select(".y-axis").remove();
        vizGroup.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0, ${vizHeight})`)
            .call(d3.axisBottom(xScale));
        vizGroup.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(yScale));
        const colorScale = d3.scaleOrdinal()
            .domain(["EDA", "HR", "BVP", "TEMP", "IBI", "ACC"])
            .range(["#e63946", "#1d3557", "#457b9d", "#f4a261", "#2a9d8f", "#8338ec"]);
        selectedStudents.forEach((student, studentIndex) => {
            selectedMetrics.forEach(metric => {
                if (dataset[student] && dataset[student][metric]) {
                    const data = dataset[student][metric];
                    const normalizedData = data.map(d => {
                        return {
                            time: (d.timestamp - examStart) / 60,
                            value: normalizeMetricValue(d.value, metric)
                        };
                    });
                    const line = d3.line()
                        .x(d => xScale(d.time))
                        .y(d => yScale(d.value))
                        .curve(d3.curveMonotoneX);
                    vizGroup.append("path")
                        .datum(normalizedData)
                        .attr("class", `line ${metric.toLowerCase()}-line`)
                        .attr("d", line)
                        .attr("stroke", colorScale(metric))
                        .style("stroke-width", 2)
                        .style("stroke-dasharray", studentIndex > 0 ? "4 2" : "none")
                        .style("opacity", 0.8);
                }
            });
        });
        const legend = vizGroup.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vizWidth - 150}, 20)`);
        legend.selectAll("*").remove();
        legend.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .attr("font-weight", "bold")
            .text("Metrics");
        selectedMetrics.forEach((metric, i) => {
            const legendItem = legend.append("g")
                .attr("transform", `translate(0, ${i * 25})`);
            legendItem.append("line")
                .attr("x1", 0)
                .attr("y1", 10)
                .attr("x2", 20)
                .attr("y2", 10)
                .attr("stroke", colorScale(metric))
                .attr("stroke-width", 2);
            legendItem.append("text")
                .attr("x", 30)
                .attr("y", 15)
                .text(getMetricFullName(metric));
        });
        if (selectedStudents.length > 1) {
            const studentLegend = vizGroup.append("g")
                .attr("class", "student-legend")
                .attr("transform", `translate(${vizWidth - 150}, ${selectedMetrics.length * 25 + 40})`);
            studentLegend.append("text")
                .attr("x", 0)
                .attr("y", -10)
                .attr("font-weight", "bold")
                .text("Students");
            selectedStudents.forEach((student, i) => {
                const legendItem = studentLegend.append("g")
                    .attr("transform", `translate(0, ${i * 25})`);
                legendItem.append("line")
                    .attr("x1", 0)
                    .attr("y1", 10)
                    .attr("x2", 20)
                    .attr("y2", 10)
                    .attr("stroke", "#000")
                    .attr("stroke-width", 2)
                    .style("stroke-dasharray", i > 0 ? "4 2" : "none");
                legendItem.append("text")
                    .attr("x", 30)
                    .attr("y", 15)
                    .text(student);
            });
        }
        const timeSlider = document.getElementById("time-slider");
        if (timeSlider) {
            timeSlider.max = 100;
            const currentTimePosition = (currentTimeIndex / 100) * examDurationMinutes;
            vizGroup.append("line")
                .attr("class", "current-time-indicator")
                .attr("x1", xScale(currentTimePosition))
                .attr("y1", 0)
                .attr("x2", xScale(currentTimePosition))
                .attr("y2", vizHeight)
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5");
        }
    } else {
        vizGroup.append("text")
            .attr("x", vizWidth / 2)
            .attr("y", vizHeight / 2)
            .attr("text-anchor", "middle")
            .text("Please select students and metrics to display data");
    }
}

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
function updateComparisonVisualization() {
    const comparisonViz = document.getElementById("comparison-visualization");
    if (!comparisonViz) {
        console.error("Comparison visualization container not found");
        return;
    }
    
    // Clear previous content
    comparisonViz.innerHTML = "";
    
    const performanceSelect = document.getElementById("performance-select");
    const xAxisSelect = document.getElementById("x-axis-select");
    const yAxisSelect = document.getElementById("y-axis-select");
    const bubbleSizeSelect = document.getElementById("bubble-size-select");
    
    // If UI elements are missing, exit gracefully
    if (!performanceSelect || !xAxisSelect || !yAxisSelect || !bubbleSizeSelect) {
        comparisonViz.innerHTML = "<p>Comparison visualization controls not found</p>";
        return;
    }
    
    const performanceFilter = performanceSelect.value;
    const xAxisMetric = xAxisSelect.value;
    const yAxisMetric = yAxisSelect.value;
    const bubbleSizeMetric = bubbleSizeSelect.value;
    const dataset = getCurrentDataset();
    
    // Create SVG for comparison visualization
    const svg = d3.select(comparisonViz)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "500px");
    
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
    
    // Create the scatter plot
    const margin = { top: 50, right: 70, bottom: 70, left: 70 };
    const width = comparisonViz.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
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
        radiusScale = d3.scaleLinear()
            .domain([d3.min(sizeValues), d3.max(sizeValues)])
            .range([5, 20]);
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
    
    // Add axis labels
    plotGroup.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text(getMetricDisplayName(xAxisMetric));
    
    plotGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text(getMetricDisplayName(yAxisMetric));
    
    // Add plot title
    svg.append("text")
        .attr("x", comparisonViz.clientWidth / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
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
    
    // Add a legend for grades
    const legend = svg.append("g")
        .attr("class", "grade-legend")
        .attr("transform", `translate(${width + margin.left + 20}, ${margin.top})`);
    
    legend.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("font-weight", "bold")
        .text("Grade");
    
    // Create a gradient for the legend
    const legendGradient = legend.append("defs")
        .append("linearGradient")
        .attr("id", "grade-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
    
    legendGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(100));
    
    legendGradient.append("stop")
        .attr("offset", "33%")
        .attr("stop-color", colorScale(85));
    
    legendGradient.append("stop")
        .attr("offset", "66%")
        .attr("stop-color", colorScale(70));
    
    legendGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(50));
    
    // Draw the gradient rectangle
    legend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 20)
        .attr("height", 120)
        .style("fill", "url(#grade-gradient)");
    
    // Add labels
    legend.append("text")
        .attr("x", 25)
        .attr("y", 0)
        .attr("dominant-baseline", "middle")
        .text("100");
    
    legend.append("text")
        .attr("x", 25)
        .attr("y", 40)
        .attr("dominant-baseline", "middle")
        .text("85");
    
    legend.append("text")
        .attr("x", 25)
        .attr("y", 80)
        .attr("dominant-baseline", "middle")
        .text("70");
    
    legend.append("text")
        .attr("x", 25)
        .attr("y", 120)
        .attr("dominant-baseline", "middle")
        .text("50");
    
    // Add a legend for bubble size if not constant
    if (bubbleSizeMetric !== "constant") {
        const sizeLegend = svg.append("g")
            .attr("class", "size-legend")
            .attr("transform", `translate(${width + margin.left + 20}, ${margin.top + 170})`);
        
        sizeLegend.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .attr("font-weight", "bold")
            .text(getMetricDisplayName(bubbleSizeMetric));
        
        // Add circles for size reference
        const sizeValues = filteredStudents.map(s => studentMetrics[s][bubbleSizeMetric]);
        const minSize = d3.min(sizeValues);
        const maxSize = d3.max(sizeValues);
        const midSize = (minSize + maxSize) / 2;
        
        const sizePoints = [minSize, midSize, maxSize];
        
        sizePoints.forEach((size, i) => {
            sizeLegend.append("circle")
                .attr("cx", 10)
                .attr("cy", i * 40 + 20)
                .attr("r", radiusScale(size))
                .attr("fill", "#888")
                .attr("stroke", "#444");
            
            sizeLegend.append("text")
                .attr("x", 30)
                .attr("y", i * 40 + 20)
                .attr("dominant-baseline", "middle")
                .text(formatMetricValue(size, bubbleSizeMetric.replace('avg', '').replace('variability', '').replace('max', '')));
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
    
    // Create main grid container
    const grid = container.append("div")
        .attr("class", "recovery-grid")
        .style("display", "grid")
        .style("grid-template-columns", "1fr 1fr")
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
    
    // Create bar chart for recovery visualization
    const chartDiv = grid.append("div");
    
    // Setup SVG for bar chart
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    const svg = chartDiv.append("svg")
        .attr("width", "100%")
        .attr("height", "300px")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Format data for the chart
    const chartData = [
        { group: "High Performers", value: recoveryAnalysis.highPerformers.averageRecoveryTimeMinutes, color: "#a8dadc" },
        { group: "Mid Performers", value: recoveryAnalysis.midPerformers.averageRecoveryTimeMinutes, color: "#f4a261" },
        { group: "Low Performers", value: recoveryAnalysis.lowPerformers.averageRecoveryTimeMinutes, color: "#e63946" }
    ];
    
    // Create X axis
    const x = d3.scaleBand()
        .range([0, width])
        .domain(chartData.map(d => d.group))
        .padding(0.2);
        
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    
    // Add X axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
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
        .attr("y", -45)
        .attr("text-anchor", "middle")
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
        .text(d => d.value.toFixed(1));
    
    // Add individual student recovery time section
    const studentSection = container.append("div")
        .attr("class", "student-recovery-section")
        .style("margin-top", "30px");
    
    studentSection.append("h4")
        .text("Individual Student Recovery Patterns");
    
    // Create a table for individual student data
    const studentTable = studentSection.append("table")
        .attr("class", "student-table")
        .style("width", "100%")
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
}
