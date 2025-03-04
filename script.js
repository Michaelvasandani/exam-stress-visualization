document.addEventListener("DOMContentLoaded", function () {
    // Path to the single consolidated JSON file
    const dataFilePath = "json/all_data.json";
    
    const availableMetrics = ["EDA", "HR", "TEMP"]; // Physiological signals
  
    // Student Grades
    const studentGrades = {
      S1: 182,
      S2: 180,
      S3: 188,
      S4: 149,
      S5: 157,
      S6: 175,
      S7: 110,
      S8: 184,
      S9: 126,
      S10: 116,
    };
  
    // Store the entire dataset once loaded
    let fullDataset = null;
  
    const margin = { top: 40, right: 30, bottom: 80, left: 60 },
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;
  
    const svg = d3
      .select("#chart")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);
  
    const chartGroup = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const xScale = d3.scaleTime().range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);
  
    const line = d3
      .line()
      .x((d) => xScale(d.timestamp * 1000)) // Convert Unix timestamp to milliseconds
      .y((d) => yScale(d.value));
  
    // Dropdowns for Student & Metric Selection
    const studentSelect = d3.select("#student-select").html("");
    for (let i = 1; i <= 10; i++) {
      studentSelect.append("option").attr("value", `S${i}`).text(`Student ${i}`);
    }
  
    const metricSelect = d3.select("#metric-select").html("");
    availableMetrics.forEach((metric) => {
      metricSelect.append("option").attr("value", metric).text(metric);
    });
  
    // Display Stats Section
    const statsDiv = d3.select("body").append("div").attr("id", "stats");
  
    // Load the consolidated data file once
    d3.json(dataFilePath).then(function(consolidatedData) {
      console.log("Loaded consolidated data");
      fullDataset = consolidatedData;
      
      // Display initial data
      updateChart();
    }).catch(error => {
      console.error("Error loading consolidated data:", error);
    });
  
    function displayData(student, metric) {
      // Use the data from our already-loaded dataset
      if (!fullDataset || !fullDataset[student] || !fullDataset[student][metric]) {
        console.error(`No data available for ${student}, ${metric}`);
        return;
      }
      
      const data = fullDataset[student][metric];
      console.log(`Displaying data for: ${student}, ${metric}`);
      console.log("Sample data points:", data.slice(0, 5));
  
      if (data.length === 0) {
        console.error("No valid data for this student/metric combination.");
        return;
      }
  
      // Compute Stats: Average & Peak
      const avgValue = d3.mean(data, (d) => d.value).toFixed(3);
      const peakValue = d3.max(data, (d) => d.value).toFixed(3);
      const studentGrade = studentGrades[student];
      const gradePercentage = ((studentGrade / 200) * 100).toFixed(1) + "%";
  
      // Update Stats Section
      statsDiv.html(`
        <h3>Statistics for Student ${student} (${metric})</h3>
        <p><strong>Average ${metric}:</strong> ${avgValue}</p>
        <p><strong>Peak ${metric}:</strong> ${peakValue}</p>
        <p><strong>Final Exam Grade:</strong> ${studentGrade} / 200 (${gradePercentage})</p>
      `);
  
      // Fix X-axis: Convert to Local Time Format
      xScale.domain(d3.extent(data, (d) => new Date(d.timestamp * 1000)));
      yScale.domain([
        d3.min(data, (d) => d.value),
        d3.max(data, (d) => d.value),
      ]);
  
      // Clear previous chart elements
      chartGroup.selectAll("*").remove();
  
      // Format X-axis
      const xAxis = d3
        .axisBottom(xScale)
        .ticks(d3.timeHour.every(1))
        .tickFormat(d3.timeFormat("%I:%M %p"));
  
      // Add Axes
      chartGroup
        .append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);
  
      chartGroup.append("g").call(d3.axisLeft(yScale));
  
      // Draw Line
      chartGroup
        .append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-width", 2)
        .attr("d", line);
  
      console.log("Line chart updated successfully.");
    }
  
    // Event Listener for Student & Metric Selection
    function updateChart() {
      if (!fullDataset) {
        console.log("Dataset not yet loaded, waiting...");
        return;
      }
      
      let selectedStudent = document.getElementById("student-select").value;
      let selectedMetric = document.getElementById("metric-select").value;
      displayData(selectedStudent, selectedMetric);
    }
  
    studentSelect.on("change", updateChart);
    metricSelect.on("change", updateChart);
  });