// Box Plot Comparison Visualization
// This file manages the box plot visualization for comparing exam sessions

// Global variables
let allData = {};
let currentMetric = "HR";
let timeRange = [0, 180]; // [min, max] in minutes
const examTypes = ["Midterm 1", "Midterm 2", "Final"];
let boxPlotSvg = null;

// Wait for DOM to be loaded
document.addEventListener("DOMContentLoaded", function () {
  // Initialize visualization
  initializeControls();
  loadData();
});

// Initialize UI controls
function initializeControls() {
  // Metric selector event listener
  const metricSelector = document.getElementById("metric-selector");
  if (metricSelector) {
    metricSelector.addEventListener("change", function () {
      currentMetric = this.value;
      updateVisualization();
    });
  }

  // Time range slider event listener
  const timeRangeSlider = document.getElementById("time-range");
  if (timeRangeSlider) {
    timeRangeSlider.addEventListener("input", function () {
      const maxTime = parseInt(this.value);
      timeRange = [0, maxTime];
      updateTimeDisplay();
      updateVisualization();
    });
  }

  // Initial display update
  updateTimeDisplay();
}

// Update time display values
function updateTimeDisplay() {
  document.getElementById(
    "time-range-value"
  ).textContent = `${timeRange[0]} - ${timeRange[1]}`;
}

// Load data from S3 buckets
function loadData() {
  console.log("Loading data from S3 buckets...");

  // Use the S3 bucket URL as provided
  const S3_BASE_URL = "https://duckbuckets.s3.amazonaws.com";

  // Initialize allData structure
  allData = {
    "Midterm 1": {},
    "Midterm 2": {},
    Final: {},
  };

  // Define metrics
  const metrics = ["HR", "EDA", "TEMP", "BVP", "IBI"];

  // Load Midterm 1 data
  d3.json(`${S3_BASE_URL}/Midterm_1.json`)
    .then(function (data) {
      console.log("Successfully loaded Midterm 1 data from S3");
      processJsonData(data, "Midterm 1", metrics);
      updateVisualization(); // Update visualization when data is loaded
    })
    .catch(function (error) {
      console.error("Error loading Midterm 1 data from S3:", error);
      document.getElementById(
        "visualization-container"
      ).innerHTML = `<div class="error">Failed to load Midterm 1 data from S3. Please check the console for details.</div>`;
    });

  // Load Midterm 2 data
  d3.json(`${S3_BASE_URL}/Midterm_2.json`)
    .then(function (data) {
      console.log("Successfully loaded Midterm 2 data from S3");
      processJsonData(data, "Midterm 2", metrics);
      updateVisualization(); // Update visualization when data is loaded
    })
    .catch(function (error) {
      console.error("Error loading Midterm 2 data from S3:", error);
    });

  // Load Final data
  d3.json(`${S3_BASE_URL}/Final.json`)
    .then(function (data) {
      console.log("Successfully loaded Final data from S3");
      processJsonData(data, "Final", metrics);
      updateVisualization(); // Update visualization when data is loaded
    })
    .catch(function (error) {
      console.error("Error loading Final data from S3:", error);
    });

  // Create visualization container - will update as data loads
  createVisualization();
}

// Process JSON data into the format needed for box plots
function processJsonData(examData, examType, metrics) {
  if (!examData) {
    console.log(`No data for ${examType}`);
    return;
  }

  // Get list of students
  const students = Object.keys(examData);
  console.log(`Processing ${examType} data for ${students.length} students`);

  // Initialize metric objects
  metrics.forEach((metric) => {
    allData[examType][metric] = {};
  });

  // Process each student's data
  students.forEach((student) => {
    // For each metric
    metrics.forEach((metric) => {
      if (examData[student] && examData[student][metric]) {
        // Format the time series data appropriately
        const timeSeriesData = examData[student][metric].map((d) => ({
          time: +d.time / 60, // Convert seconds to minutes
          value: +d.value,
        }));

        // Store in our structure
        allData[examType][metric][student] = timeSeriesData;
      }
    });
  });
}

