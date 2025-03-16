// This script fixes common issues with the visualization dashboard

document.addEventListener('DOMContentLoaded', function() {
  // Add active class to navigation based on scroll position
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.dashboard-menu a');
  
  function highlightActiveSection() {
    let scrollPosition = window.scrollY;
    
    // Add some offset to account for the sticky header
    scrollPosition += 100;
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        const id = section.getAttribute('id');
        
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }
  
  window.addEventListener('scroll', highlightActiveSection);
  
  // Fix common issues with D3 visualizations
  function ensureVisualizationsLoad() {
    // If any of the visualizations failed to load, try to initialize them again
    const timelineViz = document.getElementById('timeline-visualization');
    const comparisonViz = document.getElementById('comparison-visualization');
    const bodyViz = document.getElementById('body-visualization');
    
    // Check if timeline visualization is empty
    if (timelineViz && timelineViz.childElementCount === 0) {
      console.log('Reinitializing timeline visualization...');
      if (typeof initializeTimelineVisualization === 'function') {
        setTimeout(initializeTimelineVisualization, 500);
      }
    }
    
    // Check if comparison visualization is empty
    if (comparisonViz && comparisonViz.childElementCount === 0) {
      console.log('Reinitializing comparison visualization...');
      if (typeof updateComparisonVisualization === 'function') {
        setTimeout(updateComparisonVisualization, 500);
      }
    }
    
    // Check if body map visualization is empty
    if (bodyViz && bodyViz.childElementCount === 0) {
      console.log('Reinitializing body map visualization...');
      if (typeof initializeBodyMap === 'function') {
        setTimeout(initializeBodyMap, 500);
      }
    }
  }
  
  // Give the original visualizations time to load, then check if they need fixing
  setTimeout(ensureVisualizationsLoad, 1000);
  
  // =================== Add enhanced data loading validation ===================
  
  // Validate that JSON files exist and can be loaded
  function validateJSONFiles() {
    console.log("Validating JSON files availability...");
    
    // Helper function to check file existence via fetch HEAD request
    function checkFileExists(url) {
      return fetch(url, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`File ${url} not found (${response.status})`);
          }
          return true;
        })
        .catch(error => {
          console.error(error);
          return false;
        });
    }
    
    // Check all required JSON files
    Promise.all([
      checkFileExists('json/Midterm_1.json'),
      checkFileExists('json/Midterm_2.json'),
      checkFileExists('json/Final.json')
    ]).then(results => {
      const [midterm1Exists, midterm2Exists, finalExists] = results;
      
      // If any file is missing, show a helpful error message
      if (!midterm1Exists || !midterm2Exists || !finalExists) {
        const missingFiles = [];
        if (!midterm1Exists) missingFiles.push('Midterm_1.json');
        if (!midterm2Exists) missingFiles.push('Midterm_2.json');
        if (!finalExists) missingFiles.push('Final.json');
        
        console.error(`Missing required JSON files: ${missingFiles.join(', ')}`);
        
        // Show user-friendly error message
        const introSection = document.getElementById('introduction');
        if (introSection) {
          const errorDiv = document.createElement('div');
          errorDiv.style.padding = '20px';
          errorDiv.style.backgroundColor = '#ffebee';
          errorDiv.style.borderLeft = '4px solid #f44336';
          errorDiv.style.margin = '20px 0';
          
          errorDiv.innerHTML = `
            <h3 style="color: #d32f2f; margin-top: 0;">Missing Data Files</h3>
            <p>The following JSON files are missing from the 'json' folder:</p>
            <ul>${missingFiles.map(file => `<li>${file}</li>`).join('')}</ul>
            <p>Please verify that:</p>
            <ol>
              <li>The 'json' folder exists in the project root</li>
              <li>The JSON files are named correctly (case-sensitive)</li>
              <li>You have permissions to access these files</li>
            </ol>
          `;
          
          introSection.appendChild(errorDiv);
        }
        
        // Try using alternative data source as a fallback
        if (typeof loadAlternativeData === 'function') {
          console.log("Attempting to load alternative data source...");
          loadAlternativeData();
        }
      } else {
        console.log("All JSON files are present. Verifying data structure...");
        
        // We found the files, now try to verify the data structure
        fetch('json/Midterm_1.json')
          .then(response => response.json())
          .then(data => {
            if (!data || Object.keys(data).length === 0) {
              throw new Error("Empty or invalid JSON data");
            }
            
            console.log("JSON data appears to be properly structured.");
            
            // Restart initialization if data is still undefined
            if (
              (typeof midterm1Data === 'undefined' || 
               typeof midterm2Data === 'undefined' || 
               typeof finalData === 'undefined') &&
              typeof loadDataWithRetry === 'function'
            ) {
              console.log("Re-triggering data load since data variables are undefined...");
              setTimeout(() => {
                // Reset counter and try again
                window.loadAttempts = 0;
                loadDataWithRetry();
              }, 1000);
            }
          })
          .catch(error => {
            console.error("Error verifying JSON structure:", error);
            
            // Show parsing error message
            const introSection = document.getElementById('introduction');
            if (introSection) {
              const errorDiv = document.createElement('div');
              errorDiv.style.padding = '20px';
              errorDiv.style.backgroundColor = '#ffebee';
              errorDiv.style.borderLeft = '4px solid #f44336';
              errorDiv.style.margin = '20px 0';
              
              errorDiv.innerHTML = `
                <h3 style="color: #d32f2f; margin-top: 0;">Invalid JSON Format</h3>
                <p>The JSON files were found but could not be parsed correctly.</p>
                <p>Error details: ${error.message}</p>
                <p>Please check that the JSON files are properly formatted and valid.</p>
              `;
              
              introSection.appendChild(errorDiv);
            }
          });
      }
    });
  }
  
  // Check data loaded status
  function checkDataLoaded() {
    if (typeof midterm1Data === 'undefined' || typeof midterm2Data === 'undefined' || typeof finalData === 'undefined') {
      console.log('Data not loaded yet, validating JSON files...');
      validateJSONFiles();
    } else {
      console.log('Data appears to be loaded successfully.');
    }
  }
  
  // Wait a bit longer to check if data loaded correctly
  setTimeout(checkDataLoaded, 3000);
  
  // Load alternative data if all else fails (sample data)
  window.loadAlternativeData = function() {
    console.log("Loading minimal sample data as fallback...");
    
    // Create minimal sample data for demonstration
    const sampleData = {
      "S1": {
        "EDA": Array.from({length: 100}, (_, i) => ({ timestamp: i, value: Math.random() * 10 + 5 })),
        "HR": Array.from({length: 100}, (_, i) => ({ timestamp: i, value: Math.random() * 20 + 70 })),
        "TEMP": Array.from({length: 100}, (_, i) => ({ timestamp: i, value: Math.random() * 1 + 36.5 }))
      }
    };
    
    // Assign sample data to global variables
    window.midterm1Data = JSON.parse(JSON.stringify(sampleData));
    window.midterm2Data = JSON.parse(JSON.stringify(sampleData));
    window.finalData = JSON.parse(JSON.stringify(sampleData));
    
    // Show sample data notice
    const introSection = document.getElementById('introduction');
    if (introSection) {
      const noticeDiv = document.createElement('div');
      noticeDiv.style.padding = '15px';
      noticeDiv.style.backgroundColor = '#fff3e0';
      noticeDiv.style.borderLeft = '4px solid #ff9800';
      noticeDiv.style.margin = '20px 0';
      
      noticeDiv.innerHTML = `
        <h3 style="color: #e65100; margin-top: 0;">Using Sample Data</h3>
        <p>The actual data files could not be loaded. The dashboard is now using minimal sample data for demonstration purposes.</p>
        <p>The visualizations may not accurately represent real exam stress patterns.</p>
      `;
      
      introSection.appendChild(noticeDiv);
    }
    
    // Initialize visualizations with sample data
    if (typeof initializeVisualizations === 'function') {
      setTimeout(initializeVisualizations, 500);
    }
  }
  
  // Add click handlers for navigation
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Only handle internal links
      if (this.getAttribute('href').startsWith('#')) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
          // Smooth scroll to the section
          window.scrollTo({
            top: targetElement.offsetTop - 80, // Offset for the fixed header
            behavior: 'smooth'
          });
          
          // Update URL hash without jumping
          history.pushState(null, null, targetId);
          
          // Update active state
          navLinks.forEach(l => l.classList.remove('active'));
          this.classList.add('active');
        }
      }
    });
  });
  
  // Handle direct navigation from URL hash
  if (window.location.hash) {
    const targetElement = document.querySelector(window.location.hash);
    if (targetElement) {
      setTimeout(() => {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: 'smooth'
        });
        
        // Update active state in nav
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === window.location.hash) {
            link.classList.add('active');
          }
        });
      }, 500);
    }
  }
  
  // =================== ADDITIONAL DATA LOADING FIXES ===================
  
  // Check for data in alternative locations
  function checkAlternativeDataLocations() {
    console.log("Checking for data in alternative locations...");
    
    // List of possible locations to check
    const possiblePaths = [
      './Midterm_1.json',
      '../json/Midterm_1.json',
      '/json/Midterm_1.json',
      'data/Midterm_1.json',
      './data/Midterm_1.json'
    ];
    
    // Try each path with a fetch request
    possiblePaths.forEach(path => {
      fetch(path, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            console.log(`Found JSON data at: ${path}`);
            // If we found the file, try loading all files from this location
            const basePath = path.substring(0, path.lastIndexOf('/') + 1);
            tryLoadingFromPath(basePath);
          }
        })
        .catch(() => {
          // Silently fail for paths that don't exist
        });
    });
  }
  
  // Try loading data from a specific path
  function tryLoadingFromPath(basePath) {
    console.log(`Attempting to load data from: ${basePath}`);
    
    Promise.all([
      d3.json(`${basePath}Midterm_1.json`).catch(e => null),
      d3.json(`${basePath}Midterm_2.json`).catch(e => null),
      d3.json(`${basePath}Final.json`).catch(e => null)
    ]).then(data => {
      if (data.some(d => !d)) {
        console.log(`Could not load all files from ${basePath}`);
        return;
      }
      
      console.log(`Successfully loaded data from ${basePath}`);
      
      // Assign to global variables
      window.midterm1Data = data[0];
      window.midterm2Data = data[1];
      window.finalData = data[2];
      
      // Initialize visualizations
      if (typeof initializeVisualizations === 'function') {
        initializeVisualizations();
      }
      
      // Add success message
      const introSection = document.getElementById('introduction');
      if (introSection) {
        const successNotice = document.createElement('div');
        successNotice.style.padding = '15px';
        successNotice.style.backgroundColor = '#e8f5e9';
        successNotice.style.borderLeft = '4px solid #4caf50';
        successNotice.style.margin = '20px 0';
        
        successNotice.innerHTML = `
          <h3 style="color: #2e7d32; margin-top: 0;">Data Loaded Successfully</h3>
          <p>The data has been loaded from ${basePath}</p>
          <p>The visualizations should now display correctly.</p>
        `;
        
        introSection.appendChild(successNotice);
      }
    }).catch(error => {
      console.error(`Error loading from ${basePath}:`, error);
    });
  }
  
  // Add a manual data loading button
  function addManualDataLoaderButton() {
    const introSection = document.getElementById('introduction');
    if (!introSection) return;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.margin = '20px 0';
    buttonContainer.style.textAlign = 'center';
    
    buttonContainer.innerHTML = `
      <h3>Data Loading Options</h3>
      <p>If the visualizations are not loading correctly, try one of these options:</p>
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button id="load-sample-data" style="background-color: #ff9800; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
          Load Sample Data
        </button>
        <button id="check-alt-locations" style="background-color: #2196f3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
          Check Alternative Locations
        </button>
        <button id="retry-data-load" style="background-color: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
          Retry Data Load
        </button>
      </div>
    `;
    
    introSection.appendChild(buttonContainer);
    
    // Add event listeners to the buttons
    document.getElementById('load-sample-data').addEventListener('click', function() {
      if (typeof window.createSampleData === 'function') {
        const sampleData = window.createSampleData();
        window.midterm1Data = JSON.parse(JSON.stringify(sampleData));
        window.midterm2Data = JSON.parse(JSON.stringify(sampleData));
        window.finalData = JSON.parse(JSON.stringify(sampleData));
        
        if (typeof initializeVisualizations === 'function') {
          initializeVisualizations();
        }
        
        alert('Sample data loaded successfully. The visualizations should now display.');
      } else {
        alert('Sample data generator not available. Please refresh the page and try again.');
      }
    });
    
    document.getElementById('check-alt-locations').addEventListener('click', function() {
      checkAlternativeDataLocations();
      alert('Checking alternative data locations. Check the console for results.');
    });
    
    document.getElementById('retry-data-load').addEventListener('click', function() {
      if (typeof initializeApp === 'function') {
        initializeApp();
        alert('Retrying data load...');
      } else {
        alert('Initialization function not available. Please refresh the page and try again.');
      }
    });
  }
  
  // Add manual loader after a delay to ensure it's needed
  setTimeout(function() {
    if (typeof midterm1Data === 'undefined') {
      addManualDataLoaderButton();
    }
  }, 5000);
  
  // Try the alternative locations check after a short delay
  setTimeout(checkAlternativeDataLocations, 4000);
}); 