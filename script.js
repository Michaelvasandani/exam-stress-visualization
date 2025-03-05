document.addEventListener("DOMContentLoaded", function () {
  // Path to the single consolidated JSON file
  const dataFilePath = "json/all_data.json";
  
  const availableMetrics = {
    "EDA": "Electrodermal Activity (μS)",
    "HR": "Heart Rate (BPM)",
    "TEMP": "Temperature (°C)"
  };

  // Metric units for display
  const metricUnits = {
    "EDA": "μS",
    "HR": "BPM",
    "TEMP": "°C"
  };

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
  let brushEnabled = false;
  let currentStudent = null;
  let currentMetric = null;

  // Create responsive dimensions
  const containerWidth = document.querySelector('.chart-container').clientWidth;
  const containerHeight = document.querySelector('.chart-container').clientHeight;
  
  const margin = { top: 40, right: 50, bottom: 100, left: 70 };
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  // Store original x domain for reset
  let originalXDomain = null;

  // Create SVG and chart group
  const svg = d3
    .select("#chart")
    .attr("width", containerWidth)
    .attr("height", containerHeight);

  const chartGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create scales
  const xScale = d3.scaleTime().range([0, width]);
  const yScale = d3.scaleLinear().range([height, 0]);

  // Create line generator
  const line = d3
    .line()
    .x((d) => xScale(d.timestamp * 1000))
    .y((d) => yScale(d.value))
    .curve(d3.curveMonotoneX);

  // Create area generator
  const area = d3
    .area()
    .x((d) => xScale(d.timestamp * 1000))
    .y0(height)
    .y1((d) => yScale(d.value))
    .curve(d3.curveMonotoneX);

  // Initialize brush
  const brush = d3.brushX()
    .extent([[0, 0], [width, height]])
    .on("end", brushended);

  // Add toggle brush button
  const toggleButton = d3.select('.controls')
    .append('div')
    .attr('class', 'control-group')
    .append('button')
    .attr('class', 'select-styled')
    .attr('id', 'toggle-brush')
    .text('Enable Zoom Selection')
    .on('click', toggleBrush);

  // Add reset zoom button
  const resetButton = d3.select('.controls')
    .append('div')
    .attr('class', 'control-group')
    .append('button')
    .attr('class', 'select-styled')
    .attr('id', 'reset-zoom')
    .text('Reset Zoom')
    .style('display', 'none')
    .on('click', resetZoom);

  // Add report button
  const reportButton = d3.select('.controls')
    .append('div')
    .attr('class', 'control-group')
    .append('button')
    .attr('class', 'select-styled')
    .attr('id', 'generate-report')
    .text('Project Write Up')
    .on('click', generateReport);

  // Add report popup HTML to the document
  document.body.insertAdjacentHTML('beforeend', `
  <div class="report-popup">
    <div class="report-popup-header">
  
      <button class="close-report">&times;</button>
    </div>
    <div class="report-content">
      <div class="report-section" id="project-writeup">
        <h3>Project Writeup</h3>
        <p>
          <strong>What have you done so far?</strong><br><br>
          We have created an interactive visualization dashboard that tracks student’s physiological responses during exams. Our implementation includes a real-time monitoring of electrodermal activity, heart rate and body temperature to provide the viewer with various insights on stress levels from student to student. We have also created an D3.js visualization that allows the viewer to select individual students and specific metrics to customize their current interface. Our visualization is a time- line graph for each metric, with shadings for presentation reasons. We have included tooltips, zoom functionality as well as statistical summaries for each graph to speed up the user’s analysis process.   
          <br><br>
          <strong>What will be the most challenging part of your project to design and why?</strong><br><br>
          The most challenging aspect of the project will be making the title give the user something to look out for while being creative. Therefore, our thought process and getting to this final stage where we are able to immediately captivate the reader in a way, which gives them instantaneous information but also inspires them to conduct their own exploratory analysis. Right now , we are really happy with how the page looks. Perhaps, we could add some additional usability features, but as a prototype it looks quite good. The most challenging bit is definitely the title and then coordinating the visualization in that way. This is definitely the major step we will try and take for the next stage of this project .
        </p>
      </div>
      <div class="report-section" id="student-overview">
        <h3>Student Overview</h3>
        <p>Loading...</p>
      </div>
      <div class="report-section" id="physiological-analysis">
        <h3>Physiological Analysis</h3>
        <p>Loading...</p>
      </div>
      <div class="report-section" id="stress-performance">
        <h3>Stress-Performance Correlation</h3>
        <p>Loading...</p>
      </div>
      <div class="report-section" id="recommendations">
        <h3>Recommendations</h3>
        <p>Loading...</p>
      </div>
    </div>
  </div>
`);
  // Add close button functionality
  document.querySelector('.close-report').addEventListener('click', () => {
    document.querySelector('.report-popup').classList.remove('visible');
  });

  // Populate dropdowns
  const studentSelect = d3.select("#student-select").html("");
  Object.keys(studentGrades).forEach((student) => {
    studentSelect
      .append("option")
      .attr("value", student)
      .text(`Student ${student.substring(1)}`);
  });

  const metricSelect = d3.select("#metric-select").html("");
  Object.entries(availableMetrics).forEach(([value, label]) => {
    metricSelect.append("option").attr("value", value).text(label);
  });

  // Create sample data for initial display
  createSampleData();

  // Handle window resize
  window.addEventListener('resize', debounce(function() {
    updateDimensions();
    updateChart();
  }, 250));

  function updateDimensions() {
    const containerWidth = document.querySelector('.chart-container').clientWidth;
    const containerHeight = document.querySelector('.chart-container').clientHeight;
    
    svg.attr("width", containerWidth)
       .attr("height", containerHeight);
    
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    
    xScale.range([0, width]);
    yScale.range([height, 0]);
    
    brush.extent([[0, 0], [width, height]]);
  }

  function createSampleData() {
    // Create sample data for initial display until real data is loaded
    fullDataset = {};
    
    Object.keys(studentGrades).forEach(student => {
      fullDataset[student] = {};
      Object.keys(availableMetrics).forEach(metric => {
        const data = [];
        const startTime = new Date(2023, 0, 1, 9, 0, 0).getTime() / 1000; // 9:00 AM
        
        for (let i = 0; i < 120; i++) {
          let baseValue;
          switch(metric) {
            case 'HR': baseValue = 70 + Math.random() * 30; break;
            case 'EDA': baseValue = 5 + Math.random() * 10; break;
            case 'TEMP': baseValue = 36 + Math.random() * 1.5; break;
            default: baseValue = 10 + Math.random() * 10;
          }
          
          data.push({
            timestamp: startTime + (i * 60),
            value: baseValue
          });
        }
        
        fullDataset[student][metric] = data;
      });
    });
    
    // Set initial selections
    currentStudent = Object.keys(studentGrades)[0];
    currentMetric = Object.keys(availableMetrics)[0];
    
    // Set dropdown values
    document.getElementById('student-select').value = currentStudent;
    document.getElementById('metric-select').value = currentMetric;
    
    updateChart();
  }

  // Load data and initialize
  d3.json(dataFilePath)
    .then(function (consolidatedData) {
      console.log("Loaded consolidated data");
      fullDataset = consolidatedData;
      updateChart();
    })
    .catch((error) => {
      console.error("Error loading consolidated data:", error);
      // We already have sample data, so we can continue
    });

  function displayData(student, metric) {
    if (!fullDataset || !fullDataset[student] || !fullDataset[student][metric]) {
      console.error(`No data available for ${student}, ${metric}`);
      return;
    }
    
    const data = fullDataset[student][metric];
    console.log(`Displaying data for: ${student}, ${metric}`);

    if (data.length === 0) {
      console.error("No valid data for this student/metric combination.");
      return;
    }

    // Update current selections
    currentStudent = student;
    currentMetric = metric;

    // Update scales
    if (!originalXDomain || !brushEnabled) {
      // Only update the domain if we're not zoomed in
      xScale.domain(d3.extent(data, (d) => new Date(d.timestamp * 1000)));
      originalXDomain = xScale.domain();
    }
    
    yScale.domain([
      d3.min(data, (d) => d.value) * 0.95,
      d3.max(data, (d) => d.value) * 1.05
    ]);

    // Clear previous elements
    chartGroup.selectAll("*").remove();

    // Create a clip path to ensure the chart doesn't overflow
    chartGroup.append("defs")
      .append("clipPath")
      .attr("id", "chart-area-clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("x", 0)
      .attr("y", 0);

    // Create a group for all chart elements that should be clipped
    const chartArea = chartGroup.append("g")
      .attr("clip-path", "url(#chart-area-clip)");

    // Add gradient
    const gradient = chartGroup.append("defs")
      .append("linearGradient")
      .attr("id", "area-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0)
      .attr("y1", yScale(d3.min(data, d => d.value)))
      .attr("x2", 0)
      .attr("y2", yScale(d3.max(data, d => d.value)));

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "var(--primary-color)")
      .attr("stop-opacity", 0.1);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "var(--primary-color)")
      .attr("stop-opacity", 0.4);

    // Add area (inside clip path)
    chartArea.append("path")
      .datum(data)
      .attr("class", "area")
      .attr("d", area)
      .style("fill", "url(#area-gradient)");

    // Add line (inside clip path)
    chartArea.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line);

    // Format axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(d3.timeHour.every(1))
      .tickFormat(d3.timeFormat("%I:%M %p"));

    // Add axes
    chartGroup
      .append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    chartGroup
      .append("g")
      .attr("class", "y axis")
      .call(d3.axisLeft(yScale));

    // Add axis labels
    chartGroup.append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .text("Time");

    chartGroup.append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .text(`${availableMetrics[metric]} (${metricUnits[metric]})`);

    // Add interactive dots (inside clip path)
    const dots = chartArea.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.timestamp * 1000))
      .attr("cy", d => yScale(d.value))
      .attr("r", 3)
      .style("opacity", 0)
      .style("fill", "var(--primary-color)");

    // Add tooltip
    const tooltip = d3.select(".visualization-container")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // Add hover interactions
    dots.on("mouseover", function(event, d) {
      const dot = d3.select(this);
      dot.style("opacity", 1)
         .attr("r", 5);
      
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
      
      const time = new Date(d.timestamp * 1000);
      tooltip.html(
        `Time: ${time.toLocaleTimeString()}<br/>
         Value: ${d.value.toFixed(2)} ${metricUnits[metric]}`
      )
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this)
        .style("opacity", 0)
        .attr("r", 3);
      
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

    // Add brush if enabled (inside clip path)
    if (brushEnabled) {
      chartArea.append("g")
        .attr("class", "brush")
        .call(brush);
    }

    // Update statistics
    updateStats(data, student, metric);
  }

  function updateStats(data, student, metric) {
    // Calculate statistics
    const avgValue = d3.mean(data, d => d.value).toFixed(2);
    const peakValue = d3.max(data, d => d.value);
    const peakTime = new Date(data.find(d => d.value === peakValue).timestamp * 1000);
    const variability = d3.deviation(data, d => d.value).toFixed(2);
    const grade = studentGrades[student];
    const gradePercent = ((grade / 200) * 100).toFixed(1);
    const unit = metricUnits[metric];

    // Update stat cards with explanations
    document.getElementById("avg-stress").textContent = `${avgValue} ${unit}`;
    document.getElementById("avg-stress").title = `The mean ${availableMetrics[metric]} throughout the exam period`;

    document.getElementById("peak-stress-time").textContent = peakTime.toLocaleTimeString();
    document.getElementById("peak-stress-time").title = `The time when the ${availableMetrics[metric]} reached its highest value (${peakValue.toFixed(2)} ${unit})`;

    document.getElementById("stress-variability").textContent = `${variability} ${unit}`;
    document.getElementById("stress-variability").title = `Standard deviation - indicates how much the ${metric} values fluctuate from the average`;

    // Add grade information
    const statsPanel = document.querySelector(".stats-panel");
    if (!document.getElementById("grade-card")) {
      const gradeCard = document.createElement("div");
      gradeCard.id = "grade-card";
      gradeCard.className = "stat-card";
      gradeCard.title = "The student's final score out of 200 points";
      gradeCard.innerHTML = `
        <h3>Final Grade</h3>
        <div class="stat-value">${grade}/200 (${gradePercent}%)</div>
        <div class="stat-description">Exam score</div>
      `;
      statsPanel.appendChild(gradeCard);
    } else {
      const gradeValue = document.querySelector("#grade-card .stat-value");
      gradeValue.textContent = `${grade}/200 (${gradePercent}%)`;
    }
  }

  function toggleBrush() {
    brushEnabled = !brushEnabled;
    toggleButton.text(brushEnabled ? 'Disable Zoom Selection' : 'Enable Zoom Selection');
    resetButton.style('display', brushEnabled ? 'block' : 'none');
    
    // Log the current state for debugging
    console.log(`Brush enabled: ${brushEnabled}`);
    
    updateChart();
  }

  function resetZoom() {
    if (originalXDomain) {
      console.log("Resetting zoom to original domain:", originalXDomain);
      xScale.domain(originalXDomain);
      updateChart();
    }
  }

  function brushended(event) {
    // Only proceed if there's a selection
    if (!event.selection) {
      console.log("No brush selection");
      return;
    }
    
    console.log("Brush selection:", event.selection);
    
    // Store original domain if not stored
    if (!originalXDomain) {
      originalXDomain = xScale.domain();
      console.log("Stored original domain:", originalXDomain);
    }
    
    // Get the selected domain
    const extent = event.selection.map(d => xScale.invert(d));
    console.log("New domain from brush:", extent);
    
    // Update the x-scale domain
    xScale.domain(extent);
    
    // Remove the brush
    chartGroup.select(".brush").call(brush.move, null);
    
    // Show reset button
    resetButton.style('display', 'block');
    
    // Update the chart with the new domain
    updateChart();
  }

  function updateChart() {
    if (!fullDataset) {
      console.log("Dataset not yet loaded, waiting...");
      return;
    }
    
    const selectedStudent = document.getElementById("student-select").value;
    const selectedMetric = document.getElementById("metric-select").value;
    
    // Log for debugging
    console.log(`Updating chart for ${selectedStudent}, ${selectedMetric}`);
    console.log(`Current domain: ${xScale.domain()}`);
    
    displayData(selectedStudent, selectedMetric);
  }

  // New function to generate report
  // function generateReport() {
  //   const selectedStudent = document.getElementById("student-select").value;
  //   const studentId = selectedStudent.substring(1); // Remove the 'S' prefix
  //   const grade = studentGrades[selectedStudent];
  //   const gradePercent = ((grade / 200) * 100).toFixed(1);
    
  //   // Get the data for each metric
  //   const hrData = fullDataset[selectedStudent]['HR'];
  //   const edaData = fullDataset[selectedStudent]['EDA'];
  //   const tempData = fullDataset[selectedStudent]['TEMP'];
    
  //   // Calculate key statistics
  //   const avgHR = d3.mean(hrData, d => d.value).toFixed(2);
  //   const maxHR = d3.max(hrData, d => d.value).toFixed(2);
  //   const avgEDA = d3.mean(edaData, d => d.value).toFixed(2);
  //   const maxEDA = d3.max(edaData, d => d.value).toFixed(2);
  //   const avgTemp = d3.mean(tempData, d => d.value).toFixed(2);
    
  //   // Analyze stress level based on physiological data
  //   const stressLevel = analyzeStressLevel(avgHR, avgEDA, avgTemp);
    
  //   // Compare with other students to provide context
  //   const allStudents = Object.keys(studentGrades);
  //   const allGrades = allStudents.map(s => studentGrades[s]);
  //   const avgGrade = d3.mean(allGrades).toFixed(1);
  //   const classRank = allGrades.sort((a, b) => b - a).indexOf(grade) + 1;
  //   const totalStudents = allStudents.length;
    
  //   // Generate report content
  //   document.querySelector('#student-overview p').innerHTML = `
  //     <p><strong>Student ID:</strong> ${studentId}</p>
  //     <p><strong>Final Grade:</strong> ${grade}/200 (${gradePercent}%)</p>
  //     <p><strong>Class Rank:</strong> ${classRank} out of ${totalStudents}</p>
  //     <p><strong>Class Average:</strong> ${avgGrade}/200</p>
  //   `;
    
  //   document.querySelector('#physiological-analysis p').innerHTML = `
  //     <p><strong>Average Heart Rate:</strong> ${avgHR} BPM (Max: ${maxHR} BPM)</p>
  //     <p><strong>Average EDA:</strong> ${avgEDA} μS (Max: ${maxEDA} μS)</p>
  //     <p><strong>Average Temperature:</strong> ${avgTemp} °C</p>
  //     <p><strong>Overall Stress Level:</strong> ${stressLevel.level}</p>
  //   `;
    
  //   document.querySelector('#stress-performance p').innerHTML = `
  //     <p>${generateStressPerformanceAnalysis(stressLevel.level, gradePercent)}</p>
  //   `;
    
  //   document.querySelector('#recommendations p').innerHTML = `
  //     <p>${generateRecommendations(stressLevel.level, gradePercent)}</p>
  //   `;
    
  //   // Show the popup
  //   document.querySelector('.report-popup').classList.add('visible');
  // }

  function generateReport() {
    // Show only the project writeup section, hide other sections
    document.querySelector('#student-overview').style.display = 'none';
    document.querySelector('#physiological-analysis').style.display = 'none';
    document.querySelector('#stress-performance').style.display = 'none';
    document.querySelector('#recommendations').style.display = 'none';
    
    // Show the popup
    document.querySelector('.report-popup').classList.add('visible');
  }
  
  // Helper function to analyze stress level
  function analyzeStressLevel(heartRate, eda, temp) {
    // Simple algorithm to determine stress level based on physiological metrics
    // In a real application, this would be more sophisticated
    const hrScore = heartRate > 85 ? 3 : (heartRate > 75 ? 2 : 1);
    const edaScore = eda > 8 ? 3 : (eda > 5 ? 2 : 1);
    const tempScore = temp > 37 ? 2 : 1;
    
    const totalScore = hrScore + edaScore + tempScore;
    
    let level = 'Moderate';
    if (totalScore <= 4) level = 'Low';
    if (totalScore >= 7) level = 'High';
    
    return { level, score: totalScore };
  }
  
  // Helper function to generate stress-performance correlation text
  function generateStressPerformanceAnalysis(stressLevel, gradePercent) {
    const gradeNum = parseFloat(gradePercent);
    
    if (stressLevel === 'Low') {
      if (gradeNum >= 80) {
        return "This student demonstrated low stress levels while achieving high performance. This suggests good stress management and strong preparation for the exam.";
      } else if (gradeNum >= 60) {
        return "This student showed low stress levels and achieved moderate performance. They appeared comfortable during the exam but might benefit from more thorough preparation.";
      } else {
        return "Despite low stress levels, this student achieved below-average performance. This suggests that low engagement or inadequate preparation, rather than test anxiety, might be affecting performance.";
      }
    } else if (stressLevel === 'Moderate') {
      if (gradeNum >= 80) {
        return "This student exhibited moderate stress levels while achieving excellent performance. This suggests healthy engagement with the test material and effective stress management.";
      } else if (gradeNum >= 60) {
        return "With moderate stress levels, this student achieved average performance. This represents a typical stress-performance relationship.";
      } else {
        return "This student showed moderate stress levels but achieved below-average performance. Some test anxiety might be impacting their ability to demonstrate knowledge.";
      }
    } else { // High stress
      if (gradeNum >= 80) {
        return "Despite high stress levels, this student achieved excellent performance. While they were successful, they might benefit from stress management techniques to improve their testing experience.";
      } else if (gradeNum >= 60) {
        return "This student experienced high stress while achieving average performance. Their stress might be limiting their ability to perform to their full potential.";
      } else {
        return "High stress levels appear to be significantly impacting this student's performance. They would likely benefit from interventions to address test anxiety.";
      }
    }
  }
  
  // Helper function to generate recommendations
  function generateRecommendations(stressLevel, gradePercent) {
    const gradeNum = parseFloat(gradePercent);
    let recommendations = [];
    
    // Base recommendations on stress level
    if (stressLevel === 'High') {
      recommendations.push("Consider teaching this student stress management techniques such as deep breathing and progressive muscle relaxation.");
      recommendations.push("Provide opportunities for practice tests in similar conditions to build familiarity and reduce anxiety.");
    }
    
    // Base recommendations on grade
    if (gradeNum < 60) {
      recommendations.push("Review fundamental concepts and identify knowledge gaps.");
      recommendations.push("Consider additional tutoring or study resources.");
    } else if (gradeNum < 80) {
      recommendations.push("Focus on targeted practice in specific areas that need improvement.");
    }
    
    // Combine stress and performance recommendations
    if (stressLevel === 'High' && gradeNum < 70) {
      recommendations.push("Consider accommodations that might reduce test anxiety, such as extended time or a quieter testing environment.");
    }
    
    if (stressLevel === 'Low' && gradeNum < 70) {
      recommendations.push("Explore motivation strategies and engagement techniques to increase focus during exams.");
    }
    
    return recommendations.join("<br><br>");
  }

  // Event listeners
  studentSelect.on("change", function() {
    // Reset zoom when changing student
    if (originalXDomain) {
      xScale.domain(originalXDomain);
      originalXDomain = null;
    }
    updateChart();
  });
  
  metricSelect.on("change", function() {
    // Keep zoom when changing metric
    updateChart();
  });
});

// Debounce function
function debounce(func, wait) {
let timeout;
return function(...args) {
  clearTimeout(timeout);
  timeout = setTimeout(() => func.apply(this, args), wait);
};
}