// Create the box plot visualization
function createVisualization() {
  // Remove loading message
  const container = document.getElementById("visualization-container");
  container.innerHTML = "";

  // Create SVG element for the box plots
  const width = container.clientWidth - 40;
  const height = container.clientHeight - 40;

  boxPlotSvg = d3
    .select("#visualization-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Add tooltip div
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Update with current data
  updateVisualization();

  // Add window resize handler
  window.addEventListener("resize", function () {
    // Update SVG dimensions on window resize
    const newWidth = container.clientWidth - 40;
    const newHeight = container.clientHeight - 40;

    boxPlotSvg.attr("width", newWidth).attr("height", newHeight);

    updateVisualization();
  });
}

// Update the visualization based on current selections
function updateVisualization() {
  if (!boxPlotSvg) return;

  // Clear previous visualization
  boxPlotSvg.selectAll("*").remove();

  // Get container dimensions
  const width = boxPlotSvg.attr("width");
  const height = boxPlotSvg.attr("height");

  // Set margins
  const margin = { top: 40, right: 50, bottom: 60, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Process data for the current metric
  const boxPlotData = processDataForBoxPlots(currentMetric, timeRange);

  // If no data, show message
  if (boxPlotData.length === 0) {
    boxPlotSvg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "16px")
      .text("No data available for the selected metric and time range.");
    return;
  }

  // Create scales
  const xScale = d3
    .scaleBand()
    .domain(examTypes)
    .range([0, innerWidth])
    .padding(0.4);

  const yMin = d3.min(boxPlotData, (d) => d.min);
  const yMax = d3.max(boxPlotData, (d) => d.max);
  const yPadding = (yMax - yMin) * 0.1;

  const yScale = d3
    .scaleLinear()
    .domain([yMin - yPadding, yMax + yPadding])
    .range([innerHeight, 0]);

  // Create a group for the visualization content
  const g = boxPlotSvg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add X axis
  g.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale))
    .append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .text("Exam Session");

  // Add Y axis
  g.append("g")
    .attr("class", "axis y-axis")
    .call(d3.axisLeft(yScale))
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .text(getMetricLabel(currentMetric));

  // Create box plots
  boxPlotData.forEach((d) => {
    const examType = d.examType;
    const boxX = xScale(examType);
    const boxWidth = xScale.bandwidth();

    // Box (IQR)
    g.append("rect")
      .attr("class", "box")
      .attr("x", boxX)
      .attr("y", yScale(d.q3))
      .attr("width", boxWidth)
      .attr("height", yScale(d.q1) - yScale(d.q3))
      .on("mouseover", function (event) {
        d3.select(this).attr("stroke-width", 2);
        showTooltip(event, {
          title: "Interquartile Range (IQR)",
          values: [
            { label: "25th Percentile (Q1)", value: d.q1.toFixed(2) },
            { label: "Median", value: d.median.toFixed(2) },
            { label: "75th Percentile (Q3)", value: d.q3.toFixed(2) },
            { label: "IQR", value: (d.q3 - d.q1).toFixed(2) },
          ],
        });
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-width", 1.5);
        hideTooltip();
      });

    // Min whisker
    g.append("line")
      .attr("class", "whisker")
      .attr("x1", boxX + boxWidth / 2)
      .attr("x2", boxX + boxWidth / 2)
      .attr("y1", yScale(d.min))
      .attr("y2", yScale(d.q1))
      .on("mouseover", function (event) {
        d3.select(this).attr("stroke-width", 2.5);
        showTooltip(event, {
          title: "Minimum Whisker",
          values: [{ label: "Min Value", value: d.min.toFixed(2) }],
        });
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-width", 1.5);
        hideTooltip();
      });

    // Max whisker
    g.append("line")
      .attr("class", "whisker")
      .attr("x1", boxX + boxWidth / 2)
      .attr("x2", boxX + boxWidth / 2)
      .attr("y1", yScale(d.q3))
      .attr("y2", yScale(d.max))
      .on("mouseover", function (event) {
        d3.select(this).attr("stroke-width", 2.5);
        showTooltip(event, {
          title: "Maximum Whisker",
          values: [{ label: "Max Value", value: d.max.toFixed(2) }],
        });
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-width", 1.5);
        hideTooltip();
      });

    // Min cap
    g.append("line")
      .attr("class", "whisker")
      .attr("x1", boxX + boxWidth * 0.25)
      .attr("x2", boxX + boxWidth * 0.75)
      .attr("y1", yScale(d.min))
      .attr("y2", yScale(d.min));

    // Max cap
    g.append("line")
      .attr("class", "whisker")
      .attr("x1", boxX + boxWidth * 0.25)
      .attr("x2", boxX + boxWidth * 0.75)
      .attr("y1", yScale(d.max))
      .attr("y2", yScale(d.max));

    // Median line
    g.append("line")
      .attr("class", "median")
      .attr("x1", boxX)
      .attr("x2", boxX + boxWidth)
      .attr("y1", yScale(d.median))
      .attr("y2", yScale(d.median))
      .on("mouseover", function (event) {
        d3.select(this).attr("stroke-width", 3);
        showTooltip(event, {
          title: "Median",
          values: [{ label: "Value", value: d.median.toFixed(2) }],
        });
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-width", 2);
        hideTooltip();
      });

    // Outliers
    d.outliers.forEach((outlier) => {
      g.append("circle")
        .attr("class", "outlier")
        .attr("cx", boxX + boxWidth / 2)
        .attr("cy", yScale(outlier))
        .attr("r", 4)
        .on("mouseover", function (event) {
          d3.select(this).attr("r", 6);
          showTooltip(event, {
            title: "Outlier",
            values: [
              { label: "Value", value: outlier.toFixed(2) },
              {
                label: "Type",
                value:
                  outlier > d.q3 + 1.5 * (d.q3 - d.q1)
                    ? "High outlier"
                    : "Low outlier",
              },
            ],
          });
        })
        .on("mouseout", function () {
          d3.select(this).attr("r", 4);
          hideTooltip();
        });
    });
  });

  // Add title
  boxPlotSvg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .text(`${getMetricLabel(currentMetric)} Distribution Across Exam Sessions`);
}

