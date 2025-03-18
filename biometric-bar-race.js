/**
 * Biometric Bar Chart Race - Advanced fluid animation
 * This file handles the smooth animation of biometric data for student exams
 */

// Global state to maintain animation
let animationState = {
    playing: false,
    animationId: null,
    startTime: null,
    currentTime: 0,
    duration: 30000, // 30 seconds for full animation (adjustable)
    data: {},
    processedData: {},
    currentMetric: 'EDA',
    currentExam: 'Midterm_1'
  };
  
  // Initialize variables for DOM elements
  let svgContainer = null;
  let timeSlider = null;
  let playButton = null;
  let resetButton = null;
  let metricSelector = null;
  let examSelector = null;
  
  // Mapping of display units for different metrics
  const metricUnits = {
    'EDA': 'μS',
    'HR': 'bpm',
    'BVP': 'mV',
    'TEMP': '°C'
  };
  
  // Default color settings for students with increased contrast
  const studentColors = {
    'S1': '#FF6B6B', // Coral red
    'S2': '#4ECDC4', // Turquoise
    'S3': '#FFD166', // Yellow
    'S4': '#6A0572', // Purple
    'S5': '#1A936F', // Green
    'S6': '#3D5A80', // Blue
    'S7': '#FE4A49', // Red
    'S8': '#2AB7CA', // Cyan
    'S9': '#F79D65', // Orange
    'S10': '#00A6FB'  // Light blue
  };
  
  // Critical thresholds for each metric
  const criticalThresholds = {
    'EDA': 0.8,
    'HR': 90,
    'BVP': 2.0,
    'TEMP': 32.5
  };
  
  // Formatter for metric values
  function formatMetricValue(value, metric) {
    if (value === undefined || value === null) return 'N/A';
    
    switch (metric) {
      case 'EDA': return value.toFixed(3) + ' ' + metricUnits.EDA;
      case 'HR': return Math.round(value) + ' ' + metricUnits.HR;
      case 'BVP': return value.toFixed(2) + ' ' + metricUnits.BVP;
      case 'TEMP': return value.toFixed(1) + ' ' + metricUnits.TEMP;
      default: return value.toFixed(2);
    }
  }
  
  // Convert timestamp-based data to a format usable for animation
  function processRawData(rawData) {
    console.log('Processing raw data for animation');
    
    // Resulting data structure
    const processedData = {};
    
    // Get all students and metrics
    const students = Object.keys(rawData);
    const metrics = ['EDA', 'HR', 'BVP', 'TEMP'].filter(metric => 
      students.some(student => rawData[student] && rawData[student][metric])
    );
    
    // For each student and metric
    students.forEach(student => {
      processedData[student] = {
        performance: 'Medium', // Default performance level
        grade: Math.floor(Math.random() * 30) + 70, // Random grade between 70-100
        data: {}
      };
      
      metrics.forEach(metric => {
        if (!rawData[student] || !rawData[student][metric]) return;
        
        const metricData = rawData[student][metric];
        if (!Array.isArray(metricData)) return;
        
        // Sample data at regular intervals for smooth animation
        const totalPoints = 100; // Number of points for smooth animation
        processedData[student].data[metric] = [];
        
        // Find timespan of data
        const startTime = metricData[0]?.timestamp || 0;
        const endTime = metricData[metricData.length - 1]?.timestamp || 0;
        const timeSpan = endTime - startTime;
        
        // Create sample points
        for (let i = 0; i < totalPoints; i++) {
          const progress = i / (totalPoints - 1);
          const targetTime = startTime + progress * timeSpan;
          
          // Find closest data points
          let beforeIndex = 0;
          let afterIndex = metricData.length - 1;
          
          for (let j = 0; j < metricData.length; j++) {
            if (metricData[j].timestamp <= targetTime) {
              beforeIndex = j;
            }
            if (metricData[j].timestamp >= targetTime && j < afterIndex) {
              afterIndex = j;
            }
          }
          
          // Interpolate value
          let value;
          if (beforeIndex === afterIndex) {
            value = metricData[beforeIndex].value;
          } else {
            const beforeTime = metricData[beforeIndex].timestamp;
            const afterTime = metricData[afterIndex].timestamp;
            const timeRatio = (targetTime - beforeTime) / (afterTime - beforeTime);
            
            const beforeValue = metricData[beforeIndex].value;
            const afterValue = metricData[afterIndex].value;
            value = beforeValue + (afterValue - beforeValue) * timeRatio;
          }
          
          // Add to processed data
          processedData[student].data[metric].push({
            time: progress,
            value: value
          });
        }
        
        // Analyze performance based on variance and peaks
        const values = processedData[student].data[metric].map(d => d.value);
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
        
        // Set performance based on variance (high variance = high stress = lower performance)
        // This is a simplistic approach - real analysis would be more nuanced
        const metricVarianceThreshold = metric === 'EDA' ? 0.0001 : 
                                       metric === 'HR' ? 25 : 
                                       metric === 'BVP' ? 0.1 : 0.5;
                                       
        if (variance > metricVarianceThreshold * 2) {
          processedData[student].performance = 'Low';
        } else if (variance > metricVarianceThreshold) {
          processedData[student].performance = 'Medium';
        } else {
          processedData[student].performance = 'High';
        }
      });
    });
    
    return processedData;
  }
  
  // Get data at specific animation progress point (0-1)
  function getDataAtProgress(progress) {
    const result = [];
    const students = Object.keys(animationState.processedData);
    
    students.forEach(student => {
      const studentData = animationState.processedData[student];
      if (!studentData.data[animationState.currentMetric]) return;
      
      const metricData = studentData.data[animationState.currentMetric];
      if (!metricData || metricData.length === 0) return;
      
      // Find the right data point based on progress
      const index = Math.min(
        Math.floor(progress * metricData.length), 
        metricData.length - 1
      );
      
      // If we're between points, interpolate
      let value;
      if (index === metricData.length - 1 || progress === 0) {
        value = metricData[index].value;
      } else {
        const nextIndex = index + 1;
        const indexProgress = (progress * metricData.length) - index;
        value = metricData[index].value + 
                (metricData[nextIndex].value - metricData[index].value) * indexProgress;
      }
      
      result.push({
        student: student,
        value: value,
        performance: studentData.performance,
        grade: studentData.grade,
        isAboveThreshold: value >= criticalThresholds[animationState.currentMetric]
      });
    });
    
    // Sort by value in descending order
    return result.sort((a, b) => b.value - a.value);
  }
  
  // Initialize the visualization
  function initializeVisualization() {
    console.log('Initializing bar chart race visualization');
    
    // Get DOM elements
    svgContainer = document.getElementById('bar-race-container');
    timeSlider = document.getElementById('time-slider');
    playButton = document.getElementById('play-button');
    resetButton = document.getElementById('reset-button');
    metricSelector = document.getElementById('bar-race-metric');
    examSelector = document.getElementById('bar-race-exam');
    
    // Set initial values
    animationState.currentMetric = metricSelector.value;
    animationState.currentExam = examSelector.value;
    
    // Setup event listeners
    playButton.addEventListener('click', togglePlayPause);
    resetButton.addEventListener('click', resetAnimation);
    timeSlider.addEventListener('input', handleSliderChange);
    metricSelector.addEventListener('change', handleMetricChange);
    examSelector.addEventListener('change', handleExamChange);
    
    // Create chart
    createChart();
    
    // Initial render
    renderChart(0);
  }
  
  // Create the initial chart structure
  function createChart() {
    // Clear container
    svgContainer.innerHTML = '';
    
    // Chart dimensions
    const margin = {top: 50, right: 150, bottom: 50, left: 100};
    const width = svgContainer.clientWidth - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(svgContainer)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Add title
    svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', width / 2)
      .attr('y', -25)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold');
    
    // Add time indicator
    svg.append('text')
      .attr('class', 'time-indicator')
      .attr('x', width - 10)
      .attr('y', -25)
      .attr('text-anchor', 'end')
      .style('font-size', '16px');
    
    // Add axes groups
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`);
    
    svg.append('g')
      .attr('class', 'y-axis');
    
    // Add x-axis label
    svg.append('text')
      .attr('class', 'x-axis-label')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + 35);
    
    // Add threshold line group
    svg.append('g')
      .attr('class', 'threshold-line');
      
    // Create color scale based on performance
    const colorScale = d3.scaleOrdinal()
      .domain(['Low', 'Medium', 'High'])
      .range(['#e63946', '#457b9d', '#2a9d8f']);
    
    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width + 20}, 20)`);
    
    const legendItems = ['High', 'Medium', 'Low'];
    
    legendItems.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);
      
      legendItem.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', colorScale(item));
      
      legendItem.append('text')
        .attr('x', 25)
        .attr('y', 12)
        .attr('dy', '.15em')
        .text(`${item} Performance`);
    });
    
    // Store references
    animationState.svg = svg;
    animationState.width = width;
    animationState.height = height;
    animationState.colorScale = colorScale;
  }
  
  // Render the chart at a specific progress point (0-1)
  function renderChart(progress) {
    const svg = animationState.svg;
    const width = animationState.width;
    const height = animationState.height;
    const colorScale = animationState.colorScale;
    
    // Get data for the current progress
    const data = getDataAtProgress(progress);
    if (!data || data.length === 0) {
      console.warn('No data available for rendering');
      return;
    }
    
    // Update title
    svg.select('.chart-title')
      .text(`${animationState.currentExam.replace('_', ' ')}: ${animationState.currentMetric} Levels`);
    
    // Update x-axis label
    svg.select('.x-axis-label')
      .text(`${animationState.currentMetric} (${metricUnits[animationState.currentMetric]})`);
    
    // Update time indicator - convert progress to percentage
    const progressPercent = Math.round(progress * 100);
    svg.select('.time-indicator')
      .text(`${progressPercent}% Complete`);
    
    // Set up scales
    const xMax = Math.max(...data.map(d => d.value)) * 1.1; // 10% padding
    
    const xScale = d3.scaleLinear()
      .domain([0, xMax])
      .range([0, width]);
    
    const yScale = d3.scaleBand()
      .domain(data.map(d => d.student))
      .range([0, height])
      .padding(0.2);
    
    // Update axes
    svg.select('.x-axis')
      .transition()
      .duration(100)
      .call(d3.axisBottom(xScale));
    
    svg.select('.y-axis')
      .transition()
      .duration(100)
      .call(d3.axisLeft(yScale));
    
    // Update threshold line if available
    const thresholdValue = criticalThresholds[animationState.currentMetric];
    const thresholdGroup = svg.select('.threshold-line');
    thresholdGroup.selectAll('*').remove();
    
    if (thresholdValue && thresholdValue <= xMax) {
      thresholdGroup.append('line')
        .attr('x1', xScale(thresholdValue))
        .attr('y1', 0)
        .attr('x2', xScale(thresholdValue))
        .attr('y2', height)
        .attr('stroke', '#e63946')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');
        
      thresholdGroup.append('text')
        .attr('x', xScale(thresholdValue) + 5)
        .attr('y', 10)
        .attr('fill', '#e63946')
        .text(`Threshold: ${thresholdValue}`);
    }
    
    // UPDATE BARS
    // Bind data
    const bars = svg.selectAll('.bar')
      .data(data, d => d.student);
    
    // Enter new bars
    bars.enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('y', d => yScale(d.student))
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', 0)
      .attr('fill', d => d.isAboveThreshold ? '#e63946' : colorScale(d.performance))
      .attr('rx', 4) // Rounded corners
      .attr('ry', 4)
      .transition()
      .duration(100)
      .attr('width', d => xScale(d.value));
    
    // Update existing bars
    bars.transition()
      .duration(100)
      .attr('y', d => yScale(d.student))
      .attr('width', d => xScale(d.value))
      .attr('fill', d => d.isAboveThreshold ? '#e63946' : colorScale(d.performance));
    
    // Exit old bars
    bars.exit()
      .transition()
      .duration(100)
      .attr('width', 0)
      .remove();
    
    // UPDATE VALUE LABELS
    // Bind data
    const valueLabels = svg.selectAll('.value-label')
      .data(data, d => d.student);
    
    // Enter new labels
    valueLabels.enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', d => xScale(d.value) + 5)
      .attr('y', d => yScale(d.student) + yScale.bandwidth() / 2)
      .attr('dy', '.35em')
      .attr('opacity', 0)
      .text(d => formatMetricValue(d.value, animationState.currentMetric))
      .transition()
      .duration(100)
      .attr('opacity', 1);
    
    // Update existing labels
    valueLabels.transition()
      .duration(100)
      .attr('x', d => xScale(d.value) + 5)
      .attr('y', d => yScale(d.student) + yScale.bandwidth() / 2)
      .text(d => formatMetricValue(d.value, animationState.currentMetric));
    
    // Exit old labels
    valueLabels.exit()
      .transition()
      .duration(100)
      .attr('opacity', 0)
      .remove();
    
    // UPDATE STUDENT LABELS
    // Bind data
    const studentLabels = svg.selectAll('.student-label')
      .data(data, d => d.student);
    
    // Enter new student labels
    studentLabels.enter()
      .append('text')
      .attr('class', 'student-label')
      .attr('x', -5)
      .attr('y', d => yScale(d.student) + yScale.bandwidth() / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'end')
      .attr('opacity', 0)
      .text(d => `${d.student} (${d.grade})`)
      .transition()
      .duration(100)
      .attr('opacity', 1);
    
    // Update existing student labels
    studentLabels.transition()
      .duration(100)
      .attr('y', d => yScale(d.student) + yScale.bandwidth() / 2);
    
    // Exit old student labels
    studentLabels.exit()
      .transition()
      .duration(100)
      .attr('opacity', 0)
      .remove();
    
    // Update slider position
    timeSlider.value = Math.round(progress * (timeSlider.max - timeSlider.min)) + Number(timeSlider.min);
  }
  
  // Main animation loop using requestAnimationFrame
  function animate(timestamp) {
    if (!animationState.playing) return;
    
    if (!animationState.startTime) {
      animationState.startTime = timestamp;
    }
    
    // Calculate progress
    const elapsed = timestamp - animationState.startTime;
    const progress = Math.min(elapsed / animationState.duration, 1);
    
    // Render at current progress
    renderChart(progress);
    
    // Update slider
    timeSlider.value = Math.round(progress * (timeSlider.max - timeSlider.min)) + Number(timeSlider.min);
    
    // Continue or end animation
    if (progress < 1) {
      animationState.animationId = requestAnimationFrame(animate);
    } else {
      // Loop the animation
      animationState.startTime = null;
      animationState.animationId = requestAnimationFrame(animate);
    }
  }
  
  // Toggle play/pause
  function togglePlayPause() {
    if (animationState.playing) {
      // Pause animation
      animationState.playing = false;
      if (animationState.animationId) {
        cancelAnimationFrame(animationState.animationId);
        animationState.animationId = null;
      }
      playButton.textContent = 'Play';
      playButton.style.backgroundColor = '#4CAF50';
    } else {
      // Start animation
      animationState.playing = true;
      playButton.textContent = 'Pause';
      playButton.style.backgroundColor = '#e63946';
      
      // Calculate start time based on current progress
      const currentProgress = Number(timeSlider.value) / Number(timeSlider.max);
      animationState.startTime = performance.now() - (currentProgress * animationState.duration);
      
      // Start animation loop
      animationState.animationId = requestAnimationFrame(animate);
    }
  }
  
  // Reset animation
  function resetAnimation() {
    // Stop animation if playing
    if (animationState.playing) {
      animationState.playing = false;
      if (animationState.animationId) {
        cancelAnimationFrame(animationState.animationId);
        animationState.animationId = null;
      }
      playButton.textContent = 'Play';
      playButton.style.backgroundColor = '#4CAF50';
    }
    
    // Reset time slider
    timeSlider.value = timeSlider.min;
    
    // Reset animation state
    animationState.startTime = null;
    
    // Render at beginning
    renderChart(0);
  }
  
  // Handle time slider change
  function handleSliderChange() {
    // Pause animation if playing
    if (animationState.playing) {
      animationState.playing = false;
      if (animationState.animationId) {
        cancelAnimationFrame(animationState.animationId);
        animationState.animationId = null;
      }
      playButton.textContent = 'Play';
      playButton.style.backgroundColor = '#4CAF50';
    }
    
    // Get progress from slider
    const progress = Number(timeSlider.value) / Number(timeSlider.max);
    
    // Render at selected progress
    renderChart(progress);
  }
  
  // Handle metric change
  function handleMetricChange() {
    // Update current metric
    animationState.currentMetric = metricSelector.value;
    
    // Render with current progress
    const progress = Number(timeSlider.value) / Number(timeSlider.max);
    renderChart(progress);
  }
  
  // Handle exam change
  function handleExamChange() {
    // Update current exam
    animationState.currentExam = examSelector.value;
    
    // Load data for the new exam (in a real app)
    // For now, we'll just re-render
    
    // Reset animation
    resetAnimation();
  }
  
  // Convert raw JSON data to a more suitable format
  function convertRawData(jsonData) {
    const result = {};
    
    // Process each student
    for (const studentId in jsonData) {
      if (!jsonData.hasOwnProperty(studentId)) continue;
      
      result[studentId] = {};
      
      // Process each metric
      for (const metric in jsonData[studentId]) {
        if (!jsonData[studentId].hasOwnProperty(metric)) continue;
        
        // Copy metric data directly
        result[studentId][metric] = jsonData[studentId][metric];
      }
    }
    
    return result;
  }
  
  // Create a fallback dataset when no real data is available
  function createFallbackData() {
    const students = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'];
    const result = {};
    
    // For each student
    students.forEach(student => {
      result[student] = {};
      
      // Create EDA data
      result[student].EDA = [];
      let edaBase = 0.02 + Math.random() * 0.03; // Random starting point
      
      // Create HR data
      result[student].HR = [];
      let hrBase = 70 + Math.random() * 20; // 70-90 bpm base
      
      // Create BVP data
      result[student].BVP = [];
      let bvpBase = 1 + Math.random() * 0.5; // Random base
      
      // Create TEMP data
      result[student].TEMP = [];
      let tempBase = 31 + Math.random(); // Around 31-32°C
      
      // Create 300 data points (5 minutes of data at 1Hz)
      const startTime = 1539435366.0;
      for (let i = 0; i < 300; i++) {
        const timestamp = startTime + i;
        const progress = i / 299; // 0-1
        
        // Calculate stress pattern - higher in the middle of the exam
        const stressPattern = Math.sin(progress * Math.PI) * 0.6;
        
        // Add some randomness to values
        const edaRandom = (Math.random() - 0.5) * 0.005;
        const hrRandom = (Math.random() - 0.5) * 3;
        const bvpRandom = (Math.random() - 0.5) * 0.1;
        const tempRandom = (Math.random() - 0.5) * 0.1;
        
        // Calculate values with stress pattern
        const edaValue = edaBase * (1 + stressPattern) + edaRandom;
        const hrValue = hrBase * (1 + stressPattern * 0.3) + hrRandom;
        const bvpValue = bvpBase + bvpRandom + (stressPattern * 0.2);
        const tempValue = tempBase + tempRandom + (stressPattern * 0.3);
        
        // Add to arrays
        result[student].EDA.push({ timestamp, value: edaValue });
        result[student].HR.push({ timestamp, value: hrValue });
        result[student].BVP.push({ timestamp, value: bvpValue });
        result[student].TEMP.push({ timestamp, value: tempValue });
      }
    });
    
    return result;
  }
  
  // Load data and initialize the visualization
  async function loadDataAndInitialize() {
    // Show loading indicator
    svgContainer = document.getElementById('bar-race-container');
    svgContainer.innerHTML = '<div class="loading">Loading visualization</div>';
    
    try {
      // Try to load data from a global variable or API
      // For now, create fallback data
      animationState.data = createFallbackData();
      
      // Process data for animation
      animationState.processedData = processRawData(animationState.data);
      
      // Initialize the visualization
      initializeVisualization();
      
      console.log('Bar chart race initialized successfully');
    } catch (error) {
      console.error('Error initializing visualization:', error);
      svgContainer.innerHTML = `
        <div class="error">
          <h3>Visualization Error</h3>
          <p>Failed to initialize the visualization. Please reload the page and try again.</p>
          <p>Technical details: ${error.message}</p>
        </div>
      `;
    }
  }
  
  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', loadDataAndInitialize);
  
  // Make functions available in the global scope
  window.updateBarRaceVisualization = () => {
    const progress = Number(timeSlider.value) / Number(timeSlider.max);
    renderChart(progress);
  };
  
  window.startBarRaceAnimation = togglePlayPause;
  window.resetBarRaceAnimation = resetAnimation;