// Process data for box plots
function processDataForBoxPlots(metric, timeRange) {
  const result = [];

  // Process each exam type
  examTypes.forEach((examType) => {
    if (!allData[examType] || !allData[examType][metric]) {
      console.log(`No data found for ${examType} - ${metric}`);
      return;
    }

    // Collect all values within the time range
    let allValues = [];

    Object.keys(allData[examType][metric]).forEach((student) => {
      const studentData = allData[examType][metric][student];

      const filteredData = studentData.filter(
        (d) => d.time >= timeRange[0] && d.time <= timeRange[1]
      );

      allValues = allValues.concat(filteredData.map((d) => d.value));
    });

    // If we have values, calculate box plot stats
    if (allValues.length > 0) {
      // Sort values for percentile calculations
      allValues.sort((a, b) => a - b);

      const q1 = d3.quantile(allValues, 0.25);
      const median = d3.quantile(allValues, 0.5);
      const q3 = d3.quantile(allValues, 0.75);
      const iqr = q3 - q1;

      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      // Determine min, max, and outliers
      const outliers = allValues.filter(
        (d) => d < lowerBound || d > upperBound
      );
      const filteredValues = allValues.filter(
        (d) => d >= lowerBound && d <= upperBound
      );

      const min =
        filteredValues.length > 0 ? d3.min(filteredValues) : d3.min(allValues);
      const max =
        filteredValues.length > 0 ? d3.max(filteredValues) : d3.max(allValues);

      result.push({
        examType,
        min,
        q1,
        median,
        q3,
        max,
        outliers,
      });
    }
  });

  return result;
}

// Get the proper label for a metric
function getMetricLabel(metric) {
  const labels = {
    HR: "Heart Rate (BPM)",
    EDA: "Electrodermal Activity (μS)",
    TEMP: "Temperature (°C)",
    BVP: "Blood Volume Pulse",
    IBI: "Inter-Beat Interval (ms)",
  };

  return labels[metric] || metric;
}

// Show tooltip with information
function showTooltip(event, tooltipData) {
  const tooltip = d3.select(".tooltip");

  // Build tooltip content
  let content = `<strong>${tooltipData.title}</strong><br>`;
  tooltipData.values.forEach((item) => {
    content += `${item.label}: ${item.value}<br>`;
  });

  tooltip
    .html(content)
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 28 + "px")
    .transition()
    .duration(200)
    .style("opacity", 0.9);
}

// Hide tooltip
function hideTooltip() {
  d3.select(".tooltip").transition().duration(500).style("opacity", 0);
}
